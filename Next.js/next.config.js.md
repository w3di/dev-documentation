# next.config.js — полное руководство по конфигурации Next.js

> `next.config.js` — центральный файл конфигурации Next.js, расположенный в корне проекта. Он управляет поведением сборки, маршрутизации, оптимизации изображений, переадресаций и множества других аспектов приложения.

---

## Оглавление

1. [Обзор — формат файла, ES modules, TypeScript](#1-обзор)
2. [Основные опции — reactStrictMode, env, basePath, trailingSlash, output](#2-основные-опции)
3. [Images — remotePatterns, formats, deviceSizes, loader](#3-images)
4. [Redirects — source, destination, permanent, has](#4-redirects)
5. [Rewrites — beforeFiles, afterFiles, fallback](#5-rewrites)
6. [Headers — custom HTTP headers, security, CORS](#6-headers)
7. [Webpack — кастомизация webpack config](#7-webpack)
8. [Turbopack — конфигурация Turbopack](#8-turbopack)
9. [Environment Variables — .env, NEXT_PUBLIC_, runtime vs build-time](#9-environment-variables)
10. [Output modes — standalone, export](#10-output-modes)

---

## 1. Обзор

### Формат файла

`next.config.js` — обычный Node.js модуль (не JSON). Используется на этапе сборки и серверного запуска, не попадает в клиентский бандл.

```js
// next.config.js (CommonJS — по умолчанию)
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig
```

### ES Modules

Для использования `import` / `export` переименуйте файл в `next.config.mjs`:

```js
// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

export default nextConfig
```

> Расширения `.cjs` и `.cts` **не поддерживаются**.

### TypeScript (next.config.ts)

Next.js поддерживает конфигурацию на TypeScript:

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
}

export default nextConfig
```

### Функция-конфигурация

Конфигурация может быть функцией, которая принимает `phase` и `defaultConfig`:

```js
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

module.exports = (phase, { defaultConfig }) => {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return { /* опции только для dev */ }
  }
  return { /* опции для production */ }
}
```

Доступные phases: `PHASE_DEVELOPMENT_SERVER`, `PHASE_PRODUCTION_BUILD`, `PHASE_PRODUCTION_SERVER`, `PHASE_EXPORT`.

Поддерживаются **async-функции** (начиная с Next.js 12.1.0):

```js
module.exports = async (phase) => {
  const config = await loadExternalConfig()
  return { ...config, reactStrictMode: true }
}
```

---

## 2. Основные опции

| Опция | Тип | По умолчанию | Описание |
|-------|-----|-------------|----------|
| `reactStrictMode` | `boolean` | `false` | Включает React Strict Mode для обнаружения проблем |
| `env` | `object` | `{}` | Переменные окружения, доступные на этапе сборки |
| `basePath` | `string` | `''` | Базовый путь для всего приложения (например, `'/app'`) |
| `trailingSlash` | `boolean` | `false` | Добавляет `/` в конец URL маршрутов |
| `output` | `string` | — | Режим сборки: `'standalone'` или `'export'` |
| `compress` | `boolean` | `true` | Gzip-сжатие ответов |
| `poweredByHeader` | `boolean` | `true` | Добавляет заголовок `x-powered-by` |
| `generateBuildId` | `function` | — | Кастомный Build ID для multi-instance deployments |
| `distDir` | `string` | `'.next'` | Директория для артефактов сборки |

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/docs',
  trailingSlash: true,
  poweredByHeader: false,
  compress: true,
  generateBuildId: async () => process.env.GIT_HASH || 'default-id',
}

module.exports = nextConfig
```

---

## 3. Images

Конфигурация `next/image` для оптимизации изображений.

```js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        port: '',
        pathname: '/images/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60, // секунды
    unoptimized: false,
  },
}
```

| Параметр | Описание |
|----------|----------|
| `remotePatterns` | Массив разрешённых паттернов для remote images (protocol, hostname, port, pathname) |
| `formats` | Форматы оптимизации в порядке приоритета |
| `deviceSizes` | Breakpoints для `sizes` prop (responsive images) |
| `imageSizes` | Размеры для фиксированных изображений |
| `minimumCacheTTL` | TTL кэша оптимизированных изображений в секундах |
| `loader` | Кастомный loader (`'default'`, `'custom'`, `'akamai'`, `'cloudinary'`, `'imgix'`) |
| `unoptimized` | Отключает оптимизацию (полезно при внешнем CDN) |

### Кастомный loader

```js
module.exports = {
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.js',
  },
}
```

```js
// lib/image-loader.js
export default function cloudinaryLoader({ src, width, quality }) {
  return `https://res.cloudinary.com/demo/image/upload/w_${width},q_${quality || 75}/${src}`
}
```

---

## 4. Redirects

Серверные перенаправления, выполняемые **до** обработки маршрута.

```js
module.exports = {
  async redirects() {
    return [
      {
        source: '/old-blog/:slug',
        destination: '/blog/:slug',
        permanent: true, // 308 (true) или 307 (false)
      },
      {
        source: '/docs/:path*',
        destination: 'https://docs.example.com/:path*',
        permanent: false,
      },
    ]
  },
}
```

### Условные redirects с `has` / `missing`

```js
{
  source: '/dashboard',
  destination: '/login',
  permanent: false,
  has: [
    { type: 'cookie', key: 'auth', value: undefined }, // cookie отсутствует
  ],
  // или missing:
  missing: [
    { type: 'cookie', key: 'session' },
  ],
}
```

| Тип условия | Описание |
|-------------|----------|
| `header` | Наличие/значение HTTP-заголовка |
| `cookie` | Наличие/значение cookie |
| `query` | Наличие/значение query parameter |
| `host` | Значение hostname |

---

## 5. Rewrites

Rewrites маппят входящий URL на другой путь **без изменения URL в браузере**.

```js
module.exports = {
  async rewrites() {
    return {
      beforeFiles: [
        // Проверяются ДО файловых маршрутов и public/
        { source: '/api/:path*', destination: 'https://api.example.com/:path*' },
      ],
      afterFiles: [
        // Проверяются ПОСЛЕ файловых маршрутов, но ДО динамических
        { source: '/docs/:slug', destination: '/documentation/:slug' },
      ],
      fallback: [
        // Проверяются ПОСЛЕ всех маршрутов (включая динамические и catch-all)
        { source: '/:path*', destination: 'https://legacy.example.com/:path*' },
      ],
    }
  },
}
```

Если `rewrites` возвращает **массив** (не объект), все правила применяются как `afterFiles`.

### Типичные сценарии

- **API proxy** — проксирование запросов к внешнему API без CORS
- **Multi-zone** — объединение нескольких Next.js приложений под одним доменом
- **Legacy migration** — постепенная миграция со старого приложения

---

## 6. Headers

Добавление кастомных HTTP-заголовков к ответам.

```js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: 'https://example.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}
```

### Рекомендуемые security headers

| Заголовок | Значение | Назначение |
|-----------|----------|------------|
| `X-Frame-Options` | `DENY` | Защита от clickjacking |
| `X-Content-Type-Options` | `nosniff` | Запрет MIME-sniffing |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Принудительный HTTPS |
| `Content-Security-Policy` | Зависит от приложения | Защита от XSS и инъекций |
| `X-Accel-Buffering` | `no` | Включение streaming через nginx |

---

## 7. Webpack

Кастомизация webpack config через функцию.

```js
module.exports = {
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Добавление плагина
    config.plugins.push(new webpack.DefinePlugin({
      'process.env.BUILD_ID': JSON.stringify(buildId),
    }))

    // Добавление loader для SVG
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    })

    // Замена модуля для клиента
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
      }
    }

    return config
  },
}
```

| Параметр callback | Описание |
|-------------------|----------|
| `config` | Текущий webpack config |
| `buildId` | Уникальный ID сборки |
| `dev` | `true` в режиме разработки |
| `isServer` | `true` при серверной сборке |
| `defaultLoaders` | Встроенные loaders (`babel`) |
| `webpack` | Инстанс webpack |

> **Важно:** изменения webpack config не покрываются semver — обновляйте осторожно.

---

## 8. Turbopack

Turbopack — Rust-based bundler, заменяющий webpack в dev-режиме (`next dev --turbopack`). Конфигурация через ключ `turbopack` в `next.config.js`:

```js
module.exports = {
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
    resolveAlias: {
      underscore: 'lodash',
    },
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
}
```

| Параметр | Описание |
|----------|----------|
| `rules` | Маппинг file patterns на loaders (аналог webpack rules) |
| `resolveAlias` | Алиасы модулей |
| `resolveExtensions` | Расширения для автоматического разрешения импортов |

### Кэширование Turbopack (experimental)

```js
module.exports = {
  turbopackFileSystemCache: true, // Кэширование на файловой системе для быстрых рестартов
}
```

---

## 9. Environment Variables

### .env файлы

Next.js загружает переменные окружения из файлов в корне проекта:

| Файл | Приоритет | Когда загружается |
|------|-----------|-------------------|
| `.env` | Низкий | Всегда |
| `.env.local` | Высокий | Всегда (кроме `test`) |
| `.env.development` | Средний | `next dev` |
| `.env.production` | Средний | `next build` / `next start` |
| `.env.test` | Средний | При `NODE_ENV=test` |

### Префикс NEXT_PUBLIC_

Переменные **без** префикса доступны только на сервере. Для клиентского доступа используйте `NEXT_PUBLIC_`:

```bash
# .env
DATABASE_URL=postgresql://localhost:5432/mydb    # только сервер
NEXT_PUBLIC_API_URL=https://api.example.com      # доступна и на клиенте
```

```tsx
// Server Component — оба доступны
const dbUrl = process.env.DATABASE_URL
const apiUrl = process.env.NEXT_PUBLIC_API_URL

// Client Component — только NEXT_PUBLIC_
const apiUrl = process.env.NEXT_PUBLIC_API_URL
```

### Runtime vs Build-time

`NEXT_PUBLIC_` переменные **инлайнятся** при `next build`. Для динамических серверных переменных используйте `connection()`:

```tsx
import { connection } from 'next/server'

export default async function Page() {
  await connection() // opt into dynamic rendering
  const secret = process.env.SECRET_KEY // читается в runtime
  return <p>Configured</p>
}
```

### Переменные через next.config.js

```js
module.exports = {
  env: {
    APP_VERSION: '1.2.3',
    CUSTOM_KEY: 'value',
  },
}
```

> Переменные из `env` в конфиге инлайнятся при сборке — как `NEXT_PUBLIC_`.

---

## 10. Output modes

### standalone

Создаёт **минимальный самодостаточный** серверный бандл без `node_modules`:

```js
module.exports = {
  output: 'standalone',
}
```

После `next build` создаётся `.next/standalone/` с `server.js` — готовый Node.js сервер:

```bash
node .next/standalone/server.js
```

**Преимущества:** идеален для Docker — образ содержит только необходимые файлы, размер уменьшается на порядок.

> `public/` и `.next/static/` не включаются в standalone — обслуживайте их через CDN или копируйте вручную.

### export (Static Export)

Генерирует полностью статический сайт из HTML/CSS/JS файлов:

```js
module.exports = {
  output: 'export',
}
```

**Ограничения static export:**
- Нет Server Components с динамическим рендерингом
- Нет API Routes
- Нет Middleware
- Нет ISR / revalidation
- Нет `next/image` с default loader (нужен кастомный)
- Нет `cookies()` / `headers()` / `redirect()` на сервере

**Подходит для:** документация, лендинги, SPA — любой сайт, который может быть pre-rendered полностью.

```bash
next build    # генерирует out/ с HTML файлами
# Деплой содержимого out/ на любой static hosting (Nginx, S3, GitHub Pages)
```

---

**См. также:** [[Deployment]], [[API Reference/API Reference]], [[Server и Client Components]]
