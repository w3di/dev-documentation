# Actors

## Оглавление
- [Actor model](#actor-model)
- [Actor isolation](#actor-isolation)
- [nonisolated](#nonisolated)
- [MainActor](#mainactor)
- [Global actors](#global-actors)
- [Sendable](#sendable)
- [Actor reentrancy](#actor-reentrancy)
- [Distributed actors](#distributed-actors)
- [Сравнение с JS](#сравнение-с-js)

---

## Actor model

`actor` — ссылочный тип, который **защищает** своё мутабельное состояние от data races:

```swift
actor BankAccount {
    let id: UUID
    private(set) var balance: Double

    init(id: UUID, balance: Double) {
        self.id = id
        self.balance = balance
    }

    func deposit(_ amount: Double) {
        balance += amount
    }

    func withdraw(_ amount: Double) throws {
        guard balance >= amount else {
            throw BankError.insufficientFunds
        }
        balance -= amount
    }
}

// Внешний доступ — всегда через await
let account = BankAccount(id: UUID(), balance: 1000)
await account.deposit(500)       // await обязателен
let bal = await account.balance  // даже для чтения
```

### Actor vs Class

| | `actor` | `class` |
|--|--------|---------|
| Reference type | Да | Да |
| Наследование | Нет | Да |
| Data race protection | Автоматическая | Ручная (locks) |
| Доступ к state | `await` (извне) | Свободный |
| Протоколы | Да (с ограничениями) | Да |

---

## Actor isolation

Все stored properties и методы actor **изолированы** по умолчанию:

```swift
actor Counter {
    var count = 0

    // Isolated — доступ только внутри actor или через await
    func increment() {
        count += 1  // Безопасно — мы внутри actor
    }

    // Из другого метода того же actor — без await
    func incrementTwice() {
        increment()  // OK, без await
        increment()
    }
}

// Извне:
let counter = Counter()
await counter.increment()   // await обязателен
print(await counter.count)  // await обязателен
```

### Isolated parameters

```swift
func reset(_ counter: isolated Counter) {
    // Имеем прямой доступ к counter без await
    counter.count = 0  // OK — параметр isolated
}

await reset(counter)  // Вызов требует await
```

---

## nonisolated

Методы и свойства, которые **не обращаются** к изолированному состоянию:

```swift
actor User {
    let id: UUID         // let — immutable, безопасен без isolation
    let name: String
    var lastLogin: Date

    // nonisolated — доступ без await
    nonisolated var displayName: String {
        "\(name) (\(id.uuidString.prefix(8)))"
    }

    // nonisolated для protocol conformance
    nonisolated func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

let user = User(id: UUID(), name: "Alice", lastLogin: Date())
print(user.displayName)  // Без await! (nonisolated)
print(user.name)         // Без await! (let property)
// print(user.lastLogin) // Нужен await (var property)
```

---

## MainActor

Специальный global actor для UI-операций (main thread):

```swift
@MainActor
class ViewController {
    var label: UILabel!

    func updateUI(with text: String) {
        label.text = text  // Гарантированно на main thread
    }
}

// Пометка отдельного метода
actor DataManager {
    func fetchData() async -> [Item] { /* ... */ }

    @MainActor
    func displayData(_ items: [Item]) {
        // На main thread
        tableView.reloadData()
    }
}

// Inline
func processResult(_ result: Result) async {
    let formatted = format(result)
    await MainActor.run {
        label.text = formatted
    }
}
```

---

## Global actors

Кастомные global actors для изоляции подсистем:

```swift
@globalActor
actor DatabaseActor {
    static let shared = DatabaseActor()
}

@DatabaseActor
class Repository {
    var cache: [String: Data] = [:]

    func save(_ data: Data, key: String) {
        cache[key] = data
    }

    func load(_ key: String) -> Data? {
        cache[key]
    }
}

// Все @DatabaseActor функции сериализуются через один actor
@DatabaseActor
func migrateDatabase() async {
    // Безопасно — изолировано DatabaseActor
}
```

---

## Sendable

Протокол `Sendable` гарантирует безопасную передачу между потоками/actors:

```swift
// Автоматически Sendable:
// - Value types (struct/enum) с Sendable полями
// - actor
// - Immutable classes (все let properties)

struct Point: Sendable {  // OK — value type, все поля Sendable
    var x: Double
    var y: Double
}

// Ручная подписка
final class Config: Sendable {  // OK — final + все let
    let apiKey: String
    let timeout: TimeInterval

    init(apiKey: String, timeout: TimeInterval) {
        self.apiKey = apiKey
        self.timeout = timeout
    }
}

// @unchecked Sendable — "я гарантирую thread safety"
final class ThreadSafeCache: @unchecked Sendable {
    private let lock = NSLock()
    private var storage: [String: Any] = [:]

    func get(_ key: String) -> Any? {
        lock.lock()
        defer { lock.unlock() }
        return storage[key]
    }
}
```

### @Sendable closures

```swift
actor Worker {
    func process(_ work: @Sendable () -> Void) {
        work()
    }
}

var mutableState = 0

// worker.process {
//     mutableState += 1  // Ошибка! Захват мутабельного состояния в @Sendable
// }

let immutable = 42
await worker.process {
    print(immutable)  // OK — захват immutable value
}
```

---

## Actor reentrancy

Actor **не** блокирует при await — другие сообщения могут быть обработаны:

```swift
actor ImageCache {
    var cache: [URL: Image] = [:]

    func getImage(for url: URL) async -> Image {
        if let cached = cache[url] {
            return cached
        }

        // ⚠️ Во время await другой вызов может начать загрузку того же URL
        let image = await downloadImage(url)

        // Состояние могло измениться! Проверяем снова
        cache[url] = cache[url] ?? image
        return cache[url]!
    }
}
```

### Защита от reentrancy

```swift
actor ImageCache {
    var cache: [URL: Image] = [:]
    var inProgress: [URL: Task<Image, Error>] = [:]

    func getImage(for url: URL) async throws -> Image {
        if let cached = cache[url] {
            return cached
        }

        // Переиспользуем существующую задачу
        if let existing = inProgress[url] {
            return try await existing.value
        }

        let task = Task {
            try await downloadImage(url)
        }
        inProgress[url] = task

        let image = try await task.value
        cache[url] = image
        inProgress[url] = nil
        return image
    }
}
```

---

## Distributed actors

Actors, работающие через сеть (Swift 5.7+):

```swift
distributed actor GamePlayer {
    typealias ActorSystem = SomeDistributedActorSystem

    var score: Int = 0

    distributed func makeMove(_ move: Move) -> GameState {
        // Может быть вызван удалённо
        score += move.points
        return currentState
    }
}

// Вызов — прозрачно, локально или по сети
let player: GamePlayer = ...
let state = try await player.makeMove(move)
```

---

## Сравнение с JS

| Аспект | Swift Actors | JavaScript |
|--------|-------------|------------|
| Threading | Multi-threaded | Single-threaded |
| Data race protection | Компилятор (actors) | Не нужна (single thread) |
| Shared state | Actor isolation | Свободный доступ |
| Concurrency | Настоящий параллелизм | Concurrent (event loop) |
| Worker isolation | `actor`, `@Sendable` | `Worker` (postMessage) |
| Main thread | `@MainActor` | Всё на main thread |
| Serial execution | Actor mailbox | Event loop (по умолчанию) |

```swift
// Swift — actor защищает состояние
actor Counter {
    var count = 0
    func increment() { count += 1 }
}
// 1000 параллельных вызовов — безопасно
await withTaskGroup(of: Void.self) { group in
    for _ in 0..<1000 {
        group.addTask { await counter.increment() }
    }
}
// count == 1000 (гарантировано)

// JS — single-threaded, нет проблемы
// let count = 0
// for (let i = 0; i < 1000; i++) count++
// count === 1000 (тривиально)
```
