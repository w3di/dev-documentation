# Конфигурация TypeScript — полное руководство

> Файл `tsconfig.json` — центральный элемент любого TypeScript-проекта. Он определяет,
> какие файлы компилировать, как проверять типы, в какой формат транспилировать и как
> разрешать модули. Глубокое понимание каждой опции отличает senior-разработчика от junior.

---

## Оглавление

1. [Структура tsconfig.json](#1-структура-tsconfigjson)
2. [Strict режим](#2-strict-режим)
3. [Целевая платформа (target и lib)](#3-целевая-платформа-target-и-lib)
4. [Модульная система (module и moduleResolution)](#4-модульная-система-module-и-moduleresolution)
5. [Пути и корневые директории](#5-пути-и-корневые-директории)
6. [Type Checking Options](#6-type-checking-options)
7. [Emit Options](#7-emit-options)
8. [Project References](#8-project-references)
9. [Рекомендуемые конфигурации](#9-рекомендуемые-конфигурации)

---

## 1. Структура tsconfig.json

### 1.1 Общая структура файла

`tsconfig.json` — это JSON-файл (с поддержкой комментариев — JSON with Comments, JSONC), располагающийся в корне проекта. TypeScript-компилятор (`tsc`) ищет его автоматически, поднимаясь от текущей директории вверх по файловой системе.

```jsonc
{
  // Наследование от базового конфига
  "extends": "./tsconfig.base.json",

  // Опции компилятора — основной блок
  "compilerOptions": {
    "target": "ES2022",
    "module": "node16",
    "strict": true,
    "outDir": "./dist"
  },

  // Какие файлы включать (glob-паттерны)
  "include": ["src/**/*.ts", "src/**/*.tsx"],

  // Какие файлы исключать
  "exclude": ["node_modules", "dist", "**/*.spec.ts"],

  // Явный список файлов (вместо include)
  "files": ["src/index.ts", "src/global.d.ts"],

  // Ссылки на другие проекты (для монорепозиториев)
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/utils" }
  ]
}
```

### 1.2 Приоритет include, exclude и files

| Поле        | Назначение                                     | Поведение по умолчанию                                |
| ----------- | ---------------------------------------------- | ----------------------------------------------------- |
| `files`     | Явный список файлов (абсолютные или относительные пути) | Не задано — используется `include`             |
| `include`   | Glob-паттерны для включения                    | `["**/*"]` — все `.ts`, `.tsx`, `.d.ts` файлы         |
| `exclude`   | Glob-паттерны для исключения                   | `["node_modules", "bower_components", "jspm_packages", outDir]` |

**Важно:** `files` имеет высший приоритет — файлы из `files` всегда включены, даже если попадают под `exclude`. Файлы, на которые ссылается `import` из включённых файлов, тоже попадут в компиляцию, независимо от `exclude`.

### 1.3 Наследование через extends

`extends` позволяет наследовать конфигурацию из другого файла. `compilerOptions` наследуются через поверхностное слияние (shallow merge) — дочерние опции дополняют и перезаписывают родительские.

Начиная с **TypeScript 5.0+**, поля `include`, `exclude`, `files` и `references` также **наследуются** из базового конфига, если они **не указаны** в дочернем. Если дочерний конфиг задаёт любое из этих полей, оно полностью **перезаписывает** (а не дополняет) значение из базового конфига.

> **До TS 5.0** эти поля действительно не наследовались — каждый конфиг должен был задавать их самостоятельно.

```jsonc
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "node16",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}

// tsconfig.json — наследует compilerOptions, переопределяя отдельные поля
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"  // добавляется к унаследованным опциям
  },
  "include": ["src"]
}
```

С TypeScript 5.0+ поддерживается массив в `extends` — множественное наследование (последний конфиг имеет наивысший приоритет):

```jsonc
{
  "extends": [
    "@tsconfig/node20/tsconfig.json",
    "./tsconfig.paths.json"
  ]
}
```

### 1.4 Шаблонная переменная `${configDir}` (TS 5.5+)

В TypeScript 5.5 появилась шаблонная переменная **`${configDir}`**, которая раскрывается в путь к директории, содержащей текущий `tsconfig.json`. Она решает давнюю проблему: относительные пути в `tsconfig.json` разрешались относительно **текущей рабочей директории (CWD)**, а не относительно самого файла конфигурации. Это приводило к ошибкам при наследовании через `extends`, когда базовый и дочерний конфиги находятся в разных директориях.

```jsonc
// configs/tsconfig.base.json
{
  "compilerOptions": {
    "outDir": "${configDir}/dist",      // → configs/dist
    "rootDir": "${configDir}/src",      // → configs/src
    "declarationDir": "${configDir}/types"
  }
}

// packages/api/tsconfig.json
{
  "extends": "../../configs/tsconfig.base.json",
  // ${configDir} теперь указывает на packages/api/, а не на configs/
  "compilerOptions": {
    "outDir": "${configDir}/dist"       // → packages/api/dist
  }
}
```

**Где использовать:** `${configDir}` работает в любых путях внутри `compilerOptions` — `outDir`, `rootDir`, `baseUrl`, `paths`, `declarationDir` и т.д. Это особенно полезно в монорепозиториях, где общий базовый конфиг наследуется пакетами из разных директорий.

### 1.5 Как TypeScript находит tsconfig.json

1. При запуске `tsc` без аргументов — ищет `tsconfig.json` в текущей директории и выше.
2. При запуске `tsc --project ./configs/tsconfig.build.json` — используется указанный файл.
3. При запуске `tsc file.ts` — `tsconfig.json` **игнорируется**, применяются настройки по умолчанию.

---

## 2. Strict режим

### 2.1 Флаг strict: true

Флаг `strict: true` — это **мета-флаг**, который включает все текущие strict-опции одновременно. С каждой новой версией TypeScript набор опций под `strict` может расширяться. Включение `strict: true` — обязательная практика для любого нового проекта.

```jsonc
{
  "compilerOptions": {
    "strict": true
    // Эквивалентно включению ВСЕХ нижеперечисленных флагов
  }
}
```

### 2.2 Все флаги strict-семейства

| Флаг                              | Что делает                                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `strictNullChecks`                | `null` и `undefined` — отдельные типы, не присваиваются к другим типам без явной проверки                      |
| `strictFunctionTypes`             | Контравариантная проверка параметров функций (более строгая типизация callback-ов)                              |
| `strictBindCallApply`             | Строгая типизация `Function.prototype.bind`, `.call`, `.apply`                                                 |
| `strictPropertyInitialization`    | Свойства класса должны быть инициализированы в конструкторе или при объявлении                                  |
| `noImplicitAny`                   | Запрет неявного `any` — компилятор требует явной аннотации, если не может вывести тип                          |
| `noImplicitThis`                  | Ошибка, если `this` имеет неявный тип `any`                                                                    |
| `useUnknownInCatchVariables`      | Переменная в `catch(e)` получает тип `unknown` вместо `any` (с TS 4.4)                                        |
| `alwaysStrict`                    | Добавляет `"use strict"` в начало каждого сгенерированного файла и парсит в strict mode                        |

### 2.3 Примеры каждого флага

```ts
// ── strictNullChecks ──
// БЕЗ флага: null/undefined присваиваются к любому типу (опасно!)
let name: string = null;      // OK без strictNullChecks
// С флагом:
let name: string = null;      // Error: Type 'null' is not assignable to type 'string'
let name: string | null = null; // OK — явный union

// ── strictFunctionTypes ──
type Handler = (event: MouseEvent) => void;
const handler: Handler = (event: Event) => {}; // Error: Event не является MouseEvent
// Без флага: бивариантная проверка — ошибки нет (unsound)

// ── strictBindCallApply ──
function multiply(a: number, b: number): number { return a * b; }
multiply.call(undefined, "5", 3); // Error: Argument of type 'string' is not assignable
// Без флага: аргументы call/apply/bind типизируются как any[]

// ── strictPropertyInitialization ──
class User {
  name: string;      // Error: Property 'name' has no initializer
  age: string;       // Error: не инициализировано в constructor
  id!: number;       // OK: definite assignment assertion (!)
  constructor() {
    this.name = "";   // если так — ошибки для name не будет
  }
}

// ── noImplicitAny ──
function parse(data) {}         // Error: Parameter 'data' implicitly has an 'any' type
function parse(data: unknown) {} // OK — явная аннотация

// ── noImplicitThis ──
function getYear() {
  return this.getFullYear(); // Error: 'this' implicitly has type 'any'
}
function getYear(this: Date) {
  return this.getFullYear(); // OK — явная аннотация this
}

// ── useUnknownInCatchVariables ──
try { /* ... */ } catch (e) {
  // С флагом: e — unknown, требуется проверка
  if (e instanceof Error) {
    console.log(e.message); // OK после narrowing
  }
}
```

### 2.4 Миграция на strict: true

Если проект начинался без `strict`, включать его сразу опасно — будут сотни ошибок. Рекомендуемая стратегия постепенной миграции:

1. Включить `strict: true`, затем **отключить** конкретные флаги, вызывающие ошибки.
2. Постепенно включать их один за другим, начиная с наименее болезненного (`alwaysStrict` → `strictBindCallApply` → `noImplicitThis` → `strictNullChecks`).
3. Использовать `// @ts-expect-error` для точечного подавления ошибок на время миграции.

```jsonc
// Постепенная миграция
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": false,              // выключим на первом этапе
    "strictPropertyInitialization": false    // зависит от strictNullChecks
  }
}
```

---

## 3. Целевая платформа (target и lib)

### 3.1 Опция target

`target` определяет, в какую версию ECMAScript будет **транспилирован** выходной JavaScript. Она влияет только на **синтаксис**, но не на доступные API.

| Target     | Ключевые трансформации                                                            |
| ---------- | --------------------------------------------------------------------------------- |
| `ES5`      | Arrow → function, class → prototype, template literal → конкатенация, spread → apply |
| `ES2015`   | Сохраняет class, arrow, template literal. Downlevel: async/await                  |
| `ES2016`   | `**` оператор                                                                     |
| `ES2017`   | Сохраняет async/await. Downlevel: for-await-of                                   |
| `ES2018`   | Async iteration, rest/spread properties                                           |
| `ES2019`   | Optional catch binding                                                            |
| `ES2020`   | `BigInt`, `??`, `?.`, `import.meta`                                               |
| `ES2021`   | `WeakRef`, `FinalizationRegistry`, `??=`, `||=`, `&&=`                            |
| `ES2022`   | Top-level await, class fields, `#private`, `.at()`, `Object.hasOwn`               |
| `ES2023`   | Array `findLast`/`findLastIndex`                                                  |
| `ES2024`   | `Object.groupBy`, `Map.groupBy`, `Promise.withResolvers`                          |
| `ESNext`   | Последняя доступная версия (зависит от версии TypeScript)                         |

**Важно:** `target` не добавляет полифилы. Если `target: "ES5"`, а код использует `Promise`, TypeScript сгенерирует код с `Promise`, но не добавит полифил — при запуске в IE будет `ReferenceError`.

### 3.2 Опция lib

`lib` определяет, какие **типы глобальных API** доступны в проекте. Если `lib` не указан, его значение по умолчанию определяется `target`:

```jsonc
// target: "ES2022" → lib по умолчанию: ["ES2022", "DOM", "DOM.Iterable"]
// Для Node.js — DOM не нужен:
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"]   // только ES API, без DOM
  }
}
```

Доступные библиотеки типов:

| lib                | Содержит                                                      |
| ------------------ | ------------------------------------------------------------- |
| `ES5`...`ES2024`   | Глобальные типы соответствующей версии ECMAScript             |
| `DOM`              | `window`, `document`, `HTMLElement`, `fetch`, `console` и др. |
| `DOM.Iterable`     | `NodeList.forEach`, итерация по DOM-коллекциям                |
| `DOM.AsyncIterable`| Async-итерация по DOM-потокам (ReadableStream)                |
| `WebWorker`        | API Web Worker (`self`, `postMessage`, `importScripts`)       |
| `Decorators`       | Типы для стандарта TC39 Decorators                            |
| `ESNext`           | Все экспериментальные типы последней версии                   |

### 3.3 Взаимодействие target и lib

`target` и `lib` — **независимые** опции, но путаница между ними — распространённая ошибка:

```jsonc
// Ошибка: target: "ES5", но используем Promise.allSettled (ES2020)
// TypeScript не выдаст ошибку, если lib включает ES2020
{
  "compilerOptions": {
    "target": "ES5",          // синтаксис → ES5
    "lib": ["ES2020", "DOM"]  // типы → ES2020 (Promise.allSettled доступен)
  }
}
// Код скомпилируется, но в рантайме упадёт без полифила!
```

**Правило:** `target` — какой синтаксис генерировать, `lib` — какие типы видны. При `target: "ES5"` с `lib: ["ES2020"]` ответственность за полифилы на разработчике (core-js, babel/polyfill).

---

## 4. Модульная система (module и moduleResolution)

### 4.1 Опция module

`module` определяет формат модульной системы **на выходе** — какой синтаксис `import`/`export` генерируется:

| Значение   | Выходной формат                                                                 |
| ---------- | ------------------------------------------------------------------------------- |
| `commonjs` | `require()` / `module.exports` — для Node.js (CJS)                             |
| `es2015`   | `import` / `export` — стандартные ES Modules                                    |
| `es2022`   | ES Modules + top-level `await`                                                  |
| `node16`   | CJS или ESM в зависимости от `.mts`/`.cts`/`package.json` `"type"`             |
| `nodenext` | Аналог `node16`, но следует за последней версией Node.js                        |
| `preserve` | Входной синтаксис import/export сохраняется без изменений (TS 5.4+)            |
| `esnext`   | Последний формат ES Modules                                                     |

### 4.2 Опция moduleResolution

`moduleResolution` определяет **алгоритм** поиска модулей при `import`:

| Значение    | Алгоритм                                                                             |
| ----------- | ------------------------------------------------------------------------------------ |
| `node10`    | Алгоритм Node.js v10 (legacy): `node_modules`, `index.js`, расширения `.ts`/`.js`   |
| `node16`    | Node.js v16+: поддержка `exports` в `package.json`, `.mts`/`.cts`, conditional exports |
| `nodenext`  | Аналог `node16`, следует за последней версией Node.js                                |
| `bundler`   | Для бандлеров (Webpack, Vite, esbuild): `exports`, bare imports без расширений       |
| `classic`   | Устаревший алгоритм TypeScript (не используйте)                                     |

### 4.3 Взаимодействие module и moduleResolution

Не все комбинации валидны. TypeScript подбирает `moduleResolution` автоматически, если не указан:

| `module`         | `moduleResolution` по умолчанию | Рекомендация                       |
| ---------------- | ------------------------------- | ---------------------------------- |
| `commonjs`       | `node10`                        | Устаревшее, для legacy-проектов    |
| `es2015`/`es2022`| `node10`                        | Плохо — укажите `bundler` явно     |
| `node16`         | `node16`                        | Для Node.js без бандлера           |
| `nodenext`       | `nodenext`                      | Для Node.js — актуальный вариант   |
| `preserve`       | `bundler`                       | Для проектов с бандлером (TS 5.4+) |

### 4.4 Рекомендуемые настройки по сценариям

```jsonc
// Node.js (современный, без бандлера)
{
  "compilerOptions": {
    "module": "node16",
    "moduleResolution": "node16"
  }
}

// Frontend с бандлером (Vite, Webpack, esbuild)
{
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler"
  }
}

// Библиотека, публикуемая в npm (dual CJS/ESM)
{
  "compilerOptions": {
    "module": "node16",
    "moduleResolution": "node16",
    "declaration": true
  }
}
```

---

## 5. Пути и корневые директории

### 5.1 baseUrl и paths

`baseUrl` задаёт корневую директорию для **неотносительных** импортов. `paths` — маппинг алиасов путей. **Важно:** начиная с TS 4.1, `paths` может использоваться **без** `baseUrl`.

```jsonc
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@app/*":    ["src/app/*"],
      "@shared/*": ["src/shared/*"],
      "@config":   ["src/config/index.ts"]
    }
  }
}
```

```ts
// Вместо:
import { UserService } from "../../../app/services/UserService";
// Можно:
import { UserService } from "@app/services/UserService";
```

**Критически важно:** `paths` влияет **только** на разрешение типов при компиляции. TypeScript **не переписывает** импорты в выходных файлах. Для работы в рантайме нужен бандлер (Webpack `resolve.alias`, Vite `resolve.alias`) или `tsconfig-paths` для Node.js.

### 5.2 rootDir и outDir

| Опция     | Назначение                                                                              |
| --------- | --------------------------------------------------------------------------------------- |
| `rootDir` | Корневая директория **исходных** файлов. Определяет структуру в `outDir`                |
| `outDir`  | Директория для **скомпилированных** файлов                                              |
| `rootDirs`| Массив директорий, которые объединяются в одну виртуальную директорию при разрешении     |

```
// Структура проекта:
project/
├── src/
│   ├── index.ts
│   └── utils/
│       └── helpers.ts
├── tsconfig.json
└── dist/          ← outDir

// tsconfig.json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  }
}

// Результат компиляции:
dist/
├── index.js       ← сохраняет структуру относительно rootDir
└── utils/
    └── helpers.js
```

Если `rootDir` не задан, TypeScript вычисляет его автоматически как самую длинную общую директорию всех входных файлов. Это может привести к неожиданной структуре в `outDir`, если файлы находятся в разных директориях.

### 5.3 rootDirs — виртуальное объединение директорий

`rootDirs` полезен, когда файлы из разных директорий должны видеть друг друга как если бы были в одной:

```jsonc
{
  "compilerOptions": {
    "rootDirs": ["src", "generated"]
  }
}
```

```ts
// src/app.ts может импортировать из generated/ как из своей директории:
import { Schema } from "./schema"; // файл в generated/schema.ts
```

---

## 6. Type Checking Options

### 6.1 Дополнительные проверки

Эти опции не входят в `strict`, но значительно повышают надёжность кода:

| Опция                              | Что делает                                                                                    | Рекомендация |
| ---------------------------------- | --------------------------------------------------------------------------------------------- | ------------ |
| `noUnusedLocals`                   | Ошибка при неиспользуемых локальных переменных                                                | Включить     |
| `noUnusedParameters`               | Ошибка при неиспользуемых параметрах функции                                                  | Включить     |
| `noImplicitReturns`                | Ошибка, если не все ветки функции возвращают значение                                         | Включить     |
| `noFallthroughCasesInSwitch`       | Ошибка при `case` без `break`/`return` в `switch`                                            | Включить     |
| `noUncheckedIndexedAccess`         | Индексный доступ к массивам/объектам добавляет `undefined` к типу                             | Включить     |
| `exactOptionalPropertyTypes`       | Разделяет `missing` и `undefined` для опциональных свойств                                    | Опционально  |

### 6.2 Примеры

```ts
// ── noUncheckedIndexedAccess ──
const arr: string[] = ["a", "b", "c"];
// БЕЗ флага:
const item: string = arr[10]; // OK, тип string (потенциальный undefined!)
// С флагом:
const item: string | undefined = arr[10]; // Правильный тип
// Необходима проверка:
if (arr[10] !== undefined) {
  const safeItem: string = arr[10]; // OK после narrowing
}

// ── exactOptionalPropertyTypes ──
interface Config {
  debug?: boolean;  // означает: свойство может отсутствовать
}
// БЕЗ флага:
const cfg: Config = { debug: undefined }; // OK
// С флагом:
const cfg: Config = { debug: undefined }; // Error! undefined !== missing
// Если нужен undefined:
interface Config {
  debug?: boolean | undefined; // явно разрешаем undefined
}

// ── noImplicitReturns ──
function getValue(x: number): string {
  if (x > 0) {
    return "positive";
  }
  // Error: Not all code paths return a value
}

// ── noUnusedParameters ──
function greet(name: string, _unused: number): string {
  // Префикс _ подавляет ошибку для неиспользуемого параметра
  return `Hello, ${name}`;
}
```

### 6.3 erasableSyntaxOnly (TS 5.8+)

`erasableSyntaxOnly: true` запрещает использование TypeScript-конструкций, которые имеют **runtime-семантику** и не могут быть удалены простым стиранием типов. Эта опция появилась для совместимости с инструментами, которые обрабатывают TypeScript путём **удаления аннотаций типов** без полноценной трансформации — например, Node.js с флагом `--experimental-strip-types`, Deno, а также быстрые транспиляторы (esbuild, SWC в определённых режимах).

Запрещённые конструкции при `erasableSyntaxOnly`:

```ts
// 1. Parameter properties — генерируют присваивание в конструкторе
class User {
  constructor(public name: string) {} // Error: не является erasable
}
// Fix:
class User {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

// 2. Enum — генерирует runtime-объект
enum Color { Red, Green, Blue } // Error: не является erasable
// Fix: используйте union type
type Color = "Red" | "Green" | "Blue";
// Или const object + type:
const Color = { Red: 0, Green: 1, Blue: 2 } as const;
type Color = (typeof Color)[keyof typeof Color];

// 3. Namespace с runtime-кодом (с функциями/переменными внутри)
namespace Utils {
  export function parse() {} // Error: namespace с runtime-кодом
}
// Fix: используйте обычные модули (import/export)

// Разрешено: namespace только с типами (полностью стирается)
namespace Types {
  export interface User { name: string }
}
```

```jsonc
{
  "compilerOptions": {
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true // обычно используются вместе
  }
}
```

**Когда включать:** если проект использует Node.js `--experimental-strip-types` (Node 22.6+) или другой TS-стриппер, который не выполняет трансформацию кода, а только удаляет типовые аннотации.

---

## 7. Emit Options

### 7.1 Генерация деклараций и source maps

| Опция                  | Что генерирует                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `declaration`          | `.d.ts` файлы — типы для потребителей библиотеки                                   |
| `declarationMap`       | `.d.ts.map` — source map для деклараций (Go to Definition в IDE ведёт к `.ts`)     |
| `sourceMap`            | `.js.map` — source map для отладки (breakpoints в исходном `.ts`)                  |
| `inlineSourceMap`      | Source map встроен в `.js` файл (без отдельного `.map`)                             |
| `emitDeclarationOnly`  | Генерирует только `.d.ts`, без `.js` (для случаев, когда JS собирает бандлер)      |
| `noEmit`               | Ничего не генерирует — только проверка типов (бандлер занимается транспиляцией)     |

```jsonc
// Библиотека: генерируем всё для потребителей
{
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist"
  }
}

// Frontend с Vite: только проверка типов, сборку делает Vite
{
  "compilerOptions": {
    "noEmit": true
  }
}

// Монорепозиторий: бандлер собирает JS, но нужны типы
{
  "compilerOptions": {
    "emitDeclarationOnly": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

### 7.2 isolatedModules

`isolatedModules: true` запрещает конструкции, которые невозможно обработать при **пофайловой** транспиляции (как делают Babel, esbuild, SWC). Это **обязательно**, если TypeScript не является основным транспилятором.

Запрещённые конструкции при `isolatedModules`:

```ts
// 1. Re-export типа без type keyword
export { SomeType } from "./types";     // Error
export type { SomeType } from "./types"; // OK

// 2. const enum (требует знания значений из другого файла)
const enum Color { Red, Green, Blue }   // Error (при isolatedModules)

// 3. Файлы без импортов/экспортов (не являются модулями)
// some-file.ts
const x = 1; // Error: файл не является модулем
export {};   // Fix: добавляем пустой экспорт
```

### 7.3 verbatimModuleSyntax

`verbatimModuleSyntax` (TS 5.0+) — замена `isolatedModules` + `importsNotUsedAsValues` + `preserveValueImports`. Правило простое: **что написано — то и остаётся в выходном файле**.

```ts
// С verbatimModuleSyntax: true
import type { User } from "./models";  // полностью удаляется (type-only)
import { type Role, createUser } from "./models"; // Role удаляется, createUser остаётся

// Без "type" — импорт сохраняется в выходном JS:
import { User } from "./models"; // Error, если User — только тип
```

**Рекомендация:** в новых проектах используйте `verbatimModuleSyntax` вместо `isolatedModules`.

### 7.4 isolatedDeclarations (TS 5.5+)

`isolatedDeclarations: true` требует, чтобы все **экспортируемые** значения имели **явные аннотации типов**, достаточные для генерации `.d.ts` файлов **без полноценного type-checking**. Это позволяет сторонним инструментам (esbuild, SWC, oxc и др.) генерировать файлы деклараций параллельно и независимо для каждого файла, без запуска полного компилятора TypeScript.

```ts
// ── С isolatedDeclarations: true ──

// Error: необходима явная аннотация возвращаемого типа
export function add(a: number, b: number) {
  return a + b;
}

// OK: тип возврата указан явно
export function add(a: number, b: number): number {
  return a + b;
}

// Error: тип переменной не может быть выведен без type-checking
export const config = getDefaultConfig();

// OK: явная аннотация
export const config: AppConfig = getDefaultConfig();

// OK: литеральные типы выводятся тривиально
export const MAX_RETRIES = 3;          // тип: 3
export const name = "app";             // тип: "app"
export const flags = [true, false];    // тип: boolean[]
```

```jsonc
{
  "compilerOptions": {
    "declaration": true,
    "isolatedDeclarations": true   // требует declaration или composite
  }
}
```

**Когда включать:** в монорепозиториях и крупных проектах, где скорость генерации деклараций критична. Позволяет распараллелить генерацию `.d.ts` между воркерами или использовать сторонние инструменты, не зависящие от `tsc`. Хорошо сочетается с `composite` и Project References.

---

## 8. Project References

### 8.1 Назначение

Project References позволяют разбить большой проект на **независимые подпроекты**, каждый со своим `tsconfig.json`. TypeScript компилирует их в правильном порядке на основе графа зависимостей и кэширует результат (инкрементальная компиляция).

### 8.2 Настройка

Каждый подпроект, на который ссылаются, должен включить `composite: true`:

```jsonc
// packages/core/tsconfig.json
{
  "compilerOptions": {
    "composite": true,     // обязательно для referenced project
    "declaration": true,   // composite включает автоматически
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

```jsonc
// packages/app/tsconfig.json (зависит от core)
{
  "compilerOptions": {
    "outDir": "./dist"
  },
  "references": [
    { "path": "../core" }
  ],
  "include": ["src"]
}
```

```jsonc
// tsconfig.json (корень монорепозитория)
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/app" }
  ]
}
```

### 8.3 Флаг composite

`composite: true` включает:
- **`declaration: true`** — автоматически (другие проекты читают `.d.ts`).
- **Incremental compilation** — TypeScript создаёт `.tsbuildinfo` файл с хешами, чтобы при повторной компиляции пересобирать только изменённые файлы.
- **Строгий `rootDir`** — все входные файлы должны быть под `rootDir`.

### 8.4 Build mode

```bash
# Собрать все проекты в правильном порядке зависимостей
tsc --build              # или tsc -b

# Принудительная полная пересборка
tsc --build --force

# Очистка артефактов сборки
tsc --build --clean

# Verbose — показать порядок сборки и что пропущено
tsc --build --verbose
```

**`tsc --build` vs `tsc`:** обычный `tsc` компилирует один проект. `tsc --build` анализирует граф зависимостей через `references` и собирает их в топологическом порядке. Если `packages/core` не изменился, он пропускается (благодаря `.tsbuildinfo`).

---

## 9. Рекомендуемые конфигурации

### 9.1 Node.js Backend

```jsonc
{
  "compilerOptions": {
    // Строгость
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    // Целевая платформа
    "target": "ES2022",
    "lib": ["ES2022"],

    // Модульная система
    "module": "node16",
    "moduleResolution": "node16",

    // Emit
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "declaration": true,

    // Совместимость
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### 9.2 React / Next.js Frontend

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,

    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],

    "module": "esnext",
    "moduleResolution": "bundler",

    "jsx": "react-jsx",
    "noEmit": true,                  // сборку делает Next.js / Vite

    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "isolatedModules": true,         // обязательно для Next.js / Vite
    "verbatimModuleSyntax": true,

    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "next-env.d.ts"],
  "exclude": ["node_modules"]
}
```

### 9.3 Библиотека для npm

```jsonc
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,

    "target": "ES2020",             // широкая совместимость
    "lib": ["ES2020"],

    "module": "node16",
    "moduleResolution": "node16",

    "declaration": true,            // .d.ts для потребителей
    "declarationMap": true,         // Go to Definition ведёт к исходникам
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",

    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 9.4 Монорепозиторий (корневой конфиг)

```jsonc
// tsconfig.base.json — общие настройки
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "target": "ES2022",
    "module": "node16",
    "moduleResolution": "node16",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "verbatimModuleSyntax": true
  }
}

// tsconfig.json — корневой orchestrator
{
  "files": [],
  "references": [
    { "path": "./packages/shared" },
    { "path": "./packages/api" },
    { "path": "./packages/web" }
  ]
}

// packages/api/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "references": [
    { "path": "../shared" }
  ],
  "include": ["src"]
}
```

**Ключевой принцип:** каждый пакет наследует `tsconfig.base.json`, переопределяя только `outDir`, `rootDir` и `references`. Сборка через `tsc --build` из корня пересобирает только изменённые пакеты.
