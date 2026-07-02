# Server Components и SSR — глубокое погружение

> Серверный рендеринг в React прошёл путь от примитивного `renderToString` до архитектуры
> React Server Components, где граница между сервером и клиентом управляется на уровне
> отдельных компонентов. Понимание этой эволюции критично для построения
> производительных приложений.

---

## Оглавление

1. [Стратегии рендеринга: CSR vs SSR vs SSG vs ISR](#1-стратегии-рендеринга-csr-vs-ssr-vs-ssg-vs-isr)
2. [SSR в React — renderToString и Streaming](#2-ssr-в-react--rendertostring-и-streaming)
3. [Hydration — «оживление» серверного HTML](#3-hydration--оживление-серверного-html)
4. [Selective Hydration — приоритизация интерактивных частей](#4-selective-hydration--приоритизация-интерактивных-частей)
5. [React Server Components (RSC) — концепция](#5-react-server-components-rsc--концепция)
6. [Директивы 'use client' и 'use server'](#6-директивы-use-client-и-use-server)
7. [Как RSC работают: поток данных от сервера к клиенту](#7-как-rsc-работают-поток-данных-от-сервера-к-клиенту)
8. [RSC vs SSR — ключевые различия](#8-rsc-vs-ssr--ключевые-различия)
9. [Server Actions — вызов серверных функций из клиента](#9-server-actions--вызов-серверных-функций-из-клиента)
10. [Streaming и прогрессивная загрузка](#10-streaming-и-прогрессивная-загрузка)
11. [Фреймворки: Next.js App Router, Remix](#11-фреймворки-nextjs-app-router-remix)

---

## 1. Стратегии рендеринга: CSR vs SSR vs SSG vs ISR

Выбор стратегии рендеринга определяет момент генерации HTML, объём JavaScript на клиенте
и поведение при первом визите пользователя.

| Критерий | CSR | SSR | SSG | ISR |
|---|---|---|---|---|
| **Когда генерируется HTML** | В браузере при загрузке JS | На сервере при каждом запросе | На этапе сборки (build time) | На этапе сборки + ревалидация |
| **Time to First Byte (TTFB)** | Быстрый (пустой HTML) | Медленнее (сервер рендерит) | Очень быстрый (статический файл) | Быстрый (кэш CDN) |
| **First Contentful Paint (FCP)** | Медленный (ждём JS) | Быстрый (HTML уже готов) | Очень быстрый | Быстрый |
| **Time to Interactive (TTI)** | = FCP (после загрузки JS) | После hydration | После hydration | После hydration |
| **SEO** | Плохое (пустой HTML) | Отличное | Отличное | Отличное |
| **Свежесть данных** | Всегда актуальные | Всегда актуальные | Устаревшие до rebuild | Контролируемая (revalidate) |
| **Нагрузка на сервер** | Минимальная | Высокая (каждый запрос) | Нулевая (CDN) | Низкая (периодическая) |
| **Пример использования** | Дашборды, SPA | E-commerce, новости | Блоги, документация | Каталоги, маркетплейсы |

### Визуальная схема временных отрезков CSR vs SSR

```
CSR:
Запрос ──► Пустой HTML ──► Загрузка JS ──► Рендеринг ──► Интерактивность
           │                              │              │
           ▼ TTFB                         ▼ FCP          ▼ TTI
           (быстро)                       (медленно)     (= FCP)

SSR:
Запрос ──► Сервер рендерит ──► Готовый HTML ──► Загрузка JS ──► Hydration ──► Интерактивность
           │                   │                               │              │
           ▼                   ▼ TTFB + FCP                    ▼              ▼ TTI
           (время сервера)     (пользователь видит контент)    (JS загружен)  (после hydration)
```

---

## 2. SSR в React — renderToString и Streaming

### 2.1 Классический подход: renderToString

Функция `renderToString` синхронно рендерит всё дерево компонентов в HTML-строку.
Это блокирующая операция — сервер не может отправить ни байта, пока не обойдёт
всё дерево.

```jsx
// server.js — классический SSR с Express
import express from 'express';
import { renderToString } from 'react-dom/server';
import App from './App';

const app = express();
app.use(express.static('public'));

app.get('*', (req, res) => {
  // Блокирующий рендеринг — весь HTML генерируется за один проход
  const html = renderToString(<App url={req.url} />);

  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>SSR App</title></head>
      <body>
        <div id="root">${html}</div>
        <script src="/bundle.js"></script>
      </body>
    </html>
  `);
});

app.listen(3000);
```

**Проблемы `renderToString`:**
- Синхронная блокировка: при большом дереве TTFB растёт линейно
- Невозможно стримить частичный результат
- `Suspense` не поддерживается (fallback рендерится немедленно)
- Весь контент ждёт самый медленный компонент (data fetching)

### 2.2 Streaming: renderToPipeableStream (React 18+)

`renderToPipeableStream` решает проблему блокировки. Сервер начинает отправлять
HTML немедленно, а контент внутри `<Suspense>` заменяется по мере готовности.

```jsx
// server.js — Streaming SSR с React 18
import { renderToPipeableStream } from 'react-dom/server';
import App from './App';

app.get('*', (req, res) => {
  let didError = false;

  const { pipe, abort } = renderToPipeableStream(
    <App url={req.url} />,
    {
      // Shell готов — оболочка приложения отрендерена
      onShellReady() {
        res.statusCode = didError ? 500 : 200;
        res.setHeader('Content-Type', 'text/html');
        pipe(res); // начинаем стримить HTML в response
      },
      onShellError(error) {
        res.statusCode = 500;
        res.send('<h1>Ошибка загрузки</h1>');
      },
      onError(error) {
        didError = true;
        console.error(error);
      },
    }
  );

  // Таймаут на случай зависшего рендеринга
  setTimeout(() => abort(), 10000);
});
```

**Принцип работы streaming:**
1. React рендерит «оболочку» (shell) — всё, что не обёрнуто в `<Suspense>`
2. Отправляет shell клиенту (TTFB улучшается)
3. Для каждого `<Suspense>` сначала отправляется fallback
4. По мере готовности данных React отправляет `<script>` тег, заменяющий fallback

---

## 3. Hydration — «оживление» серверного HTML

**Hydration** (гидратация) — процесс, при котором React на клиенте «привязывается»
к уже существующему HTML, сгенерированному на сервере. React не перерисовывает DOM,
а проходит по существующим узлам, навешивая обработчики событий и восстанавливая
внутреннее состояние.

```jsx
// client.js — точка входа для hydration
import { hydrateRoot } from 'react-dom/client';
import App from './App';

// React ожидает, что DOM в #root совпадает с результатом рендеринга <App />
hydrateRoot(document.getElementById('root'), <App />);
```

### Этапы hydration

```
Серверный HTML (статичный)
        │
        ▼
React загружается на клиенте
        │
        ▼
hydrateRoot() запускает рекурсивный обход
        │
        ├── Сравнивает серверный DOM с виртуальным деревом
        ├── Навешивает event listeners
        ├── Восстанавливает state и refs
        └── Подключает effects (useEffect)
        │
        ▼
Страница становится интерактивной (TTI)
```

### Mismatch-ошибки

Если серверный HTML не совпадает с клиентским рендерингом, React выдаёт предупреждение
и **перерисовывает** несовпадающее поддерево — теряя преимущества SSR для этого участка.

```jsx
// Распространённая ошибка — использование Date на сервере и клиенте
function Timestamp() {
  // Время на сервере и клиенте разное → mismatch!
  return <span>{new Date().toLocaleTimeString()}</span>;
}

// Исправление — suppressHydrationWarning или useEffect
function Timestamp() {
  const [time, setTime] = useState(null);
  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
  }, []);
  return <span>{time ?? 'Загрузка...'}</span>;
}
```

---

## 4. Selective Hydration — приоритизация интерактивных частей

В React 18 с `renderToPipeableStream` и `<Suspense>` React выполняет **selective hydration**:
гидратация происходит не монолитно, а по частям. Если пользователь начинает
взаимодействовать с компонентом, React приоритизирует его гидратацию.

```jsx
import { Suspense, lazy } from 'react';

const Comments = lazy(() => import('./Comments'));
const Sidebar = lazy(() => import('./Sidebar'));

function App() {
  return (
    <main>
      <Header /> {/* Гидратируется первым — в shell */}

      <Suspense fallback={<SidebarSkeleton />}>
        <Sidebar /> {/* Гидратируется независимо */}
      </Suspense>

      <Article /> {/* Гидратируется в составе shell */}

      <Suspense fallback={<CommentsSkeleton />}>
        <Comments /> {/* Если пользователь кликнет сюда — приоритет повышается */}
      </Suspense>
    </main>
  );
}
```

**Алгоритм приоритизации:**
1. React начинает гидратацию в порядке DOM-дерева
2. Если пользователь кликает на ещё не гидратированный `<Suspense>` — React переключается
   на этот участок
3. Событие «запоминается» и воспроизводится после гидратации
4. Остальные участки продолжают гидратироваться в фоне

---

## 5. React Server Components (RSC) — концепция

React Server Components — фундаментальный сдвиг: компоненты делятся на **серверные**
и **клиентские**. Серверные компоненты выполняются только на сервере и **никогда**
не включаются в клиентский бандл.

| Характеристика | Server Component | Client Component |
|---|---|---|
| **Где выполняется** | Только на сервере | На сервере (SSR) и на клиенте |
| **Доступ к серверу** | Прямой (БД, файлы, env) | Через API/Server Actions |
| **Попадает в JS-бандл** | Нет | Да |
| **useState / useEffect** | Нельзя использовать | Можно |
| **Обработчики событий** | Нельзя (onClick и т.д.) | Можно |
| **async/await в теле** | Можно (async component) | Нельзя напрямую |
| **Ре-рендеринг** | Только при навигации/revalidation | При изменении state/props |
| **Директива** | По умолчанию (без директивы) | `'use client'` |

```jsx
// ServerComponent.jsx — серверный компонент (по умолчанию в App Router)
// Прямой доступ к базе данных — код НЕ попадает в клиентский бандл
import { db } from '@/lib/database';

async function ProductList() {
  const products = await db.query('SELECT * FROM products WHERE active = true');

  return (
    <ul>
      {products.map(p => (
        <li key={p.id}>
          <h3>{p.name}</h3>
          <p>{p.description}</p>
          <AddToCartButton productId={p.id} /> {/* Client Component */}
        </li>
      ))}
    </ul>
  );
}

export default ProductList;
```

---

## 6. Директивы 'use client' и 'use server'

Директивы — это строковые литералы в начале файла (или функции), определяющие
**границу** между серверным и клиентским кодом.

### 'use client'

Помечает файл как точку входа в клиентский граф модулей. Все импорты из этого файла
также становятся клиентскими.

```jsx
'use client';

import { useState } from 'react';

// Этот компонент и все его зависимости попадают в клиентский бандл
export function AddToCartButton({ productId }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    await fetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
    setLoading(false);
  }

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Добавляем...' : 'В корзину'}
    </button>
  );
}
```

### 'use server'

Помечает **асинхронную функцию** как Server Action — функцию, вызываемую с клиента,
но выполняемую на сервере. Может использоваться на уровне файла или отдельной функции.

```jsx
// actions.js
'use server';

import { db } from '@/lib/database';
import { revalidatePath } from 'next/cache';

// Эта функция выполняется ТОЛЬКО на сервере,
// даже если вызвана из клиентского компонента
export async function addToCart(productId) {
  const userId = await getCurrentUser();
  await db.query(
    'INSERT INTO cart (user_id, product_id) VALUES ($1, $2)',
    [userId, productId]
  );
  revalidatePath('/cart');
}
```

---

## 7. Как RSC работают: поток данных от сервера к клиенту

### Архитектура RSC: от запроса к рендерингу

```
                           СЕРВЕР                                    КЛИЕНТ
  ┌──────────────────────────────────────────────┐    ┌─────────────────────────────────┐
  │                                              │    │                                 │
  │  1. Запрос от клиента                        │    │                                 │
  │         │                                    │    │                                 │
  │         ▼                                    │    │                                 │
  │  2. React рендерит Server Components         │    │                                 │
  │     ├── async/await (данные из БД)           │    │                                 │
  │     ├── Формирует React-элементы             │    │                                 │
  │     └── Client Components → placeholder      │    │                                 │
  │         │                                    │    │                                 │
  │         ▼                                    │    │                                 │
  │  3. Сериализация в RSC Payload               │    │                                 │
  │     (специальный потоковый формат)           │──────►  4. RSC Runtime получает payload│
  │     ├── Сериализованные React-элементы       │    │     ├── Десериализует дерево     │
  │     ├── Ссылки на Client Components          │    │     ├── Вставляет Client         │
  │     └── Данные для клиентских props          │    │     │   Components (из бандла)   │
  │                                              │    │     └── Строит виртуальное дерево│
  │                                              │    │         │                        │
  │                                              │    │         ▼                        │
  │                                              │    │  5. React рендерит/обновляет DOM │
  └──────────────────────────────────────────────┘    └─────────────────────────────────┘
```

### Формат RSC Payload

RSC Payload — это не HTML, а **потоковый формат сериализованного React-дерева**.
Каждая строка описывает элемент или ссылку:

```
0:["$","div",null,{"children":[["$","h1",null,{"children":"Каталог"}],["$","$L1",null,{"productId":42}]]}]
1:I["./AddToCartButton.js",["client-chunk-abc123"],"AddToCartButton"]
```

- `$` — обычный React-элемент (сериализованный)
- `$L1` — ссылка на Client Component (lazy-загрузка модуля с id=1)
- `I` — инструкция импорта клиентского модуля

---

## 8. RSC vs SSR — ключевые различия

Распространённое заблуждение — считать RSC просто «новым SSR». Это разные механизмы,
решающие разные задачи.

| Критерий | SSR | RSC |
|---|---|---|
| **Что генерируется** | HTML-строка | Сериализованное React-дерево (RSC Payload) |
| **Когда выполняется** | При каждом HTTP-запросе | При навигации / revalidation |
| **Клиентский JS** | Весь код компонентов в бандле | Только Client Components в бандле |
| **Hydration** | Полная гидратация всего дерева | Гидратация только Client Components |
| **Состояние клиента** | Теряется при навигации (без SPA) | Сохраняется (React управляет деревом) |
| **Data fetching** | getServerSideProps / loader | Прямо в теле async-компонента |
| **Повторный рендеринг** | Полная перезагрузка страницы | Частичное обновление поддерева |
| **Вложенность** | Одна точка входа SSR | Произвольная вложенность SC/CC |
| **Размер бандла** | Все компоненты в бандле | Server Components исключены |

**SSR** решает проблему первой загрузки (FCP, SEO).
**RSC** решает проблему размера бандла и серверного доступа к данным на уровне компонентов.

В современных фреймворках (Next.js App Router) **SSR и RSC работают вместе**:
сервер рендерит RSC-дерево → генерирует HTML (SSR) → стримит клиенту →
клиент гидратирует только Client Components.

---

## 9. Server Actions — вызов серверных функций из клиента

Server Actions позволяют вызывать серверные функции напрямую из клиентских компонентов
без ручного создания API-эндпоинтов. Под капотом React генерирует POST-запрос.

```jsx
// actions.ts
'use server';

import { db } from '@/lib/database';
import { revalidatePath } from 'next/cache';

export async function createComment(formData) {
  const text = formData.get('text');
  const postId = formData.get('postId');

  await db.query(
    'INSERT INTO comments (post_id, text, created_at) VALUES ($1, $2, NOW())',
    [postId, text]
  );

  revalidatePath(`/posts/${postId}`);
}
```

```jsx
// CommentForm.jsx — клиентский компонент использует Server Action
'use client';

import { useActionState } from 'react';
import { createComment } from './actions';

export function CommentForm({ postId }) {
  const [state, formAction, isPending] = useActionState(createComment, null);

  return (
    <form action={formAction}>
      <input type="hidden" name="postId" value={postId} />
      <textarea
        name="text"
        placeholder="Ваш комментарий..."
        required
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Отправка...' : 'Отправить'}
      </button>
    </form>
  );
}
```

**Особенности Server Actions:**
- Функция помечена `'use server'` — клиент получает только ссылку (endpoint ID)
- Аргумент `formData` приходит при использовании через `<form action={...}>`
- Поддерживает прогрессивное улучшение (работает без JS на клиенте)
- `revalidatePath` / `revalidateTag` запускает перерендеринг затронутых серверных компонентов

---

## 10. Streaming и прогрессивная загрузка

Streaming позволяет отправлять HTML по частям, не дожидаясь завершения всего рендеринга.
`<Suspense>` определяет границы стриминга.

```jsx
// page.jsx — серверный компонент со Streaming
import { Suspense } from 'react';
import { ProductDetails } from './ProductDetails';
import { Reviews } from './Reviews';
import { Recommendations } from './Recommendations';

export default function ProductPage({ params }) {
  return (
    <main>
      {/* Shell — отправляется немедленно */}
      <Header />

      {/* Стримится, когда данные о товаре готовы */}
      <Suspense fallback={<ProductSkeleton />}>
        <ProductDetails id={params.id} />
      </Suspense>

      {/* Стримится независимо — не блокирует остальное */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <Reviews productId={params.id} />
      </Suspense>

      {/* Может загрузиться последним */}
      <Suspense fallback={<RecommendationsSkeleton />}>
        <Recommendations productId={params.id} />
      </Suspense>
    </main>
  );
}
```

**Механизм потоковой доставки:**
1. Сервер рендерит shell + fallback для каждого `<Suspense>`
2. Отправляет этот HTML (браузер уже рисует страницу)
3. По мере готовности каждого `<Suspense>` сервер отправляет `<script>` тег
4. Встроенный скрипт заменяет fallback на готовый HTML
5. React гидратирует готовые участки

---

## 11. Фреймворки: Next.js App Router, Remix

### Next.js App Router

App Router (Next.js 13.4+) — первая production-реализация RSC.

```jsx
// app/products/[id]/page.jsx — Server Component по умолчанию
import { notFound } from 'next/navigation';
import { db } from '@/lib/database';
import { AddToCartButton } from '@/components/AddToCartButton';

// Метаданные генерируются на сервере
export async function generateMetadata({ params }) {
  const product = await db.getProduct(params.id);
  return { title: product?.name ?? 'Товар не найден' };
}

export default async function ProductPage({ params }) {
  const product = await db.getProduct(params.id);
  if (!product) notFound();

  return (
    <article>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <span>{product.price} ₽</span>
      <AddToCartButton productId={product.id} />
    </article>
  );
}
```

### Remix (React Router 7)

Remix использует loader/action паттерн, где данные загружаются параллельно для всех
вложенных маршрутов. Начиная с v7, поддерживает RSC.

```jsx
// app/routes/products.$id.jsx — Remix loader pattern
import { useLoaderData } from '@remix-run/react';

export async function loader({ params }) {
  const product = await db.getProduct(params.id);
  if (!product) throw new Response('Not Found', { status: 404 });
  return { product };
}

export default function ProductPage() {
  const { product } = useLoaderData();
  return (
    <article>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
    </article>
  );
}
```

**Ключевое различие подходов:**
- **Next.js App Router**: RSC по умолчанию, `'use client'` для клиентских частей, Server Actions
- **Remix**: loader/action архитектура, параллельная загрузка данных, прогрессивное улучшение форм
- Оба фреймворка поддерживают streaming, но реализуют его через разные абстракции
