# Модульная система и Declaration файлы в TypeScript

> TypeScript расширяет ES Modules статической типизацией, добавляет type-only импорты,
> declaration файлы (.d.ts) и механизм module augmentation. Понимание этих инструментов —
> ключ к масштабируемой архитектуре типизированных проектов.

---

## Оглавление

1. [Модули в TypeScript](#1-модули-в-typescript)
2. [Type-only imports и exports](#2-type-only-imports-и-exports)
3. [Namespaces (пространства имён)](#3-namespaces-пространства-имён)
4. [Declaration файлы (.d.ts)](#4-declaration-файлы-dts)
5. [Module Augmentation](#5-module-augmentation)
6. [Module Resolution](#6-module-resolution)
7. [Global Types и Ambient Modules](#7-global-types-и-ambient-modules)
8. [Практические паттерны](#8-практические-паттерны)

---

## 1. Модули в TypeScript

### 1.1 Как TypeScript строится поверх ES Modules

TypeScript полностью поддерживает `import`/`export` и добавляет статическую проверку типов
при компиляции. Файл с `import` или `export` верхнего уровня — **модуль**. Без них — **скрипт**
(переменные попадают в глобальную область видимости).

```ts
// math.ts — модуль (есть export)
export function sum(a: number, b: number): number { return a + b; }
export const PI = 3.14159;

// app.ts — модуль (есть import)
import { sum, PI } from './math';
```

### 1.2 Module Detection

Параметр `moduleDetection` в `tsconfig.json` управляет стратегией определения:

| Значение | Поведение |
|---|---|
| `"auto"` (default) | Модуль, если есть `import`/`export`, или файл `.mts`/`.cts`, или `jsx: react-jsx` |
| `"legacy"` | Только `import`/`export` определяет модуль (поведение до TS 4.7) |
| `"force"` | **Все** файлы — модули, даже без `import`/`export` |

**Важно:** если файл должен быть модулем, но не имеет экспортов — добавьте `export {};`.

### 1.3 Side-effect imports и Re-exports

```ts
import './polyfills';              // side-effect: выполняет код, ничего не импортирует
import 'reflect-metadata';         // регистрирует глобальный API

// Re-exports — агрегация
export { UserService } from './user.service';
export type { User } from './types';             // re-export только типа
export { DatabaseService as DbService } from './database.service';
export * from './utils';                          // всё содержимое
export * as validators from './validators';       // namespace re-export (TS 3.8+)
```

---

## 2. Type-only imports и exports

### 2.1 Синтаксис `import type`

Явное указание, что импорт нужен **только для типов** — стирается при компиляции:

```ts
import type { User, Role } from './models';                  // полный type-only
import { createUser, type User, type Role } from './models'; // inline (TS 4.5+)
export type { User, Role };                                   // type-only export
```

### 2.2 Когда использовать

| Ситуация | `import type`? |
|---|---|
| `interface` / `type alias` | Да — рекомендуется, обязателен с `verbatimModuleSyntax` |
| `class` только как аннотация типа | Да — класс не попадёт в рантайм |
| `class` для `new` / `instanceof` | Нет — нужен value-import |
| `enum` для значений | Нет — enum существует в рантайме |
| `const enum` при `isolatedModules` | Да — inlining невозможен пофайлово |

### 2.3 `isolatedModules` и `verbatimModuleSyntax`

Флаг `isolatedModules: true` требует пофайловой транспиляции (Babel, esbuild, SWC). TS не знает,
является ли re-export типом или значением — нужен явный `export type`.

**`verbatimModuleSyntax` (TS 5.0+)** заменяет `isolatedModules` + `importsNotUsedAsValues`.
Простое правило: `import type` стирается, обычный `import` — остаётся в output:

```ts
// verbatimModuleSyntax: true
import type { User } from './models';   // ✅ стирается
import { type User } from './models';   // ✅ стирается
import { User } from './models';        // ❌ ошибка, если User — только тип
```

**Важно:** `verbatimModuleSyntax` — рекомендуемый подход для новых проектов с TS 5.0+.
Делает поведение транспиляции полностью детерминированным.

---

## 3. Namespaces (пространства имён)

### 3.1 Legacy `namespace`

До ES Modules TypeScript использовал `namespace` (ранее `module`). Компилируется в IIFE:

```ts
namespace Validation {
  export interface StringValidator { isValid(s: string): boolean; }
  export class EmailValidator implements StringValidator {
    isValid(s: string) { return /^[^@]+@[^@]+$/.test(s); }
  }
}
// → var Validation; (function(Validation) { ... })(Validation || (Validation = {}));
```

### 3.2 Когда namespaces полезны: Declaration Merging

```ts
// namespace + class — добавляет вложенные типы к классу
class Album { label: Album.AlbumLabel; }
namespace Album {
  export interface AlbumLabel { name: string; color: 'red' | 'blue'; }
}

// namespace + enum — добавляет методы к enum
enum Color { Red, Green, Blue }
namespace Color {
  export function mix(c1: Color, c2: Color): string { return `${Color[c1]}+${Color[c2]}`; }
}
Color.mix(Color.Red, Color.Blue); // "Red+Blue"
```

### 3.3 `namespace` vs Modules

| Характеристика | `namespace` | ES Modules |
|---|---|---|
| Стандарт | Проприетарный TS | ECMAScript |
| Tree-shaking | Невозможен (IIFE) | Полноценный |
| Code splitting | Нет | Нативная поддержка bundler-ами |
| Рекомендация | Только для merging и ambient | Использовать везде |

**Важно:** в современном TS `namespace` — **только** для declaration merging и ambient типов.

---

## 4. Declaration файлы (.d.ts)

### 4.1 Что такое и зачем

Declaration файлы содержат **только описания типов** без реализации: типизация JS-библиотек,
описание глобальных API, публикация типов, ускорение компиляции.

```ts
// math-lib.d.ts
declare function sum(a: number, b: number): number;
declare const VERSION: string;
declare interface MathConfig { precision: number; roundingMode: 'ceil' | 'floor' | 'round'; }
```

### 4.2 Ключевое слово `declare`

`declare` говорит TS: «сущность существует в рантайме, но определена вне текущей компиляции»:

```ts
declare const __DEV__: boolean;                                    // глобальная переменная
declare function fetch(url: string, init?: RequestInit): Promise<Response>; // функция
declare class EventEmitter {                                       // класс
  on(event: string, listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
}
declare module 'config' {                                          // целый модуль
  const config: { apiUrl: string; debug: boolean };
  export default config;
}
```

### 4.3 `declare module` и `declare global`

```ts
// Ambient module для ассетов
declare module '*.svg' { const content: string; export default content; }
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// declare global — расширение глобальной области из модуля
export {};
declare global {
  interface Window { analytics: { track(event: string): void }; }
  var __APP_VERSION__: string;
}
```

### 4.4 Triple-slash directives

XML-комментарии в **самом начале файла**, управляющие компиляцией:

```ts
/// <reference path="./global-types.d.ts" />     // включить файл деклараций
/// <reference types="node" />                    // подключить @types/node
/// <reference lib="es2023" />                    // подключить встроенную lib
/// <reference lib="webworker" />                 // для типизации Web Worker
```

**Важно:** обычно заменяются на `import`/`export` и настройки `tsconfig.json`. Актуальны для
`.d.ts` файлов и специальных окружений (Web Workers, Service Workers).

---

## 5. Module Augmentation

### 5.1 Расширение существующих модулей

Аугментация добавляет типы к существующим модулям без модификации исходников.
Работает только **из файла-модуля**:

```ts
// express-augmentation.d.ts
import 'express'; // делает файл модулем

declare module 'express' {
  interface Request {
    user?: { id: string; email: string; roles: string[] };
    requestId: string;
  }
}

// Теперь req.requestId и req.user доступны везде в проекте
```

### 5.2 Аугментация глобальной области

```ts
// env.d.ts
export {};
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      DATABASE_URL: string;
      PORT?: string;
    }
  }
}
// → process.env.DATABASE_URL типизирован как string
```

### 5.3 Правила Declaration Merging

| Что сливается | С чем | Результат |
|---|---|---|
| `interface` | `interface` | Объединённый интерфейс |
| `namespace` | `namespace` | Объединённый namespace |
| `namespace` | `class` / `function` / `enum` | Сущность с доп. свойствами |
| `class` | `interface` | Интерфейс дополняет instance-тип класса |
| `type alias` | Что угодно | **Нельзя** — `type` не участвует в merging |

**Важно:** `type alias` **никогда** не участвует в declaration merging.
Для расширяемых определений — используйте `interface`.

---

## 6. Module Resolution

### 6.1 Стратегии `moduleResolution`

| Стратегия | Версия TS | Когда использовать |
|---|---|---|
| `"classic"` | 1.0 | **Не использовать** — legacy |
| `"node"` / `"node10"` | 2.0 | Легаси Node.js (CJS) |
| `"node16"` / `"nodenext"` | 4.7 | Современный Node.js (ESM + CJS, поле `exports`) |
| `"bundler"` | 5.0 | Webpack, Vite, esbuild, Rollup |

### 6.2 `node16` vs `bundler`

```ts
// node16: расширение ОБЯЗАТЕЛЬНО в ESM (.mts)
import { sum } from './math.js';    // ✅ даже если исходник — .ts
import { sum } from './math';       // ❌ ошибка в ESM-контексте

// bundler: расширение опционально
import { sum } from './math';       // ✅
import { sum } from './math.js';    // ✅
```

| Характеристика | `node16` / `nodenext` | `bundler` |
|---|---|---|
| Расширения файлов | Обязательны в ESM | Опциональны |
| `package.json` `exports` | Полная поддержка | Полная поддержка |
| Условный экспорт | Учитывает контекст файла | Всегда `import` условие |
| Для кого | Чистый Node.js | Проекты с bundler |

### 6.3 `paths`, `baseUrl` и `rootDirs`

```jsonc
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@app/*": ["./app/*"],           // @app/services → ./src/app/services
      "@shared/*": ["./shared/*"],
      "config": ["./config/index.ts"]  // точный маппинг
    },
    "rootDirs": ["./src", "./generated"] // виртуальное объединение директорий
  }
}
```

**Важно:** `paths` работают **только для TS-компилятора**. В рантайме нужен `tsconfig-paths`,
алиасы Webpack/Vite или `tsc-alias` для пост-обработки.

---

## 7. Global Types и Ambient Modules

### 7.1 Глобальные декларации

Типы в файлах-скриптах (без `import`/`export`) автоматически глобальны:

```ts
// types/global.d.ts — файл-скрипт
type Nullable<T> = T | null;
type Optional<T> = T | undefined;

interface Result<T> { success: boolean; data: T; error?: string; }

// Расширение встроенных типов
interface ObjectConstructor {
  keys<T extends object>(o: T): Array<keyof T>;
}
// ⚠️ UNSOUND: эта перегрузка небезопасна. Из-за структурной типизации
// объект в рантайме может содержать больше ключей, чем объявлено в типе.
// Object.keys(obj) вернёт ВСЕ ключи, а не только keyof T.
// Используйте с осторожностью или предпочитайте явную типизацию.
```

Из файла-модуля используйте `declare global`:

```ts
import type { IncomingMessage } from 'http';
declare global {
  namespace Express { interface Locals { requestId: string; } }
  interface ErrorWithCode extends Error { code: string; statusCode: number; }
}
export {};
```

### 7.2 Ambient Modules для ассетов

```ts
// types/assets.d.ts — типы для нетипизированных ресурсов
declare module '*.png' { const src: string; export default src; }
declare module '*.svg' {
  import type { FC, SVGProps } from 'react';
  const ReactComponent: FC<SVGProps<SVGSVGElement>>;
  export default ReactComponent;
}
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
declare module '*.graphql' {
  import type { DocumentNode } from 'graphql';
  const value: DocumentNode;
  export default value;
}
```

### 7.3 Подключение `.d.ts` файлов

```jsonc
{
  "compilerOptions": {
    "typeRoots": ["./types", "./node_modules/@types"],
    "types": ["node", "jest"]           // подключать только эти @types
  },
  "include": ["src/**/*", "types/**/*.d.ts"]
}
```

**Важно:** wildcard ambient module (`*.png`) перехватывает **все** совпадающие пути.
TS не проверяет существование файлов — проверку выполняет bundler.

---

## 8. Практические паттерны

### 8.1 Barrel exports (index.ts)

```ts
// src/models/index.ts — barrel file
export { User } from './user.model';
export { Post } from './post.model';
export type { UserDTO, PostDTO } from './dto';
// → import { User, Post, type UserDTO } from '@app/models';
```

| Проблема barrel | Описание |
|---|---|
| Циклические зависимости | A re-экспортирует B, B импортирует из A |
| Tree-shaking деградация | Bundler не может вытряхнуть неиспользуемое |
| Замедление IDE | Большие barrel замедляют TS Language Server |

### 8.2 Types Package и Monorepo

```
packages/
├── shared-types/      # @company/shared-types
│   ├── package.json   # "types": "./dist/index.d.ts", "exports": { ".": { "types": ... } }
│   └── src/
├── backend/           # "dependencies": { "@company/shared-types": "workspace:*" }
└── frontend/
```

### 8.3 Project References для инкрементальной сборки

```jsonc
// packages/backend/tsconfig.json
{
  "compilerOptions": {
    "composite": true,      // ОБЯЗАТЕЛЬНО для project references
    "declaration": true,    // ОБЯЗАТЕЛЬНО — генерирует .d.ts
    "declarationMap": true  // навигация в IDE к исходникам
  },
  "references": [{ "path": "../shared-types" }]
}
```

Сборка через `tsc -b` компилирует только изменённые пакеты.

### 8.4 `@types/*` и DefinitelyTyped

Порядок резолюции типов TypeScript:

1. Встроенные типы (поле `types`/`typings` в `package.json`)
2. Поле `exports` → условие `"types"` в `package.json`
3. Пакет `@types/имя-библиотеки` из `node_modules/@types`
4. `typeRoots` из `tsconfig.json`

```ts
// Переопределение устаревших @types
declare module 'express' {
  interface Request { ip: string; } // уточнение: string, а не string | undefined
}
```

**Важно:** при публикации библиотеки **всегда** включайте типы в пакет (поле `"types"` или
`"exports"` → `"types"`). Это надёжнее отдельного `@types/*` — типы синхронизированы с кодом.
