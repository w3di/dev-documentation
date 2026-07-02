# Deployment — деплой и self-hosting Next.js приложений

> Next.js может быть развёрнут как Node.js сервер, Docker-контейнер, статический экспорт или через адаптеры для различных платформ. Выбор стратегии определяет доступный набор фич и архитектуру инфраструктуры.

---

## Оглавление

1. [Vercel — нативная платформа](#1-vercel)
2. [Self-hosting с Node.js](#2-self-hosting-с-nodejs)
3. [Docker](#3-docker)
4. [Static Export](#4-static-export)
5. [Edge Runtime](#5-edge-runtime)
6. [Environment Variables в production](#6-environment-variables-в-production)
7. [Кэширование и CDN](#7-кэширование-и-cdn)
8. [CI/CD](#8-cicd)
9. [Мониторинг](#9-мониторинг)

---

## 1. Vercel

Vercel — нативная платформа от создателей Next.js с **zero-config deployment**.

### Ключевые возможности

- Автоматический деплой при push в Git-репозиторий
- Preview deployments для каждого pull request
- Edge Functions и Edge Middleware из коробки
- ISR, Server Components, Streaming — всё поддерживается нативно
- Встроенная аналитика, Web Vitals, Speed Insights
- Автоматический CDN и кэширование

### Деплой

```bash
# Установка CLI
npm i -g vercel

# Деплой из директории проекта
vercel

# Production deploy
vercel --prod
```

Или через GitHub/GitLab/Bitbucket интеграцию — каждый push в `main` автоматически деплоит в production.

| Фича | Поддержка |
|------|-----------|
| Server Components | Полная |
| ISR / Revalidation | Полная |
| Middleware | Edge Runtime |
| Image Optimization | Встроенная |
| Streaming | Полная |
| Static Export | Полная |

---

## 2. Self-hosting с Node.js

### Стандартный запуск

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

```bash
npm run build    # Сборка production-бандла
npm run start    # Запуск Node.js сервера (по умолчанию порт 3000)

# Кастомный порт и хост
PORT=8080 HOSTNAME=0.0.0.0 next start
```

`next start` поддерживает **все** возможности Next.js: Server Components, ISR, Middleware, Image Optimization, Streaming.

### Standalone output

Для минимального production-деплоя используйте `output: 'standalone'`:

```js
// next.config.js
module.exports = {
  output: 'standalone',
}
```

После `next build` создаётся `.next/standalone/` — самодостаточный сервер без `node_modules`:

```bash
# Скопировать static assets (не включены в standalone)
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static

# Запуск
node .next/standalone/server.js
```

> **Важно:** `standalone` значительно уменьшает размер деплоя — включает только необходимые файлы, определённые через `@vercel/nft` (Node File Tracing).

### Custom server

Для полного контроля над HTTP-сервером:

```js
// server.js
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(3000, () => {
    console.log('> Ready on http://localhost:3000')
  })
})
```

### Reverse proxy

При self-hosting рекомендуется использовать **reverse proxy** (nginx, Caddy) перед Next.js:

```nginx
# nginx.conf
upstream nextjs {
  server 127.0.0.1:3000;
}

server {
  listen 80;
  server_name example.com;

  location / {
    proxy_pass http://nextjs;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # Streaming support
  location /_next/ {
    proxy_pass http://nextjs;
    proxy_buffering off;  # Важно для streaming!
  }
}
```

---

## 3. Docker

### Базовый Dockerfile с standalone output

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем только необходимое из standalone
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### Best practices для Docker

| Практика | Описание |
|----------|----------|
| Multi-stage builds | Разделение установки зависимостей, сборки и runtime |
| `output: 'standalone'` | Минимальный размер образа (~100-200MB вместо 1GB+) |
| Non-root user | Запуск от непривилегированного пользователя |
| `.dockerignore` | Исключение `node_modules`, `.next`, `.git` |
| Layer caching | `package.json` копируется первым для кэширования `npm ci` |
| Alpine images | Минимальный базовый образ |

### .dockerignore

```
node_modules
.next
.git
*.md
.env.local
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  nextjs:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://db:5432/mydb
      - NEXT_PUBLIC_API_URL=https://api.example.com
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

---

## 4. Static Export

Полностью статический сайт без сервера.

```js
// next.config.js
module.exports = {
  output: 'export',
}
```

```bash
next build    # Генерирует out/ со статическими HTML файлами
```

### Ограничения

| Фича | Поддержка |
|------|-----------|
| Server Components (static) | Да |
| Client Components | Да |
| Image Optimization (default loader) | Нет (нужен кастомный) |
| API Routes | Нет |
| Middleware | Нет |
| ISR / revalidation | Нет |
| `cookies()` / `headers()` | Нет |
| Dynamic rendering | Нет |

### Hosting

Статический экспорт можно разместить на любом static hosting:

```bash
# AWS S3 + CloudFront
aws s3 sync out/ s3://my-bucket --delete

# Nginx
server {
  listen 80;
  root /var/www/nextjs/out;
  location / {
    try_files $uri $uri.html $uri/ /404.html;
  }
}

# GitHub Pages — через GitHub Actions
```

---

## 5. Edge Runtime

Edge Runtime — облегчённая среда исполнения, оптимизированная для низкой задержки. Использует **подмножество** Node.js API.

### Middleware

Middleware всегда выполняется на Edge Runtime:

```tsx
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Geolocation-based routing
  const country = request.geo?.country || 'US'
  if (country === 'RU') {
    return NextResponse.redirect(new URL('/ru', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|favicon.ico).*)'],
}
```

### Route Handlers на Edge

```tsx
// app/api/hello/route.ts
export const runtime = 'edge'

export async function GET(request: Request) {
  return new Response(JSON.stringify({ message: 'Hello from Edge!' }), {
    headers: { 'content-type': 'application/json' },
  })
}
```

| Доступно на Edge | Недоступно на Edge |
|------------------|--------------------|
| `fetch`, `Request`, `Response` | `fs`, `child_process` |
| `crypto`, `TextEncoder/Decoder` | Нативные Node.js модули |
| `URLSearchParams`, `URL` | `require()` для нативных модулей |
| Web Streams API | Большинство npm-пакетов с native bindings |

---

## 6. Environment Variables в production

### Runtime vs Build-time

```
┌─────────────────────────────────────────────────────┐
│  Build-time (next build)                            │
│  ┌───────────────────────────────────────────────┐  │
│  │ NEXT_PUBLIC_*  → инлайнятся в JS бандл        │  │
│  │ env в next.config.js → инлайнятся в JS бандл  │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  Runtime (next start)                               │
│  ┌───────────────────────────────────────────────┐  │
│  │ process.env.* → читаются из окружения сервера │  │
│  │ Только в Server Components / Route Handlers   │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Docker и runtime переменные

```dockerfile
# Переменные НЕ инлайнятся — читаются при старте контейнера
ENV DATABASE_URL=""
ENV SECRET_KEY=""

# Переменные ИНЛАЙНЯТСЯ — фиксируются при сборке
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
```

```bash
# Запуск с runtime переменными
docker run -e DATABASE_URL=postgresql://... -e SECRET_KEY=abc123 my-nextjs-app
```

### Multi-server encryption key

При запуске нескольких инстансов (Kubernetes, load balancer) Server Actions требуют общий ключ шифрования:

```bash
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=base64EncodedKey next build
```

---

## 7. Кэширование и CDN

### Автоматическое кэширование

Next.js устанавливает `Cache-Control` заголовки автоматически:

| Тип контента | Cache-Control | Описание |
|-------------|---------------|----------|
| Static assets (`_next/static/`) | `public, max-age=31536000, immutable` | SHA-hash в имени, безопасно кэшировать вечно |
| ISR pages | `s-maxage=<revalidate>, stale-while-revalidate` | Ревалидация по таймеру |
| Dynamic pages | `private, no-cache, no-store` | Никогда не кэшируются |

### ISR (Incremental Static Regeneration)

ISR работает при self-hosting из коробки. Кэш хранится на файловой системе в `.next/cache/`:

```tsx
// app/blog/[slug]/page.tsx
export const revalidate = 60 // ревалидация каждые 60 секунд

export default async function Post({ params }: { params: { slug: string } }) {
  const post = await fetch(`https://api.example.com/posts/${params.slug}`)
  return <article>{/* ... */}</article>
}
```

### Кастомный cache handler (Redis, S3)

Для multi-instance deployments стандартный файловый кэш не подходит — нужен shared cache:

```js
// next.config.js
module.exports = {
  cacheHandler: require.resolve('./cache-handler.js'),
  cacheMaxMemorySize: 0, // отключить in-memory cache
}
```

```js
// cache-handler.js
const Redis = require('ioredis')
const client = new Redis(process.env.REDIS_URL)

module.exports = class CacheHandler {
  async get(key) {
    const data = await client.get(key)
    return data ? JSON.parse(data) : null
  }

  async set(key, data, ctx) {
    await client.set(key, JSON.stringify({
      value: data,
      lastModified: Date.now(),
      tags: ctx.tags,
    }))
  }

  async revalidateTag(tags) {
    const tagList = [tags].flat()
    // Логика инвалидации по тегам
  }
}
```

### CDN Integration

```js
// next.config.js
module.exports = {
  assetPrefix: 'https://cdn.example.com', // static assets через CDN
}
```

> Static pages получают `Cache-Control: public` — CDN может их кэшировать. Dynamic pages получают `Cache-Control: private` — CDN должен проксировать к origin.

---

## 8. CI/CD

### Build pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy Next.js
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_API_URL: ${{ vars.API_URL }}

      - run: npm run test

      # Deploy (пример для Docker)
      - name: Build and push Docker image
        run: |
          docker build -t myapp:${{ github.sha }} .
          docker push registry.example.com/myapp:${{ github.sha }}
```

### Health checks

```tsx
// app/api/health/route.ts
export async function GET() {
  try {
    // Проверка подключения к БД, внешним сервисам
    await db.query('SELECT 1')
    return Response.json({ status: 'healthy', timestamp: Date.now() })
  } catch (error) {
    return Response.json({ status: 'unhealthy' }, { status: 503 })
  }
}
```

```yaml
# Docker / Kubernetes health check
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Graceful shutdown

Next.js поддерживает graceful shutdown при получении сигналов `SIGINT` / `SIGTERM`. Функция `after()` дожидается завершения pending callbacks:

```tsx
import { after } from 'next/server'

export async function POST(request: Request) {
  const data = await request.json()
  await db.save(data)

  // Выполнится после отправки ответа, до shutdown
  after(async () => {
    await analytics.track('data_saved', data.id)
  })

  return Response.json({ success: true })
}
```

---

## 9. Мониторинг

### instrumentation.js

Файл `instrumentation.js` (или `.ts`) в корне проекта выполняется **один раз** при старте сервера. Идеален для инициализации мониторинга:

```tsx
// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Инициализация серверного мониторинга
    const { NodeSDK } = await import('@opentelemetry/sdk-node')
    const { getNodeAutoInstrumentations } = await import(
      '@opentelemetry/auto-instrumentations-node'
    )

    const sdk = new NodeSDK({
      instrumentations: [getNodeAutoInstrumentations()],
    })
    sdk.start()
  }
}
```

### OpenTelemetry

Next.js имеет встроенную поддержку OpenTelemetry для трассировки:

```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

```js
// next.config.js
module.exports = {
  experimental: {
    instrumentationHook: true,
  },
}
```

Трассируемые операции: `getServerSideProps`, `getStaticProps`, Route Handlers, Middleware, `fetch()` запросы, маршрутизация.

### Web Vitals

Мониторинг Core Web Vitals на клиенте:

```tsx
// app/components/web-vitals.tsx
'use client'

import { useReportWebVitals } from 'next/web-vitals'

export function WebVitals() {
  useReportWebVitals((metric) => {
    // metric.name: 'FCP', 'LCP', 'CLS', 'FID', 'TTFB', 'INP'
    console.log(metric)

    // Отправка в аналитику
    fetch('/api/vitals', {
      method: 'POST',
      body: JSON.stringify(metric),
    })
  })

  return null
}
```

```tsx
// app/layout.tsx
import { WebVitals } from './components/web-vitals'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <WebVitals />
        {children}
      </body>
    </html>
  )
}
```

| Метрика | Описание | Хороший порог |
|---------|----------|--------------|
| LCP | Largest Contentful Paint | < 2.5s |
| FID / INP | First Input Delay / Interaction to Next Paint | < 100ms / < 200ms |
| CLS | Cumulative Layout Shift | < 0.1 |
| FCP | First Contentful Paint | < 1.8s |
| TTFB | Time to First Byte | < 0.8s |

---

**См. также:** [[next.config.js]], [[API Reference/API Reference]], [[Server и Client Components]], [[middlewareJS]]
