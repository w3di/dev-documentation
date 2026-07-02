# Route Handlers — серверные обработчики маршрутов в Next.js App Router

> Route Handlers позволяют создавать серверные эндпоинты прямо внутри App Router, используя стандартные Web API (`Request` / `Response`). Они заменяют API Routes из Pages Router и определяются в файле `route.ts` внутри папки маршрута.

---

## Оглавление

1. [Что такое Route Handlers](#1-что-такое-route-handlers)
2. [Поддерживаемые HTTP-методы](#2-поддерживаемые-http-методы)
3. [Кэширование](#3-кэширование)
4. [Параметры маршрута](#4-параметры-маршрута)
5. [Request и Response](#5-request-и-response)
6. [Streaming](#6-streaming)
7. [CORS](#7-cors)
8. [Webhooks](#8-webhooks)
9. [Non-UI responses](#9-non-ui-responses)
10. [Сравнение с API Routes (Pages Router)](#10-сравнение-с-api-routes-pages-router)

---

## 1. Что такое Route Handlers

Route Handler -- это файл `route.ts` (или `route.js`), который экспортирует асинхронные функции, соответствующие HTTP-методам. Файл размещается в директории App Router аналогично `page.tsx`.

```
app/
├── api/
│   └── users/
│       └── route.ts    ← GET /api/users, POST /api/users
├── dashboard/
│   └── page.tsx        ← UI страница
└── layout.tsx
```

### Минимальный пример

```ts
// app/api/hello/route.ts
export async function GET() {
  return Response.json({ message: 'Hello World' })
}
```

### Ключевые правила

- Файл `route.ts` **не может** находиться в одной папке с `page.tsx` -- они конфликтуют на одном уровне маршрута.
- Route Handlers работают на сервере и используют стандартные Web API `Request` / `Response`.
- Поддерживают те же [Segment Config Options](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config), что и `page.tsx` / `layout.tsx`.

---

## 2. Поддерживаемые HTTP-методы

Route Handlers поддерживают семь стандартных HTTP-методов:

| Метод | Назначение |
|-------|-----------|
| `GET` | Получение данных |
| `POST` | Создание ресурса |
| `PUT` | Полное обновление ресурса |
| `PATCH` | Частичное обновление ресурса |
| `DELETE` | Удаление ресурса |
| `HEAD` | Аналог `GET`, но без тела ответа |
| `OPTIONS` | Предварительный запрос (CORS preflight) |

```ts
// app/api/posts/route.ts
export async function GET(request: Request) { /* ... */ }
export async function POST(request: Request) { /* ... */ }
export async function PUT(request: Request) { /* ... */ }
export async function PATCH(request: Request) { /* ... */ }
export async function DELETE(request: Request) { /* ... */ }
export async function HEAD(request: Request) { /* ... */ }
export async function OPTIONS(request: Request) { /* ... */ }
```

> Если `OPTIONS` не определён, Next.js автоматически реализует его, выставляя заголовок `Allow` на основе других экспортированных методов.

При вызове неподдерживаемого метода Next.js вернёт `405 Method Not Allowed`.

---

## 3. Кэширование

### Поведение по умолчанию (начиная с v15)

Начиная с `v15.0.0-RC`, `GET`-обработчики по умолчанию **динамические** (не кэшируются). Ранее (v13-v14) они были статическими по умолчанию.

### Включение статической генерации

Для статического кэширования используйте `export const dynamic = 'force-static'` или `export const revalidate`:

```ts
// app/api/posts/route.ts
export const revalidate = 60 // Ревалидация каждые 60 секунд

export async function GET() {
  const data = await fetch('https://api.vercel.app/blog')
  const posts = await data.json()
  return Response.json(posts)
}
```

### Segment Config Options

```ts
export const dynamic = 'auto'           // 'auto' | 'force-dynamic' | 'force-static'
export const dynamicParams = true
export const revalidate = false          // false | number (секунды)
export const fetchCache = 'auto'
export const runtime = 'nodejs'          // 'nodejs' | 'edge'
export const preferredRegion = 'auto'
```

### Факторы, делающие обработчик динамическим

- Использование объекта `request` (параметр функции).
- Чтение `headers()` или `cookies()`.
- Использование динамических сегментов без `generateStaticParams`.

---

## 4. Параметры маршрута

Каждая функция-обработчик принимает два аргумента:

| Параметр | Тип | Описание |
|----------|-----|----------|
| `request` | `NextRequest` (опционально) | Расширенный объект `Request` |
| `context` | `{ params: Promise<...> }` (опционально) | Динамические параметры маршрута |

### Динамические сегменты

```ts
// app/api/users/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getUserById(id)
  return Response.json(user)
}
```

### Таблица соответствия маршрутов и `params`

| Маршрут | URL | `params` |
|---------|-----|----------|
| `app/api/users/[id]/route.ts` | `/api/users/42` | `Promise<{ id: '42' }>` |
| `app/shop/[tag]/[item]/route.ts` | `/shop/shoes/nike` | `Promise<{ tag: 'shoes', item: 'nike' }>` |
| `app/blog/[...slug]/route.ts` | `/blog/2024/nextjs` | `Promise<{ slug: ['2024', 'nextjs'] }>` |

### Типизация через `RouteContext`

```ts
// app/api/users/[id]/route.ts
import type { NextRequest } from 'next/server'

export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/users/[id]'>
) {
  const { id } = await ctx.params
  return Response.json({ id })
}
```

> `RouteContext` -- глобально доступный тип, генерируемый при `next dev`, `next build` или `next typegen`. Импорт не требуется.

### Статическая генерация с `generateStaticParams`

Используйте `generateStaticParams` для предварительной генерации ответов на этапе сборки:

```ts
// app/api/posts/[slug]/route.ts
export async function generateStaticParams() {
  return (await getPosts()).map((post) => ({ slug: post.slug }))
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  return Response.json(await getPostBySlug(slug))
}
```

---

## 5. Request и Response

### Чтение `headers`

```ts
// Способ 1: функция headers() из next/headers (read-only)
import { headers } from 'next/headers'
export async function GET() {
  const headersList = await headers()
  return Response.json({ referer: headersList.get('referer') })
}

// Способ 2: через NextRequest
import { type NextRequest } from 'next/server'
export async function GET(request: NextRequest) {
  return Response.json({ auth: request.headers.get('authorization') })
}
```

> Для установки заголовков в ответе создавайте новый `Response` с нужными `headers`.

### Чтение и установка `cookies`

```ts
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')
  cookieStore.set('session', 'abc123')
  cookieStore.delete('old_cookie')
  return Response.json({ token: token?.value })
}
```

Альтернативно можно вернуть `Response` с заголовком `Set-Cookie`.

### Query-параметры

```ts
import { type NextRequest } from 'next/server'

export function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('query')    // /api/search?query=hello → "hello"
  const page = searchParams.get('page')      // /api/search?page=2 → "2"
  return Response.json({ query, page })
}
```

### Чтение тела запроса

```ts
// JSON
export async function POST(request: Request) {
  const body = await request.json()
  return Response.json({ received: body })
}

// FormData -- для валидации используйте zod-form-data
export async function POST(request: Request) {
  const formData = await request.formData()
  return Response.json({ name: formData.get('name') })
}
```

### Редиректы

```ts
import { redirect } from 'next/navigation'

export async function GET() {
  redirect('https://nextjs.org/')
}
```

---

## 6. Streaming

`Route Handlers` поддерживают потоковую передачу данных через `ReadableStream`. Это широко используется для интеграции с LLM (ChatGPT, Claude и др.).

### С помощью Vercel AI SDK

```ts
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai'
import { StreamingTextResponse, streamText } from 'ai'

export async function POST(req: Request) {
  const { messages } = await req.json()
  const result = await streamText({
    model: openai('gpt-4-turbo'),
    messages,
  })
  return new StreamingTextResponse(result.toAIStream())
}
```

### С помощью нативного `ReadableStream`

```ts
// app/api/stream/route.ts
const encoder = new TextEncoder()

async function* generateChunks() {
  yield encoder.encode('Первый чанк\n')
  await new Promise((r) => setTimeout(r, 500))
  yield encoder.encode('Второй чанк\n')
}

export async function GET() {
  const iterator = generateChunks()
  const stream = new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next()
      done ? controller.close() : controller.enqueue(value)
    },
  })
  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
```

---

## 7. CORS

Заголовки CORS устанавливаются вручную через стандартные Web API:

```ts
// app/api/data/route.ts
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://example.com',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function GET() {
  const data = await fetchData()
  return Response.json(data, { headers: corsHeaders })
}

// Preflight-запрос
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' },
  })
}
```

> Для применения CORS ко всем Route Handlers одновременно используйте [Middleware](middlewareJS.md) или настройку `headers` в `next.config.js`.

---

## 8. Webhooks

Route Handlers идеально подходят для приёма вебхуков от внешних сервисов (Stripe, GitHub, Telegram и др.).

```ts
// app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!
    // Верификация подписи и обработка события
    const event = verifyWebhookSignature(body, signature)

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event)
        break
    }
    return Response.json({ received: true })
  } catch (err) {
    return new Response(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    })
  }
}
```

> В отличие от Pages Router API Routes, не нужно отключать `bodyParser` -- Route Handlers работают напрямую с `Request` и не используют встроенный парсинг.

---

## 9. Non-UI responses

Route Handlers могут возвращать контент любого типа: XML, RSS, изображения, файлы и др.

### RSS-фид

```ts
// app/rss.xml/route.ts
export async function GET() {
  const feed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>Мой блог</title>
    <link>https://example.com</link>
    <description>Описание блога</description>
  </channel>
</rss>`

  return new Response(feed, {
    headers: { 'Content-Type': 'text/xml' },
  })
}
```

### Open Graph-изображения

```ts
// app/api/og/route.tsx
import { ImageResponse } from 'next/og'

export async function GET() {
  return new ImageResponse(
    <div style={{ display: 'flex', fontSize: 48 }}>Hello, OG!</div>,
    { width: 1200, height: 630 }
  )
}
```

### Скачивание файла

```ts
// app/api/download/route.ts
import { readFile } from 'fs/promises'

export async function GET() {
  const file = await readFile('./public/report.pdf')
  return new Response(file, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="report.pdf"',
    },
  })
}
```

> Next.js также имеет встроенные файловые конвенции для `sitemap.ts`, `robots.ts`, `opengraph-image.tsx` и `icon.tsx`.

---

## 10. Сравнение с API Routes (Pages Router)

| Характеристика | API Routes (Pages Router) | Route Handlers (App Router) |
|---------------|--------------------------|----------------------------|
| Расположение | `pages/api/` | `app/**/route.ts` |
| API | `req: NextApiRequest`, `res: NextApiResponse` | Web `Request` / `Response` |
| HTTP-методы | Один обработчик, проверка `req.method` | Отдельный экспорт для каждого метода |
| Middleware | Через `next-connect` или вручную | Встроенный `middleware.ts` |
| Парсинг тела | Встроенный `bodyParser` (можно отключить) | Нативные `request.json()`, `request.formData()` |
| Streaming | Ограниченная поддержка | Нативная поддержка `ReadableStream` |
| Edge Runtime | `export const config = { runtime: 'edge' }` | `export const runtime = 'edge'` |
| Статическая генерация | Не поддерживается | `generateStaticParams` + `use cache` |
| Типизация | `NextApiHandler` | Нативные типы `Request` / `Response` |

### Миграция с Pages Router

```ts
// БЫЛО: pages/api/users.ts — один handler, ветвление по req.method
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') res.status(200).json({ users: [] })
  else if (req.method === 'POST') res.status(201).json({ created: req.body })
  else res.status(405).end()
}

// СТАЛО: app/api/users/route.ts — отдельный экспорт для каждого метода
export async function GET() {
  return Response.json({ users: [] })
}
export async function POST(request: Request) {
  return Response.json({ created: await request.json() }, { status: 201 })
}
```

### История версий

| Версия | Изменения |
|--------|-----------|
| `v15.0.0-RC` | `context.params` стал `Promise` (доступен codemod) |
| `v15.0.0-RC` | Кэширование `GET` изменено со static на dynamic по умолчанию |
| `v13.2.0` | Route Handlers введены |
