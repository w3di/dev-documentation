# Fetching Data — получение данных в Next.js

> Server Components позволяют получать данные **напрямую на сервере** — через `fetch`,
> ORM или прямой доступ к БД. Client Components используют хук `use` для стриминга
> серверных данных или библиотеки вроде SWR/React Query для клиентского fetching.

---

## Оглавление

1. [Общие принципы](#1-общие-принципы)
2. [Получение данных в Server Components](#2-получение-данных-в-server-components)
3. [Получение данных в Client Components](#3-получение-данных-в-client-components)
4. [Дедупликация запросов и мемоизация](#4-дедупликация-запросов-и-мемоизация)
5. [Data Cache](#5-data-cache)
6. [Стриминг](#6-стриминг)
7. [Последовательная vs параллельная загрузка](#7-последовательная-vs-параллельная-загрузка)
8. [Предзагрузка данных](#8-предзагрузка-данных)
9. [Динамические API и динамичность маршрута](#9-динамические-api-и-динамичность-маршрута)
10. [Рекомендации](#10-рекомендации)

---

## 1. Общие принципы

- **Server Components** — рендер на сервере, доступ к секретам, кэширование, стриминг. Используются по умолчанию.
- **Client Components** — для интерактивности и браузерных API. Данные можно стримить с сервера или получать на клиенте.
- **Правило**: получайте данные как можно ближе к источнику, на сервере.

---

## 2. Получение данных в Server Components

### fetch API

```tsx
export default async function Page() {
  const res = await fetch('https://api.example.com/posts')
  const posts = await res.json()

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

- Компонент должен быть `async`.
- Ответы `fetch` по умолчанию **не кэшируются**, но маршрут пререндерится и его HTML кэшируется.
- Для принудительно динамического рендера: `fetch(url, { cache: 'no-store' })`.

### ORM / прямой доступ к БД

```tsx
import { db } from '@/lib/db'

export default async function Page() {
  const posts = await db.post.findMany()
  return <PostList posts={posts} />
}
```

- Безопасно: секреты БД остаются на сервере.
- Для кэширования оберните в `React.cache` или используйте `unstable_cache`.

---

## 3. Получение данных в Client Components

### Стриминг через хук `use`

```tsx
// Server Component — инициирует загрузку
import { ClientPosts } from './client-posts'

export default function Page() {
  const postsPromise = fetchPosts() // НЕ await — передаём промис
  return <ClientPosts postsPromise={postsPromise} />
}

// Client Component — читает промис
'use client'
import { use, Suspense } from 'react'

export function ClientPosts({ postsPromise }) {
  const posts = use(postsPromise) // чтение внутри Suspense
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

Оборачивайте в `<Suspense>` для показа fallback во время загрузки.

### SWR / React Query

```tsx
'use client'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function Posts() {
  const { data, error, isLoading } = useSWR('/api/posts', fetcher)
  if (isLoading) return <Spinner />
  if (error) return <Error />
  return <PostList posts={data} />
}
```

Преимущества: кэширование, инвалидация, повторные запросы, фоновая синхронизация.

---

## 4. Дедупликация запросов и мемоизация

### Request Memoization

В пределах **одного рендер-прохода** одинаковые `fetch` (GET/HEAD, одинаковые URL и опции) автоматически **объединяются** в один сетевой запрос.

```tsx
// Оба компонента делают один и тот же fetch — будет 1 сетевой запрос
async function Header() {
  const user = await fetch('/api/user').then(r => r.json())
  return <h1>{user.name}</h1>
}

async function Sidebar() {
  const user = await fetch('/api/user').then(r => r.json())
  return <nav>{user.role}</nav>
}
```

- Область действия: **один серверный запрос** (один рендер-проход).
- Отключение: передача `AbortSignal` в `fetch`.

### React.cache для не-fetch

```tsx
import { cache } from 'react'
import { db } from '@/lib/db'

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } })
})
```

Функция вызовется один раз за рендер-проход, последующие вызовы вернут кэшированный результат.

---

## 5. Data Cache

Персистентный кэш поверх запросов и рендеров:

```tsx
// Кэшировать на 1 час
const res = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 },
})

// Кэшировать с тегом для on-demand ревалидации
const res = await fetch('https://api.example.com/data', {
  next: { tags: ['posts'] },
})
```

Подробнее: [[Caching]]

---

## 6. Стриминг

Разбивает страницу на части, отправляя HTML порционно по мере готовности данных.

### loading.tsx

```tsx
// app/posts/loading.tsx
export default function Loading() {
  return <PostListSkeleton />
}
```

Стримит **весь сегмент** — при навигации мгновенно показывает layout + loading, контент подменяется по готовности.

### `<Suspense>` — гранулярный контроль

```tsx
export default async function Page() {
  return (
    <>
      <Header /> {/* рендерится сразу */}
      <Suspense fallback={<PostsSkeleton />}>
        <Posts /> {/* стримится по готовности */}
      </Suspense>
      <Suspense fallback={<CommentsSkeleton />}>
        <Comments /> {/* стримится независимо */}
      </Suspense>
    </>
  )
}
```

**Совет**: проектируйте содержательные скелетоны (layout сохраняется), а не пустые спиннеры.

---

## 7. Последовательная vs параллельная загрузка

### Последовательная (waterfall)

```tsx
async function Page({ params }) {
  const user = await getUser(params.id)        // 200ms
  const posts = await getPosts(user.id)        // 300ms
  // Итого: 500ms
}
```

Оправдана только при **зависимости** второго запроса от первого.

### Параллельная

```tsx
async function Page({ params }) {
  const userPromise = getUser(params.id)
  const postsPromise = getPosts(params.id)

  const [user, posts] = await Promise.all([userPromise, postsPromise])
  // Итого: max(200ms, 300ms) = 300ms
}
```

**Подсказка**: `Promise.all` — отказ одного запроса провалит всю группу. Используйте `Promise.allSettled` для частичных результатов.

### Параллелизм сегментов

Layout и page одного маршрута запускают загрузку данных **параллельно** автоматически. Но внутри одного компонента `await` последовательны.

---

## 8. Предзагрузка данных

Запуск загрузки **до** фактического рендера компонента:

```tsx
// lib/preload.ts
import { cache } from 'react'
import 'server-only'

export const preloadUser = (id: string) => {
  void getUser(id) // запускает загрузку, но не ждёт результата
}

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } })
})
```

```tsx
// page.tsx
import { preloadUser, getUser } from '@/lib/preload'

export default async function Page({ params }) {
  preloadUser(params.id) // начинаем загрузку сразу

  // ... другая логика, проверки авторизации ...

  const user = await getUser(params.id) // данные уже в кэше
  return <Profile user={user} />
}
```

---

## 9. Динамические API и динамичность маршрута

Использование runtime API (`cookies`, `headers`, `searchParams`, `connection`, `draftMode`) или `fetch({ cache: 'no-store' })` переводит маршрут в **динамический рендеринг**.

- При статическом пререндеринге это может вызвать **ошибку сборки**, если динамика не изолирована в `<Suspense>`.
- В PPR: динамика изолируется в Suspense boundaries, остальное остаётся статичным.

---

## 10. Рекомендации

- **Получайте данные на сервере** — ближе к источнику, безопасно, без клиентского JS.
- **Стримьте** медленные части через `loading.tsx` или `<Suspense>`.
- **Дедуплицируйте** запросы через request memoization и `React.cache`.
- **Параллелизируйте** независимые запросы и **предзагружайте** критичные.
- **Используйте SWR/React Query** для клиентского fetching с кэшированием и инвалидацией.
- **Не перегружайте клиент** логикой получения данных — выносите на сервер.
- Проектируйте независимые «островки» загрузки с **собственными состояниями ошибок**.

---

**См. также**: [[Server Actions]], [[Caching]], [[Server и Client Components]], [[Рендеринг]]
