# Сборка мусора в JavaScript (V8 Orinoco)

## Оглавление

1. [Управление памятью: общая картина](#управление-памятью-общая-картина)
2. [Структура кучи V8](#структура-кучи-v8)
3. [Generational Garbage Collection](#generational-garbage-collection)
4. [Young Generation и алгоритм Scavenge](#young-generation-и-алгоритм-scavenge)
5. [Old Generation: Mark-Sweep-Compact](#old-generation-mark-sweep-compact)
6. [Триколорная маркировка (Tri-color marking)](#триколорная-маркировка-tri-color-marking)
7. [Write Barrier](#write-barrier)
8. [Incremental, Concurrent и Parallel GC — Orinoco](#incremental-concurrent-и-parallel-gc--orinoco)
9. [Conservative Stack Scanning](#conservative-stack-scanning)
10. [Слабые ссылки: WeakRef, WeakMap, WeakSet, FinalizationRegistry](#слабые-ссылки-weakref-weakmap-weakset-finalizationregistry)
11. [Ephemerons — внутренности WeakMap](#ephemerons--внутренности-weakmap)
12. [Практические утечки памяти](#практические-утечки-памяти)
13. [Профилирование и Heap Snapshots](#профилирование-и-heap-snapshots)
14. [Флаги V8 и числовые ориентиры](#флаги-v8-и-числовые-ориентиры)
15. [Особые случаи: строки, массивы, ArrayBuffer, модули](#особые-случаи-строки-массивы-arraybuffer-модули)
16. [GC в Web Workers и изоляция кучи](#gc-в-web-workers-и-изоляция-кучи)

---

## Управление памятью: общая картина

JavaScript — язык с автоматическим управлением памятью. Разработчик не вызывает `malloc`/`free` — движок сам определяет, какие объекты больше не достижимы из корней (`roots`), и освобождает память.

### Стек vs Куча

- **Стек** (`stack`) — хранит примитивные значения (`number`, `boolean`, `string` до определённого размера, `undefined`, `null`, `Symbol`, `BigInt`) и ссылки (указатели) на объекты. Управляется автоматически через push/pop при вызове и возврате функций.
- **Куча** (`heap`) — хранит объекты, массивы, функции, замыкания. Управляется сборщиком мусора.

```js
function example() {
  const x = 42;            // x — в стеке (примитив)
  const obj = { a: 1 };    // obj (ссылка) — в стеке, { a: 1 } — в куче
  return obj;              // ссылка копируется, объект остаётся в куче
}
```

### Корневые объекты (Root objects)

Отправная точка алгоритма достижимости:

1. Глобальный объект (`window` / `globalThis` / `global`)
2. Текущий `call stack` — все локальные переменные активных функций
3. Регистры CPU (могут содержать ссылки на объекты)
4. Handle scopes C++ слоя (для native addons)
5. `Persistent handles` — ссылки, созданные через V8 C++ API

Если объект не достижим ни от одного корня — он мёртв и подлежит сбору.

---

## Структура кучи V8

V8 делит кучу на несколько пространств (`spaces`):

| Пространство | Назначение | Размер по умолчанию |
|---|---|---|
| `New Space` (Young Gen) | Новые объекты | ~1-8 MB (две semi-spaces) |
| `Old Space` | Объекты, пережившие Scavenge | До `--max-old-space-size` (по умолчанию ~1.5 GB на 64-bit) |
| `Code Space` | Скомпилированный JIT-код | Динамический |
| `Map Space` | Hidden classes (Maps) | Динамический |
| `Large Object Space` | Объекты > ~256 KB | Не копируются, сразу в Old Gen |

```
┌───────────────────────────────────────────────────┐
│                    V8 Heap                        │
│ ┌──────────────┐  ┌───────────────────────────┐   │
│ │  New Space    │  │       Old Space            │   │
│ │ ┌────┐┌────┐ │  │  Mark-Sweep-Compact        │   │
│ │ │from││ to │ │  │                             │   │
│ │ │semi││semi│ │  │                             │   │
│ │ └────┘└────┘ │  └───────────────────────────┘   │
│ └──────────────┘  ┌───────────────────────────┐   │
│ ┌──────────────┐  │    Large Object Space      │   │
│ │  Code Space  │  │    (объекты > ~256KB)       │   │
│ └──────────────┘  └───────────────────────────┘   │
└───────────────────────────────────────────────────┘
```

---

## Generational Garbage Collection

### Гипотеза поколений

Empirical наблюдение (generational hypothesis): **большинство объектов умирают молодыми**. В типичном JavaScript-приложении 70-90% объектов не переживают первый цикл GC. Поэтому выгодно разделить кучу на поколения и собирать Young Gen часто и дёшево, а Old Gen — редко.

### Два типа сборки

- **Minor GC** (Scavenge) — работает только с Young Generation. Быстро (1-10 мс).
- **Major GC** (Mark-Sweep-Compact) — работает с Old Generation + может затронуть Young Gen. Дольше (10-100+ мс без инкрементальности).

---

## Young Generation и алгоритм Scavenge

### Semi-space архитектура

Young Generation (`New Space`) разделён на два равных полупространства — `from-space` и `to-space`. В любой момент только одно из них активно для аллокации.

### Алгоритм Cheney's semi-space copy

```
Начальное состояние:
from-space: [A] [B] [C] [D]   ← объекты здесь
to-space:   (пусто)

1. Начинаем с корней, находим живые объекты (A, C достижимы)
2. Копируем живые в to-space:
   to-space: [A] [C]

3. Меняем роли пространств:
   from-space: [A] [C]          ← теперь это «новый from» (бывший to)
   to-space:   (пусто)          ← бывший from очищен целиком

Объекты B, D — мёртвые, их память освобождена
```

### Промоция в Old Generation

Объект **промотируется** (перемещается) из Young Gen в Old Gen, если:
- Он пережил два цикла Scavenge (промоция по возрасту)
- `to-space` заполнен более чем на 25% (промоция по давлению)

```js
// Визуализация жизненного цикла объекта:
let temp = { data: 'short-lived' }; // → New Space (from-space)
temp = null;                         // → мёртв → Scavenge удалит

let cache = { data: 'long-lived' }; // → New Space
// ... Scavenge #1: cache жив → скопирован в to-space
// ... Scavenge #2: cache жив → промотирован в Old Space
```

### Почему Scavenge быстрый

1. Работает с маленьким пространством (~1-8 MB)
2. Копирует **только живые** объекты (их меньшинство)
3. Нет фрагментации — объекты уплотняются при копировании
4. С V8 v6.2+ — **параллельный Scavenge**: несколько потоков копируют одновременно

---

## Old Generation: Mark-Sweep-Compact

### Фаза Mark

Обход графа объектов от корней. Каждый достижимый объект помечается как живой.

```
Корни → [Global] → [UserService] → [DB Connection]
                 → [Router] → [Handler A]
                            → [Handler B] → [Logger]

Все перечисленные объекты помечаются (mark bit = 1).
Объекты, не достижимые от корней — не помечены (mark bit = 0).
```

### Фаза Sweep

Проход по всей Old Space. Непомеченные объекты помечаются как свободная память (добавляются в `free list`). Mark bits сбрасываются.

### Фаза Compact (опциональная)

Живые объекты сдвигаются в начало страницы, устраняя фрагментацию. Дорогая операция — выполняется только когда фрагментация превышает порог.

```
До Compact:
[A][__][B][____][C][__][D]   ← фрагментация: 3 дырки

После Compact:
[A][B][C][D][____________]   ← все свободное пространство в конце
```

### Почему не только Mark-Sweep

Без Compact со временем free list содержит множество маленьких фрагментов. Аллокация большого объекта может потребовать обход всего free list. Compact решает это ценой перемещения объектов и обновления всех указателей.

---

## Триколорная маркировка (Tri-color marking)

### Три цвета

Для поддержки инкрементальной и конкурентной маркировки V8 использует триколорную схему:

| Цвет | Значение |
|------|----------|
| **Белый** | Объект ещё не посещён. Если после завершения маркировки объект белый — он мёртв |
| **Серый** | Объект посещён, но его дочерние ссылки ещё не обработаны |
| **Чёрный** | Объект посещён, все его дочерние ссылки тоже обработаны |

### Инвариант

**Инвариант триколорной маркировки**: чёрный объект **никогда** не ссылается напрямую на белый. Если мутатор (JS-код) создаёт такую ссылку во время маркировки — `Write Barrier` восстанавливает инвариант.

```
Начало маркировки:
  Все объекты — белые
  Корни помещаются в marking worklist → становятся серыми

Итерация:
  1. Берём серый объект из worklist
  2. Проходим по всем его ссылкам
  3. Каждый белый объект-потомок → серый (добавляем в worklist)
  4. Текущий объект → чёрный

Завершение:
  Worklist пуст → все серые стали чёрными
  Белые объекты — мёртвые → подлежат sweep
```

---

## Write Barrier

### Зачем нужен

Между шагами инкрементальной маркировки JS-код продолжает работать и может изменять граф объектов. Без Write Barrier возможна ситуация:

1. Объект A (чёрный) ссылался на B (серый)
2. JS-код удалил ссылку B → C (белый) из B
3. JS-код добавил ссылку A → C
4. Теперь A (чёрный) → C (белый), но C никогда не будет посещён!
5. C удалён, хотя он достижим → **dangling pointer** → crash

### Реализация: Dijkstra-style barrier

```
При каждом присваивании obj.field = value:
  if (isBlack(obj) && isWhite(value)) {
    markGrey(value);  // или markGrey(obj) — зависит от стратегии
    addToWorklist(value);
  }
```

В V8 Write Barrier реализован как несколько машинных инструкций, вставляемых JIT-компилятором при каждой записи ссылки. Overhead — 1-2% на throughput.

---

## Incremental, Concurrent и Parallel GC — Orinoco

**Orinoco** — кодовое название GC pipeline в V8, объединяющего все стратегии минимизации пауз.

### Incremental GC

Фаза маркировки разбита на короткие шаги (по ~5 мс), перемежающиеся с выполнением JS-кода. Это устраняет длинные `stop-the-world` паузы.

```
Без инкрементальности:
  [-------- JS --------][===== Mark (50ms) =====][-- Sweep --][---- JS ----]
                          ↑ stop-the-world пауза

С инкрементальностью:
  [-- JS --][= M 5ms =][-- JS --][= M 5ms =][-- JS --]...[= Finalize =][-- JS --]
             маленькие паузы, JS отзывчив
```

### Concurrent GC

Фазы маркировки и sweeping выполняются **в фоновом потоке**, параллельно с JS-кодом. Главный поток не останавливается (почти).

- **Concurrent marking** — фоновый поток обходит граф, помечая объекты. Главный поток продолжает выполнение. Write Barrier обеспечивает корректность.
- **Concurrent sweeping** — фоновый поток проходит по страницам и освобождает память мёртвых объектов.

### Parallel GC

Когда stop-the-world пауза всё же необходима (финальная фаза маркировки, эвакуация в Scavenge), **несколько потоков** выполняют работу параллельно, сокращая паузу.

- **Parallel Scavenge** — Young Gen эвакуируется несколькими потоками одновременно
- **Parallel compaction** — страницы Old Gen уплотняются параллельно

### Итоговая картина Orinoco

```
Главный поток:  [JS][mark step][JS][mark step][JS][finalize+sweep start][JS]
Фоновый поток 1: .....[concurrent mark]...........[concurrent sweep].........
Фоновый поток 2: .....[concurrent mark]...........[concurrent sweep].........
                                                    ↑
                                    Parallel: все потоки помогают на финализации
```

Результат: паузы Major GC в V8 снижены с 50-100 мс (V8 2015) до 1-5 мс (V8 2023+).

---

## Conservative Stack Scanning

### Суть подхода

При сборке мусора нужно знать, какие значения на стеке являются указателями на объекты в куче. Два подхода:

- **Precise scanning** — компилятор для каждой точки в коде генерирует `stack map`, описывающий, где именно на стеке лежат указатели. Дорого по памяти и времени компиляции.
- **Conservative scanning** — GC сканирует стек и **предполагает**, что любое значение, похожее на указатель в кучу, является указателем.

V8 перешёл на conservative stack scanning (с 2020+), что упростило JIT-компилятор и устранило два класса багов:

1. Удержание `handle` после окончания `HandleScope`
2. Хранение raw pointer вместо handle

### Ограничение

Объекты, на которые потенциально указывают консервативные корни, **не могут быть перемещены** (только swept, не compacted). Это влияет на выбор стратегии для Young Gen.

### Interior pointers

Консервативный сканер может найти указатель **внутрь** объекта (например, на третий байт строки). GC должен уметь по внутреннему указателю найти начало объекта — для этого V8 поддерживает `object start bitmap` на каждой странице.

---

## Слабые ссылки: WeakRef, WeakMap, WeakSet, FinalizationRegistry

### WeakRef

```js
let target = { data: 'important' };
const weak = new WeakRef(target);

// Получаем объект (или undefined, если собран)
console.log(weak.deref()); // { data: 'important' }

target = null; // убираем сильную ссылку
// После GC:
// weak.deref() === undefined
```

`WeakRef.deref()` может вернуть объект даже после удаления сильных ссылок — GC может ещё не запуститься. Спецификация **не гарантирует** детерминированность сбора.

### WeakMap и WeakSet

```js
const metadata = new WeakMap();

function processNode(node) {
  metadata.set(node, { visitedAt: Date.now() });
}

// Когда node удалён из DOM и нет других ссылок,
// запись в WeakMap автоматически удаляется GC.
// Не нужно вызывать metadata.delete(node).
```

Ключевая семантика: ключи `WeakMap` — слабые ссылки. Если единственная ссылка на объект-ключ — это запись в `WeakMap`, объект может быть собран, и запись удалится.

### FinalizationRegistry

```js
const registry = new FinalizationRegistry((heldValue) => {
  console.log(`Объект с ID ${heldValue} собран GC`);
  // Очистка внешних ресурсов: закрытие файла, освобождение WASM-памяти
});

function createResource() {
  const resource = { /* ... */ };
  registry.register(resource, 'resource-42'); // heldValue = 'resource-42'
  return resource;
}

let res = createResource();
res = null;
// Когда-нибудь после GC: "Объект с ID resource-42 собран GC"
```

**Предупреждение**: callback `FinalizationRegistry` не гарантирован по времени. Не используйте для критической логики. Предназначен для best-effort cleanup.

---

## Ephemerons — внутренности WeakMap

### Что такое Ephemeron

`Ephemeron` — пара (key, value), где:
- **key** — слабая ссылка (не предотвращает GC)
- **value** — жив **только если key жив**

Это именно семантика `WeakMap`. Стандартный `Mark-Sweep` не может обработать это корректно без специальной поддержки.

### Проблема: порядок маркировки

```
WeakMap содержит:  key → value
key достижим через: root → A → key

Если маркировщик сначала посетил WeakMap (key ещё белый),
он не знает, будет ли key жив. Нельзя пометить value.
Если маркировщик позже пометит key через A → key,
нужно вернуться и пометить value.
```

### Решение V8: ephemeron worklist

1. При маркировке `WeakMap`: если key белый — пара (key, value) добавляется в `ephemeron worklist`
2. После основной маркировки: проход по ephemeron worklist. Если key теперь чёрный — value помечается как серый. Повторяем до стабилизации (`fixpoint iteration`)
3. Если key остался белый — пара удаляется

Это делает `WeakMap` дороже при GC, чем обычный `Map`, но гарантирует корректную семантику слабых ссылок на ключи с сильными ссылками на значения.

---

## Практические утечки памяти

### 1. Замыкания, удерживающие ненужные данные

```js
function createHandler() {
  const hugeData = new Array(1_000_000).fill('x'); // 8+ MB

  return function handler() {
    // handler НЕ использует hugeData,
    // но V8 создаёт общий Context для всех замыканий в функции
    console.log('handling');
  };
}

const h = createHandler();
// hugeData удерживается в памяти через Context замыкания!

// FIX: вынесите handler в отдельный scope
function createHandlerFixed() {
  const hugeData = loadData();
  const result = processData(hugeData);
  // hugeData выходит из scope

  return function handler() {
    console.log(result); // только result удерживается
  };
}
```

**Важно**: V8 оптимизирует замыкания и не включает в `Context` переменные, которые не используются ни одним из замыканий в scope. Но если хотя бы одно замыкание использует переменную — она удерживается для всех замыканий этого scope.

### 2. Event listeners

```js
// УТЕЧКА: listener не удалён → DOM-элемент и closure живут вечно
class Sidebar {
  constructor() {
    this.data = loadHeavyData(); // 50 MB
    window.addEventListener('resize', this.onResize.bind(this));
  }

  onResize() {
    // ...
  }

  // НУЖНО: метод очистки
  destroy() {
    window.removeEventListener('resize', this._boundResize);
  }
}

// ПРАВИЛЬНО: сохраняем ссылку на bound-функцию для последующего удаления
class SidebarFixed {
  constructor() {
    this.data = loadHeavyData();
    this._boundResize = this.onResize.bind(this);
    window.addEventListener('resize', this._boundResize);
  }

  destroy() {
    window.removeEventListener('resize', this._boundResize);
    this.data = null;
  }
}

// ЕЩЁ ЛУЧШЕ: AbortController (современный API)
class SidebarModern {
  constructor() {
    this.data = loadHeavyData();
    this.ac = new AbortController();
    window.addEventListener('resize', () => this.onResize(), {
      signal: this.ac.signal,
    });
  }

  destroy() {
    this.ac.abort(); // удаляет все listeners, зарегистрированные с этим signal
    this.data = null;
  }
}
```

### 3. Таймеры

```js
// УТЕЧКА: setInterval никогда не очищается
function startPolling(url) {
  const results = []; // растёт бесконечно

  setInterval(async () => {
    const data = await fetch(url).then(r => r.json());
    results.push(data); // results никогда не очищается
  }, 5000);
}

// FIX: возвращаем функцию очистки
function startPollingFixed(url) {
  const results = [];
  const id = setInterval(async () => {
    const data = await fetch(url).then(r => r.json());
    results.push(data);
    if (results.length > 100) results.splice(0, results.length - 100);
  }, 5000);

  return function stop() {
    clearInterval(id);
  };
}

const stopPolling = startPollingFixed('/api/status');
// Когда больше не нужно:
stopPolling();
```

### 4. Циклические ссылки (не проблема для Mark-Sweep, но...)

```js
// Mark-Sweep корректно обрабатывает циклы — это НЕ утечка:
function createCycle() {
  const a = {};
  const b = {};
  a.ref = b;
  b.ref = a;
  return; // a и b не достижимы из корней → будут собраны
}

// НО: цикл с привязкой к корню — утечка:
const registry = new Map();

function registerComponent(component) {
  const metadata = { component }; // metadata → component
  component.meta = metadata;       // component → metadata (цикл)
  registry.set(component.id, metadata); // корень (Map в глобальном scope)
  // Даже если component «удалён», registry удерживает metadata → component
}

// FIX: очищайте registry, или используйте WeakMap
const registryFixed = new WeakMap(); // ключ = component (слабая ссылка)
```

### 5. Detached DOM trees

```js
// УТЕЧКА: ссылка на удалённый DOM-элемент
let detachedTree;

function showOverlay() {
  const overlay = document.createElement('div');
  overlay.innerHTML = '<div class="content">Heavy content...</div>';
  document.body.appendChild(overlay);
  detachedTree = overlay; // глобальная ссылка
}

function hideOverlay() {
  detachedTree.remove(); // убрали из DOM, но переменная detachedTree → объект жив
  // detachedTree = null; // ← НУЖНО добавить!
}
```

---

## Профилирование и Heap Snapshots

### Инструменты

- **Chrome DevTools → Memory tab** — Heap Snapshot, Allocation timeline, Allocation sampling
- **Node.js** — `--inspect` + Chrome DevTools, или программно через `v8.writeHeapSnapshot()`
- **`process.memoryUsage()`** — быстрая проверка из кода

```js
// Программный heap snapshot в Node.js
const v8 = require('v8');
const fs = require('fs');

// Снимаем snapshot
const snapshotPath = v8.writeHeapSnapshot();
console.log(`Heap snapshot: ${snapshotPath}`);
// Открываем в Chrome DevTools → Memory → Load

// Мониторинг из кода
setInterval(() => {
  const mem = process.memoryUsage();
  console.log({
    rss: `${(mem.rss / 1024 / 1024).toFixed(1)} MB`,
    heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`,
    heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB`,
    external: `${(mem.external / 1024 / 1024).toFixed(1)} MB`,
  });
}, 10_000);
```

### Как искать утечки через Heap Snapshot

**Методика трёх снимков**:

1. Сделайте snapshot #1 (baseline)
2. Выполните подозрительное действие (открытие/закрытие модального окна, навигация)
3. Принудительно запустите GC (кнопка корзины в DevTools)
4. Сделайте snapshot #2
5. Повторите действие
6. GC → snapshot #3
7. Сравните snapshot #3 с #1 (`Comparison` view) — ищите объекты, чей `Delta` растёт

```
DevTools Memory tab:
  Snapshot #1: 12.3 MB
  Snapshot #2: 14.1 MB   (после действия)
  Snapshot #3: 15.9 MB   (после повторения)

  Comparison #3 vs #1:
  Constructor     | # Delta | Size Delta
  ────────────────|─────────|───────────
  (string)        | +2048   | +128 KB    ← подозрительно
  HTMLDivElement  | +50     | +25 KB     ← detached DOM nodes?
  EventListener   | +50     | +12 KB     ← listeners не удалены?
```

### Retainers — кто удерживает объект

В Heap Snapshot каждый объект показывает цепочку `retainers` — путь от корня до объекта. Это ответ на вопрос «почему объект не собран?».

```
Object @123456 (size: 1024)
  Retainers:
    cache in loadData @789 (context)
      handler in createHandler @456 (closure)
        listeners in EventTarget @111 (internal)
          window (root)
```

---

## Флаги V8 и числовые ориентиры

### Ключевые параметры

| Флаг | Описание | По умолчанию |
|------|----------|--------------|
| `--max-old-space-size=N` | Максимальный размер Old Space (MB) | ~1.5 GB (64-bit), ~512 MB (32-bit) |
| `--max-semi-space-size=N` | Размер одной semi-space в Young Gen (MB) | 1-8 MB (динамически, зависит от устройства) |
| `--expose-gc` | Доступ к `global.gc()` для принудительного GC | Выключено |
| `--trace-gc` | Логирование каждого GC-события в stderr | Выключено |
| `--max-heap-size=N` | Общий лимит кучи (MB) | Динамический |

```bash
# Увеличиваем Old Space до 4 GB для heavy Node.js приложения
node --max-old-space-size=4096 server.js

# Включаем trace GC для отладки
node --trace-gc app.js
# Вывод: [12345:0x1234]   100 ms: Scavenge 4.2 (5.0) -> 2.1 (6.0) MB, 1.2 / 0.0 ms ...

# Принудительный GC в тестах
node --expose-gc -e "global.gc(); console.log(process.memoryUsage())"
```

### Числовые ориентиры (V8, 2024)

- Young Generation (одна semi-space): **1-8 MB** (V8 автоматически подбирает)
- Minor GC (Scavenge) пауза: **< 1 мс** (параллельный)
- Major GC пауза (с incremental+concurrent): **< 5 мс** для типичного приложения
- Major GC пауза (stop-the-world finalize): **1-10 мс**
- Write Barrier overhead: **~1-2%** throughput
- Large Object threshold: **~256 KB** (объект сразу в Large Object Space)
- Промоция из Young в Old: после **2 циклов** Scavenge или при давлении to-space > 25%

---

## Особые случаи: строки, массивы, ArrayBuffer, модули

### Строки и String interning

```js
// V8 интернирует (deduplicate) строковые литералы
const a = 'hello';
const b = 'hello';
// a и b указывают на один и тот же объект в памяти

// Конкатенация создаёт ConsString (ленивая склейка)
const c = a + ' world';
// V8 хранит ConsString как дерево: ['hello', ' world']
// Фактическое объединение (flattening) происходит лениво при первом доступе

// Строки из external sources (JSON.parse, Buffer.toString) — не интернированы
// V8 может дедуплицировать их при GC (string deduplication в Old Gen)
```

### Массивы: packed vs holey

```js
const packed = [1, 2, 3];        // PACKED_SMI_ELEMENTS — оптимальный
const holey = [1, , 3];           // HOLEY_SMI_ELEMENTS — медленнее
packed[100] = 4;                   // Теперь HOLEY — потеря оптимизации навсегда

// Holey массивы используют больше памяти (dictionary mode для sparse)
// и GC обходит их медленнее
```

### ArrayBuffer и внешняя память

```js
// ArrayBuffer хранит данные во ВНЕШНЕЙ памяти (не в V8 heap)
const buf = new ArrayBuffer(1024 * 1024); // 1 MB external memory

// V8 учитывает external memory при расчёте давления на GC
// Если external memory растёт — GC запускается раньше

// SharedArrayBuffer — разделяемая память между Workers
// НЕ управляется GC одного Isolate — живёт, пока есть хотя бы один holder
```

### ES-модули

```js
// Модули загружаются один раз и кэшируются в Module Map
// Экспортированные значения живут до закрытия контекста (страницы/процесса)
// Это НЕ утечка — это особенность модульной системы

// Осторожно: не хранить тяжёлые данные на уровне модуля
// ПЛОХО:
export const allUsers = await db.query('SELECT * FROM users'); // живёт вечно

// ЛУЧШЕ:
export async function getUsers() {
  return db.query('SELECT * FROM users'); // данные живут пока есть ссылка
}
```

---

## GC в Web Workers и изоляция кучи

### Каждый Worker — отдельный Isolate

Каждый `Web Worker` (и `Worker Thread` в Node.js) имеет **собственный V8 Isolate** с отдельной кучей, отдельным GC и отдельными поколениями.

```js
// main.js
const worker = new Worker('worker.js');
worker.postMessage({ data: largeArray });
// largeArray КОПИРУЕТСЯ в кучу worker (structured clone)
// Две независимые копии в двух разных кучах

// Исключение: SharedArrayBuffer — одна область памяти, два holder
const sab = new SharedArrayBuffer(1024);
worker.postMessage(sab); // НЕ копируется — передаётся ссылка
```

### Последствия для GC

- GC в worker не блокирует главный поток
- GC в главном потоке не влияет на worker
- `postMessage` с transferable objects (`ArrayBuffer.transfer()`) перемещает данные без копирования — исходный `ArrayBuffer` становится detached (0 bytes)

```js
// Transfer вместо копирования
const buffer = new ArrayBuffer(10_000_000); // 10 MB
worker.postMessage(buffer, [buffer]); // transferred
console.log(buffer.byteLength); // 0 — buffer detached
```

---

## Сводная таблица алгоритмов

| Алгоритм | Область | Тип паузы | Характеристика |
|----------|---------|-----------|----------------|
| **Scavenge** (Cheney copy) | Young Gen | Stop-the-world (parallel) | Быстрый, копирует живые |
| **Mark-Sweep** | Old Gen | Incremental + concurrent | Помечает и освобождает мёртвые |
| **Mark-Compact** | Old Gen | Stop-the-world (parallel) | Уплотнение, борьба с фрагментацией |
| **Incremental marking** | Old Gen | Чередуется с JS | Маленькие шаги, Write Barrier |
| **Concurrent marking** | Old Gen | Фоновый поток | Параллельно с JS-кодом |
| **Concurrent sweeping** | Old Gen | Фоновый поток | Освобождение памяти без пауз |
| **Lazy sweeping** | Old Gen | On-demand | Освобождает по мере аллокации |
