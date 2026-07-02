# Классы в TypeScript

## Оглавление

1. [Модификаторы доступа](#1-модификаторы-доступа)
2. [Parameter Properties (Сокращённая запись свойств)](#2-parameter-properties-сокращённая-запись-свойств)
3. [`abstract` классы и методы](#3-abstract-классы-и-методы)
4. [`readonly` свойства в классах](#4-readonly-свойства-в-классах)
5. [`implements` и контракты](#5-implements-и-контракты)
6. [`override` keyword](#6-override-keyword)
7. [Типы `this` в классах](#7-типы-this-в-классах)
8. [Статические члены и generic классы](#8-статические-члены-и-generic-классы)
9. [Паттерн Singleton и другие паттерны](#9-паттерн-singleton-и-другие-паттерны)
10. [`accessor` keyword (auto-accessor fields)](#10-accessor-keyword-auto-accessor-fields)

---

## 1. Модификаторы доступа

TypeScript расширяет JavaScript-классы тремя модификаторами доступа: `public`, `private` и `protected`. Они существуют **только на этапе компиляции** — в скомпилированном JavaScript их нет. Это фундаментальное отличие от нативных приватных полей ES2022 (`#field`), которые обеспечивают **runtime-инкапсуляцию**.

### 1.1 `public` — модификатор по умолчанию

Все свойства и методы класса по умолчанию имеют доступ `public`. Указывать его явно не обязательно, но иногда это делают для читаемости и единообразия.

```ts
class User {
  public name: string;        // Явный public — для документирования намерения
  email: string;              // Неявный public — идентичное поведение

  constructor(name: string, email: string) {
    this.name = name;
    this.email = email;
  }
}
```

### 1.2 `private` — доступ только внутри класса

Свойства и методы с `private` доступны **только** внутри тела того класса, где они объявлены. Подклассы и внешний код не имеют доступа.

```ts
class BankAccount {
  private balance: number = 0;

  deposit(amount: number): void {
    this.validateAmount(amount);
    this.balance += amount;
  }

  private validateAmount(amount: number): void {
    if (amount <= 0) throw new Error('Amount must be positive');
  }

  getBalance(): number {
    return this.balance;
  }
}

const acc = new BankAccount();
acc.deposit(100);
// acc.balance;          // Ошибка компиляции: Property 'balance' is private
// acc.validateAmount(5) // Ошибка компиляции: Property 'validateAmount' is private
acc['balance'];          // 100 — обход через bracket notation работает в runtime!
```

**Важно**: `private` в TypeScript — это **compile-time guard**. В скомпилированном JS свойство остаётся обычным property и доступно через `obj['prop']` или `Object.keys()`.

### 1.3 `protected` — доступ внутри класса и подклассов

Модификатор `protected` разрешает доступ внутри класса-владельца и всех его наследников, но запрещает обращение извне.

```ts
class Animal {
  protected species: string;

  constructor(species: string) {
    this.species = species;
  }

  protected makeSound(): string {
    return `${this.species} sound`;
  }
}

class Dog extends Animal {
  bark(): string {
    // Доступ к protected-членам родителя — OK
    return `${this.species}: Woof! (${this.makeSound()})`;
  }
}

const dog = new Dog('Canine');
dog.bark();           // OK
// dog.species;       // Ошибка: Property 'species' is protected
// dog.makeSound();   // Ошибка: Property 'makeSound' is protected
```

### 1.4 Сравнение TS `private` и ES `#private`

| Аспект | TS `private` | ES `#field` |
|---|---|---|
| Уровень защиты | Compile-time | Runtime (hard private) |
| Bracket notation обход | Возможен (`obj['field']`) | Невозможен (`SyntaxError`) |
| `Object.keys()` / `for...in` | Виден | Не виден |
| Наследование видимости | Не виден в подклассах (TS-ошибка) | Не виден в подклассах (runtime) |
| Внутренний механизм | Нет — обычное свойство | Спецификация определяет `[[PrivateElements]]` internal slots; движки реализуют их нативно (без WeakMap). Однако при даунлевелинге (target < ES2022) TypeScript-компилятор (начиная с TS 4.3) транспилирует `#field` через `WeakMap` |
| Совместимость | Любая target-версия | Нативно — ES2022+. Даунлевелинг — ES2015+ (TS 4.3+, компилятор автоматически использует `WeakMap`, отдельный polyfill не нужен) |
| Reflection (Proxy) | Доступен | Недоступен — `Proxy` не может перехватить |

```ts
class Hybrid {
  private tsPrivate: number = 1;    // Стирается при компиляции
  #esPrivate: number = 2;           // Остаётся приватным в runtime

  reveal(): [number, number] {
    return [this.tsPrivate, this.#esPrivate];
  }
}

const h = new Hybrid();
console.log((h as any).tsPrivate);   // 1 — runtime-доступ возможен
// console.log((h as any).#esPrivate) // SyntaxError
```

---

## 2. Parameter Properties (Сокращённая запись свойств)

**Parameter properties** — синтаксис TypeScript, позволяющий объявить и инициализировать свойство класса прямо в параметрах конструктора. Для этого перед параметром указывается модификатор доступа (`public`, `private`, `protected`) или `readonly`.

### 2.1 Базовый синтаксис

```ts
// Классический вариант — многословно
class UserVerbose {
  public name: string;
  private age: number;
  protected role: string;

  constructor(name: string, age: number, role: string) {
    this.name = name;
    this.age = age;
    this.role = role;
  }
}

// Parameter properties — компактно и идентично по результату
class UserCompact {
  constructor(
    public name: string,
    private age: number,
    protected role: string
  ) {}
  // Тело конструктора пустое — присваивание генерируется компилятором
}
```

### 2.2 Как TypeScript десахаризирует parameter properties

Компилятор трансформирует каждый parameter property в объявление поля + присваивание в начале конструктора. Порядок инициализации:

1. Вызов `super()` (если есть).
2. Инициализация parameter properties **в порядке объявления**.
3. Инициализация полей, объявленных в теле класса.
4. Оставшийся код конструктора.

```ts
class Config {
  constructor(
    public readonly host: string,
    private port: number = 3000,
    protected debug: boolean = false
  ) {
    // К моменту выполнения этого блока все три свойства уже инициализированы
    console.log(this.host, this.port, this.debug);
  }
}

// Компилятор генерирует эквивалент:
// class Config {
//   constructor(host, port = 3000, debug = false) {
//     this.host = host;
//     this.port = port;
//     this.debug = debug;
//     console.log(this.host, this.port, this.debug);
//   }
// }
```

### 2.3 Комбинация с `readonly`

`readonly` можно комбинировать с любым модификатором доступа. Без модификатора доступа `readonly` **сам по себе** также активирует parameter property:

```ts
class Endpoint {
  constructor(
    readonly url: string,                  // public readonly (implicit public)
    private readonly secret: string,       // private + readonly
    protected readonly timeout: number     // protected + readonly
  ) {}
}

const ep = new Endpoint('/api', 'key', 5000);
// ep.url = '/other';     // Ошибка: Cannot assign to 'url' because it is a read-only property
// ep.secret;             // Ошибка: Property 'secret' is private
```

### 2.4 Смешивание parameter properties и обычных параметров

Можно комбинировать parameter properties с обычными параметрами конструктора. Обычные параметры (без модификатора) **не создают** свойства класса:

```ts
class Logger {
  public formattedPrefix: string;

  constructor(
    private level: string,            // Parameter property — создаёт this.level
    prefix: string                     // Обычный параметр — НЕ создаёт this.prefix
  ) {
    this.formattedPrefix = `[${prefix.toUpperCase()}]`;
  }
}

const log = new Logger('debug', 'app');
// log.level   — существует (private)
// log.prefix  — не существует на экземпляре
```

### 2.5 Ограничение: `--erasableSyntaxOnly` (TS 5.8)

Начиная с TypeScript 5.8, появился флаг компилятора `--erasableSyntaxOnly`. Он запрещает любой синтаксис, который **генерирует runtime-код** при компиляции, а не просто стирается. Под этот запрет попадают **parameter properties** и **enum**-ы, поскольку компилятор должен эмитировать дополнительный JS-код для их реализации.

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "erasableSyntaxOnly": true
  }
}
```

```ts
// С включённым erasableSyntaxOnly:
class User {
  constructor(public name: string) {}
  //          ^^^^^^ Ошибка: This syntax is not allowed when 'erasableSyntaxOnly' is enabled.
}
```

Этот флаг полезен при использовании Node.js с `--experimental-strip-types` (Node 22.6+) или других инструментов, которые только удаляют типы из TypeScript-кода без полноценной трансформации (например, `ts-blank-space`). В таких средах parameter properties не будут корректно десахаризированы, поэтому их использование следует запретить.

---

## 3. `abstract` классы и методы

Абстрактные классы — это **базовые классы**, от которых нельзя создать экземпляр напрямую. Они служат контрактами для подклассов, определяя сигнатуры методов и свойств, которые наследник **обязан** реализовать.

### 3.1 Синтаксис абстрактного класса

```ts
abstract class Shape {
  // Абстрактный метод — нет реализации, только сигнатура
  abstract area(): number;

  // Абстрактное свойство — тип задан, значение определяет подкласс
  abstract readonly name: string;

  // Обычный метод с реализацией — наследуется как есть
  describe(): string {
    return `${this.name}: area = ${this.area().toFixed(2)}`;
  }
}

// const shape = new Shape(); // Ошибка: Cannot create an instance of an abstract class

class Circle extends Shape {
  readonly name = 'Circle';

  constructor(private radius: number) {
    super();
  }

  area(): number {
    return Math.PI * this.radius ** 2;
  }
}

class Rectangle extends Shape {
  readonly name = 'Rectangle';

  constructor(private width: number, private height: number) {
    super();
  }

  area(): number {
    return this.width * this.height;
  }
}

const shapes: Shape[] = [new Circle(5), new Rectangle(3, 4)];
shapes.forEach(s => console.log(s.describe()));
// "Circle: area = 78.54"
// "Rectangle: area = 12.00"
```

### 3.2 Абстрактные методы с параметрами и дженериками

```ts
abstract class Repository<T> {
  abstract findById(id: string): Promise<T | null>;
  abstract save(entity: T): Promise<void>;
  abstract delete(id: string): Promise<boolean>;

  async findOrThrow(id: string): Promise<T> {
    const entity = await this.findById(id);
    if (!entity) throw new Error(`Entity ${id} not found`);
    return entity;
  }
}

interface User { id: string; name: string; }

class UserRepository extends Repository<User> {
  private store = new Map<string, User>();

  async findById(id: string): Promise<User | null> {
    return this.store.get(id) ?? null;
  }

  async save(user: User): Promise<void> {
    this.store.set(user.id, user);
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}
```

### 3.3 `abstract class` vs `interface` — когда что использовать

| Критерий | `abstract class` | `interface` |
|---|---|---|
| Реализация методов | Может содержать конкретные методы | Только сигнатуры (нет реализации) |
| Состояние (поля) | Может хранить состояние с инициализацией | Только декларация типов полей |
| Конструктор | Может определять `constructor`-логику | Нет конструкторов |
| Множественное наследование | Только один `extends` | Несколько `implements` |
| Runtime-отпечаток | Генерирует JS-класс (`function`/`class`) | Полностью стирается при компиляции |
| `instanceof` | Работает (runtime-проверка) | Невозможна (нет runtime-артефакта) |
| Приватные/protected члены | Поддерживает | Не поддерживает |

**Правило выбора**: используйте `interface`, когда нужен чистый контракт без реализации. Используйте `abstract class`, когда есть общая логика, разделяемое состояние или нужна проверка через `instanceof`.

---

## 4. `readonly` свойства в классах

Модификатор `readonly` запрещает присваивание свойству после инициализации. Инициализировать `readonly`-свойство можно **только** в двух местах: при объявлении или в конструкторе.

### 4.1 Правила инициализации

```ts
class ImmutableConfig {
  readonly version: string = '1.0.0';          // Инициализация при объявлении
  readonly createdAt: Date;                      // Инициализация в конструкторе

  constructor(created: Date) {
    this.createdAt = created;                    // OK — конструктор
  }

  updateVersion(): void {
    // this.version = '2.0.0';                   // Ошибка: Cannot assign to 'version'
    // this.createdAt = new Date();              // Ошибка: Cannot assign to 'createdAt'
  }
}
```

### 4.2 `readonly` vs `const`

| Аспект | `readonly` (свойство) | `const` (переменная) |
|---|---|---|
| Применяется к | Свойствам класса/интерфейса | Переменным (binding) |
| Момент проверки | Compile-time | Compile-time (для TS) + runtime (для JS) |
| Изменение вложенных данных | Разрешено (shallow) | Разрешено (shallow) |
| Контекст | Класс, интерфейс, type alias | Область видимости переменной |

### 4.3 Shallow readonly — мутабельность вложенных объектов

**Критически важно**: `readonly` защищает только саму ссылку, но **не** содержимое объекта. Вложенные свойства остаются мутабельными.

```ts
class Team {
  readonly members: string[] = [];
  readonly config: { maxSize: number } = { maxSize: 10 };

  addMember(name: string): void {
    // this.members = ['new'];           // Ошибка: Cannot assign to 'members'
    this.members.push(name);             // OK! Мутация содержимого массива
    this.config.maxSize = 20;            // OK! Мутация вложенного свойства
  }
}
```

Для глубокой иммутабельности используйте утилитарный тип `Readonly<T>` рекурсивно или библиотечные решения:

```ts
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

class SafeTeam {
  private _config: { maxSize: number; nested: { flag: boolean } } = {
    maxSize: 10,
    nested: { flag: true }
  };

  get config(): DeepReadonly<typeof this._config> {
    return this._config;
  }
}

const team = new SafeTeam();
// team.config.maxSize = 20;            // Ошибка: Cannot assign to 'maxSize'
// team.config.nested.flag = false;     // Ошибка: Cannot assign to 'flag'
```

### 4.4 `readonly` с Definite Assignment Assertion

Если TypeScript не может доказать, что `readonly`-свойство инициализировано (например, инициализация в методе, вызываемом из конструктора), используйте `!`:

```ts
class LazyInit {
  readonly value!: string;   // Definite assignment assertion

  constructor() {
    this.init();             // Инициализация в отдельном методе
  }

  private init(): void {
    // TypeScript не отслеживает потоки через вызовы методов
    (this as any).value = 'initialized';  // Workaround для readonly + init method
  }
}
```

---

## 5. `implements` и контракты

Ключевое слово `implements` устанавливает контракт: класс **обязуется** реализовать все свойства и методы указанного интерфейса. TypeScript проверяет совместимость на этапе компиляции.

### 5.1 Базовый синтаксис и множественные интерфейсы

```ts
interface Serializable {
  serialize(): string;
}

interface Loggable {
  log(message: string): void;
}

interface Identifiable {
  readonly id: string;
}

// Класс реализует несколько интерфейсов одновременно
class Entity implements Serializable, Loggable, Identifiable {
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }

  serialize(): string {
    return JSON.stringify({ id: this.id });
  }

  log(message: string): void {
    console.log(`[${this.id}] ${message}`);
  }
}
```

### 5.2 Ключевой gotcha: `implements` не выводит типы

**Важно**: `implements` выполняет только **проверку** — он не делает вывод типов для свойств и параметров методов. Типы необходимо указывать явно.

```ts
interface Printable {
  name: string;
  print(copies: number): void;
}

class Document implements Printable {
  // name;                // Ошибка: 'name' implicitly has type 'any'
  name: string = '';      // Тип нужно указать явно

  // print(copies) {}     // Параметр copies не получит тип number автоматически!
  print(copies: number): void {    // Нужно указать тип явно
    console.log(`Printing ${copies} copies of ${this.name}`);
  }
}
```

Это отличается от `extends`, где подкласс **наследует** типы автоматически. При `implements` класс и интерфейс связаны только контрактом, а не наследованием.

### 5.3 Structural compatibility — утиная типизация

TypeScript использует **структурную** систему типов. Класс, не объявляющий `implements`, но имеющий совместимую структуру, всё равно может быть присвоен переменной с типом интерфейса:

```ts
interface HasLength {
  length: number;
}

class MyList {
  // Не объявляет implements HasLength, но структурно совместим
  constructor(public length: number) {}
}

function printLength(obj: HasLength): void {
  console.log(obj.length);
}

printLength(new MyList(5));   // OK — структурная совместимость
printLength([1, 2, 3]);       // OK — массив тоже имеет length
printLength('hello');          // OK — строка тоже имеет length
```

**Зачем тогда `implements`?** Он даёт **раннее обнаружение ошибок** — при изменении интерфейса вы сразу увидите, какие классы нужно обновить, а не получите ошибку в месте использования.

### 5.4 `implements` с классом (не интерфейсом)

TypeScript позволяет использовать `implements` не только с интерфейсами, но и с классами. В этом случае используется только **структура** класса (shape), без наследования реализации:

```ts
class Base {
  greet(): string { return 'hello'; }
  value: number = 42;
}

class Derived implements Base {
  // Обязан реализовать ВСЕ публичные свойства Base заново
  greet(): string { return 'hi'; }  // Своя реализация, НЕ наследование
  value: number = 0;                  // Своё значение
}
```

---

## 6. `override` keyword

Ключевое слово `override` — аннотация, явно указывающая, что метод **перекрывает** метод родительского класса. Введено в TypeScript 4.3 для повышения безопасности при рефакторинге.

### 6.1 Проблема без `override`

```ts
class Base {
  greet(): string { return 'Hello'; }
}

class Derived extends Base {
  // Без override: если в Base переименуют greet() → welcome(),
  // этот метод молча станет новым методом вместо переопределения.
  greet(): string { return 'Hi'; }
}
```

При рефакторинге базового класса можно случайно «потерять» override — метод подкласса перестанет перекрывать родительский, но ошибки не будет.

### 6.2 Безопасность с `override`

```ts
class BaseV2 {
  welcome(): string { return 'Hello'; }  // Метод переименован
}

class DerivedV2 extends BaseV2 {
  override greet(): string { return 'Hi'; }
  // Ошибка: This member cannot have an 'override' modifier because
  // it is not declared in the base class 'BaseV2'
}
```

### 6.3 `noImplicitOverride` — строгий режим

Опция компилятора `noImplicitOverride` в `tsconfig.json` **требует** явного `override` для каждого перекрывающего метода:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "noImplicitOverride": true
  }
}
```

```ts
class Animal {
  move(): void { console.log('Moving'); }
  eat(): void { console.log('Eating'); }
}

class Snake extends Animal {
  // Без noImplicitOverride — ОК. С noImplicitOverride:
  // move(): void {}
  // Ошибка: This member must have an 'override' modifier because
  // it overrides a member in the base class 'Animal'

  override move(): void {          // Теперь корректно
    console.log('Slithering');
    super.move();
  }

  strike(): void {                 // Новый метод — override не нужен
    console.log('Strike!');
  }
}
```

### 6.4 `override` с accessors и свойствами

`override` работает не только с методами, но и с accessor-ами и свойствами:

```ts
class Theme {
  get color(): string { return 'blue'; }
  label: string = 'default';
}

class DarkTheme extends Theme {
  override get color(): string { return 'dark-blue'; }
  override label: string = 'dark';
}
```

---

## 7. Типы `this` в классах

В TypeScript `this` внутри класса — это **полиморфный тип**, представляющий тип текущего экземпляра. Он динамически сужается в подклассах, что делает возможными fluent API и цепочки вызовов с корректной типизацией.

### 7.1 Полиморфный `this` для fluent API

```ts
class QueryBuilder {
  private conditions: string[] = [];

  where(condition: string): this {     // Возвращает this, а не QueryBuilder
    this.conditions.push(condition);
    return this;
  }

  limit(n: number): this {
    this.conditions.push(`LIMIT ${n}`);
    return this;
  }

  build(): string {
    return this.conditions.join(' AND ');
  }
}

class AdvancedQueryBuilder extends QueryBuilder {
  orderBy(field: string): this {
    // Тип this здесь — AdvancedQueryBuilder
    return this;
  }
}

// Цепочка работает корректно — where() и limit() возвращают AdvancedQueryBuilder
const query = new AdvancedQueryBuilder()
  .where('age > 18')        // Тип: AdvancedQueryBuilder (а не QueryBuilder!)
  .orderBy('name')           // OK — метод доступен
  .limit(10)                 // Тип: AdvancedQueryBuilder
  .build();
```

Без полиморфного `this` метод `where()` вернул бы `QueryBuilder`, и вызов `orderBy()` стал бы невозможен.

### 7.2 Type guard с `this is Type`

Метод класса может выступать **type guard**-ом, используя предикат `this is Type`. Это позволяет сужать тип экземпляра на основе runtime-проверки:

```ts
class Shape {
  isCircle(): this is Circle {
    return this instanceof Circle;
  }

  isRectangle(): this is Rectangle {
    return this instanceof Rectangle;
  }
}

class Circle extends Shape {
  constructor(public radius: number) { super(); }
}

class Rectangle extends Shape {
  constructor(public width: number, public height: number) { super(); }
}

function describeShape(shape: Shape): string {
  if (shape.isCircle()) {
    // TypeScript знает: shape — это Circle
    return `Circle with radius ${shape.radius}`;
  }
  if (shape.isRectangle()) {
    // TypeScript знает: shape — это Rectangle
    return `Rectangle ${shape.width}x${shape.height}`;
  }
  return 'Unknown shape';
}
```

### 7.3 `this` как тип параметра

Тип `this` можно использовать для параметров, гарантируя, что метод принимает только экземпляры того же класса:

```ts
class Comparable {
  value: number;

  constructor(value: number) {
    this.value = value;
  }

  equals(other: this): boolean {
    return this.value === other.value;
  }
}

class SpecialComparable extends Comparable {
  label: string;

  constructor(value: number, label: string) {
    super(value);
    this.label = label;
  }
}

const a = new SpecialComparable(1, 'A');
const b = new SpecialComparable(1, 'B');
const c = new Comparable(1);

a.equals(b);   // OK — оба SpecialComparable
// a.equals(c); // Ошибка — c не SpecialComparable (свойство label отсутствует)
```

---

## 8. Статические члены и generic классы

### 8.1 Статические свойства с типизацией

TypeScript позволяет типизировать статические свойства и методы. Статические члены принадлежат **конструктору класса**, а не прототипу.

```ts
class Counter {
  static count: number = 0;
  static readonly MAX: number = 100;

  static increment(): number {
    if (this.count >= this.MAX) throw new Error('Max reached');
    return ++this.count;
  }

  static reset(): void {
    this.count = 0;
  }
}

Counter.increment();    // 1
Counter.increment();    // 2
// Counter.MAX = 200;   // Ошибка: Cannot assign to 'MAX' because it is a read-only property
```

### 8.2 Static blocks (статические блоки инициализации)

Статические блоки выполняются **один раз** при загрузке класса и имеют доступ к приватным членам:

```ts
class Database {
  static #connection: string;
  static isReady: boolean;

  static {
    // Сложная логика инициализации с доступом к #connection
    try {
      this.#connection = 'postgres://localhost:5432/db';
      this.isReady = true;
    } catch {
      this.#connection = '';
      this.isReady = false;
    }
  }

  static getConnection(): string {
    if (!this.isReady) throw new Error('DB not ready');
    return this.#connection;
  }
}
```

### 8.3 Generic классы

Generic классы параметризуются типами, которые указываются при создании экземпляра. **Важно**: статические члены **не могут** использовать type parameter экземпляра.

```ts
class TypedStore<T> {
  private items: T[] = [];

  add(item: T): void {
    this.items.push(item);
  }

  get(index: number): T | undefined {
    return this.items[index];
  }

  getAll(): readonly T[] {
    return this.items;
  }

  // static defaultItem: T;  // Ошибка: Static members cannot reference class type parameters
}

const strings = new TypedStore<string>();
strings.add('hello');
const val: string | undefined = strings.get(0);  // Тип выведен корректно

const numbers = new TypedStore<number>();
numbers.add(42);
```

### 8.4 Generic constraints в классах

```ts
interface HasId {
  id: string;
}

class EntityManager<T extends HasId> {
  private entities = new Map<string, T>();

  add(entity: T): void {
    this.entities.set(entity.id, entity);    // T гарантированно имеет id
  }

  find(id: string): T | undefined {
    return this.entities.get(id);
  }

  findAll(): T[] {
    return [...this.entities.values()];
  }
}

interface Product extends HasId { name: string; price: number; }

const products = new EntityManager<Product>();
products.add({ id: '1', name: 'Widget', price: 9.99 });
// products.add({ name: 'Broken' });  // Ошибка: отсутствует свойство 'id'
```

### 8.5 `typeof ClassName` — тип статической стороны

Оператор `typeof` для класса возвращает тип **конструктора** (static side), а не экземпляра:

```ts
class Service {
  static version = '1.0';
  instanceMethod(): void {}
}

type ServiceInstance = Service;             // Тип экземпляра: { instanceMethod(): void }
type ServiceConstructor = typeof Service;   // Тип конструктора: { new(): Service; version: string }

function createService(ctor: typeof Service): Service {
  console.log(ctor.version);    // Доступ к статическому свойству
  return new ctor();             // Создание экземпляра через конструктор
}
```

---

## 9. Паттерн Singleton и другие паттерны

### 9.1 Singleton через `private constructor`

Ключевая возможность TypeScript — `private constructor`, запрещающий создание экземпляра извне. Это основа паттерна Singleton:

```ts
class AppConfig {
  private static instance: AppConfig | null = null;

  private constructor(
    public readonly apiUrl: string,
    public readonly debug: boolean
  ) {}

  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig('https://api.example.com', false);
    }
    return AppConfig.instance;
  }

  static resetForTesting(): void {
    AppConfig.instance = null;    // Полезно для тестов
  }
}

// const config = new AppConfig(...);       // Ошибка: Constructor is private
const config = AppConfig.getInstance();      // OK — единственный способ получить экземпляр
const same = AppConfig.getInstance();
console.log(config === same);                // true — один и тот же объект
```

### 9.2 Factory Pattern с типизацией

Фабричный метод инкапсулирует логику создания объектов, возвращая общий тип:

```ts
abstract class Notification {
  abstract send(message: string): void;
}

class EmailNotification extends Notification {
  constructor(private email: string) { super(); }

  send(message: string): void {
    console.log(`Email to ${this.email}: ${message}`);
  }
}

class SmsNotification extends Notification {
  constructor(private phone: string) { super(); }

  send(message: string): void {
    console.log(`SMS to ${this.phone}: ${message}`);
  }
}

class NotificationFactory {
  static create(type: 'email', target: string): EmailNotification;
  static create(type: 'sms', target: string): SmsNotification;
  static create(type: string, target: string): Notification {
    switch (type) {
      case 'email': return new EmailNotification(target);
      case 'sms':   return new SmsNotification(target);
      default:      throw new Error(`Unknown type: ${type}`);
    }
  }
}

const email = NotificationFactory.create('email', 'user@test.com');  // Тип: EmailNotification
const sms = NotificationFactory.create('sms', '+1234567890');        // Тип: SmsNotification
```

### 9.3 Builder Pattern с fluent API и типобезопасностью

Builder использует полиморфный `this` и generic для гарантии корректной последовательности вызовов:

```ts
interface HttpRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

class RequestBuilder {
  private request: Partial<HttpRequest> = {};

  setUrl(url: string): this {
    this.request.url = url;
    return this;
  }

  setMethod(method: 'GET' | 'POST' | 'PUT' | 'DELETE'): this {
    this.request.method = method;
    return this;
  }

  setHeader(key: string, value: string): this {
    this.request.headers = { ...this.request.headers, [key]: value };
    return this;
  }

  setBody(body: string): this {
    this.request.body = body;
    return this;
  }

  build(): HttpRequest {
    if (!this.request.url) throw new Error('URL is required');
    if (!this.request.method) throw new Error('Method is required');
    return {
      url: this.request.url,
      method: this.request.method,
      headers: this.request.headers ?? {},
      body: this.request.body,
    };
  }
}

const req = new RequestBuilder()
  .setUrl('https://api.example.com/users')
  .setMethod('POST')
  .setHeader('Content-Type', 'application/json')
  .setBody(JSON.stringify({ name: 'Alice' }))
  .build();
```

### 9.4 Abstract Factory — семейства связанных объектов

Abstract Factory создаёт группы взаимосвязанных объектов без указания их конкретных классов:

```ts
// Абстрактные продукты
interface Button { render(): string; }
interface Input { render(): string; }

// Абстрактная фабрика
abstract class UIFactory {
  abstract createButton(label: string): Button;
  abstract createInput(placeholder: string): Input;

  // Шаблонный метод — использует абстрактные фабричные методы
  createForm(buttonLabel: string, inputPlaceholder: string): string {
    const button = this.createButton(buttonLabel);
    const input = this.createInput(inputPlaceholder);
    return `${input.render()} ${button.render()}`;
  }
}

// Конкретная фабрика: Material Design
class MaterialUIFactory extends UIFactory {
  createButton(label: string): Button {
    return { render: () => `<md-button>${label}</md-button>` };
  }
  createInput(placeholder: string): Input {
    return { render: () => `<md-input placeholder="${placeholder}"/>` };
  }
}

// Конкретная фабрика: Bootstrap
class BootstrapUIFactory extends UIFactory {
  createButton(label: string): Button {
    return { render: () => `<button class="btn">${label}</button>` };
  }
  createInput(placeholder: string): Input {
    return { render: () => `<input class="form-control" placeholder="${placeholder}"/>` };
  }
}

// Клиентский код работает с абстракцией — не знает конкретный UI-фреймворк
function buildUI(factory: UIFactory): string {
  return factory.createForm('Submit', 'Enter name...');
}

console.log(buildUI(new MaterialUIFactory()));
// <md-input placeholder="Enter name..."/> <md-button>Submit</md-button>

console.log(buildUI(new BootstrapUIFactory()));
// <input class="form-control" placeholder="Enter name..."/> <button class="btn">Submit</button>
```

---

## 10. `accessor` keyword (auto-accessor fields)

Начиная с TypeScript 5.0, поддерживается ключевое слово `accessor` для полей класса — часть предложения TC39 Decorators (Stage 3). Оно автоматически создаёт приватное backing-поле и пару getter/setter.

### 10.1 Базовый синтаксис

```ts
class Person {
  accessor name: string;
  accessor age: number;

  constructor(name: string, age: number) {
    this.name = name;   // Вызывает сгенерированный setter
    this.age = age;
  }
}

const p = new Person('Alice', 30);
console.log(p.name);   // 'Alice' — вызывает сгенерированный getter
```

### 10.2 Что генерирует компилятор

Объявление `accessor name: string` эквивалентно следующему коду:

```ts
class Person {
  #__name: string;    // Приватное backing-поле (имя выбирается компилятором)

  get name(): string {
    return this.#__name;
  }

  set name(value: string) {
    this.#__name = value;
  }
}
```

### 10.3 Основное назначение — совместимость с декораторами TC39

`accessor` раскрывает свой потенциал при использовании с декораторами, поскольку декоратор может перехватить и модифицировать сгенерированные getter/setter:

```ts
function logged<This, Value>(
  target: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>
): ClassAccessorDecoratorResult<This, Value> {
  return {
    get(this: This): Value {
      console.log(`Getting ${String(context.name)}`);
      return target.get.call(this);
    },
    set(this: This, value: Value): void {
      console.log(`Setting ${String(context.name)} to`, value);
      target.set.call(this, value);
    },
  };
}

class Settings {
  @logged accessor theme: string = 'light';
  @logged accessor fontSize: number = 14;
}

const s = new Settings();
s.theme = 'dark';    // Лог: "Setting theme to dark"
console.log(s.theme); // Лог: "Getting theme", затем "dark"
```

### 10.4 Ограничения

- `accessor` поля **нельзя** использовать с `declare` (они должны эмитировать runtime-код).
- `accessor` нельзя комбинировать с `abstract` — абстрактные accessor-ы объявляются через обычный `abstract get`/`set`.
- Без декоратора `accessor` эквивалентен ручному getter/setter — польза проявляется именно в связке с декораторами.
