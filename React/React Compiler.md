# React Compiler — автоматическая оптимизация

## Оглавление

1. [Что такое React Compiler](#что-такое-react-compiler)
2. [Зачем нужен](#зачем-нужен)
3. [Как работает внутри](#как-работает-внутри)
4. [Установка и настройка](#установка-и-настройка)
5. [Инкрементальное внедрение](#инкрементальное-внедрение)
6. [React Rules](#react-rules)
7. [Что оптимизирует компилятор](#что-оптимизирует-компилятор)
8. [Ограничения](#ограничения)
9. [Отладка](#отладка)
10. [Миграция с ручной мемоизации](#миграция-с-ручной-мемоизации)

---

## Что такое React Compiler

React Compiler (ранее React Forget) — инструмент сборки, автоматически оптимизирующий React-приложения. Вышел v1.0 — 7 октября 2025.

Работает как **Babel/SWC плагин**, анализируя код компонентов и вставляя мемоизацию на этапе сборки. Фактически React Compiler автоматически применяет эквивалент `useMemo`, `useCallback` и `React.memo`.

---

## Зачем нужен

Проблемы ручной мемоизации:

```jsx
// ❌ Типичный код без оптимизации — ререндер List при каждом изменении theme
function ProductPage({ products, theme }) {
  const sorted = products.sort((a, b) => a.price - b.price);
  const handleClick = (id) => { addToCart(id); };

  return (
    <div className={theme}>
      <List items={sorted} onClick={handleClick} />
    </div>
  );
}
```

```jsx
// ❌ Ручная оптимизация — работает, но загромождает код
function ProductPage({ products, theme }) {
  const sorted = useMemo(
    () => products.sort((a, b) => a.price - b.price),
    [products]
  );
  const handleClick = useCallback((id) => { addToCart(id); }, []);

  return (
    <div className={theme}>
      <List items={sorted} onClick={handleClick} />
    </div>
  );
}
const List = memo(function List({ items, onClick }) { /* ... */ });
```

React Compiler делает эту работу автоматически: пишешь простой код, компилятор вставляет мемоизацию сам.

---

## Как работает внутри

Компилятор анализирует код на основе **React Rules** (чистые компоненты, иммутабельные props) и выполняет статический анализ зависимостей.

### До компиляции

```jsx
function Greeting({ name }) {
  const text = 'Привет, ' + name;
  return <h1>{text}</h1>;
}
```

### После компиляции (упрощённо)

```jsx
function Greeting({ name }) {
  const $ = _c(2); // внутренний кэш на 2 слота
  let t0;
  if ($[0] !== name) {
    const text = 'Привет, ' + name;
    t0 = <h1>{text}</h1>;
    $[0] = name;
    $[1] = t0;
  } else {
    t0 = $[1]; // возврат кэшированного JSX
  }
  return t0;
}
```

Компилятор определяет, что `text` и JSX зависят только от `name`, и кэширует результат.

---

## Установка и настройка

### Babel

```bash
npm install -D babel-plugin-react-compiler
```

```js
// babel.config.js
module.exports = {
  plugins: [
    ['babel-plugin-react-compiler', {
      target: '19' // версия React
    }]
  ],
};
```

### Next.js

```js
// next.config.js
module.exports = {
  experimental: {
    reactCompiler: true,
  },
};
```

### Vite

```js
// vite.config.js
import react from '@vitejs/plugin-react';

export default {
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', { target: '19' }]],
      },
    }),
  ],
};
```

### Основные опции конфигурации

| Опция | Описание | Значения |
|---|---|---|
| `target` | Версия React | `'17'`, `'18'`, `'19'` |
| `compilationMode` | Режим компиляции | `'infer'`, `'annotation'`, `'all'` |
| `panicThreshold` | Поведение при ошибке | `'NONE'`, `'CRITICAL_ERRORS'`, `'ALL_ERRORS'` |
| `logger` | Логгер для отладки | Объект с методами logEvent |

---

## Инкрементальное внедрение

### compilationMode

- **`infer`** (по умолчанию) — компилятор сам решает, что оптимизировать
- **`annotation`** — оптимизирует только компоненты с директивой `"use memo"`
- **`all`** — оптимизирует всё

### Директивы

```jsx
// Оптимизировать этот компонент (при compilationMode: 'annotation')
"use memo";
function ExpensiveList({ items }) {
  return items.map(item => <Item key={item.id} {...item} />);
}
```

```jsx
// Отключить оптимизацию для компонента
"use no memo";
function ComponentWithSideEffects() {
  // Компилятор не тронет этот компонент
  externalMutableState.count++;
  return <div>{externalMutableState.count}</div>;
}
```

---

## React Rules

Компилятор полагается на соблюдение правил React:

1. **Компоненты и хуки должны быть чистыми** — одинаковые inputs → одинаковый output
2. **Props и state иммутабельны** — не мутировать, а создавать новые объекты
3. **Возвращаемые значения хуков стабильны** — не мутировать ref.current во время рендера
4. **Нет side-effects в рендере** — мутации только в useEffect / обработчиках

```jsx
// ❌ Нарушение: мутация props
function BadComponent({ items }) {
  items.push(newItem); // Compiler не сможет оптимизировать
  return <List items={items} />;
}

// ✅ Правильно: создание нового массива
function GoodComponent({ items }) {
  const newItems = [...items, newItem];
  return <List items={newItems} />;
}
```

ESLint-плагин `eslint-plugin-react-hooks` проверяет эти правила:

```bash
npm install -D eslint-plugin-react-hooks
```

---

## Что оптимизирует компилятор

| Ручной подход | React Compiler эквивалент |
|---|---|
| `useMemo(() => compute(a, b), [a, b])` | Автоматическое кэширование вычислений |
| `useCallback(fn, [deps])` | Автоматическое кэширование функций |
| `React.memo(Component)` | Автоматический пропуск ререндера если props не изменились |
| JSX-выражения | Кэширование JSX-узлов |

### Пример: список с фильтрацией

```jsx
// Исходный код — без ручной оптимизации
function FilteredList({ items, filter }) {
  const filtered = items.filter(item => item.category === filter);
  const handleSelect = (id) => { selectItem(id); };

  return (
    <ul>
      {filtered.map(item => (
        <ListItem key={item.id} item={item} onSelect={handleSelect} />
      ))}
    </ul>
  );
}
```

Компилятор автоматически:
- Кэширует `filtered` (пересчитает только при изменении `items` или `filter`)
- Кэширует `handleSelect` (стабильная ссылка)
- Кэширует JSX каждого `ListItem` (пропуск ререндера если props не изменились)

---

## Ограничения

Компилятор **не может оптимизировать** код, нарушающий React Rules:

```jsx
// ❌ Мутация внешнего состояния в рендере
let globalCount = 0;
function Counter() {
  globalCount++; // side effect — Compiler пропустит оптимизацию
  return <div>{globalCount}</div>;
}

// ❌ Динамический доступ, затрудняющий анализ
function Dynamic({ obj, key }) {
  return <div>{obj[key]}</div>; // Compiler может не отследить зависимости
}
```

**panicThreshold** определяет поведение при невозможности оптимизации:
- `'NONE'` — молча пропустить
- `'CRITICAL_ERRORS'` — ошибка сборки при критических проблемах
- `'ALL_ERRORS'` — ошибка при любой проблеме

---

## Отладка

React DevTools показывает badge "Memo ✨" на компонентах, оптимизированных Compiler.

### Logger

```js
// babel.config.js
module.exports = {
  plugins: [
    ['babel-plugin-react-compiler', {
      logger: {
        logEvent(filename, event) {
          if (event.kind === 'CompileSuccess') {
            console.log(`✅ ${filename}: ${event.fnName} оптимизирован`);
          }
          if (event.kind === 'CompileError') {
            console.warn(`⚠️ ${filename}: ${event.detail}`);
          }
        },
      },
    }],
  ],
};
```

---

## Миграция с ручной мемоизации

React Compiler корректно работает с существующими `useMemo`, `useCallback`, `React.memo` — они не конфликтуют.

**Рекомендация:**
1. Включите React Compiler
2. Проверьте, что приложение работает корректно
3. Постепенно удаляйте ручную мемоизацию — Compiler покроет эти случаи
4. Используйте `"use no memo"` для компонентов, где Compiler создаёт проблемы

```jsx
// До: ручная мемоизация
const MemoizedList = memo(function List({ items }) {
  const sorted = useMemo(() => items.sort(compare), [items]);
  return sorted.map(item => <Item key={item.id} item={item} />);
});

// После: с React Compiler — чистый код, оптимизация автоматическая
function List({ items }) {
  const sorted = items.toSorted(compare);
  return sorted.map(item => <Item key={item.id} item={item} />);
}
```
