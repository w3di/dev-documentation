# Type Coercion & Type Conversion

## Оглавление

- [Терминология](#терминология)
- [Abstract-операции спецификации](#abstract-операции-спецификации)
  - [ToPrimitive](#toprimitive)
  - [OrdinaryToPrimitive](#ordinarytoprimitive)
  - [Symbol.toPrimitive](#symboltoprimitive)
- [ToBoolean](#toboolean)
- [ToNumber](#tonumber)
- [ToString](#tostring)
- [Алгоритмы сравнения](#алгоритмы-сравнения)
  - [Abstract Equality (==)](#abstract-equality-)
  - [Strict Equality (===)](#strict-equality-)
  - [SameValue (Object.is)](#samevalue-objectis)
  - [SameValueZero](#samevaluezero)
- [Оператор +](#оператор-)
- [Implicit coercion в операторах](#implicit-coercion-в-операторах)

---

## Терминология

**Type Conversion** (явное преобразование) — программист намеренно вызывает преобразование типа:
`Number("42")`, `String(123)`, `Boolean(0)`.

**Type Coercion** (неявное приведение) — движок автоматически приводит тип, когда оператор или контекст
ожидает другой тип: `"5" - 2` приводит `"5"` к числу, `if (obj)` приводит `obj` к boolean.

Оба механизма в итоге вызывают одни и те же **abstract operations** из спецификации ECMA-262.
Разница исключительно в том, _кто_ инициирует вызов — код разработчика или движок.

---

## Abstract-операции спецификации

### ToPrimitive

> ECMA-262, раздел 7.1.1

`ToPrimitive(input, preferredType)` вызывается всякий раз, когда движку нужно привести
объект к примитиву. Параметр `preferredType` (он же `hint`) определяет, какой примитив
предпочтительнее.

Алгоритм (упрощённо):

1. Если `input` уже примитив — вернуть `input`.
2. Если у объекта определён `[Symbol.toPrimitive]` — вызвать его с `hint` и вернуть результат.
   Если результат не примитив — `TypeError`.
3. Иначе — вызвать `OrdinaryToPrimitive(input, hint)`.

`hint` принимает одно из трёх значений:

| hint        | Когда используется                                              |
|-------------|----------------------------------------------------------------|
| `"number"`  | Арифметические операторы, унарный `+`, `<`, `>`, `==` (к числу)|
| `"string"`  | Template literals, `String()`, ключ объекта `obj[key]`         |
| `"default"` | `+` (бинарный), `==` (при сравнении с примитивом)              |

> Важно: `"default"` в стандартных объектах ведёт себя так же, как `"number"` — сначала `valueOf`.
> Исключение: `Date` и `Symbol` переопределяют `[Symbol.toPrimitive]` и для `"default"` используют `"string"`.

### OrdinaryToPrimitive

> ECMA-262, раздел 7.1.1.1

Вызывается, если `[Symbol.toPrimitive]` не определён.

```
OrdinaryToPrimitive(O, hint):
  1. Если hint === "string":
       methodNames = ["toString", "valueOf"]
  2. Иначе (hint === "number" или "default"):
       methodNames = ["valueOf", "toString"]
  3. Для каждого name в methodNames:
       a. Получить method = O[name]
       b. Если method callable:
            result = method.call(O)
            Если result — примитив → вернуть result
  4. Throw TypeError
```

```js
const obj = {
  valueOf() { return 42; },
  toString() { return "hello"; }
};

// hint "number" → valueOf first
console.log(+obj);          // 42
console.log(obj - 0);       // 42

// hint "string" → toString first
console.log(`${obj}`);      // "hello"
console.log(String(obj));   // "hello"

// hint "default" → valueOf first (как "number")
console.log(obj + "");      // "42" (valueOf → 42, затем 42 + "" → "42")
console.log(obj == 42);     // true
```

```js
// Объект, где valueOf возвращает не примитив — fallback на toString
const tricky = {
  valueOf() { return {}; },   // не примитив — пропускаем
  toString() { return "fallback"; }
};

console.log(+tricky);        // NaN (toString → "fallback" → ToNumber("fallback") → NaN)
console.log(`${tricky}`);    // "fallback"
```

```js
// Ни valueOf, ни toString не возвращают примитив → TypeError
const broken = {
  valueOf() { return {}; },
  toString() { return {}; }
};

+broken; // TypeError: Cannot convert object to primitive value
```

### Symbol.toPrimitive

`Symbol.toPrimitive` — well-known symbol, позволяющий полностью перехватить `ToPrimitive`.
Если метод определён, `valueOf` и `toString` **не вызываются вообще**.

```js
const money = {
  amount: 100,
  currency: "USD",

  [Symbol.toPrimitive](hint) {
    switch (hint) {
      case "number":  return this.amount;
      case "string":  return `${this.amount} ${this.currency}`;
      case "default": return this.amount;
    }
  },

  // Эти методы ИГНОРИРУЮТСЯ при наличии Symbol.toPrimitive
  valueOf() { return 999; },
  toString() { return "ignored"; }
};

console.log(+money);          // 100       (hint "number")
console.log(`${money}`);      // "100 USD" (hint "string")
console.log(money + 50);      // 150       (hint "default")
console.log(money == 100);    // true      (hint "default")
```

Приоритет: `Symbol.toPrimitive` > `valueOf` / `toString`.

Если `Symbol.toPrimitive` возвращает не примитив — немедленный `TypeError`,
без fallback на `valueOf`/`toString`:

```js
const bad = {
  [Symbol.toPrimitive]() { return {}; }
};

+bad; // TypeError: Cannot convert object to primitive value
```

> `Date.prototype[Symbol.toPrimitive]` реализован так: hint `"string"` и `"default"` → `this.toString()`,
> hint `"number"` → `this.valueOf()`. Вот почему `date + ""` возвращает строку, а не число.

---

## ToBoolean

> ECMA-262, раздел 7.1.2

`ToBoolean` — простейшая abstract operation. Она **не вызывает** `ToPrimitive` и **не вызывает**
никаких пользовательских методов. Это чистая lookup-таблица:

| Тип аргумента | Результат                                     |
|---------------|-----------------------------------------------|
| `undefined`   | `false`                                       |
| `null`        | `false`                                       |
| `Boolean`     | без изменений                                 |
| `Number`      | `false` если `+0`, `-0`, `NaN`; иначе `true` |
| `BigInt`      | `false` если `0n`; иначе `true`               |
| `String`      | `false` если `""` (пустая строка); иначе `true`|
| `Symbol`      | `true` (всегда)                               |
| `Object`      | `true` (всегда, включая `[]`, `{}`, `new Boolean(false)`) |

### Полный список falsy values

```js
Boolean(false)      // false
Boolean(0)          // false
Boolean(-0)         // false
Boolean(0n)         // false
Boolean("")         // false
Boolean(null)       // false
Boolean(undefined)  // false
Boolean(NaN)        // false
```

### Особый случай: `document.all`

`document.all` — единственный объект в JavaScript, для которого `ToBoolean` возвращает `false`.
Это так называемый **willfully non-compliant** объект, определённый в спецификации HTML (не ECMA-262).
Его `[[IsHTMLDDA]]` internal slot заставляет `typeof document.all === "undefined"` и
`Boolean(document.all) === false`, хотя это объект.

```js
// Только в браузере:
console.log(typeof document.all);    // "undefined" (!)
console.log(Boolean(document.all));  // false (!)
console.log(document.all == null);   // true (!)
console.log(document.all == undefined); // true (!)

// Но при этом:
console.log(document.all !== undefined); // true
console.log(document.all !== null);      // true
```

### Double-bang (`!!`)

`!!value` — идиоматический способ явного приведения к boolean. Первый `!` приводит к boolean
и инвертирует, второй `!` инвертирует обратно:

```js
!!0          // false
!!""         // false
!!null       // false
!!undefined  // false
!!NaN        // false

!!1          // true
!!"hello"    // true
!![]         // true  (объект → true)
!!{}         // true  (объект → true)
```

### Short-circuit в `&&`, `||`, `??`

Эти операторы используют `ToBoolean` для определения ветки, но **возвращают оригинальное значение**,
а не boolean:

```js
// || — возвращает первый truthy или последний операнд
0 || "default"        // "default"
"hello" || "world"    // "hello"
"" || 0 || null       // null (все falsy → последний)

// && — возвращает первый falsy или последний операнд
1 && 2 && 3           // 3 (все truthy → последний)
1 && 0 && 3           // 0 (первый falsy)
null && undefined      // null

// ?? (Nullish Coalescing) — НЕ использует ToBoolean!
// Проверяет только null/undefined, НЕ все falsy:
0 ?? "default"        // 0       (0 не null/undefined)
"" ?? "default"       // ""      ("" не null/undefined)
null ?? "default"     // "default"
undefined ?? "default" // "default"
```

> `??` — частая ошибка на собеседованиях. Кандидаты путают `??` с `||`.
> `||` отсеивает все falsy, `??` — только `null` и `undefined`.

---

## ToNumber

> ECMA-262, раздел 7.1.4

| Тип аргумента | Результат                                                                                 |
|---------------|------------------------------------------------------------------------------------------|
| `undefined`   | `NaN`                                                                                    |
| `null`        | `+0`                                                                                     |
| `Boolean`     | `true` → `1`, `false` → `+0`                                                            |
| `Number`      | без изменений                                                                            |
| `BigInt`      | `TypeError`                                                                              |
| `String`      | Парсинг математического значения. `""` → `0`, `" "` → `0`, `"123"` → `123`, `"abc"` → `NaN` |
| `Symbol`      | `TypeError`                                                                              |
| `Object`      | `ToPrimitive(input, "number")`, затем `ToNumber` к результату                            |

### Ключевые gotchas

```js
// null vs undefined
Number(null)       // 0   — null → 0, историческое решение
Number(undefined)  // NaN — undefined → NaN

// Пустая строка и пробелы
Number("")         // 0   — пустая строка → 0
Number("  ")       // 0   — только пробелы → 0 (whitespace trimmed)
Number(" 123 ")    // 123

// parseInt vs Number — критическое различие
Number("")         // 0
parseInt("")       // NaN  (!)
Number("123abc")   // NaN
parseInt("123abc") // 123  (парсит до первого невалидного символа)

// Boolean
Number(true)       // 1
Number(false)      // 0

// true + true — оба приводятся к числу оператором +
true + true        // 2
true + false       // 1
```

### Унарный `+`

Унарный `+` — синтаксический сахар для `ToNumber()`:

```js
+"42"       // 42
+""         // 0
+true       // 1
+false      // 0
+null       // 0
+undefined  // NaN
+[]         // 0   (ToPrimitive → "" → ToNumber("") → 0)
+{}         // NaN (ToPrimitive → "[object Object]" → ToNumber → NaN)
+[1]        // 1   (ToPrimitive → "1" → ToNumber("1") → 1)
+[1, 2]     // NaN (ToPrimitive → "1,2" → NaN)
```

### Объекты через `ToPrimitive`

При `ToNumber(object)` движок вызывает `ToPrimitive(object, "number")`, что означает:
`valueOf()` first, затем `toString()`.

```js
// valueOf возвращает примитив → используется как число
const a = { valueOf() { return 3; } };
console.log(+a);    // 3
console.log(a * 2); // 6

// valueOf возвращает объект → fallback на toString
const b = {
  valueOf() { return {}; },
  toString() { return "7"; }
};
console.log(+b);    // 7 (toString → "7" → ToNumber → 7)

// Массив: valueOf() возвращает сам массив (не примитив), toString() → join(",")
console.log(+[]);     // 0   ("" → 0)
console.log(+[5]);    // 5   ("5" → 5)
console.log(+[1,2]);  // NaN ("1,2" → NaN)
```

### `Number` vs `parseInt` vs `parseFloat` — сводка

```js
// Number — строгий, требует всю строку быть числом (с учётом trim пробелов)
Number("10px")    // NaN
Number("0x1A")    // 26 (hex)
Number("0o17")    // 15 (octal)
Number("0b1010")  // 10 (binary)

// parseInt — толерантный, парсит с начала, ОБЯЗАТЕЛЬНО передавать radix
parseInt("10px")      // 10
parseInt("0x1A")      // 26  (auto-detect hex)
parseInt("010")       // 10  (в ES5+ нет auto-octal)
parseInt("10", 2)     // 2   (двоичная)
parseInt("  42  ")    // 42

// parseFloat — как parseInt, но для float, без radix
parseFloat("3.14px")  // 3.14
parseFloat("  .5  ")  // 0.5
```

---

## ToString

> ECMA-262, раздел 7.1.12

| Тип аргумента | Результат                                        |
|---------------|--------------------------------------------------|
| `undefined`   | `"undefined"`                                    |
| `null`        | `"null"`                                         |
| `Boolean`     | `"true"` или `"false"`                           |
| `Number`      | `"NaN"`, `"0"`, `"Infinity"`, или числовая строка|
| `BigInt`      | Строковое представление (`10n` → `"10"`)          |
| `String`      | без изменений                                    |
| `Symbol`      | `TypeError` (при неявном), `"Symbol(desc)"` через `String()` |
| `Object`      | `ToPrimitive(input, "string")`, затем `ToString` к результату |

### Symbol — особый случай

```js
const sym = Symbol("mySymbol");

// Явное преобразование — работает
String(sym);        // "Symbol(mySymbol)"
sym.toString();     // "Symbol(mySymbol)"
sym.description;    // "mySymbol"

// Неявное преобразование — TypeError!
"value: " + sym;    // TypeError: Cannot convert a Symbol value to a string
`value: ${sym}`;    // TypeError: Cannot convert a Symbol value to a string
```

Это сделано намеренно — символы не должны случайно конвертироваться в строки,
так как они задуманы как уникальные идентификаторы.

### `toString()` с radix

```js
const n = 255;
n.toString(2);    // "11111111"  (двоичная)
n.toString(8);    // "377"       (восьмеричная)
n.toString(16);   // "ff"        (шестнадцатеричная)
n.toString(36);   // "73"        (основание 36: 0-9 + a-z)

// Практический пример: генерация случайного ID
Math.random().toString(36).slice(2); // "k7f2a9x3..."
```

### Объекты через `ToPrimitive`

При `ToString(object)` движок вызывает `ToPrimitive(object, "string")`, что означает:
`toString()` first, затем `valueOf()`.

```js
// Стандартные объекты
String({});          // "[object Object]"
String([1, 2, 3]);   // "1,2,3"
String([]);           // ""
String(new Date());   // "Sun Jan 01 2023 ..." (Date переопределяет toString)

// Кастомный toString
const user = {
  name: "Alice",
  toString() { return `User(${this.name})`; }
};
console.log(`Hello, ${user}`);  // "Hello, User(Alice)"
console.log("" + user);         // "User(Alice)"
```

### `JSON.stringify` !== `ToString`

`JSON.stringify` — это **не** abstract operation `ToString`. Это отдельный алгоритм
с совершенно другим поведением:

```js
// ToString (String())
String(undefined);      // "undefined"
String(Symbol("x"));    // "Symbol(x)"
String(function(){});    // "function(){}"
String({a: 1});         // "[object Object]"

// JSON.stringify — другие правила
JSON.stringify(undefined);     // undefined (не строка, а undefined!)
JSON.stringify(Symbol("x"));   // undefined
JSON.stringify(function(){});   // undefined
JSON.stringify({a: 1});        // '{"a":1}'
JSON.stringify(NaN);           // "null"  (!)
JSON.stringify(Infinity);      // "null"  (!)

// JSON.stringify с toJSON
const obj = {
  data: 42,
  toJSON() { return { value: this.data }; }
};
JSON.stringify(obj); // '{"value":42}' — вызывает toJSON, не toString
```

---

## Алгоритмы сравнения

JavaScript имеет **четыре** алгоритма сравнения равенства. Каждый используется в разных контекстах.

### Abstract Equality (`==`)

> ECMA-262, раздел 7.2.14 — `IsLooselyEqual(x, y)`

Алгоритм пошагово:

```
1. Если Type(x) === Type(y):
     → вызвать Strict Equality (===)

2. null == undefined → true
   undefined == null → true

3. Если x — Number и y — String:
     → x == ToNumber(y)

4. Если x — String и y — Number:
     → ToNumber(x) == y

5. Если x — BigInt и y — String:
     → Попытка StringToBigInt(y), если NaN → false

6. Если x — Boolean:
     → ToNumber(x) == y
     (true → 1, false → 0, затем сравнение заново)

7. Если y — Boolean:
     → x == ToNumber(y)

8. Если x — String/Number/BigInt/Symbol и y — Object:
     → x == ToPrimitive(y)

9. Если x — Object и y — String/Number/BigInt/Symbol:
     → ToPrimitive(x) == y

10. Если x — BigInt и y — Number (или наоборот):
      → Если любой NaN или ±Infinity → false
      → Сравнить математические значения

11. Иначе → false
```

### Критический момент: boolean приводится к числу ПЕРВЫМ

```js
// Многие думают: [] → truthy, поэтому [] == true → true. НЕТ!
[] == true
// Шаг 7: true → 1, теперь [] == 1
// Шаг 9: ToPrimitive([]) → "" , теперь "" == 1
// Шаг 4: ToNumber("") → 0, теперь 0 == 1
// → false

[] == false
// Шаг 7: false → 0, теперь [] == 0
// Шаг 9: ToPrimitive([]) → "", теперь "" == 0
// Шаг 4: ToNumber("") → 0, теперь 0 == 0
// → true

// Вот почему:
if ([]) console.log("truthy");  // выведет "truthy" (ToBoolean([]) → true)
[] == false;                     // true (но через ToNumber, не ToBoolean!)
```

### `null` и `undefined`

```js
null == undefined   // true  (специальное правило спецификации)
null == null        // true
undefined == undefined // true

// null и undefined НЕ равны ничему другому:
null == 0           // false (нет приведения!)
null == ""          // false
null == false       // false
undefined == 0      // false
undefined == ""     // false
undefined == false  // false
```

> Это делает `== null` безопасным паттерном для проверки `null` или `undefined`:
> `if (x == null)` — эквивалент `if (x === null || x === undefined)`.

### `NaN`

```js
NaN == NaN    // false (NaN не равен ничему, включая себя)
NaN != NaN    // true
NaN === NaN   // false

// Проверка на NaN:
Number.isNaN(NaN)   // true (надёжный способ)
isNaN("abc")        // true (!) — сначала ToNumber("abc") → NaN, потом проверка
Number.isNaN("abc") // false — без приведения типов
```

### Таблица комбинаций `==`

```js
// Строки и числа
"0" == false   // true  ("0" → ToNumber → 0, false → 0, 0 == 0)
"" == false    // true  ("" → 0, false → 0)
"" == 0        // true  ("" → 0)
" " == 0       // true  (" " → 0)

// Массивы
[] == false    // true  ([] → "" → 0, false → 0)
[0] == false   // true  ([0] → "0" → 0, false → 0)
[""] == false  // true  ([""] → "" → 0, false → 0)
[[]] == false  // true  ([[]] → "" → 0, false → 0)

// Объекты
({}) == true   // false ({} → "[object Object]" → NaN, true → 1)
({}) == false  // false ({} → "[object Object]" → NaN, false → 0)

// Массив с одним элементом
[1] == 1       // true  ([1] → "1" → 1)
["1"] == 1     // true  (["1"] → "1" → 1)
```

---

### Strict Equality (`===`)

> ECMA-262, раздел 7.2.16 — `IsStrictlyEqual(x, y)`

Никакого приведения типов. Алгоритм:

```
1. Если Type(x) !== Type(y) → false
2. Если x — Number:
     a. Если x — NaN → false
     b. Если y — NaN → false
     c. Если x и y — одинаковое числовое значение → true
     d. Если x — +0 и y — -0 → true
     e. Если x — -0 и y — +0 → true
     f. Иначе → false
3. Вызвать SameValueNonGeneric(x, y)
```

Ключевые edge cases:

```js
NaN === NaN    // false (по стандарту IEEE 754)
+0 === -0      // true  (по стандарту IEEE 754)
-0 === +0      // true

null === null        // true
undefined === undefined // true
null === undefined   // false (разные типы!)
```

---

### SameValue (`Object.is`)

> ECMA-262, раздел 7.2.11

`Object.is` использует алгоритм `SameValue`, который отличается от `===` в двух случаях:

```js
// === говорит true, Object.is говорит false
+0 === -0              // true
Object.is(+0, -0)     // false ← различает знак нуля

// === говорит false, Object.is говорит true
NaN === NaN            // false
Object.is(NaN, NaN)   // true  ← NaN равен самому себе
```

Алгоритм:

```
SameValue(x, y):
  1. Если Type(x) !== Type(y) → false
  2. Если x — Number:
       a. Если x — NaN и y — NaN → true
       b. Если x — +0 и y — -0 → false
       c. Если x — -0 и y — +0 → false
       d. Если x === y (числовое значение) → true
       e. Иначе → false
  3. SameValueNonGeneric(x, y)
```

Где используется `SameValue`:
- `Object.is()`
- `Object.defineProperty` — при проверке, изменилось ли значение свойства
- Внутренние операции спецификации

```js
// Практическое применение: надёжная проверка на -0
function isNegativeZero(x) {
  return Object.is(x, -0);
}
isNegativeZero(-0);  // true
isNegativeZero(0);   // false

// Альтернатива без Object.is:
function isNegativeZeroAlt(x) {
  return x === 0 && (1 / x) === -Infinity;
}
```

---

### SameValueZero

> ECMA-262, раздел 7.2.12

`SameValueZero` — гибрид `===` и `SameValue`:
- `NaN === NaN` → **true** (как `SameValue`)
- `+0 === -0` → **true** (как `===`)

```
SameValueZero(x, y):
  1. Если Type(x) !== Type(y) → false
  2. Если x — Number:
       a. Если x — NaN и y — NaN → true   ← отличие от ===
       b. Если x — +0 и y — -0 → true     ← отличие от SameValue
       c. Если x — -0 и y — +0 → true     ← отличие от SameValue
       d. Если x === y → true
       e. Иначе → false
  3. SameValueNonGeneric(x, y)
```

Где используется:
- `Array.prototype.includes()`
- `Map` (ключи)
- `Set` (значения)
- `ArrayBuffer` и `SharedArrayBuffer` операции

```js
// includes использует SameValueZero — находит NaN
[1, 2, NaN].includes(NaN);     // true  ← SameValueZero
[1, 2, NaN].indexOf(NaN);      // -1    ← Strict Equality (===)

// Set дедуплицирует через SameValueZero
const set = new Set();
set.add(NaN);
set.add(NaN);
set.size;    // 1 (NaN === NaN по SameValueZero)

set.add(+0);
set.add(-0);
set.size;    // 2 (+0 и -0 равны по SameValueZero, не добавляется дубликат)
// Было 1 (NaN), стало 2 после add(+0) — нет, add(-0) не добавит новый

// Map аналогично:
const map = new Map();
map.set(NaN, "a");
map.set(NaN, "b");
map.get(NaN);    // "b" (один ключ NaN, перезаписан)
map.size;        // 1
```

### Сводная таблица алгоритмов

| Операция          | `NaN` vs `NaN` | `+0` vs `-0` | Приведение типов |
|-------------------|:---------------:|:-------------:|:----------------:|
| `==`              | `false`         | `true`        | Да               |
| `===`             | `false`         | `true`        | Нет              |
| `Object.is`       | **`true`**      | **`false`**   | Нет              |
| `SameValueZero`   | **`true`**      | `true`        | Нет              |

---

## Оператор `+`

> ECMA-262, раздел 13.15.3 — `ApplyStringOrNumericBinaryOperator`

Бинарный `+` — единственный арифметический оператор, который может выполнять конкатенацию строк.
Алгоритм:

```
1. lprim = ToPrimitive(lval)  // hint "default"
2. rprim = ToPrimitive(rval)  // hint "default"
3. Если lprim — String ИЛИ rprim — String:
     → ToString(lprim) + ToString(rprim)  // конкатенация
4. Иначе:
     → ToNumber(lprim) + ToNumber(rprim)  // сложение
```

> Ключевой момент: `ToPrimitive` вызывается с hint `"default"`, который для обычных объектов
> работает как `"number"` (valueOf first). Но для `Date` — как `"string"`.

### Знаменитые gotchas

```js
// [] + []
// ToPrimitive([]) → [].valueOf() → [] (не примитив) → [].toString() → ""
// "" + "" → ""
[] + []    // ""

// [] + {}
// ToPrimitive([]) → ""
// ToPrimitive({}) → ({}).valueOf() → {} (не примитив) → ({}).toString() → "[object Object]"
// "" + "[object Object]" → "[object Object]"
[] + {}    // "[object Object]"

// {} + []
// ВНИМАНИЕ: зависит от контекста!
// В консоли браузера: {} интерпретируется как пустой блок, а +[] как унарный +
// {} + []  → +[] → +"" → 0

// Но в выражении:
({} + [])  // "[object Object]" (скобки заставляют {} быть объектом)

// "" + {}
"" + {}    // "[object Object]"

// true + true
// Оба — boolean, не string → ToNumber(true) + ToNumber(true) → 1 + 1
true + true   // 2
true + false  // 1

// [] == false — разбор выше
[] == false   // true

// Числа и строки
1 + "2"       // "12" (1 → "1", конкатенация)
"3" + 4       // "34"
1 + 2 + "3"   // "33" (сначала 1 + 2 → 3, потом 3 + "3" → "33")
"1" + 2 + 3   // "123" (сначала "1" + 2 → "12", потом "12" + 3 → "123")
```

### Вычитание, умножение, деление

В отличие от `+`, операторы `-`, `*`, `/`, `%` **всегда** вызывают `ToNumber`:

```js
"5" - 2      // 3
"5" * "3"    // 15
"10" / "2"   // 5
"7" % "2"    // 1

// Нет string-ветки:
"hello" - 1  // NaN
[] - 1       // -1   ([] → "" → 0, 0 - 1 = -1)
{} - 1       // NaN  (в выражении: {} → "[object Object]" → NaN)
```

### Даты и `+`

```js
const now = new Date();

// Date имеет Symbol.toPrimitive:
// hint "default" → toString (в отличие от обычных объектов!)
now + 1;          // "Sun Jan 01 2023 ...1" (строка + число = конкатенация)
now - 1;          // 1672531199999 (ToNumber вызывает valueOf → timestamp)

// Явное получение timestamp:
+now;             // 1672531200000 (hint "number" → valueOf)
now.getTime();    // 1672531200000 (то же самое, но читабельнее)
Date.now();       // текущий timestamp без создания объекта
```

---

## Implicit coercion в операторах

### Abstract Relational Comparison (`<`, `>`, `<=`, `>=`)

> ECMA-262, раздел 7.2.13

```
1. Вызвать ToPrimitive для обоих операндов с hint "number"
2. Если ОБА результата — строки:
     → Лексикографическое сравнение (по code units)
3. Иначе:
     → ToNumber для обоих, числовое сравнение
```

```js
// Оба строки → лексикографическое сравнение
"abc" < "abd"     // true
"10" < "9"        // true (!) — "1" < "9" по code unit

// Хотя бы один — не строка → ToNumber
"10" < 9          // false (ToNumber("10") → 10, 10 < 9 → false)
"10" > 9          // true

// null и undefined
null < 1          // true  (ToNumber(null) → 0)
null > -1         // true
null >= 0         // true
null == 0         // false (!) — == имеет специальное правило для null

undefined < 1     // false (ToNumber(undefined) → NaN, NaN < 1 → false)
undefined > 1     // false
undefined >= 0    // false (NaN >= 0 → false)

// NaN — любое сравнение с NaN возвращает false
NaN < 1           // false
NaN > 1           // false
NaN <= NaN        // false
NaN >= NaN        // false
```

### Условные конструкции (`if`, `while`, `for`, `?:`)

Все используют `ToBoolean`:

```js
if ("") { /* не выполнится */ }
if ("0") { /* выполнится — непустая строка */ }
if ([]) { /* выполнится — объект всегда truthy */ }
if (0) { /* не выполнится */ }

// Тернарный оператор
const result = [] ? "truthy" : "falsy";  // "truthy"

// while
while (array.length) {
  // length > 0 → truthy, length === 0 → falsy (0)
  array.pop();
}
```

### Template literals используют `ToString`

```js
const sym = Symbol("x");
`${42}`;          // "42"     — ToString(42)
`${null}`;        // "null"   — ToString(null)
`${undefined}`;   // "undefined"
`${{}}`;          // "[object Object]" — ToPrimitive с hint "string"
`${[1,2]}`;       // "1,2"

// Symbol — TypeError (неявное ToString запрещено)
`${sym}`;         // TypeError: Cannot convert a Symbol value to a string
```

### Побитовые операторы используют `ToInt32` / `ToUint32`

```js
// Побитовые операторы приводят операнды к 32-bit integer через ToInt32:
"5" | 0          // 5
"5.7" | 0        // 5 (truncation, не rounding)
null | 0         // 0
undefined | 0    // 0
true | 0         // 1
NaN | 0          // 0

// Двойная тильда ~~ как замена Math.trunc (для 32-bit диапазона):
~~5.7            // 5
~~-5.7           // -5
~~"42"           // 42
~~NaN            // 0

// ВНИМАНИЕ: работает только для значений в диапазоне 32-bit int
~~2147483648     // -2147483648 (overflow!)
```

---

## Приложение: шпаргалка по приведению типов

```js
// Самые частые ловушки на собеседованиях:

// 1. typeof null
typeof null           // "object" (исторический баг)

// 2. NaN
typeof NaN            // "number"
NaN === NaN           // false
NaN !== NaN           // true

// 3. Пустой массив
[] == false           // true
![] == false          // true (!) — ![] → false, false == false → true
[] == ![]             // true (!) — ![] → false, [] == false → true (см. выше)

// 4. Сложение с массивами
[] + []               // ""
[] + {}               // "[object Object]"
{} + []               // 0 (в консоли — {} как блок)
({}) + []             // "[object Object]"

// 5. Объект-обёртка Boolean
new Boolean(false) == false  // true (ToPrimitive → false)
!!new Boolean(false)         // true (!) — объект → ToBoolean → true

if (new Boolean(false)) {
  console.log("выполнится!"); // объект truthy, даже если внутри false
}

// 6. Сравнение строк
"2" > "12"            // true (лексикографическое: "2" > "1")
"2" > 12              // false (ToNumber: 2 > 12)

// 7. void оператор
void 0 === undefined  // true (void всегда возвращает undefined)
```
