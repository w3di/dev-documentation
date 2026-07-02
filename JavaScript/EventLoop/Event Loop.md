# Event Loop: полное руководство

## Оглавление

1. [Определение Event Loop](#1-определение-event-loop)
2. [Алгоритм Event Loop по спецификации](#2-алгоритм-event-loop-по-спецификации)
3. [Call Stack (Execution Context Stack)](#3-call-stack-execution-context-stack)
4. [Task Queues (макротаски)](#4-task-queues-макротаски)
5. [Microtask Queue](#5-microtask-queue)
6. [Rendering Pipeline](#6-rendering-pipeline)
7. [Node.js Event Loop](#7-nodejs-event-loop)
8. [Подробные примеры порядка выполнения](#8-подробные-примеры-порядка-выполнения)
9. [Event Loop Starvation и Performance](#9-event-loop-starvation-и-performance)
10. [MessageChannel и postMessage](#10-messagechannel-и-postmessage)

---

## 1. Определение Event Loop

### Event Loop -- это НЕ часть ECMAScript

Критически важное понимание для senior-разработчика: **Event Loop не определён в спецификации ECMAScript**. Это две разные спецификации с разными моделями:

| Спецификация | Что определяет | Где описано |
|---|---|---|
| **ECMAScript (ECMA-262)** | `Jobs` и `Job Queues` | [sec-jobs](https://tc39.es/ecma262/#sec-jobs) |
| **HTML Living Standard** | `Event Loop`, `Task Queues`, `Microtask Queue` | [webappapis event-loops](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops) |

#### ECMAScript: Jobs и Job Queues

ECMAScript определяет абстрактную концепцию **Job** -- это операция, которая инициируется, когда нет другого выполняющегося `ExecutionContext`. Спецификация определяет два типа `Job Queue`:

- **`ScriptJobs`** -- загрузка и выполнение скриптов и модулей
- **`PromiseJobs`** -- обработка реакций промисов (`.then`, `.catch`, `.finally`)

Важно: ECMAScript **не говорит**, как именно `Job Queue` должна быть реализована и как задачи должны выбираться. Это остаётся на усмотрение host environment (браузер, Node.js, Deno и т.д.).

```
// ECMAScript видит это так:
// 1. ScriptJob: выполнить скрипт
// 2. PromiseJob: вызвать .then() callback
// ECMAScript НЕ знает о setTimeout, DOM events, rendering
```

#### HTML Spec: Processing Model

Браузерная реализация `Event Loop` описана в HTML Living Standard и определяет **полную processing model**, которая включает:

- Выбор задач из `task queue`
- Выполнение `microtask checkpoint`
- Этап `update the rendering`
- Взаимодействие с DOM, `setTimeout`, `fetch`, `XMLHttpRequest` и другими Web API

**Почему это важно?** Когда вы видите код вроде `setTimeout(fn, 0)`, это не ECMAScript. `setTimeout` -- Web API (или `timers` модуль в Node.js). ECMAScript не знает о нём. Event Loop в браузере и Event Loop в Node.js -- это разные реализации одной концепции, с разным поведением.

---

## 2. Алгоритм Event Loop по спецификации

### Пошаговый алгоритм (HTML Spec, simplified)

Ниже -- упрощённая, но верная версия алгоритма из спецификации:

```
while (true) {
  // 1. Выбрать task queue, из которой будет взята задача.
  //    Браузер сам решает, из КАКОЙ очереди брать.
  //    Это НЕ FIFO между разными source'ами.
  let taskQueue = getTaskQueueWithRunnableTask();

  if (taskQueue !== null) {
    // 2. Взять первую (oldest) runnable task из выбранной очереди
    let oldestTask = taskQueue.dequeue();

    // 3. Установить event loop's currently running task
    eventLoop.currentlyRunningTask = oldestTask;

    // 4. ВЫПОЛНИТЬ задачу (run its steps)
    oldestTask.run();

    // 5. Сбросить currently running task
    eventLoop.currentlyRunningTask = null;
  }

  // 6. MICROTASK CHECKPOINT -- выполнить ВСЕ микротаски
  performMicrotaskCheckpoint();

  // 7. UPDATE THE RENDERING (не на каждой итерации!)
  if (shouldUpdateRendering()) {
    // 7a. Выполнить resize observer callbacks
    // 7b. Выполнить requestAnimationFrame callbacks
    // 7c. Произвести layout и paint
    updateRendering();
  }

  // 8. Если нет задач и rendering не нужен,
  //    event loop может "спать" до появления новой задачи
}
```

### Ключевые моменты алгоритма

**Одна задача за итерацию.** Event Loop берёт ОДНУ task (не все задачи из очереди), выполняет её, затем переходит к microtask checkpoint. Это принципиальное отличие от microtask queue, где обрабатываются ВСЕ накопленные микротаски.

**Браузер выбирает очередь.** Спецификация говорит: "implementation-defined". Браузер может приоритизировать user interaction tasks над timer tasks. Это означает, что `click` event может обработаться раньше `setTimeout`, даже если таймер уже истёк.

**Rendering не на каждой итерации.** Браузер решает, нужно ли обновлять rendering. Если вкладка не видна (`document.hidden === true`), rendering может не выполняться вообще. Типичная частота -- 60fps (каждые ~16.6ms), но это не гарантировано.

---

## 3. Call Stack (Execution Context Stack)

### Что такое Call Stack

`Call Stack` (стек вызовов) -- это структура данных LIFO (Last In, First Out), которая отслеживает выполнение функций. В спецификации ECMAScript это **Execution Context Stack**. Каждый вызов функции создаёт новый `Execution Context`, который помещается на вершину стека.

```javascript
function third() {
  console.trace('Stack trace:'); // покажет: third -> second -> first -> (anonymous)
}

function second() {
  third();
}

function first() {
  second();
}

first();
```

Состояние стека по шагам:

```
Шаг 1: [Global EC]
Шаг 2: [Global EC] → [first EC]
Шаг 3: [Global EC] → [first EC] → [second EC]
Шаг 4: [Global EC] → [first EC] → [second EC] → [third EC]
Шаг 5: [Global EC] → [first EC] → [second EC]  ← third() вернулась
Шаг 6: [Global EC] → [first EC]                 ← second() вернулась
Шаг 7: [Global EC]                              ← first() вернулась
```

### Stack Frame

Каждый `Execution Context` (stack frame) содержит:

- **`LexicalEnvironment`** -- привязки переменных `let`, `const`, функций
- **`VariableEnvironment`** -- привязки `var`
- **`this` binding** -- значение `this`
- **Return address** -- куда вернуть управление после завершения
- **Аргументы функции** и локальные переменные

### Максимальная глубина стека

Движки JavaScript имеют лимит на глубину стека. При превышении выбрасывается `RangeError: Maximum call stack size exceeded`.

```javascript
// Определение максимальной глубины стека
function measureStackDepth(depth = 0) {
  try {
    return measureStackDepth(depth + 1);
  } catch (e) {
    return depth;
  }
}

console.log(measureStackDepth());
// V8 (Chrome/Node.js): ~10,000-15,000 (зависит от размера frame)
// SpiderMonkey (Firefox): ~20,000-50,000
// JavaScriptCore (Safari): ~30,000-65,000
```

Лимит зависит от **размера каждого stack frame**. Чем больше локальных переменных в функции, тем меньше вызовов поместится в стек:

```javascript
// Мелкий frame -- больше глубина
function small(n) {
  if (n === 0) return;
  small(n - 1);
}

// Крупный frame -- меньше глубина
function large(n) {
  let a = 1, b = 2, c = 3, d = 4, e = 5;
  let f = 6, g = 7, h = 8, i = 9, j = 10;
  if (n === 0) return;
  large(n - 1);
}
```

### Tail Call Optimization (TCO)

**TCO** (оптимизация хвостового вызова) -- это оптимизация, при которой если последняя операция функции -- вызов другой функции (или самой себя), текущий stack frame переиспользуется вместо создания нового.

```javascript
// Хвостовой вызов -- последняя операция return fact(...)
function factorial(n, acc = 1) {
  'use strict'; // TCO требует strict mode
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc); // tail call
}

// НЕ хвостовой вызов -- после вызова ещё операция умножения
function factorialBad(n) {
  if (n <= 1) return 1;
  return n * factorialBad(n - 1); // NOT tail call (n * ...)
}
```

**Состояние поддержки TCO (2026):**

| Движок | Поддержка TCO |
|---|---|
| **JavaScriptCore** (Safari) | Да, с 2016 |
| **V8** (Chrome, Node.js) | Нет, удалена в 2017 |
| **SpiderMonkey** (Firefox) | Нет |

V8 отказался от TCO из-за: 1) усложнения debugging (стек-трейсы теряют фреймы), 2) implicit performance cliff (добавление одной строки после `return` ломает оптимизацию), 3) сложности реализации для всех edge cases.

### Trampolining Pattern

Поскольку TCO недоступна в большинстве движков, для глубокой рекурсии используют **trampolining** -- паттерн, который превращает рекурсию в итерацию:

```javascript
function trampoline(fn) {
  return function(...args) {
    let result = fn(...args);
    while (typeof result === 'function') {
      result = result();
    }
    return result;
  };
}

// Рекурсивная функция возвращает thunk (ленивый вызов) вместо прямого вызова
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return () => factorial(n - 1, n * acc); // возвращаем функцию, а не вызываем
}

const safeFactorial = trampoline(factorial);
console.log(safeFactorial(100000)); // Infinity, но без stack overflow
```

Как это работает: вместо вложенных вызовов, каждый шаг возвращает **thunk** (функцию без аргументов). `trampoline` вызывает thunk'и в цикле `while`, используя один stack frame.

---

## 4. Task Queues (макротаски)

### Терминология: task vs macrotask

Спецификация HTML **не использует** термин "macrotask". Официальный термин -- **task**. "Macrotask" -- это неофициальное название, придуманное сообществом для контраста с "microtask". Использовать его допустимо для ясности, но нужно понимать, что в спецификации это просто `task`.

### Task Sources

Спецификация определяет **task sources** -- категории, из которых приходят задачи. Каждый source может иметь свою очередь. Основные task sources:

| Task Source | Примеры |
|---|---|
| **Timer task source** | `setTimeout`, `setInterval` |
| **DOM manipulation source** | непосредственные DOM-операции |
| **User interaction source** | `click`, `keydown`, `scroll` |
| **Networking source** | `fetch`, `XMLHttpRequest` callbacks |
| **History traversal source** | `popstate` events |
| **MessagePort source** | `MessageChannel.port.onmessage` |

Браузер **не обязан** обрабатывать task sources в порядке FIFO между собой. Он может приоритизировать user interaction над timer tasks. Это значит, что если пользователь кликнул кнопку и одновременно сработал `setTimeout`, клик может обработаться первым.

### setTimeout: подробности

#### setTimeout(fn, 0) !== немедленное выполнение

`setTimeout(fn, 0)` не означает "выполнить через 0 миллисекунд". Это означает "поставить задачу в task queue, которая будет обработана не ранее, чем через 0ms". На практике:

1. Задача сначала должна попасть в task queue
2. Event Loop должен закончить текущую задачу
3. Event Loop должен выполнить все микротаски
4. Возможно, Event Loop выполнит rendering
5. Только потом -- задача из `setTimeout`

```javascript
console.log('1: sync');

setTimeout(() => {
  console.log('2: setTimeout 0');
}, 0);

console.log('3: sync');

// Вывод:
// 1: sync
// 3: sync
// 2: setTimeout 0
```

#### 4ms Clamping (Timer Throttling)

HTML-спецификация определяет: если `setTimeout`/`setInterval` вложен **более чем на 5 уровней**, минимальный интервал принудительно устанавливается в **4ms**, даже если указан 0.

```javascript
// Демонстрация 4ms clamping
let start = performance.now();
let depths = [];

function nested(depth) {
  if (depth > 10) {
    console.log(depths);
    return;
  }
  setTimeout(() => {
    depths.push({
      depth,
      elapsed: (performance.now() - start).toFixed(2) + 'ms'
    });
    nested(depth + 1);
  }, 0);
}

nested(1);

// Примерный результат:
// depth 1: ~0.1ms   (нет clamping)
// depth 2: ~0.2ms   (нет clamping)
// depth 3: ~0.3ms   (нет clamping)
// depth 4: ~0.5ms   (нет clamping)
// depth 5: ~0.8ms   (нет clamping)
// depth 6: ~4.8ms   ← clamping включился
// depth 7: ~8.9ms   ← 4ms между вызовами
// depth 8: ~12.9ms  ← 4ms между вызовами
```

Это поведение определено в спецификации ([HTML spec, step 11 of timer initialization](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#dom-settimeout)):

> If nesting level is greater than 5, and timeout is less than 4, then set timeout to 4.

#### setInterval Drift Problem

`setInterval` не гарантирует точный интервал между вызовами. Каждый вызов ставится в task queue **после** истечения интервала, но выполнение может задержаться, если Event Loop занят. Со временем интервалы "дрейфуют":

```javascript
// Проблема drift
let expected = Date.now() + 1000;
let drift = 0;

const id = setInterval(() => {
  const now = Date.now();
  drift = now - expected;
  console.log(`Drift: ${drift}ms`);
  expected += 1000;
}, 1000);

// Со временем drift будет только расти,
// потому что каждый интервал чуть длиннее 1000ms
```

Решение -- **self-correcting timer**:

```javascript
function accurateInterval(callback, interval) {
  let expected = Date.now() + interval;

  function step() {
    const now = Date.now();
    const drift = now - expected;

    callback(drift);

    expected += interval;
    // Компенсируем drift, уменьшая следующий timeout
    setTimeout(step, Math.max(0, interval - drift));
  }

  setTimeout(step, interval);
}

accurateInterval((drift) => {
  console.log(`Drift: ${drift}ms`);
}, 1000);
```

### setTimeout возвращает не 0

`setTimeout` возвращает числовой `timeoutID`. В браузере это положительное целое число, уникальное для текущего контекста. В Node.js это объект `Timeout`. Это различие важно при типизации в TypeScript:

```typescript
// Браузер
const id: number = setTimeout(() => {}, 100);

// Node.js
const id: NodeJS.Timeout = setTimeout(() => {}, 100);

// Универсальный вариант
const id: ReturnType<typeof setTimeout> = setTimeout(() => {}, 100);
```

---

## 5. Microtask Queue

### Microtask Checkpoint Algorithm

`Microtask checkpoint` -- это алгоритм из HTML-спецификации, который выполняется:

1. **После каждой task** (основной момент)
2. **После каждого callback'а** в некоторых API (например, mutation observer)
3. **Во время очистки стека** в определённых точках

Алгоритм `perform a microtask checkpoint`:

```
function performMicrotaskCheckpoint() {
  if (performingMicrotaskCheckpoint) return; // guard
  performingMicrotaskCheckpoint = true;

  while (microtaskQueue.length > 0) {
    let microtask = microtaskQueue.dequeue();
    microtask.run();
    // ВАЖНО: если microtask добавил новые microtask'и,
    // они тоже выполнятся в этом же checkpoint
  }

  performingMicrotaskCheckpoint = false;
}
```

**Критический момент:** все микротаски, добавленные во время выполнения микротасков, выполняются в том же checkpoint. Очередь осушается полностью.

### Источники микротасков

#### Promise reactions

`Promise.resolve().then(fn)` -- самый распространённый способ создания микротаски. Когда promise resolved/rejected, его `.then`/`.catch` callbacks ставятся в microtask queue:

```javascript
console.log('1');

Promise.resolve().then(() => {
  console.log('2: microtask');
  Promise.resolve().then(() => {
    console.log('3: nested microtask');
  });
});

console.log('4');

// Вывод:
// 1
// 4
// 2: microtask
// 3: nested microtask  ← выполнился в том же checkpoint
```

#### queueMicrotask()

`queueMicrotask(fn)` -- явный API для постановки микротаски. Появился в спецификации как способ создать микротаску без создания `Promise`:

```javascript
// Раньше для создания микротаски "хакали" через Promise:
Promise.resolve().then(fn);

// Теперь есть явный API:
queueMicrotask(fn);
```

Разница: `queueMicrotask` не оборачивает ошибки в rejected promise. Если callback бросит ошибку, она станет обычным uncaught error, а не unhandled rejection:

```javascript
// Promise.resolve().then -- ошибка станет unhandled rejection
Promise.resolve().then(() => { throw new Error('oops'); });
// Событие: unhandledrejection

// queueMicrotask -- ошибка станет обычной ошибкой
queueMicrotask(() => { throw new Error('oops'); });
// Событие: error (или uncaughtException в Node.js)
```

#### MutationObserver

`MutationObserver` использует микротаски для уведомления об изменениях DOM. Это позволяет получить batch уведомлений после всех синхронных DOM-мутаций:

```javascript
const observer = new MutationObserver((mutations) => {
  console.log('DOM changed:', mutations.length, 'mutations');
});

observer.observe(document.body, { childList: true });

// Три синхронных мутации
document.body.appendChild(document.createElement('div'));
document.body.appendChild(document.createElement('span'));
document.body.appendChild(document.createElement('p'));

// MutationObserver callback вызовется ОДИН раз с 3 mutations,
// а не три раза по одной. Это потому что callback --
// микротаска, которая выполнится после всех синхронных операций.
```

### Starvation: рекурсивные микротаски

**Starvation** (голодание) -- ситуация, когда рекурсивные микротаски бесконечно добавляют новые микротаски, не давая Event Loop перейти к rendering и task queue:

```javascript
// ОПАСНО: бесконечная рекурсия микротасков
function evilMicrotask() {
  queueMicrotask(() => {
    // Эта микротаска добавляет новую микротаску
    // Microtask checkpoint НИКОГДА не завершится
    // Rendering заблокирован НАВСЕГДА
    // Страница "зависает"
    evilMicrotask();
  });
}

evilMicrotask(); // Вкладка заморожена
```

Это **принципиальное отличие** от бесконечного `setTimeout(fn, 0)`:

```javascript
// setTimeout(fn, 0) -- безопасно для rendering
function safeLoop() {
  setTimeout(() => {
    // Это task. После каждого вызова Event Loop
    // может выполнить rendering.
    // Страница остаётся отзывчивой.
    safeLoop();
  }, 0);
}

safeLoop(); // Страница работает нормально
```

### process.nextTick vs Promise microtask в Node.js

В Node.js существует **два уровня** микротасков, обрабатываемых в определённом порядке:

1. **`process.nextTick` queue** -- обрабатывается **ПЕРВОЙ**
2. **Promise microtask queue** -- обрабатывается **ВТОРОЙ**

```javascript
// Node.js
Promise.resolve().then(() => console.log('promise 1'));
process.nextTick(() => console.log('nextTick 1'));
Promise.resolve().then(() => console.log('promise 2'));
process.nextTick(() => console.log('nextTick 2'));

// Вывод:
// nextTick 1
// nextTick 2
// promise 1
// promise 2
```

**Почему `process.nextTick` приоритетнее?** Исторически `process.nextTick` существовал до промисов. Node.js обрабатывает `nextTickQueue` перед переходом к promise microtasks на каждой фазе event loop. Это поведение описано в документации Node.js и не меняется.

**Опасность `process.nextTick`:** так же как и промисовые микротаски, рекурсивные `process.nextTick` вызовут starvation -- Event Loop никогда не перейдёт к следующей фазе:

```javascript
// ОПАСНО: starvation через nextTick
function starvation() {
  process.nextTick(starvation);
}
starvation(); // Node.js процесс зависнет
```

---

## 6. Rendering Pipeline

### requestAnimationFrame (rAF)

`requestAnimationFrame` -- это **НЕ макротаск и НЕ микротаск**. Это отдельная очередь callbacks, которые выполняются **на этапе update the rendering** алгоритма Event Loop:

```
Task → Microtask Checkpoint → [Update the Rendering]
                                      │
                                      ├── Run resize observers
                                      ├── Run rAF callbacks    ← ВОТ ТУТ
                                      ├── Layout
                                      └── Paint
```

```javascript
console.log('1: sync');

setTimeout(() => console.log('2: setTimeout'), 0);

requestAnimationFrame(() => {
  console.log('3: rAF');
});

Promise.resolve().then(() => console.log('4: microtask'));

console.log('5: sync');

// Вывод:
// 1: sync
// 5: sync
// 4: microtask
// 3: rAF        ← может быть до или после setTimeout!
// 2: setTimeout ← порядок rAF/setTimeout НЕ гарантирован
```

**Порядок `rAF` и `setTimeout` не детерминирован.** `rAF` выполняется на этапе rendering, а `setTimeout(fn, 0)` -- как task. Если rendering происходит в текущей итерации, `rAF` выполнится раньше. Если нет -- `setTimeout` может выполниться первым.

#### Особенность rAF: callbacks выполняются "снимком"

При вызове `requestAnimationFrame` callback добавляется в очередь rAF. На этапе rendering выполняются **только те callbacks, которые были в очереди на момент начала rendering**. Новые callbacks, добавленные из rAF callback, выполнятся в **следующем** frame:

```javascript
// Это НЕ создаёт бесконечный цикл в одном frame
requestAnimationFrame(() => {
  console.log('frame 1');
  requestAnimationFrame(() => {
    console.log('frame 2'); // Выполнится в СЛЕДУЮЩЕМ frame
  });
});
```

Это отличие от microtask queue, где новые микротаски обрабатываются в том же checkpoint.

### requestIdleCallback

`requestIdleCallback` выполняет callback в **idle period** -- когда браузер не занят другой работой:

```
Frame timeline (~16.6ms при 60fps):
├── Task + Microtasks
├── rAF callbacks
├── Layout + Paint
├── ────── IDLE PERIOD ────── ← requestIdleCallback здесь
└── (следующий frame)
```

```javascript
requestIdleCallback((deadline) => {
  // deadline.timeRemaining() -- сколько ms осталось в idle period
  // deadline.didTimeout -- true если callback вызван по timeout

  while (deadline.timeRemaining() > 0 && tasks.length > 0) {
    processTask(tasks.pop());
  }

  // Если задачи остались, запланировать продолжение
  if (tasks.length > 0) {
    requestIdleCallback(processRemainingTasks);
  }
}, { timeout: 5000 }); // Максимальное время ожидания
```

**Важно:** `requestIdleCallback` не поддерживается в Safari (по состоянию на 2026). Полифил через `setTimeout` теряет смысл, так как не имеет доступа к информации об idle period.

### Как браузер решает, когда рендерить

Браузер **не обязан** рендерить на каждой итерации Event Loop. Он учитывает:

1. **Видимость вкладки** -- фоновые вкладки могут рендериться реже или не рендериться вовсе
2. **Частота дисплея** -- 60Hz = каждые ~16.6ms, 120Hz = каждые ~8.3ms
3. **Наличие визуальных изменений** -- если DOM не изменился и нет анимаций, рендеринг может быть пропущен
4. **Производительность** -- если предыдущий frame занял слишком много времени, браузер может пропустить frames
5. **`document.hidden`** -- если `true`, rendering может быть полностью остановлен

```javascript
// Определение пропущенных frames
let lastTimestamp = 0;
let droppedFrames = 0;

function monitorFrames(timestamp) {
  if (lastTimestamp) {
    const delta = timestamp - lastTimestamp;
    if (delta > 20) { // Больше ~16.6ms + запас
      droppedFrames++;
      console.warn(`Dropped frame! Delta: ${delta.toFixed(1)}ms`);
    }
  }
  lastTimestamp = timestamp;
  requestAnimationFrame(monitorFrames);
}

requestAnimationFrame(monitorFrames);
```

---

## 7. Node.js Event Loop

### Архитектура: libuv

Node.js Event Loop построен на **libuv** -- кроссплатформенной C-библиотеке для асинхронного I/O. libuv предоставляет:

- Event loop
- Асинхронный TCP/UDP/DNS/File I/O
- Thread pool (по умолчанию 4 потока, настраивается через `UV_THREADPOOL_SIZE`, макс. 1024)
- Child processes
- Signal handling

### 6 фаз Event Loop в Node.js

```
   ┌───────────────────────────┐
┌─>│         timers            │ ← setTimeout, setInterval
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │ ← системные callbacks (TCP errors и др.)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │ ← внутренние libuv операции
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │           poll             │ ← I/O callbacks, ожидание новых событий
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │          check             │ ← setImmediate
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │      close callbacks      │ ← socket.on('close'), process.exit()
│  └─────────────┴─────────────┘
│                │
└────────────────┘
```

#### Фаза 1: timers

Выполняет callbacks для `setTimeout` и `setInterval`, чей порог (threshold) истёк. **Не гарантирует** точное время выполнения -- только минимальное.

#### Фаза 2: pending callbacks

Выполняет callbacks для отложенных системных операций, например, ошибки TCP (`ECONNREFUSED`).

#### Фаза 3: idle, prepare

Используется только внутри libuv. Не доступна из JavaScript.

#### Фаза 4: poll

Самая важная фаза. Здесь Node.js:
1. Вычисляет, как долго нужно ждать I/O
2. Обрабатывает events в poll queue (I/O callbacks)

Если poll queue не пустая -- выполняет callbacks синхронно, пока очередь не опустеет или не будет достигнут лимит.

Если poll queue пустая:
- Если есть `setImmediate` callbacks -- переход к check фазе
- Если нет `setImmediate` -- ожидание новых callbacks в poll queue
- Если есть истёкшие timers -- возврат к timers фазе

#### Фаза 5: check

Выполняет `setImmediate` callbacks. `setImmediate` -- специфика Node.js, предназначен для выполнения кода **после poll фазы**.

#### Фаза 6: close callbacks

Выполняет callbacks закрытия, например `socket.on('close', ...)`.

#### Микротаски между фазами

**Между каждой фазой** (а также между каждым callback внутри фазы, начиная с Node.js 11+) Node.js выполняет:
1. Все callbacks из `process.nextTick` queue
2. Все callbacks из promise microtask queue

```javascript
// Node.js >= 11: микротаски между КАЖДЫМ callback
setImmediate(() => console.log('immediate 1'));
setImmediate(() => {
  console.log('immediate 2');
  Promise.resolve().then(() => console.log('promise from immediate 2'));
});
setImmediate(() => console.log('immediate 3'));

// Node.js >= 11:
// immediate 1
// immediate 2
// promise from immediate 2  ← микротаска выполнена МЕЖДУ immediates
// immediate 3

// Node.js < 11 (старое поведение):
// immediate 1
// immediate 2
// immediate 3
// promise from immediate 2  ← микротаска выполнена ПОСЛЕ всех immediates
```

### setImmediate vs setTimeout(fn, 0)

```javascript
// Порядок НЕ детерминирован в main module:
setTimeout(() => console.log('timeout'), 0);
setImmediate(() => console.log('immediate'));

// Может быть:
// timeout → immediate
// ИЛИ
// immediate → timeout
```

**Почему порядок неопределённый?** При запуске скрипта performance.now() может быть < 1ms или >= 1ms. `setTimeout(fn, 0)` в Node.js реально становится `setTimeout(fn, 1)`. Если к моменту входа в timers фазу прошло < 1ms, таймер ещё не истёк, и Event Loop переходит к poll, а затем check (setImmediate). Если >= 1ms -- таймер истёк и выполняется первым.

```javascript
// Внутри I/O callback порядок ДЕТЕРМИНИРОВАН:
const fs = require('fs');

fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});

// ВСЕГДА:
// immediate
// timeout
// Потому что мы в poll фазе, и check (setImmediate) идёт ДО timers
```

---

## 8. Подробные примеры порядка выполнения

### Пример 1: sync + setTimeout + Promise + queueMicrotask

```javascript
console.log('1');

setTimeout(() => {
  console.log('2');
  Promise.resolve().then(() => console.log('3'));
}, 0);

Promise.resolve().then(() => {
  console.log('4');
  queueMicrotask(() => console.log('5'));
});

queueMicrotask(() => console.log('6'));

setTimeout(() => console.log('7'), 0);

console.log('8');
```

**Пошаговый разбор:**

**Этап 1: Выполнение синхронного кода (текущая task -- выполнение скрипта)**

1. `console.log('1')` -- выводит `1`
2. `setTimeout(cb1, 0)` -- ставит `cb1` в task queue
3. `Promise.resolve().then(cb2)` -- promise уже resolved, ставит `cb2` в microtask queue
4. `queueMicrotask(cb3)` -- ставит `cb3` (выводит `6`) в microtask queue
5. `setTimeout(cb4, 0)` -- ставит `cb4` (выводит `7`) в task queue
6. `console.log('8')` -- выводит `8`

Состояние после синхронного кода:
- Call Stack: пуст
- Microtask Queue: [`cb2`, `cb3`]
- Task Queue: [`cb1`, `cb4`]

**Этап 2: Microtask Checkpoint**

7. Берём `cb2` из microtask queue:
   - `console.log('4')` -- выводит `4`
   - `queueMicrotask(cb5)` -- ставит `cb5` (выводит `5`) в microtask queue
8. Берём `cb3` из microtask queue:
   - `console.log('6')` -- выводит `6`
9. Берём `cb5` (добавлена во время checkpoint!) из microtask queue:
   - `console.log('5')` -- выводит `5`
10. Microtask queue пуста -- checkpoint завершён

**Этап 3: Следующая task (cb1)**

11. Берём `cb1` из task queue:
    - `console.log('2')` -- выводит `2`
    - `Promise.resolve().then(cb6)` -- ставит `cb6` (выводит `3`) в microtask queue
12. Microtask Checkpoint:
    - `cb6`: `console.log('3')` -- выводит `3`

**Этап 4: Следующая task (cb4)**

13. Берём `cb4` из task queue:
    - `console.log('7')` -- выводит `7`

**Итоговый порядок: `1, 8, 4, 6, 5, 2, 3, 7`**

---

### Пример 2: async/await и порядок выполнения

```javascript
async function asyncA() {
  console.log('1: asyncA start');
  await asyncB();
  console.log('2: asyncA after await');
}

async function asyncB() {
  console.log('3: asyncB');
}

console.log('4: script start');

setTimeout(() => console.log('5: setTimeout'), 0);

asyncA();

new Promise((resolve) => {
  console.log('6: promise constructor');
  resolve();
}).then(() => {
  console.log('7: promise then');
});

console.log('8: script end');
```

**Пошаговый разбор:**

Ключевое понимание: `await x` эквивалентно `x.then(continuation)`. Код после `await` -- это callback микротаски.

```javascript
// async function asyncA() {
//   console.log('1');
//   await asyncB();
//   console.log('2');
// }
// Эквивалентно:
// function asyncA() {
//   console.log('1');
//   return asyncB().then(() => {
//     console.log('2');
//   });
// }
```

**Выполнение:**

1. `console.log('4: script start')` -- выводит `4: script start`
2. `setTimeout(cb, 0)` -- ставит cb в task queue
3. Вызов `asyncA()`:
   - `console.log('1: asyncA start')` -- выводит `1: asyncA start`
   - `await asyncB()` -- вызывает `asyncB()`:
     - `console.log('3: asyncB')` -- выводит `3: asyncB`
     - `asyncB` возвращает resolved promise
   - `await` оборачивает результат: код после `await` (строка `console.log('2')`) ставится в microtask queue
4. Конструктор `new Promise(executor)`:
   - executor выполняется **синхронно**
   - `console.log('6: promise constructor')` -- выводит `6: promise constructor`
   - `resolve()` -- promise resolved
   - `.then(cb)` -- ставит cb в microtask queue
5. `console.log('8: script end')` -- выводит `8: script end`

Состояние:
- Microtask Queue: [`asyncA continuation`, `promise then cb`]
- Task Queue: [`setTimeout cb`]

**Microtask Checkpoint:**

6. `asyncA continuation`: `console.log('2: asyncA after await')` -- выводит `2: asyncA after await`
7. `promise then cb`: `console.log('7: promise then')` -- выводит `7: promise then`

**Task:**

8. `setTimeout cb`: `console.log('5: setTimeout')` -- выводит `5: setTimeout`

**Итоговый порядок:**
```
4: script start
1: asyncA start
3: asyncB
6: promise constructor
8: script end
2: asyncA after await
7: promise then
5: setTimeout
```

---

### Пример 3: вложенные таймеры, промисы и queueMicrotask

```javascript
console.log('A');

setTimeout(() => {
  console.log('B');
  queueMicrotask(() => {
    console.log('C');
    setTimeout(() => console.log('D'), 0);
  });
  console.log('E');
}, 0);

queueMicrotask(() => {
  console.log('F');
  setTimeout(() => {
    console.log('G');
    Promise.resolve().then(() => console.log('H'));
  }, 0);
  queueMicrotask(() => console.log('I'));
});

Promise.resolve()
  .then(() => {
    console.log('J');
    return Promise.resolve('K');
  })
  .then((val) => console.log(val));

console.log('L');
```

**Пошаговый разбор:**

**Синхронный код (текущая task):**

1. `console.log('A')` → `A`
2. `setTimeout(cb_B, 0)` → task queue: [`cb_B`]
3. `queueMicrotask(cb_F)` → microtask queue: [`cb_F`]
4. `Promise.resolve().then(cb_J)` → microtask queue: [`cb_F`, `cb_J`]
5. `console.log('L')` → `L`

**Microtask Checkpoint:**

6. `cb_F`:
   - `console.log('F')` → `F`
   - `setTimeout(cb_G, 0)` → task queue: [`cb_B`, `cb_G`]
   - `queueMicrotask(cb_I)` → microtask queue: [`cb_J`, `cb_I`]

7. `cb_J`:
   - `console.log('J')` → `J`
   - `return Promise.resolve('K')` -- возвращает thenable. Согласно спецификации, при `return` из `.then` промиса другого промиса, создаётся **дополнительная микротаска** для разворачивания. Результат: `.then((val) => console.log(val))` будет поставлен не сразу, а через дополнительный microtask.

8. `cb_I`:
   - `console.log('I')` → `I`

9. Дополнительная микротаска от `Promise.resolve('K')` unwrapping (внутренняя механика V8):
   - Ставит ещё одну микротаску для resolve внешнего promise

10. Ещё одна внутренняя микротаска:
    - `cb_K`: `console.log('K')` → `K`

Microtask queue пуста.

**Task: cb_B**

11. `console.log('B')` → `B`
12. `queueMicrotask(cb_C)` → microtask queue: [`cb_C`]
13. `console.log('E')` → `E`

**Microtask Checkpoint:**

14. `cb_C`:
    - `console.log('C')` → `C`
    - `setTimeout(cb_D, 0)` → task queue: [`cb_G`, `cb_D`]

**Task: cb_G**

15. `console.log('G')` → `G`
16. `Promise.resolve().then(cb_H)` → microtask queue: [`cb_H`]

**Microtask Checkpoint:**

17. `cb_H`: `console.log('H')` → `H`

**Task: cb_D**

18. `console.log('D')` → `D`

**Итоговый порядок: `A, L, F, J, I, K, B, E, C, G, H, D`**

**Примечание о `return Promise.resolve('K')`:**

Когда `.then` callback возвращает промис (а не простое значение), V8 создаёт дополнительные микротаски для "разворачивания" (unwrapping) этого промиса. Именно поэтому `K` выводится не сразу после `J`, а через 2 дополнительных microtask tick. Это поведение определено спецификацией ECMAScript в алгоритме `PromiseResolveThenableJob`.

---

### Пример 4: Node.js -- process.nextTick vs setImmediate vs setTimeout

```javascript
// Только Node.js
setImmediate(() => {
  console.log('1: setImmediate');
  process.nextTick(() => console.log('2: nextTick inside immediate'));
  Promise.resolve().then(() => console.log('3: promise inside immediate'));
});

setTimeout(() => {
  console.log('4: setTimeout');
  process.nextTick(() => console.log('5: nextTick inside timeout'));
}, 0);

process.nextTick(() => {
  console.log('6: nextTick');
  process.nextTick(() => console.log('7: nested nextTick'));
});

Promise.resolve().then(() => console.log('8: promise'));

console.log('9: sync');
```

**Разбор:**

1. Синхронный код: `9: sync`
2. Между фазами -- микротаски:
   - nextTick queue: `6: nextTick`
     - Вложенный nextTick добавляется: `7: nested nextTick`
   - nextTick queue (вложенный): `7: nested nextTick`
   - Promise microtasks: `8: promise`
3. Timers phase -- `setTimeout` может сработать (зависит от времени):
   - `4: setTimeout` + `5: nextTick inside timeout` (микротаска)
4. Check phase -- `setImmediate`:
   - `1: setImmediate` + `2: nextTick inside immediate` + `3: promise inside immediate`

**Наиболее вероятный порядок:**
```
9: sync
6: nextTick
7: nested nextTick
8: promise
4: setTimeout
5: nextTick inside timeout
1: setImmediate
2: nextTick inside immediate
3: promise inside immediate
```

(Порядок `setTimeout` и `setImmediate` может меняться, как обсуждалось выше.)

---

## 9. Event Loop Starvation и Performance

### Long Tasks

**Long task** -- задача, выполняющаяся дольше **50ms** (определение из Performance API / Long Tasks API). Long tasks блокируют Event Loop, вызывая:

- Задержку обработки пользовательского ввода
- Пропуск frames (jank)
- Задержку rendering

```javascript
// Определение long tasks через PerformanceObserver
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.warn(`Long task detected: ${entry.duration.toFixed(1)}ms`);
    console.warn('Attribution:', entry.attribution);
  }
});

observer.observe({ type: 'longtask', buffered: true });
```

### Starvation через микротаски

Как обсуждалось в секции 5, бесконечные микротаски блокируют rendering. Но даже конечное, но большое количество микротасков может вызвать проблемы:

```javascript
// 1 миллион микротасков -- rendering заблокирован на сотни ms
for (let i = 0; i < 1_000_000; i++) {
  queueMicrotask(() => {
    // даже пустая микротаска имеет overhead
  });
}
```

### Web Workers для CPU-bound задач

Тяжёлые вычисления должны выноситься в **Web Workers**, которые работают в отдельном потоке и имеют свой Event Loop:

```javascript
// main.js
const worker = new Worker('heavy-computation.js');

worker.postMessage({ data: largeArray });

worker.onmessage = (event) => {
  console.log('Result:', event.data);
};

worker.onerror = (error) => {
  console.error('Worker error:', error);
};
```

```javascript
// heavy-computation.js (Worker)
self.onmessage = (event) => {
  const { data } = event.data;

  // Тяжёлое вычисление -- НЕ блокирует main thread
  const result = data.reduce((acc, val) => acc + complexOperation(val), 0);

  self.postMessage(result);
};
```

**Ограничения Web Workers:**
- Нет доступа к DOM
- Нет доступа к `window`, `document`, `parent`
- Общение только через `postMessage` (structured clone или transferable objects)
- Свой Event Loop, отдельный от main thread

### scheduler.postTask() API

`scheduler.postTask()` -- новый API для приоритизации задач. Позволяет планировать задачи с разным приоритетом:

```javascript
// Три уровня приоритета:
// "user-blocking" -- критичные для отзывчивости (ввод, анимация)
// "user-visible"  -- важные, но могут чуть подождать (default)
// "background"    -- не срочные (аналитика, prefetch)

// Высокий приоритет -- обработка ввода
scheduler.postTask(() => {
  processUserInput();
}, { priority: 'user-blocking' });

// Низкий приоритет -- аналитика
scheduler.postTask(() => {
  sendAnalytics();
}, { priority: 'background' });

// С AbortController
const controller = new AbortController();

scheduler.postTask(() => {
  doWork();
}, {
  priority: 'background',
  signal: controller.signal
});

// Отмена задачи
controller.abort();
```

`scheduler.postTask()` создаёт **task** (не микротаску), но с возможностью управления приоритетом. Это решает проблему, когда `setTimeout(fn, 0)` не даёт контроля над порядком выполнения.

### Yielding Strategies

**Yielding** -- это добровольная отдача управления Event Loop для обработки pending tasks (rendering, user input). Стратегии yielding:

#### Стратегия 1: setTimeout(fn, 0) -- классический yield

```javascript
async function processLargeArray(items) {
  const CHUNK_SIZE = 100;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);

    for (const item of chunk) {
      processItem(item);
    }

    // Yield -- отдаём управление Event Loop
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

Минус: 4ms clamping после 5 вложенных вызовов.

#### Стратегия 2: MessageChannel -- yield без clamping

```javascript
function yieldToMain() {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = resolve;
    channel.port2.postMessage(undefined);
  });
}

async function processLargeArray(items) {
  const CHUNK_SIZE = 100;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);

    for (const item of chunk) {
      processItem(item);
    }

    await yieldToMain(); // Без 4ms clamping!
  }
}
```

#### Стратегия 3: scheduler.yield() (новый API)

```javascript
async function processLargeArray(items) {
  for (let i = 0; i < items.length; i++) {
    processItem(items[i]);

    if (i % 100 === 0) {
      // scheduler.yield() -- официальный API для yielding
      // Сохраняет приоритет задачи (в отличие от setTimeout)
      await scheduler.yield();
    }
  }
}
```

`scheduler.yield()` -- наиболее корректный способ yielding, потому что:
- Не подвержен 4ms clamping
- Сохраняет приоритет текущей задачи (продолжение выполнится раньше background tasks)
- Является частью стандартного Scheduling API

#### Стратегия 4: requestAnimationFrame для визуальных обновлений

```javascript
function animateSmooth(element, frames) {
  let i = 0;

  function step() {
    if (i >= frames.length) return;

    element.style.transform = frames[i].transform;
    i++;

    requestAnimationFrame(step); // Синхронизация с refresh rate
  }

  requestAnimationFrame(step);
}
```

### isInputPending API

`navigator.scheduling.isInputPending()` позволяет проверить, есть ли ожидающий пользовательский ввод, не прерывая выполнение:

```javascript
function processChunk(deadline) {
  while (tasks.length > 0) {
    // Проверяем: есть ли pending input?
    if (navigator.scheduling?.isInputPending()) {
      // Есть! Прерываем и возвращаем управление
      setTimeout(processChunk, 0);
      return;
    }

    processTask(tasks.pop());
  }
}
```

---

## 10. MessageChannel и postMessage

### Создание macrotask без setTimeout

`MessageChannel` позволяет создать macrotask без `setTimeout`, обходя **4ms clamping**:

```javascript
// setTimeout -- подвержен clamping после 5 вложенных вызовов
function macrotaskViaTimeout(fn) {
  setTimeout(fn, 0);
}

// MessageChannel -- НЕ подвержен clamping
function macrotaskViaMessageChannel(fn) {
  const channel = new MessageChannel();
  channel.port1.onmessage = fn;
  channel.port2.postMessage(null);
}
```

### Почему MessageChannel обходит clamping

Спецификация определяет 4ms clamping **только для timer task source** (`setTimeout`, `setInterval`). `MessageChannel` использует **message port task source**, который не имеет такого ограничения.

```javascript
// Сравнение скорости
async function benchmarkSetTimeout() {
  const start = performance.now();
  let count = 0;

  await new Promise(resolve => {
    function tick() {
      count++;
      if (count < 100) {
        setTimeout(tick, 0);
      } else {
        resolve();
      }
    }
    setTimeout(tick, 0);
  });

  console.log(`setTimeout x100: ${(performance.now() - start).toFixed(1)}ms`);
  // ~400ms+ из-за clamping (95 вызовов * ~4ms)
}

async function benchmarkMessageChannel() {
  const start = performance.now();
  let count = 0;

  await new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      count++;
      if (count < 100) {
        channel.port2.postMessage(null);
      } else {
        resolve();
      }
    };
    channel.port2.postMessage(null);
  });

  console.log(`MessageChannel x100: ${(performance.now() - start).toFixed(1)}ms`);
  // ~5-15ms -- значительно быстрее
}
```

### postMessage на window

`window.postMessage` также создаёт macrotask:

```javascript
// postMessage на том же window
function macrotaskViaPostMessage(fn) {
  const key = `__macrotask_${Math.random()}`;

  function handler(event) {
    if (event.data === key) {
      event.stopPropagation();
      window.removeEventListener('message', handler);
      fn();
    }
  }

  window.addEventListener('message', handler);
  window.postMessage(key, '*');
}
```

**Минусы `window.postMessage`:**
- Более сложный код
- Потенциальные проблемы безопасности (origin check)
- `MessageChannel` проще и изолированнее

### Практическое применение: custom scheduler

```javascript
class TaskScheduler {
  #queue = [];
  #isRunning = false;
  #channel = new MessageChannel();

  constructor() {
    this.#channel.port1.onmessage = () => this.#runNext();
  }

  schedule(fn, priority = 'normal') {
    this.#queue.push({ fn, priority });
    // Сортируем: high > normal > low
    this.#queue.sort((a, b) => {
      const order = { high: 0, normal: 1, low: 2 };
      return order[a.priority] - order[b.priority];
    });

    if (!this.#isRunning) {
      this.#isRunning = true;
      this.#channel.port2.postMessage(null);
    }
  }

  #runNext() {
    if (this.#queue.length === 0) {
      this.#isRunning = false;
      return;
    }

    const { fn } = this.#queue.shift();

    try {
      fn();
    } catch (e) {
      console.error('Task error:', e);
    }

    // Планируем следующую задачу через MessageChannel
    // Это даёт Event Loop возможность обработать rendering/input
    // между нашими задачами
    if (this.#queue.length > 0) {
      this.#channel.port2.postMessage(null);
    } else {
      this.#isRunning = false;
    }
  }
}

// Использование
const scheduler = new TaskScheduler();

scheduler.schedule(() => console.log('normal 1'), 'normal');
scheduler.schedule(() => console.log('high priority'), 'high');
scheduler.schedule(() => console.log('normal 2'), 'normal');
scheduler.schedule(() => console.log('low priority'), 'low');

// Вывод:
// high priority
// normal 1
// normal 2
// low priority
```

### MessageChannel в React Scheduler

React Scheduler (используемый в React 18+ Concurrent Mode) использует именно `MessageChannel` для планирования работы. Это позволяет React:

1. Разбивать rendering на chunks
2. Прерывать rendering для обработки user input
3. Не подвергаться 4ms clamping от `setTimeout`

Упрощённая версия того, что делает React Scheduler:

```javascript
// Упрощённая модель React Scheduler
const channel = new MessageChannel();
let scheduledWork = null;
let deadline = 0;
const FRAME_YIELD_MS = 5; // React yield'ит каждые ~5ms

channel.port1.onmessage = () => {
  if (scheduledWork === null) return;

  const currentTime = performance.now();
  deadline = currentTime + FRAME_YIELD_MS;

  const hasMoreWork = scheduledWork(currentTime);

  if (hasMoreWork) {
    // Ещё есть работа -- планируем следующий chunk
    channel.port2.postMessage(null);
  } else {
    scheduledWork = null;
  }
};

function scheduleWork(callback) {
  scheduledWork = callback;
  channel.port2.postMessage(null);
}

function shouldYield() {
  return performance.now() >= deadline;
}

// Использование в рендерере (упрощённо):
scheduleWork((startTime) => {
  while (workQueue.length > 0) {
    if (shouldYield()) {
      return true; // Ещё есть работа, yield
    }
    performUnitOfWork(workQueue.shift());
  }
  return false; // Вся работа завершена
});
```

---

## Шпаргалка: порядок приоритетов

```
┌─────────────────────────────────────────────────┐
│  1. Синхронный код (Call Stack)                  │  ← Наивысший приоритет
├─────────────────────────────────────────────────┤
│  2. process.nextTick  (только Node.js)          │
├─────────────────────────────────────────────────┤
│  3. Microtasks (Promise.then, queueMicrotask,   │
│     MutationObserver)                           │
├─────────────────────────────────────────────────┤
│  4. requestAnimationFrame (на этапе rendering)  │
├─────────────────────────────────────────────────┤
│  5. Tasks (setTimeout, setInterval,             │
│     MessageChannel, I/O, events)                │
├─────────────────────────────────────────────────┤
│  6. requestIdleCallback (в idle period)         │  ← Наименьший приоритет
└─────────────────────────────────────────────────┘
```

**Важная оговорка:** эта таблица показывает _типичный_ порядок, но `requestAnimationFrame` выполняется только когда браузер решает обновить rendering, а `setTimeout` выполняется как обычная task. Их взаимный порядок зависит от конкретной итерации Event Loop.

---

## Ссылки на спецификации

- [HTML Living Standard: Event Loop Processing Model](https://html.spec.whatwg.org/multipage/webappapis.html#event-loop-processing-model)
- [HTML Living Standard: Timers](https://html.spec.whatwg.org/multipage/timers-and-user-prompts.html#timers)
- [ECMAScript: Jobs and Host Operations to Enqueue Jobs](https://tc39.es/ecma262/#sec-jobs)
- [Node.js: The Event Loop](https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick)
- [Scheduling API: scheduler.postTask()](https://wicg.github.io/scheduling-apis/)
- [Jake Archibald: Tasks, microtasks, queues and schedules](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/)
