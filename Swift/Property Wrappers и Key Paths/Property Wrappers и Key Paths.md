# Property Wrappers и Key Paths

## Оглавление
- [Property Wrappers](#property-wrappers)
- [wrappedValue и projectedValue](#wrappedvalue-и-projectedvalue)
- [Composition](#composition)
- [Key Paths](#key-paths)
- [Key Paths как функции](#key-paths-как-функции)
- [Сравнение с JS](#сравнение-с-js)

---

## Property Wrappers

`@propertyWrapper` позволяет определить переиспользуемую логику для хранения свойств:

```swift
@propertyWrapper
struct Clamped<Value: Comparable> {
    var wrappedValue: Value {
        didSet { wrappedValue = min(max(wrappedValue, range.lowerBound), range.upperBound) }
    }
    let range: ClosedRange<Value>

    init(wrappedValue: Value, _ range: ClosedRange<Value>) {
        self.range = range
        self.wrappedValue = min(max(wrappedValue, range.lowerBound), range.upperBound)
    }
}

struct Player {
    @Clamped(0...100) var health: Int = 100
    @Clamped(0...999) var score: Int = 0
}

var player = Player()
player.health = 150   // → 100 (clamped)
player.health = -10   // → 0 (clamped)
```

### Другие примеры

```swift
// Lazy-like wrapper
@propertyWrapper
struct Cached<Value> {
    private var compute: () -> Value
    private var cache: Value?

    var wrappedValue: Value {
        mutating get {
            if cache == nil { cache = compute() }
            return cache!
        }
    }

    init(wrappedValue: @autoclosure @escaping () -> Value) {
        self.compute = wrappedValue
    }
}

// Trimmed string
@propertyWrapper
struct Trimmed {
    private var value = ""

    var wrappedValue: String {
        get { value }
        set { value = newValue.trimmingCharacters(in: .whitespacesAndNewlines) }
    }

    init(wrappedValue: String) {
        self.wrappedValue = wrappedValue
    }
}

struct Form {
    @Trimmed var name: String = ""
    @Trimmed var email: String = ""
}

var form = Form()
form.name = "  Alice  "
print(form.name)  // "Alice"
```

---

## wrappedValue и projectedValue

### wrappedValue — основное значение

```swift
@propertyWrapper
struct SmallNumber {
    private var number = 0

    var wrappedValue: Int {
        get { number }
        set { number = min(newValue, 12) }
    }
}

struct Row {
    @SmallNumber var height: Int  // height — wrappedValue
}
```

### projectedValue ($) — дополнительная информация

```swift
@propertyWrapper
struct SmallNumber {
    private var number = 0
    private(set) var projectedValue = false  // был ли clamped?

    var wrappedValue: Int {
        get { number }
        set {
            if newValue > 12 {
                number = 12
                projectedValue = true  // пометить что было ограничение
            } else {
                number = newValue
                projectedValue = false
            }
        }
    }
}

struct Row {
    @SmallNumber var height: Int
}

var row = Row()
row.height = 20
print(row.height)   // 12 (clamped)
print(row.$height)  // true (был clamped)
```

### projectedValue для Binding-паттерна

```swift
@propertyWrapper
struct Validated<Value> {
    var wrappedValue: Value
    var projectedValue: Validated<Value> { self }

    var isValid: Bool { /* validation logic */ }

    init(wrappedValue: Value) {
        self.wrappedValue = wrappedValue
    }
}

struct Form {
    @Validated var email: String = ""
}

var form = Form()
form.email = "test@example.com"
let wrapper = form.$email  // Validated<String>
print(wrapper.isValid)
```

---

## Composition

Несколько property wrappers на одном свойстве:

```swift
@propertyWrapper
struct Uppercased {
    private var value = ""
    var wrappedValue: String {
        get { value }
        set { value = newValue.uppercased() }
    }
    init(wrappedValue: String) {
        self.wrappedValue = wrappedValue
    }
}

struct Config {
    @Trimmed @Uppercased var code: String = ""
    // Внешний wrapper (@Trimmed) оборачивает внутренний (@Uppercased)
    // Присваивание: trim → uppercase
}

var config = Config()
config.code = "  hello  "
print(config.code)  // "HELLO"
```

---

## Key Paths

Key path — типизированная ссылка на свойство:

```swift
struct User {
    var name: String
    var age: Int
    var address: Address
}

struct Address {
    var city: String
    var zip: String
}

// Key path syntax: \Type.property
let nameKeyPath: KeyPath<User, String> = \User.name
let cityKeyPath = \User.address.city  // вложенный key path

let user = User(name: "Alice", age: 30, address: Address(city: "NYC", zip: "10001"))

// Чтение через key path
print(user[keyPath: nameKeyPath])   // "Alice"
print(user[keyPath: cityKeyPath])   // "NYC"
```

### Типы Key Paths

| Тип | Описание |
|-----|---------|
| `KeyPath<Root, Value>` | Read-only |
| `WritableKeyPath<Root, Value>` | Read-write (value types) |
| `ReferenceWritableKeyPath<Root, Value>` | Read-write (reference types) |
| `PartialKeyPath<Root>` | Тип-erased value |
| `AnyKeyPath` | Полностью тип-erased |

```swift
// WritableKeyPath — для мутации value types
var user = User(name: "Alice", age: 30, address: Address(city: "NYC", zip: "10001"))
user[keyPath: \User.name] = "Bob"
print(user.name)  // "Bob"

// ReferenceWritableKeyPath — для классов
class Person {
    var name: String
    init(name: String) { self.name = name }
}

let person = Person(name: "Alice")
let kp: ReferenceWritableKeyPath<Person, String> = \Person.name
person[keyPath: kp] = "Bob"  // OK даже с let (reference type)
```

### Appending Key Paths

```swift
let addressKP = \User.address
let cityKP = \Address.city
let fullKP = addressKP.appending(path: cityKP)  // \User.address.city

print(user[keyPath: fullKP])  // "NYC"
```

---

## Key Paths как функции

Swift автоматически конвертирует key paths в функции (SE-0249):

```swift
let users = [
    User(name: "Alice", age: 30, address: Address(city: "NYC", zip: "10001")),
    User(name: "Bob", age: 25, address: Address(city: "LA", zip: "90001")),
]

// Key path вместо closure
let names = users.map(\.name)       // ["Alice", "Bob"]
let ages = users.map(\.age)         // [30, 25]
let cities = users.map(\.address.city)  // ["NYC", "LA"]

// Сортировка
let sorted = users.sorted(by: \.age)  // нужна custom extension
// Стандартная библиотека:
let sorted = users.sorted { $0.age < $1.age }

// Filter с key path
let adults = users.filter { $0.age >= 18 }
```

### Практическое применение

```swift
// KVO-подобный паттерн наблюдения
class Observable<T> {
    var value: T {
        didSet { observers.forEach { $0(value) } }
    }
    private var observers: [(T) -> Void] = []

    init(_ value: T) { self.value = value }

    func observe(_ handler: @escaping (T) -> Void) {
        observers.append(handler)
    }
}

// Динамический доступ
func extract<T, V>(_ items: [T], _ keyPath: KeyPath<T, V>) -> [V] {
    items.map { $0[keyPath: keyPath] }
}

let names = extract(users, \.name)  // ["Alice", "Bob"]
```

---

## Сравнение с JS

| Аспект | Swift | JavaScript |
|--------|-------|-----------|
| Property wrappers | `@propertyWrapper` | `Object.defineProperty` / `Proxy` |
| Projected value | `$property` | Нет аналога |
| Key paths | `\Type.property` (типизированные) | `"property"` (строки) |
| Key path access | `obj[keyPath: kp]` | `obj[key]` |
| Key path as function | `\.name` как `(T) -> V` | Нет |
| Composition | Несколько wrappers | Нет |
| Type safety | Compile-time | Runtime |

```swift
// Swift — типизированный key path
let kp: KeyPath<User, String> = \User.name
// Компилятор знает: Root = User, Value = String
// Нельзя использовать с другим типом

// JS — строковый ключ
// const key = "name"
// user[key]  // Нет проверки типов
// Может быть любая строка, включая несуществующие свойства
```
