# Improve Fuzzy Search with useTransition — раздел Transitions & Deferred Values

## Исходный код

- Есть `searchQuery` (state) и `useMemo`, который при неизменном `searchQuery` не повторяет дорогую фильтрацию.
- Проблема: `onChange` вызывает `setSearchQuery` → инвалидирует memo → весь дорогой fuzzy search выполняется заново синхронно. `useMemo` тут не спасает (ничто иное не ре-рендерит компонент).

## Идея решения

- Разделить **два** значения:
  1. то, что **показываем пользователю** в input — обновляем немедленно (urgent);
  2. то, по чему **фильтруем список** — обновляем в низкоприоритетной полосе (non-urgent).
- Приоритет: «я получил твой ввод» (показ символа) — первично; фильтрация — потом, когда очистится очередь срочного.
- Это не web worker / service worker — работа всё та же, но в **низкоприоритетной lane** React.

## useTransition

```js
const [isPending, startTransition] = useTransition();
```

- Возвращает массив (как `useState`):
  - **`isPending`** — boolean: идёт ли сейчас transition. Нужен, чтобы показать индикатор загрузки.
  - **`startTransition`** — функция; в неё оборачиваем низкоприоритетную работу.

## Реализация

Два отдельных state:

```js
const [inputQuery, setInputQuery] = useState('');   // показываем сразу
const [searchQuery, setSearchQuery] = useState('');  // запускает фильтрацию

const filteredPokemon = useMemo(
  () => filterPokemon(searchQuery),
  [searchQuery]
);

function handleChange(event) {
  const value = event.target.value;
  setInputQuery(value);                  // немедленно (high priority)
  startTransition(() => {
    setSearchQuery(value);               // когда появится возможность (low priority)
  });
}
```

- `input` использует `value={inputQuery}` — обновляется мгновенно.
- `startTransition` — «вот низкоприоритетная задача на потом». Аналогия с `requestIdleCallback` / `requestAnimationFrame`: «браузер, когда будешь свободен — сделай это». Здесь говорим React: когда очередь высокоприоритетного (ввод) очистится — обнови `searchQuery`, что запустит `useMemo` и фильтрацию.
- Сам поиск не становится быстрее — но ощущается отзывчивым.

## Индикатор через isPending

```jsx
<div className={isPending ? 'opacity-50' : 'opacity-100'}>
```

- Между стартом transition и его завершением `isPending === true` — можно снизить opacity / `animate-pulse` и т.п. «Бесплатный» loading-индикатор.
- Замечание про UX (вне темы): слишком быстрый показ/скрытие индикатора может быть хуже его отсутствия — но это «тёмная дорога».

## Попутные оптимизации

- `React.memo` на компонент `Pokemon`: в него идут статичные значения, и есть `key` — рендер каждого можно пропускать (один рендер был ~145 мс).
- **Большой DOM** — частый bottleneck. Решение — **virtualization / windowing** (рендерить только видимые элементы), но это вводит новые проблемы: ломается Ctrl/Cmd+F, появляются accessibility-issues. В этом уроке не решается.
- Side note по UX: иногда дорогой поиск «на каждый символ» лучше заменить кнопкой submit — но это не тема воркшопа.

## Вывод

- Концептуально (Fiber, scheduling, lanes) сложно, но **реализация — очень мало кода**: одно значение меняем сразу, другое планируем на удобное время, плюс бесплатный индикатор через `isPending`.
- Альтернатива вручную (debounce + `requestIdleCallback` + несколько кусков state) заняла бы час; Fiber делает тяжёлую работу за нас.

## Главное

- Паттерн: держать отдельно «отображаемое» значение (urgent, `setInputQuery`) и «запускающее дорогую работу» значение (non-urgent, внутри `startTransition`).
- `useTransition` даёт `[isPending, startTransition]`: оборачивай тяжёлый `setState` в `startTransition`, а `isPending` используй для индикатора.
- Реализация занимает несколько строк — вся сложность планирования уже в Fiber.
- Дополнительно: `React.memo` на элементы списка; большой DOM лечится virtualization/windowing (со своими минусами).
