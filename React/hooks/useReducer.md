# useReducer — управление сложным состоянием через редьюсер

`useReducer` — это хук React, предоставляющий альтернативный механизм управления состоянием компонента, основанный на паттерне **reducer**. В отличие от `useState`, где обновление состояния производится напрямую, `useReducer` делегирует логику переходов между состояниями чистой функции-редьюсеру, принимающей текущее состояние и действие (action), и возвращающей новое состояние. Данный подход особенно эффективен при работе со сложными структурами состояния, множественными взаимосвязанными полями и предсказуемыми переходами.

## Оглавление

1. [Что такое useReducer и когда использовать вместо useState](#1-что-такое-usereducer-и-когда-использовать-вместо-usestate)
2. [Сигнатура хука](#2-сигнатура-хука)
3. [Reducer-функция — (state, action) => newState](#3-reducer-функция--state-action--newstate)
4. [Dispatch — отправка действий](#4-dispatch--отправка-действий)
5. [Паттерн action с type и payload](#5-паттерн-action-с-type-и-payload)
6. [Сравнение с useState](#6-сравнение-с-usestate)
7. [Инициализация состояния и ленивая инициализация](#7-инициализация-состояния-и-ленивая-инициализация)
8. [useReducer + useContext = мини-Redux](#8-usereducer--usecontext--мини-redux)
9. [Типичные паттерны: CRUD, формы, переключатели](#9-типичные-паттерны-crud-формы-переключатели)
10. [Тестирование reducer-функций](#10-тестирование-reducer-функций)

---

## 1. Что такое useReducer и когда использовать вместо useState

`useReducer` воплощает архитектурный паттерн, заимствованный из функционального программирования: вместо императивного изменения состояния компонент **отправляет действия** (dispatch), а чистая функция-редьюсер определяет, как именно состояние должно измениться. Это обеспечивает предсказуемость, тестируемость и централизацию логики переходов.

Использование `useReducer` оправдано, когда:

- Состояние представляет собой объект с несколькими взаимосвязанными полями.
- Переходы между состояниями подчиняются определённым правилам (конечный автомат).
- Обновление одного поля зависит от значения другого.
- Логика обновления состояния достаточно сложна и её необходимо тестировать изолированно.

```jsx
import { useReducer } from 'react';

function counterReducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    default:
      throw new Error(`Неизвестное действие: ${action.type}`);
  }
}

function Counter() {
  const [state, dispatch] = useReducer(counterReducer, { count: 0 });

  return (
    <div>
      <p>Счётчик: {state.count}</p>
      <button onClick={() => dispatch({ type: 'increment' })}>+</button>
      <button onClick={() => dispatch({ type: 'decrement' })}>-</button>
    </div>
  );
}
```

## 2. Сигнатура хука

```jsx
const [state, dispatch] = useReducer(reducer, initialArg, init?);
```

**Параметры:**

- **`reducer`** — чистая функция вида `(state, action) => newState`. Принимает текущее состояние и объект действия, возвращает новое состояние. Должна быть чистой: без побочных эффектов, без мутаций аргументов.
- **`initialArg`** — начальное значение состояния. Если передан третий аргумент `init`, то `initialArg` используется как аргумент для функции `init`.
- **`init`** (необязательный) — функция-инициализатор. Если передана, начальное состояние вычисляется как `init(initialArg)`.

**Возвращаемое значение:**

- **`state`** — текущее состояние.
- **`dispatch`** — функция отправки действий. Стабильна между рендерами (ссылочная идентичность сохраняется).

## 3. Reducer-функция — (state, action) => newState

Редьюсер — это чистая функция, которая описывает **все возможные переходы** между состояниями. Ключевые требования:

- Не мутировать входящий `state` — всегда возвращать новый объект.
- Не выполнять побочные эффекты (запросы к API, запись в localStorage).
- Быть детерминированной: одинаковые входные данные всегда дают одинаковый результат.

```jsx
function todoReducer(state, action) {
  switch (action.type) {
    case 'add':
      return {
        ...state,
        todos: [...state.todos, {
          id: Date.now(),
          text: action.payload,
          completed: false,
        }],
      };
    case 'toggle':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.payload
            ? { ...todo, completed: !todo.completed }
            : todo
        ),
      };
    case 'delete':
      return {
        ...state,
        todos: state.todos.filter(todo => todo.id !== action.payload),
      };
    default:
      return state;
  }
}
```

**Антипаттерн — мутация состояния:**

```jsx
// НЕПРАВИЛЬНО: мутация исходного массива
function brokenReducer(state, action) {
  if (action.type === 'add') {
    state.items.push(action.payload); // мутация!
    return state; // React не увидит изменения — ссылка та же
  }
  return state;
}
```

## 4. Dispatch — отправка действий

Функция `dispatch` служит единственным механизмом инициирования изменений состояния. Она принимает объект действия (action) и передаёт его в редьюсер.

Критические особенности `dispatch`:

- Вызов `dispatch` **не изменяет состояние немедленно** — обновление произойдёт при следующем рендере.
- Функция `dispatch` стабильна между рендерами, поэтому её можно безопасно передавать в дочерние компоненты и исключать из массивов зависимостей `useEffect` / `useCallback`.

```jsx
function TaskManager() {
  const [state, dispatch] = useReducer(taskReducer, { tasks: [], filter: 'all' });

  const handleAddTask = (text) => {
    dispatch({ type: 'ADD_TASK', payload: text });
  };

  const handleSetFilter = (filter) => {
    dispatch({ type: 'SET_FILTER', payload: filter });
  };

  // dispatch стабильна — её не нужно оборачивать в useCallback
  return <TaskList tasks={state.tasks} onAdd={handleAddTask} />;
}
```

## 5. Паттерн action с type и payload

Конвенция именования действий заимствована из экосистемы Flux/Redux. Объект действия, как правило, содержит поле `type` (строковый идентификатор) и `payload` (данные, необходимые для обновления).

```jsx
// Типичные action-объекты
dispatch({ type: 'SET_LOADING', payload: true });
dispatch({ type: 'FETCH_SUCCESS', payload: { users: [...] } });
dispatch({ type: 'FETCH_ERROR', payload: 'Ошибка сети' });
dispatch({ type: 'RESET' }); // payload необязателен
```

Рекомендуется использовать **action creators** — функции, инкапсулирующие создание action-объектов:

```jsx
// Action creators
const addTodo = (text) => ({ type: 'ADD_TODO', payload: text });
const toggleTodo = (id) => ({ type: 'TOGGLE_TODO', payload: id });
const setFilter = (filter) => ({ type: 'SET_FILTER', payload: filter });

// Использование
dispatch(addTodo('Изучить useReducer'));
dispatch(toggleTodo(42));
```

## 6. Сравнение с useState

| Критерий | `useState` | `useReducer` |
|---|---|---|
| Простота | Простая сигнатура, минимальный бойлерплейт | Требует определения редьюсера и действий |
| Сложность состояния | Оптимален для примитивов и простых объектов | Оптимален для сложных объектов с множеством полей |
| Логика обновления | Рассредоточена по обработчикам событий | Централизована в одной функции |
| Тестируемость | Тестируется через рендер компонента | Редьюсер тестируется как чистая функция |
| Зависимые обновления | Требует нескольких вызовов `setState` | Одно действие может обновить несколько полей |
| Масштабируемость | Плохо масштабируется при росте сложности | Хорошо масштабируется, легко добавлять новые действия |
| Отладка | Сложнее отследить причину обновления | `action.type` явно показывает причину каждого перехода |

## 7. Инициализация состояния и ленивая инициализация

Существует два способа задать начальное состояние:

**Прямая инициализация** — `initialArg` передаётся как есть:

```jsx
const [state, dispatch] = useReducer(reducer, { count: 0, items: [] });
```

**Ленивая инициализация** — начальное состояние вычисляется через функцию `init`. Это полезно, когда инициализация требует вычислений (например, чтение из localStorage) или когда необходимо реализовать действие сброса состояния:

```jsx
function createInitialState(username) {
  return {
    username,
    preferences: loadPreferencesFromStorage(username),
    notifications: [],
    isLoading: false,
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return createInitialState(action.payload);
    // ...
  }
}

function UserDashboard({ username }) {
  const [state, dispatch] = useReducer(reducer, username, createInitialState);

  const handleReset = () => {
    dispatch({ type: 'RESET', payload: username });
  };

  return <div>{/* ... */}</div>;
}
```

Ленивая инициализация избегает повторного вызова `createInitialState` при каждом рендере — функция вызывается только один раз, при монтировании компонента.

## 8. useReducer + useContext = мини-Redux

Комбинация `useReducer` и `useContext` позволяет организовать глобальное управление состоянием без подключения сторонних библиотек. Паттерн состоит из трёх слоёв: определение контекста, провайдер с редьюсером, и пользовательские хуки для доступа.

```jsx
import { createContext, useContext, useReducer } from 'react';

const StateContext = createContext(null);
const DispatchContext = createContext(null);

function appReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload, isAuth: true };
    case 'LOGOUT':
      return { ...state, user: null, isAuth: false };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    default:
      throw new Error(`Неизвестное действие: ${action.type}`);
  }
}

const initialState = { user: null, isAuth: false, theme: 'light' };

function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

// Пользовательские хуки для удобного доступа
function useAppState() {
  const context = useContext(StateContext);
  if (context === null) throw new Error('useAppState вне AppProvider');
  return context;
}

function useAppDispatch() {
  const context = useContext(DispatchContext);
  if (context === null) throw new Error('useAppDispatch вне AppProvider');
  return context;
}
```

Разделение `StateContext` и `DispatchContext` — осознанное решение: компоненты, которым нужен только `dispatch`, не будут перерисовываться при изменении состояния, поскольку `dispatch` стабилен между рендерами.

## 9. Типичные паттерны: CRUD, формы, переключатели

### CRUD-операции

```jsx
function crudReducer(state, action) {
  switch (action.type) {
    case 'CREATE':
      return [...state, { id: crypto.randomUUID(), ...action.payload }];
    case 'READ':
      return state;
    case 'UPDATE':
      return state.map(item =>
        item.id === action.payload.id
          ? { ...item, ...action.payload.changes }
          : item
      );
    case 'DELETE':
      return state.filter(item => item.id !== action.payload);
    default:
      return state;
  }
}
```

### Управление формой

```jsx
function formReducer(state, action) {
  switch (action.type) {
    case 'FIELD_CHANGE':
      return {
        ...state,
        values: { ...state.values, [action.payload.field]: action.payload.value },
        errors: { ...state.errors, [action.payload.field]: null },
        touched: { ...state.touched, [action.payload.field]: true },
      };
    case 'SUBMIT_START':
      return { ...state, isSubmitting: true, submitError: null };
    case 'SUBMIT_SUCCESS':
      return { ...state, isSubmitting: false, isSubmitted: true };
    case 'SUBMIT_ERROR':
      return { ...state, isSubmitting: false, submitError: action.payload };
    case 'VALIDATE':
      return { ...state, errors: action.payload };
    case 'RESET':
      return initialFormState;
    default:
      return state;
  }
}

function RegistrationForm() {
  const [form, dispatch] = useReducer(formReducer, {
    values: { name: '', email: '' },
    errors: {},
    touched: {},
    isSubmitting: false,
    isSubmitted: false,
    submitError: null,
  });

  const handleChange = (e) => {
    dispatch({
      type: 'FIELD_CHANGE',
      payload: { field: e.target.name, value: e.target.value },
    });
  };

  return (
    <form onSubmit={() => dispatch({ type: 'SUBMIT_START' })}>
      <input name="name" value={form.values.name} onChange={handleChange} />
      {form.errors.name && <span>{form.errors.name}</span>}
      <button disabled={form.isSubmitting}>Отправить</button>
    </form>
  );
}
```

## 10. Тестирование reducer-функций

Главное преимущество `useReducer` с точки зрения качества кода — редьюсер является чистой функцией и может тестироваться **полностью изолированно** от React, без рендеринга компонентов.

```jsx
// todoReducer.test.js
import { todoReducer } from './todoReducer';

describe('todoReducer', () => {
  const initialState = { todos: [], filter: 'all' };

  test('добавляет новый элемент', () => {
    const action = { type: 'ADD_TODO', payload: 'Тестовая задача' };
    const newState = todoReducer(initialState, action);

    expect(newState.todos).toHaveLength(1);
    expect(newState.todos[0].text).toBe('Тестовая задача');
    expect(newState.todos[0].completed).toBe(false);
  });

  test('не мутирует исходное состояние', () => {
    const action = { type: 'ADD_TODO', payload: 'Задача' };
    const newState = todoReducer(initialState, action);

    expect(newState).not.toBe(initialState);
    expect(initialState.todos).toHaveLength(0);
  });

  test('переключает статус выполнения', () => {
    const stateWithTodo = {
      todos: [{ id: 1, text: 'Задача', completed: false }],
      filter: 'all',
    };
    const newState = todoReducer(stateWithTodo, { type: 'TOGGLE_TODO', payload: 1 });

    expect(newState.todos[0].completed).toBe(true);
  });

  test('выбрасывает ошибку при неизвестном действии', () => {
    expect(() => {
      todoReducer(initialState, { type: 'UNKNOWN' });
    }).toThrow('Неизвестное действие');
  });
});
```

Такое тестирование не требует ни `renderHook`, ни `act`, ни каких-либо утилит тестирования React — достаточно обычных unit-тестов. Это делает тесты быстрыми, предсказуемыми и простыми в поддержке.
