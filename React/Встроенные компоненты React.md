# Встроенные компоненты React

## Оглавление

1. [Обзор](#обзор)
2. [Fragment](#fragment)
3. [StrictMode](#strictmode)
4. [Profiler](#profiler)
5. [Suspense](#suspense)
6. [Activity](#activity)
7. [ViewTransition](#viewtransition)

---

## Обзор

| Компонент | Назначение | Влияет на DOM |
|---|---|---|
| `<Fragment>` / `<>` | Группировка без лишнего узла | Нет |
| `<StrictMode>` | Проверки в development | Нет |
| `<Profiler>` | Измерение производительности | Нет |
| `<Suspense>` | Fallback при загрузке | Да (fallback UI) |
| `<Activity>` | Скрытие UI с сохранением state | Да (display: none) |
| `<ViewTransition>` | CSS View Transitions | Нет (CSS анимации) |

---

## Fragment

Группировка элементов без создания дополнительного DOM-узла.

```jsx
// Короткий синтаксис
function Columns() {
  return (
    <>
      <td>Имя</td>
      <td>Возраст</td>
    </>
  );
}
```

Единственный случай, когда нужен полный синтаксис — передача `key`:

```jsx
import { Fragment } from 'react';

function Glossary({ items }) {
  return (
    <dl>
      {items.map(item => (
        <Fragment key={item.id}>
          <dt>{item.term}</dt>
          <dd>{item.definition}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
```

---

## StrictMode

Включает дополнительные проверки и предупреждения **только в development**. Не влияет на production.

```jsx
import { StrictMode } from 'react';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### Что проверяет StrictMode

| Проверка | Что делает | Зачем |
|---|---|---|
| Двойной рендер | Вызывает render дважды | Обнаружение нечистых вычислений |
| Двойной setup+cleanup эффектов | mount → cleanup → mount | Проверка правильности cleanup |
| Двойной вызов reducers | Вызывает reducer дважды | Обнаружение мутаций в reducer |
| Предупреждения deprecated API | Ругается на findDOMNode, legacy context | Подготовка к будущим версиям |

### Обнаружение нечистых компонентов

```jsx
let count = 0;

function Counter() {
  count++; // ❌ Side effect в рендере
  // В StrictMode вызовется дважды → count увеличится на 2
  return <p>{count}</p>;
}
```

### Проверка cleanup эффектов

```jsx
useEffect(() => {
  const connection = createConnection(roomId);
  connection.connect();

  // StrictMode: mount → cleanup → mount
  // Если cleanup нет или он неправильный — будет два соединения
  return () => connection.disconnect(); // ✅ Правильный cleanup
}, [roomId]);
```

Можно применить к поддереву:

```jsx
<StrictMode>
  <Header />          {/* Проверяется */}
</StrictMode>
<Footer />            {/* Не проверяется */}
```

---

## Profiler

Измеряет производительность рендеринга. Полезен для поиска медленных компонентов.

```jsx
import { Profiler } from 'react';

function onRender(id, phase, actualDuration, baseDuration, startTime, commitTime) {
  console.log(`${id} [${phase}]: ${actualDuration.toFixed(1)}ms`);
}

function App() {
  return (
    <Profiler id="App" onRender={onRender}>
      <Header />
      <Profiler id="MainContent" onRender={onRender}>
        <ProductList />
      </Profiler>
      <Footer />
    </Profiler>
  );
}
```

### Параметры onRender

| Параметр | Тип | Описание |
|---|---|---|
| `id` | string | Идентификатор Profiler |
| `phase` | `'mount' \| 'update' \| 'nested-update'` | Фаза рендера |
| `actualDuration` | number | Время рендера поддерева (мс) |
| `baseDuration` | number | Время без мемоизации (мс) |
| `startTime` | number | Когда начался рендер |
| `commitTime` | number | Когда произошёл commit |

### Отправка метрик на сервер

```jsx
function onRender(id, phase, actualDuration) {
  if (actualDuration > 16) { // Медленнее 1 кадра (60fps)
    sendToAnalytics({
      component: id,
      phase,
      duration: actualDuration,
      timestamp: Date.now(),
    });
  }
}
```

---

## Suspense

Декларативная обработка загрузки. Показывает fallback UI пока дочерние компоненты загружаются.

```jsx
import { Suspense, lazy } from 'react';

const LazyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <LazyComponent />
    </Suspense>
  );
}
```

Подробности → см. файл **«Suspense и React.lazy.md»**

---

## Activity

**React 19.2+.** Скрывает/показывает UI без потери состояния и DOM.

```jsx
import { Activity, useState } from 'react';

function TabContainer() {
  const [tab, setTab] = useState('feed');

  return (
    <div>
      <nav>
        <button onClick={() => setTab('feed')}>Лента</button>
        <button onClick={() => setTab('profile')}>Профиль</button>
      </nav>

      <Activity mode={tab === 'feed' ? 'visible' : 'hidden'}>
        <Feed /> {/* State и scroll position сохраняются */}
      </Activity>
      <Activity mode={tab === 'profile' ? 'visible' : 'hidden'}>
        <Profile />
      </Activity>
    </div>
  );
}
```

### Поведение

| mode | DOM | Эффекты | State |
|---|---|---|---|
| `"visible"` | Показан | setup выполнены | Активен |
| `"hidden"` | `display: none` | cleanup выполнены | Сохранён |

Отличие от условного рендеринга (`{show && <C/>}`):
- Условный рендеринг **уничтожает** компонент и его state
- `<Activity mode="hidden">` **сохраняет** state, DOM, scroll position

### Предзагрузка

```jsx
// Подготовить тяжёлый компонент заранее
<Activity mode="hidden">
  <HeavyDashboard /> {/* Рендерится в фоне, но не показывается */}
</Activity>
```

---

## ViewTransition

**React 19.2+.** Декларативные CSS View Transitions для анимации переходов между UI-состояниями.

```jsx
import { ViewTransition, useTransition, useState } from 'react';

function Gallery() {
  const [index, setIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  function next() {
    startTransition(() => setIndex(i => i + 1));
  }

  return (
    <div>
      <button onClick={next}>Далее</button>
      <ViewTransition>
        <img src={photos[index]} alt="Gallery" />
      </ViewTransition>
    </div>
  );
}
```

### CSS для анимации

```css
::view-transition-old(*) {
  animation: fade-out 0.3s ease-out;
}
::view-transition-new(*) {
  animation: fade-in 0.3s ease-in;
}

@keyframes fade-out { to { opacity: 0; } }
@keyframes fade-in { from { opacity: 0; } }
```

### addTransitionType — разные анимации для разных переходов

```jsx
import { addTransitionType, startTransition } from 'react';

function navigate(direction) {
  startTransition(() => {
    addTransitionType(direction === 'forward' ? 'slide-left' : 'slide-right');
    setPage(nextPage);
  });
}
```

```css
/* Разные анимации по типу перехода */
[data-transition-type="slide-left"]::view-transition-old(*) {
  animation: slide-to-left 0.3s;
}
[data-transition-type="slide-right"]::view-transition-old(*) {
  animation: slide-to-right 0.3s;
}
```
