# React 19 — новые возможности

## Оглавление

1. [Обзор React 19](#обзор-react-19)
2. [Хук use()](#хук-use)
3. [Хук useActionState](#хук-useactionstate)
4. [Хук useFormStatus](#хук-useformstatus)
5. [Хук useOptimistic](#хук-useoptimistic)
6. [Действия форм (Form Actions)](#действия-форм-form-actions)
7. [React Server Components](#react-server-components)
8. [Activity](#activity)
9. [ViewTransition](#viewtransition)
10. [cache и cacheSignal](#cache-и-cachesignal)
11. [Улучшения ref](#улучшения-ref)
12. [Метаданные документа](#метаданные-документа)
13. [Улучшения Error Reporting](#улучшения-error-reporting)
14. [Прочие улучшения](#прочие-улучшения)

---

## Обзор React 19

React 19 (5 декабря 2024) и React 19.2 (1 октября 2025) — крупнейшее обновление после React 18, сфокусированное на серверных компонентах, формах и производительности.

| Возможность | React 18 | React 19 |
|---|---|---|
| Чтение промисов в рендере | Невозможно | `use(promise)` |
| Формы с серверными действиями | Нет | `useActionState`, form actions |
| Оптимистичные обновления | Ручная реализация | `useOptimistic` |
| ref как prop | `forwardRef` обязателен | ref — обычный prop |
| Context Provider | `<Ctx.Provider value={}>` | `<Ctx value={}>` |
| Метаданные в `<head>` | Ручное управление / helmet | Автоматический hoisting |
| React Compiler | Нет | v1.0 (авто-мемоизация) |
| `<Activity>` | Нет | Скрытие UI без потери state (19.2) |
| `<ViewTransition>` | Нет | CSS View Transitions (19.2) |

---

## Хук use()

`use` — новый хук, который может читать **промисы** и **контекст** прямо во время рендера. В отличие от других хуков, `use` **можно вызывать внутри условий и циклов**.

### use(Promise) — чтение промисов

```jsx
import { use, Suspense } from 'react';

function Comments({ commentsPromise }) {
  // Suspense покажет fallback, пока промис не разрешится
  const comments = use(commentsPromise);
  return (
    <ul>
      {comments.map(c => <li key={c.id}>{c.text}</li>)}
    </ul>
  );
}

function Page({ commentsPromise }) {
  return (
    <Suspense fallback={<p>Загрузка комментариев...</p>}>
      <Comments commentsPromise={commentsPromise} />
    </Suspense>
  );
}
```

> **Важно:** промис должен быть создан вне компонента или кэширован. Если создавать промис каждый рендер — Suspense будет срабатывать бесконечно.

### use(Context) — замена useContext

```jsx
import { use } from 'react';

function Button() {
  // Можно вызывать условно — в отличие от useContext
  if (someCondition) {
    const theme = use(ThemeContext);
    return <button className={theme}>OK</button>;
  }
  return <button>Default</button>;
}
```

---

## Хук useActionState

Управляет состоянием формы, интегрируется с Server Actions и поддерживает прогрессивное улучшение (работает без JS).

```jsx
import { useActionState } from 'react';

async function addToCart(prevState, formData) {
  const itemId = formData.get('itemId');
  const result = await api.addItem(itemId);
  if (result.error) {
    return { error: result.error };
  }
  return { success: true, items: result.items };
}

function AddToCartForm({ itemId }) {
  const [state, formAction, isPending] = useActionState(addToCart, { items: [] });

  return (
    <form action={formAction}>
      <input type="hidden" name="itemId" value={itemId} />
      <button disabled={isPending}>
        {isPending ? 'Добавляем...' : 'В корзину'}
      </button>
      {state.error && <p className="error">{state.error}</p>}
    </form>
  );
}
```

| Параметр | Описание |
|---|---|
| `action` | Функция (prevState, formData) => newState (sync или async) |
| `initialState` | Начальное состояние |
| `permalink?` | URL для прогрессивного улучшения (SSR без JS) |
| **Возвращает** | `[state, formAction, isPending]` |

---

## Хук useFormStatus

Считывает состояние родительской `<form>` из дочернего компонента.

```jsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();
  return (
    <button disabled={pending}>
      {pending ? 'Отправка...' : 'Отправить'}
    </button>
  );
}

function MyForm() {
  return (
    <form action={serverAction}>
      <input name="email" />
      <SubmitButton /> {/* Должен быть внутри <form> */}
    </form>
  );
}
```

---

## Хук useOptimistic

Показывает ожидаемый результат до завершения async-операции, автоматически откатывая при ошибке.

```jsx
import { useOptimistic } from 'react';

function MessageList({ messages, sendMessage }) {
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (currentMessages, newMessage) => [
      ...currentMessages,
      { text: newMessage, sending: true }
    ]
  );

  async function handleSend(formData) {
    const text = formData.get('message');
    addOptimistic(text); // Мгновенно показывает сообщение
    await sendMessage(text); // При ошибке — автооткат
  }

  return (
    <div>
      {optimisticMessages.map((msg, i) => (
        <p key={i} style={{ opacity: msg.sending ? 0.5 : 1 }}>
          {msg.text}
        </p>
      ))}
      <form action={handleSend}>
        <input name="message" />
        <button>Отправить</button>
      </form>
    </div>
  );
}
```

---

## Действия форм (Form Actions)

В React 19 `<form>` принимает **функцию** в качестве `action`:

```jsx
function SearchForm() {
  async function search(formData) {
    const query = formData.get('q');
    const results = await fetchResults(query);
    // обновить state...
  }

  return (
    <form action={search}>
      <input name="q" placeholder="Поиск..." />
      <button>Найти</button>
    </form>
  );
}
```

- Форма автоматически сбрасывается после успешного action
- Работает с `useActionState` для управления состоянием
- Поддерживает прогрессивное улучшение при SSR

---

## React Server Components

### Серверные компоненты

```jsx
// app/page.jsx — Server Component по умолчанию
import db from './db';

async function ProductPage({ id }) {
  const product = await db.products.findById(id); // Прямой доступ к БД
  return <div>{product.name} — {product.price}₽</div>;
}
```

### Директивы

```jsx
'use client'; // Пометка файла как клиентского компонента

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c + 1)}>{count}</button>;
}
```

```jsx
'use server'; // Пометка функции/файла как серверного действия

export async function deleteItem(id) {
  await db.items.delete(id);
  revalidatePath('/items');
}
```

### Server Functions (Server Actions)

```jsx
'use client';
import { deleteItem } from './actions';

function DeleteButton({ id }) {
  return (
    <form action={() => deleteItem(id)}>
      <button>Удалить</button>
    </form>
  );
}
```

---

## Activity

`<Activity>` (React 19.2) скрывает/показывает UI **без потери состояния** компонента:

```jsx
import { Activity } from 'react';

function Tabs({ activeTab }) {
  return (
    <div>
      <Activity mode={activeTab === 'home' ? 'visible' : 'hidden'}>
        <HomePage />
      </Activity>
      <Activity mode={activeTab === 'profile' ? 'visible' : 'hidden'}>
        <ProfilePage /> {/* State сохраняется даже когда hidden */}
      </Activity>
    </div>
  );
}
```

- `mode="hidden"` — DOM скрыт через `display: none`, эффекты cleanup выполнены, state сохранён
- `mode="visible"` — DOM показан, эффекты setup запущены заново

---

## ViewTransition

`<ViewTransition>` (React 19.2) — декларативные CSS View Transitions:

```jsx
import { ViewTransition, useTransition } from 'react';

function App() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();

  function navigate(newTab) {
    startTransition(() => setTab(newTab));
  }

  return (
    <ViewTransition>
      {tab === 'home' ? <Home /> : <Profile />}
    </ViewTransition>
  );
}
```

CSS анимация:

```css
::view-transition-old(root) {
  animation: fade-out 0.3s ease;
}
::view-transition-new(root) {
  animation: fade-in 0.3s ease;
}
```

`addTransitionType` — пометка типа перехода для разных CSS-анимаций:

```jsx
import { addTransitionType } from 'react';

function navigate(url) {
  startTransition(() => {
    addTransitionType('slide-left');
    setPage(url);
  });
}
```

---

## cache и cacheSignal

`cache()` дедуплицирует одинаковые вызовы в серверных компонентах за один запрос:

```jsx
import { cache } from 'react';

const getUser = cache(async (id) => {
  return await db.users.findById(id);
});

// Два компонента вызывают getUser(1) — запрос к БД выполнится один раз
async function UserName({ id }) { const user = await getUser(id); return <span>{user.name}</span>; }
async function UserAvatar({ id }) { const user = await getUser(id); return <img src={user.avatar} />; }
```

---

## Улучшения ref

### ref как обычный prop

```jsx
// React 19: forwardRef больше не нужен
function MyInput({ placeholder, ref }) {
  return <input placeholder={placeholder} ref={ref} />;
}

// Использование
<MyInput ref={inputRef} placeholder="Введите текст" />
```

### Функция очистки ref

```jsx
<div ref={(node) => {
  // setup — вызывается при монтировании
  node.addEventListener('click', handler);

  // cleanup — вызывается при размонтировании (как useEffect)
  return () => {
    node.removeEventListener('click', handler);
  };
}} />
```

---

## Метаданные документа

React 19 автоматически поднимает `<title>`, `<meta>`, `<link>` в `<head>`:

```jsx
function BlogPost({ post }) {
  return (
    <article>
      <title>{post.title}</title>
      <meta name="description" content={post.summary} />
      <link rel="canonical" href={post.url} />
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  );
}
```

Функции предзагрузки ресурсов:

```jsx
import { preload, preconnect, prefetchDNS, preinit } from 'react-dom';

preinit('/styles/app.css', { as: 'style' });       // Загрузить и применить немедленно
preload('/font.woff2', { as: 'font' });             // Предзагрузить
preconnect('https://api.example.com');               // Установить соединение
prefetchDNS('https://cdn.example.com');              // DNS-резолв заранее
```

---

## Улучшения Error Reporting

```jsx
import { createRoot } from 'react-dom/client';

const root = createRoot(document.getElementById('root'), {
  onCaughtError(error, errorInfo) {
    // Ошибки, пойманные Error Boundary
    logToService('caught', error, errorInfo.componentStack);
  },
  onUncaughtError(error, errorInfo) {
    // Непойманные ошибки — крэш приложения
    logToService('uncaught', error, errorInfo.componentStack);
  },
  onRecoverableError(error, errorInfo) {
    // Ошибки, от которых React восстановился (hydration mismatch)
    logToService('recoverable', error, errorInfo.componentStack);
  },
});
```

`captureOwnerStack()` — получение стека владельцев компонента:

```jsx
import { captureOwnerStack } from 'react';

function MyComponent() {
  // В development: возвращает стек компонентов-владельцев
  const ownerStack = captureOwnerStack();
  // Полезно для отладки: кто рендерит этот компонент
}
```

---

## Прочие улучшения

### Context как провайдер

```jsx
// React 18
<ThemeContext.Provider value="dark">...</ThemeContext.Provider>

// React 19 — .Provider больше не нужен
<ThemeContext value="dark">...</ThemeContext>
```

### useDeferredValue с initialValue

```jsx
const deferredQuery = useDeferredValue(query, ''); // '' показывается при первом рендере
```

### Поддержка Custom Elements

```jsx
// React 19 полностью поддерживает Web Components
<my-custom-element active={true} data={obj} onActivate={handler} />
```

### Улучшенные ошибки гидратации

React 19 показывает diff между серверным и клиентским рендером:

```
Warning: Text content did not match.
Server: "Server: 12/31/2024"
Client: "Client: 1/1/2025"
```
