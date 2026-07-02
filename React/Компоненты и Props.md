# Компоненты и Props — полное руководство

> Компонент — переиспользуемая единица UI, принимающая входные данные (props)
> и возвращающая React-элементы. Props обеспечивают однонаправленный поток данных
> от родителя к потомку.

---

## Оглавление

1. [Функциональные компоненты](#1-функциональные-компоненты)
2. [Классовые компоненты](#2-классовые-компоненты)
3. [Props — однонаправленный поток данных](#3-props--однонаправленный-поток-данных)
4. [Деструктуризация props и значения по умолчанию](#4-деструктуризация-props-и-значения-по-умолчанию)
5. [children как специальный prop](#5-children-как-специальный-prop)
6. [Props vs State](#6-props-vs-state)
7. [Prop Drilling и решения](#7-prop-drilling-и-решения)
8. [Higher-Order Components (HOC)](#8-higher-order-components-hoc)
9. [Render Props](#9-render-props)
10. [Compound Components](#10-compound-components)
11. [Controlled vs Uncontrolled компоненты](#11-controlled-vs-uncontrolled-компоненты)
12. [React.memo — мемоизация компонентов](#12-reactmemo--мемоизация-компонентов)
13. [React.forwardRef — проброс ссылок](#13-reactforwardref--проброс-ссылок)
14. [Рендеринг — когда React перерисовывает компонент](#14-рендеринг--когда-react-перерисовывает-компонент)

---

## 1. Функциональные компоненты

Функция, принимающая `props` и возвращающая JSX. С React 16.8 (хуки) — основной способ:

```jsx
function Greeting({ name }) {
  return <h1>Привет, {name}!</h1>;
}
const Greeting = ({ name }) => <h1>Привет, {name}!</h1>; // arrow — допустимо
```

| Критерий                  | Функциональные                             | Классовые                                        |
| ------------------------- | ------------------------------------------ | ------------------------------------------------ |
| **Синтаксис**             | Функция → JSX                              | Класс с `render()`                               |
| **Состояние**             | `useState`, `useReducer`                   | `this.state` + `setState()`                      |
| **Побочные эффекты**      | `useEffect`, `useLayoutEffect`             | `componentDidMount/Update/WillUnmount`           |
| **this**                  | Отсутствует                                | Требует `bind` / arrow methods                   |
| **Error Boundaries**      | Не поддерживают (пока)                     | `componentDidCatch`, `getDerivedStateFromError`  |
| **Мемоизация**            | `React.memo()`                             | `shouldComponentUpdate` / `PureComponent`        |
| **Server Components**     | Поддерживаются                             | Не поддерживаются                                |
| **Рекомендация React 18+**| Основной способ                            | Legacy — только Error Boundaries                 |

---

## 2. Классовые компоненты

Наследуют `React.Component`, обязаны реализовать `render()`. Единственное применение
в 2024+ — **Error Boundaries**:

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) { logErrorToService(error, info); }

  render() {
    if (this.state.hasError) return <FallbackUI error={this.state.error} />;
    return this.props.children;
  }
}
```

---

## 3. Props — однонаправленный поток данных

Данные передаются строго от родителя к потомку. Props **иммутабельны** — потомок
не может их менять. Обратная связь — через callback-функции.

```
One-Way Data Flow
═══════════════════
         ┌────────────┐
         │    App      │  state: { user, theme }
         └──┬─────┬───┘
    props   │     │   props
  (user)    │     │  (theme)
            ▼     ▼
     ┌──────┐   ┌──────────┐
     │Header│   │  Content  │
     └──┬───┘   └────┬─────┘
        │ props       │ props (theme)
        ▼             ▼
   ┌────────┐    ┌───────┐
   │UserName│    │Sidebar│
   └────────┘    └───────┘

Стрелки ВСЕГДА вниз.
Обратная связь: <Child onAction={handleAction} />
```

```jsx
// Props — аргументы функции-компонента:
<Avatar src="/photo.jpg" size={64} alt="Фото" />

function Avatar(props) {
  // props === { src: "/photo.jpg", size: 64, alt: "Фото" }
  return <img src={props.src} width={props.size} alt={props.alt} />;
}
```

---

## 4. Деструктуризация props и значения по умолчанию

```jsx
function Button({ label, onClick, variant = 'primary', disabled = false }) {
  return (
    <button className={`btn btn--${variant}`} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
// <Button label="Отправить" onClick={handleSubmit} />  → variant='primary'
```

Rest-параметры для проброса:

```jsx
function Input({ label, error, ...inputProps }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input {...inputProps} />
      {error && <span className="error">{error}</span>}
    </div>
  );
}
// type, placeholder, onChange — пробрасываются в <input>
```

---

## 5. children как специальный prop

Основа **паттерна композиции** — содержимое между тегами передаётся как `children`:

```jsx
function Card({ title, children }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <div className="card__body">{children}</div>
    </div>
  );
}

<Card title="Профиль">
  <Avatar src="/photo.jpg" />
  <p>Описание</p>
</Card>
```

Множественные «слоты» через именованные props:

```jsx
function Layout({ header, sidebar, children }) {
  return (
    <div className="layout">
      <header>{header}</header>
      <aside>{sidebar}</aside>
      <main>{children}</main>
    </div>
  );
}
<Layout header={<Nav />} sidebar={<FilterPanel />}><ArticleList /></Layout>
```

---

## 6. Props vs State

| Критерий            | Props                                 | State                                     |
| ------------------- | ------------------------------------- | ----------------------------------------- |
| **Владелец**        | Родительский компонент                | Сам компонент                             |
| **Изменяемость**    | Read-only                             | Изменяемы через `setState`/`useState`     |
| **Источник**        | Передаются снаружи                    | Инициализируются внутри                   |
| **Обновление**      | Меняются при ре-рендере родителя      | Изменение вызывает ре-рендер              |
| **Аналогия**        | Аргументы функции                     | Локальные переменные функции              |

**Lifting State Up**: если двум компонентам нужны одни данные — поднять state
в ближайшего общего предка и передать вниз через props.

---

## 7. Prop Drilling и решения

Prop Drilling — props проходят через промежуточные компоненты, которые их не используют.

**Решение 1: Context API**

```jsx
const ThemeContext = createContext('light');

function App() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={theme}>
      <Layout /> {/* theme не пробрасывается */}
    </ThemeContext.Provider>
  );
}
function Button() {
  const theme = useContext(ThemeContext); // прямой доступ
  return <button className={`btn-${theme}`}>Нажми</button>;
}
```

**Решение 2: Композиция** — передать готовый компонент вместо данных:

```jsx
function App() {
  const button = <Button theme={theme} />;
  return <Layout button={button} />;  // Layout не знает о theme
}
```

---

## 8. Higher-Order Components (HOC)

Функция, принимающая компонент → возвращающая новый с расширенным поведением:

```jsx
function withAuth(WrappedComponent) {
  return function AuthenticatedComponent(props) {
    const { user, isLoading } = useAuth();
    if (isLoading) return <Spinner />;
    if (!user) return <Navigate to="/login" />;
    return <WrappedComponent {...props} user={user} />;
  };
}
const ProtectedDashboard = withAuth(Dashboard);
```

Ограничения: wrapper hell, коллизии props, потеря ref. В современном React
хуки решают те же задачи проще.

---

## 9. Render Props

Компонент получает **функцию**, определяющую что отрисовать — инверсия контроля:

```jsx
function MouseTracker({ render }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const h = e => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);
  return render(pos);
}
<MouseTracker render={({ x, y }) => <div>Курсор: {x}, {y}</div>} />
```

В современном React кастомный хук (`useMousePosition`) лаконичнее.

---

## 10. Compound Components

Группа компонентов с общим неявным состоянием через Context:

```jsx
const TabsCtx = createContext();

function Tabs({ children, defaultIndex = 0 }) {
  const [active, setActive] = useState(defaultIndex);
  return <TabsCtx.Provider value={{ active, setActive }}>{children}</TabsCtx.Provider>;
}
function Tab({ index, children }) {
  const { active, setActive } = useContext(TabsCtx);
  return <button className={active === index ? 'active' : ''} onClick={() => setActive(index)}>{children}</button>;
}
function TabPanel({ index, children }) {
  return useContext(TabsCtx).active === index ? <div>{children}</div> : null;
}
// Использование:
<Tabs><Tab index={0}>Профиль</Tab><Tab index={1}>Настройки</Tab>
  <TabPanel index={0}><Profile /></TabPanel><TabPanel index={1}><Settings /></TabPanel></Tabs>
```

---

## 11. Controlled vs Uncontrolled компоненты

| Критерий              | Controlled                               | Uncontrolled                             |
| --------------------- | ---------------------------------------- | ---------------------------------------- |
| **Источник истины**   | React state                              | DOM (через `ref`)                        |
| **Обновление**        | `onChange` → `setState` → ре-рендер      | DOM обновляет себя сам                   |
| **Начальное значение**| `value={state}`                          | `defaultValue="..."`                     |
| **Валидация**         | В реальном времени                       | При отправке формы                       |
| **Когда**             | Сложные формы, маски, зависимые поля     | Простые формы, интеграция с не-React      |

```jsx
// Controlled:
const [email, setEmail] = useState('');
<input value={email} onChange={e => setEmail(e.target.value)} />

// Uncontrolled:
const inputRef = useRef(null);
<input defaultValue="" ref={inputRef} />
// Чтение: inputRef.current.value
```

---

## 12. React.memo — мемоизация компонентов

Предотвращает ре-рендер, если props не изменились (shallow compare):

```jsx
const ExpensiveList = React.memo(function ExpensiveList({ items, onSelect }) {
  return <ul>{items.map(i => <li key={i.id} onClick={() => onSelect(i.id)}>{i.name}</li>)}</ul>;
});
// Если items и onSelect не изменились по ссылке → пропуск ре-рендера

// Кастомная функция сравнения:
const UserCard = React.memo(UserCardComponent,
  (prev, next) => prev.user.id === next.user.id && prev.user.name === next.user.name
);
```

**Не нужен**, если: компонент рендерится редко, props всегда меняются, компонент лёгкий.

---

## 13. React.forwardRef — проброс ссылок

`ref` не передаётся в функциональный компонент по умолчанию:

```jsx
const FancyInput = React.forwardRef(function FancyInput(props, ref) {
  return <input ref={ref} type="text" placeholder={props.placeholder} />;
});

function Form() {
  const inputRef = useRef(null);
  return <><FancyInput ref={inputRef} /><button onClick={() => inputRef.current.focus()}>Фокус</button></>;
}
```

**React 19+**: `forwardRef` не нужен — `ref` передаётся как обычный prop:

```jsx
function FancyInput({ placeholder, ref }) {
  return <input ref={ref} placeholder={placeholder} />;
}
```

---

## 14. Рендеринг — когда React перерисовывает компонент

Причины ре-рендера: 1) изменение `state`, 2) новые `props`, 3) ре-рендер родителя
(даже если props не менялись), 4) изменение значения `Context`.

**Ре-рендер не равен обновлению DOM** — React вызывает функцию, сравнивает VDOM
и обновляет DOM только при обнаружении различий.

Оптимизация через композицию (лучше мемоизации):

```jsx
// ПЛОХО — ExpensiveTree перерисовывается на каждый mousemove:
function App() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return <div onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}>
    <Cursor position={pos} /><ExpensiveTree />
  </div>;
}

// ХОРОШО — children не пересоздаётся, ExpensiveTree не перерисовывается:
function MouseArea({ children }) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return <div onMouseMove={e => setPos({ x: e.clientX, y: e.clientY })}>
    <Cursor position={pos} />{children}
  </div>;
}
function App() {
  return <MouseArea><ExpensiveTree /></MouseArea>;
}
```

Это работает, потому что `children` — React Element, созданный уровнем выше.
При ре-рендере `MouseArea` ссылка на элемент `ExpensiveTree` не меняется,
и React пропускает его ре-рендер.
