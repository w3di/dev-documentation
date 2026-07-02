# Server Actions — мутации данных в Next.js

> **Server Action** — это `async` функция с директивой `'use server'`, которая выполняется
> на сервере. Используется для мутаций: создание, обновление, удаление данных,
> ревалидация кэша и перенаправление. Интегрируется с формами и поддерживает
> **прогрессивное улучшение** — работает даже без JavaScript.

---

## Оглавление

1. [Server Functions и Server Actions](#1-server-functions-и-server-actions)
2. [Создание Server Functions](#2-создание-server-functions)
3. [Вызов через формы](#3-вызов-через-формы)
4. [Вызов через обработчики событий](#4-вызов-через-обработчики-событий)
5. [Показ состояния загрузки](#5-показ-состояния-загрузки)
6. [Ревалидация кэша](#6-ревалидация-кэша)
7. [Редирект после обновления](#7-редирект-после-обновления)
8. [Работа с Cookies](#8-работа-с-cookies)
9. [Вызов из useEffect](#9-вызов-из-useeffect)
10. [Рекомендации](#10-рекомендации)

---

## 1. Server Functions и Server Actions

| Термин | Описание |
|--------|----------|
| **Server Function** | Любая `async` функция с `'use server'`, выполняемая на сервере |
| **Server Action** | Server Function, используемая как действие (mutation) — в формах или с `startTransition` |

Под капотом Server Actions:
- Используют метод **POST** (единственный разрешённый HTTP-метод).
- Интегрируются с архитектурой кэширования Next.js.
- Могут вернуть **обновлённый UI и данные** за один серверный запрос.
- Выполняются **последовательно** на клиенте (одна за другой).

---

## 2. Создание Server Functions

### В отдельном файле (рекомендуется)

```tsx
// app/lib/actions.ts
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  const content = formData.get('content') as string

  await db.post.create({ data: { title, content } })
  revalidatePath('/posts')
}

export async function deletePost(id: string) {
  await db.post.delete({ where: { id } })
  revalidatePath('/posts')
}
```

Директива `'use server'` в начале файла помечает **все экспорты** как Server Functions.

### Inline в Server Component

```tsx
export default function Page() {
  async function createPost(formData: FormData) {
    'use server'
    // ... логика мутации
  }

  return <form action={createPost}>{/* ... */}</form>
}
```

### Использование в Client Component

Нельзя **определять** Server Functions в Client Components, но можно **импортировать**:

```tsx
// app/ui/button.tsx
'use client'
import { createPost } from '@/app/lib/actions'

export function CreateButton() {
  return <button formAction={createPost}>Create</button>
}
```

Или передавать как **проп**:

```tsx
<ClientForm submitAction={createPost} />
```

---

## 3. Вызов через формы

React расширяет `<form>` — проп `action` принимает Server Function:

```tsx
import { createPost } from '@/app/lib/actions'

export function PostForm() {
  return (
    <form action={createPost}>
      <input type="text" name="title" required />
      <textarea name="content" required />
      <button type="submit">Создать</button>
    </form>
  )
}
```

Функция автоматически получает `FormData`. Извлекайте данные через нативные методы: `formData.get('title')`.

**Прогрессивное улучшение**: формы в Server Components отправляются даже если JS ещё не загрузился или отключён. В Client Components формы ставят отправки в очередь до завершения гидратации.

---

## 4. Вызов через обработчики событий

```tsx
'use client'
import { incrementLike } from './actions'
import { useState } from 'react'

export function LikeButton({ initialLikes }: { initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes)

  return (
    <button
      onClick={async () => {
        const updatedLikes = await incrementLike()
        setLikes(updatedLikes)
      }}
    >
      ❤️ {likes}
    </button>
  )
}
```

---

## 5. Показ состояния загрузки

### useActionState

```tsx
'use client'
import { useActionState } from 'react'
import { createPost } from '@/app/lib/actions'

export function PostForm() {
  const [state, action, pending] = useActionState(createPost, null)

  return (
    <form action={action}>
      <input type="text" name="title" disabled={pending} />
      <button type="submit" disabled={pending}>
        {pending ? 'Создание...' : 'Создать'}
      </button>
      {state?.error && <p className="text-red-500">{state.error}</p>}
    </form>
  )
}
```

### useTransition

```tsx
'use client'
import { useTransition } from 'react'

export function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      disabled={isPending}
      onClick={() => startTransition(() => deletePost(id))}
    >
      {isPending ? 'Удаление...' : 'Удалить'}
    </button>
  )
}
```

---

## 6. Ревалидация кэша

После мутации вызовите `revalidatePath` или `revalidateTag` для обновления кэшированных данных:

```tsx
'use server'
import { revalidatePath } from 'next/cache'
import { revalidateTag } from 'next/cache'

export async function createPost(formData: FormData) {
  await db.post.create({ data: { /* ... */ } })

  // Вариант 1: ревалидация по пути
  revalidatePath('/posts')

  // Вариант 2: ревалидация по тегу
  revalidateTag('posts')
}
```

Подробнее: [[Caching]]

---

## 7. Редирект после обновления

```tsx
'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPost(formData: FormData) {
  const post = await db.post.create({ data: { /* ... */ } })

  revalidatePath('/posts')  // сначала ревалидируем
  redirect(`/posts/${post.id}`)  // затем редирект
}
```

**Важно**: `redirect` выбрасывает исключение управления потоком. Код после него **не выполнится**. Вызывайте `revalidatePath` / `revalidateTag` **до** `redirect`.

---

## 8. Работа с Cookies

```tsx
'use server'
import { cookies } from 'next/headers'

export async function setTheme(theme: string) {
  const cookieStore = await cookies()

  cookieStore.set('theme', theme, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365, // 1 год
  })
}

export async function getTheme() {
  const cookieStore = await cookies()
  return cookieStore.get('theme')?.value ?? 'light'
}
```

---

## 9. Вызов из useEffect

Для мутаций при монтировании или изменении зависимости:

```tsx
'use client'
import { incrementViews } from './actions'
import { useState, useEffect, useTransition } from 'react'

export function ViewCounter({ initialViews }: { initialViews: number }) {
  const [views, setViews] = useState(initialViews)
  const [, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      const updated = await incrementViews()
      setViews(updated)
    })
  }, [])

  return <p>Просмотров: {views}</p>
}
```

---

## 10. Рекомендации

- **Выносите Server Actions в отдельные файлы** (`app/lib/actions.ts`) для переиспользования.
- **Используйте формы** — прогрессивное улучшение из коробки.
- **Всегда ревалидируйте кэш** после мутаций: `revalidatePath` или `revalidateTag`.
- **Показывайте состояния загрузки** через `useActionState` или `useTransition`.
- **Размещайте `redirect` в конце** — после ревалидации.
- Server Actions используют POST — не используйте их для **чтения** данных.
- Для параллельной работы выполняйте `Promise.all` **внутри** одного action.

---

**См. также**: [[Fetching Data]], [[Caching]], [[Обработка ошибок]]
