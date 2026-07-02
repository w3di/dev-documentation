# JSX — глубокое погружение

## Оглавление

1. [Что такое JSX](#что-такое-jsx)
2. [Трансформация JSX в JavaScript](#трансформация-jsx-в-javascript)
3. [Правила JSX](#правила-jsx)
4. [JavaScript-выражения в JSX](#javascript-выражения-в-jsx)
5. [Условный рендеринг](#условный-рендеринг)
6. [Рендеринг списков](#рендеринг-списков)
7. [Fragment](#fragment)
8. [JSX и TypeScript](#jsx-и-typescript)

---

## Что такое JSX

JSX (JavaScript XML) — синтаксическое расширение JavaScript, позволяющее писать разметку прямо в JS-коде. JSX — **не HTML**, а синтаксический сахар для вызовов функций, создающих объекты React Element.

```jsx
// JSX
const element = <h1 className="title">Привет, {name}!</h1>;

// Результат — обычный JS-объект (React Element)
// { type: 'h1', props: { className: 'title', children: 'Привет, ...' } }
```

---

## Трансформация JSX в JavaScript

### Classic Runtime (до React 17)

Требовал `import React from 'react'` в каждом файле:

```jsx
// JSX
const el = <div id="app"><span>Текст</span></div>;

// Трансформация → React.createElement
const el = React.createElement('div', { id: 'app' },
  React.createElement('span', null, 'Текст')
);
```

### Automatic Runtime (React 17+)

Не требует `import React` — компилятор вставляет импорты автоматически:

```jsx
// JSX
const el = <div id="app"><span>Текст</span></div>;

// Трансформация → jsx() из react/jsx-runtime
import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
const el = _jsxs('div', { id: 'app', children: [_jsx('span', { children: 'Текст' })] });
```

| Трансформатор | Настройка |
|---|---|
| Babel | `@babel/preset-react` с `runtime: 'automatic'` |
| SWC | `jsc.transform.react.runtime: 'automatic'` |
| TypeScript | `"jsx": "react-jsx"` в tsconfig.json |

### Структура React Element

```jsx
const element = <button onClick={fn} className="btn">Клик</button>;

// Внутренне:
{
  $$typeof: Symbol.for('react.element'), // защита от XSS-инъекций
  type: 'button',
  key: null,
  ref: null,
  props: {
    onClick: fn,
    className: 'btn',
    children: 'Клик'
  }
}
```

---

## Правила JSX

### Один корневой элемент

```jsx
// ❌ Ошибка — два корневых элемента
return (
  <h1>Заголовок</h1>
  <p>Параграф</p>
);

// ✅ Обернуть в Fragment
return (
  <>
    <h1>Заголовок</h1>
    <p>Параграф</p>
  </>
);
```

### Все теги закрыты

```jsx
<img src="photo.jpg" />    {/* Самозакрывающийся */}
<br />
<input type="text" />
```

### Именование атрибутов — camelCase

| HTML | JSX |
|---|---|
| `class` | `className` |
| `for` | `htmlFor` |
| `tabindex` | `tabIndex` |
| `onclick` | `onClick` |
| `readonly` | `readOnly` |
| `maxlength` | `maxLength` |
| `stroke-width` | `strokeWidth` |

Исключения: `data-*` и `aria-*` пишутся через дефис как в HTML.

---

## JavaScript-выражения в JSX

Фигурные скобки `{}` вставляют **выражения** (не инструкции):

```jsx
const name = 'Мир';
return <h1>Привет, {name.toUpperCase()}!</h1>;
// Привет, МИР!

return <p>Сумма: {2 + 2}</p>;
// Сумма: 4

return <p>Сегодня: {new Date().toLocaleDateString()}</p>;
```

### Объекты — двойные фигурные скобки

```jsx
<div style={{ color: 'red', fontSize: '16px' }}>Текст</div>
{/*        ^                                 ^
    внешние {} — JSX-выражение
    внутренние {} — объект JavaScript         */}
```

### Нельзя: инструкции (if, for, switch)

```jsx
// ❌ if — это инструкция, не выражение
return <div>{if (ok) 'Да'}</div>;

// ✅ Тернарный оператор — это выражение
return <div>{ok ? 'Да' : 'Нет'}</div>;
```

---

## Условный рендеринг

### Тернарный оператор

```jsx
return <div>{isLoggedIn ? <Dashboard /> : <Login />}</div>;
```

### Логическое И (&&)

```jsx
return <div>{unreadCount > 0 && <Badge count={unreadCount} />}</div>;
```

> **Подводный камень:** `0 && <Component />` рендерит `"0"`, не `null`. Используйте `> 0 &&` или `!!value &&`.

### Ранний return

```jsx
function UserProfile({ user }) {
  if (!user) return null;                    // Ничего не рендерить
  if (user.banned) return <BannedNotice />;  // Альтернативный UI
  return <Profile user={user} />;            // Основной UI
}
```

### Переменная для JSX

```jsx
function StatusIcon({ status }) {
  let icon;
  if (status === 'success') icon = <CheckIcon />;
  else if (status === 'error') icon = <ErrorIcon />;
  else icon = <LoadingIcon />;

  return <div className="status">{icon}</div>;
}
```

---

## Рендеринг списков

### Array.map()

```jsx
function TodoList({ todos }) {
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}
```

### Роль key

`key` — стабильный идентификатор элемента для алгоритма Reconciliation. React использует key чтобы понять, какие элементы добавлены, удалены или перемещены.

```jsx
// ✅ Хорошо: уникальный ID из данных
{items.map(item => <Card key={item.id} data={item} />)}

// ⚠️ Допустимо: index для статичных списков без переупорядочивания
{items.map((item, index) => <li key={index}>{item}</li>)}

// ❌ Плохо: index для динамических списков
// При удалении/вставке — state компонентов «едет», приводя к багам
```

### Почему index как key — антипаттерн для динамических списков

При удалении элемента из середины все последующие индексы сдвигаются → React переиспользует DOM/state неправильных компонентов.

### Генерация ключей

```jsx
// При создании элемента — присвоить ID
const newItem = { id: crypto.randomUUID(), text: 'Новая задача' };

// Комбинация данных для уникальности
{users.map(user => <Row key={`${user.name}-${user.email}`} user={user} />)}
```

---

## Fragment

Группировка элементов без лишнего DOM-узла:

```jsx
// Короткий синтаксис
return (
  <>
    <dt>{item.term}</dt>
    <dd>{item.description}</dd>
  </>
);

// Полный синтаксис — единственный способ передать key
import { Fragment } from 'react';

{items.map(item => (
  <Fragment key={item.id}>
    <dt>{item.term}</dt>
    <dd>{item.description}</dd>
  </Fragment>
))}
```

---

## JSX и TypeScript

### Типизация props

```tsx
interface ButtonProps {
  label: string;
  variant?: 'primary' | 'secondary';
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
}

function Button({ label, variant = 'primary', onClick, children }: ButtonProps) {
  return (
    <button className={variant} onClick={onClick}>
      {children ?? label}
    </button>
  );
}
```

### React.FC vs обычная функция

```tsx
// ❌ React.FC — не рекомендуется (неявный children, проблемы с generics)
const Button: React.FC<ButtonProps> = ({ label }) => <button>{label}</button>;

// ✅ Обычная функция с типизированными props
function Button({ label }: ButtonProps) {
  return <button>{label}</button>;
}
```

### Generic компоненты

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return <ul>{items.map((item, i) => <li key={i}>{renderItem(item)}</li>)}</ul>;
}

// Использование — TypeScript выведет тип T автоматически
<List items={users} renderItem={(user) => <span>{user.name}</span>} />
```
