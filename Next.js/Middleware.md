# Middleware — серверная логика до маршрутизации

> **Middleware** выполняется **до завершения запроса** — перед рендером страницы.
> Один файл `middleware.ts` в корне проекта (или `src/`) для аутентификации,
> редиректов, переписываний URL, CORS, заголовков безопасности и A/B-тестов.

---

## Оглавление

1. [Назначение и расположение](#1-назначение-и-расположение)
2. [Экспорт и сигнатуры](#2-экспорт-и-сигнатуры)
3. [NextResponse — основные возможности](#3-nextresponse--основные-возможности)
4. [Matcher — ограничение области действия](#4-matcher--ограничение-области-действия)
5. [Порядок выполнения в пайплайне](#5-порядок-выполнения-в-пайплайне)
6. [Типичные задачи](#6-типичные-задачи)
7. [Runtime (Edge vs Node.js)](#7-runtime-edge-vs-nodejs)
8. [Advanced flags](#8-advanced-flags)
9. [Тестирование](#9-тестирование)
10. [Рекомендации](#10-рекомендации)

---

## 1. Назначение и расположение

Middleware — единая точка серверной логики **перед файловыми маршрутами**:

```
middleware.ts   ← корень проекта (рядом с app/ или pages/)
```

Или при использовании `src/`:

```
src/middleware.ts   ← рядом с app/ внутри src/
```

**Одна** функция Middleware на проект. Множественные middleware в одном файле не поддерживаются.

---

## 2. Экспорт и сигнатуры

```tsx
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Логика middleware

  // Продолжить обработку
  return NextResponse.next()
}

export const config = {
  matcher: '/dashboard/:path*',
}
```

- **Параметр**: `request: NextRequest` — расширенный `Request` с доступом к `nextUrl`, `cookies`, `headers`, `geo`, `ip`.
- **Возврат**: `NextResponse`, `Response` или `NextResponse.next()` для пропуска.

---

## 3. NextResponse — основные возможности

| Метод | Описание |
|-------|----------|
| `NextResponse.next()` | Продолжить обработку (пропустить) |
| `NextResponse.redirect(url)` | Перенаправление (3xx) |
| `NextResponse.rewrite(url)` | Отрисовка другого маршрута, URL в адресной строке сохраняется |
| `NextResponse.json(data)` | Вернуть JSON-ответ |

### Модификация заголовков

```tsx
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set('x-custom-header', 'value')

  // Проброс заголовка запроса дальше по пайплайну
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-request-id', crypto.randomUUID())

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}
```

### Работа с cookies

```tsx
export function middleware(request: NextRequest) {
  // Чтение
  const token = request.cookies.get('session')?.value

  const response = NextResponse.next()

  // Установка
  response.cookies.set('visited', 'true', { httpOnly: true })

  // Удаление
  response.cookies.delete('old-cookie')

  return response
}
```

---

## 4. Matcher — ограничение области действия

Без matcher — middleware выполняется на **каждом запросе**. Настройте matcher для оптимизации:

```tsx
export const config = {
  // Одиночный путь
  matcher: '/dashboard/:path*',

  // Массив путей
  matcher: ['/dashboard/:path*', '/api/:path*'],

  // Regex с negative lookahead — исключить статику
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
```

### Объектная форма (расширенная)

```tsx
export const config = {
  matcher: [
    {
      source: '/api/:path*',
      has: [{ type: 'header', key: 'authorization' }],
    },
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [{ type: 'header', key: 'next-router-prefetch' }],
    },
  ],
}
```

- `has` — выполнять только при наличии header/cookie/query.
- `missing` — выполнять только при отсутствии.

---

## 5. Порядок выполнения в пайплайне

```
1. headers (next.config.js)       ← CSP, HSTS, X-Frame-Options
2. redirects (next.config.js)     ← постоянные 301/302 редиректы
3. Middleware                     ← кастомная логика
4. beforeFiles rewrites           ← переписывания до файловой системы
5. Файловые маршруты              ← public/, _next/static/, pages/, app/
6. afterFiles rewrites            ← fallback переписывания
7. Динамические маршруты          ← /blog/[slug] и т.д.
8. fallback rewrites              ← последняя возможность переписать
```

**Правило**: чем выше шаг — тем раньше и дешевле. Постоянные редиректы и заголовки выносите в `next.config.js`.

---

## 6. Типичные задачи

### Аутентификация

```tsx
export function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value

  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}
```

### Геолокация / i18n роутинг

```tsx
export function middleware(request: NextRequest) {
  const locale = request.headers.get('accept-language')?.split(',')[0] ?? 'en'
  const pathname = request.nextUrl.pathname

  if (!pathname.startsWith(`/${locale}`)) {
    return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url))
  }
}
```

### CORS

```tsx
export function middleware(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  const response = NextResponse.next()
  response.headers.set('Access-Control-Allow-Origin', '*')
  return response
}
```

### A/B тестирование

```tsx
export function middleware(request: NextRequest) {
  const bucket = request.cookies.get('ab-bucket')?.value
    ?? (Math.random() > 0.5 ? 'a' : 'b')

  const response = NextResponse.rewrite(
    new URL(`/variants/${bucket}${request.nextUrl.pathname}`, request.url)
  )

  if (!request.cookies.has('ab-bucket')) {
    response.cookies.set('ab-bucket', bucket, { maxAge: 60 * 60 * 24 * 30 })
  }

  return response
}
```

---

## 7. Runtime (Edge vs Node.js)

| | Edge (по умолчанию) | Node.js |
|--|:---:|:---:|
| Запуск | Быстрый, ближе к пользователю | Полное Node.js окружение |
| Нативные модули | ❌ | ✅ |
| Размер бандла | Ограничен | Не ограничен |
| Cold start | ~0ms | Медленнее |

Переключение:
```tsx
export const config = {
  runtime: 'nodejs', // вместо Edge
}
```

---

## 8. Advanced flags

### skipTrailingSlashRedirect

Отключает авто-редиректы добавления/удаления trailing slash. Позволяет реализовать собственные правила в middleware.

### skipMiddlewareUrlNormalize

Отключает нормализацию URL — даёт доступ к «сырому» пути. Синхронизирует поведение прямых визитов и клиентских переходов.

---

## 9. Тестирование

Начиная с Next.js 15.1 (экспериментально):

```tsx
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'

test('middleware matches /dashboard', () => {
  expect(
    unstable_doesMiddlewareMatch({
      config,
      nextConfig: {},
      url: '/dashboard',
    })
  ).toBe(true)
})
```

---

## 10. Рекомендации

- **Ограничивайте область** через `config.matcher` — исключайте `_next/static`, изображения, favicon.
- **Держите middleware лёгким** — минимум сетевых запросов и вычислений. Влияет на TTFB.
- **Не дублируйте** логику `next.config.js` — постоянные редиректы и заголовки дешевле на уровне конфига.
- **Избегайте больших заголовков** — риск ошибки 431 (Request Header Fields Too Large).
- Используйте `NextResponse.redirect` вместо `Response.redirect` для полной интеграции с Next.js.

---

**См. также**: [[Routing]], [[next.config.js]], [[Обработка ошибок]]
