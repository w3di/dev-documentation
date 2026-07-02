# Caching в Next.js — полное руководство по механизмам кэширования

> Кэширование (`caching`) в Next.js — это техника сохранения результатов вычислений и запросов данных для ускорения последующих обращений. Next.js предоставляет многоуровневую систему кэширования, охватывающую сервер, клиент и сеть.

---

## Оглавление

1. [Обзор кэширования в Next.js](#1-обзор-кэширования-в-nextjs)
2. [Request Memoization](#2-request-memoization)
3. [Data Cache](#3-data-cache)
4. [Full Route Cache](#4-full-route-cache)
5. [Router Cache (Client-side Cache)](#5-router-cache-client-side-cache)
6. [Ревалидация](#6-ревалидация)
7. [Директива use cache](#7-директива-use-cache)
8. [Opt-out из кэширования](#8-opt-out-из-кэширования)
9. [Взаимосвязь механизмов](#9-взаимосвязь-механизмов)
10. [Сводная таблица](#10-сводная-таблица)

---

## 1. Обзор кэширования в Next.js

Next.js использует **четыре уровня кэширования**, каждый из которых работает на своём этапе жизненного цикла запроса:

| Механизм                | Где работает | Что кэширует                      | Время жизни                      |
|--------------------------|--------------|-----------------------------------|----------------------------------|
| **Request Memoization** | Сервер       | Результат `fetch` / `React.cache` | Один серверный рендер-проход     |
| **Data Cache**          | Сервер       | Данные из `fetch` с кэш-опциями   | Персистентный (между запросами)  |
| **Full Route Cache**    | Сервер       | HTML + RSC Payload                | Персистентный (до ревалидации)   |
| **Router Cache**        | Клиент       | RSC Payload в браузере            | Сессия / `stale` время           |

> Начиная с Next.js 16, появилась модель **Cache Components** с директивой `'use cache'`, `cacheLife` и `cacheTag`, которая заменяет прежнюю модель кэширования через `fetch` options. Обе модели описаны ниже.

### Две модели кэширования

**Прежняя модель** (без `cacheComponents`):
- `fetch` запросы по умолчанию **не кэшируются**
- Кэширование включается через `cache: 'force-cache'` или `next: { revalidate: N }`
- Для не-`fetch` функций используется `unstable_cache`

**Новая модель** (с `cacheComponents: true`):
- Директива `'use cache'` на уровне файла, компонента или функции
- Управление временем жизни через `cacheLife`, тегирование через `cacheTag`
- Ревалидация через `revalidateTag` / `updateTag` / `revalidatePath`

```ts
// next.config.ts — включение Cache Components
import type { NextConfig } from 'next'
const nextConfig: NextConfig = { cacheComponents: true }
export default nextConfig
```

---

## 2. Request Memoization

**Request Memoization** — механизм React, автоматически дедуплицирующий одинаковые `fetch`-запросы **в рамках одного серверного рендер-прохода**.

### Как это работает

Когда несколько компонентов вызывают `fetch` с одинаковым URL и параметрами, React выполнит запрос **только один раз**:

```tsx
// layout.tsx — запрос выполняется реально
const user = await fetch('/api/user').then(r => r.json())

// page.tsx — тот же URL, результат берётся из мемоизации
const user = await fetch('/api/user').then(r => r.json())
```

### Условия мемоизации

- Метод запроса должен быть `GET`
- URL и опции `fetch` должны совпадать
- Действует **только в рамках одного рендер-прохода** (не между запросами пользователей)
- **Не работает** в `Route Handlers` (они вне дерева React-компонентов)

### Мемоизация для не-fetch функций

Для ORM или прямых обращений к БД используйте `React.cache`:

```tsx
import { cache } from 'react'
import { db, posts, eq } from '@/lib/db'

export const getPost = cache(async (id: string) => {
  return db.query.posts.findFirst({ where: eq(posts.id, parseInt(id)) })
})
```

> **Важно:** `React.cache` имеет изолированную область видимости внутри `'use cache'` границ. Значения, сохранённые через `React.cache` снаружи `'use cache'`, **не видны** внутри него.

### Opt-out из мемоизации

```ts
const { signal } = new AbortController()
fetch(url, { signal }) // Этот запрос не будет мемоизирован
```

---

## 3. Data Cache

**Data Cache** — персистентный серверный кэш, сохраняющий результаты `fetch`-запросов **между разными HTTP-запросами** пользователей.

### Опция `cache`

```tsx
// По умолчанию — НЕ кэшируется (auto no cache)
await fetch('https://api.example.com/data')

// Кэшировать принудительно
await fetch('https://api.example.com/data', { cache: 'force-cache' })

// Никогда не кэшировать
await fetch('https://api.example.com/data', { cache: 'no-store' })
```

| Значение        | Поведение                                                                    |
|-----------------|------------------------------------------------------------------------------|
| `auto` (default)| В `dev` — запрос каждый раз; в `build` — при статическом пререндере один раз |
| `'force-cache'` | Ищет совпадение в серверном кэше, при промахе запрашивает и сохраняет         |
| `'no-store'`    | Всегда запрашивает ресурс заново                                             |

### Опция `next.revalidate`

Устанавливает время жизни кэша в секундах:

```tsx
await fetch('https://api.example.com/data', { next: { revalidate: 3600 } })
```

| Значение | Поведение                                    |
|----------|----------------------------------------------|
| `false`  | Кэшировать бессрочно (эквивалент `Infinity`) |
| `0`      | Не кэшировать                                |
| `number` | Время жизни кэша в секундах                  |

### Опция `next.tags`

Добавляет теги для on-demand ревалидации:

```tsx
await fetch('https://api.example.com/posts', { next: { tags: ['posts'] } })
```

> **Ограничения:** максимальная длина тега — 256 символов, максимум 128 тегов.

### unstable_cache (прежняя модель)

Для кэширования не-`fetch` функций (ORM, БД):

```ts
import { unstable_cache } from 'next/cache'

export const getCachedUser = unstable_cache(
  async (id: string) => db.select().from(users).where(eq(users.id, id)),
  ['user'],
  { tags: ['user'], revalidate: 3600 }
)
```

---

## 4. Full Route Cache

**Full Route Cache** — кэш результата рендеринга маршрута (HTML + RSC Payload) на сервере. Создаётся во время `next build` для статических страниц.

### Что кэшируется

- **HTML** — для начальной загрузки страницы
- **RSC Payload** — сериализованное React-дерево для клиентской навигации

### Когда создаётся

Маршрут кэшируется при сборке, если **не содержит динамических данных**: нет вызовов `cookies()`, `headers()`, `searchParams`; нет `fetch` с `cache: 'no-store'`; не установлен `dynamic = 'force-dynamic'`.

### Когда инвалидируется

1. Ревалидация данных — через `revalidateTag`, `updateTag`, `revalidatePath`
2. Пересборка — при `next build`
3. Использование Request-time APIs

### Partial Prerendering (PPR)

С Cache Components (v16+) работает **Partial Prerendering** — статическая оболочка содержит кэшированный контент и `<Suspense>` fallback для динамики:

```tsx
export default function BlogPage() {
  return (
    <>
      <header><h1>Blog</h1></header>     {/* Статика — в оболочку */}
      <BlogPosts />                       {/* use cache — в оболочку */}
      <Suspense fallback={<p>Loading...</p>}>
        <UserPreferences />               {/* Динамика — стримится */}
      </Suspense>
    </>
  )
}

async function BlogPosts() {
  'use cache'
  cacheLife('hours')
  cacheTag('posts')
  const posts = await fetch('https://api.example.com/blog').then(r => r.json())
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}
```

---

## 5. Router Cache (Client-side Cache)

**Router Cache** — клиентский in-memory кэш RSC Payload для ранее посещённых маршрутов и предзагруженных (`prefetch`) ссылок.

### Механика

При навигации Next.js Router:
1. Проверяет клиентский кэш RSC Payload
2. Если не истёк `stale` период — показывает мгновенно
3. Если истёк — запрашивает свежие данные с сервера

### Prefetching

`<Link>` автоматически предзагружает маршруты при попадании в `viewport`:
- Статические маршруты — **полный** RSC Payload
- Динамические маршруты — до ближайшей `loading.js` границы

### Время жизни (stale time)

| Профиль   | `stale` время |
|-----------|---------------|
| `default` | 5 минут       |
| `seconds` | 30 секунд     |
| Остальные | 5 минут       |

> **Важно:** Минимальное `stale` время — **30 секунд**, чтобы предзагруженные ссылки не истекали до клика.

### Инвалидация

Router Cache очищается **полностью** при вызове из Server Action: `revalidateTag()`, `revalidatePath()`, `updateTag()`, `refresh()`.

### Глобальная настройка staleTimes

```ts
// next.config.ts
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30,  // секунды для динамических маршрутов
      static: 300,  // секунды для статических маршрутов
    },
  },
}
```

---

## 6. Ревалидация

Ревалидация — процесс обновления закэшированных данных. Две стратегии: **time-based** и **on-demand**.

### Time-based ревалидация

**Прежняя модель** — через `fetch`:

```tsx
await fetch('https://api.example.com/posts', { next: { revalidate: 3600 } })
```

**Новая модель** — через `cacheLife`:

```tsx
import { cacheLife } from 'next/cache'

export async function getProducts() {
  'use cache'
  cacheLife('hours') // stale: 5m, revalidate: 1h, expire: 1d
  return db.query('SELECT * FROM products')
}
```

#### Встроенные профили cacheLife

| Профиль   | `stale`   | `revalidate` | `expire`   | Сценарий                    |
|-----------|-----------|--------------|------------|-----------------------------|
| `default` | 5 мин     | 15 мин       | бессрочно  | Стандартный контент          |
| `seconds` | 30 сек    | 1 сек        | 1 мин      | Данные реального времени     |
| `minutes` | 5 мин     | 1 мин        | 1 час      | Часто обновляемый контент    |
| `hours`   | 5 мин     | 1 час        | 1 день     | Несколько обновлений в день  |
| `days`    | 5 мин     | 1 день       | 1 неделя   | Ежедневные обновления        |
| `weeks`   | 5 мин     | 1 неделя     | 30 дней    | Еженедельные обновления      |
| `max`     | 5 мин     | 30 дней      | ~бессрочно | Редко меняющийся контент     |

**Свойства профиля:**
- **`stale`** — как долго клиент использует кэш без обращения к серверу
- **`revalidate`** — через какое время сервер регенерирует контент в фоне (stale-while-revalidate)
- **`expire`** — максимальное время до полного удаления кэша

#### Пользовательские профили

```ts
// next.config.ts
const nextConfig = {
  cacheComponents: true,
  cacheLife: {
    editorial: { stale: 600, revalidate: 3600, expire: 86400 },
  },
}
```

#### Inline-профиль

```tsx
'use cache'
cacheLife({ stale: 60, revalidate: 300, expire: 3600 })
```

### On-demand ревалидация

#### `revalidatePath`

Инвалидирует кэш для конкретного пути маршрута:

```ts
import { revalidatePath } from 'next/cache'

revalidatePath('/blog/post-1')                    // Конкретная страница
revalidatePath('/blog/[slug]', 'page')            // Все страницы по шаблону
revalidatePath('/blog/[slug]', 'layout')          // Layout + все вложенные
revalidatePath('/', 'layout')                     // ВСЕ маршруты приложения
```

**Сигнатура:** `revalidatePath(path: string, type?: 'page' | 'layout'): void`

> **Подводный камень:** `revalidatePath` инвалидирует только указанный путь. Другие страницы с теми же тегами данных продолжат показывать кэш.

#### `revalidateTag`

Инвалидирует по тегу с **stale-while-revalidate** семантикой:

```ts
import { revalidateTag } from 'next/cache'
revalidateTag('posts', 'max') // Рекомендованный подход
```

**Сигнатура:** `revalidateTag(tag: string, profile: string | { expire?: number }): void`

> Однопараметровая форма `revalidateTag(tag)` **устарела** (`deprecated`).

#### `updateTag`

Мгновенная инвалидация для сценария **read-your-own-writes**:

```ts
import { updateTag } from 'next/cache'

export async function createPost(formData: FormData) {
  'use server'
  await db.post.create({ data: { title: formData.get('title') } })
  updateTag('posts') // Пользователь сразу видит новый пост
}
```

#### Сравнение updateTag и revalidateTag

| Характеристика | `updateTag`                       | `revalidateTag`                  |
|-----------------|-----------------------------------|----------------------------------|
| **Где**         | Только Server Actions             | Server Actions и Route Handlers  |
| **Поведение**   | Мгновенная инвалидация            | Stale-while-revalidate           |
| **Сценарий**    | Пользователь видит своё изменение | Фоновое обновление (задержка ОК) |

#### Комбинирование

```ts
'use server'
import { revalidatePath, updateTag } from 'next/cache'

export async function updatePost() {
  await updatePostInDatabase()
  revalidatePath('/blog')  // Обновить конкретную страницу
  updateTag('posts')       // Обновить все страницы с тегом 'posts'
}
```

---

## 7. Директива use cache

Директива `'use cache'` (Next.js 16+) кэширует результат асинхронных функций и компонентов. Требует `cacheComponents: true`.

### Уровни применения

```tsx
// Уровень файла — все экспорты кэшируются
'use cache'
export default async function Page() { /* ... */ }

// Уровень компонента
export async function MyComponent() {
  'use cache'
  return <div>Cached</div>
}

// Уровень функции
export async function getData() {
  'use cache'
  return db.query('SELECT * FROM users')
}
```

### Ключи кэша

Ключ кэш-записи формируется из:
1. **Build ID** — уникален для каждой сборки
2. **Function ID** — хеш местоположения функции в коде
3. **Сериализуемые аргументы** — пропсы / параметры функции
4. **Замкнутые переменные** — захватываются из внешней области видимости

```tsx
async function Component({ userId }: { userId: string }) {
  const getData = async (filter: string) => {
    'use cache'
    // Ключ включает userId (замыкание) и filter (аргумент)
    return fetch(`/api/users/${userId}/data?filter=${filter}`)
  }
  return getData('active')
}
```

### Сериализация

**Поддерживаемые типы:** `string`, `number`, `boolean`, `null`, `undefined`, plain objects, arrays, `Date`, `Map`, `Set`, `TypedArray`, `ArrayBuffer`

**Неподдерживаемые:** экземпляры классов, функции (кроме pass-through), `Symbol`, `WeakMap`, `WeakSet`, `URL`

### Pass-through паттерн

Несериализуемые значения можно передать через кэшированный компонент, если не читать их внутри:

```tsx
async function CachedWrapper({ children }: { children: ReactNode }) {
  'use cache'
  return (
    <div className="wrapper">
      <header>Cached Header</header>
      {children}  {/* Проходит "насквозь" — не влияет на ключ кэша */}
    </div>
  )
}
```

### Работа с runtime APIs

Внутри `'use cache'` **нельзя** вызывать `cookies()`, `headers()`, читать `searchParams`. Извлеките значения снаружи и передайте как аргументы:

```tsx
async function ProfileContent() {
  const session = (await cookies()).get('session')?.value
  return <CachedContent sessionId={session} />
}

async function CachedContent({ sessionId }: { sessionId: string }) {
  'use cache'
  const data = await fetchUserData(sessionId) // sessionId — часть ключа
  return <div>{data}</div>
}
```

### cacheLife и cacheTag внутри use cache

```tsx
import { cacheLife, cacheTag } from 'next/cache'

export async function getProducts() {
  'use cache'
  cacheLife('hours')
  cacheTag('products')
  return db.query('SELECT * FROM products')
}
```

### Вложенное кэширование

- **С явным `cacheLife`** у внешнего — используется его время жизни, независимо от внутренних
- **Без явного `cacheLife`** — внутренние кэши с более коротким временем могут **сократить** время жизни внешнего (но не удлинить)

```tsx
export default async function Dashboard() {
  'use cache'
  cacheLife('hours') // Явный профиль — Widget с 'minutes' не влияет
  return <div><Widget /></div>
}
```

> **Совет:** Всегда указывайте явный `cacheLife`, чтобы поведение было предсказуемым без анализа вложенных кэшей.

### Отладка

```bash
NEXT_PRIVATE_DEBUG_CACHE=1 npm run dev
```

В dev-режиме консольные логи из кэшированных функций появляются с префиксом `Cache`.

---

## 8. Opt-out из кэширования

### Динамические функции

Использование `cookies()`, `headers()`, `searchParams` автоматически делает маршрут динамическим.

### cache: 'no-store'

```tsx
await fetch('https://api.example.com/data', { cache: 'no-store' })
```

### Route Segment Config

```tsx
export const dynamic = 'force-dynamic'
```

| Значение          | Поведение                                                       |
|--------------------|-----------------------------------------------------------------|
| `'auto'`          | По умолчанию — кэшировать по возможности                        |
| `'force-dynamic'` | Всегда динамический рендеринг                                   |
| `'error'`         | Ошибка, если компоненты используют динамические API              |
| `'force-static'`  | Принудительно статический, `cookies`/`headers` возвращают пустое |

### fetchCache

```tsx
export const fetchCache = 'force-no-store'
// 'auto' | 'default-cache' | 'only-cache'
// 'force-cache' | 'force-no-store' | 'default-no-store' | 'only-no-store'
```

### Streaming без кэширования (Cache Components)

Не добавляйте `'use cache'` и оберните в `<Suspense>`:

```tsx
import { Suspense } from 'react'

async function LatestPosts() {
  const data = await fetch('https://api.example.com/posts')
  const posts = await data.json()
  return <ul>{posts.map(p => <li key={p.id}>{p.title}</li>)}</ul>
}

export default function Page() {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <LatestPosts />
    </Suspense>
  )
}
```

### Распространённые ошибки

| Проблема                                          | Решение                                        |
|---------------------------------------------------|------------------------------------------------|
| `fetch` в dev кэшируется через HMR                | Отключите `serverComponentsHmrCache` в конфиге |
| `revalidate: 0` + `cache: 'force-cache'` конфликт | Оба значения игнорируются, будет warning       |
| Hard refresh не обновляет данные в dev             | Браузер отправляет `cache-control: no-cache`   |

---

## 9. Взаимосвязь механизмов

Четыре уровня кэширования работают **последовательно** при обработке запроса:

### Поток запроса

```
Запрос пользователя
       │
       ▼
┌─────────────────────┐
│   Router Cache      │  Клиент: есть кэш? → Показать мгновенно
│   (клиент)          │  Нет → запрос на сервер
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Full Route Cache   │  Сервер: есть пререндер? → Отдать HTML + RSC Payload
│  (сервер)           │  Нет → рендерить компоненты
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Request Memoization│  Дедуплицировать одинаковые fetch при рендеринге
│  (React)            │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│    Data Cache       │  HIT → вернуть из кэша
│    (сервер)         │  MISS → запросить источник, сохранить
└─────────────────────┘
```

### Влияние ревалидации на кэши

| Действие                       | Data Cache       | Full Route Cache | Router Cache |
|--------------------------------|------------------|------------------|--------------|
| `revalidateTag(tag, 'max')`    | Stale (по тегу)  | Инвалидируется   | Очищается    |
| `updateTag(tag)`               | Expires (по тегу)| Инвалидируется   | Очищается    |
| `revalidatePath(path)`         | Инвалидируется   | Инвалидируется   | Очищается    |
| `router.refresh()`            | —                | —                | Очищается    |
| `cookies.set()` / `.delete()` | —                | Инвалидируется   | Очищается    |

### Ключевые принципы взаимодействия

1. **Request Memoization** работает **внутри** Data Cache — предотвращает дублирование обращений к кэшу
2. **Full Route Cache** зависит от **Data Cache** — инвалидация данных вызывает перерендер маршрута
3. **Router Cache** получает данные из **Full Route Cache** — инвалидация серверных кэшей очищает клиентский кэш при Server Action
4. Ревалидация Data Cache **каскадно** инвалидирует Full Route Cache

---

## 10. Сводная таблица

### Все механизмы кэширования

| Механизм             | Тип        | Расположение | Длительность    | Ключ кэша           | Ревалидация                                  |
|----------------------|------------|--------------|-----------------|----------------------|----------------------------------------------|
| Request Memoization | In-memory  | Сервер       | 1 рендер-проход | URL + options        | Автоматически по завершению рендера           |
| Data Cache          | Persistent | Сервер       | Между запросами | URL + options        | `revalidate`, `revalidateTag`, `revalidatePath` |
| Full Route Cache    | Persistent | Сервер       | Между запросами | Путь маршрута        | Ревалидация данных, пересборка               |
| Router Cache        | In-memory  | Клиент       | `stale` время   | Путь маршрута        | `refresh()`, ревалидация, навигация          |

### HIT / MISS / SET поведение

| Механизм            | HIT                                     | MISS                                  | SET                               |
|---------------------|----------------------------------------|---------------------------------------|-----------------------------------|
| Request Memoization | Возврат из памяти без сетевого запроса  | Выполнение fetch, сохранение в память | При первом вызове в рендер-проходе |
| Data Cache          | Возврат из персистентного кэша         | Запрос к источнику, сохранение        | При первом запросе / после revalidate |
| Full Route Cache    | Отдача HTML + RSC Payload              | Рендеринг компонентов                 | При `next build` или ревалидации  |
| Router Cache        | Мгновенная навигация без запроса       | Запрос RSC Payload с сервера          | При prefetch или первом посещении |

### Краткая таблица API

| API / Опция                     | Влияет на                  | Описание                                     |
|---------------------------------|----------------------------|----------------------------------------------|
| `'use cache'`                   | Data + Full Route          | Кэширует функцию / компонент / файл          |
| `cacheLife(profile)`            | Data + Router (stale)      | Время жизни кэша                             |
| `cacheTag(tag)`                 | Data Cache                 | Тегирует запись для on-demand ревалидации     |
| `revalidateTag(tag, profile)`   | Data + Full Route + Router | Инвалидирует по тегу (stale-while-revalidate)|
| `updateTag(tag)`                | Data + Full Route + Router | Мгновенно инвалидирует по тегу               |
| `revalidatePath(path)`          | Data + Full Route + Router | Инвалидирует по пути                         |
| `fetch` `cache: 'force-cache'`  | Data Cache                 | Принудительное кэширование fetch             |
| `fetch` `cache: 'no-store'`     | Data Cache                 | Отключение кэширования fetch                 |
| `fetch` `next.revalidate`       | Data Cache                 | Time-based ревалидация fetch                 |
| `fetch` `next.tags`             | Data Cache                 | Тегирование fetch для ревалидации            |
| `dynamic = 'force-dynamic'`     | Full Route Cache           | Полностью динамический маршрут               |
| `React.cache(fn)`               | Request Memoization        | Дедуплицирует вызовы в одном рендере         |

---

> **Совет по отладке:** Используйте `NEXT_PRIVATE_DEBUG_CACHE=1` для подробного логирования всех операций кэширования.
