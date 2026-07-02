# Structured Concurrency

## Оглавление
- [Task](#task)
- [Task.detached](#taskdetached)
- [TaskGroup](#taskgroup)
- [Task Priority](#task-priority)
- [Cancellation](#cancellation)
- [Task Local Values](#task-local-values)
- [Structured vs Unstructured](#structured-vs-unstructured)
- [Сравнение с JS](#сравнение-с-js)

---

## Task

`Task` — единица асинхронной работы:

```swift
// Создание задачи
let task = Task {
    let data = try await fetchData()
    return process(data)
}

// Получение результата
let result = try await task.value

// Task наследует:
// - Actor context (например, @MainActor)
// - Task priority
// - Task local values
```

### Task из синхронного контекста

```swift
class ViewController {
    func viewDidLoad() {
        // Task — мост из sync в async
        Task {
            let user = try await fetchUser()
            // Наследует @MainActor от ViewController
            nameLabel.text = user.name
        }
    }
}
```

---

## Task.detached

Не наследует контекст родителя:

```swift
// Detached — полностью независимая задача
Task.detached {
    // НЕ наследует actor context
    // НЕ наследует priority
    // НЕ наследует task local values
    await heavyComputation()
}

// Detached с приоритетом
Task.detached(priority: .background) {
    await indexDatabase()
}
```

### Когда Task, когда Task.detached?

| | `Task { }` | `Task.detached { }` |
|--|-----------|---------------------|
| Actor context | Наследует | Нет |
| Priority | Наследует | Указываешь явно |
| Task locals | Наследует | Нет |
| Использование | Большинство случаев | Фоновая работа без контекста |

---

## TaskGroup

Динамическое количество параллельных задач:

### withTaskGroup

```swift
func fetchAllUsers(ids: [Int]) async throws -> [User] {
    try await withThrowingTaskGroup(of: User.self) { group in
        for id in ids {
            group.addTask {
                try await fetchUser(id: id)
            }
        }

        var users: [User] = []
        for try await user in group {
            users.append(user)
        }
        return users
    }
}
```

### Ограничение параллелизма

```swift
func processImages(_ urls: [URL], maxConcurrency: Int = 4) async throws -> [Image] {
    try await withThrowingTaskGroup(of: (Int, Image).self) { group in
        var results = [Int: Image]()
        var index = 0

        // Запуск первых N задач
        for _ in 0..<min(maxConcurrency, urls.count) {
            let i = index
            group.addTask { (i, try await downloadImage(urls[i])) }
            index += 1
        }

        // По мере завершения — добавляем новые
        for try await (i, image) in group {
            results[i] = image

            if index < urls.count {
                let nextIndex = index
                group.addTask { (nextIndex, try await downloadImage(urls[nextIndex])) }
                index += 1
            }
        }

        return (0..<urls.count).map { results[$0]! }
    }
}
```

### Discarding task groups (Swift 5.9+)

Когда результаты child tasks не нужны:

```swift
try await withDiscardingTaskGroup { group in
    for connection in connections {
        group.addTask {
            try await handleConnection(connection)
            // Результат автоматически отбрасывается
        }
    }
    // Не нужно итерировать по результатам
}
```

---

## Task Priority

```swift
Task(priority: .high) { await urgentWork() }
Task(priority: .medium) { await normalWork() }
Task(priority: .low) { await backgroundWork() }
Task(priority: .background) { await indexing() }
Task(priority: .userInitiated) { await respondToTap() }
Task(priority: .utility) { await exportData() }

// Проверка текущего приоритета
print(Task.currentPriority)  // .medium (по умолчанию)
```

### Priority inversion

Если высокоприоритетная задача ждёт результат низкоприоритетной — Swift **автоматически повышает** приоритет дочерней задачи (priority escalation).

---

## Cancellation

Cancellation в structured concurrency **каскадный**:

```swift
let parentTask = Task {
    async let a = fetchA()
    async let b = fetchB()

    // Если parentTask отменён:
    // - a и b тоже отменяются
    // - все child tasks в TaskGroup отменяются

    return try await (a, b)
}

parentTask.cancel()  // Отменяет parent + все child tasks
```

### Cooperative cancellation

```swift
func processLargeFile() async throws {
    let chunks = splitIntoChunks(file)

    for chunk in chunks {
        // Бросает CancellationError если задача отменена
        try Task.checkCancellation()

        await process(chunk)
    }
}

// Мягкая проверка
func cleanupTask() async {
    while !Task.isCancelled {
        await doWork()
        try? await Task.sleep(for: .seconds(1))
    }
    // cleanup
}
```

### TaskGroup cancellation

```swift
try await withThrowingTaskGroup(of: Data.self) { group in
    group.addTask { try await fetch(url1) }
    group.addTask { try await fetch(url2) }

    // Если любая задача бросает ошибку:
    // - Все остальные задачи в группе отменяются
    // - Ошибка пробрасывается наверх

    // Ручная отмена всех задач
    group.cancelAll()

    for try await data in group {
        process(data)
    }
}
```

---

## Task Local Values

Thread-local storage для async контекста:

```swift
enum RequestContext {
    @TaskLocal static var requestID: String = "unknown"
    @TaskLocal static var userID: Int?
}

func handleRequest() async {
    await RequestContext.$requestID.withValue("req-123") {
        await RequestContext.$userID.withValue(42) {
            await processRequest()
        }
    }
}

func processRequest() async {
    // Доступ к task-local values
    print(RequestContext.requestID)  // "req-123"
    print(RequestContext.userID)     // Optional(42)

    // Child tasks наследуют task locals
    async let result = fetchData()  // видит requestID = "req-123"
}
```

---

## Structured vs Unstructured

### Structured (предпочтительно)

```swift
// async let — structured
async let data = fetchData()

// TaskGroup — structured
await withTaskGroup(of: Void.self) { group in
    group.addTask { await task1() }
    group.addTask { await task2() }
}

// Гарантии:
// ✅ Child tasks завершаются до parent
// ✅ Cancellation каскадируется
// ✅ Ошибки пробрасываются
// ✅ Нет утечек задач
```

### Unstructured

```swift
// Task { } — unstructured (наследует контекст)
let task = Task { await work() }

// Task.detached — unstructured (без контекста)
let detached = Task.detached { await work() }

// ⚠️ Ответственность за:
// - Отмену (task.cancel())
// - Ожидание результата (await task.value)
// - Предотвращение утечек
```

---

## Сравнение с JS

| Аспект | Swift | JavaScript |
|--------|-------|-----------|
| Параллелизм | `async let`, `TaskGroup` | `Promise.all()` |
| Race | `TaskGroup` + `cancelAll()` | `Promise.race()` |
| Any | `TaskGroup` + first result | `Promise.any()` |
| Cancellation | Каскадный, cooperative | `AbortController` (ручной) |
| Priority | `Task.Priority` | Нет |
| Thread locals | `@TaskLocal` | `AsyncLocalStorage` (Node.js) |
| Structured | Нативная поддержка | Нет концепции |

```swift
// Swift — structured concurrency
async let a = fetchA()
async let b = fetchB()
let (resultA, resultB) = try await (a, b)

// JS — Promise.all (unstructured)
// const [a, b] = await Promise.all([fetchA(), fetchB()])

// Swift — TaskGroup (динамический)
try await withTaskGroup(of: Int.self) { group in
    for url in urls { group.addTask { await fetch(url) } }
    // ...
}

// JS — Promise.all (динамический)
// await Promise.all(urls.map(url => fetch(url)))
```
