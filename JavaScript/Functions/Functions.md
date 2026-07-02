# Functions — полное руководство

> Любая функция в JavaScript — это объект первого класса (`first-class citizen`).
> Её можно присвоить переменной, передать как аргумент, вернуть из другой функции
> и хранить в структурах данных.

---

## Оглавление

1. [Function Object на уровне спецификации](#1-function-object-на-уровне-спецификации)
2. [Function Declaration](#2-function-declaration)
3. [Function Expression](#3-function-expression)
4. [Arrow Function](#4-arrow-function)
5. [IIFE](#5-iife)
6. [Function Constructor](#6-function-constructor)
7. [Generator Functions](#7-generator-functions)
8. [Рекурсия и TCO](#8-рекурсия-и-tco)
9. [Memoization](#9-memoization)
10. [Сводная таблица всех типов функций](#10-сводная-таблица-всех-типов-функций)

---

## 1. Function Object на уровне спецификации

### 1.1 Internal slots по ECMAScript

Каждый функциональный объект, создаваемый движком, обладает набором **internal slots** —
скрытых полей, недоступных из пользовательского кода, но определяющих поведение функции.

| Internal Slot            | Описание                                                                                      |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| `[[Call]]`               | Вызывается при обычном вызове `f()`. Если слот отсутствует, объект не `callable`.              |
| `[[Construct]]`          | Вызывается при `new f()`. Если отсутствует — `TypeError` при попытке `new`.                   |
| `[[ECMAScriptCode]]`     | Разобранное тело функции (`Parse Node`). Хранит AST кода.                                     |
| `[[Environment]]`        | Ссылка на `Lexical Environment`, в котором функция была **создана** (основа замыканий).        |
| `[[FormalParameters]]`   | Разобранный список формальных параметров.                                                     |
| `[[ThisMode]]`           | `"lexical"` (arrow), `"strict"` или `"global"` — определяет поведение `this`.                 |
| `[[Strict]]`             | `true`, если функция выполняется в `strict mode`.                                             |
| `[[HomeObject]]`         | Для методов — ссылка на объект, где метод определён (нужна для `super`).                      |
| `[[IsClassConstructor]]` | `true` для `class` конструкторов — запрещает вызов без `new`.                                 |
| `[[Realm]]`              | `Realm Record`, к которому привязана функция (глобальный контекст, `iframe` и т. д.).         |

Когда спецификация говорит «вызвать `[[Call]]`», движок выполняет внутренний алгоритм
`OrdinaryCallEvaluateBody`, который:
1. Создаёт новый `Execution Context`.
2. Привязывает `this` в соответствии с `[[ThisMode]]`.
3. Инициализирует `arguments` object (если не `arrow`).
4. Связывает параметры с аргументами.
5. Выполняет `[[ECMAScriptCode]]`.

### 1.2 V8 внутренние структуры

В движке V8 (Chrome, Node.js) каждая функция представлена несколькими C++ объектами:

- **`JSFunction`** — основной объект на хипе. Содержит указатели на `Map` (hidden class),
  `SharedFunctionInfo` и `Context` (аналог `[[Environment]]`).
- **`SharedFunctionInfo` (SFI)** — информация, общая для всех инстансов одной функции:
  `bytecode`, `source position table`, `function name`, `formal parameter count`.
  Создаётся один раз при парсинге. Если функция вызывается внутри цикла 1000 раз,
  будет 1000 `JSFunction`, но 1 `SharedFunctionInfo`.
- **`FeedbackVector`** — данные для оптимизирующего компилятора (`TurboFan`).
  Хранит типовую обратную связь: какие типы аргументов приходили, какие формы объектов
  использовались. На основе этих данных TurboFan строит спекулятивные оптимизации.
- **`Code`** — скомпилированный машинный код (или байткод `Ignition`).

```
JSFunction
  ├── Map (hidden class)
  ├── SharedFunctionInfo
  │     ├── BytecodeArray (Ignition bytecode)
  │     ├── name: "myFunc"
  │     └── formal_parameter_count: 2
  ├── Context (closure scope chain)
  └── FeedbackVector
        ├── slot[0]: Smi (monomorphic)
        └── slot[1]: polymorphic { Map1, Map2 }
```

### 1.3 Доступные свойства функции

Каждая обычная функция имеет ряд свойств, доступных из кода:

```js
function example(a, b, c) {}

example.name;       // "example" — имя функции (read-only в strict mode)
example.length;     // 3 — количество формальных параметров ДО первого параметра со значением по умолчанию
example.prototype;  // { constructor: example } — используется при new
example.constructor; // Function — конструктор, создавший этот объект

// length учитывает только параметры до первого default / rest
function demo(a, b = 1, ...rest) {}
demo.length; // 1 — только "a"
```

Свойство `.prototype` — это **не** прототип самой функции (это `Function.prototype`).
Это объект, который станет `[[Prototype]]` нового экземпляра при вызове через `new`:

```js
function Person(name) { this.name = name; }

const p = new Person("Alice");
Object.getPrototypeOf(p) === Person.prototype; // true
Person.prototype.constructor === Person;        // true
```

---

## 2. Function Declaration

### 2.1 Синтаксис и базовое поведение

`Function Declaration` (FD) — классический способ объявления функции:

```js
function greet(name) {
  return `Hello, ${name}!`;
}
```

Ключевая особенность — **полный hoisting**: и объявление, и тело функции
поднимаются в начало содержащей `VariableEnvironment` **до** выполнения любого кода.

```js
// Работает! FD полностью поднята
console.log(sum(2, 3)); // 5

function sum(a, b) {
  return a + b;
}
```

### 2.2 Hoisting: как это работает на уровне спецификации

При создании `Execution Context` для функции или скрипта движок выполняет
`InstantiateOrdinaryFunctionObject` (секция 15.2.4 спецификации):

1. Парсер обнаруживает FD на этапе `Declaration Instantiation`.
2. В `VariableEnvironment` создаётся привязка (binding) с именем функции.
3. Значение привязки **немедленно** устанавливается в объект функции (в отличие от `var`,
   который инициализируется `undefined`).

Поэтому FD доступна с самого начала выполнения контекста, а `var` нет:

```js
console.log(typeof myFunc); // "function" — FD полностью поднята
console.log(typeof myVar);  // "undefined" — var поднята, но не инициализирована

function myFunc() {}
var myVar = 42;
```

### 2.3 FD внутри блоков — Annex B (критически важно!)

По основной спецификации FD разрешены **только** на верхнем уровне функции или скрипта.
Но исторически браузеры позволяли FD внутри `if`, `for` и других блоков. Это поведение
формализовано в **Annex B** (legacy web compatibility) и различается между `sloppy` и `strict` mode.

#### Sloppy mode (по умолчанию):

```js
// sloppy mode
console.log(typeof f); // "undefined" — var f поднята на уровень функции

if (true) {
  // Внутри блока f — это полноценная FD с блочной областью
  console.log(typeof f); // "function"

  function f() { return "block"; }

  console.log(f()); // "block"
}

// После выхода из блока: var f = <значение f на момент выхода>
console.log(typeof f); // "function"
console.log(f());      // "block"
```

Что происходит по Annex B:
1. На уровне содержащей **функции** создаётся `var f = undefined` (hoisting).
2. Внутри блока создаётся блочная привязка `f` — полноценная FD.
3. В момент, когда управление **доходит** до FD внутри блока, значение `f`
   **копируется** из блочной привязки в `var`-привязку на уровне функции.

#### Strict mode:

```js
"use strict";

console.log(typeof f); // "undefined" — f не существует вне блока!

if (true) {
  function f() { return "block"; }
  console.log(f()); // "block"
}

console.log(typeof f); // "undefined" — f НЕ вышла за пределы блока
```

В `strict mode` FD внутри блока — это **блочная** привязка, аналогичная `let`.
Никакого копирования в `var` не происходит.

#### Почему это важно на практике:

```js
// Классическая ловушка в sloppy mode
var a = true;

if (a) {
  function test() { return 1; }
} else {
  function test() { return 2; }
}

// Результат НЕПРЕДСКАЗУЕМ и зависит от движка!
// Используйте FE вместо FD внутри блоков:
var test;
if (a) {
  test = function() { return 1; };
} else {
  test = function() { return 2; };
}
```

### 2.4 Приоритет FD над `var`

Если в одной области видимости есть FD и `var` с одинаковым именем,
FD **перезаписывает** `var` при инициализации:

```js
console.log(typeof x); // "function" — FD имеет приоритет

var x = 10;
function x() { return 42; }

console.log(typeof x); // "number" — var x = 10 выполнилось и перезаписало
```

Порядок `Declaration Instantiation`:
1. Сначала обрабатываются FD — создаются привязки и **инициализируются** функциями.
2. Затем обрабатываются `var` — создаются привязки, **но не перезаписывают** уже существующие.
3. При выполнении кода: `var x = 10` — присваивание перезаписывает функцию числом.

### 2.5 Когда использовать FD

- Утилитарные функции, которые должны быть доступны в любом месте модуля.
- Рекурсивные функции — имя всегда доступно внутри тела.
- Код, где важна читаемость объявлений «сверху вниз».
- Не используйте FD внутри блоков — всегда предпочитайте FE или `const`.

---

## 3. Function Expression

### 3.1 Базовый синтаксис

`Function Expression` (FE) — функция, определённая как часть выражения:

```js
const multiply = function(a, b) {
  return a * b;
};

multiply(3, 4); // 12
```

FE **не поднимается**. Переменная (`const`/`let`/`var`) поднимается по своим правилам,
но значение (функция) присваивается только в момент выполнения:

```js
console.log(multiply); // ReferenceError (если const/let) или undefined (если var)

const multiply = function(a, b) {
  return a * b;
};
```

### 3.2 Named Function Expression (NFE)

NFE — FE с именем. Имя доступно **только внутри** тела функции:

```js
const factorial = function fact(n) {
  if (n <= 1) return 1;
  return n * fact(n - 1); // fact доступен внутри
};

factorial(5); // 120
// fact(5);   // ReferenceError — fact не доступен снаружи!
```

Это работает потому, что спецификация создаёт **промежуточный** `Lexical Environment`
специально для имени NFE. Эта привязка `immutable` — её нельзя переприсвоить внутри:

```js
const f = function myName() {
  myName = 42;         // Тихо игнорируется в sloppy mode
  console.log(myName); // [Function: myName] — всё ещё функция!
};
// В strict mode — TypeError при попытке присвоения
```

### 3.3 NFE и `stack traces`

Именованные FE значительно улучшают отладку в production:

```js
// Плохо — в стеке будет "anonymous"
const handler = function() {
  throw new Error("Something went wrong");
};

// Хорошо — в стеке будет "handleUserClick"
const handler = function handleUserClick() {
  throw new Error("Something went wrong");
};

// Error: Something went wrong
//     at handleUserClick (app.js:3:9)  ← полезно!
```

### 3.4 `.name` property inference

Начиная с ES2015, движки выводят `.name` для анонимных FE из контекста присваивания:

```js
const greet = function() {};
greet.name; // "greet" — выведено из имени переменной

const obj = {
  method: function() {},
  get value() { return 42; }
};
obj.method.name; // "method"
// getter: "get value", setter: "set value"

// Но! Inference не работает во всех случаях:
const arr = [function() {}];
arr[0].name; // "" — пустая строка, inference не сработал

// NFE всегда побеждает inference:
const f = function g() {};
f.name; // "g" — имя NFE приоритетнее
```

### 3.5 Отличие от FD: FE как значение

FE может использоваться везде, где ожидается выражение:

```js
// Как аргумент callback
[1, 2, 3].map(function double(x) { return x * 2; });

// Условное определение
const strategy = condition
  ? function aggressive() { /* ... */ }
  : function conservative() { /* ... */ };

// Немедленный вызов (IIFE)
const result = function(x) { return x * x; }(5); // 25
```

### 3.6 Когда использовать FE

- `Callback`-функции: `addEventListener`, `Promise.then`, `Array.map`.
- Условное создание функций (вместо FD внутри блоков).
- Когда hoisting нежелателен — `const fn = function() {}` гарантирует,
  что функция не используется до определения.
- NFE — когда нужна рекурсия внутри анонимной функции.

---

## 4. Arrow Function

### 4.1 Синтаксис

```js
// Полная форма
const add = (a, b) => {
  return a + b;
};

// Implicit return (одно выражение)
const add = (a, b) => a + b;

// Один параметр — скобки необязательны
const double = x => x * 2;

// Без параметров
const now = () => Date.now();
```

### 4.2 Отсутствие `[[Construct]]`

Arrow function **не имеет** internal slot `[[Construct]]`. Попытка вызова через `new`
выбрасывает `TypeError`:

```js
const Foo = () => {};

new Foo(); // TypeError: Foo is not a constructor

// Проверка:
typeof Foo.prototype; // "undefined" — у arrow нет .prototype
```

Это принципиальное отличие: обычная функция — это `callable + constructable`,
arrow function — только `callable`.

### 4.3 Лексический `this`

Arrow function не создаёт собственный `this`. Она **захватывает** `this`
из `Lexical Environment` на момент создания (как обычную переменную через замыкание):

```js
class Timer {
  constructor() {
    this.seconds = 0;
  }

  start() {
    // Arrow захватывает this из метода start(), который привязан к экземпляру
    setInterval(() => {
      this.seconds++; // this === экземпляр Timer
      console.log(this.seconds);
    }, 1000);
  }
}

const t = new Timer();
t.start(); // 1, 2, 3, ...
```

`call`, `apply`, `bind` **не могут** изменить `this` у arrow function:

```js
const arrow = () => this;

const obj = { x: 42 };
arrow.call(obj);  // Window (или global) — this НЕ изменился
arrow.apply(obj); // Window
arrow.bind(obj)(); // Window
```

На уровне спецификации: у arrow function `[[ThisMode]]` === `"lexical"`,
поэтому шаг «привязать `this`» в `OrdinaryCallEvaluateBody` пропускается.

### 4.4 Нет `arguments`, `super`, `new.target`

Все эти значения наследуются лексически из окружающего контекста:

```js
function outer() {
  const arrow = () => {
    console.log(arguments); // arguments от outer(), НЕ собственный
  };
  arrow(1, 2, 3);
}

outer("a", "b"); // Arguments ["a", "b"]
```

Используйте `rest` параметры вместо `arguments`:

```js
const sum = (...args) => args.reduce((a, b) => a + b, 0);
sum(1, 2, 3); // 6
```

### 4.5 Implicit return — подводные камни

```js
// Возврат объектного литерала — НУЖНЫ скобки!
const getUser = () => ({ name: "Alice", age: 30 });

// Без скобок — это БЛОК с label "name" и выражением "Alice"
const broken = () => { name: "Alice" }; // undefined!
// Движок интерпретирует это как:
// () => { name: "Alice"; } — label "name", expression "Alice", нет return

// Многострочный return
const compute = (x) => (
  x * x
  + x * 2
  + 1
);
// Скобки () позволяют многострочное выражение без блока {}
```

### 4.6 Когда НЕ использовать arrow function

#### Методы объектов:

```js
const obj = {
  value: 42,
  // НЕПРАВИЛЬНО — this будет указывать на внешний scope, не на obj
  getValue: () => this.value,
  // ПРАВИЛЬНО
  getValue() { return this.value; },
};

obj.getValue(); // undefined (arrow) vs 42 (shorthand method)
```

#### Prototype methods:

```js
function Person(name) {
  this.name = name;
}

// НЕПРАВИЛЬНО
Person.prototype.greet = () => {
  return `Hi, ${this.name}`; // this !== экземпляр
};

// ПРАВИЛЬНО
Person.prototype.greet = function() {
  return `Hi, ${this.name}`;
};
```

#### Dynamic `this` (обработчики DOM):

```js
// НЕПРАВИЛЬНО — this будет внешний scope, не элемент
button.addEventListener("click", () => {
  this.classList.toggle("active"); // TypeError или неверный this
});

// ПРАВИЛЬНО
button.addEventListener("click", function() {
  this.classList.toggle("active"); // this === button
});
```

#### Конструкторы:

```js
// Arrow не может быть конструктором — нет [[Construct]]
const Widget = () => {};
new Widget(); // TypeError
```

### 4.7 Arrow function и `.name`

```js
const fn = () => {};
fn.name; // "fn" — name inference работает

const obj = { method: () => {} };
obj.method.name; // "method"
```

---

## 5. IIFE

### 5.1 Что такое IIFE

`Immediately Invoked Function Expression` — функция, которая определяется и
**немедленно вызывается**. Основная цель — создание изолированной области видимости.

### 5.2 Синтаксические варианты

```js
// Классический вариант (Crockford style)
(function() {
  console.log("IIFE");
}());

// Более распространённый
(function() {
  console.log("IIFE");
})();

// С именем (полезно для stack traces)
(function myIIFE() {
  console.log("named IIFE");
})();

// Unary operator варианты — превращают statement в expression
!function() { console.log("bang"); }();
void function() { console.log("void"); }();
+function() { console.log("plus"); }();
-function() { console.log("minus"); }();
~function() { console.log("tilde"); }();

// Arrow IIFE
(() => {
  console.log("arrow IIFE");
})();

// С аргументами
(function(global, doc) {
  // global === window, doc === document
  // Защита от минификации и переопределения глобальных переменных
})(window, document);
```

Разница между вариантами: операторы `!`, `void`, `+` и т. д. заставляют парсер
трактовать `function` как **expression**, а не **declaration**. Без этого
`function() {}()` вызовет `SyntaxError`, потому что парсер ожидает имя для FD.

### 5.3 Module Pattern

До ES6 модулей IIFE были **единственным** надёжным способом создания модулей:

```js
const UserModule = (function() {
  // Приватные переменные — недоступны снаружи
  let users = [];
  let nextId = 1;

  // Приватная функция
  function validateUser(user) {
    if (!user.name) throw new Error("Name required");
    if (!user.email) throw new Error("Email required");
  }

  // Публичный API
  return {
    add(user) {
      validateUser(user);
      users.push({ id: nextId++, ...user });
    },

    getAll() {
      return [...users]; // Возвращаем копию
    },

    findById(id) {
      return users.find(u => u.id === id) || null;
    },

    get count() {
      return users.length;
    }
  };
})();

UserModule.add({ name: "Alice", email: "alice@example.com" });
UserModule.count;   // 1
UserModule.getAll(); // [{ id: 1, name: "Alice", email: "alice@example.com" }]
// UserModule.users — undefined (приватно!)
```

### 5.4 Revealing Module Pattern

Вариация, где **все** функции определены как приватные, а публичный API
явно «раскрывает» нужные:

```js
const Calculator = (function() {
  let history = [];

  function add(a, b) {
    const result = a + b;
    _log("add", a, b, result);
    return result;
  }

  function subtract(a, b) {
    const result = a - b;
    _log("subtract", a, b, result);
    return result;
  }

  function _log(op, a, b, result) {
    history.push({ op, a, b, result, time: Date.now() });
  }

  function getHistory() {
    return [...history];
  }

  function clearHistory() {
    history = [];
  }

  // Раскрываем только то, что нужно
  return {
    add,
    subtract,
    getHistory,
    clearHistory,
    // _log НЕ раскрыт — полностью приватный
  };
})();
```

### 5.5 IIFE с параметрами для защиты от минификации

```js
// jQuery-style: защита от конфликтов и undefined
(function($, undefined) {
  // $ гарантированно jQuery, даже если кто-то переопределил глобальный $
  // undefined гарантированно undefined (в ES3 его можно было переопределить)
  $(".my-element").hide();
})(jQuery);
// undefined не передан — значит параметр действительно undefined
```

### 5.6 Async IIFE

```js
// Top-level await не поддерживается в CommonJS или старых окружениях
(async () => {
  try {
    const response = await fetch("/api/config");
    const config = await response.json();
    initApp(config);
  } catch (err) {
    console.error("Failed to load config:", err);
    initApp(defaultConfig);
  }
})();

// С именем для stack traces
(async function bootstrap() {
  const db = await connectDB();
  const server = await startServer(db);
  console.log(`Server running on port ${server.port}`);
})();
```

### 5.7 Историческая роль и релевантность сегодня

**До ES6** (до 2015):
- Единственный способ создать модульную систему (Module Pattern).
- Защита от загрязнения глобального scope (каждый файл оборачивался в IIFE).
- Bundlers (Webpack, Browserify) оборачивали каждый модуль в IIFE.

**Сегодня**:
- ES6 `import`/`export` заменили Module Pattern.
- `let`/`const` (block scope) заменили `var` + IIFE для изоляции переменных.
- Async IIFE всё ещё полезны, когда `top-level await` недоступен.
- IIFE используются в бандлерах (Webpack output) и полифиллах.
- `UMD` (Universal Module Definition) построен на IIFE.

---

## 6. Function Constructor

### 6.1 Синтаксис

```js
// Аргументы — строки: параметры и тело
const add = new Function("a", "b", "return a + b;");
add(2, 3); // 5

// Также можно без new:
const sub = Function("a", "b", "return a - b;");
sub(5, 3); // 2

// Все параметры можно передать одной строкой:
const mul = new Function("a, b", "return a * b;");
mul(4, 5); // 20
```

### 6.2 Замыкание на глобальный scope

Критическое отличие от всех остальных способов: функция, созданная через `Function`,
**всегда** замыкается на глобальный scope, а не на лексическое окружение:

```js
function createFunction() {
  const secret = "hidden";

  // Обычная функция — видит secret через замыкание
  const normal = function() { return secret; };

  // Function constructor — НЕ видит secret
  const dynamic = new Function("return typeof secret;");

  console.log(normal());  // "hidden"
  console.log(dynamic()); // "undefined" — secret недоступен!
}

createFunction();
```

По спецификации: `CreateDynamicFunction` (секция 20.2.1.1) устанавливает
`[[Environment]]` в `Global Environment`, а не в текущий `Lexical Environment`.

```js
// Глобальные переменные доступны:
var globalVar = "I am global";

const fn = new Function("return globalVar;");
fn(); // "I am global"

// Но let/const на глобальном уровне — нет (они в отдельном scope):
let globalLet = "I am let";
const fn2 = new Function("return typeof globalLet;");
// Поведение зависит от окружения — в модулях globalLet может быть недоступен
```

### 6.3 CSP (Content Security Policy)

`Function()` компилирует строку в код, что делает его эквивалентным `eval`.
Политика CSP `unsafe-eval` блокирует оба:

```
Content-Security-Policy: script-src 'self';
```

При такой политике:

```js
new Function("return 1"); // EvalError: Refused to evaluate string
eval("1");                 // EvalError: тоже заблокировано
```

Для разрешения нужна директива `'unsafe-eval'`, что ослабляет безопасность.

### 6.4 Сравнение с `eval`

| Характеристика        | `Function()`                             | `eval()`                              |
| --------------------- | ---------------------------------------- | ------------------------------------- |
| Scope                 | Всегда глобальный                        | Текущий лексический scope             |
| Возвращает            | Объект функции (можно вызвать позже)     | Результат последнего выражения        |
| Модификация scope     | Не может модифицировать внешний scope    | Может создавать переменные в scope    |
| CSP                   | Блокируется `unsafe-eval`                | Блокируется `unsafe-eval`             |
| Производительность    | Компиляция один раз, вызов многократно   | Компиляция при каждом вызове          |
| Опасность             | Высокая (XSS при пользовательском вводе) | Очень высокая (прямой доступ к scope) |

### 6.5 Use cases

Несмотря на ограничения, `Function()` имеет легитимные применения:

```js
// 1. Шаблонизатор (template engine)
function compileTemplate(template) {
  // Преобразуем "Hello, {{name}}!" в функцию
  const code = template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => `" + data.${key} + "`
  );
  return new Function("data", `return "${code}";`);
}

const render = compileTemplate("Hello, {{name}}! You are {{age}} years old.");
render({ name: "Alice", age: 30 }); // "Hello, Alice! You are 30 years old."

// 2. Meta-programming: создание функций из конфигурации
function createValidator(rules) {
  const checks = rules.map(r =>
    `if (!(${r.condition})) throw new Error("${r.message}");`
  ).join("\n");

  return new Function("value", checks + "\nreturn true;");
}

const isPositiveInt = createValidator([
  { condition: "typeof value === 'number'", message: "Must be a number" },
  { condition: "Number.isInteger(value)", message: "Must be integer" },
  { condition: "value > 0", message: "Must be positive" },
]);

isPositiveInt(5);    // true
isPositiveInt(-1);   // Error: Must be positive

// 3. Десериализация функций (с осторожностью!)
const serialized = '{ "op": "add", "body": "return a + b;" }';
const config = JSON.parse(serialized);
const fn = new Function("a", "b", config.body);
```

---

## 7. Generator Functions

### 7.1 Синтаксис и базовое понятие

Generator — особый вид функции, которая может **приостанавливать** своё выполнение
и **возобновлять** его позже. Создаёт объект-итератор (`Generator object`).

```js
function* countdown(n) {
  while (n > 0) {
    yield n;
    n--;
  }
}

const gen = countdown(3);
gen.next(); // { value: 3, done: false }
gen.next(); // { value: 2, done: false }
gen.next(); // { value: 1, done: false }
gen.next(); // { value: undefined, done: true }
```

Звёздочка `*` может стоять в разных позициях — все валидны:
```js
function* gen() {}   // рекомендуемый стиль
function *gen() {}
function * gen() {}
```

### 7.2 Generator protocol: `next()`, `return()`, `throw()`

Generator object реализует интерфейс `Iterator` и `Iterable` одновременно:

```js
function* example() {
  try {
    const a = yield "first";
    console.log("Received:", a);
    const b = yield "second";
    console.log("Received:", b);
    return "done";
  } catch (err) {
    console.log("Caught:", err.message);
  } finally {
    console.log("Cleanup");
  }
}

const gen = example();

// next() — возобновляет выполнение, передаёт значение в yield
gen.next();        // { value: "first", done: false }
gen.next("hello"); // Received: hello → { value: "second", done: false }

// return() — завершает генератор, вызывает finally
gen.return("early"); // Cleanup → { value: "early", done: true }

// throw() — бросает ошибку внутри генератора (в точке yield)
const gen2 = example();
gen2.next();                    // { value: "first", done: false }
gen2.throw(new Error("oops!")); // Caught: oops! → Cleanup → { value: undefined, done: true }
```

### 7.3 Двусторонняя коммуникация

`yield` — это двусторонний канал: он **отправляет** значение наружу и **получает**
значение обратно при следующем `next()`:

```js
function* accumulator() {
  let total = 0;
  while (true) {
    // yield отправляет total наружу
    // next(value) передаёт value в num
    const num = yield total;
    if (num === undefined) break;
    total += num;
  }
  return total;
}

const acc = accumulator();
acc.next();     // { value: 0, done: false } — первый next() запускает генератор до первого yield
acc.next(10);   // { value: 10, done: false }
acc.next(20);   // { value: 30, done: false }
acc.next(5);    // { value: 35, done: false }
acc.next();     // { value: 35, done: true } — num === undefined, break
```

Важно: **первый** `next()` всегда вызывается без аргумента (или аргумент игнорируется),
потому что в этот момент нет `yield`, который бы принял значение.

### 7.4 `yield*` — делегирование

`yield*` делегирует выполнение другому iterable (генератору, массиву, строке и т. д.):

```js
function* inner() {
  yield "a";
  yield "b";
  return "inner_result"; // return не yield'ится, но становится значением yield*
}

function* outer() {
  yield 1;
  const result = yield* inner(); // делегирует inner
  console.log("Inner returned:", result); // "inner_result"
  yield 2;
}

const gen = outer();
gen.next(); // { value: 1, done: false }
gen.next(); // { value: "a", done: false } — делегировано inner
gen.next(); // { value: "b", done: false } — делегировано inner
gen.next(); // Inner returned: inner_result → { value: 2, done: false }
gen.next(); // { value: undefined, done: true }

// yield* работает с любым iterable:
function* spreadAll(...iterables) {
  for (const it of iterables) {
    yield* it;
  }
}

[...spreadAll([1, 2], "abc", new Set([3, 4]))];
// [1, 2, "a", "b", "c", 3, 4]
```

### 7.5 Iterator protocol совместимость

Generator object реализует `Symbol.iterator`, возвращая **самого себя**:

```js
function* range(start, end, step = 1) {
  for (let i = start; i < end; i += step) {
    yield i;
  }
}

// for...of
for (const n of range(0, 5)) {
  console.log(n); // 0, 1, 2, 3, 4
}

// Destructuring
const [a, b, c] = range(10, 20, 3); // 10, 13, 16

// Spread
const arr = [...range(0, 5)]; // [0, 1, 2, 3, 4]

// Сделаем объект итерируемым с помощью генератора:
const iterableObj = {
  data: [10, 20, 30],
  *[Symbol.iterator]() {
    yield* this.data;
  }
};

for (const val of iterableObj) {
  console.log(val); // 10, 20, 30
}
```

### 7.6 Lazy evaluation — бесконечные последовательности

Генераторы вычисляют значения **лениво** — только при запросе:

```js
// Бесконечная последовательность Фибоначчи
function* fibonacci() {
  let prev = 0, curr = 1;
  while (true) {
    yield curr;
    [prev, curr] = [curr, prev + curr];
  }
}

// Утилиты для работы с ленивыми последовательностями
function* take(n, iterable) {
  let count = 0;
  for (const item of iterable) {
    if (count >= n) return;
    yield item;
    count++;
  }
}

function* filter(predicate, iterable) {
  for (const item of iterable) {
    if (predicate(item)) yield item;
  }
}

function* map(fn, iterable) {
  for (const item of iterable) {
    yield fn(item);
  }
}

// Первые 10 чётных чисел Фибоначчи
const result = [...take(10, filter(n => n % 2 === 0, fibonacci()))];
// [2, 8, 34, 144, 610, 2584, 10946, 46368, 196418, 832040]

// Без генераторов это потребовало бы бесконечного массива!
```

### 7.7 V8: состояния генератора

В V8 `Generator object` имеет внутреннее состояние:

| Состояние      | Описание                                                     |
| -------------- | ------------------------------------------------------------ |
| `suspendedStart`| Генератор создан, но `next()` ещё не вызван.                |
| `suspendedYield`| Генератор приостановлен на `yield`.                          |
| `executing`     | Генератор выполняется (вызван `next()`/`throw()`/`return()`).|
| `completed`     | Генератор завершён (`return` или конец тела).                |

V8 сохраняет полный **контекст** генератора при приостановке:
- Стек операндов.
- Значения локальных переменных.
- Текущую позицию в байткоде (`bytecode offset`).

При возобновлении контекст восстанавливается, и выполнение продолжается
с точки приостановки. Это делает генераторы «тяжелее» обычных функций.

```js
// Вызов next() на executing генераторе — TypeError:
function* gen() {
  // Нельзя вызвать gen.next() изнутри себя
  yield 1;
}
// Генератор не reentrant
```

### 7.8 Async Generators (`async function*`)

Комбинация `async` и `generator` — для асинхронных потоков данных:

```js
async function* fetchPages(url) {
  let page = 1;
  while (true) {
    const response = await fetch(`${url}?page=${page}`);
    const data = await response.json();

    if (data.items.length === 0) return;

    yield* data.items;
    page++;
  }
}

// for await...of — потребление async iterable
async function processAllUsers() {
  for await (const user of fetchPages("/api/users")) {
    console.log(user.name);
  }
}

// Пример: стриминг строк из ReadableStream
async function* streamLines(reader) {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop(); // Последний элемент — неполная строка

    yield* lines;
  }

  if (buffer) yield buffer; // Остаток
}
```

---

## 8. Рекурсия и TCO

### 8.1 Рекурсия — базовые принципы

Рекурсия — вызов функцией самой себя для решения задачи через разбиение на подзадачи:

```js
// Классический пример — факториал
function factorial(n) {
  if (n <= 1) return 1;    // Base case — условие завершения
  return n * factorial(n - 1); // Recursive case
}

factorial(5); // 5 * 4 * 3 * 2 * 1 = 120
```

Каждый рекурсивный вызов создаёт новый `Execution Context` в call stack:

```
factorial(5)
  → 5 * factorial(4)
    → 4 * factorial(3)
      → 3 * factorial(2)
        → 2 * factorial(1)
          → 1                  ← base case
        ← 2 * 1 = 2
      ← 3 * 2 = 6
    ← 4 * 6 = 24
  ← 5 * 24 = 120
```

### 8.2 Stack overflow limits

Call stack ограничен. В V8 (Chrome/Node.js) предел ~10 000-15 000 фреймов
(зависит от размера каждого фрейма):

```js
function infinite() {
  return infinite(); // RangeError: Maximum call stack size exceeded
}

// Проверка лимита:
function measureStack(depth = 0) {
  try {
    return measureStack(depth + 1);
  } catch (e) {
    return depth;
  }
}

measureStack(); // ~10 000-15 000 в V8, ~25 000 в SpiderMonkey
```

### 8.3 Tail Call Optimization (TCO)

**Хвостовой вызов** (`tail call`) — вызов функции, который является **последней**
операцией в текущей функции. Результат вызова **напрямую** возвращается:

```js
// Хвостовой вызов — return является прямым вызовом
function tailFactorial(n, acc = 1) {
  if (n <= 1) return acc;
  return tailFactorial(n - 1, n * acc); // tail call
}

// НЕ хвостовой — после вызова ещё выполняется умножение
function normalFactorial(n) {
  if (n <= 1) return 1;
  return n * normalFactorial(n - 1); // NOT tail call: n * <result>
}
```

По спецификации ES2015 (секция 14.6.1), `Proper Tail Calls` **обязательны**
в `strict mode`. Движок должен **переиспользовать** текущий стековый фрейм
вместо создания нового — это превращает рекурсию в цикл.

### 8.4 Реальность: почему V8 не реализует TCO

На практике **только Safari (JavaScriptCore)** реализовал TCO.
V8 (Chrome, Node.js) и SpiderMonkey (Firefox) **отказались** от реализации.

Причины V8:
1. **Stack traces** — TCO уничтожает промежуточные фреймы, делая отладку невозможной.
   `Error.stack` не покажет полную цепочку вызовов.
2. **Неявность** — разработчик не видит, что оптимизация применена. Ошибка в коде
   (случайно не `tail position`) молча превращается в stack overflow.
3. **Производительность** — проверка `tail position` при каждом вызове замедляет
   **все** вызовы, даже нерекурсивные.

TC39 рассматривал `Syntactic Tail Calls` (`return continue f()`) как явный синтаксис,
но предложение застопорилось на Stage 0.

### 8.5 Trampoline pattern — workaround

`Trampoline` — паттерн, который превращает рекурсию в цикл без TCO:

```js
// Функция-трамплин
function trampoline(fn) {
  return function(...args) {
    let result = fn(...args);
    while (typeof result === "function") {
      result = result(); // Вызываем "thunk" до получения значения
    }
    return result;
  };
}

// Рекурсивная функция возвращает thunk вместо прямого вызова
function factorialRec(n, acc = 1) {
  if (n <= 1) return acc;
  return () => factorialRec(n - 1, n * acc); // Возвращаем thunk, не вызываем!
}

const factorial = trampoline(factorialRec);
factorial(100000); // Работает! Нет stack overflow.

// Более универсальный трамплин с маркером:
class Bounce {
  constructor(fn, args) {
    this.fn = fn;
    this.args = args;
  }
}

function bounce(fn, ...args) {
  return new Bounce(fn, args);
}

function pogo(result) {
  while (result instanceof Bounce) {
    result = result.fn(...result.args);
  }
  return result;
}

// Использование:
function sumRange(n, acc = 0) {
  if (n <= 0) return acc;
  return bounce(sumRange, n - 1, acc + n);
}

pogo(sumRange(1000000)); // 500000500000 — без stack overflow
```

### 8.6 Альтернативы рекурсии

```js
// Итеративный факториал — всегда предпочтительнее для простых случаев
function factorialIterative(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// Обход дерева: рекурсия vs стек
function traverseRecursive(node, visit) {
  visit(node);
  for (const child of node.children || []) {
    traverseRecursive(child, visit);
  }
}

function traverseIterative(root, visit) {
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    visit(node);
    // Добавляем children в обратном порядке для правильной последовательности
    for (let i = (node.children || []).length - 1; i >= 0; i--) {
      stack.push(node.children[i]);
    }
  }
}
```

---

## 9. Memoization

### 9.1 Концепция

`Memoization` — техника оптимизации, при которой результаты вызова функции
кэшируются, и при повторном вызове с теми же аргументами возвращается
кэшированный результат без повторного вычисления.

### 9.2 Базовая реализация

```js
function memoize(fn) {
  const cache = new Map();

  return function(...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

// Использование
const expensiveCalc = memoize((n) => {
  console.log("Computing...");
  let result = 0;
  for (let i = 0; i < n; i++) result += Math.sqrt(i);
  return result;
});

expensiveCalc(1000000); // Computing... → 666666166.46...
expensiveCalc(1000000); // Мгновенно из кэша, без "Computing..."
```

### 9.3 Реализация с `WeakMap` для предотвращения утечек памяти

`Map` хранит сильные ссылки на ключи. Если ключ — объект, он не будет
собран `GC`, пока существует кэш. `WeakMap` решает эту проблему:

```js
function memoizeWithWeakMap(fn) {
  const cache = new WeakMap();

  return function(obj, ...rest) {
    if (!cache.has(obj)) {
      cache.set(obj, new Map());
    }

    const innerCache = cache.get(obj);
    const key = JSON.stringify(rest);

    if (innerCache.has(key)) {
      return innerCache.get(key);
    }

    const result = fn.call(this, obj, ...rest);
    innerCache.set(key, result);
    return result;
  };
}

// Использование: мемоизация по объекту
const getFullName = memoizeWithWeakMap((user) => {
  console.log("Computing full name...");
  return `${user.firstName} ${user.lastName}`;
});

let user = { firstName: "Alice", lastName: "Smith" };
getFullName(user); // Computing full name...
getFullName(user); // Из кэша

user = null; // Объект может быть собран GC, запись в WeakMap автоматически удалится
```

### 9.4 `JSON.stringify` как ключ — ограничения

```js
// Проблема 1: порядок свойств объекта
JSON.stringify({ a: 1, b: 2 }); // '{"a":1,"b":2}'
JSON.stringify({ b: 2, a: 1 }); // '{"b":2,"a":1}' — другой ключ!

// Проблема 2: undefined, функции, Symbol игнорируются
JSON.stringify([1, undefined, 3]);       // '[1,null,3]'
JSON.stringify({ fn: () => {} });        // '{}' — функция исчезла
JSON.stringify({ [Symbol("x")]: 42 });  // '{}' — Symbol исчез

// Проблема 3: circular references
const obj = {};
obj.self = obj;
JSON.stringify(obj); // TypeError: Converting circular structure to JSON

// Проблема 4: производительность для больших объектов
// JSON.stringify на каждый вызов — O(n) по размеру аргументов

// Альтернативные стратегии ключей:
// Для примитивов:
function primitiveKey(...args) {
  return args.map(a => typeof a + ":" + String(a)).join("|");
}

// Для одного аргумента-примитива — можно использовать напрямую:
function memoizeSingleArg(fn) {
  const cache = new Map();
  return function(arg) {
    if (cache.has(arg)) return cache.get(arg);
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}
```

### 9.5 Мемоизированная рекурсия

```js
// Наивный Фибоначчи — O(2^n)
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

// Мемоизированный Фибоначчи — O(n)
function memoFib() {
  const cache = new Map();

  function fib(n) {
    if (cache.has(n)) return cache.get(n);
    if (n <= 1) return n;

    const result = fib(n - 1) + fib(n - 2);
    cache.set(n, result);
    return result;
  }

  return fib;
}

const fib = memoFib();
fib(100); // 354224848179262000000 — мгновенно
```

### 9.6 Production решения

```js
// lodash.memoize — поддерживает resolver для ключа
import memoize from "lodash/memoize";

const getUser = memoize(
  async (id) => {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
  },
  (id) => id // resolver — функция для вычисления ключа кэша
);

// reselect — мемоизация для Redux selectors
import { createSelector } from "reselect";

const selectVisibleTodos = createSelector(
  [selectTodos, selectFilter],
  (todos, filter) => {
    // Перевычисляется ТОЛЬКО когда todos или filter изменились
    switch (filter) {
      case "completed": return todos.filter(t => t.completed);
      case "active": return todos.filter(t => !t.completed);
      default: return todos;
    }
  }
);

// React.useMemo / React.useCallback — встроенная мемоизация в React
function ExpensiveComponent({ items, filter }) {
  const filtered = useMemo(
    () => items.filter(item => item.category === filter),
    [items, filter] // Пересчёт только при изменении зависимостей
  );

  const handleClick = useCallback(
    (id) => console.log("Clicked:", id),
    [] // Функция создаётся один раз
  );

  return filtered.map(item => (
    <Item key={item.id} onClick={handleClick} />
  ));
}
```

### 9.7 Когда мемоизация вредна

- **Функции с побочными эффектами** — `fetch`, `Date.now()`, `Math.random()`.
  Кэширование вернёт старый результат вместо нового.
- **Функции, вызываемые с уникальными аргументами** — кэш растёт бесконечно,
  потребляя память, но никогда не попадая в `cache hit`.
- **Дешёвые вычисления** — overhead на `Map.has()`, `JSON.stringify()` и хранение
  может превысить стоимость повторного вычисления.

---

## 10. Сводная таблица всех типов функций

| Характеристика                | Function Declaration     | Function Expression      | Arrow Function           | IIFE                     | Function Constructor     | Generator (`function*`)  | Async Generator          |
| ----------------------------- | ------------------------ | ------------------------ | ------------------------ | ------------------------ | ------------------------ | ------------------------ | ------------------------ |
| **`[[Call]]`**                | Да                       | Да                       | Да                       | Да                       | Да                       | Да                       | Да                       |
| **`[[Construct]]`**           | Да                       | Да                       | **Нет**                  | Да (если не arrow)       | Да                       | **Нет**                  | **Нет**                  |
| **`.prototype`**              | Да                       | Да                       | **Нет**                  | Да (если не arrow)       | Да                       | **Нет** (`.prototype` есть, но без `[[Construct]]`) | **Нет**  |
| **`arguments`**               | Собственный              | Собственный              | **Лексический** (внешний)| Собственный              | Собственный              | Собственный              | Собственный              |
| **`this`**                    | Динамический             | Динамический             | **Лексический**          | Динамический             | Динамический             | Динамический             | Динамический             |
| **Hoisting**                  | Полный (имя + тело)      | Нет (только `var`)       | Нет (только `var`)       | Нет                      | Нет                      | Полный (как FD)          | Нет (если FE)            |
| **`new.target`**              | Доступен                 | Доступен                 | **Лексический**          | Доступен                 | **Нет**                  | Доступен                 | Доступен                 |
| **`super`**                   | Доступен                 | Доступен                 | **Лексический**          | Доступен                 | **Нет**                  | Доступен                 | Доступен                 |
| **Strict mode по умолчанию**  | Нет                      | Нет                      | Нет                      | Нет                      | Нет                      | Нет                      | Нет                      |
| **`call`/`apply`/`bind` меняют `this`** | Да           | Да                       | **Нет**                  | Да                       | Да                       | Да                       | Да                       |
| **`yield`**                   | Нет                      | Нет                      | Нет                      | Нет                      | Нет                      | **Да**                   | **Да**                   |
| **`await`**                   | Если `async`             | Если `async`             | Если `async`             | Если `async`             | **Нет**                  | **Нет**                  | **Да**                   |
| **Scope замыкания**           | Лексический              | Лексический              | Лексический              | Лексический              | **Глобальный**           | Лексический              | Лексический              |

### Краткие рекомендации по выбору

```
Нужен конструктор (new)?
  → class (предпочтительно) или Function Declaration

Нужен hoisting?
  → Function Declaration

Callback / inline функция?
  → Arrow Function (если не нужен динамический this)
  → Function Expression (если нужен динамический this или arguments)

Ленивая последовательность / итератор?
  → Generator Function

Асинхронный поток данных?
  → Async Generator

Изоляция scope без модулей?
  → IIFE

Динамическая генерация кода?
  → Function Constructor (с осторожностью)
```
