## Updating Data (Обновление данных)

В Next.js можно обновлять данные с помощью React Server Functions. Эта страница расскажет, как создавать и вызывать Server Functions.

---

## Что такое Server Functions?

**Server Function** — это асинхронная функция, которая выполняется на сервере. Их можно вызывать с клиента через сетевой запрос, поэтому они должны быть асинхронными.

В контексте действий или мутаций их также называют **Server Actions**.

По соглашению, Server Action — это `async` функция, используемая с `startTransition`. Это происходит автоматически, когда функция:

- Передаётся в `<form>` через проп `action`.
- Передаётся в `<button>` через проп `formAction`.

В Next.js Server Actions интегрируются с архитектурой кэширования фреймворка. При вызове действия Next.js может вернуть как обновлённый UI, так и новые данные за один серверный запрос.

Под капотом действия используют метод POST, и только этот HTTP‑метод может их вызывать.

---

## Создание Server Functions

Server Function можно определить с помощью директивы `"use server"`. Можно разместить директиву:

- В начале асинхронной функции, чтобы пометить её как Server Function.
- В начале отдельного файла, чтобы пометить все экспорты этого файла.

### В отдельном файле

```typescript
// app/lib/actions.ts
export async function createPost(formData: FormData) {
  'use server'
  const title = formData.get('title')
  const content = formData.get('content')
  
  // Обновить данные
  // Ревалидировать кэш
}

export async function deletePost(formData: FormData) {
  'use server'
  const id = formData.get('id')
  
  // Обновить данные
  // Ревалидировать кэш
}
```

### В Server Components

Server Functions можно встраивать в Server Components, добавив директиву `"use server"` в начало тела функции:

```typescript
// app/page.tsx
export default function Page() {
  // Server Action
  async function createPost(formData: FormData) {
    'use server'
    // ...
  }
  
  return <></>
}
```

Полезно знать: Server Components поддерживают прогрессивное улучшение по умолчанию — формы, вызывающие Server Actions, будут отправлены даже если JavaScript ещё не загрузился или отключён.

### В Client Components

Нельзя определять Server Functions в Client Components. Однако можно вызывать их в Client Components, импортируя из файла с директивой `"use server"` в начале:

```typescript
// app/actions.ts
'use server'

export async function createPost() {}
```

```typescript
// app/ui/button.tsx
'use client'

import { createPost } from '@/app/actions'

export function Button() {
  return <button formAction={createPost}>Create</button>
}
```

Полезно знать: В Client Components формы, вызывающие Server Actions, будут ставить отправки в очередь, если JavaScript ещё не загрузился, и будут приоритизированы для гидратации. После гидратации браузер не обновляется при отправке формы.

### Передача действий как пропсов

Можно также передать действие в Client Component как проп:

```typescript
<ClientComponent updateItemAction={updateItem} />
```

```typescript
// app/client-component.tsx
'use client'

export default function ClientComponent({
  updateItemAction,
}: {
  updateItemAction: (formData: FormData) => void
}) {
  return <form action={updateItemAction}>{/* ... */}</form>
}
```

---

## Вызов Server Functions

Есть два основных способа вызвать Server Function:

1. **Формы** в Server и Client Components
2. **Обработчики событий** и `useEffect` в Client Components

Полезно знать: Server Functions предназначены для серверных мутаций. Клиент в настоящее время отправляет и ожидает их по одному. Это деталь реализации и может измениться. Если нужна параллельная загрузка данных, используйте получение данных в Server Components или выполняйте параллельную работу внутри одной Server Function или Route Handler.

### Формы

React расширяет HTML‑элемент `<form>`, позволяя вызывать Server Function с HTML‑пропом `action`.

При вызове в форме функция автоматически получает объект `FormData`. Можно извлечь данные с помощью нативных методов `FormData`:

```typescript
// app/ui/form.tsx
import { createPost } from '@/app/actions'

export function Form() {
  return (
    <form action={createPost}>
      <input type="text" name="title" />
      <input type="text" name="content" />
      <button type="submit">Create</button>
    </form>
  )
}
```

```typescript
// app/actions.ts
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title')
  const content = formData.get('content')
  
  // Обновить данные
  // Ревалидировать кэш
}
```

### Обработчики событий

Можно вызвать Server Function в Client Component, используя обработчики событий, такие как `onClick`:

```typescript
// app/like-button.tsx
'use client'

import { incrementLike } from './actions'
import { useState } from 'react'

export default function LikeButton({ initialLikes }: { initialLikes: number }) {
  const [likes, setLikes] = useState(initialLikes)
  
  return (
    <>
      <p>Total Likes: {likes}</p>
      <button
        onClick={async () => {
          const updatedLikes = await incrementLike()
          setLikes(updatedLikes)
        }}
      >
        Like
      </button>
    </>
  )
}
```

---

## Примеры

### Показ состояния загрузки

Во время выполнения Server Function можно показать индикатор загрузки с помощью хука React `useActionState`. Этот хук возвращает булево значение `pending`:

```typescript
// app/ui/button.tsx
'use client'

import { useActionState, startTransition } from 'react'
import { createPost } from '@/app/actions'
import { LoadingSpinner } from '@/app/ui/loading-spinner'

export function Button() {
  const [state, action, pending] = useActionState(createPost, false)
  
  return (
    <button onClick={() => startTransition(action)}>
      {pending ? <LoadingSpinner /> : 'Create Post'}
    </button>
  )
}
```

### Ревалидация

После выполнения обновления можно ревалидировать кэш Next.js и показать обновлённые данные, вызвав `revalidatePath` или `revalidateTag` внутри Server Function:

```typescript
// app/lib/actions.ts
import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
  'use server'
  // Обновить данные
  // ...
  
  revalidatePath('/posts')
}
```

### Редирект

Может потребоваться перенаправить пользователя на другую страницу после выполнения обновления. Это можно сделать, вызвав `redirect` внутри Server Function:

```typescript
// app/lib/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPost(formData: FormData) {
  // Обновить данные
  // ...
  
  revalidatePath('/posts')
  redirect('/posts')
}
```

Вызов `redirect` выбрасывает исключение управления потоком, обрабатываемое фреймворком. Любой код после него не выполнится. Если нужны свежие данные, вызовите `revalidatePath` или `revalidateTag` заранее.

### Cookies

Можно получать, устанавливать и удалять cookies внутри Server Action, используя API `cookies`:

```typescript
// app/actions.ts
'use server'

import { cookies } from 'next/headers'

export async function exampleAction() {
  const cookieStore = await cookies()
  
  // Получить cookie
  cookieStore.get('name')?.value
  
  // Установить cookie
  cookieStore.set('name', 'Delba')
  
  // Удалить cookie
  cookieStore.delete('name')
}
```

Полезно знать: Серверное обновление применяется к текущему React‑дереву, перерисовывая, монтируя или размонтируя компоненты по мере необходимости. Клиентское состояние сохраняется для перерисованных компонентов, а эффекты перезапускаются, если их зависимости изменились.

### useEffect

Можно использовать хук React `useEffect` для вызова Server Action при монтировании компонента или изменении зависимости. Это полезно для мутаций, которые зависят от глобальных событий или должны запускаться автоматически:

```typescript
// app/view-count.tsx
'use client'

import { incrementViews } from './actions'
import { useState, useEffect, useTransition } from 'react'

export default function ViewCount({ initialViews }: { initialViews: number }) {
  const [views, setViews] = useState(initialViews)
  const [isPending, startTransition] = useTransition()
  
  useEffect(() => {
    startTransition(async () => {
      const updatedViews = await incrementViews()
      setViews(updatedViews)
    })
  }, [])
  
  // Можно использовать `isPending` для обратной связи с пользователем
  return <p>Total Views: {views}</p>
}
```

---

## Рекомендации

- **Используйте Server Actions** для мутаций данных — они интегрируются с кэшированием Next.js.
- **Прогрессивное улучшение**: формы работают даже без JavaScript.
- **Ревалидируйте кэш** после обновлений с помощью `revalidatePath` или `revalidateTag`.
- **Показывайте состояния загрузки** через `useActionState` или `useTransition`.
- **Используйте `redirect`** для навигации после успешных операций.
- **Работайте с cookies** через API `cookies` в Server Actions.

---

## Полезно знать

- Server Actions используют POST‑метод и выполняются по одному на клиенте.
- Для параллельной работы используйте получение данных в Server Components.
- `redirect` прерывает выполнение — размещайте его в конце функции.
- Cookies в Server Actions автоматически обновляют UI через серверный рендер.

