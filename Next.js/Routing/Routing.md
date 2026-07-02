# Routing — маршрутизация в Next.js App Router

> В Next.js App Router маршрутизация построена на **файловой системе**: папки определяют
> сегменты URL, а специальные файлы (`page.js`, `layout.js`, `template.js` и др.)
> задают UI и поведение каждого сегмента. Это принципиально отличается от декларативного
> подхода (React Router), где маршруты описываются в коде.

---

## Оглавление

1. [Файловая система как маршрутизация](#1-файловая-система-как-маршрутизация)
2. [Pages и Layouts](#2-pages-и-layouts)
3. [Динамические маршруты](#3-динамические-маршруты)
4. [Route Groups](#4-route-groups)
5. [Параллельные маршруты (Parallel Routes)](#5-параллельные-маршруты-parallel-routes)
6. [Перехватывающие маршруты (Intercepting Routes)](#6-перехватывающие-маршруты-intercepting-routes)
7. [Вложенные маршруты и иерархия компонентов](#7-вложенные-маршруты-и-иерархия-компонентов)
8. [Сводная таблица файловых конвенций](#8-сводная-таблица-файловых-конвенций)

---

## 1. Файловая система как маршрутизация

### 1.1 Принцип работы App Router

App Router использует директорию `app/` как корень маршрутизации. Каждая **папка** внутри `app/` представляет **сегмент маршрута** (route segment), который напрямую отображается на сегмент URL.

```
app/
├── page.tsx            → /
├── about/
│   └── page.tsx        → /about
├── blog/
│   ├── page.tsx        → /blog
│   └── [slug]/
│       └── page.tsx    → /blog/:slug
└── shop/
    └── [category]/
        └── [item]/
            └── page.tsx → /shop/:category/:item
```

Ключевые правила:

- **Папки** определяют сегменты маршрута, которые соответствуют сегментам URL
- **Файлы** (`page.js`, `layout.js` и др.) создают UI, отображаемый для сегмента
- Маршрут **публично доступен** только если в папке есть файл `page.js` (или `route.js`)
- Папки без `page.js` используются только для организации и **не создают маршрут**

### 1.2 Терминология сегментов

| Термин             | Описание                                               | Пример                   |
| ------------------ | ------------------------------------------------------ | ------------------------ |
| **Root Segment**   | Корневой сегмент, всегда `/`                           | `app/layout.tsx`         |
| **Segment**        | Промежуточный сегмент маршрута                         | `blog` в `/blog/hello`   |
| **Leaf Segment**   | Конечный (листовой) сегмент, не имеет потомков          | `[slug]` в `/blog/hello` |

### 1.3 Колокация файлов

Внутри папки сегмента можно размещать любые файлы (компоненты, стили, тесты) -- они **не будут** доступны как маршруты, если не являются специальными файлами:

```
app/dashboard/
├── page.tsx          ← маршрут /dashboard
├── layout.tsx        ← макет сегмента
├── nav.tsx           ← обычный компонент (НЕ маршрут)
└── utils.ts          ← утилиты (НЕ маршрут)
```

---

## 2. Pages и Layouts

### 2.1 Page (`page.js`)

Файл `page.js` определяет UI, **уникальный** для конкретного маршрута. Это всегда **листовой** элемент в дереве компонентов сегмента. По умолчанию -- Server Component.

```tsx
// app/blog/[slug]/page.tsx
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { slug } = await params
  const { page = '1' } = await searchParams
  return <article>Пост: {slug}, страница: {page}</article>
}
```

> **Важно**: `params` и `searchParams` -- это `Promise` начиная с Next.js 15. Используйте `async/await` или `React.use()` для доступа к значениям.

Таблица `params` в зависимости от маршрута:

| Маршрут                                | URL         | `params`                                  |
| -------------------------------------- | ----------- | ----------------------------------------- |
| `app/shop/[slug]/page.js`              | `/shop/1`   | `Promise<{ slug: '1' }>`                 |
| `app/shop/[category]/[item]/page.js`   | `/shop/1/2` | `Promise<{ category: '1', item: '2' }>`  |
| `app/shop/[...slug]/page.js`           | `/shop/1/2` | `Promise<{ slug: ['1', '2'] }>`          |

Использование `searchParams` переключает страницу в режим **dynamic rendering**, так как значения зависят от входящего запроса.

#### Типизация с `PageProps`

Глобальный хелпер `PageProps` (Next.js 15+) выводит типы из литерала маршрута. Импорт не нужен -- типы генерируются при `next dev`, `next build` или `next typegen`:

```tsx
export default async function Page(props: PageProps<'/blog/[slug]'>) {
  const { slug } = await props.params
  return <h1>Пост: {slug}</h1>
}
```

### 2.2 Layout (`layout.js`)

Layout -- UI, **общий** для нескольких страниц. При навигации layout **сохраняет состояние**, остаётся интерактивным и **не перерисовывается**.

```tsx
// app/dashboard/[team]/layout.tsx
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ team: string }>
}) {
  const { team } = await params
  return (
    <section>
      <h1>Команда: {team}</h1>
      <main>{children}</main>
    </section>
  )
}
```

| Проп       | Тип               | Обязательный | Описание                                          |
| ---------- | ------------------ | ------------ | ------------------------------------------------- |
| `children` | `React.ReactNode`  | Да           | Дочерний `page.js` или вложенный `layout.js`      |
| `params`   | `Promise<{...}>`   | Нет          | Динамические параметры от корня до данного layout  |

### 2.3 Root Layout (корневой макет)

Директория `app/` **обязана** содержать корневой `layout.js` с тегами `<html>` и `<body>`:

```tsx
// app/layout.tsx — корневой макет (обязателен)
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
```

- **Не следует** вручную добавлять `<head>`, `<title>`, `<meta>` -- используйте Metadata API
- Можно создать **несколько корневых макетов** через Route Groups (см. [раздел 4](#4-route-groups))
- Навигация между разными корневыми макетами вызывает **полную перезагрузку** страницы

### 2.4 Вложенные Layouts

Layouts вкладываются автоматически по иерархии папок:

```
app/
├── layout.tsx          → Корневой layout (html + body)
└── blog/
    ├── layout.tsx      → Layout блога (оборачивается корневым)
    └── [slug]/
        └── page.tsx    → /blog/:slug
```

Результат для `/blog/hello`:

```jsx
<RootLayout>       {/* app/layout.tsx */}
  <BlogLayout>     {/* app/blog/layout.tsx */}
    <Page />       {/* app/blog/[slug]/page.tsx */}
  </BlogLayout>
</RootLayout>
```

### 2.5 Template (`template.js`) vs Layout

`template.js` похож на `layout.js`, но **пересоздаётся** при каждой навигации (получает уникальный `key`):

| Характеристика         | `layout.js`                          | `template.js`                       |
| ---------------------- | ------------------------------------ | ----------------------------------- |
| Сохраняет состояние    | Да                                   | Нет, сбрасывается                   |
| `useEffect`            | Не вызывается повторно               | Вызывается при каждой навигации     |
| DOM элементы           | Сохраняются                          | Пересоздаются полностью             |
| `Suspense` fallback    | Только при первой загрузке           | При каждой навигации                |

Рендеринг с `template.js`:

```jsx
<Layout>
  <Template key={routeParam}>{children}</Template>
</Layout>
```

Когда использовать: ресинхронизация `useEffect`, сброс состояния полей ввода, показ `Suspense` fallback при каждой навигации.

### 2.6 Ограничения Layout

Layouts **не имеют доступа** к `searchParams`, `pathname` и `request` напрямую. Причина: layouts кешируются на клиенте при навигации. Решения:

- `searchParams` -- используйте проп `searchParams` в `page.js` или `useSearchParams` в Client Component
- `pathname` -- используйте `usePathname` в Client Component
- Cookies/Headers -- используйте `cookies()` и `headers()` из `next/headers` в Server Component

---

## 3. Динамические маршруты

### 3.1 Базовый `[slug]`

Оборачивание имени папки в квадратные скобки создаёт **динамический сегмент**:

```tsx
// app/blog/[slug]/page.tsx
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <div>Пост: {slug}</div>
}
```

### 3.2 Catch-all `[...slug]`

Три точки захватывают **все** последующие сегменты. Параметр становится массивом:

| Маршрут                      | URL             | `params`                      |
| ---------------------------- | --------------- | ----------------------------- |
| `app/shop/[...slug]/page.js` | `/shop/a`       | `{ slug: ['a'] }`            |
| `app/shop/[...slug]/page.js` | `/shop/a/b/c`   | `{ slug: ['a', 'b', 'c'] }`  |

> **Важно**: `[...slug]` **не матчит** `/shop` (без сегментов). Для этого -- optional catch-all.

### 3.3 Optional Catch-all `[[...slug]]`

Двойные скобки делают catch-all **опциональным** -- маршрут без параметра тоже обрабатывается:

```tsx
// app/shop/[[...slug]]/page.tsx
export default async function Page({ params }: { params: Promise<{ slug?: string[] }> }) {
  const { slug } = await params
  if (!slug) return <div>Главная страница магазина</div>
  return <div>Путь: {slug.join(' / ')}</div>
}
```

| Маршрут                        | URL        | `params`               |
| ------------------------------ | ---------- | ---------------------- |
| `app/shop/[[...slug]]/page.js` | `/shop`    | `{ slug: undefined }`  |
| `app/shop/[[...slug]]/page.js` | `/shop/a`  | `{ slug: ['a'] }`      |

### 3.4 `generateStaticParams`

Позволяет **статически генерировать** маршруты на этапе сборки:

```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await fetch('https://api.example.com/posts').then((r) => r.json())
  return posts.map((post: { slug: string }) => ({ slug: post.slug }))
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <article>{slug}</article>
}
```

При использовании с Cache Components: без `generateStaticParams` все `params` -- runtime-данные, и доступ к ним нужно оборачивать в `<Suspense>`. С `generateStaticParams` предоставляются примеры параметров для пререндеринга на этапе сборки.

### 3.5 Чтение `params` в Client Components

Client Components не могут быть `async`, используйте `use()` или `useParams()`:

```tsx
'use client'
import { use } from 'react'

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  return <h1>{slug}</h1>
}
```

### 3.6 TypeScript типы

| Маршрут                              | Тип `params`                              |
| ------------------------------------ | ----------------------------------------- |
| `app/blog/[slug]/page.js`            | `{ slug: string }`                        |
| `app/shop/[...slug]/page.js`         | `{ slug: string[] }`                      |
| `app/shop/[[...slug]]/page.js`       | `{ slug?: string[] }`                     |
| `app/[categoryId]/[itemId]/page.js`  | `{ categoryId: string, itemId: string }`  |

---

## 4. Route Groups

### 4.1 Конвенция `(folderName)`

Route Group создаётся оборачиванием имени папки в **круглые скобки**. Папка используется для **организации** и **не включается** в URL:

```
app/
├── (marketing)/
│   ├── about/page.tsx     → /about
│   └── blog/page.tsx      → /blog
├── (shop)/
│   ├── cart/page.tsx      → /cart
│   └── products/page.tsx  → /products
└── layout.tsx
```

### 4.2 Множественные корневые Layouts

Удалив верхнеуровневый `app/layout.tsx`, можно создать отдельные корневые layouts для каждой группы. Каждый должен содержать `<html>` и `<body>`:

```tsx
// app/(marketing)/layout.tsx — свой корневой layout
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="marketing">{children}</body>
    </html>
  )
}
```

### 4.3 Подводные камни

| Проблема                | Описание                                                                                 |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| **Конфликт путей**      | `(marketing)/about/page.js` и `(shop)/about/page.js` оба резолвятся в `/about` -- ошибка |
| **Полная перезагрузка** | Навигация между маршрутами с разными root layouts вызывает full page reload               |
| **Главная страница**    | Без верхнеуровневого `layout.js` маршрут `/` должен быть определён в одной из групп      |

---

## 5. Параллельные маршруты (Parallel Routes)

### 5.1 Конвенция `@slot`

Параллельные маршруты позволяют **одновременно** или **условно** рендерить несколько страниц в одном layout. Слоты определяются через `@folder`:

```
app/
├── layout.tsx
├── page.tsx
├── @analytics/
│   └── page.tsx
└── @team/
    └── page.tsx
```

Слоты передаются как **пропсы** в родительский layout:

```tsx
// app/layout.tsx
export default function Layout({
  children, analytics, team,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  team: React.ReactNode
}) {
  return (
    <>
      {children}
      {team}
      {analytics}
    </>
  )
}
```

- Слоты **не влияют** на URL: `/@analytics/views` доступен как `/views`
- `children` -- **неявный слот**, `app/page.js` === `app/@children/page.js`
- Каждый слот может иметь свой `loading.js` и `error.js`

### 5.2 `default.js`

Файл `default.js` рендерится как **fallback** для слотов, не совпадающих с текущим URL при hard navigation (перезагрузка). Без `default.js` отдаётся `404`:

```tsx
// app/@analytics/default.tsx
export default function Default() {
  return <div>Аналитика недоступна для этого маршрута</div>
}
```

| Тип навигации           | Поведение слота                                                      |
| ----------------------- | -------------------------------------------------------------------- |
| **Soft** (клиентская)   | Сохраняется текущее состояние, даже если URL не совпадает             |
| **Hard** (перезагрузка) | Рендерится `default.js`, без него -- `404`                           |

> Не забывайте `default.js` для неявного слота `children`.

### 5.3 Условный рендеринг

```tsx
// app/dashboard/layout.tsx
import { checkUserRole } from '@/lib/auth'

export default function Layout({
  user, admin,
}: {
  user: React.ReactNode
  admin: React.ReactNode
}) {
  const role = checkUserRole()
  return role === 'admin' ? admin : user
}
```

Структура: `app/dashboard/@admin/page.tsx` и `app/dashboard/@user/page.tsx`.

### 5.4 Модальные окна: Parallel + Intercepting Routes

Наиболее мощный паттерн -- комбинация `@slot` с intercepting routes. Подробнее -- в [разделе 6](#6-перехватывающие-маршруты-intercepting-routes).

### 5.5 `useSelectedLayoutSegment` со слотами

Хук принимает `parallelRoutesKey` для чтения активного сегмента внутри слота:

```tsx
'use client'
import { useSelectedLayoutSegment } from 'next/navigation'

export default function Layout({ auth }: { auth: React.ReactNode }) {
  const loginSegment = useSelectedLayoutSegment('auth')
  // Навигация на /@auth/login → loginSegment === "login"
  return <div>{auth}</div>
}
```

---

## 6. Перехватывающие маршруты (Intercepting Routes)

### 6.1 Концепция

Intercepting Routes позволяют **перехватить** клиентскую навигацию и отобразить контент маршрута **внутри текущего layout** (например, модальное окно). При прямом переходе или перезагрузке маршрут рендерится полностью, без перехвата.

### 6.2 Конвенция

Специальные префиксы папок, аналогичные `../`, но на уровне **сегментов маршрута** (не файловой системы):

| Конвенция    | Описание                          | Аналог   |
| ------------ | --------------------------------- | -------- |
| `(.)`        | Тот же уровень сегмента           | `./`     |
| `(..)`       | На один уровень выше              | `../`    |
| `(..)(..)`   | На два уровня выше                | `../../` |
| `(...)`      | От корня `app`                    | `/`      |

> **Важно**: конвенция основана на **сегментах маршрута**. Папки `@slot` не считаются сегментами при подсчёте уровней.

### 6.3 Пример: модальное окно с deep linking

```
app/
├── layout.tsx              ← рендерит {auth} + {children}
├── page.tsx                ← главная страница
├── login/
│   └── page.tsx            ← полная страница /login
└── @auth/
    ├── default.tsx         ← возвращает null
    ├── page.tsx            ← возвращает null (для маршрута /)
    ├── [...catchAll]/
    │   └── page.tsx        ← возвращает null (для всех маршрутов)
    └── (.)login/
        └── page.tsx        ← перехватывает /login → модальное окно
```

```tsx
// app/@auth/(.)login/page.tsx — модаль при клиентской навигации
import { Modal } from '@/app/ui/modal'
import { Login } from '@/app/ui/login'

export default function Page() {
  return (
    <Modal>
      <Login />
    </Modal>
  )
}
```

```tsx
// app/layout.tsx — рендерит слот auth
import Link from 'next/link'

export default function Layout({
  auth, children,
}: {
  auth: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>
        <nav><Link href="/login">Войти</Link></nav>
        {auth}
        {children}
      </body>
    </html>
  )
}
```

Закрытие модали -- через `router.back()`:

```tsx
// app/ui/modal.tsx
'use client'
import { useRouter } from 'next/navigation'

export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  return (
    <div className="modal-overlay">
      <button onClick={() => router.back()}>Закрыть</button>
      <div>{children}</div>
    </div>
  )
}
```

Catch-all `app/@auth/[...catchAll]/page.tsx` нужен, чтобы при навигации на любой маршрут слот `@auth` возвращал `null` и модаль закрывалась.

### 6.4 Преимущества модального паттерна

- **Shareable URL** -- контент модали доступен по прямой ссылке
- **Сохранение контекста** -- при перезагрузке рендерится полная страница
- **Навигация назад** -- закрывает модаль, а не переходит на предыдущую страницу
- **Навигация вперёд** -- повторно открывает модаль

---

## 7. Вложенные маршруты и иерархия компонентов

### 7.1 Component Hierarchy

Каждый сегмент маршрута имеет чёткую иерархию специальных файлов (от внешнего к внутреннему):

```jsx
<Layout>
  <Template key={segment}>
    <ErrorBoundary fallback={<Error />}>
      <Suspense fallback={<Loading />}>
        <ErrorBoundary fallback={<NotFound />}>
          <Page />
        </ErrorBoundary>
      </Suspense>
    </ErrorBoundary>
  </Template>
</Layout>
```

1. **`layout.js`** -- самый внешний, не перемонтируется
2. **`template.js`** -- перемонтируется при навигации (уникальный `key`)
3. **`error.js`** -- React Error Boundary
4. **`loading.js`** -- React Suspense boundary
5. **`not-found.js`** -- Error Boundary для `notFound()`
6. **`page.js`** -- самый внутренний, уникальный UI

### 7.2 Вложенные сегменты

При вложенных маршрутах компоненты каждого сегмента **вкладываются друг в друга**:

```jsx
// Иерархия для /blog/hello
<RootLayout>                                          {/* app/layout.tsx */}
  <BlogLayout>                                        {/* app/blog/layout.tsx */}
    <ErrorBoundary fallback={<BlogError />}>           {/* app/blog/error.tsx */}
      <Suspense fallback={<BlogLoading />}>            {/* app/blog/loading.tsx */}
        <Suspense fallback={<SlugLoading />}>          {/* app/blog/[slug]/loading.tsx */}
          <SlugPage />                                 {/* app/blog/[slug]/page.tsx */}
        </Suspense>
      </Suspense>
    </ErrorBoundary>
  </BlogLayout>
</RootLayout>
```

### 7.3 Взаимодействие `loading.js` и `layout.js`

`loading.js` находится **ниже** `layout.js` в иерархии, поэтому **не может** показать fallback для данных, загружаемых в самом layout. Решение -- оборачивать асинхронный контент в собственный `<Suspense>`:

```tsx
// app/dashboard/layout.tsx
import { Suspense } from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={<div>Загрузка навигации...</div>}>
        <DashboardNav />
      </Suspense>
      <main>{children}</main>
    </>
  )
}
```

---

## 8. Сводная таблица файловых конвенций

### 8.1 Специальные файлы

| Файл              | Назначение                                           | Перемонтируется |
| ----------------- | ---------------------------------------------------- | --------------- |
| `layout.js`       | Общий UI для сегмента и потомков                     | Нет             |
| `template.js`     | Как layout, но пересоздаётся при навигации           | Да              |
| `page.js`         | Уникальный UI маршрута (листовой элемент)            | Да              |
| `loading.js`      | Suspense fallback для сегмента                       | Зависит         |
| `error.js`        | Error Boundary для сегмента                          | Нет             |
| `not-found.js`    | UI для `notFound()` вызовов                          | --              |
| `route.js`        | API endpoint (не может сосуществовать с `page.js`)   | --              |
| `default.js`      | Fallback для параллельных слотов при hard navigation  | --              |
| `global-error.js` | Error Boundary для корневого layout                  | --              |

### 8.2 Конвенции маршрутизации

| Конвенция                      | Синтаксис        | Описание                                    |
| ------------------------------ | ---------------- | ------------------------------------------- |
| Вложенный маршрут              | `folder/folder`  | Вложенные папки = вложенные сегменты URL    |
| Динамический сегмент           | `[folder]`       | Один динамический сегмент                   |
| Catch-all                      | `[...folder]`    | Захват всех последующих сегментов           |
| Optional catch-all             | `[[...folder]]`  | Catch-all + совпадение без сегмента         |
| Route Group                    | `(folder)`       | Группировка без влияния на URL              |
| Параллельный слот              | `@folder`        | Именованный слот для параллельного рендера  |
| Перехват (тот же уровень)      | `(.)folder`      | Перехват маршрута на том же уровне          |
| Перехват (уровень выше)        | `(..)folder`     | Перехват на уровень выше                    |
| Перехват (два уровня выше)     | `(..)(..)folder` | Перехват на два уровня выше                 |
| Перехват (от корня)            | `(...)folder`    | Перехват от корня `app`                     |

### 8.3 Пропсы специальных файлов

| Файл         | Пропсы                                                                           |
| ------------ | -------------------------------------------------------------------------------- |
| `page.js`    | `params: Promise<{...}>`, `searchParams: Promise<{...}>`                         |
| `layout.js`  | `children: ReactNode`, `params: Promise<{...}>`, `[slotName]: ReactNode`         |
| `template.js`| `children: ReactNode`                                                            |
| `error.js`   | `error: Error & { digest?: string }`, `reset: () => void`                        |
| `route.js`   | `request: NextRequest`, context с `params: Promise<{...}>`                       |

---

**См. также**: [[Linking и Navigating]], [[Server и Client Components]], [[Layouts и Pages]]
