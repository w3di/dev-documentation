# Suspense и React.lazy — декларативная обработка асинхронных операций

> `Suspense` — компонент React для декларативного управления загрузочным состоянием.
> `React.lazy` — функция для динамического импорта компонентов (code splitting).

---

## Оглавление

1. [Что такое Suspense](#1-что-такое-suspense)
2. [React.lazy — динамический импорт](#2-reactlazy--динамический-импорт)
3. [Suspense fallback](#3-suspense-fallback)
4. [Внутренний механизм (throw Promise)](#4-внутренний-механизм-throw-promise)
5. [Suspense и Data Fetching (use() hook)](#5-suspense-и-data-fetching-use-hook)
6. [Вложенные Suspense boundaries](#6-вложенные-suspense-boundaries)
7. [SuspenseList — координация загрузки](#7-suspenselist--координация-загрузки)
8. [Suspense + useTransition](#8-suspense--usetransition)
9. [Suspense и SSR / Streaming](#9-suspense-и-ssr--streaming)
10. [Лучшие практики](#10-лучшие-практики)

---

## 1. Что такое Suspense

Suspense работает как граница: если дочерний компонент «не готов» (загружается),
Suspense показывает `fallback`. Вместо императивного `if (loading) return <Spinner />`
логика загрузки выносится на уровень дерева.

```
┌────────────────────────────────────────────┐
│  <Suspense fallback={<Spinner />}>         │
│    <LazyComponent />                       │
│  </Suspense>                               │
│                                            │
│  1. React рендерит LazyComponent           │
│        │                                   │
│  2. Компонент бросает Promise (throw)      │
│        │                                   │
│  3. Suspense ловит → показывает <Spinner/> │
│        │                                   │
│  4. Promise resolved → повторный рендер    │
│     → показывается <LazyComponent />       │
└────────────────────────────────────────────┘
```

---

## 2. React.lazy — динамический импорт

`React.lazy` принимает функцию, возвращающую `Promise` с `import()`. Компонент загружается
только при первом рендере — это основа code splitting.

```jsx
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));

function App() {
  const [page, setPage] = useState('dashboard');
  return (
    <div>
      <button onClick={() => setPage('dashboard')}>Панель</button>
      <button onClick={() => setPage('settings')}>Настройки</button>
      <Suspense fallback={<div>Загрузка...</div>}>
        {page === 'dashboard' && <Dashboard />}
        {page === 'settings' && <Settings />}
      </Suspense>
    </div>
  );
}
```

Вызов `lazy()` должен быть **на верхнем уровне модуля**, не внутри компонента (иначе создаётся новый lazy при каждом рендере).

Для именованных экспортов — промежуточный `.then`:

```jsx
const UserList = lazy(() =>
  import('./components').then(m => ({ default: m.UserList }))
);
```

---

## 3. Suspense fallback

Проп `fallback` принимает любой React-элемент, отображаемый во время загрузки.

```jsx
// Skeleton для лучшего UX
<Suspense fallback={<DashboardSkeleton />}>
  <Dashboard />
</Suspense>

// Спиннер с задержкой (без мерцания при быстрой загрузке)
function DelayedSpinner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(t);
  }, []);
  return show ? <Spinner /> : null;
}
<Suspense fallback={<DelayedSpinner />}>
  <HeavyComponent />
</Suspense>
```

Если `fallback` не указан, React ищет ближайший родительский Suspense.

---

## 4. Внутренний механизм (throw Promise)

Suspense основан на паттерне **throw Promise**: незагруженный компонент бросает Promise,
Suspense перехватывает его и подписывается на resolve.

```jsx
// Упрощённая модель resource-обёртки
function createResource(fetchFn) {
  let status = 'pending';
  let result;
  const promise = fetchFn().then(
    data => { status = 'success'; result = data; },
    err  => { status = 'error';   result = err;  }
  );
  return {
    read() {
      if (status === 'pending') throw promise;  // → Suspense
      if (status === 'error')   throw result;   // → ErrorBoundary
      return result;
    },
  };
}

const userResource = createResource(() => fetch('/api/user').then(r => r.json()));

function UserProfile() {
  const user = userResource.read(); // throw если не готов
  return <h1>{user.name}</h1>;
}
```

---

## 5. Suspense и Data Fetching (use() hook)

React 19 вводит `use()` — официальный способ интеграции Promise с Suspense.

```jsx
import { use, Suspense } from 'react';

const cache = new Map();
function getUserPromise(id) {
  if (!cache.has(id)) cache.set(id, fetch(`/api/users/${id}`).then(r => r.json()));
  return cache.get(id);
}

function UserCard({ userId }) {
  const user = use(getUserPromise(userId));
  return <div><h2>{user.name}</h2><p>{user.email}</p></div>;
}

<Suspense fallback={<UserSkeleton />}>
  <UserCard userId={1} />
</Suspense>
```

Особенности `use()`: можно вызывать **внутри условий** (в отличие от других хуков);
Promise должен быть **стабильным** (кэшированным), иначе — бесконечный цикл suspense.

### Поведение в разных сценариях

| Сценарий                       | Поведение                              |
| ------------------------------ | -------------------------------------- |
| `React.lazy` компонент         | Suspense до загрузки JS-чанка          |
| `use(promise)` — данные        | Suspense до resolve промиса            |
| `use(context)`                 | Синхронно, Suspense не задействован    |
| Promise reject                 | Ошибка всплывает до ErrorBoundary      |
| Несколько `use()` в компоненте | Все промисы должны resolve для рендера |
| `use()` + `useTransition`      | Текущий UI остаётся, pending-состояние |

---

## 6. Вложенные Suspense boundaries

Вложенные Suspense создают каскадную загрузку: каждый уровень показывает свой fallback.

```jsx
function Dashboard() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Header />
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
      <Suspense fallback={<TableSkeleton />}>
        <TransactionTable />
      </Suspense>
      <Suspense fallback={<ListSkeleton />}>
        <ActivityFeed />
      </Suspense>
    </Suspense>
  );
}
```

```
t0: <PageSkeleton />                     (всё загружается)
t1: <Header/> + скелеты виджетов         (Header готов)
t2: <Header/> + <ActivityFeed/> + скелеты (Feed готов первым)
t3: все компоненты отображены             (всё готово)
```

---

## 7. SuspenseList — координация загрузки

`SuspenseList` (экспериментальный) координирует порядок появления нескольких Suspense-блоков.

```jsx
import { SuspenseList, Suspense } from 'react';
function Feed() {
  return (
    <SuspenseList revealOrder="forwards" tail="collapsed">
      <Suspense fallback={<PostSkeleton />}><Post id={1} /></Suspense>
      <Suspense fallback={<PostSkeleton />}><Post id={2} /></Suspense>
      <Suspense fallback={<PostSkeleton />}><Post id={3} /></Suspense>
    </SuspenseList>
  );
}
```

| Параметр     | Значения                                | Описание                                  |
| ------------ | --------------------------------------- | ----------------------------------------- |
| `revealOrder`| `"forwards"`, `"backwards"`, `"together"` | Порядок раскрытия Suspense-детей        |
| `tail`       | `"collapsed"`, `"hidden"`               | Как показывать fallback ожидающих          |

---

## 8. Suspense + useTransition

`useTransition` помечает обновление как «переход»: React показывает **текущий контент**
вместо fallback, пока новый загружается.

```jsx
import { useState, useTransition, Suspense, lazy } from 'react';
const Home = lazy(() => import('./Home'));
const About = lazy(() => import('./About'));

function TabNav() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();
  function selectTab(next) {
    startTransition(() => setTab(next));
  }
  return (
    <div>
      <button onClick={() => selectTab('home')}>Главная</button>
      <button onClick={() => selectTab('about')}>О нас</button>
      {isPending && <div className="loading-bar" />}
      {/* Без useTransition: fallback при переключении.
          С useTransition: текущая вкладка остаётся видимой. */}
      <Suspense fallback={<TabSkeleton />}>
        {tab === 'home' && <Home />}
        {tab === 'about' && <About />}
      </Suspense>
    </div>
  );
}
```

---

## 9. Suspense и SSR / Streaming

React 18 интегрирует Suspense с SSR через **Streaming**: `renderToPipeableStream` отправляет
HTML по мере готовности, не дожидаясь рендера всего дерева.

```jsx
import { renderToPipeableStream } from 'react-dom/server';
function handleRequest(req, res) {
  const { pipe, abort } = renderToPipeableStream(<App />, {
    bootstrapScripts: ['/bundle.js'],
    onShellReady() {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      pipe(res);
    },
    onShellError() { res.statusCode = 500; res.send('<h1>Error</h1>'); },
    onError(err) { console.error(err); },
  });
  setTimeout(abort, 10000);
}
```

```
Сервер                              Клиент
  │ ── Shell HTML ────────────────► каркас с плейсхолдерами
  │ ── Chunk (Chart готов) ───────► React заменяет плейсхолдер
  │ ── Chunk (Feed готов) ────────► следующий блок появляется
```

Каждый `<Suspense>` на сервере — точка, где HTML отправляется отдельным чанком.
Клиентский React встраивает чанки в DOM без перезагрузки.

---

## 10. Лучшие практики

```jsx
// ХОРОШО: Suspense на уровне маршрутов + ErrorBoundary
function App() {
  return (
    <ErrorBoundary fallback={<ErrorPage />}>
      <Suspense fallback={<PageSkeleton />}>
        <Router>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Router>
      </Suspense>
    </ErrorBoundary>
  );
}
```

1. **Маршруты** — каждая страница под Suspense (основной use-case для `React.lazy`).
2. **Тяжёлые виджеты** — графики, таблицы, редакторы.
3. **ErrorBoundary над Suspense** — всегда размещайте EB выше.
4. **Skeleton вместо спиннеров** — создаёт ощущение скорости.
5. **Параллельные запросы** — избегайте «водопада»:

```jsx
// Водопад (ПЛОХО): запросы последовательны
function Page() {
  const user = use(fetchUser());
  const posts = use(fetchPosts(user.id)); // ждёт user
  return <div>{user.name}: {posts.length}</div>;
}

// Параллельно (ХОРОШО): каждый в своём Suspense
function Page({ userId }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <UserSection userId={userId} />
      <PostsSection userId={userId} />
    </Suspense>
  );
}
```
