# Object — глубокое погружение

## Оглавление

1. [Внутренняя структура объектов в V8](#1-внутренняя-структура-объектов-в-v8)
2. [Property Descriptors](#2-property-descriptors)
3. [Заморозка и запечатывание](#3-заморозка-и-запечатывание)
4. [Перечисление свойств](#4-перечисление-свойств)
5. [Клонирование объектов](#5-клонирование-объектов)
6. [Object.is() и алгоритмы сравнения](#6-objectis-и-алгоритмы-сравнения)
7. [Computed properties и Symbol keys](#7-computed-properties-и-symbol-keys)
8. [Nullish и Optional операторы](#8-nullish-и-optional-операторы)
9. [Object.fromEntries() и трансформации](#9-objectfromentries-и-трансформации)
10. [Performance — объекты под нагрузкой](#10-performance--объекты-под-нагрузкой)

---

## 1. Внутренняя структура объектов в V8

### Hidden Classes (Maps / Shapes)

V8 не хранит объект как наивный `hashmap`. Каждому объекту назначается **hidden class** (внутреннее название — `Map`, не путать с `Map` из JS; в SpiderMonkey — `Shape`). Hidden class описывает *форму* объекта: какие свойства существуют, их смещения в памяти, типы дескрипторов.

Когда два объекта создаются одинаковым образом (одни и те же свойства, в том же порядке), они **разделяют один hidden class**. Это позволяет движку генерировать эффективный машинный код через **inline caches** (IC).

```js
// Оба объекта получат один hidden class,
// потому что свойства добавляются в одинаковом порядке
function Point(x, y) {
  this.x = x; // transition: HC0 → HC1
  this.y = y; // transition: HC1 → HC2
}

const p1 = new Point(1, 2); // hidden class HC2
const p2 = new Point(3, 4); // тот же HC2 — sharing
```

Цепочка переходов (transition chain): каждое добавление нового свойства создаёт **transition** от текущего hidden class к следующему. Это дерево — V8 переиспользует ветки, если объекты формируются одинаково.

### Inline Caches (IC)

При первом обращении к `obj.x` V8 ищет свойство «медленно» (по hidden class), затем **кэширует** смещение. При повторном вызове с объектом того же hidden class — доступ по прямому смещению, почти как обращение к полю `struct` в C.

- **Monomorphic IC** — все объекты одного hidden class. Максимальная скорость.
- **Polymorphic IC** — 2–4 разных hidden class. V8 хранит несколько записей, проверяет по очереди.
- **Megamorphic IC** — 5+ hidden class. V8 откатывается к generic lookup. Серьёзная просадка.

### In-object properties vs Backing store

- **In-object properties** — свойства, выделенные *внутри самого объекта* при аллокации. Количество слотов определяется при первом создании (V8 резервирует несколько дополнительных). Доступ — по смещению, очень быстро.
- **Backing store (properties array)** — когда in-object слоты исчерпаны, новые свойства попадают в отдельный массив. Чуть медленнее, но всё ещё «fast mode».

```js
// V8 зарезервирует in-object слоты для x, y, z
// Если потом добавить ещё свойства — они уйдут в backing store
const obj = { x: 1, y: 2, z: 3 };
obj.w = 4; // может попасть в backing store
```

### Fast properties vs Slow (Dictionary) mode

**Fast mode** — свойства хранятся с фиксированными смещениями (in-object или linear backing store). Hidden class полностью описывает layout.

**Slow (dictionary) mode** — объект переключается на внутренний `NameDictionary` (hashmap). Hidden class теряет смысл, IC больше не работают эффективно.

Что **триггерит переход в slow mode**:

| Триггер | Почему |
|---|---|
| `delete obj.prop` | Удаление свойства ломает transition chain. V8 не может эффективно обновить hidden class. |
| Слишком много динамических ключей | Каждый уникальный ключ порождает новый transition. При превышении порога (~1024 fast properties, зависит от версии) — switch to dictionary. |
| Объект используется как произвольный hashmap | Множество разнородных ключей, добавляемых в рантайме. |
| `Object.defineProperty()` с нестандартными атрибутами | Может вызвать деоптимизацию в некоторых паттернах. |

```js
// Антипаттерн — delete в hot path
function process(obj) {
  delete obj.temp; // → slow mode!
  return obj.value;
}

// Лучше: присвоить undefined
function processFast(obj) {
  obj.temp = undefined; // hidden class не меняется
  return obj.value;
}
```

### Elements (индексированные свойства)

Числовые ключи (`obj[0]`, `obj[42]`) хранятся отдельно в **elements backing store**. V8 различает:

- **Packed SMI** — непрерывный массив целых чисел. Самый быстрый.
- **Packed Double** — непрерывный массив чисел с плавающей точкой.
- **Packed Elements** — произвольные значения, но без «дыр».
- **Holey** — массив с пустыми слотами. Медленнее, так как требует проверки на `undefined`/hole.
- **Dictionary Elements** — разреженный массив перешёл в режим словаря.

Переходы идут только «вниз» (от Packed SMI к Holey Elements), обратно V8 не переключает.

---

## 2. Property Descriptors

Каждое свойство объекта имеет **дескриптор** — метаданные, определяющие поведение свойства.

### Два типа дескрипторов

**Data descriptor** — имеет `value` и `writable`:

```js
Object.defineProperty(obj, 'name', {
  value: 'Alice',
  writable: true,      // можно ли менять value
  enumerable: true,     // видно ли в for...in, Object.keys()
  configurable: true    // можно ли удалить или переконфигурировать
});
```

**Accessor descriptor** — имеет `get` и `set`:

```js
const user = { _age: 25 };

Object.defineProperty(user, 'age', {
  get() { return this._age; },
  set(val) {
    if (val < 0) throw new RangeError('Age must be >= 0');
    this._age = val;
  },
  enumerable: true,
  configurable: true
});

user.age = 30;   // вызывает set
console.log(user.age); // вызывает get → 30
```

**Нельзя смешивать** `value`/`writable` с `get`/`set` — будет `TypeError`.

### Дефолтные значения

При создании свойства через `Object.defineProperty()` **все неуказанные атрибуты** дефолтятся в `false` / `undefined`:

```js
Object.defineProperty(obj, 'x', { value: 42 });
// writable: false, enumerable: false, configurable: false
// Это ВАЖНОЕ отличие от обычного присваивания:
obj.y = 42;
// writable: true, enumerable: true, configurable: true
```

### Object.defineProperties()

Пакетное определение нескольких свойств:

```js
Object.defineProperties(obj, {
  firstName: { value: 'John', writable: true, enumerable: true, configurable: true },
  lastName:  { value: 'Doe',  writable: true, enumerable: true, configurable: true },
  fullName:  {
    get() { return `${this.firstName} ${this.lastName}`; },
    enumerable: true,
    configurable: true
  }
});
```

### Чтение дескрипторов

```js
Object.getOwnPropertyDescriptor(obj, 'firstName');
// { value: 'John', writable: true, enumerable: true, configurable: true }

Object.getOwnPropertyDescriptors(obj);
// Все дескрипторы всех own-свойств, включая Symbol-ключи.
// Полезно для корректного клонирования с геттерами/сеттерами:
const clone = Object.defineProperties({}, Object.getOwnPropertyDescriptors(source));
```

### Тонкости configurable

Если `configurable: false`:
- Нельзя удалить свойство (`delete` вернёт `false`, в strict mode — `TypeError`)
- Нельзя изменить `enumerable`
- Нельзя переключить тип дескриптора (data ↔ accessor)
- **Единственное исключение**: можно изменить `writable` с `true` на `false` (но не обратно)

```js
Object.defineProperty(obj, 'id', {
  value: 1,
  writable: true,
  configurable: false
});

obj.id = 2;           // OK — writable: true
Object.defineProperty(obj, 'id', { writable: false }); // OK — true → false
Object.defineProperty(obj, 'id', { writable: true });  // TypeError — false → true запрещено
```

---

## 3. Заморозка и запечатывание

### Object.preventExtensions()

Запрещает добавление **новых** свойств. Существующие можно менять и удалять.

```js
const obj = { a: 1, b: 2 };
Object.preventExtensions(obj);

obj.c = 3;        // тихо проигнорировано (strict mode → TypeError)
obj.a = 10;       // OK
delete obj.b;     // OK
Object.isExtensible(obj); // false
```

### Object.seal()

`preventExtensions` + все свойства становятся `configurable: false`. Нельзя добавлять, удалять, менять дескрипторы. Но **значения менять можно** (если `writable: true`).

```js
const obj = { a: 1, b: 2 };
Object.seal(obj);

obj.a = 100;      // OK — writable всё ещё true
delete obj.a;     // Нет — configurable: false
obj.c = 3;        // Нет — not extensible
Object.isSealed(obj); // true
```

### Object.freeze()

`seal` + все data-свойства становятся `writable: false`. Объект полностью иммутабелен **на первом уровне вложенности**.

```js
const obj = { a: 1, nested: { b: 2 } };
Object.freeze(obj);

obj.a = 100;          // Нет
obj.nested.b = 200;   // Да! freeze — shallow
Object.isFrozen(obj); // true
```

### Deep Freeze

`Object.freeze()` — **shallow**. Для полной заморозки нужна рекурсия:

```js
function deepFreeze(obj) {
  // Замораживаем сам объект
  Object.freeze(obj);

  // Рекурсивно замораживаем все свойства-объекты
  for (const key of Reflect.ownKeys(obj)) {
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }

  return obj;
}

const config = deepFreeze({
  db: { host: 'localhost', port: 5432 },
  cache: { ttl: 3600 }
});

config.db.port = 3306; // Нет эффекта, strict mode → TypeError
```

> **Осторожно**: `deepFreeze` может уйти в бесконечную рекурсию при циклических ссылках, если не добавить `WeakSet` для отслеживания посещённых объектов.

### Иерархия ограничений

```
preventExtensions  ⊂  seal  ⊂  freeze
(нет новых свойств)   (+ нет удаления/реконфигурации)   (+ нет записи)
```

`Object.isFrozen()` возвращает `true` и для `sealed` объекта, если все свойства `writable: false`. Пустой `preventExtensions`-объект тоже `isFrozen`, потому что vacuously — нет свойств, которые могли бы нарушить контракт.

---

## 4. Перечисление свойств

### Сводная таблица

| Метод | Own | Inherited | Enumerable | Non-enumerable | String keys | Symbol keys |
|---|---|---|---|---|---|---|
| `for...in` | Да | Да | Да | Нет | Да | Нет |
| `Object.keys()` | Да | Нет | Да | Нет | Да | Нет |
| `Object.values()` | Да | Нет | Да | Нет | Да | Нет |
| `Object.entries()` | Да | Нет | Да | Нет | Да | Нет |
| `Object.getOwnPropertyNames()` | Да | Нет | Да | Да | Да | Нет |
| `Object.getOwnPropertySymbols()` | Да | Нет | Да | Да | Нет | Да |
| `Reflect.ownKeys()` | Да | Нет | Да | Да | Да | Да |

### Порядок свойств (спецификация ES2015+)

`Reflect.ownKeys()` гарантирует порядок:
1. Целочисленные индексы (0, 1, 2, ...) — в возрастающем числовом порядке
2. Строковые ключи — в порядке добавления
3. `Symbol` — в порядке добавления

```js
const obj = { b: 1, 1: 'one', a: 2, [Symbol('s')]: 3, 0: 'zero' };

Reflect.ownKeys(obj);
// ['0', '1', 'b', 'a', Symbol(s)]
//  ↑ числа      ↑ строки   ↑ символы
```

`Object.keys()`, `Object.getOwnPropertyNames()` следуют тому же порядку (целые числа → строки), но без символов.

### for...in и цепочка прототипов

`for...in` перебирает **все enumerable string-keyed свойства**, включая унаследованные:

```js
const parent = { inherited: true };
const child = Object.create(parent);
child.own = true;

for (const key in child) {
  console.log(key, child.hasOwnProperty(key));
}
// own true
// inherited false
```

Именно поэтому в pre-ES5 коде повсеместно встречался `hasOwnProperty` guard. Сейчас предпочтительнее `Object.keys()` или `Object.hasOwn()` (ES2022):

```js
Object.hasOwn(child, 'own');       // true
Object.hasOwn(child, 'inherited'); // false
// Безопаснее, чем child.hasOwnProperty(), потому что
// работает даже если hasOwnProperty переопределён или объект создан через Object.create(null)
```

### Практический пример: enumerable: false

```js
const obj = {};
Object.defineProperty(obj, 'hidden', { value: 42, enumerable: false });
obj.visible = 100;

Object.keys(obj);                  // ['visible']
Object.getOwnPropertyNames(obj);   // ['visible', 'hidden']
JSON.stringify(obj);                // '{"visible":100}' — hidden не попадает
Object.assign({}, obj);            // { visible: 100 } — hidden не копируется
```

`enumerable: false` влияет на: `for...in`, `Object.keys/values/entries`, `JSON.stringify`, `Object.assign`, spread `{...obj}`.

---

## 5. Клонирование объектов

### Shallow clone

**`Object.assign()`**:

```js
const source = { a: 1, b: { c: 2 } };
const clone = Object.assign({}, source);

clone.b.c = 999;
console.log(source.b.c); // 999 — та же ссылка!
```

Особенности `Object.assign()`:
- Копирует только **own enumerable string-keyed** свойства
- Вызывает **геттеры** на source и **сеттеры** на target
- Не копирует дескрипторы — результат всегда `writable: true, enumerable: true, configurable: true`
- `Symbol`-ключи — копирует (если enumerable)

**Spread `{...obj}`** — семантически идентичен `Object.assign({}, obj)`, но:
- Не вызывает сеттеры на target (target всегда свежий `{}`)
- Чуть быстрее в большинстве движков (нет overhead от вызова функции)

### Deep clone: structuredClone()

`structuredClone()` (доступен в браузерах и Node.js 17+) использует **structured clone algorithm**:

```js
const original = {
  date: new Date(),
  regex: /test/gi,
  nested: { deep: { value: 42 } },
  set: new Set([1, 2, 3]),
  map: new Map([['key', 'value']]),
  buffer: new ArrayBuffer(8),
  arr: new Int32Array([1, 2, 3])
};

const clone = structuredClone(original);

clone.nested.deep.value = 0;
console.log(original.nested.deep.value); // 42 — глубокая копия
console.log(clone.date instanceof Date); // true
console.log(clone.set instanceof Set);   // true
```

**Поддерживаемые типы**: `Date`, `RegExp`, `Map`, `Set`, `ArrayBuffer`, `TypedArray`, `Blob`, `File`, `ImageData`, `Error` и вложенные объекты/массивы.

**Циклические ссылки** — корректно обрабатываются:

```js
const obj = { name: 'circular' };
obj.self = obj;

const clone = structuredClone(obj);
console.log(clone.self === clone); // true — цикл сохранён
console.log(clone.self === obj);   // false — это копия
```

**Что НЕ клонируется**:
- Функции — `DataCloneError`
- DOM-элементы — `DataCloneError`
- `Symbol`-свойства — игнорируются
- Прототипная цепочка — теряется (результат — plain object)
- Property descriptors — теряются (всё становится `writable`, `enumerable`, `configurable`)
- `WeakMap`, `WeakRef`, `FinalizationRegistry` — не поддерживаются

### Ручной deep clone с edge cases

Когда нужен полный контроль:

```js
function deepClone(obj, seen = new WeakMap()) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (seen.has(obj)) return seen.get(obj); // circular reference

  if (obj instanceof Date)    return new Date(obj.getTime());
  if (obj instanceof RegExp)  return new RegExp(obj.source, obj.flags);
  if (obj instanceof Map) {
    const map = new Map();
    seen.set(obj, map);
    obj.forEach((v, k) => map.set(deepClone(k, seen), deepClone(v, seen)));
    return map;
  }
  if (obj instanceof Set) {
    const set = new Set();
    seen.set(obj, set);
    obj.forEach(v => set.add(deepClone(v, seen)));
    return set;
  }
  if (ArrayBuffer.isView(obj)) {
    return new obj.constructor(obj.buffer.slice(0));
  }

  const clone = Array.isArray(obj) ? [] : Object.create(Object.getPrototypeOf(obj));
  seen.set(obj, clone);

  for (const key of Reflect.ownKeys(obj)) {
    const desc = Object.getOwnPropertyDescriptor(obj, key);
    if ('value' in desc) {
      desc.value = deepClone(desc.value, seen);
    }
    Object.defineProperty(clone, key, desc);
  }

  return clone;
}
```

### JSON.parse(JSON.stringify()) — почему НЕ надо

```js
const obj = {
  date: new Date(),         // → строка, а не Date
  regex: /test/,            // → пустой объект {}
  undef: undefined,         // → свойство удалено
  nan: NaN,                 // → null
  inf: Infinity,            // → null
  fn: () => {},             // → свойство удалено
  map: new Map([[1, 2]])    // → пустой объект {}
};

// Циклические ссылки → TypeError
```

---

## 6. Object.is() и алгоритмы сравнения

### Три алгоритма сравнения в JavaScript

| Сравнение | `NaN === NaN` | `-0 === +0` | Где используется |
|---|---|---|---|
| **Strict Equality** (`===`) | `false` | `true` | Оператор `===`, `Array.prototype.indexOf()` |
| **SameValueZero** | `true` | `true` | `Map`, `Set`, `Array.prototype.includes()` |
| **SameValue** | `true` | `false` | `Object.is()`, `Object.defineProperty()` для проверки изменений |

```js
// Strict Equality (===)
NaN === NaN;         // false
-0 === +0;           // true

// SameValue — Object.is()
Object.is(NaN, NaN); // true  ← главное отличие
Object.is(-0, +0);   // false ← второе отличие

// SameValueZero — используется Set и Map
const set = new Set();
set.add(NaN);
set.has(NaN);        // true (SameValueZero)
set.add(-0);
set.has(+0);         // true (SameValueZero считает -0 и +0 одинаковыми)
```

### Когда это важно

```js
// Реактивные системы: нужно ли ре-рендерить?
function hasChanged(oldVal, newVal) {
  // Object.is корректно обрабатывает NaN (не считает изменением NaN → NaN)
  // и различает -0 и +0 (считает изменением +0 → -0)
  return !Object.is(oldVal, newVal);
}

// Именно так работает React (Object.is для сравнения state/props)
```

---

## 7. Computed properties и Symbol keys

### Computed property names

Ключи объекта вычисляются в рантайме через `[expression]`:

```js
const prefix = 'user';
const idx = 42;

const obj = {
  [`${prefix}_${idx}`]: 'Alice',
  [`get${prefix[0].toUpperCase() + prefix.slice(1)}`]() {
    return this[`${prefix}_${idx}`];
  }
};

console.log(obj.user_42);    // 'Alice'
console.log(obj.getUser());  // 'Alice'
```

Часто используется для создания объектов из динамических данных:

```js
function createLookup(items, keyProp) {
  return Object.fromEntries(
    items.map(item => [item[keyProp], item])
  );
}
```

### Symbol как ключи

`Symbol` — уникальный примитив, который не конфликтует ни с какими строковыми ключами:

```js
const id = Symbol('id');
const obj = {
  [id]: 123,
  id: 'public-id'  // не конфликтует с Symbol('id')
};

console.log(obj[id]);  // 123
console.log(obj.id);   // 'public-id'
```

### Soft private vs Hard private

**Soft private** (Symbol) — свойство скрыто от `for...in`, `Object.keys()`, `JSON.stringify()`, но **доступно** через `Object.getOwnPropertySymbols()` и `Reflect.ownKeys()`:

```js
const _balance = Symbol('balance');

class Account {
  constructor(initial) {
    this[_balance] = initial;
  }
  get balance() { return this[_balance]; }
}

const acc = new Account(1000);
Object.keys(acc);                     // []
Object.getOwnPropertySymbols(acc);    // [Symbol(balance)] — доступ есть!
```

**Hard private** (`#field`) — настоящая приватность на уровне спецификации. Нет способа получить доступ извне:

```js
class Account {
  #balance;
  constructor(initial) { this.#balance = initial; }
  get balance() { return this.#balance; }
}

const acc = new Account(1000);
// acc.#balance → SyntaxError
// Reflect.ownKeys(acc) → [] — #balance не видно
```

### Well-known Symbols (обзор ключевых)

| Symbol | Назначение |
|---|---|
| `Symbol.iterator` | Определяет итератор по умолчанию (`for...of`) |
| `Symbol.asyncIterator` | Определяет асинхронный итератор (`for await...of`) |
| `Symbol.toPrimitive` | Кастомное преобразование объекта в примитив |
| `Symbol.toStringTag` | Настройка `Object.prototype.toString.call()` |
| `Symbol.hasInstance` | Кастомная логика `instanceof` |
| `Symbol.species` | Конструктор для производных объектов (используется в `Array.prototype.map`, и т.д.) |
| `Symbol.isConcatSpreadable` | Контроль поведения `Array.prototype.concat()` |

```js
class Money {
  constructor(amount, currency) {
    this.amount = amount;
    this.currency = currency;
  }

  [Symbol.toPrimitive](hint) {
    if (hint === 'number')  return this.amount;
    if (hint === 'string')  return `${this.amount} ${this.currency}`;
    return this.amount; // default
  }

  get [Symbol.toStringTag]() {
    return 'Money';
  }
}

const price = new Money(99.99, 'USD');
console.log(+price);                        // 99.99
console.log(`${price}`);                     // '99.99 USD'
console.log(Object.prototype.toString.call(price)); // '[object Money]'
```

---

## 8. Nullish и Optional операторы

### Optional chaining `?.`

Безопасный доступ к свойствам, которые могут быть `null` или `undefined`:

```js
const user = { address: { street: 'Main St' } };

// Без optional chaining
const zip = user && user.address && user.address.zip;

// С optional chaining
const zip2 = user?.address?.zip; // undefined — не TypeError

// Работает с методами
user.greet?.();          // undefined, метода нет — не вызывается

// Работает с computed properties
const key = 'address';
user?.[key]?.street;     // 'Main St'

// Работает с вызовом функций
const callback = null;
callback?.();            // undefined, не TypeError
```

**Важно**: `?.` проверяет только на `null`/`undefined`. Если значение `0`, `''`, `false` — цепочка продолжается.

### Nullish coalescing `??`

Возвращает правый операнд, **только если левый — `null` или `undefined`**:

```js
const port = config.port ?? 3000;

// Сравнение с ||
0 || 3000;      // 3000 — 0 falsy
0 ?? 3000;      // 0    — 0 НЕ nullish

'' || 'default'; // 'default' — '' falsy
'' ?? 'default'; // ''         — '' НЕ nullish

false || true;   // true
false ?? true;   // false
```

### Logical assignment operators

```js
// ??= — присвоить, если текущее значение null/undefined
options.timeout ??= 5000;
// Эквивалент: options.timeout = options.timeout ?? 5000;
// НО! Если options.timeout уже не nullish — сеттер НЕ вызывается

// ||= — присвоить, если текущее значение falsy
options.title ||= 'Untitled';

// &&= — присвоить, если текущее значение truthy
user.name &&= user.name.trim();
// Если user.name существует и truthy — trim'ит. Если null/undefined — не трогает.
```

**Тонкость**: эти операторы используют **short-circuit evaluation**. Если условие не выполнено, присваивание не происходит (сеттер не вызывается, side-effects не запускаются).

```js
const obj = {
  set value(v) { console.log('setter called!', v); },
  get value() { return 42; }
};

obj.value ??= 100; // Сеттер НЕ вызывается — 42 не nullish
obj.value ||= 100; // Сеттер НЕ вызывается — 42 truthy
obj.value &&= 100; // Сеттер ВЫЗЫВАЕТСЯ — 42 truthy → присваиваем 100
```

---

## 9. Object.fromEntries() и трансформации

### object ↔ entries ↔ Map

```js
const obj = { a: 1, b: 2, c: 3 };

// Object → entries (array of [key, value])
const entries = Object.entries(obj);
// [['a', 1], ['b', 2], ['c', 3]]

// entries → Object
const restored = Object.fromEntries(entries);
// { a: 1, b: 2, c: 3 }

// Object → Map
const map = new Map(Object.entries(obj));

// Map → Object
const fromMap = Object.fromEntries(map);
```

### Трансформация свойств

Основной паттерн: `entries → map/filter → fromEntries`:

```js
// Фильтрация свойств
const filtered = Object.fromEntries(
  Object.entries(obj).filter(([key, val]) => val > 1)
);
// { b: 2, c: 3 }

// Трансформация значений
const doubled = Object.fromEntries(
  Object.entries(obj).map(([key, val]) => [key, val * 2])
);
// { a: 2, b: 4, c: 6 }

// Переименование ключей
const renamed = Object.fromEntries(
  Object.entries(obj).map(([key, val]) => [`prefix_${key}`, val])
);
// { prefix_a: 1, prefix_b: 2, prefix_c: 3 }

// Инвертирование ключей и значений
const inverted = Object.fromEntries(
  Object.entries(obj).map(([key, val]) => [val, key])
);
// { 1: 'a', 2: 'b', 3: 'c' }
```

### Из любого iterable

`Object.fromEntries()` принимает любой `iterable`, возвращающий `[key, value]`:

```js
// Из URLSearchParams
const params = new URLSearchParams('a=1&b=2&c=3');
const paramsObj = Object.fromEntries(params);
// { a: '1', b: '2', c: '3' }

// Из генератора
function* pairs() {
  yield ['x', 10];
  yield ['y', 20];
}
Object.fromEntries(pairs()); // { x: 10, y: 20 }
```

### Группировка (Object.groupBy — ES2024)

```js
const items = [
  { name: 'Apple',  type: 'fruit' },
  { name: 'Carrot', type: 'veggie' },
  { name: 'Banana', type: 'fruit' },
];

const grouped = Object.groupBy(items, item => item.type);
// {
//   fruit:  [{ name: 'Apple', ... }, { name: 'Banana', ... }],
//   veggie: [{ name: 'Carrot', ... }]
// }

// Если нужны ключи, которые не являются строками — Map.groupBy:
const mapGrouped = Map.groupBy(items, item => item.type);
```

---

## 10. Performance — объекты под нагрузкой

### Monomorphic vs Polymorphic vs Megamorphic

Инлайн-кэши V8 оптимизированы под **мономорфный** доступ — когда одна и та же функция всегда получает объекты одного hidden class:

```js
// Мономорфный — быстро
function getX(point) { return point.x; }

const points = [];
for (let i = 0; i < 100000; i++) {
  points.push({ x: i, y: i }); // один hidden class
}
points.forEach(getX); // IC остаётся monomorphic


// Мегаморфный — медленно
function getX2(obj) { return obj.x; }

const mixed = [
  { x: 1 },
  { x: 1, y: 2 },
  { x: 1, y: 2, z: 3 },
  { a: 0, x: 1 },
  { x: 1, toString() {} },
  // ... все разные hidden classes
];
mixed.forEach(getX2); // IC деградирует в megamorphic
```

**Практический вывод**: конструируйте объекты единообразно. Не добавляйте свойства условно в конструкторе — лучше установить в `undefined`.

```js
// Плохо — разные hidden classes
function createUser(name, age, email) {
  const user = { name };
  if (age) user.age = age;
  if (email) user.email = email;
  return user;
}

// Хорошо — один hidden class
function createUser(name, age, email) {
  return { name, age: age ?? undefined, email: email ?? undefined };
}
```

### Deletion penalty

`delete` — одна из самых дорогих операций над объектом:

```js
// Бенчмарк (условный)
const obj = { a: 1, b: 2, c: 3 };

delete obj.b;    // → может перевести в slow mode
obj.b = undefined; // → hidden class не меняется, fast mode сохраняется
```

Если нужно «убрать» свойство из объекта для дальнейшей передачи — используйте деструктуризацию:

```js
const { password, ...safeUser } = user;
// safeUser не содержит password, и это новый объект с чистым hidden class
```

### Объект как hashmap vs Map

| Критерий | Plain Object | `Map` |
|---|---|---|
| Ключи | Только `string` / `Symbol` | Любой тип (объекты, функции, примитивы) |
| Порядок | Целые числа → строки → символы | Порядок вставки (строго) |
| Размер | Нет встроенного `.size` | `map.size` — O(1) |
| Итерация | `Object.keys()` создаёт массив | `map.forEach()`, `for...of` — нативно iterable |
| Производительность вставки/удаления | Деградирует при частом `delete`, может перейти в slow mode | Оптимизирован для частых вставок/удалений |
| Сериализация | `JSON.stringify()` «из коробки» | Требует ручной сериализации |
| Прототипное загрязнение | `toString`, `constructor` и т.д. в цепочке (если не `Object.create(null)`) | Нет — `Map` не имеет прототипных ключей |
| Память (много ключей) | Больше overhead от hidden class transitions | Более эффективен для >100 ключей |

**Когда использовать `Map`**:

- Ключи — не строки (объекты, DOM-элементы, функции)
- Частые добавления и удаления записей (кэш, LRU)
- Нужен точный `.size`
- Данные не нужно сериализовать в JSON
- Потенциально большое и непредсказуемое количество ключей

**Когда достаточно объекта**:

- Фиксированная структура, известная на этапе написания кода
- Нужна JSON-сериализация
- Деструктуризация, spread, `Object.entries()` — удобнее
- Литеральный синтаксис `{}` — лаконичнее

```js
// Кэш с автоочисткой — Map
const cache = new Map();
function memoize(fn) {
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// Конфигурация приложения — plain object
const config = Object.freeze({
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  retries: 3
});
```

### Object.create(null) — чистый словарь

Когда объект используется исключительно как хранилище ключ-значение, стоит убрать прототип:

```js
const dict = Object.create(null);
dict.toString = 'some value'; // Безопасно — нет коллизии с Object.prototype.toString

// В обычном объекте:
const obj = {};
obj.toString = 'oops'; // Перезаписали Object.prototype.toString
String(obj); // TypeError: Cannot convert object to primitive value
```

### Советы по оптимизации

1. **Инициализируйте все свойства в конструкторе** — даже если значение `undefined`. Это обеспечивает единый hidden class.
2. **Не используйте `delete`** — присваивайте `undefined` или создавайте новый объект без ненужного свойства.
3. **Добавляйте свойства в одном и том же порядке** — разный порядок = разные hidden classes.
4. **Не меняйте тип значения свойства** — `obj.x = 1` затем `obj.x = 'string'` может вызвать деоптимизацию (V8 оптимизирует под конкретные типы).
5. **Используйте `Map` для динамических коллекций** — если ключи приходят из пользовательского ввода, API-ответов и т.п.
6. **Избегайте мегаморфного кода** — не передавайте объекты с разными shapes в одну hot function.
