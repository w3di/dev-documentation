# Strict Mode

## Оглавление

- [Как включается strict mode](#как-включается-strict-mode)
- [Что меняется в strict mode](#что-меняется-в-strict-mode)
- [Практическое значение](#практическое-значение)
- [Edge cases](#edge-cases)

---

## Как включается strict mode

### Директива `"use strict"`

Строгий режим активируется директивой `"use strict"` (или `'use strict'`), которая должна быть **первым выражением** в скрипте или теле функции. Любой код перед ней (кроме других строковых литералов-директив) отменяет её действие.

```js
// Strict mode для всего скрипта
"use strict";

x = 10; // ReferenceError: x is not defined
```

```js
// Strict mode только для функции
function process() {
  "use strict";
  y = 20; // ReferenceError: y is not defined
}

z = 30; // OK — sloppy mode, создаётся глобальная переменная
```

### Автоматический strict mode

Некоторые конструкции языка работают в строгом режиме **по умолчанию**, без явной директивы:

```js
// ES Modules — всегда strict
// file: module.mjs
export function greet() {
  // здесь уже strict mode
  delete Object.prototype; // TypeError
}
```

```js
// Тело класса — всегда strict
class User {
  constructor() {
    // strict mode автоматически
    arguments.callee; // TypeError
  }
}
```

Это означает, что в современных проектах, использующих ES-модули, явная директива `"use strict"` **избыточна** — она уже подразумевается.

---

## Что меняется в strict mode

### 1. Запрет неявных глобальных переменных

В sloppy mode присваивание необъявленной переменной молча создаёт свойство на `globalThis`. В strict mode — это `ReferenceError`:

```js
"use strict";

mistypedVariable = 42; // ReferenceError: mistypedVariable is not defined
```

Это одна из самых важных защит: опечатка в имени переменной немедленно обнаруживается, а не превращается в трудноуловимый баг.

### 2. `this` в функциях равен `undefined`

В sloppy mode при вызове функции без явного контекста `this` указывает на `globalThis` (`window` в браузере). В strict mode — `undefined`:

```js
"use strict";

function showThis() {
  console.log(this); // undefined
}

showThis();
```

```js
// Практический пример — ошибка обнаруживается сразу
"use strict";

class Timer {
  start() {
    setTimeout(function () {
      this.tick(); // TypeError: Cannot read properties of undefined
      // В sloppy mode this === window, и ошибка была бы другой или скрытой
    }, 1000);
  }
}
```

### 3. Запрет `with`

Оператор `with` полностью запрещён, поскольку он делает невозможным статический анализ scope:

```js
"use strict";

with (Math) {     // SyntaxError: Strict mode code may not include a with statement
  console.log(PI);
}
```

### 4. `delete` на переменных, функциях и аргументах — ошибка

```js
"use strict";

var x = 10;
delete x; // SyntaxError: Delete of an unqualified identifier in strict mode

function foo() {}
delete foo; // SyntaxError
```

В sloppy mode `delete x` молча возвращает `false` и ничего не делает.

### 5. Дублирование имён параметров — ошибка

```js
"use strict";

// SyntaxError: Duplicate parameter name not allowed in this context
function sum(a, a, b) {
  return a + a + b;
}
```

В sloppy mode второй `a` перезаписывал бы первый, и `sum(1, 2, 3)` вернул бы `7` вместо ожидаемых `6`.

### 6. `arguments` не алиасит параметры

В sloppy mode объект `arguments` и именованные параметры **связаны** — изменение одного меняет другое. В strict mode эта связь разорвана:

```js
"use strict";

function test(a) {
  a = 99;
  console.log(arguments[0]); // 1 — не изменился
}

test(1);
```

```js
// sloppy mode — опасное поведение
function testSloppy(a) {
  a = 99;
  console.log(arguments[0]); // 99 — алиасинг!
}

testSloppy(1);
```

### 7. Восьмеричные литералы запрещены

```js
"use strict";

var octal = 010; // SyntaxError: Octal literals are not allowed in strict mode
```

Используйте явный синтаксис `0o10` (ES2015):

```js
"use strict";

var octal = 0o10; // 8 — OK
```

### 8. `eval` не создаёт переменные в окружающем scope

```js
"use strict";

eval("var x = 42;");
console.log(typeof x); // "undefined" — переменная осталась внутри eval
```

В sloppy mode `x` «просочилась» бы в окружающий scope. Strict mode создаёт для `eval` изолированное `VariableEnvironment`.

### 9. Запрет `arguments.callee`

```js
"use strict";

function factorial(n) {
  if (n <= 1) return 1;
  return n * arguments.callee(n - 1); // TypeError: 'caller', 'callee', and 'arguments' properties
                                       // may not be accessed on strict mode functions
}
```

Решение — именованное функциональное выражение:

```js
const factorial = function fact(n) {
  if (n <= 1) return 1;
  return n * fact(n - 1);
};
```

### 10. Присваивание read-only свойствам — ошибка

```js
"use strict";

const obj = {};
Object.defineProperty(obj, "x", { value: 42, writable: false });

obj.x = 100; // TypeError: Cannot assign to read only property 'x'
```

```js
"use strict";

Object.freeze({ name: "Alice" }).name = "Bob"; // TypeError
```

---

## Практическое значение

### Безопасность

Strict mode устраняет целый класс «тихих» ошибок. Без него JavaScript молча проглатывает ошибки, которые в строгом режиме становятся явными `TypeError` или `SyntaxError`. Это критично на production, где «тихий» баг может оставаться незамеченным неделями.

### Оптимизации движка (V8)

V8 и другие движки могут выполнять **дополнительные оптимизации** для strict mode кода:

- **Нет алиасинга `arguments`** — движок может не создавать «тяжёлый» объект `arguments` и работать напрямую с параметрами.
- **Нет `with`** — позволяет полностью статически резолвить все идентификаторы на этапе компиляции.
- **`eval` изолирован** — движок знает, что `eval` не создаст новые переменные в текущем scope, и может оптимизировать замыкания.
- **`this` не нужно боксить** — в sloppy mode `this` примитив оборачивается в объект (`Number`, `String`), в strict mode передаётся as-is.

```js
// V8 может деоптимизировать sloppy mode функции с arguments
function sloppyHot(a, b) {
  arguments[0] = 0; // Убивает оптимизацию — V8 вынужден трекать алиасинг
  return a + b;
}

function strictHot(a, b) {
  "use strict";
  // V8 знает: arguments и параметры независимы — можно оптимизировать
  return a + b;
}
```

### Подготовка к будущим фичам

Strict mode резервирует ряд идентификаторов как ключевые слова для будущих версий языка:

```js
"use strict";

// SyntaxError — зарезервированные слова
var implements, interface, let, package, private, protected, public, static, yield;
```

Эти слова действительно были использованы в последующих версиях ECMAScript (`let`, `yield`, `static`, `interface` в TypeScript).

---

## Edge cases

### Strict mode внутри `eval`

`eval` в strict mode получает **собственное** `LexicalEnvironment`. Переменные, объявленные внутри, не утекают наружу:

```js
"use strict";

eval("var leaked = 1;");
// console.log(leaked); // ReferenceError

// Но: eval наследует strict mode из контекста
eval('"use strict"; var x = 1;'); // явный strict внутри eval — тоже изолирован
```

Важный нюанс — **indirect eval** (`(0, eval)(...)`) всегда выполняется в **глобальном scope**, но strict mode наследуется только если директива указана внутри строки:

```js
"use strict";

const indirectEval = eval;
indirectEval("var globalVar = 42;"); // создаёт глобальную переменную!
// indirect eval игнорирует strict mode окружающего контекста
```

### Strict функция внутри sloppy скрипта

Функция может быть strict внутри sloppy окружения. Strict mode **не распространяется** на вызывающий код:

```js
// sloppy mode
function outer() {
  x = 10; // OK — неявная глобальная

  function inner() {
    "use strict";
    y = 20; // ReferenceError — strict mode только здесь
  }

  inner();
}
```

### Конкатенация strict и sloppy скриптов

Это **классическая проблема** при бандлинге без модулей. Если strict-скрипт оказывается первым в concatenated файле, директива применяется ко всему файлу:

```js
// Файл 1 (strict)
"use strict";
function safeCode() { /* ... */ }

// Файл 2 (sloppy) — ПОСЛЕ конкатенации тоже станет strict!
function legacyCode() {
  x = 10; // ReferenceError! Не ожидалось автором файла 2
}
```

**Решения:**

1. Оборачивать каждый скрипт в IIFE при конкатенации:

```js
(function () {
  "use strict";
  // код strict-скрипта
})();

(function () {
  // код sloppy-скрипта — остаётся sloppy
})();
```

2. Использовать ES-модули или бандлер (Webpack, Rollup), которые изолируют scope каждого модуля.

### Strict mode и `Function` constructor

Код, созданный через `new Function(...)`, **не наследует** strict mode из окружающего контекста:

```js
"use strict";

const fn = new Function("x = 1; return x;");
fn(); // Работает! Function constructor создаёт sloppy функцию

const strictFn = new Function('"use strict"; x = 1; return x;');
// strictFn(); // ReferenceError — директива указана явно
```

### Strict mode и `this` в классах

Методы класса всегда работают в strict mode. Это означает, что потеря контекста приводит к `TypeError`, а не к тихому использованию `globalThis`:

```js
class EventBus {
  emit(event) {
    console.log(this); // undefined при потере контекста
  }
}

const bus = new EventBus();
const emit = bus.emit;
emit("click"); // this === undefined, не window
// TypeError при попытке обратиться к this.something
```

---

## Итого

| Аспект | Sloppy Mode | Strict Mode |
|--------|------------|-------------|
| Необъявленная переменная | Создаёт глобальную | `ReferenceError` |
| `this` в функции | `globalThis` | `undefined` |
| `with` | Разрешён | `SyntaxError` |
| Дубли параметров | Разрешены | `SyntaxError` |
| `arguments` алиасинг | Да | Нет |
| `eval` переменные | Утекают | Изолированы |
| `delete` на переменной | Тихий `false` | `SyntaxError` |
| Восьмеричные литералы (`010`) | Разрешены | `SyntaxError` |
| `arguments.callee` | Работает | `TypeError` |
| Присваивание read-only | Тихая неудача | `TypeError` |
