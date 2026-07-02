# Batching — пакетная обработка обновлений состояния

> Batching (пакетирование) — механизм React, группирующий несколько вызовов обновления
> состояния в единый цикл рендеринга, минимизируя число перерисовок и обращений к DOM.

---

## Оглавление

1. [Что такое Batching](#1-что-такое-batching)
2. [Batching в React 17](#2-batching-в-react-17)
3. [Automatic Batching в React 18](#3-automatic-batching-в-react-18)
4. [Как React определяет границы батча](#4-как-react-определяет-границы-батча)
5. [flushSync — принудительный синхронный рендер](#5-flushsync--принудительный-синхронный-рендер)
6. [Очередь обновлений в Fiber (updateQueue)](#6-очередь-обновлений-в-fiber-updatequeue)
7. [Batching и useReducer](#7-batching-и-usereducer)
8. [Практические примеры](#8-практические-примеры)
9. [Влияние на производительность](#9-влияние-на-производительность)
10. [Порядок обновлений внутри батча](#10-порядок-обновлений-внутри-батча)

---

## 1. Что такое Batching

Batching — процесс группировки нескольких вызовов `setState` / `dispatch` в один рендер.
Без батчинга три вызова подряд дали бы три перерисовки и три обновления DOM.

```
┌──────────────────────────────────────────────────┐
│  Без батчинга                                    │
│  setState(A) → render → commit → DOM             │
│  setState(B) → render → commit → DOM             │
│  setState(C) → render → commit → DOM             │
│  Итого: 3 рендера                                │
├──────────────────────────────────────────────────┤
│  С батчингом                                     │
│  setState(A) ──┐                                 │
│  setState(B) ──┼── updateQueue ── render ── DOM  │
│  setState(C) ──┘                                 │
│  Итого: 1 рендер                                 │
└──────────────────────────────────────────────────┘
```

---

## 2. Batching в React 17

В React 17 батчинг работал **только внутри обработчиков синтетических событий**.
Асинхронный код (`setTimeout`, `Promise.then`, нативные обработчики) вызывал отдельный рендер на каждый `setState`.

```jsx
// React 17: батчинг РАБОТАЕТ — обработчик события React
function Counter() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);
  function handleClick() {
    setCount(c => c + 1); // не рендерит сразу
    setFlag(f => !f);     // не рендерит сразу — один рендер на оба
  }
  console.log('Render'); // 1 раз при клике
  return <button onClick={handleClick}>{count}</button>;
}
```

```jsx
// React 17: батчинг НЕ РАБОТАЕТ — setTimeout
function Counter() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);
  function handleClick() {
    setTimeout(() => {
      setCount(c => c + 1); // рендер #1
      setFlag(f => !f);     // рендер #2
    }, 0);
  }
  console.log('Render'); // 2 раза при клике
  return <button onClick={handleClick}>{count}</button>;
}
```

### React 17 vs React 18

| Контекст вызова setState                 | React 17        | React 18     |
| ---------------------------------------- | --------------- | ------------ |
| Обработчик события React (`onClick`)     | Батчится        | Батчится     |
| `setTimeout` / `setInterval`             | **Не** батчится | Батчится     |
| `Promise.then` / `async/await`           | **Не** батчится | Батчится     |
| Нативный `addEventListener`              | **Не** батчится | Батчится     |
| `fetch().then()`                         | **Не** батчится | Батчится     |
| Внутри `flushSync`                       | Синхронно       | Синхронно    |

---

## 3. Automatic Batching в React 18

React 18 ввёл **Automatic Batching**: все обновления батчатся независимо от контекста.
Активируется при использовании `createRoot` (устаревший `ReactDOM.render` сохраняет поведение v17).

```jsx
import { createRoot } from 'react-dom/client';
function App() {
  const [count, setCount] = useState(0);
  const [flag, setFlag] = useState(false);
  function handleClick() {
    setTimeout(() => {
      setCount(c => c + 1);
      setFlag(f => !f);
      // React 18: один рендер!
    }, 0);
    fetch('/api/data').then(() => {
      setCount(c => c + 1);
      setFlag(f => !f);
      // тоже один рендер!
    });
  }
  return <button onClick={handleClick}>{count}</button>;
}
const root = createRoot(document.getElementById('root'));
root.render(<App />);
```

---

## 4. Как React определяет границы батча

React использует внутренний флаг `executionContext` и откладывает рендер до завершения
текущего синхронного стека вызовов. Все `setState` в рамках одного стека попадают в одну очередь.

```
┌────────────────────────────────────────────────────┐
│  setState(A) → updateQueue                         │
│  setState(B) → updateQueue                         │
│  setState(C) → updateQueue                         │
│  ← конец синхронного блока                         │
│                                                    │
│  scheduleCallback (MessageChannel / микрозадача)   │
│  ┌──────────────────────────────────────────────┐  │
│  │ Render Phase: updateQueue A→B→C              │  │
│  │ Вычисляется финальное состояние              │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ Commit Phase: изменения → DOM (один раз)     │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

---

## 5. flushSync — принудительный синхронный рендер

`flushSync` из `react-dom` обходит батчинг — React немедленно рендерит и обновляет DOM.

```jsx
import { flushSync } from 'react-dom';
function handleClick() {
  flushSync(() => { setCount(c => c + 1); });
  // DOM уже обновлён — count актуален
  flushSync(() => { setFlag(f => !f); });
  // DOM обновлён снова — 2 отдельных рендера
}
```

Практический кейс — прокрутка после добавления элемента:

```jsx
function ScrollToBottom() {
  const listRef = useRef(null);
  const [items, setItems] = useState([]);
  function addItem(text) {
    flushSync(() => { setItems(prev => [...prev, text]); });
    // DOM обновлён — безопасно скроллить
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }
  return <ul ref={listRef}>{items.map(i => <li key={i}>{i}</li>)}</ul>;
}
```

> `flushSync` снижает производительность. Используйте только когда синхронное обновление DOM критически необходимо.

---

## 6. Очередь обновлений в Fiber (updateQueue)

Каждый Fiber-узел содержит `updateQueue` — циклический связанный список объектов `Update`.

```
FiberNode (Counter)
  ├── memoizedState: { count: 0, flag: false }
  └── updateQueue
        ├── pending: Update { action: c => c+1 }
        │              ↓ (circular linked list)
        │           Update { action: f => !f }
        │              ↓ (→ обратно к первому)
        └── lanes: SyncLane | DefaultLane
```

```jsx
// Упрощённая модель обработки:
function processUpdateQueue(fiber) {
  let state = fiber.memoizedState;
  let update = fiber.updateQueue.pending;
  do {
    state = typeof update.action === 'function'
      ? update.action(state)
      : update.action;
    update = update.next;
  } while (update !== fiber.updateQueue.pending);
  fiber.memoizedState = state;
}
```

---

## 7. Batching и useReducer

`useReducer` подчиняется тем же правилам батчинга. Множественные `dispatch` в одном синхронном блоке объединяются в один рендер.

```jsx
function reducer(state, action) {
  switch (action.type) {
    case 'increment': return { ...state, count: state.count + 1 };
    case 'toggle':    return { ...state, flag: !state.flag };
    case 'setName':   return { ...state, name: action.payload };
    default:          return state;
  }
}
function Form() {
  const [state, dispatch] = useReducer(reducer, { count: 0, flag: false, name: '' });
  function handleSubmit() {
    dispatch({ type: 'increment' });
    dispatch({ type: 'toggle' });
    dispatch({ type: 'setName', payload: 'React' });
    // три dispatch → один рендер
  }
  return <button onClick={handleSubmit}>Submit</button>;
}
```

---

## 8. Практические примеры

### 8.1 Множественные setState в fetch

```jsx
function Profile() {
  const [name, setName] = useState('');
  const [age, setAge] = useState(0);
  const [email, setEmail] = useState('');
  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then(data => {
      setName(data.name);
      setAge(data.age);
      setEmail(data.email);
      // React 18: один рендер
    });
  }, []);
  return <div>{name} — {age} — {email}</div>;
}
```

### 8.2 setState в async-функции

```jsx
function AsyncExample() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(0);
  async function handleClick() {
    const data = await fetch('/api').then(r => r.json());
    // React 17: 2 рендера (после await — новый микротаск)
    // React 18: 1 рендер (automatic batching)
    setA(data.a);
    setB(data.b);
  }
  return <button onClick={handleClick}>Load</button>;
}
```

---

## 9. Влияние на производительность

1. **Меньше рендеров** — N вызовов `setState` дают 1 рендер вместо N.
2. **Меньше обращений к DOM** — Commit Phase выполняется один раз.
3. **Нет промежуточных состояний** — пользователь не видит «полуобновлённый» UI.
4. **Согласованность** — дочерние компоненты получают согласованный набор пропсов.

### Антипаттерн: разрыв батча через await

```jsx
async function handleClick() {
  setLoading(true);              // рендер #1
  const data = await fetchData(); // разрыв синхронного стека
  setData(data);                 // ─┐ рендер #2
  setLoading(false);             // ─┘ (батчатся между собой)
}
```

---

## 10. Порядок обновлений внутри батча

React гарантирует применение обновлений **в порядке вызова**.

```jsx
function OrderDemo() {
  const [value, setValue] = useState(0);
  function handleClick() {
    setValue(v => v + 10);  // 0  → 10
    setValue(v => v * 2);   // 10 → 20
    setValue(v => v - 5);   // 20 → 15
  }
  return <button onClick={handleClick}>{value}</button>;
}
```

> При смешении функций-обновителей и прямых значений прямое значение
> заменяет накопленное состояние:

```jsx
function MixedUpdates() {
  const [count, setCount] = useState(0);
  function handleClick() {
    setCount(c => c + 1);  // 0 → 1
    setCount(c => c + 1);  // 1 → 2
    setCount(42);           // → 42 (прямое значение перезаписывает)
    setCount(c => c + 1);  // 42 → 43
  }
  return <button onClick={handleClick}>{count}</button>;
}
```
