# Server и Client Components — модель компонентов Next.js

> В App Router все компоненты по умолчанию являются **Server Components**. Они рендерятся
> на сервере, не добавляют JS в клиентский бандл и могут напрямую обращаться к базе данных,
> файловой системе и секретам окружения. Для интерактивности используются **Client Components**
> с директивой `'use client'`.

---

## Оглавление

1. [Когда использовать Server vs Client](#1-когда-использовать-server-vs-client)
2. [Как работает серверный рендеринг компонентов](#2-как-работает-серверный-рендеринг-компонентов)
3. [RSC Payload](#3-rsc-payload)
4. [Гидратация](#4-гидратация)
5. [Навигация и кэширование RSC](#5-навигация-и-кэширование-rsc)
6. [Директива 'use client' и граница модулей](#6-директива-use-client-и-граница-модулей)
7. [Передача данных из Server в Client](#7-передача-данных-из-server-в-client)
8. [Переплетение Server и Client компонентов](#8-переплетение-server-и-client-компонентов)
9. [Провайдеры контекста](#9-провайдеры-контекста)
10. [Сторонние компоненты](#10-сторонние-компоненты)
11. [Предотвращение утечки окружения](#11-предотвращение-утечки-окружения)
12. [Сводная таблица](#12-сводная-таблица)

---

## 1. Когда использовать Server vs Client

| Сценарий | Server Component | Client Component |
|----------|:----------------:|:----------------:|
| Получение данных из БД/API | ✅ | — |
| Хранение секретов (токены, ключи) | ✅ | — |
| Уменьшение клиентского JS | ✅ | — |
| Улучшение FCP, стриминг | ✅ | — |
| Состояние и обработчики событий (`onClick`, `onChange`) | — | ✅ |
| Жизненный цикл (`useEffect`, `useLayoutEffect`) | — | ✅ |
| Браузерные API (`localStorage`, `window`, `geolocation`) | — | ✅ |
| Пользовательские клиентские хуки | — | ✅ |

**Правило**: начинайте с Server Component. Выделяйте Client Component только для конкретного интерактивного элемента, а не целого дерева.

---

## 2. Как работает серверный рендеринг компонентов

### На сервере

1. React рендерит Server Components в **RSC Payload** — компактное бинарное представление дерева.
2. Next.js использует RSC Payload и JS клиентских компонентов для генерации **HTML** на сервере.
3. HTML отправляется клиенту для мгновенного показа неинтерактивного превью.

### На клиенте (первый заход)

1. Браузер показывает HTML — быстрый, неинтерактивный предпросмотр.
2. RSC Payload используется для **согласования (reconcile)** деревьев Server и Client компонентов.
3. JS **гидратирует** Client Components, прикрепляя обработчики событий.

### Последующие навигации

1. RSC Payload **префетчится** и кэшируется для мгновенных переходов.
2. Client Components рендерятся полностью на клиенте (без серверного HTML).
3. Общий layout сохраняется — обновляется только изменившийся сегмент.

---

## 3. RSC Payload

**RSC Payload** (React Server Component Payload) — это компактное бинарное представление отрендеренного дерева Server Components.

Содержит:
- **Результат рендера** Server Components (готовый HTML/виртуальный DOM).
- **Заглушки** (`placeholder`) и ссылки на JS-бандлы Client Components.
- **Пропсы**, переданные из Server в Client Components.

RSC Payload **не содержит** исходный код Server Components — он никогда не попадает в клиентский бандл.

---

## 4. Гидратация

Гидратация — процесс «оживления» статического HTML, при котором React:
1. Восстанавливает виртуальное дерево компонентов на основе RSC Payload.
2. Прикрепляет обработчики событий к DOM-элементам Client Components.
3. Синхронизирует состояние и эффекты.

React использует **Selective Hydration** — гидратирует приоритетные компоненты (например, те, с которыми пользователь взаимодействует) раньше остальных.

**Типичная ошибка** — hydration mismatch: когда HTML с сервера отличается от того, что React генерирует на клиенте. Причины:
- Использование `Date.now()`, `Math.random()` в рендере.
- Проверка `typeof window !== 'undefined'` в рендере (вместо `useEffect`).
- Различия локалей сервера и клиента.

---

## 5. Навигация и кэширование RSC

При клиентской навигации через `<Link>` или `useRouter`:

1. **Префетч**: RSC Payload загружается в фоне при попадании ссылки во вьюпорт.
2. **Кэш**: Payload сохраняется в клиентском Router Cache.
3. **Переход**: только изменившиеся сегменты обновляются, layout сохраняется.

Это позволяет навигации ощущаться мгновенной — без полной перезагрузки страницы.

---

## 6. Директива 'use client' и граница модулей

```tsx
'use client'

import { useState } from 'react'

export function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

`'use client'` создаёт **границу** между серверным и клиентским графами модулей:
- Файл с `'use client'` и **все его импорты** попадают в клиентский бандл.
- Файлы без директивы остаются Server Components (если не импортированы из клиентского модуля).

**Важно**: не помечайте `'use client'` крупные участки UI — выделяйте только минимальные интерактивные компоненты. Это сохраняет основную часть приложения на сервере.

---

## 7. Передача данных из Server в Client

Данные передаются через **пропсы**, которые должны быть сериализуемыми React:

```tsx
// Server Component
import { ClientChart } from './client-chart'

export default async function Page() {
  const data = await fetchChartData()
  return <ClientChart data={data} />
}
```

Поддерживаемые типы: строки, числа, boolean, null, массивы, объекты, Date, Map, Set, TypedArray, FormData, а также Promise (для стриминга через хук `use`).

**Нельзя** передавать: функции, классы, DOM-элементы.

---

## 8. Переплетение Server и Client компонентов

Серверные компоненты можно передавать как `children` в клиентский компонент (паттерн «слоты»):

```tsx
// Client Component
'use client'
export function Sidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true)
  return open ? <aside>{children}</aside> : null
}

// Server Component
import { Sidebar } from './sidebar'
import { Navigation } from './navigation' // Server Component

export default function Layout({ children }) {
  return (
    <Sidebar>
      <Navigation /> {/* рендерится на сервере */}
    </Sidebar>
  )
}
```

Server Components будут отрендерены на сервере **заранее**, а RSC Payload укажет места вставки в клиентское дерево.

---

## 9. Провайдеры контекста

React Context не поддерживается в Server Components (нет состояния). Оберните провайдер в Client Component:

```tsx
// app/providers.tsx
'use client'
import { ThemeProvider } from 'next-themes'

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

// app/layout.tsx (Server Component)
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

**Совет**: размещайте провайдеры как можно глубже в дереве — оборачивайте только `{children}`, а не весь `<html>`. Это помогает Next.js оптимизировать статические части Server Components.

---

## 10. Сторонние компоненты

Если сторонний компонент использует клиентские возможности (`useState`, `useEffect`), но не имеет директивы `'use client'`, оберните его:

```tsx
// app/carousel.tsx
'use client'
export { Carousel } from 'acme-carousel'
```

Теперь `Carousel` можно использовать внутри Server Components.

---

## 11. Предотвращение утечки окружения

Модули могут шариться между серверным и клиентским графами. Без защиты серверный код может случайно попасть в клиентский бандл.

### Пакет `server-only`

```ts
// lib/api.ts
import 'server-only'

export async function getData() {
  const res = await fetch('https://api.example.com', {
    headers: { Authorization: `Bearer ${process.env.API_SECRET}` },
  })
  return res.json()
}
```

Если этот модуль импортировать в Client Component — **ошибка на этапе сборки**.

### Пакет `client-only`

Симметрично: помечает модули с клиентской логикой (обращение к `window`, `document`).

### Переменные окружения

- Переменные **без** префикса `NEXT_PUBLIC_` недоступны на клиенте (пустые строки).
- Переменные **с** `NEXT_PUBLIC_` инлайнятся в клиентский бандл на этапе сборки.

---

## 12. Сводная таблица

| Характеристика | Server Component | Client Component |
|----------------|:----------------:|:----------------:|
| Рендерится на | Сервере | Сервере (HTML) + Клиенте (гидратация) |
| JS в бандле | Нет | Да |
| `async/await` | ✅ | ❌ |
| Доступ к БД/FS | ✅ | ❌ |
| `useState`/`useEffect` | ❌ | ✅ |
| Браузерные API | ❌ | ✅ |
| Директива | Не нужна (по умолчанию) | `'use client'` |
| Можно импортировать Server в Client | Только через `children` | — |
| Можно импортировать Client в Server | ✅ | ✅ |

---

**См. также**: [[Рендеринг]], [[Partial Pre-rendering (PPR)]], [[Fetching Data]], [[Caching]]
