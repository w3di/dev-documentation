# Virtual DOM и Reconciliation

> Virtual DOM — это программная абстракция реального DOM, представленная в виде дерева
> легковесных JavaScript-объектов. React сравнивает деревья в памяти и применяет
> только необходимые изменения к браузерному DOM.

---

## Оглавление

1. [Что такое Virtual DOM](#1-что-такое-virtual-dom)
2. [Структура Virtual DOM элемента](#2-структура-virtual-dom-элемента)
3. [JSX как синтаксический сахар](#3-jsx-как-синтаксический-сахар)
4. [Алгоритм Diffing — O(n) эвристики](#4-алгоритм-diffing--on-эвристики)
5. [Reconciliation — процесс сравнения деревьев](#5-reconciliation--процесс-сравнения-деревьев)
6. [Роль ключей (key) в списках](#6-роль-ключей-key-в-списках)
7. [Batch Updates — группировка обновлений](#7-batch-updates--группировка-обновлений)
8. [Virtual DOM vs прямые манипуляции DOM](#8-virtual-dom-vs-прямые-манипуляции-dom)
9. [React без Virtual DOM — тренды](#9-react-без-virtual-dom--тренды)

---

## 1. Что такое Virtual DOM

Реальный DOM — тяжёлая древовидная структура браузера. Каждый узел содержит сотни
свойств, а операции вставки/удаления запускают `style recalculation`, `layout` и `paint`.

Virtual DOM — **обычные JS-объекты**, описывающие UI. React создаёт виртуальное дерево,
вычисляет минимальный набор мутаций и применяет их к реальному DOM.

```
JSX / createElement
        │
        ▼
┌──────────────────────┐
│   Virtual DOM Tree   │  ◄── лёгкие JS-объекты
└──────────┬───────────┘
           │  Diffing
           ▼
┌──────────────────────┐
│   Effect List        │  ◄── минимальный набор мутаций
└──────────┬───────────┘
           │  Commit Phase
           ▼
┌──────────────────────┐
│   Real DOM (Browser) │
└──────────────────────┘
```

Преимущества: декларативность (`UI = f(state)`), автоматический batching,
предсказуемый поток данных, упрощённая отладка.

---

## 2. Структура Virtual DOM элемента

Вызов `React.createElement` возвращает **React Element** — простой JS-объект:

```jsx
const element = React.createElement(
  'div',
  { className: 'container', id: 'root' },
  React.createElement('h1', null, 'Заголовок'),
  React.createElement('p', null, 'Параграф')
);
// Результат: { $$typeof: Symbol(react.element), type: 'div', key: null,
//   ref: null, props: { className: 'container', id: 'root', children: [...] } }
```

| Поле        | Тип                           | Описание                                                              |
| ----------- | ----------------------------- | --------------------------------------------------------------------- |
| `$$typeof`  | `Symbol(react.element)`       | Маркер типа. Защита от XSS — `Symbol` нельзя передать через JSON.    |
| `type`      | `string \| function \| class` | Строка для DOM-элементов, функция/класс для компонентов.              |
| `key`       | `string \| null`              | Идентификатор среди siblings для Reconciliation списков.               |
| `ref`       | `Ref \| null`                 | Ссылка на DOM-узел или экземпляр компонента.                          |
| `props`     | `object`                      | Свойства элемента, включая `children`.                                |
| `_owner`    | `Fiber \| null`               | Внутреннее — ссылка на Fiber-узел, создавший элемент.                 |

```
VDOM Tree
═════════
        { type: 'div', className: 'app' }
                    │
        ┌───────────┼───────────┐
  { type: 'header' }  { type: Nav }  { type: 'main' }
        │                  │              │
  { type: 'h1' }    { type: 'ul' }  { type: Content }
        │              │                  │
    "Привет"     { type: 'li' }      "Текст статьи"
                 key="home"
```

---

## 3. JSX как синтаксический сахар

### 3.1 Classic runtime (до React 17)

```jsx
// JSX:
function App() {
  return <div className="app"><h1>Заголовок</h1><p>Текст: {2 + 2}</p></div>;
}
// После Babel:
function App() {
  return React.createElement('div', { className: 'app' },
    React.createElement('h1', null, 'Заголовок'),
    React.createElement('p', null, 'Текст: ', 2 + 2)
  );
}
```

### 3.2 Automatic runtime (React 17+)

```jsx
// import React НЕ нужен — Babel/SWC добавляют автоматически:
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';

function App() {
  return _jsxs('div', {
    className: 'app',
    children: [_jsx('h1', { children: 'Заголовок' })]
  });
}
```

Отличия: `children` внутри `props`, `jsx()` для одного child / `jsxs()` для массива,
`key` передаётся отдельным аргументом.

### 3.3 Ручное использование createElement

```jsx
import { createElement } from 'react';

function DynamicHeading({ level, children }) {
  return createElement(`h${level}`, null, children); // h1, h2, ..., h6
}
```

---

## 4. Алгоритм Diffing — O(n) эвристики

Классическое сравнение деревьев — **O(n³)**. React использует две эвристики для **O(n)**:

1. **Разные типы → полная замена.** `<div>` → `<span>` — старое поддерево демонтируется,
   новое монтируется целиком. Никакого рекурсивного сравнения.
2. **Ключи для стабильной идентификации** элементов в списках.

```jsx
// Разные типы — полная замена, Counter теряет состояние:
<div><Counter /></div>   →   <span><Counter /></span>

// Одинаковые типы — обновляются только изменённые props:
<div className="old" />  →   <div className="new" />  // меняется только className

// Одинаковые компоненты — экземпляр и состояние СОХРАНЯЮТСЯ:
<UserProfile name="Alice" />  →  <UserProfile name="Bob" />
```

Сравнение children **по позиции** (без ключей):

```jsx
// Добавление в конец — эффективно (позиции 0,1 совпали):
<ul><li>A</li><li>B</li></ul>  →  <ul><li>A</li><li>B</li><li>C</li></ul>

// Добавление в начало — ВСЕ позиции «изменились», перерисовка каждого <li>:
<ul><li>A</li><li>B</li></ul>  →  <ul><li>C</li><li>A</li><li>B</li></ul>
// Решение — использовать key.
```

---

## 5. Reconciliation — процесс сравнения деревьев

Reconciliation происходит в **Render Phase** Fiber-архитектуры. React строит
**Work-In-Progress Tree** (клон Current Tree), применяет изменения, а затем
в Commit Phase обновляет реальный DOM (**double buffering**).

```
setState() / useState setter
        │
        ▼
  Создание нового VDOM (render / return JSX)
        │
        ▼
  Diffing: Current Fiber Tree ↔ новые React Elements
        │
        ▼
  Effect List (Placement | Update | Deletion)
        │
        ▼
  Commit Phase → Real DOM обновлён
```

| Тег эффекта     | Описание                                              |
| --------------- | ----------------------------------------------------- |
| `Placement`     | Новый узел — вставить в DOM                           |
| `Update`        | Props/state изменились — обновить DOM-атрибуты        |
| `Deletion`      | Узел отсутствует в новом дереве — удалить из DOM      |

---

## 6. Роль ключей (key) в списках

### 6.1 Корректное использование

```jsx
// Стабильный уникальный ID:
{todos.map(todo => <li key={todo.id}><TodoItem text={todo.text} /></li>)}

// Составной ключ, если нет единого id:
{comments.map(c => <Comment key={`${c.author}-${c.timestamp}`} data={c} />)}
```

### 6.2 Антипаттерн: index как key

```jsx
// ПЛОХО — при удалении из середины индексы сдвигаются, React привязывает
// состояние (input) к позиции, а не к данным:
{items.map((item, i) => <li key={i}><input defaultValue={item.name} /></li>)}
```

Index допустим **только если**: список статический, элементы без состояния, нет ID.

### 6.3 key для сброса состояния

```jsx
// Смена key = полный демонтаж + новый экземпляр, все useState сбрасываются:
<Profile key={userId} userId={userId} />
```

---

## 7. Batch Updates — группировка обновлений

React 18 ввёл **Automatic Batching** — все `setState` группируются в один рендер:

```jsx
async function handleClick() {
  const data = await fetch('/api');
  setCount(c => c + 1);
  setFlag(f => !f);
  // React 18: один ре-рендер с обоими изменениями
}
```

Принудительный flush через `flushSync`:

```jsx
import { flushSync } from 'react-dom';

flushSync(() => setCount(c => c + 1));
console.log(ref.current.offsetHeight); // DOM уже обновлён
```

---

## 8. Virtual DOM vs прямые манипуляции DOM

| Критерий                  | Virtual DOM (React)                           | Прямые манипуляции DOM                      |
| ------------------------- | --------------------------------------------- | ------------------------------------------- |
| **Модель**                | Декларативная — *что* отобразить              | Императивная — *как* обновить               |
| **Производительность**    | Достаточно для большинства приложений         | Быстрее при точечных обновлениях            |
| **Overhead**              | Создание VDOM + diffing на каждый рендер      | Нет, но легко запустить лишний reflow       |
| **Масштабируемость**      | Хорошо масштабируется                         | Код неуправляем при росте                   |
| **Предсказуемость**       | UI = f(state)                                 | Состояние размазано по DOM                  |
| **Batching**              | Автоматический                                | Ручной                                      |

VDOM проигрывает в: Canvas/WebGL, таблицах 10 000+ строк, анимациях реального времени.

---

## 9. React без Virtual DOM — тренды

**React Compiler** — AOT-компилятор, автоматически мемоизирующий выражения
и JSX-поддеревья, минимизируя создание VDOM-объектов:

```jsx
// Компилятор автоматически оборачивает в useMemo/useCallback:
function ProductCard({ product, onBuy }) {
  const discount = product.price * 0.1;
  return <div><h2>{product.name}</h2><p>Скидка: {discount}</p></div>;
}
```

**Сигналы** (Solid.js, Svelte 5, Angular, Preact) обновляют DOM напрямую,
без промежуточного VDOM:

```jsx
// Solid.js — обновляется ТОЛЬКО зависимый DOM-узел, без diffing:
const [count, setCount] = createSignal(0);
return <button onClick={() => setCount(c => c + 1)}>{count()}</button>;
```

| Подход                | Overhead                    | Гранулярность           | DX                          |
| --------------------- | --------------------------- | ----------------------- | --------------------------- |
| Virtual DOM (React)   | VDOM + diffing              | Компонент целиком       | Простая ментальная модель   |
| Signals (Solid, etc.) | Подписки на значения        | Отдельный DOM-узел      | Требует понимания реактивности |
| React Compiler + VDOM | Минимизирован компилятором  | Мемоизированные поддеревья | Прозрачно для разработчика  |

React движется к гибридной модели: **React Compiler** минимизирует overhead,
**Server Components** сокращают клиентский VDOM, **Concurrent Features**
позволяют прерывать и возобновлять работу с VDOM.
