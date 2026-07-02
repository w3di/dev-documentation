# Execution Context

## Оглавление

- [Что такое Execution Context](#что-такое-execution-context)
- [Creation Phase vs Execution Phase](#creation-phase-vs-execution-phase)
- [Lexical Environment](#lexical-environment)
- [Variable Environment](#variable-environment)
- [This Binding](#this-binding)
- [Realm](#realm)
- [Стек выполнения (Execution Context Stack)](#стек-выполнения-execution-context-stack)

---

## Что такое Execution Context

`Execution Context` (EC) — это внутренняя спецификационная структура, которую движок JavaScript создаёт каждый раз, когда код начинает выполняться. EC содержит всё необходимое для выполнения кода: привязки переменных, ссылку на внешний scope, значение `this`, информацию о realm.

### Виды Execution Context

**1. Global Execution Context (GEC)**

Создаётся один раз при запуске скрипта. В браузере привязан к объекту `window`, в Node.js — к `global` / `globalThis`. Всегда находится в самом низу стека.

```js
// Global Execution Context создаётся автоматически
var globalVar = "hello";       // VariableEnvironment GEC
let globalLet = "world";       // LexicalEnvironment GEC
console.log(this === window);  // true (в браузере, sloppy mode)
```

**2. Function Execution Context (FEC)**

Создаётся при каждом вызове функции. У каждого вызова — свой уникальный FEC, даже при рекурсии:

```js
function outer() {
  // FEC #1
  function inner() {
    // FEC #2
  }
  inner();
}
outer();
```

**3. Eval Execution Context**

Создаётся при вызове `eval()`. Direct eval получает доступ к `LexicalEnvironment` вызывающего контекста. Indirect eval работает в глобальном контексте:

```js
function foo() {
  const x = 10;
  eval("console.log(x)");         // 10 — direct eval, видит x
  (0, eval)("console.log(x)");    // ReferenceError — indirect eval, глобальный scope
}
```

### Структура Execution Context (спецификация ECMAScript)

Каждый EC содержит следующие компоненты:

```
ExecutionContext {
  LexicalEnvironment    — для let, const, function declarations, class
  VariableEnvironment   — для var
  ThisBinding           — значение this
  Realm                 — realm record
  CodeEvaluationState   — позиция выполнения (для async/generator)
  Function              — ссылка на объект функции (null для GEC)
  ScriptOrModule        — Script Record или Module Record
}
```

---

## Creation Phase vs Execution Phase

При создании каждого EC происходят две фазы:

### Creation Phase (фаза создания)

Движок сканирует код и создаёт привязки **до выполнения** какого-либо кода:

1. **Создание `LexicalEnvironment`** — биндинги для `let`, `const`, `function` declarations.
2. **Создание `VariableEnvironment`** — биндинги для `var`.
3. **Определение `ThisBinding`** — значение `this` для данного контекста.

Именно на этой фазе возникает **hoisting**:

```js
console.log(a); // undefined — var создан, но не инициализирован
console.log(b); // ReferenceError — let в TDZ
console.log(fn); // [Function: fn] — function declaration уже инициализирована

var a = 1;
let b = 2;
function fn() {}
```

Как это выглядит на уровне `EnvironmentRecord`:

```
// Creation Phase:
VariableEnvironment.EnvironmentRecord = {
  a: undefined          // var — создан и инициализирован как undefined
}

LexicalEnvironment.EnvironmentRecord = {
  b: <uninitialized>    // let — создан, но НЕ инициализирован (TDZ)
  fn: <function object> // function declaration — полностью инициализирована
}
```

### Execution Phase (фаза выполнения)

Код выполняется построчно. Переменные получают свои значения:

```
// Execution Phase:
VariableEnvironment.EnvironmentRecord = {
  a: 1                  // var получил значение
}

LexicalEnvironment.EnvironmentRecord = {
  b: 2                  // let инициализирован — TDZ завершён
  fn: <function object> // без изменений
}
```

### Hoisting на уровне EC — полная картина

```js
function example() {
  console.log(typeof x);  // "undefined" — var hoisted
  console.log(typeof y);  // ReferenceError — TDZ
  console.log(typeof z);  // "function" — function declaration hoisted

  var x = 1;
  let y = 2;
  function z() {}

  // Function expression — hoisting как var, но значение undefined
  console.log(w); // undefined
  var w = function () {};
}
```

```
// Creation Phase для function example:
VariableEnvironment = {
  x: undefined,
  w: undefined
}

LexicalEnvironment = {
  y: <uninitialized>,
  z: <function object>
}
```

---

## Lexical Environment

`Lexical Environment` — это спецификационный тип, связывающий идентификаторы с переменными и функциями на основе **лексической структуры** (вложенности) кода.

### Структура Lexical Environment

```
LexicalEnvironment = {
  EnvironmentRecord: { ... },   // хранилище привязок
  OuterEnvironmentReference: <LexicalEnvironment | null>  // ссылка на внешний scope
}
```

### Environment Record — два типа

**1. Declarative Environment Record**

Используется для функций, блоков, `catch`-клаузов. Хранит привязки **напрямую** — нет реального объекта, к которому они привязаны:

```js
function foo() {
  let a = 1;     // DeclarativeEnvironmentRecord
  const b = 2;   // DeclarativeEnvironmentRecord
  // Движок может хранить эти переменные в регистрах — максимальная оптимизация
}
```

**2. Object Environment Record**

Используется для `with`-statement и для **глобального** контекста. Привязки хранятся как свойства реального объекта:

```js
// Global EC использует Object Environment Record для var
var globalVar = 42;
console.log(window.globalVar); // 42 — var стала свойством window

// Но let/const используют Declarative Environment Record
let globalLet = 100;
console.log(window.globalLet); // undefined — нет на window
```

Глобальный EC — это **уникальный случай**: он содержит **составной** `GlobalEnvironmentRecord`, объединяющий `ObjectEnvironmentRecord` (для `var` и function declarations) и `DeclarativeEnvironmentRecord` (для `let`/`const`):

```js
var x = 1;           // ObjectEnvironmentRecord → window.x = 1
let y = 2;           // DeclarativeEnvironmentRecord → window.y === undefined
function foo() {}    // ObjectEnvironmentRecord → window.foo = function
class Bar {}         // DeclarativeEnvironmentRecord → window.Bar === undefined
```

### Scope Chain через Outer Reference

`OuterEnvironmentReference` формирует **scope chain** — цепочку, по которой движок ищет идентификаторы:

```js
const global = "G";

function outer() {
  const outerVar = "O";

  function middle() {
    const middleVar = "M";

    function inner() {
      const innerVar = "I";
      console.log(innerVar);  // "I" — найдено в текущем EnvironmentRecord
      console.log(middleVar); // "M" — через OuterRef → middle
      console.log(outerVar);  // "O" — через OuterRef → outer
      console.log(global);    // "G" — через OuterRef → global
    }
    inner();
  }
  middle();
}
outer();
```

```
Scope Chain для inner():

inner.LexicalEnv.OuterRef → middle.LexicalEnv
middle.LexicalEnv.OuterRef → outer.LexicalEnv
outer.LexicalEnv.OuterRef → Global.LexicalEnv
Global.LexicalEnv.OuterRef → null
```

Ключевой момент: scope chain определяется **лексически** (где функция объявлена), а не динамически (откуда вызвана):

```js
const value = "global";

function printValue() {
  console.log(value); // Всегда "global" — scope chain зафиксирован при объявлении
}

function wrapper() {
  const value = "local";
  printValue(); // "global", НЕ "local"
}

wrapper();
```

---

## Variable Environment

`Variable Environment` — это **отдельный** компонент EC, изначально идентичный `LexicalEnvironment`, но их пути расходятся при входе в блок.

### Разделение `var` и `let`/`const`

`var` привязывается к `VariableEnvironment` (уровень функции), а `let`/`const` — к `LexicalEnvironment` (уровень блока):

```js
function example() {
  // VariableEnvironment = FunctionEnvironment
  // LexicalEnvironment = FunctionEnvironment (пока совпадают)

  var funcScoped = "function";

  if (true) {
    // Новый LexicalEnvironment для блока!
    // VariableEnvironment — НЕ меняется, остаётся FunctionEnvironment

    var stillFuncScoped = "still function";  // → VariableEnvironment (функция)
    let blockScoped = "block";               // → LexicalEnvironment (блок if)
    const alsoBlock = "block too";           // → LexicalEnvironment (блок if)
  }

  console.log(stillFuncScoped); // "still function" — var в VariableEnvironment функции
  // console.log(blockScoped);  // ReferenceError — LexicalEnvironment блока уже уничтожен
}
```

### Почему `var` в блоке не блочная

При входе в блок `{ }` движок создаёт **новый** `LexicalEnvironment`, но `VariableEnvironment` остаётся **тем же** — указывающим на функцию (или глобальный контекст). Поэтому `var`, привязанный к `VariableEnvironment`, не видит границ блока:

```js
function loopProblem() {
  for (var i = 0; i < 3; i++) {
    // var i привязана к VariableEnvironment функции
    // Каждая итерация for создаёт новый LexicalEnvironment,
    // но var i НЕ находится в нём
    setTimeout(() => console.log(i), 0);
  }
  // i === 3 — видна за пределами for
  // Все setTimeout выведут 3
}

function loopFixed() {
  for (let i = 0; i < 3; i++) {
    // let i привязана к LexicalEnvironment блока
    // Каждая итерация создаёт НОВЫЙ LexicalEnvironment с КОПИЕЙ i
    setTimeout(() => console.log(i), 0);
  }
  // i не видна здесь
  // setTimeout выведут 0, 1, 2
}
```

Внутренний механизм `for (let ...)`:

```
Итерация 0: LexicalEnv { i: 0 } → замыкание захватывает ЭТУ копию
Итерация 1: LexicalEnv { i: 1 } → замыкание захватывает ЭТУ копию
Итерация 2: LexicalEnv { i: 2 } → замыкание захватывает ЭТУ копию
```

---

## This Binding

`ThisBinding` определяется **при создании** EC и зависит от типа контекста и способа вызова.

### Global EC

```js
// Browser (sloppy mode): this === window
// Browser (strict mode): this === window (для Global EC — всегда)
// Node.js (module): this === module.exports (или {} для ESM)
// Node.js (REPL): this === globalThis
```

### Function EC — правила определения `this`

`this` определяется **в момент вызова**, не объявления:

```js
const obj = {
  name: "Alice",
  greet() {
    console.log(this.name);
  },
};

obj.greet();           // "Alice" — method call, this = obj

const fn = obj.greet;
fn();                  // undefined (strict) или window.name (sloppy) — simple call

fn.call({ name: "Bob" });  // "Bob" — explicit binding
fn.apply({ name: "Eve" }); // "Eve" — explicit binding
const bound = fn.bind({ name: "Dan" });
bound();                    // "Dan" — hard binding

new obj.greet();       // {} — new binding (this = новый объект)
```

Приоритет привязок: `new` > `bind` > `call`/`apply` > method call > default.

### Arrow functions — отсутствие собственного `ThisBinding`

Arrow function **не создаёт** собственный `ThisBinding` в своём EC. Вместо этого `this` разрешается через `OuterEnvironmentReference` — берётся из лексически окружающего EC:

```js
const obj = {
  name: "Alice",
  greet: () => {
    // this — из окружающего EC (Global), НЕ из obj
    console.log(this.name); // undefined
  },
  delayedGreet() {
    setTimeout(() => {
      // this — из EC метода delayedGreet, т.е. obj
      console.log(this.name); // "Alice"
    }, 100);
  },
};
```

Это означает, что `call`, `apply`, `bind` **не могут** изменить `this` у arrow function:

```js
const arrow = () => this;
console.log(arrow.call({ x: 1 })); // window/globalThis — call проигнорирован
```

---

## Realm

`Realm` — это изолированное окружение выполнения JavaScript, содержащее собственный набор встроенных объектов и глобальный объект.

### Структура Realm Record

```
RealmRecord = {
  [[Intrinsics]]       — таблица встроенных объектов (%Object%, %Array%, %Promise%, ...)
  [[GlobalObject]]     — глобальный объект этого realm
  [[GlobalEnv]]        — глобальный LexicalEnvironment
  [[TemplateMap]]      — кэш template literals
}
```

### Разные Realms в iframe

Каждый `<iframe>` создаёт **собственный realm** с отдельными прототипами:

```js
const iframe = document.createElement("iframe");
document.body.appendChild(iframe);

const iframeArray = iframe.contentWindow.Array;

const arr = new iframeArray(1, 2, 3);

console.log(arr instanceof Array);        // false — разные realms!
console.log(arr instanceof iframeArray);   // true
console.log(Array.isArray(arr));           // true — единственный надёжный способ
```

```js
// Каждый realm имеет свой Object.prototype
const iframeObj = iframe.contentWindow.eval("({})");

console.log(iframeObj.constructor === Object); // false
console.log(iframeObj.constructor === iframe.contentWindow.Object); // true
```

Это объясняет, почему `instanceof` ненадёжен для cross-realm проверки, и почему существуют `Array.isArray()`, `Symbol.hasInstance`, и `Symbol.toStringTag`.

### Intrinsics

Intrinsics — это встроенные объекты (`%Object%`, `%Function%`, `%Array.prototype%` и т.д.), которые реализуют базовую семантику языка. Они создаются при инициализации realm и не могут быть воссозданы пользовательским кодом:

```js
// Intrinsics — это НЕ глобальные переменные, это внутренние ссылки спецификации
// Но они доступны через глобальные переменные:
Object === realm.[[Intrinsics]].[[%Object%]]  // концептуально
```

---

## Стек выполнения (Execution Context Stack)

### Push/Pop механизм

`Execution Context Stack` (он же `Call Stack`) — это LIFO-стек, управляющий текущим выполняемым контекстом:

```js
function first() {
  console.log("first start");
  second();
  console.log("first end");
}

function second() {
  console.log("second start");
  third();
  console.log("second end");
}

function third() {
  console.log("third");
}

first();
```

```
Стек вызовов:

1. [Global EC]
2. [Global EC, first EC]         — вызов first()
3. [Global EC, first EC, second EC]  — вызов second()
4. [Global EC, first EC, second EC, third EC]  — вызов third()
5. [Global EC, first EC, second EC]  — third() завершился, pop
6. [Global EC, first EC]         — second() завершился, pop
7. [Global EC]                   — first() завершился, pop
```

`Running Execution Context` — это **верхний** элемент стека. Именно его `LexicalEnvironment`, `VariableEnvironment` и `ThisBinding` используются при выполнении текущей инструкции.

### Call Stack и stack overflow

```js
function infinite() {
  infinite(); // Каждый вызов создаёт новый EC и push в стек
}

infinite(); // RangeError: Maximum call stack size exceeded
// V8: ~10 000-15 000 фреймов (зависит от размера фрейма)
```

### Tail Call Optimization (TCO)

ECMAScript 2015 специфицирует **Proper Tail Calls** (PTC) для strict mode. Если вызов функции находится в **tail position** (последнее действие перед `return`), текущий EC может быть **заменён** новым, а не добавлен поверх:

```js
"use strict";

// Tail call — last() в tail position
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc); // tail call — EC переиспользуется
}

factorial(100000); // Не вызовет stack overflow (при поддержке TCO)
```

```js
"use strict";

// НЕ tail call — после вызова есть операция умножения
function factorialBad(n) {
  if (n <= 1) return 1;
  return n * factorialBad(n - 1); // НЕ tail position — нужно умножить результат
}
```

**Важно:** на практике TCO реализован **только в JavaScriptCore** (Safari/WebKit). V8 и SpiderMonkey **не реализуют** TCO, ссылаясь на сложности с debugging (стек вызовов «исчезает»). V8 экспериментировал с `Syntactic Tail Calls` (явный синтаксис), но proposal застопорился.

### EC и асинхронный код

Для `async` функций и генераторов EC сохраняет `CodeEvaluationState` (позицию выполнения), что позволяет приостанавливать и возобновлять выполнение:

```js
async function fetchData() {
  // EC создан, push в стек
  const response = await fetch("/api"); // EC приостановлен, pop из стека
  // При резолве промиса — EC восстановлен, push обратно
  const data = await response.json();   // снова приостановлен
  return data;                          // EC завершён, pop
}
```

```js
function* generator() {
  // EC создан при вызове generator(), но НЕ выполняется
  yield 1; // EC приостановлен — CodeEvaluationState сохранён
  yield 2; // Возобновлён при .next()
  return 3;
}

const gen = generator(); // EC создан, но приостановлен до первого next()
gen.next(); // EC push → выполнение до yield 1 → EC pop (suspended)
gen.next(); // EC push → выполнение до yield 2 → EC pop (suspended)
gen.next(); // EC push → return 3 → EC pop (completed)
```

---

## Итого: жизненный цикл Execution Context

```
1. Вызов функции / запуск скрипта / eval
   ↓
2. Creation Phase
   ├── Создание LexicalEnvironment (let, const, function → EnvironmentRecord)
   ├── Создание VariableEnvironment (var → EnvironmentRecord)
   ├── Определение ThisBinding
   └── Привязка к Realm
   ↓
3. Push EC в Execution Context Stack
   ↓
4. Execution Phase
   ├── Построчное выполнение кода
   ├── Присваивание значений переменным
   └── Вызовы функций → создание новых EC (рекурсия в шаги 1-6)
   ↓
5. Завершение / return / throw
   ↓
6. Pop EC из стека
   └── LexicalEnvironment может быть сохранён, если на него есть ссылка (closure)
```
