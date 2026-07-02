# API Reference — компоненты, хуки, директивы и серверные функции Next.js

> Next.js предоставляет встроенные компоненты, хуки и директивы, формирующие основу маршрутизации, рендеринга и взаимодействия между сервером и клиентом.

---

## Оглавление

1. [Директивы — 'use client', 'use server', 'use cache'](#1-директивы)
2. [Компонент Link](#2-компонент-link)
3. [Компонент Image](#3-компонент-image)
4. [Компонент Script](#4-компонент-script)
5. [Компонент Form](#5-компонент-form)
6. [Хук useRouter](#6-хук-userouter)
7. [Хук usePathname](#7-хук-usepathname)
8. [Хук useSearchParams](#8-хук-usesearchparams)
9. [Хук useParams](#9-хук-useparams)
10. [Хук useSelectedLayoutSegment(s)](#10-хук-useselectedlayoutsegments)
11. [Серверные функции](#11-серверные-функции)

---

## 1. Директивы

Директивы определяют **границу между серверным и клиентским кодом** на уровне модулей.

| Директива | Где выполняется | Назначение |
|-----------|-----------------|------------|
| `'use client'` | Клиент (+ SSR) | Интерактивные компоненты, state, browser API |
| `'use server'` | Сервер | Мутации данных, доступ к БД, файловой системе |
| `'use cache'` | Сервер | Кэширование серверных вычислений |

**'use client'** — объявляется в начале файла, до импортов. Props из Server Components должны быть **serializable** (нельзя передать функцию). Не нужно добавлять в каждый файл — только в entry points клиентского кода.

```tsx
'use client'
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>
}
```

**'use server'** — помечает функции как Server Functions. Может быть на уровне файла или inline. Всегда проверяйте аутентификацию внутри функции.

```tsx
'use server'
import { db } from '@/lib/db'

export async function createUser(data: { name: string; email: string }) {
  const session = await auth()
  if (!session?.user) throw new Error('Unauthorized')
  return await db.user.create({ data })
}
```

**'use cache'** — экспериментальная директива, указывающая что результат можно кэшировать между запросами.

---

## 2. Компонент Link

`<Link>` расширяет `<a>`, добавляя **prefetching** и **client-side navigation**.

```tsx
import Link from 'next/link'
<Link href="/dashboard">Dashboard</Link>
```

| Prop | Тип | По умолчанию | Описание |
|------|-----|-------------|----------|
| `href` | `string \| object` | required | URL или `{ pathname, query }` |
| `replace` | `boolean` | `false` | Заменяет запись в history |
| `scroll` | `boolean` | `true` | При `false` — не скроллит к началу |
| `prefetch` | `boolean \| null` | `null` (auto) | `true` — полный prefetch; `false` — отключает |
| `onNavigate` | `function` | — | Callback при SPA-навигации, поддерживает `e.preventDefault()` |

```tsx
// Динамический маршрут
<Link href={`/blog/${post.slug}`}>{post.title}</Link>

// Объект href с query
<Link href={{ pathname: '/about', query: { name: 'test' } }}>About</Link>
```

---

## 3. Компонент Image

`next/image` автоматически оптимизирует изображения: resize, WebP/AVIF, lazy loading.

```tsx
import Image from 'next/image'
<Image src="/hero.jpg" alt="Hero" width={1200} height={600} priority />
```

| Prop | Тип | Описание |
|------|-----|----------|
| `src` | `string \| StaticImport` | Путь или статический импорт |
| `width` / `height` | `number` | Размеры (не нужны для `fill`) |
| `fill` | `boolean` | Растягивает на родительский контейнер |
| `sizes` | `string` | Media query, напр. `"(max-width: 768px) 100vw, 50vw"` |
| `priority` | `boolean` | Высокий приоритет загрузки (для LCP) |
| `placeholder` | `"blur" \| "empty"` | `blur` требует `blurDataURL` для remote |
| `loader` | `function` | Кастомная функция генерации URL |
| `quality` | `number` | Качество (1-100, по умолчанию 75) |

---

## 4. Компонент Script

`next/script` управляет загрузкой сторонних скриптов.

| Strategy | Когда загружается | Сценарий |
|----------|-------------------|----------|
| `beforeInteractive` | До гидратации | Polyfills, bot detection |
| `afterInteractive` | После гидратации (default) | Аналитика, tag managers |
| `lazyOnload` | В idle time | Чат-виджеты, low-priority |
| `worker` | В Web Worker (experimental) | Тяжёлые скрипты |

```tsx
import Script from 'next/script'
<Script src="https://www.googletagmanager.com/gtag/js" strategy="afterInteractive"
  onLoad={() => console.log('GTM loaded')} />
```

---

## 5. Компонент Form

`next/form` расширяет `<form>` с **prefetching**, **client-side navigation** и **progressive enhancement**.

```tsx
import Form from 'next/form'

export default function SearchForm() {
  return (
    <Form action="/search">
      <input name="q" placeholder="Search..." />
      <button type="submit">Search</button>
    </Form>
  )
}
```

При submit выполняет client-side навигацию с query params из формы. Работает без JS (progressive enhancement). Поддерживает `useFormStatus()` для pending states и Server Actions через `action={serverFunction}`.

---

## 6. Хук useRouter

Программная навигация в Client Components. Импорт из `next/navigation`.

```tsx
'use client'
import { useRouter } from 'next/navigation'

export default function Page() {
  const router = useRouter()
  return <button onClick={() => router.push('/dashboard')}>Dashboard</button>
}
```

| Метод | Сигнатура | Описание |
|-------|-----------|----------|
| `push` | `(href, { scroll?, transitionTypes? })` | Навигация + запись в history |
| `replace` | `(href, { scroll?, transitionTypes? })` | Навигация без записи в history |
| `refresh` | `()` | Перезагрузка маршрута с сервера, сохраняя client state |
| `back` | `()` | Назад в history |
| `forward` | `()` | Вперёд в history |
| `prefetch` | `(href, { onInvalidate? })` | Предзагрузка маршрута |

```tsx
router.push('/settings', { scroll: false })   // без скролла
router.refresh()                                // обновить данные, сохранив state
```

> Не передавайте непроверенные URL в `push`/`replace` — риск XSS (`javascript:` URL).

---

## 7. Хук usePathname

Возвращает **текущий pathname** (без query string и hash). Только Client Components.

```tsx
'use client'
import { usePathname } from 'next/navigation'

const pathname = usePathname()
// /dashboard?v=2 → '/dashboard'
```

Типичный сценарий — определение активной ссылки:

```tsx
'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export function NavLinks() {
  const pathname = usePathname()
  return (
    <nav>
      <Link className={pathname === '/' ? 'active' : ''} href="/">Home</Link>
      <Link className={pathname === '/about' ? 'active' : ''} href="/about">About</Link>
    </nav>
  )
}
```

---

## 8. Хук useSearchParams

Возвращает **read-only** `URLSearchParams` текущего URL. Только Client Components.

```tsx
'use client'
import { useSearchParams } from 'next/navigation'

const searchParams = useSearchParams()
searchParams.get('q')         // ?q=nextjs → 'nextjs'
searchParams.getAll('tag')    // ?tag=a&tag=b → ['a', 'b']
searchParams.has('sort')      // ?sort=asc → true
searchParams.toString()       // 'q=nextjs&tag=a'
```

| Метод | Описание |
|-------|----------|
| `get(name)` | Первое значение или `null` |
| `getAll(name)` | Все значения как массив |
| `has(name)` | `true` если параметр существует |
| `toString()` | Строковое представление |
| `keys()` / `values()` / `entries()` | Итераторы |

Обновление searchParams через `useRouter`:

```tsx
const createQueryString = (name: string, value: string) => {
  const params = new URLSearchParams(searchParams.toString())
  params.set(name, value)
  return params.toString()
}
router.push(pathname + '?' + createQueryString('sort', 'asc'))
```

> При prerendering `useSearchParams` вызывает client-side rendering до ближайшего `<Suspense>` boundary.

---

## 9. Хук useParams

Возвращает **динамические параметры маршрута** текущего сегмента.

```tsx
'use client'
import { useParams } from 'next/navigation'
// URL: /shop/clothes/tops → app/shop/[category]/[subcategory]/page.tsx
const params = useParams() // { category: 'clothes', subcategory: 'tops' }
```

| Маршрут | URL | Результат |
|---------|-----|-----------|
| `app/blog/[slug]/page.tsx` | `/blog/hello` | `{ slug: 'hello' }` |
| `app/shop/[...slug]/page.tsx` | `/shop/a/b/c` | `{ slug: ['a', 'b', 'c'] }` |

---

## 10. Хук useSelectedLayoutSegment(s)

Активный сегмент маршрута на уровне Layout — для навигационных UI.

**useSelectedLayoutSegment** — возвращает дочерний сегмент на один уровень ниже:

```tsx
'use client'
import { useSelectedLayoutSegment } from 'next/navigation'

const segment = useSelectedLayoutSegment()
// /dashboard/analytics → 'analytics'
```

**useSelectedLayoutSegments** — все сегменты ниже текущего Layout:

```tsx
'use client'
import { useSelectedLayoutSegments } from 'next/navigation'

const segments = useSelectedLayoutSegments()
// /dashboard/analytics/monthly → ['analytics', 'monthly']
```

---

## 11. Серверные функции

Функции из `next/server` и `next/headers` для Server Components, Route Handlers и Middleware.

### redirect / notFound

```tsx
import { redirect, permanentRedirect } from 'next/navigation'
import { notFound } from 'next/navigation'

redirect('/login')              // 307
permanentRedirect('/new-page')  // 308

const post = await getPost(id)
if (!post) notFound()           // 404, рендерит not-found.tsx
```

### cookies / headers

```tsx
import { cookies, headers } from 'next/headers'

const cookieStore = await cookies()
const token = cookieStore.get('token')?.value

const headersList = await headers()
const userAgent = headersList.get('user-agent')
```

### NextRequest / NextResponse

Расширения `Request`/`Response` для Middleware и Route Handlers:

```tsx
import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  if (!request.cookies.has('auth')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  const response = NextResponse.next()
  response.headers.set('x-custom-header', 'value')
  return response
}
```

| Класс | Ключевые свойства/методы |
|-------|-------------------------|
| `NextRequest` | `.nextUrl`, `.cookies`, `.headers`, `.geo`, `.ip` |
| `NextResponse` | `.redirect()`, `.rewrite()`, `.next()`, `.json()`, `.cookies` |

---

**См. также:** [[Linking и Navigating]], [[Server и Client Components]], [[middlewareJS]]
