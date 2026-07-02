# Hermes: JavaScript-движок React Native

> **Актуально для:** React Native 0.82-0.83 / Hermes 0.14.0

## Оглавление

1. [Что такое Hermes](#1-что-такое-hermes)
2. [Архитектура Hermes](#2-архитектура-hermes)
3. [Сравнение с JavaScriptCore](#3-сравнение-с-javascriptcore)
4. [Bytecode Compilation](#4-bytecode-compilation)
5. [Оптимизации Hermes](#5-оптимизации-hermes)
6. [Поддержка ECMAScript](#6-поддержка-ecmascript)
7. [Профилирование и отладка](#7-профилирование-и-отладка)
8. [Конфигурация](#8-конфигурация)
9. [Hermes и новая архитектура](#9-hermes-и-новая-архитектура)
10. [Hermes V1 (экспериментальный)](#10-hermes-v1-экспериментальный)

---

## 1. Что такое Hermes

Hermes — это JavaScript-движок, созданный Meta **специально для React Native**. Он оптимизирован для мобильных устройств: быстрый запуск, низкое потребление памяти, малый размер бинарника.

С React Native 0.70 Hermes стал движком по умолчанию. С React Native **0.81 JSC удалён из core** — Hermes является **единственным** JS-движком, поставляемым из коробки.

### Почему создали Hermes

Традиционные JS-движки (V8, JavaScriptCore) оптимизированы для **десктопных браузеров** с гигабайтами RAM и мощными CPU. На мобильных устройствах их подход (JIT-компиляция, большое потребление памяти) создаёт проблемы:

- **Долгий запуск**: JIT-движок должен распарсить и скомпилировать весь JS при старте
- **Высокое потребление RAM**: JIT-кеш и оптимизированный код занимают десятки MB
- **Большой размер приложения**: V8/JSC бинарники весят 5-10 MB

---

## 2. Архитектура Hermes

### AOT (Ahead-Of-Time) Compilation

Главное архитектурное отличие Hermes — компиляция JavaScript в **байткод на этапе сборки**, а не при запуске приложения:

```
Традиционный движок (V8/JSC):
┌─────────────┐   runtime    ┌─────────────┐   runtime    ┌───────────┐
│  JS Source  │ ──────────▶  │  Parse AST  │ ──────────▶  │  Execute  │
│  (.js)      │              │  + Compile  │              │  (JIT)    │
└─────────────┘              └─────────────┘              └───────────┘
                             ↑ это занимает время при запуске

Hermes (AOT):
┌─────────────┐  build time  ┌─────────────┐  runtime     ┌───────────┐
│  JS Source  │ ──────────▶  │  Hermes     │ ──────────▶  │  Execute  │
│  (.js)      │              │  Bytecode   │              │  (interp) │
└─────────────┘              │  (.hbc)     │              └───────────┘
                             └─────────────┘
                             ↑ сделано заранее, при сборке APK/IPA
```

### Pipeline

```
Source Code (.js/.ts)
       │
       ▼ Metro bundler
JavaScript Bundle (.js)
       │
       ▼ Hermes compiler (hermesc)
Hermes Bytecode (.hbc)
       │
       ▼ Упаковка в APK/IPA
       │
       ▼ Runtime: Hermes VM загружает .hbc
       │ Нет парсинга, нет компиляции — сразу выполнение
       ▼
  Выполнение байткода
```

### Отсутствие JIT

Hermes **не использует JIT-компиляцию**. Это сознательное решение:

- JIT требует **writable + executable** memory pages — запрещено на iOS
- JIT-кеш занимает значительную память
- JIT warm-up увеличивает TTI (Time to Interactive)
- AOT-байткод Hermes достаточно эффективен для типичных RN-задач

---

## 3. Сравнение с JavaScriptCore

| Характеристика             | Hermes                         | JavaScriptCore                   |
| -------------------------- | ------------------------------ | -------------------------------- |
| Компиляция                 | **AOT** (при сборке)           | JIT (при запуске)                |
| Время запуска              | **Быстрое** (~200ms vs ~800ms) | Медленнее                        |
| Потребление RAM            | **Ниже** (~30-50% меньше)      | Выше                             |
| Размер бинарника           | **Меньше**                     | Больше                           |
| Пиковая производительность | Ниже (нет JIT)                 | **Выше** (JIT-оптимизации)       |
| Дизайн                     | Для мобильных устройств        | Для десктопных браузеров         |
| Отладка                    | Chrome DevTools Protocol       | Safari DevTools (iOS)            |
| Статус в RN 0.82+          | **Единственный** из коробки    | Удалён из core (community-пакет) |

### Когда JSC может быть лучше

Для **CPU-intensive** задач (тяжёлые вычисления, крипто) JIT-движок может быть быстрее. Но для **типичных RN-приложений** (UI, сеть, навигация) Hermes выигрывает за счёт быстрого старта и экономии памяти.

---

## 4. Bytecode Compilation

### Формат .hbc

Hermes Bytecode (`.hbc`) — бинарный формат, содержащий:

- **Заголовок** — версия формата, хеши, metadata
- **Function Table** — список всех функций с offsets
- **String Table** — дедуплицированные строковые литералы
- **Bytecode Instructions** — регистровый байткод

```
.hbc файл:
┌──────────────────────────┐
│ Header (magic, version)  │
├──────────────────────────┤
│ Function Table           │
│  func_0: offset 0x100    │
│  func_1: offset 0x200    │
├──────────────────────────┤
│ String Table             │
│  "Hello" → id: 0         │
│  "World" → id: 1         │
├──────────────────────────┤
│ Bytecode                 │
│  LoadConstString r0, 0   │
│  Call1 r1, r2, r0        │
│  Ret r1                  │
└──────────────────────────┘
```

### Metro интеграция

Metro bundler автоматически вызывает `hermesc` (Hermes compiler) при release-сборке:

```
metro bundle → bundle.js → hermesc → bundle.hbc → APK/IPA
```

В debug-сборке используется **обычный JS** (без bytecode) для поддержки hot reload.

---

## 5. Оптимизации Hermes

### 5.1 Lazy Compilation

Hermes компилирует функции **лениво** — байткод функции загружается в память только при первом вызове. Для приложений с тысячами функций это экономит значительный объём RAM.

### 5.2 Регистровый байткод

Hermes использует **регистровую** архитектуру байткода (как Dalvik/ART), а не стековую (как JVM):

```
// Стековый байткод (JSC):
push 1
push 2
add        // pop 2, pop 1, push 3
store x    // pop 3, store to x

// Регистровый байткод (Hermes):
LoadConstInt r0, 1
LoadConstInt r1, 2
Add r2, r0, r1   // r2 = r0 + r1
// Меньше инструкций, меньше memory traffic
```

### 5.3 GenGC (Generational Garbage Collector)

Hermes использует generational GC:

- **Young Generation** — для короткоживущих объектов (большинство). Minor GC — быстрый, ~1-2ms
- **Old Generation** — для долгоживущих объектов. Major GC — редкий, но дольше

```
Allocation → Young Gen (nursery)
                 │
          Minor GC (быстрый)
                 │
         Выжившие объекты → Old Gen
                                │
                         Major GC (редкий)
```

### 5.4 Оптимизация строк

Hermes оптимизирует хранение строк:
- **String deduplication** — одинаковые строки хранятся в одном экземпляре
- **Lazy UTF-16** — строки хранятся как ASCII и конвертируются в UTF-16 только при необходимости
- **String Table** в .hbc — строковые литералы дедуплицированы на этапе компиляции

---

## 6. Поддержка ECMAScript

Hermes поддерживает подавляющее большинство фич ES2015+ (ES6+):

| Фича | Поддержка |
|------|-----------|
| `let`/`const` | Да |
| Arrow functions | Да |
| Classes | Да |
| Template literals | Да |
| Destructuring | Да |
| Spread/Rest | Да |
| `async`/`await` | Да |
| `Promise` | Да |
| `Map`/`Set`/`WeakMap`/`WeakSet` | Да |
| `Symbol` | Да |
| `Proxy`/`Reflect` | Да |
| `for...of` | Да |
| Optional chaining (`?.`) | Да |
| Nullish coalescing (`??`) | Да |
| `globalThis` | Да |
| `Intl` | Частичная (зависит от сборки) |
| `eval()` | Ограничена (нет доступа к local scope) |

### Проверка поддержки

```js
// Проверка, работает ли Hermes
const isHermes = () => !!global.HermesInternal;

if (isHermes()) {
  console.log('Running on Hermes');
}
```

---

## 7. Профилирование и отладка

### Chrome DevTools Protocol

Hermes поддерживает отладку через **React Native DevTools** (Chrome DevTools Protocol):

- **Console** — логи и ошибки
- **Breakpoints** — точки останова в JS коде
- **Step debugging** — пошаговое выполнение
- **Network inspection** — сетевые запросы

Доступ: Dev Menu → "Open DevTools" или нажать `j` в CLI терминале.

### Hermes Sampling Profiler

Для профилирования производительности:

```js
// Запуск профилирования
HermesInternal.enableSamplingProfiler();

// ... выполнение кода ...

// Остановка и сохранение
HermesInternal.disableSamplingProfiler();
HermesInternal.dumpSampledTraceToFile('/path/to/trace.cpuprofile');
```

Результат открывается в Chrome DevTools → Performance → Load profile.

### Heap Snapshots

```js
// Создание снимка кучи для анализа утечек памяти
HermesInternal.createHeapSnapshot('/path/to/heap.heapsnapshot');
```

---

## 8. Конфигурация

### Hermes — единственный движок из коробки

С React Native 0.81+ JSC удалён из core. Hermes — единственный JS-движок, поставляемый с React Native. Отключить его нельзя без установки альтернативного движка.

Для использования JSC необходим community-пакет `@react-native-community/javascriptcore` (поддерживает только New Architecture).

### Release vs Debug

| Режим | JS формат | Особенности |
|-------|-----------|-------------|
| Debug | Обычный JS (.js) | Hot reload, DevTools, source maps |
| Release | Hermes Bytecode (.hbc) | AOT-компиляция, максимальная производительность |

**Критически важно**: **всегда тестируйте производительность в release build**. Debug-режим не использует bytecode и работает значительно медленнее.

---

## 9. Hermes и новая архитектура

### JSI интеграция

Hermes реализует интерфейс `jsi::Runtime`, что позволяет новой архитектуре работать через JSI:

```
Hermes Runtime (implements jsi::Runtime)
       │
       ├── Turbo Native Modules
       │   JS вызывает C++ напрямую через JSI
       │
       ├── Fabric Renderer
       │   Создание C++ Shadow Tree
       │
       └── Host Objects
           Нативные объекты, доступные из JS
```

### Преимущества связки Hermes + JSI

1. **Единый C++ слой** — Hermes и JSI оба написаны на C++, минимальный overhead при вызовах
2. **Прямой доступ к памяти** — JSI Host Objects могут работать с Hermes heap напрямую
3. **Совместимая версия** — React Native поставляет Hermes и JSI вместе, гарантируя совместимость
4. **Абстракция** — при необходимости можно заменить Hermes на другой движок, реализующий `jsi::Runtime`

---

## 10. Hermes V1 (экспериментальный)

> Доступен с RN 0.82 как opt-in. Не путать со Static Hermes — это другой проект.

Hermes V1 — экспериментальная новая версия движка с улучшенной производительностью.

### Замеры (приложение Expensify)

```
Android (low-end устройство):
  Bundle Load: ↓ 3.2% быстрее
  TTI:         ↓ 7.6% быстрее

iOS:
  Bundle Load: ↓ 9% быстрее
  TTI:         ↓ 2.5% быстрее
```

### Как включить

**Android** (`android/gradle.properties`):

```properties
hermesV1Enabled=true
```

**iOS:**

```bash
RCT_HERMES_V1_ENABLED=1 bundle exec pod install
```

### Проверка версии

```javascript
const props = HermesInternal.getRuntimeProperties();
console.log(props['OSS Release Version']);
// Hermes V1: "250829098.x.x"
// Обычный Hermes: "0.14.0"
```

### Что НЕ включает Hermes V1

- **Static Hermes** (компиляция JS → нативный код) — отдельный экспериментальный проект
- **JIT-компиляция** — Hermes V1 по-прежнему AOT-only интерпретатор
