# Callbacks: глубокое погружение

## Оглавление

1. [Continuation-Passing Style (CPS)](#continuation-passing-style-cps)
2. [Error-first convention](#error-first-convention)
3. [Inversion of Control](#inversion-of-control)
4. [Zalgo problem](#zalgo-problem)
5. [Callback Hell](#callback-hell)
6. [Thunks](#thunks)
7. [util.promisify / util.callbackify](#utilpromisify--utilcallbackify)
8. [V8 оптимизации](#v8-оптимизации)
9. [Edge cases](#edge-cases)

---

## Continuation-Passing Style (CPS)

### Формальное определение

`Continuation-Passing Style` (CPS) — стиль программирования, при котором функция **не возвращает результат** через `return`, а передаёт его в функцию-продолжение (`continuation`), принятую аргументом. В формальной теории компиляторов CPS — промежуточное представление, в которое трансформируется любой `direct style` код.

### Direct style vs CPS

```js
// Direct style — результат возвращается через return
function addDirect(a, b) {
  return a + b;
}
const sum = addDirect(2, 3); // 5

// CPS — результат передаётся в continuation
function addCPS(a, b, continuation) {
  continuation(a + b);
}
addCPS(2, 3, (sum) => {
  console.log(sum); // 5
});
```

Ключевое отличие: в `direct style` вызывающий код решает, что делать с результатом. В CPS — **вызываемая функция** решает, когда и как передать результат. Это фундамент всей асинхронности в JavaScript.

### Synchronous CPS vs Asynchronous CPS

```js
// Synchronous CPS — continuation вызывается до возврата из функции
function mapSync(arr, fn, cb) {
  cb(arr.map(fn));
}

// Asynchronous CPS — continuation вызывается после возврата
function readFileCPS(path, cb) {
  // cb будет вызван из event loop, ПОСЛЕ завершения текущего call frame
  fs.readFile(path, 'utf8', cb);
}
```

### Как JS runtime реализует callbacks

В V8 callback — обычный объект `JSFunction` в куче. При вызове асинхронной операции движок:

1. Помещает callback в структуру, связанную с операцией (например, `FSReqCallback` в libuv)
2. Операция уходит в thread pool libuv (для I/O) или в ОС (epoll/kqueue)
3. По завершении libuv помещает результат в очередь
4. `Event loop` на фазе poll/check/timer достаёт результат и вызывает callback через `MakeCallback` в C++ слое Node.js
5. Перед вызовом устанавливается `async context` (для `async_hooks`), после — запускается `microtask checkpoint`

---

## Error-first convention

### Почему `err` первый аргумент

В Node.js де-факто стандарт — `error-first callback`: `(err, data) => {}`. Причина порядка аргументов:

- **Невозможно забыть об ошибке** — первый аргумент всегда бросается в глаза
- **Вариативность данных** — количество аргументов после `err` может быть любым (`fs.read` передаёт `(err, bytesRead, buffer)`), но `err` всегда ровно один и всегда первый
- **Конвенция Ryan Dahl** — зафиксирована с первых версий Node.js и ожидается всеми утилитами (`util.promisify`, `Bluebird.promisifyAll`)

```js
const fs = require('fs');

// Канонический error-first callback
fs.readFile('/etc/passwd', 'utf8', (err, data) => {
  if (err) {
    // err — экземпляр Error (или подкласса)
    console.error('Не удалось прочитать файл:', err.message);
    return; // ОБЯЗАТЕЛЬНО return — иначе код продолжит выполняться с undefined data
  }
  console.log(data);
});
```

### Антипаттерны error-first

```js
// ПЛОХО: забыли return после обработки ошибки
fs.readFile(path, (err, data) => {
  if (err) {
    log(err);
    // data === undefined, но код ниже всё равно выполнится
  }
  process(data); // TypeError: Cannot read properties of undefined
});

// ПЛОХО: throw внутри callback — не ловится вызывающим кодом
fs.readFile(path, (err, data) => {
  if (err) throw err; // Uncaught exception → process.exit(1) в Node.js
});
```

---

## Inversion of Control

### Суть проблемы

Когда вы передаёте callback стороннему коду, вы **теряете контроль** над тем, как и когда он будет вызван. Это называется `Inversion of Control` (IoC) — и это главная архитектурная проблема callbacks.

### Пять видов потери контроля

```js
// 1. Callback вызван 0 раз (проглочен)
function chargeCard(amount, cb) {
  thirdPartyPayment.process(amount, cb);
  // Что если thirdPartyPayment никогда не вызовет cb?
  // У нас нет timeout, нет fallback — операция зависла навсегда
}

// 2. Callback вызван 2+ раз
function trackEvent(event, cb) {
  analytics.send(event, cb);
  // Баг в библиотеке: cb вызван и на success, и на retry
  // Деньги списаны дважды
}

// 3. Callback вызван синхронно вместо асинхронно (Zalgo — см. ниже)
function getUser(id, cb) {
  if (cache[id]) {
    cb(null, cache[id]); // sync!
  } else {
    db.query(id, cb);    // async!
  }
}

// 4. Callback вызван с неправильным this
class PaymentProcessor {
  constructor() { this.currency = 'USD'; }
  process(amount, cb) {
    externalLib.charge(amount, function(err, result) {
      // this === undefined (strict mode) или global
      console.log(this.currency); // TypeError!
    });
  }
}

// 5. Callback вызван с неправильными аргументами
function fetchData(url, cb) {
  lib.request(url, (result) => {
    // Ожидали (err, data), получили (data) — err потерян
    cb(null, result);
  });
}
```

### Защита от IoC

```js
// Обёртка с гарантиями: вызов ровно 1 раз + timeout
function safeCallback(cb, timeoutMs = 5000) {
  let called = false;
  const timer = setTimeout(() => {
    if (!called) {
      called = true;
      cb(new Error('Callback timeout'));
    }
  }, timeoutMs);

  return function (...args) {
    if (called) return; // игнорируем повторные вызовы
    called = true;
    clearTimeout(timer);
    cb(...args);
  };
}

chargeCard(100, safeCallback((err, receipt) => {
  // Гарантированно вызван ровно 1 раз
}));
```

Именно из-за IoC появились `Promise` — они дают гарантию: resolve/reject вызывается **ровно один раз**, **всегда асинхронно**, с **предсказуемым порядком**.

---

## Zalgo problem

### Что такое Zalgo

Термин введён Isaac Schlueter (создатель npm) в статье **"Designing APIs for Asynchrony"**. Zalgo — это ситуация, когда функция **иногда** вызывает callback синхронно, **иногда** асинхронно. Это создаёт класс багов, которые невозможно воспроизвести детерминированно.

### Пример: выпускаем Zalgo

```js
function readFileWithCache(path, cb) {
  if (cache[path]) {
    cb(null, cache[path]); // SYNC — callback вызван до возврата из функции
    return;
  }
  fs.readFile(path, 'utf8', (err, data) => {
    if (!err) cache[path] = data;
    cb(err, data); // ASYNC — callback вызван из event loop
  });
}

// Код, который ломается из-за Zalgo:
let initialized = false;
readFileWithCache('config.json', (err, data) => {
  // Если cache hit: initialized ещё false (callback вызван до присваивания ниже)
  // Если cache miss: initialized уже true
  console.log(initialized); // true или false — зависит от кэша!
});
initialized = true;
```

### Правило: ВСЕГДА sync или ВСЕГДА async

```js
// ПРАВИЛЬНО: всегда async через process.nextTick
function readFileWithCache(path, cb) {
  if (cache[path]) {
    process.nextTick(() => cb(null, cache[path]));
    return;
  }
  fs.readFile(path, 'utf8', (err, data) => {
    if (!err) cache[path] = data;
    cb(err, data);
  });
}

// ПРАВИЛЬНО: всегда async через queueMicrotask (браузер + Node.js)
function getCached(key, cb) {
  if (store.has(key)) {
    queueMicrotask(() => cb(null, store.get(key)));
    return;
  }
  fetchFromDB(key, cb);
}
```

`process.nextTick` ставит callback в начало `microtask queue` (до promise callbacks). `queueMicrotask` — в конец. Оба гарантируют асинхронность, но `nextTick` приоритетнее.

---

## Callback Hell

### Это НЕ просто вложенность

Callback Hell (пирамида doom) — часто сводят к визуальной проблеме отступов. Но настоящая проблема — **потеря control flow и error handling**.

```js
// «Пирамида doom» — видимая часть проблемы
getUser(userId, (err, user) => {
  if (err) { handleError(err); return; }
  getOrders(user.id, (err, orders) => {
    if (err) { handleError(err); return; }
    getOrderDetails(orders[0].id, (err, details) => {
      if (err) { handleError(err); return; }
      getShipment(details.shipmentId, (err, shipment) => {
        if (err) { handleError(err); return; }
        // наконец-то бизнес-логика...
        updateUI(user, orders, details, shipment);
      });
    });
  });
});
```

### Три реальные проблемы, скрытые за вложенностью

**1. Дублирование error handling** — каждый уровень повторяет `if (err)`. Забыл на одном — молчаливый баг.

**2. Невозможность параллельных операций** — если `getOrders` и `getShipment` независимы, в callback-мире нужен ручной счётчик:

```js
let pending = 2;
let results = {};

getOrders(userId, (err, orders) => {
  if (err) return handleError(err);
  results.orders = orders;
  if (--pending === 0) done(results);
});

getShipment(userId, (err, shipment) => {
  if (err) return handleError(err);
  results.shipment = shipment;
  if (--pending === 0) done(results);
});
```

**3. Нет единого места для cleanup** — `finally` невозможен. Если на 3-м уровне ошибка, как закрыть ресурс, открытый на 1-м?

### Именованные функции — НЕ решение

```js
// Часто предлагают «просто вынесите функции»
function onUser(err, user) { /* ... */ getOrders(user.id, onOrders); }
function onOrders(err, orders) { /* ... */ getDetails(orders[0].id, onDetails); }
function onDetails(err, details) { /* ... */ }

getUser(userId, onUser);
// Визуально плоско, но проблемы IoC, error handling и параллельности остались
```

---

## Thunks

### Ленивые обёртки как промежуточный паттерн

`Thunk` — функция, которая **не принимает аргументов** (кроме callback) и инкапсулирует асинхронную операцию с уже зафиксированными параметрами.

```js
// Обычный вызов
fs.readFile('/etc/hosts', 'utf8', callback);

// Thunk — параметры зафиксированы, осталось передать только callback
function readHostsThunk(cb) {
  fs.readFile('/etc/hosts', 'utf8', cb);
}

// Фабрика thunks
function makeThunk(fn, ...args) {
  return function (cb) {
    fn(...args, cb);
  };
}

const readHosts = makeThunk(fs.readFile, '/etc/hosts', 'utf8');
readHosts((err, data) => console.log(data));
```

### Thunk как значение первого класса

Thunk позволяет **разделить** момент описания операции и момент её выполнения:

```js
// Описываем операции (ничего не выполняется)
const fetchUser = makeThunk(db.getUser, userId);
const fetchConfig = makeThunk(fs.readFile, 'config.json', 'utf8');

// Выполняем позже, когда нужно
fetchUser((err, user) => { /* ... */ });
```

### Thunk → Promise bridge

Thunk — предшественник Promise. Мост между ними тривиален:

```js
// Thunk → Promise
function thunkToPromise(thunk) {
  return new Promise((resolve, reject) => {
    thunk((err, ...values) => {
      if (err) reject(err);
      else resolve(values.length === 1 ? values[0] : values);
    });
  });
}

const data = await thunkToPromise(readHosts);

// Promise → Thunk
function promiseToThunk(promise) {
  return function (cb) {
    promise.then(
      (val) => cb(null, val),
      (err) => cb(err)
    );
  };
}
```

Библиотека `co` Tj Holowaychuk использовала именно thunks (и позже — promises) для реализации корутин через генераторы до появления `async/await`.

---

## util.promisify / util.callbackify

### util.promisify — из callback в Promise

```js
const { promisify } = require('util');
const readFile = promisify(fs.readFile);

// Было: fs.readFile(path, 'utf8', (err, data) => { ... })
// Стало:
const data = await readFile('/etc/hosts', 'utf8');
```

`promisify` ожидает, что последний аргумент оригинальной функции — error-first callback `(err, value)`. Для функций, передающих несколько значений в callback, используется `custom promisify`.

### Custom promisify через Symbol

```js
const { promisify } = require('util');

// dns.lookup передаёт (err, address, family) — два значения
// Стандартный promisify вернёт только address
// Custom promisify решает эту проблему:

const dns = require('dns');

// Реализация кастомного Symbol
function customLookup(hostname, options) {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, options, (err, address, family) => {
      if (err) reject(err);
      else resolve({ address, family });
    });
  });
}

// Регистрация через Symbol
dns.lookup[promisify.custom] = customLookup;

// Теперь promisify использует нашу реализацию
const lookup = promisify(dns.lookup);
const result = await lookup('example.com'); // { address: '93.184.216.34', family: 4 }
```

### util.callbackify — из Promise обратно в callback

```js
const { callbackify } = require('util');

async function fetchData(url) {
  const res = await fetch(url);
  return res.json();
}

// Оборачиваем async функцию в error-first callback стиль
const fetchDataCB = callbackify(fetchData);

fetchDataCB('https://api.example.com/data', (err, data) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log(data);
});
```

Полезно при интеграции нового async-кода со старым callback-based API (например, `stream._transform`).

---

## V8 оптимизации

### Инлайнинг callbacks

V8 (`TurboFan`) активно инлайнит callbacks, если они **мономорфны** — то есть в конкретном `call site` всегда вызывается функция одной и той же формы.

```js
// Мономорфный call site — V8 инлайнит callback
const result = arr.map(x => x * 2);
// TurboFan видит, что .map всегда получает (x) => x * 2
// и может заинлайнить тело callback прямо в цикл

// Полиморфный call site — деоптимизация
function process(arr, fn) {
  return arr.map(fn);
}
process(data, x => x * 2);
process(data, x => x.toString());
process(data, x => x + 1);
process(data, x => JSON.stringify(x));
// 4+ разных формы fn → megamorphic → V8 отказывается от инлайнинга
```

### Monomorphic vs Megamorphic call sites

Каждый `call site` в V8 имеет `Inline Cache` (IC):

| Состояние | Формы | Поведение |
|-----------|-------|-----------|
| `Monomorphic` | 1 | Прямой вызов, возможен инлайнинг |
| `Polymorphic` | 2-4 | Линейный поиск по кэшу форм |
| `Megamorphic` | 5+ | Generic lookup, инлайнинг невозможен |

```js
// Совет: если hot callback передаётся в HOF — держите его мономорфным
// ПЛОХО:
function transform(items, mode) {
  return items.map(mode === 'fast' ? fastFn : slowFn); // polymorphic
}

// ЛУЧШЕ:
function transformFast(items) { return items.map(fastFn); }  // monomorphic
function transformSlow(items) { return items.map(slowFn); }  // monomorphic
```

### Деоптимизация при try/catch вокруг callback

До `TurboFan` (в `Crankshaft`) `try/catch` полностью предотвращал оптимизацию функции. В современном V8 `TurboFan` оптимизирует `try/catch`, но:

```js
// V8 не может инлайнить callback внутрь try, если не знает его форму
try {
  arr.forEach(callback); // callback может throw → side exit из оптимизированного кода
} catch (e) {
  // ...
}
```

---

## Edge cases

### throw внутри callback не ловится вызывающим кодом

```js
// ФАТАЛЬНАЯ ОШИБКА: try/catch не работает с async callbacks
try {
  fs.readFile('data.json', (err, data) => {
    throw new Error('Oops'); // throw ВНУТРИ callback
  });
} catch (e) {
  // НИКОГДА не сработает — callback выполняется в другом call frame
  console.log('Caught:', e);
}
// → Uncaught Error: Oops → process crash в Node.js
```

`try/catch` работает **только в пределах одного синхронного call frame**. Callback выполняется в отдельном тике event loop — к этому моменту `try` уже завершился.

### Потеря stack trace

```js
function processOrder(orderId, cb) {
  db.getOrder(orderId, (err, order) => {
    if (err) return cb(err);
    payment.charge(order.total, (err, receipt) => {
      if (err) return cb(err);
      // Stack trace покажет только: payment → anonymous → node internals
      // Контекст processOrder и orderId потерян
      email.send(receipt, cb);
    });
  });
}

// В Node.js --async-stack-traces (включено по умолчанию с v12 для await)
// НЕ работает для callbacks — только для async/await цепочек
```

Для callbacks можно сохранять trace вручную:

```js
function withTrace(cb) {
  const trace = new Error('Trace');
  return function (err, ...args) {
    if (err) {
      err.originalStack = err.stack;
      err.stack += '\n--- Async boundary ---\n' + trace.stack;
    }
    cb(err, ...args);
  };
}

fs.readFile(path, withTrace((err, data) => {
  if (err) console.error(err.stack); // Полный trace через async boundary
}));
```

### this binding в callbacks

```js
class Logger {
  constructor(prefix) {
    this.prefix = prefix;
  }

  log(msg) {
    console.log(`[${this.prefix}] ${msg}`);
  }

  fetchAndLog(url) {
    // ПРОБЛЕМА: this потерян
    http.get(url, function (res) {
      this.log(res.statusCode); // TypeError: this.log is not a function
    });

    // РЕШЕНИЕ 1: arrow function (лексический this)
    http.get(url, (res) => {
      this.log(res.statusCode); // OK — this из fetchAndLog
    });

    // РЕШЕНИЕ 2: bind
    http.get(url, function (res) {
      this.log(res.statusCode);
    }.bind(this));

    // РЕШЕНИЕ 3: замыкание
    const self = this;
    http.get(url, function (res) {
      self.log(res.statusCode);
    });
  }
}
```

### Рекурсивные async callbacks и переполнение стека

```js
// ОПАСНО: если list огромный и callback иногда sync (Zalgo!)
function processItems(list, cb) {
  if (list.length === 0) return cb(null);
  doWork(list[0], (err) => {
    if (err) return cb(err);
    processItems(list.slice(1), cb); // рекурсия
  });
}

// БЕЗОПАСНО: гарантируем async через setImmediate
function processItemsSafe(list, cb) {
  if (list.length === 0) return cb(null);
  doWork(list[0], (err) => {
    if (err) return cb(err);
    setImmediate(() => processItemsSafe(list.slice(1), cb));
    // setImmediate разрывает call stack — переполнения не будет
  });
}
```

### Callback после уничтожения контекста

```js
// Частый баг в React-подобных фреймворках (до хуков и AbortController)
class UserComponent {
  constructor() {
    this.destroyed = false;
  }

  load(userId) {
    fetchUser(userId, (err, user) => {
      if (this.destroyed) return; // guard — компонент уже уничтожен
      this.render(user);
    });
  }

  destroy() {
    this.destroyed = true;
  }
}
```

---

## Итог

Callbacks — не «устаревший» паттерн. Это **фундаментальный механизм**, на котором построены Promises, `async/await`, Streams и весь I/O в Node.js. Понимание CPS, Inversion of Control, Zalgo и edge cases с потерей stack trace — необходимо для отладки production-проблем, написания библиотек и понимания внутренней работы runtime.

| Проблема callbacks | Решение в Promises/async-await |
|---|---|
| Inversion of Control | Promise разрешается ровно 1 раз |
| Zalgo | Promise `.then()` всегда async |
| Callback Hell | `await` даёт линейный control flow |
| Потеря stack trace | `--async-stack-traces` для await |
| Нет `finally` | `promise.finally()` / `try-finally` |
