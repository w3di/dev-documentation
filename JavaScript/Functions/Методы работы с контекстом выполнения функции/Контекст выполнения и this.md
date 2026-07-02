# Контекст выполнения и `this`: полное руководство

> Этот файл заменяет все отдельные stub-файлы в директории.
> Уровень: Senior / Architect. Предполагается знание основ JavaScript.

---

## Оглавление

1. [Ключевое слово `this`](#1-ключевое-слово-this)
2. [`Function.prototype.call()`](#2-functionprototypecall)
3. [`Function.prototype.apply()`](#3-functionprototypeapply)
4. [`Function.prototype.bind()`](#4-functionprototypebind)
5. [`Reflect.apply` и `Reflect.construct`](#5-reflectapply-и-reflectconstruct)
6. [Сравнительная таблица](#6-сравнительная-таблица-call-vs-apply-vs-bind-vs-reflect)

---

## 1. Ключевое слово `this`

### 1.1. Алгоритм определения `this` по спецификации ECMAScript

Движок определяет значение `this` через цепочку абстрактных операций:

1. **`ResolveThisBinding()`** — вызывается при каждом обращении к `this`. Внутри вызывает `GetThisEnvironment()`.
2. **`GetThisEnvironment()`** — поднимается по цепочке `Environment Record` (от текущего `LexicalEnvironment` вверх), пока не найдёт запись, у которой `HasThisBinding()` возвращает `true`. Стрелочные функции создают `Environment Record` без собственного `this` (`HasThisBinding() → false`), поэтому алгоритм проходит мимо них.
3. **`OrdinaryCallBindThis(F, calleeContext, thisArgument)`** — вызывается при обычном вызове функции (`[[Call]]`). Выполняет следующие шаги:
   - Если `F.[[ThisMode]]` равен `lexical` (стрелочная функция) — ничего не делаем, `this` уже лексически захвачен.
   - Если `F.[[ThisMode]]` равен `strict` — `thisValue = thisArgument` (как есть, без коробки).
   - Иначе (sloppy mode): если `thisArgument` равен `undefined` или `null` — подставляется глобальный объект (`globalThis`). Если примитив — оборачивается в `Object(thisArgument)`.

```js
// Демонстрация шага 3 (sloppy mode boxing)
function showThis() { return this; }

showThis.call(42);        // Number {42} — примитив обёрнут в объект
showThis.call(undefined); // window (браузер) — подставлен globalThis
showThis.call(null);      // window (браузер) — аналогично
```

```js
// strict mode — без boxing
'use strict';
function showThisStrict() { return this; }

showThisStrict.call(42);        // 42 — примитив как есть
showThisStrict.call(undefined); // undefined
showThisStrict.call(null);      // null
```

---

### 1.2. Приоритет привязки (Binding Precedence)

Порядок приоритета (от высшего к низшему):

| Приоритет | Тип привязки | Пример |
|:---------:|:-------------|:-------|
| 1 (высший) | `new` binding | `new Foo()` |
| 2 | Explicit binding (`call`/`apply`/`bind`) | `fn.call(obj)` |
| 3 | Implicit binding (метод объекта) | `obj.fn()` |
| 4 (низший) | Default binding | `fn()` → `globalThis` или `undefined` |

```js
function Foo(val) {
  this.value = val;
}

const hardBound = Foo.bind({ custom: true });

// new побеждает bind — привязанный this игнорируется
const instance = new hardBound('test');
console.log(instance.value);   // 'test'
console.log(instance.custom);  // undefined — bind-контекст проигнорирован
```

```js
const obj = {
  name: 'implicit',
  greet() { return this.name; }
};

const explicit = { name: 'explicit' };

// Explicit побеждает implicit
console.log(obj.greet.call(explicit)); // 'explicit'

// Implicit побеждает default
console.log(obj.greet()); // 'implicit'
```

```js
// Default binding
function standalone() { return this; }
console.log(standalone()); // window (sloppy) или undefined (strict)
```

---

### 1.3. `strict mode` vs `sloppy mode`

```js
// sloppy mode: this === window при обычном вызове
function sloppy() {
  console.log(this === window); // true (браузер)
}
sloppy();

// strict mode: this === undefined при обычном вызове
function strict() {
  'use strict';
  console.log(this === undefined); // true
}
strict();
```

Важный нюанс: в ES-модулях (`<script type="module">`) код всегда выполняется в `strict mode`, поэтому `this` на верхнем уровне модуля равен `undefined`.

---

### 1.4. `this` в `class fields`

`Class fields` используют **лексический `this`** — он фиксируется в момент создания экземпляра, а не в момент вызова. Это принципиально отличается от обычных методов:

```js
class Button {
  name = 'Button';

  // class field — стрелочная функция: this лексический
  handleClick = () => {
    console.log(this.name); // всегда 'Button'
  };

  // обычный метод — this зависит от вызова
  handleClickMethod() {
    console.log(this.name);
  }
}

const btn = new Button();
const { handleClick, handleClickMethod } = btn;

handleClick();       // 'Button' — this захвачен лексически
handleClickMethod(); // TypeError (strict) или undefined (sloppy)
```

Под капотом `class field` с arrow function эквивалентен:

```js
class Button {
  constructor() {
    this.handleClick = () => {
      console.log(this.name);
    };
  }
}
```

Каждый экземпляр получает **собственную копию** функции — это влияет на потребление памяти при большом количестве экземпляров. Обычные методы хранятся в `prototype` — одна копия на все экземпляры.

---

### 1.5. Потеря контекста (Method Extraction)

Классический edge case, часто встречающийся на собеседованиях:

```js
const user = {
  name: 'Алексей',
  greet() {
    console.log(`Привет, ${this.name}`);
  }
};

// Извлечение метода — теряем контекст
const fn = user.greet;
fn(); // 'Привет, undefined' (sloppy) или TypeError (strict)

// Причина: fn — это ссылка на функцию, без привязки к user
// Вызов fn() — это default binding (правило 4)
```

Решения:

```js
// 1. bind
const bound = user.greet.bind(user);
bound(); // 'Привет, Алексей'

// 2. Обёртка в arrow function
const wrapped = () => user.greet();
wrapped(); // 'Привет, Алексей'

// 3. class field (стрелочная функция)
// см. раздел 1.4
```

---

### 1.6. `this` в `setTimeout` / `setInterval`

```js
const timer = {
  count: 0,
  start() {
    // ОШИБКА: this потерян — setTimeout вызывает callback как обычную функцию
    setTimeout(function () {
      this.count++; // this === window (sloppy) или undefined (strict)
      console.log(this.count); // NaN или TypeError
    }, 1000);
  }
};
```

Решения (от устаревших к современным):

```js
// 1. Замыкание через self/that (устаревший паттерн)
start() {
  const self = this;
  setTimeout(function () {
    self.count++;
  }, 1000);
}

// 2. bind
start() {
  setTimeout(function () {
    this.count++;
  }.bind(this), 1000);
}

// 3. Arrow function (рекомендуемый способ)
start() {
  setTimeout(() => {
    this.count++; // this захвачен лексически из start()
  }, 1000);
}
```

---

### 1.7. `this` в `event handlers`

`addEventListener` устанавливает `this` на элемент, к которому привязан обработчик:

```js
const button = document.querySelector('#btn');

button.addEventListener('click', function (e) {
  console.log(this === button);     // true
  console.log(this === e.target);   // true (если клик на сам элемент)
  console.log(this === e.currentTarget); // true (всегда)
});

// Arrow function — this НЕ будет элементом
button.addEventListener('click', (e) => {
  console.log(this === window); // true (или undefined в модуле)
  // Используйте e.currentTarget вместо this
});
```

В React: синтетические события не привязывают `this` автоматически, поэтому класс-компоненты требуют `bind` в конструкторе или `class fields`:

```js
class App extends React.Component {
  // Антипаттерн: bind в render создаёт новую функцию каждый рендер
  render() {
    return <button onClick={this.handleClick.bind(this)} />;
  }

  // Правильно: class field
  handleClick = () => { /* this === экземпляр App */ };
}
```

---

### 1.8. `globalThis` (ES2020)

До ES2020 для получения глобального объекта в разных средах нужен был хак:

```js
// Старый способ — ненадёжный и громоздкий
const global = (function () {
  if (typeof globalThis !== 'undefined') return globalThis;
  if (typeof window !== 'undefined') return window;
  if (typeof global !== 'undefined') return global;
  if (typeof self !== 'undefined') return self;
  throw new Error('No global object');
})();
```

`globalThis` — унифицированный доступ к глобальному объекту:

```js
// Работает везде: браузер, Node.js, Web Workers, Deno
console.log(globalThis === window);   // true (браузер)
console.log(globalThis === global);   // true (Node.js)
console.log(globalThis === self);     // true (Web Worker)
```

---

### 1.9. `this` в Node.js модулях

```js
// CommonJS модуль (файл .js с require)
console.log(this === module.exports); // true — на верхнем уровне
console.log(this === exports);        // true (изначально exports === module.exports)

function foo() {
  console.log(this === global); // true (sloppy mode)
}
foo();
```

```js
// ES модуль (файл .mjs или "type": "module" в package.json)
console.log(this); // undefined — ES-модули всегда strict mode
```

```js
// Node.js REPL
console.log(this === global); // true
```

---

## 2. `Function.prototype.call()`

### 2.1. Спецификационный алгоритм

`Function.prototype.call(thisArg, ...args)` выполняет:

1. Пусть `func` — значение `this` (сама функция, на которой вызван `call`).
2. Если `IsCallable(func)` равно `false` — выбросить `TypeError`.
3. Выполнить `Call(func, thisArg, args)` — абстрактная операция, которая вызывает внутренний метод `func.[[Call]](thisArg, args)`.

Ключевой момент: `call` не создаёт новый объект, не модифицирует функцию — он просто вызывает её с переданным `thisArg`.

---

### 2.2. `strict mode` поведение

```js
function show() {
  'use strict';
  console.log(this);
}

show.call(null);      // null — в strict оставляет как есть
show.call(undefined); // undefined
show.call(42);        // 42 — без boxing

// sloppy mode
function showSloppy() {
  console.log(this);
}

showSloppy.call(null);      // window — null/undefined → globalThis
showSloppy.call(undefined); // window
showSloppy.call(42);        // Number {42} — boxing примитива
```

---

### 2.3. Method Borrowing — ключевой production-паттерн

Это самый частый use case для `call` в production-коде:

#### Определение типа через `Object.prototype.toString`

```js
// Самый надёжный способ определения типа значения
function typeOf(value) {
  return Object.prototype.toString.call(value).slice(8, -1);
}

typeOf([]);            // 'Array'
typeOf(null);          // 'Null'
typeOf(undefined);     // 'Undefined'
typeOf(new Map());     // 'Map'
typeOf(/regex/);       // 'RegExp'
typeOf(42n);           // 'BigInt'

// typeof дал бы:
typeof null;           // 'object' — печально известный баг
typeof [];             // 'object' — бесполезно
```

#### Работа с `arguments` и `NodeList`

```js
// Преобразование arguments в массив (до ES6)
function legacy() {
  const args = Array.prototype.slice.call(arguments);
  return args.map(x => x * 2);
}

// Итерация по NodeList (до ES6)
const nodes = document.querySelectorAll('div');
Array.prototype.forEach.call(nodes, function (node) {
  node.classList.add('processed');
});

// Современные альтернативы:
// Array.from(arguments), [...arguments], Array.from(nodes)
```

#### Проверка наличия собственного свойства

```js
// Безопасная проверка — объект мог переопределить hasOwnProperty
const obj = { hasOwnProperty: () => false, key: 'value' };

obj.hasOwnProperty('key');                              // false — НЕВЕРНО
Object.prototype.hasOwnProperty.call(obj, 'key');       // true — ВЕРНО

// Ещё лучше — ES2022:
Object.hasOwn(obj, 'key');                              // true
```

---

### 2.4. `Function.prototype.call.call` — рекурсивная природа

Это классический вопрос на собеседованиях:

```js
// call — это метод Function.prototype, а значит, сам является функцией.
// Следовательно, у call есть собственный метод call.

Function.prototype.call.call(console.log, console, 'Привет');
// Эквивалентно: console.log.call(console, 'Привет')
// Вывод: 'Привет'

// Разбор:
// 1. Внешний call вызывается на Function.prototype.call
// 2. thisArg = console.log — значит, "функция, которую вызываем" = console.log
// 3. Аргументы = [console, 'Привет']
// 4. Итого: console.log.call(console, 'Привет') → console.log('Привет')
```

Практическое применение — создание «безопасной» версии `call`, которую нельзя перезаписать:

```js
const uncurryThis = Function.prototype.call.bind(Function.prototype.call);
// Теперь uncurryThis(fn, thisArg, ...args) === fn.call(thisArg, ...args)

const hasOwn = uncurryThis(Object.prototype.hasOwnProperty);
hasOwn({ a: 1 }, 'a'); // true
```

---

### 2.5. Performance: `call` vs прямой вызов

```js
// Прямой вызов — быстрее (нет накладных расходов на обработку thisArg)
fn(a, b);

// call — незначительно медленнее
fn.call(ctx, a, b);
```

В современных движках (V8 TurboFan, SpiderMonkey IonMonkey) разница практически нулевая — JIT-компилятор инлайнит `call` в hot-пути. Оптимизация `call` стала одной из приоритетных задач движков, поскольку паттерн method borrowing встречается повсеместно.

Не стоит избегать `call` ради микрооптимизации — читаемость важнее.

---

## 3. `Function.prototype.apply()`

### 3.1. Спецификационный алгоритм

`Function.prototype.apply(thisArg, argArray)` выполняет:

1. Пусть `func` — значение `this` (сама функция).
2. Если `IsCallable(func)` равно `false` — `TypeError`.
3. Если `argArray` равен `undefined` или `null` — вызвать `Call(func, thisArg)` без аргументов.
4. Иначе: `argList = CreateListFromArrayLike(argArray)` — создаёт `List` из array-like объекта.
5. Вызвать `Call(func, thisArg, argList)`.

Ключевая операция — **`CreateListFromArrayLike`**: она последовательно обращается к `argArray[0]`, `argArray[1]`, ..., `argArray[length - 1]`, создавая внутренний `List`. Это медленнее, чем простая передача аргументов.

---

### 3.2. Ограничение на количество аргументов

```js
const hugeArray = new Array(1_000_000).fill(0);

// ОПАСНО: может вызвать RangeError или stack overflow
// Внутренний лимит зависит от движка (обычно ~65536 для call stack)
Math.max.apply(null, hugeArray); // RangeError: Maximum call stack size exceeded

// Безопасная альтернатива
function safeMax(arr) {
  let max = -Infinity;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > max) max = arr[i];
  }
  return max;
}

// Или батчами:
function batchMax(arr, batchSize = 50000) {
  let max = -Infinity;
  for (let i = 0; i < arr.length; i += batchSize) {
    const batch = arr.slice(i, i + batchSize);
    const batchResult = Math.max(...batch);
    if (batchResult > max) max = batchResult;
  }
  return max;
}
```

---

### 3.3. `apply` vs `spread`: производительность

```js
// apply — медленнее (CreateListFromArrayLike)
Math.max.apply(null, numbers);

// spread — быстрее (нет CreateListFromArrayLike, аргументы разворачиваются на этапе компиляции)
Math.max(...numbers);
```

Бенчмарк (V8, типичные результаты для массива из 1000 элементов):

| Способ | Операций/сек (приблизительно) |
|:-------|:------------------------------|
| `Math.max.apply(null, arr)` | ~2.5M |
| `Math.max(...arr)` | ~4M |
| Ручной цикл `for` | ~15M |

`spread` выигрывает, потому что движок может оптимизировать его на этапе JIT-компиляции, минуя абстрактную операцию `CreateListFromArrayLike`. Однако оба подхода имеют ограничение на размер массива — для больших массивов используйте цикл.

---

### 3.4. `Math.max.apply(null, arr)` vs `Math.max(...arr)`

```js
const prices = [199.99, 49.99, 299.99, 89.99];

// Классический способ (до ES6)
const maxPrice = Math.max.apply(null, prices); // 299.99

// Современный способ
const maxPriceModern = Math.max(...prices); // 299.99

// Почему apply(null, ...)? — Math.max не использует this,
// поэтому thisArg не имеет значения. null — конвенция.
```

---

### 3.5. Monkey-patching через `apply`: декорирование нативных функций

`apply` — основной инструмент для monkey-patching, поскольку позволяет прозрачно передать любое количество аргументов:

```js
// Перехват console.log для логирования с таймстампом
const originalLog = console.log;

console.log = function (...args) {
  const timestamp = new Date().toISOString();
  originalLog.apply(console, [`[${timestamp}]`, ...args]);
};

console.log('сервер запущен'); // [2026-03-22T10:00:00.000Z] сервер запущен
```

```js
// Перехват fetch для добавления авторизации
const originalFetch = window.fetch;

window.fetch = function (url, options = {}) {
  const authOptions = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${getToken()}`
    }
  };
  return originalFetch.apply(this, [url, authOptions]);
};
```

```js
// Замер времени выполнения любой функции
function withTiming(fn, label) {
  return function (...args) {
    const start = performance.now();
    const result = fn.apply(this, args); // сохраняем this и аргументы
    const duration = performance.now() - start;
    console.log(`${label}: ${duration.toFixed(2)}ms`);
    return result;
  };
}

const slowFunction = withTiming(originalSlowFn, 'slowFunction');
```

---

## 4. `Function.prototype.bind()`

### 4.1. Спецификационный алгоритм

`Function.prototype.bind(thisArg, ...args)` выполняет:

1. Пусть `Target` — значение `this` (оригинальная функция).
2. Если `IsCallable(Target)` равно `false` — `TypeError`.
3. Создать `BoundFunctionCreate(Target, thisArg, args)`:
   - Создаётся экзотический объект `F` с внутренними слотами:
     - `[[BoundTargetFunction]]` — ссылка на оригинальную функцию
     - `[[BoundThis]]` — привязанное значение `this`
     - `[[BoundArguments]]` — список предустановленных аргументов
   - `[[Prototype]]` нового объекта устанавливается в `Target.[[GetPrototypeOf]]()`
4. Установить `F.[[Call]]` — при вызове `F(extraArgs)` выполняется:
   `Target.[[Call]](BoundThis, [...BoundArguments, ...extraArgs])`
5. Если `Target` имеет `[[Construct]]` — установить `F.[[Construct]]`:
   При `new F(extraArgs)` выполняется `Target.[[Construct]]([...BoundArguments, ...extraArgs], newTarget)`.
   **`BoundThis` при этом игнорируется** — `new` создаёт свой объект.
6. Установить `F.length = max(0, Target.length - args.length)`.
7. Установить `F.name = "bound " + Target.name`.

---

### 4.2. `bind` + `new`: привязанный `this` игнорируется

```js
function Point(x, y) {
  this.x = x;
  this.y = y;
}

const BoundPoint = Point.bind({ ignored: true }, 10);

// Обычный вызов — bind работает
const result = BoundPoint(20);
// result === undefined (функция ничего не возвращает)
// Побочный эффект: this.x = 10, this.y = 20 — записано в {ignored: true}

// new — bind-контекст игнорируется
const point = new BoundPoint(20);
console.log(point.x);        // 10 (из BoundArguments)
console.log(point.y);        // 20
console.log(point.ignored);  // undefined — bind-контекст НЕ применился
console.log(point instanceof Point); // true
```

Это поведение определено в спецификации: при `[[Construct]]` вызове `BoundThis` не передаётся, вместо этого `new` создаёт свежий объект и устанавливает его как `this`.

---

### 4.3. Двойной `bind`

```js
function greet() {
  return this.name;
}

const a = { name: 'A' };
const b = { name: 'B' };

const boundA = greet.bind(a);
const boundAB = boundA.bind(b); // Попытка перепривязать

console.log(boundA());  // 'A'
console.log(boundAB()); // 'A' — НЕ 'B'!
```

Почему? Потому что `boundAB.[[Call]]` вызывает `boundA.[[Call]](b_thisArg, args)`, но внутри `boundA.[[Call]]` уже зашито: `greet.[[Call]](a, args)`. Привязанный `this` не может быть переопределён — он замурован в `[[BoundThis]]` первого `bind`.

Цепочка: `boundAB()` → `boundA.[[Call]](b, [])` → `greet.[[Call]](a, [])` — `b` выбрасывается.

---

### 4.4. `.name` и `.length`

```js
function add(a, b, c) {
  return a + b + c;
}

console.log(add.name);   // 'add'
console.log(add.length); // 3

const addFive = add.bind(null, 5);
console.log(addFive.name);   // 'bound add'
console.log(addFive.length); // 2 (3 - 1 привязанный аргумент)

const addFiveAndTen = add.bind(null, 5, 10);
console.log(addFiveAndTen.name);   // 'bound add'
console.log(addFiveAndTen.length); // 1 (3 - 2)

const addAll = add.bind(null, 5, 10, 15);
console.log(addAll.length); // 0 (max(0, 3 - 3))

// Если привязано больше аргументов, чем параметров:
const addExtra = add.bind(null, 1, 2, 3, 4, 5);
console.log(addExtra.length); // 0 (не может быть отрицательным)
```

---

### 4.5. Performance: `bind` создаёт объект при каждом вызове

```js
// АНТИПАТТЕРН в React class components
class List extends React.Component {
  render() {
    return this.props.items.map(item =>
      // bind вызывается на КАЖДОМ рендере для КАЖДОГО элемента
      // Это создаёт N новых функций, ломает PureComponent / React.memo
      <Item onClick={this.handleClick.bind(this, item.id)} />
    );
  }
}

// ПРАВИЛЬНО: вынести bind в конструктор или использовать class field
class List extends React.Component {
  handleClick = (id) => { /* ... */ };

  render() {
    return this.props.items.map(item =>
      <Item onClick={() => this.handleClick(item.id)} />
    );
  }
}
```

В функциональных компонентах с хуками эта проблема решается через `useCallback`:

```js
const List = ({ items }) => {
  const handleClick = useCallback((id) => { /* ... */ }, []);
  // ...
};
```

---

### 4.6. Polyfill `bind` (классическая задача на собеседовании senior)

```js
// Упрощённый polyfill, покрывающий основные кейсы
if (!Function.prototype.bind) {
  Function.prototype.bind = function (thisArg, ...boundArgs) {
    // 1. Проверяем, что bind вызван на функции
    if (typeof this !== 'function') {
      throw new TypeError('bind must be called on a function');
    }

    const targetFn = this;

    // 2. Создаём промежуточный конструктор для корректной работы с new
    const BoundFunction = function (...callArgs) {
      const allArgs = [...boundArgs, ...callArgs];

      // 3. Если вызвано через new — this instanceof BoundFunction
      if (new.target) {
        // Имитируем new: this игнорируем thisArg
        return targetFn.apply(this, allArgs);
      }

      // 4. Обычный вызов — используем thisArg
      return targetFn.apply(thisArg, allArgs);
    };

    // 5. Настраиваем цепочку прототипов для корректной работы instanceof
    if (targetFn.prototype) {
      BoundFunction.prototype = Object.create(targetFn.prototype);
    }

    // 6. Корректные name и length
    Object.defineProperty(BoundFunction, 'length', {
      value: Math.max(0, targetFn.length - boundArgs.length)
    });
    Object.defineProperty(BoundFunction, 'name', {
      value: 'bound ' + (targetFn.name || '')
    });

    return BoundFunction;
  };
}
```

Проверка polyfill:

```js
function Foo(a, b) { this.sum = a + b; }
const BoundFoo = Foo.bind(null, 10);

const obj = new BoundFoo(20);
console.log(obj.sum);            // 30
console.log(obj instanceof Foo); // true
console.log(BoundFoo.name);     // 'bound Foo'
console.log(BoundFoo.length);   // 1
```

---

### 4.7. V8 оптимизации

V8 (движок Chrome / Node.js) специально оптимизирует bound functions:

- **TurboFan** (оптимизирующий компилятор) может **инлайнить** bound functions в hot-пути, устраняя накладные расходы на вызов через `[[BoundTargetFunction]]`.
- `BoundFunction` хранится как «экзотический объект» — отдельный внутренний тип, а не обычный JS-объект.
- При `new` на bound function V8 напрямую вызывает `[[Construct]]` таргета без промежуточных аллокаций.
- В Node.js `--trace-opt` покажет, был ли bound function инлайнен или деоптимизирован.

Тем не менее, для горячих путей (tight loops) прямой вызов всё ещё быстрее, чем bound function, на ~5-15%.

---

## 5. `Reflect.apply` и `Reflect.construct`

### 5.1. `Reflect.apply(target, thisArg, argumentsList)`

```js
// Синтаксис
Reflect.apply(target, thisArg, argumentsList);

// Эквивалентно:
Function.prototype.apply.call(target, thisArg, argumentsList);
```

Ключевое преимущество: **не зависит от переопределения `Function.prototype.apply`**.

```js
// Если кто-то переопределил apply:
Function.prototype.apply = function () {
  throw new Error('apply перехвачен!');
};

// Function.prototype.apply больше не работает
try {
  Math.max.apply(null, [1, 2, 3]); // Error: apply перехвачен!
} catch (e) {
  console.error(e.message);
}

// Reflect.apply работает независимо
const max = Reflect.apply(Math.max, null, [1, 2, 3]); // 3
```

Это критически важно в:
- Библиотеках безопасности (CSP, sandbox)
- Полифиллах, которые не должны зависеть от состояния `Function.prototype`
- Прокси-объектах (`Proxy` handler `apply` trap)

```js
// Типичное использование в Proxy
const handler = {
  apply(target, thisArg, argumentsList) {
    console.log(`Вызвана ${target.name} с аргументами:`, argumentsList);
    return Reflect.apply(target, thisArg, argumentsList);
  }
};

const proxiedFn = new Proxy(someFunction, handler);
```

---

### 5.2. `Reflect.construct(target, argumentsList [, newTarget])`

Создаёт экземпляр, аналогично `new target(...argumentsList)`, но с возможностью задать `new.target`:

```js
// Базовое использование — эквивалент new
const date = Reflect.construct(Date, [2026, 2, 22]);
console.log(date instanceof Date); // true
console.log(date.getFullYear());   // 2026
```

Главная особенность — третий аргумент `newTarget`:

```js
// Наследование встроенных классов (до ES6 class extends)
function SpecialArray(...args) {
  // В старом коде new Array() не работал с кастомным прототипом
}
SpecialArray.prototype = Object.create(Array.prototype);
SpecialArray.prototype.first = function () { return this[0]; };

// Reflect.construct позволяет создать настоящий массив с кастомным прототипом
const arr = Reflect.construct(Array, [1, 2, 3], SpecialArray);
console.log(arr instanceof Array);        // true
console.log(arr instanceof SpecialArray); // true
console.log(arr.first());                 // 1
console.log(arr.length);                  // 3 — длина работает корректно
```

```js
// Изменение new.target для кастомизации создания объектов
class Base {
  constructor() {
    console.log('new.target:', new.target.name);
  }
}

class Derived extends Base {}

Reflect.construct(Base, [], Derived);
// Вывод: 'new.target: Derived'
// new.target = Derived, хотя вызывается конструктор Base
```

---

### 5.3. Когда использовать `Reflect` vs прямые методы

| Сценарий | Рекомендация |
|:---------|:-------------|
| Обычный вызов с контекстом | `fn.call(ctx, ...args)` — проще и читаемее |
| Передача массива аргументов | `fn.apply(ctx, args)` или `fn(...args)` |
| Proxy handler `apply` trap | `Reflect.apply(target, thisArg, args)` — единственный корректный способ |
| Proxy handler `construct` trap | `Reflect.construct(target, args, newTarget)` |
| Защита от monkey-patching `Function.prototype` | `Reflect.apply` — не зависит от прототипа |
| Создание экземпляра с кастомным `new.target` | `Reflect.construct` — единственный способ |
| Замена `apply` на встроенных классах (`Date`, `Array`) | `Reflect.construct` |

Общее правило: если вы пишете `Proxy` handler — используйте `Reflect`. В остальных случаях — `call`/`apply`/`bind`.

---

## 6. Сравнительная таблица: `call` vs `apply` vs `bind` vs `Reflect`

| Характеристика | `call` | `apply` | `bind` | `Reflect.apply` |
|:--------------|:-------|:--------|:-------|:-----------------|
| **Синтаксис** | `fn.call(ctx, a, b)` | `fn.apply(ctx, [a, b])` | `fn.bind(ctx, a)(b)` | `Reflect.apply(fn, ctx, [a, b])` |
| **Когда вызывается** | Немедленно | Немедленно | Возвращает новую функцию | Немедленно |
| **Возвращаемое значение** | Результат `fn` | Результат `fn` | Новая функция | Результат `fn` |
| **Передача аргументов** | Через запятую | Массивом | Частичное применение + через запятую | Массивом |
| **Работает с `new`** | Нет | Нет | Да (`this` игнорируется) | Нет (есть `Reflect.construct`) |
| **Зависит от `Function.prototype`** | Да | Да | Да | Нет |
| **Создаёт новый объект** | Нет | Нет | Да (bound function) | Нет |

### Когда что использовать

```js
// call — известные аргументы, одноразовый вызов
Object.prototype.toString.call(value);
Array.prototype.slice.call(arguments);

// apply — аргументы в массиве (legacy-код)
Math.max.apply(null, numbers);
fn.apply(context, argsArray);

// bind — отложенный вызов, фиксация контекста, partial application
element.addEventListener('click', handler.bind(this));
const double = multiply.bind(null, 2);

// Reflect.apply — внутри Proxy, защита от monkey-patching
const handler = {
  apply(target, thisArg, args) {
    return Reflect.apply(target, thisArg, args);
  }
};

// Reflect.construct — создание экземпляров с кастомным new.target
Reflect.construct(Date, [2026, 0, 1], CustomDate);
```

### Шпаргалка по выбору

```
Нужен одноразовый вызов?
├── Аргументы известны → call
├── Аргументы в массиве → apply (или spread)
└── Внутри Proxy trap → Reflect.apply

Нужен отложенный вызов?
├── Фиксация this → bind
├── Partial application → bind
└── Event handler → bind или arrow function

Нужен new с массивом аргументов?
└── Reflect.construct
```
