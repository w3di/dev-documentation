# async/await — глубокое погружение

## Оглавление

1. [Десугаринг](#1-десугаринг)
2. [Спецификация Await](#2-спецификация-await)
3. [Top-level await](#3-top-level-await)
4. [Error handling](#4-error-handling)
5. [for await...of](#5-for-awaitof)
6. [Антипаттерны](#6-антипаттерны)
7. [Concurrency patterns](#7-concurrency-patterns)
8. [Async generators](#8-async-generators)
9. [AbortController](#9-abortcontroller)
10. [Performance](#10-performance)

---

## 1. Десугаринг

`async function` — это **синтаксический сахар** поверх `Promise` и генераторов. Понимание того, во что компилятор трансформирует `async/await`, критически важно для предсказания порядка выполнения.

### Что создаёт `async function`

```js
async function fetchUser(id) {
  const response = await fetch(`/api/users/${id}`);
  const user = await response.json();
  return user;
}
```

Компилятор трансформирует это приблизительно в:

```js
function fetchUser(id) {
  // 1. Создаётся implicit Promise (промис-обёртка)
  return new Promise((resolve, reject) => {

    // 2. Тело разбивается на continuations по точкам await
    // Continuation 0: код ДО первого await
    let response;
    let user;

    try {
      const awaited0 = fetch(`/api/users/${id}`);

      // 3. Каждый await → PromiseResolve(awaited) → .then(continuation)
      Promise.resolve(awaited0).then(
        (value0) => {
          // Continuation 1: между первым и вторым await
          response = value0;

          try {
            const awaited1 = response.json();

            Promise.resolve(awaited1).then(
              (value1) => {
                // Continuation 2: после последнего await
                user = value1;
                resolve(user); // return → resolve implicit promise
              },
              (err) => reject(err)
            );
          } catch (syncErr) {
            reject(syncErr);
          }
        },
        (err) => reject(err)
      );
    } catch (syncErr) {
      reject(syncErr);
    }
  });
}
```

### Ключевые наблюдения

1. **Implicit Promise**: каждая `async function` создаёт один `Promise` при вызове. Этот промис resolved при `return` и rejected при `throw`.

2. **Точки приостановки**: каждый `await` разбивает тело функции на сегменты. До первого `await` код выполняется **синхронно**:

```js
async function demo() {
  console.log('A'); // синхронно!
  await null;
  console.log('B'); // микротаска
}

console.log('1');
demo();
console.log('2');

// Вывод: 1 → A → 2 → B
// "A" — синхронно, "B" — после возврата управления в event loop
```

3. **Continuations через `PromiseReactionJob`**: после каждого `await` продолжение ставится в очередь микротасок. Это значит, что между двумя `await` другие микротаски могут "вклиниться".

### `return` vs `return await`

```js
async function returnWithout() {
  return somePromise(); // промис передаётся в resolve implicit promise
}

async function returnWith() {
  return await somePromise(); // await развернёт промис, потом return
}
```

Без `try/catch` разницы в поведении нет (только дополнительный микротик у `return await`). Но внутри `try` — разница критична (см. раздел 4).

---

## 2. Спецификация Await

### Алгоритм `Await(value)` по спецификации

```
Await(value):
1. asyncContext = текущий execution context
2. promise = PromiseResolve(%Promise%, value)
   - Если value — нативный Promise → вернуть тот же объект
   - Иначе → Promise.resolve(value)
3. Создать stepsFulfilled (onFulfilled):
   - Возобновить asyncContext с результатом value
4. Создать stepsRejected (onRejected):
   - Возобновить asyncContext с throw reason
5. PerformPromiseThen(promise, onFulfilled, onRejected)
6. Удалить asyncContext из execution context stack
7. Вернуть управление вызывающему коду
```

### Сколько микротиков стоит один `await`

**Случай 1**: `await` на уже `fulfilled` нативном `Promise`:

```js
async function f() {
  const x = await Promise.resolve(42);
  // V8 7.2+: 1 микротик (PromiseReactionJob)
  // V8 <7.2: 2 микротика (PromiseResolveThenableJob + PromiseReactionJob)
  console.log(x);
}
```

**Случай 2**: `await` на примитивном значении:

```js
async function f() {
  const x = await 42;
  // PromiseResolve(42) создаёт fulfilled Promise
  // → 1 микротик (PromiseReactionJob)
  console.log(x);
}
```

**Случай 3**: `await` на thenable (не нативный `Promise`):

```js
const thenable = { then(resolve) { resolve(42); } };

async function f() {
  const x = await thenable;
  // PromiseResolve → новый Promise → resolve(thenable)
  // → PromiseResolveThenableJob (1 микротик)
  // → PromiseReactionJob (ещё 1 микротик)
  // Итого: 2 микротика
  console.log(x);
}
```

### V8 оптимизация: zero-cost await (V8 7.2+)

До V8 7.2 каждый `await` создавал **throwaway promise** — промежуточный промис для unwrapping. Это стоило дополнительный микротик.

Начиная с V8 7.2 (Node 12+, Chrome 72+), если значение — нативный `Promise`, V8 пропускает создание промежуточного промиса:

```js
// Демонстрация разницы:
async function fast() { return await Promise.resolve(42); }
async function slow() { return await { then(r) { r(42); } }; }

Promise.resolve()
  .then(() => console.log('tick 1'))
  .then(() => console.log('tick 2'))
  .then(() => console.log('tick 3'));

fast().then(v => console.log('fast:', v));
slow().then(v => console.log('slow:', v));

// V8 7.2+:
// tick 1 → fast: 42 → tick 2 → tick 3 → slow: 42
// fast использует 1 микротик, slow — 2
```

### Подробный пример с подсчётом тиков

```js
async function a() {
  console.log('a1');
  await null;           // +1 тик (PromiseResolve(null) → fulfilled → reaction)
  console.log('a2');
  await null;           // +1 тик
  console.log('a3');
}

async function b() {
  console.log('b1');
  await null;           // +1 тик
  console.log('b2');
}

console.log('start');
a();
b();
console.log('end');

// start → a1 → b1 → end → a2 → b2 → a3
//                          ↑ тик 1    ↑ тик 2  ↑ тик 3
// a и b "чередуются" через микротаски
```

---

## 3. Top-level await

### Только в ES modules

`Top-level await` (TLA) работает **только** в ES modules (`type: "module"` в `package.json` или файлы `.mjs`):

```js
// config.mjs — ES module с top-level await
const response = await fetch('/api/config');
export const config = await response.json();
```

```html
<!-- В браузере: -->
<script type="module">
  const data = await fetch('/api/data').then(r => r.json());
  console.log(data);
</script>
```

В CommonJS (`require`) TLA **не поддерживается**.

### Блокировка зависимых модулей

TLA **блокирует execution** всех модулей, которые зависят от текущего:

```js
// slow-module.mjs
console.log('slow: start');
await new Promise(resolve => setTimeout(resolve, 3000));
console.log('slow: done');
export const data = 42;

// dependent.mjs
import { data } from './slow-module.mjs';
console.log('dependent: loaded'); // выведется через 3+ секунды

// independent.mjs
console.log('independent: loaded'); // выведется сразу (не зависит от slow)
```

Загрузчик модулей строит граф зависимостей. Модули **без** зависимости от TLA-модулей выполняются параллельно; зависимые — ждут.

### Circular dependencies + TLA

```js
// a.mjs
import { b } from './b.mjs';
await someAsyncInit();
export const a = 'from a';

// b.mjs
import { a } from './a.mjs';
export const b = 'from b';
// a — undefined в момент выполнения b.mjs!
// TLA усугубляет проблему circular deps
```

Правило: избегайте circular dependencies в модулях с TLA. Используйте dependency injection или lazy imports.

### Практические кейсы

```js
// 1. Инициализация конфигурации
export const config = await loadConfig();

// 2. Условный импорт (dynamic import)
const { default: adapter } = await import(
  process.env.DB === 'postgres' ? './pg-adapter.mjs' : './sqlite-adapter.mjs'
);
export { adapter };

// 3. Feature detection с fallback
let crypto;
try {
  crypto = await import('node:crypto');
} catch {
  crypto = await import('./crypto-polyfill.mjs');
}
export { crypto };
```

---

## 4. Error handling

### Базовый `try/catch`

```js
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      console.error('Network error:', error.message);
    } else {
      console.error('Request failed:', error.message);
    }
    throw error; // пробросить дальше
  }
}
```

### `await` не-Promise значений

`await` на не-Promise значении **не бросает ошибку** — значение оборачивается в `Promise.resolve()`:

```js
async function f() {
  const x = await 42;       // OK, x === 42
  const y = await 'hello';  // OK, y === 'hello'
  const z = await null;     // OK, z === null
  const w = await undefined; // OK, w === undefined
}
```

### `await` thenable с ошибкой

```js
const failingThenable = {
  then(resolve, reject) {
    reject(new Error('thenable error'));
  }
};

async function f() {
  try {
    await failingThenable; // бросит ошибку через reject
  } catch (e) {
    console.log(e.message); // "thenable error"
  }
}
```

### `return await` в `try` vs без `try`

Это одна из самых тонких разниц в `async/await`:

```js
// Вариант A: return БЕЗ await
async function noAwait() {
  try {
    return riskyAsyncOperation();
  } catch (e) {
    console.log('Caught!', e); // НИКОГДА не выполнится!
    return fallback;
  }
}

// Вариант B: return С await
async function withAwait() {
  try {
    return await riskyAsyncOperation();
  } catch (e) {
    console.log('Caught!', e); // выполнится при rejection!
    return fallback;
  }
}
```

Почему:
- Вариант A: `return riskyAsyncOperation()` передаёт промис как значение для resolve implicit promise. `catch` блок не участвует.
- Вариант B: `await` разворачивает промис **внутри** `try`. Если промис rejected — ошибка поймана `catch`.

ESLint правило: [`no-return-await`](https://eslint.org/docs/rules/no-return-await) запрещает `return await` **вне** `try/catch`. Внутри `try` — `return await` **необходим**.

### Stack trace разница

```js
async function outerNoAwait() {
  return innerAsync(); // stack trace потеряет outerNoAwait
}

async function outerWithAwait() {
  return await innerAsync(); // stack trace сохранит outerWithAwait
}
```

### Unhandled rejection при забытом `await`

```js
async function processItems(items) {
  items.forEach(item => {
    processItem(item); // БЕЗ await! Если processItem — async и бросит:
    // → unhandled rejection, catch блок processItems НЕ поймает
  });
}

// ИСПРАВЛЕНИЕ:
async function processItems(items) {
  for (const item of items) {
    await processItem(item); // теперь ошибки ловятся
  }
  // Или параллельно:
  await Promise.all(items.map(item => processItem(item)));
}
```

### Паттерн: tuple-style error handling

```js
async function to(promise) {
  try {
    const result = await promise;
    return [null, result];
  } catch (error) {
    return [error, null];
  }
}

// Использование:
const [err, user] = await to(fetchUser(id));
if (err) {
  console.error('Failed to fetch user:', err);
  return;
}
console.log(user);
```

---

## 5. for await...of

### Async iterators

`for await...of` работает с объектами, реализующими `Symbol.asyncIterator`:

```js
const asyncIterable = {
  [Symbol.asyncIterator]() {
    let i = 0;
    return {
      async next() {
        if (i >= 3) return { done: true, value: undefined };
        await new Promise(resolve => setTimeout(resolve, 100));
        return { done: false, value: i++ };
      }
    };
  }
};

for await (const value of asyncIterable) {
  console.log(value); // 0, 1, 2 (каждое через ~100ms)
}
```

### Потоковая обработка данных (Node.js Streams)

Node.js `Readable` streams реализуют `Symbol.asyncIterator`:

```js
import { createReadStream } from 'node:fs';

const stream = createReadStream('large-file.txt', { encoding: 'utf-8' });

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
// Поток закрывается автоматически после итерации
```

### NDJSON parsing (Newline-Delimited JSON)

```js
async function* parseNDJSON(stream) {
  let buffer = '';

  for await (const chunk of stream) {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop(); // неполная последняя строка остаётся в буфере

    for (const line of lines) {
      if (line.trim()) {
        yield JSON.parse(line);
      }
    }
  }

  // Обработать последнюю строку
  if (buffer.trim()) {
    yield JSON.parse(buffer);
  }
}

// Использование:
const response = await fetch('/api/stream');
for await (const record of parseNDJSON(response.body)) {
  console.log(record);
}
```

### `for await` с обычными (синхронными) итераторами

`for await...of` также работает с `Symbol.iterator`. Каждое значение оборачивается в `Promise.resolve()`:

```js
const syncArray = [
  Promise.resolve(1),
  Promise.resolve(2),
  Promise.reject(new Error('3')),
  Promise.resolve(4),
];

try {
  for await (const value of syncArray) {
    console.log(value); // 1, 2, затем ошибка
  }
} catch (e) {
  console.log('Error:', e.message); // "3"
  // Итерация прервана, значение 4 не обработано
}
```

### Server-Sent Events

```js
async function* eventSource(url) {
  const response = await fetch(url);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop();

    for (const event of events) {
      const data = event.replace(/^data: /gm, '').trim();
      if (data) yield JSON.parse(data);
    }
  }
}

for await (const event of eventSource('/api/events')) {
  handleEvent(event);
}
```

---

## 6. Антипаттерны

### 1. Sequential `await` в цикле

```js
// ПЛОХО: O(N * latency) — каждый запрос ждёт предыдущий
async function fetchAll(urls) {
  const results = [];
  for (const url of urls) {
    const response = await fetch(url);    // последовательно!
    results.push(await response.json());
  }
  return results;
}
// 10 запросов по 200ms = 2000ms

// ХОРОШО: O(max(latency)) — все запросы параллельно
async function fetchAll(urls) {
  return Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url);
      return response.json();
    })
  );
}
// 10 запросов по 200ms = ~200ms
```

### 2. `async` на функции без `await`

```js
// ПЛОХО: лишний Promise wrapper
async function getConfig() {
  return { host: 'localhost', port: 3000 };
}
// Оборачивает объект в Promise → лишняя аллокация + микротик

// ХОРОШО: если нет асинхронности — не нужен async
function getConfig() {
  return { host: 'localhost', port: 3000 };
}

// ИСКЛЮЧЕНИЕ: когда нужна защита от синхронных исключений
async function safeParse(json) {
  return JSON.parse(json);
  // Если JSON.parse бросит — async обернёт в rejected Promise
  // Без async — будет синхронный throw
}
```

### 3. `await` в `reduce`

```js
// ПЛОХО: порядок выполнения непредсказуем, сложно для понимания
const total = await urls.reduce(async (accPromise, url) => {
  const acc = await accPromise;
  const response = await fetch(url);
  const data = await response.json();
  return acc + data.count;
}, Promise.resolve(0));

// ХОРОШО: явный for...of для последовательной обработки
let total = 0;
for (const url of urls) {
  const response = await fetch(url);
  const data = await response.json();
  total += data.count;
}

// ИЛИ: параллельно + reduce для синхронной агрегации
const responses = await Promise.all(urls.map(url => fetch(url)));
const data = await Promise.all(responses.map(r => r.json()));
const total = data.reduce((acc, d) => acc + d.count, 0);
```

### 4. `await` внутри `forEach`

```js
// ПЛОХО: forEach не ждёт async callback!
async function processItems(items) {
  items.forEach(async (item) => {
    await processItem(item); // forEach уже ушёл дальше!
  });
  console.log('Done!'); // выведется ДО завершения обработки
}

// ХОРОШО: for...of для последовательной обработки
async function processItems(items) {
  for (const item of items) {
    await processItem(item);
  }
  console.log('Done!'); // действительно после обработки
}

// ХОРОШО: Promise.all для параллельной обработки
async function processItems(items) {
  await Promise.all(items.map(item => processItem(item)));
  console.log('Done!');
}
```

### 5. Смешивание `await` и `.then()`

```js
// ПЛОХО: нечитаемая смесь стилей
async function mixed() {
  const data = await fetch('/api/data')
    .then(r => r.json())
    .then(json => {
      return json.items;
    });
  return data;
}

// ХОРОШО: чистый async/await
async function clean() {
  const response = await fetch('/api/data');
  const json = await response.json();
  return json.items;
}
```

---

## 7. Concurrency patterns

### `Promise.all` для параллельности

```js
async function loadDashboard(userId) {
  // Три независимых запроса — запускаем параллельно
  const [user, posts, notifications] = await Promise.all([
    fetchUser(userId),
    fetchPosts(userId),
    fetchNotifications(userId),
  ]);

  return { user, posts, notifications };
}
```

### Semaphore через async

```js
class Semaphore {
  #permits;
  #queue = [];

  constructor(permits) {
    this.#permits = permits;
  }

  async acquire() {
    if (this.#permits > 0) {
      this.#permits--;
      return;
    }
    await new Promise(resolve => this.#queue.push(resolve));
  }

  release() {
    const next = this.#queue.shift();
    if (next) {
      next(); // разблокировать ждущего
    } else {
      this.#permits++;
    }
  }

  async use(fn) {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

// Использование:
const sem = new Semaphore(5);

const results = await Promise.all(
  urls.map(url => sem.use(() => fetch(url).then(r => r.json())))
);
```

### pLimit паттерн

```js
function pLimit(concurrency) {
  const queue = [];
  let active = 0;

  function next() {
    if (active >= concurrency || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => {
      active--;
      next();
    });
  }

  return function limit(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
  };
}

// Использование:
const limit = pLimit(3);

const results = await Promise.all(
  urls.map(url =>
    limit(() => fetch(url).then(r => r.json()))
  )
);
```

### Throttling / Batching

```js
class BatchProcessor {
  #batch = [];
  #timer = null;
  #maxSize;
  #maxWait;
  #processFn;

  constructor({ maxSize = 10, maxWait = 100, processFn }) {
    this.#maxSize = maxSize;
    this.#maxWait = maxWait;
    this.#processFn = processFn;
  }

  async add(item) {
    return new Promise((resolve, reject) => {
      this.#batch.push({ item, resolve, reject });

      if (this.#batch.length >= this.#maxSize) {
        this.#flush();
      } else if (!this.#timer) {
        this.#timer = setTimeout(() => this.#flush(), this.#maxWait);
      }
    });
  }

  async #flush() {
    clearTimeout(this.#timer);
    this.#timer = null;

    const batch = this.#batch.splice(0);
    if (batch.length === 0) return;

    try {
      const results = await this.#processFn(batch.map(b => b.item));
      batch.forEach((b, i) => b.resolve(results[i]));
    } catch (error) {
      batch.forEach(b => b.reject(error));
    }
  }
}

// Использование: группировка запросов к БД
const batcher = new BatchProcessor({
  maxSize: 50,
  maxWait: 10,
  processFn: async (ids) => {
    const rows = await db.query('SELECT * FROM users WHERE id = ANY($1)', [ids]);
    return ids.map(id => rows.find(r => r.id === id));
  }
});

// Каждый вызов — отдельный промис, но запрос к БД — один на батч
const user = await batcher.add(userId);
```

---

## 8. Async generators

### Синтаксис `async function*`

Async generator — это функция, которая совмещает `yield` (приостановка + отдача значения) и `await` (ожидание промиса):

```js
async function* countdown(start, delayMs) {
  for (let i = start; i > 0; i--) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    yield i;
  }
}

for await (const n of countdown(5, 1000)) {
  console.log(n); // 5, 4, 3, 2, 1 (каждый через секунду)
}
```

### Pull-based async streams

В отличие от `EventEmitter` (push-based), async generators — pull-based: потребитель запрашивает следующее значение, когда готов:

```js
async function* paginate(url) {
  let nextUrl = url;

  while (nextUrl) {
    const response = await fetch(nextUrl);
    const data = await response.json();

    yield* data.items; // отдаём элементы по одному

    nextUrl = data.nextPage; // URL следующей страницы или null
  }
}

// Потребитель контролирует скорость:
for await (const item of paginate('/api/items?page=1')) {
  await processItem(item); // обработка по одному
  if (shouldStop()) break; // можно прервать в любой момент
}
```

### Backpressure

Async generators предоставляют backpressure "из коробки": producer не генерирует следующее значение, пока consumer не запросит:

```js
async function* readChunks(reader) {
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield value; // producer остановится здесь, пока consumer не вызовет next()
  }
}

async function processStream(readable) {
  const reader = readable.getReader();

  for await (const chunk of readChunks(reader)) {
    // Даже если обработка медленная — producer не забьёт память
    await heavyProcessing(chunk);
  }
}
```

### Composition: pipe async generators

```js
async function* map(source, fn) {
  for await (const item of source) {
    yield fn(item);
  }
}

async function* filter(source, predicate) {
  for await (const item of source) {
    if (predicate(item)) yield item;
  }
}

async function* take(source, n) {
  let count = 0;
  for await (const item of source) {
    yield item;
    if (++count >= n) return;
  }
}

// Использование: pipeline
const source = paginate('/api/items?page=1');
const active = filter(source, item => item.active);
const names = map(active, item => item.name);
const first10 = take(names, 10);

for await (const name of first10) {
  console.log(name);
}
```

### Real-time data processing

```js
async function* websocketMessages(url) {
  const ws = new WebSocket(url);

  const messages = [];
  let resolve;
  let done = false;

  ws.onmessage = (event) => {
    messages.push(event.data);
    resolve?.();
  };

  ws.onclose = () => {
    done = true;
    resolve?.();
  };

  ws.onerror = (err) => {
    done = true;
    resolve?.();
  };

  // Ждём, пока соединение откроется
  await new Promise((res, rej) => {
    ws.onopen = res;
    ws.onerror = rej;
  });

  try {
    while (!done) {
      if (messages.length === 0) {
        await new Promise(r => { resolve = r; });
      }
      while (messages.length > 0) {
        yield messages.shift();
      }
    }
  } finally {
    ws.close();
  }
}

// Использование:
for await (const msg of websocketMessages('wss://api.example.com/stream')) {
  const data = JSON.parse(msg);
  updateUI(data);
}
```

---

## 9. AbortController

### Базовый паттерн отмены

```js
const controller = new AbortController();
const { signal } = controller;

// fetch поддерживает signal из коробки:
async function loadData() {
  try {
    const response = await fetch('/api/data', { signal });
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request was cancelled');
      return null;
    }
    throw error;
  }
}

// Отмена:
controller.abort();
// Или с причиной (reason):
controller.abort(new Error('User navigated away'));
```

### `AbortSignal.timeout()`

```js
// Автоматическая отмена по таймауту:
const response = await fetch('/api/slow', {
  signal: AbortSignal.timeout(5000),
});
// Через 5 секунд — автоматический abort
// Бросает TimeoutError (не AbortError!)
```

### `AbortSignal.any()` — комбинирование сигналов

```js
const userController = new AbortController();

// Отмена ИЛИ по таймауту, ИЛИ по действию пользователя:
const signal = AbortSignal.any([
  AbortSignal.timeout(10000),
  userController.signal,
]);

cancelButton.onclick = () => userController.abort();

const response = await fetch('/api/data', { signal });
```

### Signal propagation — передача сигнала вглубь

```js
async function fetchUserWithPosts(userId, { signal } = {}) {
  // Пробрасываем signal во все вложенные операции:
  const user = await fetch(`/api/users/${userId}`, { signal });
  const userData = await user.json();

  const posts = await fetch(`/api/users/${userId}/posts`, { signal });
  const postsData = await posts.json();

  return { ...userData, posts: postsData };
}

// Если signal abort между двумя fetch — второй не начнётся
```

### Cleanup — освобождение ресурсов при отмене

```js
async function longRunningTask({ signal } = {}) {
  const resource = await acquireResource();

  // Регистрируем cleanup ДО начала работы:
  signal?.addEventListener('abort', () => {
    resource.release();
  }, { once: true });

  // Проверяем сигнал перед каждым шагом:
  for (const item of items) {
    signal?.throwIfAborted(); // бросит AbortError если отменён

    await processItem(item, resource);
  }

  resource.release();
}
```

### Cancellable delay

```js
function delay(ms, { signal } = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    }, { once: true });

    // Edge case: уже отменён к моменту вызова
    if (signal?.aborted) {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
    }
  });
}

// Использование:
const controller = new AbortController();
await delay(5000, { signal: controller.signal });
```

### `AbortController` в реальном приложении

```js
// React hook с автоматической отменой при unmount:
function useAsync(asyncFn, deps) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, error: null, data: null });

    asyncFn({ signal: controller.signal })
      .then(data => {
        if (!controller.signal.aborted) {
          setState({ loading: false, error: null, data });
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setState({ loading: false, error, data: null });
        }
      });

    return () => controller.abort(); // cleanup при unmount / re-render
  }, deps);

  return state;
}
```

---

## 10. Performance

### Стоимость `async/await` vs raw promises

```js
// Raw Promise — минимальный overhead:
function rawPromise() {
  return Promise.resolve(42);
}

// async/await — implicit Promise + микротик:
async function asyncVersion() {
  return 42;
}

// Разница в бенчмарке (V8 7.2+):
// rawPromise: ~50ns
// asyncVersion: ~80ns
// Разница ~30ns — обычно несущественна
```

Правило: **не оптимизируйте** `async/await` ради производительности в application-level коде. Оптимизируйте в hot paths библиотек.

### Async stack traces: стоимость

До V8 7.2: async stack traces требовали захвата стека при каждом `await` (`Error.captureStackTrace`). Это стоило ~10x overhead.

V8 7.2+: zero-cost async stack traces — информация о стеке восстанавливается из цепочки промисов **только при создании ошибки**.

```js
// Async stack trace работает корректно:
async function a() { await b(); }
async function b() { await c(); }
async function c() { throw new Error('deep'); }

// Error: deep
//     at c
//     at async b
//     at async a
```

### Когда НЕ использовать `async`

```js
// 1. Синхронные функции — не оборачивайте:
// ПЛОХО:
async function add(a, b) { return a + b; }
// ХОРОШО:
function add(a, b) { return a + b; }

// 2. Простой проброс промиса (без try/catch):
// ПЛОХО:
async function getUser(id) { return await fetchUser(id); }
// ХОРОШО:
function getUser(id) { return fetchUser(id); }

// 3. Event handlers в hot paths:
// ПЛОХО (если вызывается тысячи раз в секунду):
element.addEventListener('mousemove', async (e) => {
  await updatePosition(e);
});
// ХОРОШО:
element.addEventListener('mousemove', (e) => {
  updatePosition(e); // если не нужен await — не используйте async
});
```

### Memory overhead

```js
// Каждый вызов async function создаёт:
// 1. Implicit Promise (с internal slots)
// 2. AsyncContext (execution context snapshot)
// 3. Closure для continuation после каждого await

// В hot loop — это тысячи аллокаций:
// ПЛОХО:
for (let i = 0; i < 100000; i++) {
  await trivialAsyncOp(); // 100K промисов
}

// ХОРОШО: батчинг
const BATCH_SIZE = 1000;
for (let i = 0; i < 100000; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  await Promise.all(batch.map(item => trivialAsyncOp(item)));
}
```

### Профилирование

```js
// Chrome DevTools: Performance tab → записать → смотреть "Microtask" в timeline
// Node.js:
const { performance, PerformanceObserver } = require('node:perf_hooks');

async function measured() {
  performance.mark('start');
  await heavyOperation();
  performance.mark('end');
  performance.measure('heavyOperation', 'start', 'end');
}

const obs = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
  }
});
obs.observe({ entryTypes: ['measure'] });
```

### Сводка: когда что использовать

| Сценарий | Подход |
|---|---|
| Один асинхронный вызов | `async/await` |
| Параллельные независимые вызовы | `Promise.all` |
| Параллельно с ограничением | `Semaphore` / `pLimit` |
| Последовательная обработка потока | `for await...of` |
| Fire-and-forget | Промис без `await` (но с `.catch()`!) |
| Синхронный код | Обычная функция (без `async`) |
| Hot path в библиотеке | Raw `Promise` вместо `async/await` |
| Timeout/cancellation | `AbortController` + `AbortSignal.timeout()` |
