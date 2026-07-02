# useTransition — управление приоритетом обновлений состояния

`useTransition` — это хук React, позволяющий пометить определённые обновления состояния как **переходы** (transitions) с низким приоритетом. Обновления, обёрнутые в `startTransition`, могут быть прерваны более приоритетными обновлениями (например, пользовательским вводом), что обеспечивает отзывчивость интерфейса даже при выполнении тяжёлых перерисовок. Хук является ключевым инструментом Concurrent React, реализующим принцип **прерываемого рендеринга**.

## Оглавление

1. [Что такое useTransition](#1-что-такое-usetransition)
2. [Сигнатура хука](#2-сигнатура-хука)
3. [Как работает: пометка обновлений как Transition](#3-как-работает-пометка-обновлений-как-transition)
4. [isPending — индикатор ожидания](#4-ispending--индикатор-ожидания)
5. [Фильтрация большого списка без блокировки ввода](#5-фильтрация-большого-списка-без-блокировки-ввода)
6. [Переключение вкладок с тяжёлым рендерингом](#6-переключение-вкладок-с-тяжёлым-рендерингом)
7. [Связь с Concurrent Features и Lanes](#7-связь-с-concurrent-features-и-lanes)
8. [startTransition без хука — глобальная функция](#8-starttransition-без-хука--глобальная-функция)
9. [Сравнение с useDeferredValue](#9-сравнение-с-usedeferredvalue)
10. [Suspense + useTransition](#10-suspense--usetransition)

---

## 1. Что такое useTransition

В традиционной модели React все обновления состояния обладают одинаковым приоритетом. Если пользователь вводит текст в поисковую строку и каждое нажатие клавиши вызывает фильтрацию списка из тысяч элементов, ввод начинает «заикаться» — тяжёлый ре-рендер блокирует обработку последующих событий ввода.

`useTransition` решает эту проблему, разделяя обновления на два класса приоритетов:

- **Срочные обновления** (urgent) — реакция на непосредственное взаимодействие пользователя: набор текста, клики, нажатия клавиш. Должны отражаться мгновенно.
- **Переходы** (transitions) — обновления, которые могут выполняться с задержкой: фильтрация данных, переключение экранов, загрузка нового контента.

```jsx
import { useState, useTransition } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState([]);

  const handleChange = (e) => {
    const value = e.target.value;
    // Срочное обновление — мгновенно обновляем поле ввода
    setQuery(value);

    // Низкоприоритетное обновление — фильтрация может подождать
    startTransition(() => {
      setResults(filterLargeDataset(value));
    });
  };

  return (
    <div>
      <input value={query} onChange={handleChange} />
      {isPending && <Spinner />}
      <ResultsList results={results} />
    </div>
  );
}
```

## 2. Сигнатура хука

```jsx
const [isPending, startTransition] = useTransition();
```

**Параметры:** хук не принимает аргументов.

**Возвращаемое значение — массив из двух элементов:**

- **`isPending`** (`boolean`) — флаг, указывающий, имеются ли незавершённые переходы. Равен `true` с момента вызова `startTransition` и до завершения рендеринга с новым состоянием.
- **`startTransition`** (`(callback) => void`) — функция, принимающая колбэк. Все вызовы `setState` внутри этого колбэка будут помечены как transition-обновления с низким приоритетом.

**Ограничения:**

- Колбэк `startTransition` должен быть синхронным. Нельзя использовать `await` или `setTimeout` внутри него для отложенного вызова `setState`.
- Внутри `startTransition` можно обновлять только состояние. Передача пропсов или обновление внешних переменных не отслеживается.

```jsx
// ПРАВИЛЬНО: синхронный вызов setState
startTransition(() => {
  setFilteredList(computeFilteredList(query));
});

// НЕПРАВИЛЬНО: асинхронный setState внутри startTransition
startTransition(async () => {
  const data = await fetchData();
  setData(data); // этот вызов НЕ будет помечен как transition
});
```

Примечание: начиная с React 19, `startTransition` поддерживает асинхронные функции — `setState`, вызванный после `await`, также будет помечен как transition.

## 3. Как работает: пометка обновлений как Transition

Когда `startTransition` оборачивает вызов `setState`, React присваивает соответствующему обновлению низкий приоритет (lane). Если во время рендеринга transition-обновления поступает срочное обновление (например, пользовательский ввод), React **прерывает** текущий рендер, обрабатывает срочное обновление, а затем заново запускает transition-рендер с актуальным состоянием.

```jsx
function TabContainer() {
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState('home');

  const switchTab = (tab) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  return (
    <div>
      <nav>
        <button onClick={() => switchTab('home')}>Главная</button>
        <button onClick={() => switchTab('analytics')}>Аналитика</button>
        <button onClick={() => switchTab('settings')}>Настройки</button>
      </nav>
      <div style={{ opacity: isPending ? 0.7 : 1 }}>
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'analytics' && <HeavyAnalyticsDashboard />}
        {activeTab === 'settings' && <SettingsPanel />}
      </div>
    </div>
  );
}
```

Если пользователь быстро переключается между вкладками, React не будет завершать промежуточные рендеры тяжёлого `HeavyAnalyticsDashboard` — он прервёт их и отрендерит только финальную выбранную вкладку.

## 4. isPending — индикатор ожидания

`isPending` позволяет предоставить пользователю визуальную обратную связь о том, что переход выполняется. Это критически важно для UX: пользователь должен понимать, что система реагирует на его действие, даже если результат ещё не готов.

```jsx
function NavigationButton({ to, children }) {
  const [isPending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      navigate(to);
    });
  };

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      style={{
        opacity: isPending ? 0.6 : 1,
        cursor: isPending ? 'wait' : 'pointer',
      }}
    >
      {children}
      {isPending && <span className="spinner" />}
    </button>
  );
}
```

## 5. Фильтрация большого списка без блокировки ввода

Классический кейс для `useTransition` — обеспечение плавного ввода при одновременной фильтрации большого набора данных.

```jsx
import { useState, useTransition, useMemo } from 'react';

const ALL_ITEMS = Array.from({ length: 20000 }, (_, i) => ({
  id: i,
  name: `Элемент ${i}`,
  category: ['A', 'B', 'C'][i % 3],
}));

function FilterableList() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSearch = (e) => {
    const value = e.target.value;
    setQuery(value); // срочное: обновление поля ввода

    startTransition(() => {
      setFilter(value); // низкий приоритет: фильтрация
    });
  };

  const filteredItems = useMemo(() => {
    if (!filter) return ALL_ITEMS;
    return ALL_ITEMS.filter(item =>
      item.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [filter]);

  return (
    <div>
      <input
        value={query}
        onChange={handleSearch}
        placeholder="Поиск..."
      />
      {isPending && <div className="loading-bar" />}
      <ul>
        {filteredItems.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

Без `useTransition` каждое нажатие клавиши вызывало бы рендеринг 20 000 элементов списка синхронно, блокируя ввод. С `useTransition` ввод остаётся отзывчивым, а фильтрация выполняется в фоне.

## 6. Переключение вкладок с тяжёлым рендерингом

```jsx
import { useState, useTransition, memo } from 'react';

const HeavyTab = memo(function HeavyTab() {
  const items = [];
  for (let i = 0; i < 500; i++) {
    items.push(<ComplexChartRow key={i} index={i} />);
  }
  return <div>{items}</div>;
});

function TabPanel() {
  const [tab, setTab] = useState('overview');
  const [isPending, startTransition] = useTransition();

  const selectTab = (nextTab) => {
    startTransition(() => {
      setTab(nextTab);
    });
  };

  return (
    <div>
      <div role="tablist">
        {['overview', 'details', 'analytics'].map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => selectTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={{ opacity: isPending ? 0.5 : 1, transition: 'opacity 200ms' }}>
        {tab === 'overview' && <Overview />}
        {tab === 'details' && <Details />}
        {tab === 'analytics' && <HeavyTab />}
      </div>
    </div>
  );
}
```

## 7. Связь с Concurrent Features и Lanes

`useTransition` является частью архитектуры **Concurrent React**, построенной на системе приоритетов (Lanes). Каждому обновлению присваивается lane — числовой приоритет, определяющий порядок обработки.

Иерархия приоритетов (от высокого к низкому):

```
SyncLane                    — синхронные обновления (legacy mode)
InputContinuousLane         — непрерывный ввод (drag, scroll)
DefaultLane                 — стандартные обновления (клик, setState)
TransitionLane (1..16)      — переходы (startTransition)
IdleLane                    — фоновые задачи
```

React Fiber scheduler использует эти приоритеты для принятия решений:

- Может ли текущий рендер быть прерван?
- Какое обновление обработать следующим?
- Стоит ли объединить (batching) несколько обновлений одного приоритета?

`startTransition` помечает обновление как `TransitionLane`, что позволяет scheduler'у прерывать его рендер в пользу обновлений с более высоким lane.

## 8. startTransition без хука — глобальная функция

React экспортирует `startTransition` как отдельную функцию, которую можно использовать **вне компонентов** — в утилитах, обработчиках маршрутизации, middleware.

```jsx
import { startTransition } from 'react';

// В роутере
function navigate(url) {
  startTransition(() => {
    setCurrentRoute(parseRoute(url));
  });
}

// В обработчике глобального события
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    startTransition(() => {
      refreshData();
    });
  }
});
```

| Характеристика | `useTransition` (хук) | `startTransition` (функция) |
|---|---|---|
| Предоставляет `isPending` | Да | Нет |
| Место использования | Внутри компонентов | Где угодно |
| Контроль загрузочного состояния | Полный | Отсутствует |
| Привязка к компоненту | Да | Нет |

## 9. Сравнение с useDeferredValue

| Критерий | `useTransition` | `useDeferredValue` |
|---|---|---|
| Что откладывается | Обновление состояния | Отображение значения |
| Контроль над setState | Полный — оборачиваете конкретный вызов | Отсутствует — откладывает полученное значение |
| isPending | Да | Нет (сравнивайте value !== deferredValue) |
| Типичный сценарий | Вы контролируете setState | Значение приходит как prop |
| Гранулярность | На уровне действия | На уровне значения |
| Совместимость | Требует доступа к setState | Работает с любым значением |

```jsx
// useTransition: вы контролируете обновление
const [isPending, startTransition] = useTransition();
const handleClick = () => {
  startTransition(() => {
    setTab('heavy');
  });
};

// useDeferredValue: значение приходит извне
function HeavyList({ query }) {
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;
  // рендерим с deferredQuery — старым значением, пока идёт transition
}
```

## 10. Suspense + useTransition

`useTransition` особенно эффективен в сочетании с `Suspense`. При переключении между компонентами, обёрнутыми в `Suspense`, без `useTransition` пользователь немедленно увидит fallback (индикатор загрузки). С `useTransition` React сохранит текущий контент на экране, пока новый не будет готов.

```jsx
import { Suspense, useState, useTransition } from 'react';

function App() {
  const [tab, setTab] = useState('home');
  const [isPending, startTransition] = useTransition();

  const switchTab = (next) => {
    startTransition(() => {
      setTab(next);
    });
  };

  return (
    <div>
      <nav>
        <button onClick={() => switchTab('home')}>Главная</button>
        <button onClick={() => switchTab('profile')}>Профиль</button>
      </nav>

      <Suspense fallback={<PageSkeleton />}>
        <div style={{ opacity: isPending ? 0.7 : 1 }}>
          {tab === 'home' && <HomePage />}
          {tab === 'profile' && <ProfilePage />}
        </div>
      </Suspense>
    </div>
  );
}
```

Без `startTransition`: при переключении на `ProfilePage` (который использует `use()` или lazy-загрузку) немедленно отобразится `<PageSkeleton />`.

С `startTransition`: React продолжит показывать текущую `<HomePage />` с пониженной прозрачностью (через `isPending`), пока `<ProfilePage />` не будет готов к отображению. Это создаёт значительно более плавный пользовательский опыт, избегая мерцания между fallback и контентом.

```jsx
// Паттерн навигации с Suspense и useTransition (React Router v7+)
function Layout() {
  const [isPending, startTransition] = useTransition();
  const navigate = useNavigate();

  const handleNavigate = (path) => {
    startTransition(() => {
      navigate(path);
    });
  };

  return (
    <div>
      <nav>
        <a onClick={() => handleNavigate('/dashboard')}>Панель</a>
        <a onClick={() => handleNavigate('/reports')}>Отчёты</a>
      </nav>
      {isPending && <TopProgressBar />}
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
```
