# Promises — глубокое погружение

## Оглавление

1. [States и Fates по спецификации](#1-states-и-fates-по-спецификации)
2. [Promise Resolution Procedure](#2-promise-resolution-procedure)
3. [Микротаски](#3-микротаски)
4. [Thenables vs Promises](#4-thenables-vs-promises)
5. [Promise.all / allSettled / race / any](#5-promiseall--allsettled--race--any)
6. [Unhandled rejections](#6-unhandled-rejections)
7. [Memory](#7-memory)
8. [Антипаттерны](#8-антипаттерны)
9. [V8 internals](#9-v8-internals)
10. [Продвинутые паттерны](#10-продвинутые-паттерны)

---

## 1. States и Fates по спецификации

Спецификация ECMAScript разделяет два ортогональных понятия: **state** (состояние) и **fate** (судьба). Путаница между ними — источник большинства ошибок понимания `Promise`.

### States (состояния)

Любой `Promise` находится ровно в одном из трёх состояний:

| State | Описание |
|---|---|
| `pending` | Начальное состояние. Результат ещё не определён |
| `fulfilled` | Операция завершена успешно, `Promise` содержит значение (`value`) |
| `rejected` | Операция завершена с ошибкой, `Promise` содержит причину (`reason`) |

Переход `pending → fulfilled` или `pending → rejected` необратим. После перехода `Promise` называется **settled**.

### Fates (судьбы)

| Fate | Описание |
|---|---|
| `resolved` | Судьба `Promise` привязана к другому значению (или `Promise`). Дальнейшие вызовы `resolve`/`reject` игнорируются |
| `unresolved` | `Promise` ещё не привязан ни к чему |

Ключевой момент: **resolved !== fulfilled**. `Promise` может быть одновременно `resolved` и `pending`:

```js
const inner = new Promise(() => {}); // навсегда pending

const outer = new Promise((resolve) => {
  resolve(inner); // outer теперь resolved, но всё ещё pending!
});

// outer.[[PromiseState]] === 'pending'
// outer resolved (привязан к inner), но inner никогда не settled
// → outer навсегда останется pending
```

### Диаграмма состояний

```
                    resolve(nonThenable)
    ┌──────────┐  ─────────────────────►  ┌───────────┐
    │          │                           │ fulfilled │
    │ pending  │                           └───────────┘
    │          │  reject(reason)
    │(unresolved)─────────────────────►  ┌───────────┐
    │          │                           │ rejected  │
    └────┬─────┘                           └───────────┘
         │
         │ resolve(thenable)
         ▼
    ┌──────────┐   thenable settles    ┌───────────┐
    │ pending  │  ─────────────────►   │ fulfilled │
    │(resolved)│                        │    or     │
    │          │                        │ rejected  │
    └──────────┘                        └───────────┘
```

Когда вызывается `resolve(thenable)`, `Promise` становится **resolved** (судьба определена), но остаётся **pending** (состояние не изменено), пока `thenable` не settled.

### Терминологическая ловушка

Многие статьи и даже документация MDN используют "resolved" как синоним "fulfilled". Это неточно. В спецификации:
- `Promise.resolve(42)` создаёт **fulfilled** промис (потому что 42 — не thenable)
- `Promise.resolve(anotherPendingPromise)` создаёт **resolved** но **pending** промис

```js
const p = Promise.resolve(Promise.resolve(42));
// p !== Promise.resolve(42) — создаётся новый Promise
// Но p в итоге fulfilled с value 42 (после unwrapping)
```

---

## 2. Promise Resolution Procedure

Алгоритм `[[Resolve]](promise, x)` — сердце работы промисов. Определён в спецификации ECMAScript (25.6.1.3.2 Promise Resolve Functions).

### Пошаговый алгоритм

```
[[Resolve]](promise, x):

1. Если x === promise → throw TypeError
   (предотвращение бесконечного цикла)

2. Если x — объект или функция:
   a. Пытаемся получить then = x.then
   b. Если доступ к x.then бросил исключение e:
      → reject(promise, e)
   c. Если then — функция (x является thenable):
      → Поставить в очередь PromiseResolveThenableJob(promise, x, then)
      → (это стоит один дополнительный микротик!)
   d. Если then — не функция:
      → fulfill(promise, x)

3. Если x — примитив:
   → fulfill(promise, x)
```

### Шаг 1: Защита от цикла

```js
const p = new Promise((resolve) => {
  resolve(p); // TypeError: Chaining cycle detected for promise
});
```

### Шаг 2c: Thenable unwrapping и потеря микротика

Каждый раз, когда `resolve()` получает thenable, создаётся `PromiseResolveThenableJob`. Это **дополнительный микротик**, который часто игнорируют:

```js
// Прямое resolve значением — 1 микротик до .then
const p1 = Promise.resolve(42);
p1.then(v => console.log('p1:', v));

// Resolve thenable — 2 микротика до .then (один на unwrapping)
const p2 = Promise.resolve({ then(cb) { cb(42); } });
p2.then(v => console.log('p2:', v));

// Resolve Promise — тоже 2 микротика (Promise — это thenable)
const p3 = Promise.resolve(Promise.resolve(42));
p3.then(v => console.log('p3:', v));

// Вывод:
// p1: 42
// p2: 42
// p3: 42
// (p1 выведется раньше p2 и p3 — на один микротик)
```

### Рекурсивное разрешение

Если thenable в своём `then()` возвращает ещё один thenable, процесс повторяется рекурсивно:

```js
const deepThenable = {
  then(resolve) {
    resolve({
      then(resolve2) {
        resolve2({
          then(resolve3) {
            resolve3(42);
          }
        });
      }
    });
  }
};

Promise.resolve(deepThenable).then(v => console.log(v));
// 42 (через 3 дополнительных микротика на каждый уровень unwrapping)
```

### Геттер `then` — точка перехвата

Спецификация требует **однократного** чтения свойства `then`. Это значит, что геттер может иметь побочные эффекты:

```js
let callCount = 0;
const sneakyThenable = Object.defineProperty({}, 'then', {
  get() {
    callCount++;
    if (callCount === 1) return function(resolve) { resolve(42); };
    return undefined; // на второй доступ — уже не thenable
  }
});

// Спецификация читает then ровно один раз и кеширует
Promise.resolve(sneakyThenable).then(console.log); // 42
```

### Обработка исключений при доступе к `then`

```js
const poisonedThenable = Object.defineProperty({}, 'then', {
  get() { throw new Error('trap'); }
});

Promise.resolve(poisonedThenable).catch(e => console.log(e.message));
// "trap" — Promise отклоняется
```

---

## 3. Микротаски

### Механизм: `HostEnqueuePromiseJob`

Каждый раз, когда `Promise` settled и у него есть зарегистрированные обработчики (или когда `.then()` вызывается на уже settled промисе), движок ставит в очередь **микротаску** через `HostEnqueuePromiseJob`.

Существует два типа Job в контексте промисов:
- **`PromiseReactionJob`** — выполнение обработчика `.then(onFulfilled, onRejected)`
- **`PromiseResolveThenableJob`** — unwrapping thenable (вызов `thenable.then()`)

### Порядок выполнения

```js
console.log('1: sync start');

setTimeout(() => console.log('7: macrotask'), 0);

Promise.resolve()
  .then(() => console.log('3: microtask 1'))
  .then(() => console.log('5: microtask 3'));

Promise.resolve()
  .then(() => console.log('4: microtask 2'))
  .then(() => console.log('6: microtask 4'));

console.log('2: sync end');

// Вывод:
// 1: sync start
// 2: sync end
// 3: microtask 1
// 4: microtask 2
// 5: microtask 3
// 6: microtask 4
// 7: macrotask
```

Порядок: синхронный код → **все** микротаски (рекурсивно, пока очередь не пуста) → одна макротаска → снова микротаски...

### Вложенные микротаски

```js
Promise.resolve().then(() => {
  console.log('A');
  Promise.resolve().then(() => {
    console.log('B');
    Promise.resolve().then(() => console.log('C'));
  });
});

Promise.resolve().then(() => console.log('D'));

// A → D → B → C
// Вложенная микротаска B ставится в очередь ПОСЛЕ D,
// потому что в момент выполнения A, D уже в очереди
```

### Сложный пример с подсчётом микротиков

```js
Promise.resolve()
  .then(() => {
    console.log('then1');
    return Promise.resolve('inner'); // thenable! +1 микротик на unwrap
  })
  .then((v) => console.log('then2:', v));

Promise.resolve()
  .then(() => console.log('then3'))
  .then(() => console.log('then4'))
  .then(() => console.log('then5'));

// Вывод:
// then1
// then3
// then4    ← PromiseResolveThenableJob для 'inner' выполняется здесь
// then2: inner
// then5
```

Обратите внимание: `then2` выводится **после** `then4`, а не после `then3`. Это из-за дополнительного микротика на unwrapping `Promise.resolve('inner')`.

### `queueMicrotask` vs `Promise.resolve().then()`

```js
queueMicrotask(() => console.log('queueMicrotask'));
Promise.resolve().then(() => console.log('promise.then'));

// Обе — микротаски, порядок определяется очерёдностью добавления:
// queueMicrotask
// promise.then
```

Разница: `queueMicrotask` не создаёт `Promise`, не аллоцирует `PromiseReaction` — чуть эффективнее для fire-and-forget задач.

---

## 4. Thenables vs Promises

### Определение

**Thenable** — любой объект (или функция) со свойством `then`, которое является функцией. **Promise** — thenable, созданный конструктором `Promise` (или `Promise` subclass), реализующий полную спецификацию.

```js
// Thenable, но не Promise:
const thenable = {
  then(onFulfilled, onRejected) {
    onFulfilled(42);
  }
};

console.log(thenable instanceof Promise); // false
Promise.resolve(thenable).then(console.log); // 42
```

### Auto-unwrapping

Промисы **автоматически разворачивают** thenables:

```js
// .then() возвращает thenable — он будет развёрнут
Promise.resolve(1)
  .then(() => ({ then(resolve) { resolve(99); } }))
  .then(v => console.log(v)); // 99 (не объект, а число)
```

### Interop с библиотеками

До стандартизации `Promise` (ES2015) существовали библиотеки: `Q`, `Bluebird`, `RSVP`, `when.js`. Все они реализовывали thenable-интерфейс, что позволяло им взаимодействовать с нативными промисами:

```js
// Гипотетический промис из Bluebird
const bluebirdPromise = {
  then(onFulfilled, onRejected) {
    setTimeout(() => onFulfilled('from bluebird'), 10);
  }
};

// Нативный Promise прекрасно его принимает:
async function main() {
  const result = await bluebirdPromise;
  console.log(result); // "from bluebird"
}
```

### Двойной `await` для nested thenables

Thenable может вернуть thenable (а не разрешить его). В этом случае внешний `await` развернёт первый уровень, но не второй:

```js
const nestedThenable = {
  then(resolve) {
    // Обратите внимание: resolve вызван с другим thenable
    resolve({
      then(innerResolve) {
        innerResolve(42);
      }
    });
  }
};

// Один await — развернёт ОБА уровня (resolve автоматически unwraps)
const result = await nestedThenable;
console.log(result); // 42

// Но если thenable ВОЗВРАЩАЕТ, а не resolve-ит:
const tricky = {
  then(resolve) {
    resolve(42);
    return { then(r) { r(99); } }; // return игнорируется!
  }
};

console.log(await tricky); // 42 (не 99)
```

### Опасности thenable-протокола

```js
// Случайный thenable — объект, у которого случайно есть метод then:
class Database {
  then(callback) { // плохое имя метода!
    return this.query('SELECT 1').then(callback);
  }
}

const db = new Database();
// await db — будет пытаться развернуть db как thenable!
// Это приведёт к неожиданному поведению
```

Правило: **никогда** не называйте метод `then` в объектах, которые не являются промисами.

---

## 5. Promise.all / allSettled / race / any

### `Promise.all` — fail-fast

```js
const results = await Promise.all([
  fetch('/api/users'),
  fetch('/api/posts'),
  fetch('/api/comments'),
]);
```

Семантика:
- Если **все** промисы fulfilled → возвращает массив значений **в порядке входных промисов** (не в порядке завершения!)
- Если **хотя бы один** rejected → немедленно rejected с reason первого отклонённого

**Критически важно**: остальные промисы **НЕ отменяются**. Они продолжают выполняться, просто их результаты игнорируются:

```js
let sideEffect = 0;

const slow = new Promise(resolve => {
  setTimeout(() => {
    sideEffect = 1; // этот код ВЫПОЛНИТСЯ
    resolve('slow done');
  }, 2000);
});

const failing = Promise.reject(new Error('fail'));

try {
  await Promise.all([slow, failing]);
} catch (e) {
  console.log(e.message); // "fail"
}

// Через 2 секунды:
// sideEffect === 1 — промис slow продолжил работать!
```

Для отмены нужен `AbortController` (см. раздел 10).

### `Promise.allSettled` — graceful degradation

```js
const results = await Promise.allSettled([
  fetch('/api/critical'),
  fetch('/api/optional'),
  fetch('/api/nice-to-have'),
]);

// results — массив объектов:
// { status: 'fulfilled', value: Response }
// { status: 'rejected', reason: Error }

const succeeded = results.filter(r => r.status === 'fulfilled');
const failed = results.filter(r => r.status === 'rejected');

console.log(`${succeeded.length} succeeded, ${failed.length} failed`);
```

Паттерн: когда не все данные критичны и можно показать частичный результат.

### `Promise.race` — timeout pattern

```js
function withTimeout(promise, ms) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

try {
  const data = await withTimeout(fetch('/api/slow'), 5000);
} catch (e) {
  console.log(e.message); // "Timeout after 5000ms"
}
```

Нюансы `Promise.race`:
- Если массив пуст — **навсегда pending** (не fulfilled, не rejected)
- Если в массиве не-thenable значение — оно оборачивается через `Promise.resolve()` и "побеждает" мгновенно

```js
const result = await Promise.race([42, fetch('/api/data')]);
console.log(result); // 42 — синхронное значение всегда побеждает
```

### `Promise.any` и `AggregateError`

```js
// Запрос к нескольким зеркалам, берём первый успешный:
try {
  const response = await Promise.any([
    fetch('https://mirror1.example.com/data'),
    fetch('https://mirror2.example.com/data'),
    fetch('https://mirror3.example.com/data'),
  ]);
  const data = await response.json();
} catch (e) {
  // Сюда попадаем ТОЛЬКО если ВСЕ промисы rejected
  console.log(e instanceof AggregateError); // true
  console.log(e.errors); // массив всех причин отклонения
  e.errors.forEach((err, i) => {
    console.log(`Mirror ${i + 1}: ${err.message}`);
  });
}
```

Сравнение с `Promise.race`:
- `Promise.race` — первый settled (fulfilled **или** rejected)
- `Promise.any` — первый **fulfilled** (rejected игнорируются, пока есть шанс)

```js
const p1 = Promise.reject('error 1');
const p2 = new Promise(resolve => setTimeout(resolve, 100, 'success'));

await Promise.race([p1, p2]);  // Rejected! (p1 быстрее)
await Promise.any([p1, p2]);   // "success" (p1 rejected — ждём p2)
```

### Сводная таблица

| Метод | Короткое замыкание | Результат |
|---|---|---|
| `Promise.all` | Первый `rejected` | `value[]` / первый `reason` |
| `Promise.allSettled` | Нет | `{status, value/reason}[]` |
| `Promise.race` | Первый `settled` | Значение или причина первого |
| `Promise.any` | Первый `fulfilled` | Первый `value` / `AggregateError` |

---

## 6. Unhandled rejections

### Механизм: `HostPromiseRejectionTracker`

Спецификация определяет абстрактную операцию `HostPromiseRejectionTracker(promise, operation)`, где `operation` — это `"reject"` или `"handle"`. Хост-среда (браузер, Node.js) решает, что делать.

### Браузер

```js
// Глобальный обработчик
window.addEventListener('unhandledrejection', (event) => {
  console.log('Unhandled rejection:', event.reason);
  console.log('Promise:', event.promise);
  event.preventDefault(); // предотвращает вывод в консоль
});

// Когда rejection "позднее" обработан:
window.addEventListener('rejectionhandled', (event) => {
  console.log('Rejection was handled late:', event.reason);
});
```

### Node.js

```js
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  // В production — логирование и graceful shutdown
});

process.on('rejectionHandled', (promise) => {
  console.log('Late handling detected');
});
```

С Node.js 15+ необработанные rejection по умолчанию **крашат процесс** (`--unhandled-rejections=throw`). Это поведение можно изменить:

```bash
node --unhandled-rejections=warn app.js  # только предупреждение
node --unhandled-rejections=none app.js  # игнорировать (не рекомендуется)
```

### Когда rejection считается "unhandled"

```js
// Вариант 1: никто не вызвал .catch()
const p = Promise.reject(new Error('oops'));
// → через один тик микротаски: unhandledrejection

// Вариант 2: .catch() добавлен позднее
const p2 = Promise.reject(new Error('oops'));
setTimeout(() => {
  p2.catch(() => {}); // слишком поздно — событие уже сработало
  // → rejectionhandled (поздняя обработка)
}, 100);

// Вариант 3: обработчик добавлен СИНХРОННО — всё OK
const p3 = Promise.reject(new Error('oops'));
p3.catch(() => {}); // OK, rejection обработан
```

### Типичные ловушки

```js
// 1. Забытый await в async функции:
async function process() {
  riskyOperation(); // не await! Если вернёт rejected Promise — unhandled
}

// 2. .then() без .catch() в конце цепочки:
fetch('/api/data')
  .then(r => r.json())
  .then(data => render(data));
  // Если fetch failed — unhandled rejection

// 3. Promise в массиве без обработки:
const promises = urls.map(url => fetch(url)); // rejected — unhandled!
await Promise.all(promises); // .catch тут не поможет уже запущенным
```

### Debugging: async stack traces

```js
// В DevTools включите: Settings → Preferences → ✓ Async stack traces
// Тогда в rejection увидите полный путь через await/then цепочки
```

---

## 7. Memory

### Проблема: длинные цепочки удерживают GC

Каждое звено цепочки `.then()` создаёт новый `Promise` со ссылками на предыдущий:

```js
// Каждый .then() создаёт PromiseReaction → ссылка на handler closure
// → closure захватывает scope → потенциально большие объекты

let chain = Promise.resolve();
for (let i = 0; i < 1_000_000; i++) {
  chain = chain.then(() => {
    // каждая closure удерживает ссылку на переменную i (через scope)
    return heavyComputation(i);
  });
}
// Все 1M промисов и closures живут одновременно в памяти,
// пока цепочка не завершится
```

### `.catch()` в середине НЕ освобождает предыдущие звенья

```js
fetchData()
  .then(process)     // ← звено 1
  .then(transform)   // ← звено 2
  .catch(logError)   // ← .catch НЕ разрывает ссылки на звенья 1 и 2
  .then(finalize);   // ← звено 4 всё ещё удерживает всю цепочку
```

GC может собрать промис только когда на него нет ссылок. Цепочка `.then()` создаёт связный список, который живёт, пока жива хотя бы одна ссылка на любое звено.

### Рекомендации

```js
// Плохо: бесконечно растущая цепочка
let chain = Promise.resolve();
setInterval(() => {
  chain = chain.then(() => doWork()); // chain растёт бесконечно
}, 100);

// Хорошо: каждая итерация — независимый промис
setInterval(async () => {
  await doWork(); // новый промис каждый раз, старый GC-ится
}, 100);
```

### Утечка через замыкания

```js
function processLargeData(buffer) { // buffer — 100MB ArrayBuffer
  return fetch('/api/upload')
    .then(response => {
      // closure захватывает buffer!
      // даже если buffer тут не используется, V8 может не оптимизировать
      return response.json();
    })
    .then(result => {
      // buffer всё ещё в памяти
      return result;
    });
}

// Исправление: обнулить ссылку явно
function processLargeData(buffer) {
  const uploadPromise = uploadBuffer(buffer);
  buffer = null; // явно освобождаем
  return uploadPromise.then(response => response.json());
}
```

---

## 8. Антипаттерны

### 1. Explicit Construction Antipattern

```js
// ПЛОХО: обёртка промиса в промис
function getData() {
  return new Promise((resolve, reject) => {
    fetch('/api/data')
      .then(response => resolve(response.json()))
      .catch(error => reject(error));
  });
}

// ХОРОШО: просто вернуть промис
function getData() {
  return fetch('/api/data').then(response => response.json());
}
```

### 2. `.then(success, fail)` vs `.then(success).catch(fail)`

```js
// Вариант A: .then(success, fail)
promise.then(
  value => { throw new Error('oops'); },
  error => console.log('caught:', error) // НЕ поймает ошибку из success!
);

// Вариант B: .then(success).catch(fail)
promise.then(
  value => { throw new Error('oops'); }
).catch(
  error => console.log('caught:', error) // ПОЙМАЕТ ошибку из success
);
```

В варианте A обработчик `fail` ловит **только** rejection самого `promise`, но не ошибки в `success`. В варианте B `.catch()` — это `.then(undefined, fail)` на **следующем** промисе, поэтому ловит всё.

Используйте `.then(success, fail)` только когда нужно **различать** rejection промиса и ошибку обработчика.

### 3. Забытый `return` в `.then()`

```js
// ПЛОХО: забыли return
fetch('/api/data')
  .then(response => {
    response.json(); // нет return! → следующий .then получит undefined
  })
  .then(data => {
    console.log(data); // undefined!
  });

// ХОРОШО:
fetch('/api/data')
  .then(response => {
    return response.json();
  })
  .then(data => {
    console.log(data); // actual data
  });

// ЕЩЁ ЛУЧШЕ: стрелочная функция без фигурных скобок
fetch('/api/data')
  .then(response => response.json())
  .then(data => console.log(data));
```

### 4. `Promise.resolve()` vs `new Promise(r => r())`

```js
// Вариант 1: Promise.resolve(value)
const p1 = Promise.resolve(42);
// Если value — нативный Promise и его конструктор === Promise,
// то возвращается тот же самый объект!

const existingPromise = Promise.resolve(42);
console.log(Promise.resolve(existingPromise) === existingPromise); // true!

// Вариант 2: new Promise(resolve => resolve(42))
// ВСЕГДА создаёт новый Promise, даже для примитивов

// Разница в микротиках:
const p2 = new Promise(resolve => resolve(Promise.resolve(42)));
// ^ Создаёт новый промис + PromiseResolveThenableJob (лишний микротик)

const p3 = Promise.resolve(42);
// ^ Возвращает fulfilled промис напрямую (без дополнительных микротиков)
```

### 5. `async` функция без `await`

```js
// ПЛОХО: async без await — лишняя обёртка
async function getData() {
  return fetch('/api/data').then(r => r.json());
}
// Создаёт дополнительный Promise поверх уже существующего

// ХОРОШО: просто вернуть промис
function getData() {
  return fetch('/api/data').then(r => r.json());
}

// ИСКЛЮЧЕНИЕ: когда нужен implicit try/catch
async function safeGetData() {
  return fetch('/api/data').then(r => r.json());
  // Если fetch() бросит СИНХРОННОЕ исключение,
  // async обернёт его в rejected Promise (безопаснее!)
}
```

### 6. `.catch()` глотает ошибки

```js
// ПЛОХО: ошибка проглочена
fetchData()
  .then(process)
  .catch(err => console.log(err)) // ← возвращает fulfilled промис!
  .then(result => {
    // result === undefined (после catch без return)
    // код продолжает работать как ни в чём не бывало
  });

// ХОРОШО: перебросить ошибку после логирования
fetchData()
  .then(process)
  .catch(err => {
    console.log(err);
    throw err; // ← пробрасываем дальше
  });
```

---

## 9. V8 internals

### PromiseReaction records

В V8 каждый `Promise` хранит два связных списка `PromiseReaction`:
- `fulfill_reactions` — обработчики для `fulfilled`
- `reject_reactions` — обработчики для `rejected`

Каждый `PromiseReaction` содержит:
- `handler` — callback из `.then(onFulfilled, onRejected)`
- `promise` — промис, который вернёт `.then()`
- `type` — `kFulfill` или `kReject`

Когда промис settled, V8 обходит соответствующий список и ставит в очередь `PromiseReactionJob` для каждого reaction.

### PromiseResolveThenableJob vs PromiseReactionJob

```
PromiseReactionJob:
  - Выполняет handler (.then callback)
  - Результат передаётся в resolve/reject следующего промиса в цепочке

PromiseResolveThenableJob:
  - Вызывает thenable.then(resolve, reject)
  - Нужен для unwrapping thenables
  - Стоит один дополнительный микротик
```

```js
// PromiseReactionJob:
Promise.resolve(1).then(x => x + 1); // then callback — это ReactionJob

// PromiseResolveThenableJob:
new Promise(resolve => resolve(Promise.resolve(1)));
// resolve(anotherPromise) → создаётся ResolveThenableJob
```

### Zero-cost async stack traces

Начиная с V8 7.2 (Node.js 12+, Chrome 72+), V8 умеет восстанавливать async stack traces без накладных расходов:

```js
async function a() {
  await b();
}

async function b() {
  await c();
}

async function c() {
  throw new Error('deep error');
}

a().catch(console.error);
// Error: deep error
//     at c (...)
//     at async b (...)
//     at async a (...)
// ↑ полный async stack trace без overhead
```

Как это работает:
1. V8 сохраняет ссылку на "внешний" промис (implicit promise async-функции)
2. При создании стектрейса V8 "гуляет" по цепочке промисов, восстанавливая фреймы
3. Это **не** требует сохранения стека при каждом await (zero-cost)

### Оптимизация: fast-path для resolved промисов

```js
async function optimized() {
  const x = await alreadyResolved; // V8 7.2+ не создаёт лишний микротик
  return x;
}
```

До V8 7.2: `await` **всегда** создавал `PromiseResolveThenableJob` + `PromiseReactionJob` (2 микротика минимум).

После V8 7.2: если значение — уже fulfilled нативный `Promise`, V8 пропускает `PromiseResolveThenableJob` (1 микротик). Это описано в спецификации как оптимизация в `Await` (через `PromiseResolve`).

### Internal slots

В V8 `Promise` хранит:
- `[[PromiseState]]` — `pending` / `fulfilled` / `rejected`
- `[[PromiseResult]]` — значение или причина отклонения
- `[[PromiseFulfillReactions]]` — список реакций на fulfillment
- `[[PromiseRejectReactions]]` — список реакций на rejection
- `[[PromiseIsHandled]]` — флаг для `HostPromiseRejectionTracker`

```js
// V8 debug: %PromiseStatus и %PromiseResult (только с --allow-natives-syntax)
// node --allow-natives-syntax -e "
//   const p = Promise.resolve(42);
//   console.log(%PromiseStatus(p)); // 'resolved'
//   console.log(%PromiseResult(p)); // 42
// "
```

---

## 10. Продвинутые паттерны

### `Promise.withResolvers()`

ES2024 добавил `Promise.withResolvers()` — создаёт промис и отдаёт `resolve`/`reject` наружу:

```js
// До ES2024 — deferred pattern вручную:
let resolve, reject;
const promise = new Promise((res, rej) => {
  resolve = res;
  reject = rej;
});

// ES2024:
const { promise, resolve, reject } = Promise.withResolvers();

// Применение: EventEmitter → Promise
function once(emitter, event) {
  const { promise, resolve, reject } = Promise.withResolvers();
  emitter.once(event, resolve);
  emitter.once('error', reject);
  return promise;
}

const data = await once(stream, 'data');
```

### Deferred Pattern (полная реализация)

```js
class Deferred {
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
}

// Использование: координация между разными частями системы
const ready = new Deferred();

// Где-то в коде инициализации:
async function initDatabase() {
  const db = await connectToDb();
  ready.resolve(db);
}

// Где-то в другом модуле:
async function handleRequest(req) {
  const db = await ready.promise; // ждёт, пока БД инициализируется
  return db.query(req.sql);
}
```

### Cancellation через `AbortController`

```js
async function fetchWithCancel(url, signal) {
  const response = await fetch(url, { signal });
  return response.json();
}

const controller = new AbortController();

// Отмена по таймауту:
setTimeout(() => controller.abort(), 5000);

// Или по событию:
cancelButton.addEventListener('click', () => controller.abort());

try {
  const data = await fetchWithCancel('/api/heavy', controller.signal);
} catch (e) {
  if (e.name === 'AbortError') {
    console.log('Request cancelled');
  } else {
    throw e; // пробрасываем другие ошибки
  }
}
```

### `AbortSignal.timeout()` (встроенный timeout)

```js
// Без ручного AbortController:
try {
  const response = await fetch('/api/data', {
    signal: AbortSignal.timeout(5000), // автоматический abort через 5s
  });
} catch (e) {
  if (e.name === 'TimeoutError') {
    console.log('Request timed out');
  }
}
```

### Retry с exponential backoff

```js
async function retry(fn, { maxAttempts = 3, baseDelay = 1000, signal } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn({ signal });
    } catch (error) {
      if (error.name === 'AbortError') throw error; // не ретраим отмену

      if (attempt === maxAttempts) throw error;

      const delay = baseDelay * Math.pow(2, attempt - 1);
      const jitter = delay * (0.5 + Math.random() * 0.5);
      console.log(`Attempt ${attempt} failed. Retrying in ${Math.round(jitter)}ms...`);

      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, jitter);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      });
    }
  }
}

// Использование:
const controller = new AbortController();
const data = await retry(
  ({ signal }) => fetch('/api/flaky', { signal }).then(r => r.json()),
  { maxAttempts: 5, baseDelay: 500, signal: controller.signal }
);
```

### Promise Pool (ограничение конкурентности)

```js
async function promisePool(tasks, concurrency) {
  const results = [];
  const executing = new Set();

  for (const [index, task] of tasks.entries()) {
    const p = Promise.resolve().then(() => task()).then(result => {
      results[index] = result;
    });

    executing.add(p);
    p.finally(() => executing.delete(p));

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

// Использование: 1000 URL, но максимум 10 одновременных запросов
const urls = Array.from({ length: 1000 }, (_, i) => `/api/item/${i}`);
const tasks = urls.map(url => () => fetch(url).then(r => r.json()));

const results = await promisePool(tasks, 10);
```

### Async Queue (FIFO с контролем конкурентности)

```js
class AsyncQueue {
  #concurrency;
  #running = 0;
  #queue = [];

  constructor(concurrency = 1) {
    this.#concurrency = concurrency;
  }

  async push(task) {
    if (this.#running >= this.#concurrency) {
      await new Promise(resolve => this.#queue.push(resolve));
    }
    this.#running++;
    try {
      return await task();
    } finally {
      this.#running--;
      this.#queue.shift()?.();
    }
  }
}

// Использование:
const queue = new AsyncQueue(3); // максимум 3 одновременно

const results = await Promise.all(
  urls.map(url => queue.push(() => fetch(url)))
);
```

### Promise как Mutex

```js
class Mutex {
  #lock = Promise.resolve();

  async acquire() {
    let release;
    const newLock = new Promise(resolve => { release = resolve; });
    const oldLock = this.#lock;
    this.#lock = newLock;
    await oldLock;
    return release;
  }

  async runExclusive(fn) {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

// Использование: защита shared resource
const mutex = new Mutex();

async function safeIncrement(counter) {
  return mutex.runExclusive(async () => {
    const value = await counter.read();
    await counter.write(value + 1);
  });
}

// Даже при параллельных вызовах — операции сериализуются:
await Promise.all([
  safeIncrement(counter),
  safeIncrement(counter),
  safeIncrement(counter),
]);
```

### Composable timeout + retry + cancellation

```js
async function resilientFetch(url, options = {}) {
  const {
    timeout = 10000,
    retries = 3,
    backoff = 1000,
    signal,
  } = options;

  return retry(
    async ({ signal: innerSignal }) => {
      const combinedSignal = AbortSignal.any?.([
        innerSignal,
        AbortSignal.timeout(timeout),
      ].filter(Boolean)) ?? AbortSignal.timeout(timeout);

      const response = await fetch(url, { signal: combinedSignal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    },
    { maxAttempts: retries, baseDelay: backoff, signal }
  );
}

// Использование:
const data = await resilientFetch('/api/data', {
  timeout: 5000,
  retries: 3,
  backoff: 500,
});
```
