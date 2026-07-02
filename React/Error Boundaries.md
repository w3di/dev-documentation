# Error Boundaries — перехват ошибок рендеринга

> Error Boundary — классовый компонент React, перехватывающий ошибки JavaScript
> в дереве дочерних компонентов во время рендеринга. Вместо падения всего приложения
> Error Boundary отображает запасной (fallback) интерфейс.

---

## Оглавление

1. [Что такое Error Boundaries](#1-что-такое-error-boundaries)
2. [Создание Error Boundary](#2-создание-error-boundary)
3. [Какие ошибки перехватываются](#3-какие-ошибки-перехватываются)
4. [Какие ошибки НЕ перехватываются](#4-какие-ошибки-не-перехватываются)
5. [Fallback UI при ошибке](#5-fallback-ui-при-ошибке)
6. [Гранулярность Error Boundaries](#6-гранулярность-error-boundaries)
7. [Логирование ошибок](#7-логирование-ошибок)
8. [Сброс состояния ошибки](#8-сброс-состояния-ошибки)
9. [react-error-boundary — библиотека](#9-react-error-boundary--библиотека)
10. [Error Boundaries в React 19](#10-error-boundaries-в-react-19)

---

## 1. Что такое Error Boundaries

До React 16 любая необработанная ошибка при рендере приводила к размонтированию всего
дерева — пользователь видел пустой экран. Error Boundaries создают изолированные зоны отказа,
аналогично `try/catch`, но для декларативного React-дерева.

```
┌──────────────────────────────────┐
│           <App>                  │
│  ┌───────────────────────────┐   │
│  │   <ErrorBoundary>         │   │
│  │  ┌─────────────────────┐  │   │
│  │  │  <Widget /> ← error │  │   │
│  │  └─────────────────────┘  │   │
│  │  → показывается fallback  │   │
│  └───────────────────────────┘   │
│  <Sidebar /> ← работает          │
└──────────────────────────────────┘
```

---

## 2. Создание Error Boundary

Error Boundary — **классовый компонент** с методами `getDerivedStateFromError` и/или `componentDidCatch`.

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  // Render Phase — обновляет состояние для fallback UI
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  // Commit Phase — побочные эффекты (логирование)
  componentDidCatch(error, errorInfo) {
    console.error('Caught:', error);
    console.error('Stack:', errorInfo.componentStack);
  }
  render() {
    if (this.state.hasError) return <h2>Что-то пошло не так.</h2>;
    return this.props.children;
  }
}
```

| Метод                      | Фаза   | Назначение                                    |
| -------------------------- | ------ | --------------------------------------------- |
| `getDerivedStateFromError` | Render | Чистая функция — обновить state для fallback  |
| `componentDidCatch`        | Commit | Side effects — логирование, отправка в Sentry |

> Функциональные компоненты **не могут** быть Error Boundaries — у хуков нет аналогов этих методов.

---

## 3. Какие ошибки перехватываются

- Ошибки при **рендеринге** дочерних компонентов (тело `render()` или функционального компонента).
- Ошибки в **методах жизненного цикла** (`componentDidMount`, `componentDidUpdate`).
- Ошибки в **конструкторах** дочерних классовых компонентов.

```jsx
function BrokenRender() {
  throw new Error('Render error!');
  return <div>Never rendered</div>;
}
class BrokenLifecycle extends React.Component {
  componentDidMount() { throw new Error('Lifecycle error!'); }
  render() { return <div>Mounted</div>; }
}
// Обе ошибки будут перехвачены:
<ErrorBoundary>
  <BrokenRender />
  <BrokenLifecycle />
</ErrorBoundary>
```

---

## 4. Какие ошибки НЕ перехватываются

| Контекст                             | Перехват? | Причина                               |
| ------------------------------------ | --------- | ------------------------------------- |
| Рендеринг дочерних                   | Да        | Основное назначение EB                |
| Lifecycle дочерних                   | Да        | Часть цикла рендеринга               |
| **Обработчики событий**              | **Нет**   | Выполняются вне Render/Commit Phase   |
| **Асинхронный код** (setTimeout)     | **Нет**   | Ошибка вне стека рендеринга           |
| **SSR**                              | **Нет**   | Другой механизм                       |
| **Ошибки в самом Error Boundary**    | **Нет**   | EB не ловит собственные ошибки        |

Для перехвата ошибок в обработчиках используйте `try/catch`:

```jsx
function SafeButton() {
  const [error, setError] = useState(null);
  function handleClick() {
    try { riskyOperation(); }
    catch (e) { setError(e); }
  }
  if (error) return <div>Ошибка: {error.message}</div>;
  return <button onClick={handleClick}>Click</button>;
}
```

---

## 5. Fallback UI при ошибке

Паттерн с настраиваемым fallback через пропсы:

```jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) { this.props.onError?.(error, info); }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      if (this.props.fallbackRender) {
        return this.props.fallbackRender({
          error: this.state.error,
          resetError: () => this.setState({ hasError: false, error: null }),
        });
      }
      return <h2>Произошла ошибка</h2>;
    }
    return this.props.children;
  }
}

// Использование с render-пропом:
<ErrorBoundary fallbackRender={({ error, resetError }) => (
  <div>
    <p>Ошибка: {error.message}</p>
    <button onClick={resetError}>Повторить</button>
  </div>
)}>
  <Dashboard />
</ErrorBoundary>
```

---

## 6. Гранулярность Error Boundaries

Чем глубже граница — тем меньше контента теряется при сбое.

```jsx
function App() {
  return (
    <ErrorBoundary fallback={<CriticalErrorPage />}> {/* уровень 1 */}
      <Header />
      <main>
        <ErrorBoundary fallback={<p>Ошибка панели</p>}> {/* уровень 2 */}
          <ErrorBoundary fallback={<WidgetPlaceholder />}> {/* уровень 3 */}
            <RevenueChart />
          </ErrorBoundary>
          <ErrorBoundary fallback={<WidgetPlaceholder />}>
            <UserStats />
          </ErrorBoundary>
        </ErrorBoundary>
        <ErrorBoundary fallback={<p>Ошибка sidebar</p>}>
          <Sidebar />
        </ErrorBoundary>
      </main>
    </ErrorBoundary>
  );
}
```

Рекомендации: корень приложения (всегда), маршруты (каждый отдельно), независимые виджеты. Не оборачивайте каждый мелкий компонент.

---

## 7. Логирование ошибок

`componentDidCatch` получает объект ошибки и `errorInfo` с `componentStack`:

```jsx
componentDidCatch(error, errorInfo) {
  logErrorToService({
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: Date.now(),
    route: window.location.pathname,
  });
}
// errorInfo.componentStack:
//   in BrokenWidget (at Dashboard.jsx:42)
//   in Dashboard (at App.jsx:18)
//   in ErrorBoundary (at App.jsx:15)
```

---

## 8. Сброс состояния ошибки

После перехвата EB остаётся в `hasError: true`. Паттерн `resetKey` сбрасывает при навигации:

```jsx
class ResettableErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  resetError = () => this.setState({ hasError: false, error: null });
  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.resetError();
    }
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallbackRender({
        error: this.state.error, resetError: this.resetError,
      });
    }
    return this.props.children;
  }
}
// Сброс при смене маршрута:
<ResettableErrorBoundary
  resetKey={location.pathname}
  fallbackRender={({ error, resetError }) => (
    <div>
      <p>{error.message}</p>
      <button onClick={resetError}>Повторить</button>
    </div>
  )}
>
  <Routes />
</ResettableErrorBoundary>
```

---

## 9. react-error-boundary — библиотека

Готовый `ErrorBoundary` с богатым API и хук `useErrorBoundary` для функциональных компонентов.

```jsx
import { ErrorBoundary, useErrorBoundary } from 'react-error-boundary';

<ErrorBoundary
  fallbackRender={({ error, resetErrorBoundary }) => (
    <div role="alert">
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Повторить</button>
    </div>
  )}
  onReset={() => queryClient.clear()}
  onError={(error, info) => logToSentry(error, info)}
>
  <Dashboard />
</ErrorBoundary>
```

### Хук useErrorBoundary

Позволяет «выбрасывать» ошибки из обработчиков событий и async-кода в ближайший EB:

```jsx
function UserProfile({ userId }) {
  const { showBoundary } = useErrorBoundary();
  useEffect(() => {
    fetchUser(userId).catch(showBoundary); // ошибка → ErrorBoundary
  }, [userId]);
  async function handleDelete() {
    try { await deleteUser(userId); }
    catch (error) { showBoundary(error); }
  }
  return <button onClick={handleDelete}>Удалить</button>;
}
```

---

## 10. Error Boundaries в React 19

React 19 добавляет колбэки `onCaughtError`, `onUncaughtError`, `onRecoverableError` на `createRoot`:

```jsx
import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root'), {
  onCaughtError(error, errorInfo) {
    logToService('caught', error, errorInfo.componentStack);
  },
  onUncaughtError(error, errorInfo) {
    logToService('uncaught', error, errorInfo.componentStack);
  },
  onRecoverableError(error, errorInfo) {
    logToService('recoverable', error, errorInfo.componentStack);
  },
});
root.render(
  <ErrorBoundary fallback={<GlobalError />}>
    <App />
  </ErrorBoundary>
);
```

Также улучшен `componentStack` (исходные файлы и номера строк при наличии source maps)
и добавлен автоматический сброс EB при навигации между маршрутами.
