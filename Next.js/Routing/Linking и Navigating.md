# Linking и Navigating — навигация в Next.js

> Маршруты в Next.js рендерятся на сервере, но навигация между ними остаётся мгновенной
> благодаря трём механизмам: **префетчинг** загружает маршрут в фоне до клика,
> **стриминг** отдаёт готовые части UI по мере готовности, а **клиентские переходы**
> обновляют контент без полной перезагрузки страницы.

---

## Оглавление

1. [Как работает навигация](#1-как-работает-навигация)
2. [Компонент Link](#2-компонент-link)
3. [Prefetching](#3-prefetching)
4. [Streaming и loading.tsx](#4-streaming-и-loadingtsx)
5. [Клиентские переходы](#5-клиентские-переходы)
6. [Что замедляет переходы и как ускорить](#6-что-замедляет-переходы-и-как-ускорить)
7. [Отключение префетчинга](#7-отключение-префетчинга)
8. [Программная навигация (useRouter)](#8-программная-навигация-userouter)
9. [Нативный History API](#9-нативный-history-api)
10. [useLinkStatus](#10-uselinkstatus)

---

## 1. Как работает навигация

Цикл навигации состоит из четырёх этапов:

```
Ссылка во вьюпорте → Префетч → Клик → Клиентский переход
     ↓                  ↓         ↓           ↓
Предзагрузка      RSC Payload   Замена     Обновление
в Router Cache      + HTML     сегмента    без reload
```

1. **Server Rendering** — страницы рендерятся на сервере (статически или динамически).
2. **Prefetching** — фоновая загрузка маршрутов до перехода.
3. **Streaming** — по частям отправляет готовые UI-элементы без ожидания всей страницы.
4. **Client Transition** — обновляет контент без полной перезагрузки, сохраняя layout и состояние.

---

## 2. Компонент Link

`<Link>` — основной способ навигации. Обёртка над `<a>` с префетчем и клиентскими переходами:

```tsx
import Link from 'next/link'

export function Navigation() {
  return (
    <nav>
      <Link href="/about">О нас</Link>
      <Link href="/posts/1">Пост</Link>
      <Link href={{ pathname: '/search', query: { q: 'next' } }}>Поиск</Link>
    </nav>
  )
}
```

### Основные пропсы

| Проп | Тип | По умолчанию | Описание |
|------|-----|-------------|----------|
| `href` | `string \| UrlObject` | — | URL назначения (обязательный) |
| `replace` | `boolean` | `false` | Заменить текущую запись в истории |
| `scroll` | `boolean` | `true` | Прокрутить к верху при переходе |
| `prefetch` | `boolean \| null` | `null` (auto) | Управление префетчем |

---

## 3. Prefetching

Префетчинг загружает маршрут в фоне, когда `<Link>` попадает во вьюпорт.

### Объём префетча

| Тип маршрута | Что префетчится |
|-------------|-----------------|
| **Статический** | Полностью (RSC Payload + HTML) |
| **Динамический без `loading.tsx`** | Ничего или минимум |
| **Динамический с `loading.tsx`** | Частично — до границы `loading.tsx` |

**Частичный префетч** динамических маршрутов: загружается layout и `loading.tsx`, но не `page.tsx`. Это экономит ресурсы сервера и обеспечивает мгновенный переход (пользователь сразу видит loading state).

### Router Cache

Префетченные данные сохраняются в **клиентском Router Cache**:
- Статические маршруты: кэш до 5 минут (по умолчанию).
- Динамические: кэш до 30 секунд.
- Настраивается через `staleTimes` в `next.config.js`.

---

## 4. Streaming и loading.tsx

Стриминг позволяет серверу отдавать части маршрута по мере готовности:

```tsx
// app/posts/loading.tsx
export default function Loading() {
  return <PostsSkeleton />
}
```

Под капотом Next.js оборачивает `page.tsx` в `<Suspense>`:

```tsx
<Layout>
  <Suspense fallback={<Loading />}>
    <Page />
  </Suspense>
</Layout>
```

Преимущества:
- Мгновенная навигация с визуальным откликом.
- Layout остаётся интерактивным, переходы **прерываемые**.
- Улучшение Core Web Vitals: TTFB, FCP, TTI.

---

## 5. Клиентские переходы

`<Link>` выполняет **клиентский переход** — обновляет только изменившийся сегмент:

- Общий layout **сохраняется** (не перерисовывается).
- Состояние клиентских компонентов **не сбрасывается**.
- Скролл позиция сохраняется для shared layouts.
- Нет полной перезагрузки страницы.

В сочетании с префетчем и стримингом: быстрые переходы даже для динамических маршрутов.

---

## 6. Что замедляет переходы и как ускорить

### Проблема 1: Динамический маршрут без `loading.tsx`

Клиент ждёт ответ сервера — ощущение «зависания».

**Решение**: добавьте `loading.tsx` для частичного префетча и мгновенной навигации.

### Проблема 2: Нет `generateStaticParams`

Динамический сегмент, который можно пререндерить, но без `generateStaticParams` — рендерится на каждый запрос.

**Решение**:
```tsx
export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map((post) => ({ slug: post.slug }))
}
```

### Проблема 3: Медленная сеть

Префетч может не успеть. Покажите инлайновый индикатор — см. [useLinkStatus](#10-uselinkstatus).

---

## 7. Отключение префетчинга

```tsx
<Link href="/heavy-page" prefetch={false}>
  Тяжёлая страница
</Link>
```

Полезно для бесконечных списков с множеством ссылок.

**Компромиссы**:
- Статика загрузится только по клику.
- Динамика потребует серверного рендера до навигации.

Альтернатива — префетч только по ховеру (через `onMouseEnter` + `router.prefetch`).

---

## 8. Программная навигация (useRouter)

```tsx
'use client'
import { useRouter } from 'next/navigation'

export function NavigateButton() {
  const router = useRouter()

  return (
    <button onClick={() => router.push('/dashboard')}>
      Перейти к дашборду
    </button>
  )
}
```

| Метод | Описание |
|-------|----------|
| `router.push(url)` | Навигация (добавляет запись в историю) |
| `router.replace(url)` | Навигация (заменяет текущую запись) |
| `router.refresh()` | Обновить текущий маршрут (Server Component re-render) |
| `router.back()` | Назад по истории |
| `router.forward()` | Вперёд по истории |
| `router.prefetch(url)` | Ручной префетч маршрута |

**Рекомендация**: используйте `<Link>` по умолчанию. `useRouter` — для программных сценариев (после отправки формы, по таймеру и т.д.).

---

## 9. Нативный History API

Next.js интегрируется с `window.history.pushState` и `window.history.replaceState`. Вызовы синхронизируются с `usePathname` и `useSearchParams`.

### pushState — сортировка без перезагрузки

```tsx
'use client'
import { useSearchParams } from 'next/navigation'

export function SortSelector() {
  const searchParams = useSearchParams()

  function updateSort(sort: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('sort', sort)
    window.history.pushState(null, '', `?${params.toString()}`)
  }

  return <button onClick={() => updateSort('price')}>По цене</button>
}
```

### replaceState — переключение локали

```tsx
function switchLocale(locale: string) {
  const path = `/${locale}${pathname}`
  window.history.replaceState(null, '', path)
}
```

---

## 10. useLinkStatus

Хук для отображения состояния ссылки на медленных сетях:

```tsx
'use client'
import Link from 'next/link'
import { useLinkStatus } from 'next/link'

function LinkWithIndicator({ href, children }) {
  return (
    <Link href={href}>
      <LinkContent>{children}</LinkContent>
    </Link>
  )
}

function LinkContent({ children }) {
  const { pending } = useLinkStatus()
  return (
    <>
      {children}
      {pending && <span className="ml-2 animate-spin">⏳</span>}
    </>
  )
}
```

`pending: true` — пока навигация не завершена (префетч не готов).

---

**См. также**: [[Routing]], [[Рендеринг]], [[Middleware]]
