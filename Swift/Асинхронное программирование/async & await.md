# async & await

## Оглавление
- [Основы async/await](#основы)
- [Suspension points](#suspension-points)
- [async let](#async-let)
- [Continuations](#continuations)
- [AsyncSequence и AsyncStream](#asyncsequence)
- [Cancellation](#cancellation)
- [Внутренняя реализация](#внутренняя-реализация)
- [Сравнение с JS](#сравнение-с-js)

---

## Основы

`async` помечает функцию как асинхронную, `await` — точку ожидания:

```swift
func fetchUser(id: Int) async throws -> User {
    let url = URL(string: "https://api.example.com/users/\(id)")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode(User.self, from: data)
}

// Вызов
Task {
    do {
        let user = try await fetchUser(id: 42)
        print(user.name)
    } catch {
        print("Error: \(error)")
    }
}
```

### Свойства async

```swift
struct RemoteConfig {
    var endpoint: URL

    // Async computed property (только get)
    var latency: TimeInterval {
        get async throws {
            let start = Date()
            let _ = try await URLSession.shared.data(from: endpoint)
            return Date().timeIntervalSince(start)
        }
    }
}
```

### Async closures

```swift
let fetch: () async throws -> Data = {
    try await URLSession.shared.data(from: someURL).0
}
```

---

## Suspension points

Каждый `await` — это **потенциальная точка приостановки**. Поток может быть отдан другой задаче:

```swift
func processOrder() async throws {
    let user = try await fetchUser()       // ← suspension point
    // Поток мог смениться! Не полагайся на Thread.current
    let items = try await fetchCart(user)   // ← suspension point
    // Снова мог смениться поток
    try await submitOrder(user, items)     // ← suspension point
}
```

> **Важно:** Между `await` состояние может измениться. Проверяй инварианты после каждого await.

### Отличие от JS

В JS `await` всегда возвращает управление в event loop. В Swift поток может продолжить выполнение **без переключения**, если executor решит, что это эффективнее.

---

## async let

Параллельное выполнение нескольких асинхронных операций:

```swift
func fetchDashboard() async throws -> Dashboard {
    // Запускаются параллельно!
    async let user = fetchUser()
    async let posts = fetchPosts()
    async let notifications = fetchNotifications()

    // Ждём все результаты
    return try await Dashboard(
        user: user,
        posts: posts,
        notifications: notifications
    )
}
```

### Правила async let:
- Переменная **должна** быть использована с `await` до выхода из scope
- Если scope завершается без await — child task автоматически **отменяется**
- Это **structured concurrency** — child tasks привязаны к parent

```swift
func example() async throws {
    async let result = longOperation()

    if someCondition {
        return  // result автоматически отменяется!
    }

    let value = try await result
}
```

---

## Continuations

Мост между callback-based API и async/await:

### withCheckedContinuation (безопасный)

```swift
func fetchData() async -> Data {
    await withCheckedContinuation { continuation in
        legacyFetch { data in
            continuation.resume(returning: data)
            // ⚠️ Вызов resume дважды — crash в debug (проверка)
        }
    }
}
```

### withCheckedThrowingContinuation

```swift
func fetchUser() async throws -> User {
    try await withCheckedThrowingContinuation { continuation in
        api.getUser { result in
            switch result {
            case .success(let user):
                continuation.resume(returning: user)
            case .failure(let error):
                continuation.resume(throwing: error)
            }
        }
    }
}
```

### withUnsafeContinuation (без проверок, быстрее)

```swift
func fetchData() async -> Data {
    await withUnsafeContinuation { continuation in
        legacyFetch { data in
            continuation.resume(returning: data)
            // ⚠️ Двойной resume — undefined behavior (без проверок!)
        }
    }
}
```

### Правила:
1. `resume` **должен** быть вызван **ровно один раз**
2. Если не вызвать — task зависнет навсегда
3. Если вызвать дважды — crash (checked) или UB (unsafe)

---

## AsyncSequence

Асинхронный аналог `Sequence`:

```swift
// AsyncSequence — протокол
// AsyncIteratorProtocol — протокол итератора

// Использование
for try await line in url.lines {
    print(line)
}

// С bytes
for try await byte in url.resourceBytes {
    process(byte)
}

// AsyncStream — создание кастомных асинхронных последовательностей
let stream = AsyncStream<Int> { continuation in
    for i in 0..<10 {
        continuation.yield(i)
        try? await Task.sleep(nanoseconds: 100_000_000)
    }
    continuation.finish()
}

for await value in stream {
    print(value)  // 0, 1, 2, ... 9 (с интервалами)
}
```

### AsyncThrowingStream

```swift
let events = AsyncThrowingStream<Event, Error> { continuation in
    let observer = NotificationCenter.default.addObserver(...) { notification in
        continuation.yield(Event(notification))
    }

    continuation.onTermination = { _ in
        NotificationCenter.default.removeObserver(observer)
    }
}
```

### Операторы над AsyncSequence

```swift
let values = stream
    .filter { $0 > 5 }
    .map { $0 * 2 }
    .prefix(3)

for await value in values {
    print(value)
}
```

---

## Cancellation

Swift использует **cooperative cancellation** — задача должна сама проверять:

```swift
func processItems(_ items: [Item]) async throws {
    for item in items {
        // Проверка отмены
        try Task.checkCancellation()  // throws CancellationError

        // Или мягкая проверка
        if Task.isCancelled {
            // cleanup и выход
            return
        }

        await process(item)
    }
}

// Отмена задачи
let task = Task {
    try await processItems(items)
}

task.cancel()  // Устанавливает флаг isCancelled
```

### withTaskCancellationHandler

```swift
func download(url: URL) async throws -> Data {
    let session = URLSession.shared
    var request = URLRequest(url: url)

    return try await withTaskCancellationHandler {
        try await session.data(for: request).0
    } onCancel: {
        // Вызывается синхронно при отмене
        session.invalidateAndCancel()
    }
}
```

---

## Внутренняя реализация

### Coroutines (Split functions)

Компилятор разбивает async функцию на **continuation frames** в SIL:

```swift
func example() async -> Int {
    let a = await fetchA()  // split point 1
    let b = await fetchB()  // split point 2
    return a + b
}

// Компилятор генерирует (упрощённо):
// example_start() → suspend, schedule resume
// example_resume1(a) → suspend, schedule resume
// example_resume2(b) → return a + b
```

### Async frames вместо stack

- Обычные функции используют **стек потока** (фиксированный размер ~1MB)
- Async функции используют **heap-allocated frames** (async stack)
- Это позволяет тысячи concurrent tasks без создания потоков

### Executor

```swift
// Каждый await может переключить executor
// @MainActor гарантирует выполнение на main thread
@MainActor
func updateUI() async {
    label.text = "Loading..."
    let data = try? await fetchData()  // может уйти с main thread
    // Вернулись на main thread (гарантия @MainActor)
    label.text = "Done: \(data?.count ?? 0) bytes"
}
```

---

## Сравнение с JS

| Аспект | Swift async/await | JS async/await |
|--------|------------------|---------------|
| Модель | Multi-threaded, cooperative tasks | Single-threaded, event loop |
| Параллелизм | `async let`, `TaskGroup` | `Promise.all()` |
| Отмена | `Task.cancel()`, cooperative | `AbortController` |
| Continuation | `withCheckedContinuation` | `new Promise((resolve, reject))` |
| Streams | `AsyncSequence` | `AsyncIterator` / `ReadableStream` |
| Thread safety | Actors, Sendable | Не нужна (single-thread) |
| Error handling | `try await` | `try { await } catch {}` |
| Suspension | Может не переключать поток | Всегда возвращает в event loop |

```swift
// Swift — реальный параллелизм
async let a = fetchA()  // параллельно
async let b = fetchB()  // параллельно
let result = try await (a, b)

// JS — concurrent, но single-threaded
// const [a, b] = await Promise.all([fetchA(), fetchB()])
```
