# useLayoutEffect — синхронный эффект после DOM-мутаций до отрисовки

`useLayoutEffect` — это хук React, функционально идентичный `useEffect`, но выполняющийся **синхронно** после того, как React применил все DOM-мутации, но **до того**, как браузер произведёт отрисовку (paint). Это позволяет производить измерения DOM и синхронные корректировки макета без визуального мерцания. Хук предназначен для узкого круга задач, связанных с чтением и синхронной модификацией DOM-геометрии.

## Оглавление

1. [Что такое useLayoutEffect](#1-что-такое-uselayouteffect)
2. [Разница с useEffect — порядок выполнения](#2-разница-с-useeffect--порядок-выполнения)
3. [Сигнатура и параметры](#3-сигнатура-и-параметры)
4. [Когда использовать: измерение DOM и предотвращение мерцания](#4-когда-использовать-измерение-dom-и-предотвращение-мерцания)
5. [Практические примеры](#5-практические-примеры)
6. [Влияние на производительность](#6-влияние-на-производительность)
7. [useLayoutEffect и SSR](#7-uselayouteffect-и-ssr)
8. [Полный порядок выполнения жизненного цикла](#8-полный-порядок-выполнения-жизненного-цикла)

---

## 1. Что такое useLayoutEffect

В стандартном потоке рендеринга React после фазы коммита (commit phase) браузер производит перерасчёт стилей, компоновку (layout) и отрисовку (paint). `useEffect` выполняется **после** отрисовки — асинхронно, не блокируя визуальное обновление. В ряде случаев это приводит к мерцанию: пользователь на долю секунды видит промежуточное состояние, которое затем корректируется эффектом.

`useLayoutEffect` решает эту проблему, выполняясь **до** отрисовки, в синхронном режиме. Браузер не отобразит кадр, пока все `useLayoutEffect`-колбэки не завершатся.

```jsx
import { useLayoutEffect, useRef, useState } from 'react';

function MeasuredBox() {
  const ref = useRef(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    // Измерение происходит до отрисовки — пользователь не увидит мерцания
    const measured = ref.current.getBoundingClientRect().height;
    setHeight(measured);
  }, []);

  return (
    <div>
      <div ref={ref}>Содержимое переменной высоты</div>
      <p>Измеренная высота: {height}px</p>
    </div>
  );
}
```

## 2. Разница с useEffect — порядок выполнения

| Характеристика | `useEffect` | `useLayoutEffect` |
|---|---|---|
| Момент выполнения | После отрисовки (paint) | После DOM-мутаций, до отрисовки |
| Режим выполнения | Асинхронный (не блокирует UI) | Синхронный (блокирует отрисовку) |
| Влияние на FPS | Минимальное | Может снижать при тяжёлых вычислениях |
| Мерцание | Возможно при DOM-корректировках | Исключено |
| Область применения | Побочные эффекты: запросы, подписки, таймеры | Измерения и синхронные корректировки DOM |
| SSR-совместимость | Полная | Требует особой обработки |
| Частота использования | ~95% случаев | ~5% случаев |

**Диаграмма порядка выполнения:**

```
Рендер компонента (вычисление JSX)
       │
       ▼
React применяет изменения к DOM (commit phase)
       │
       ▼
useLayoutEffect ← синхронно, до отрисовки
       │
       ▼
Браузер выполняет Layout и Paint
       │
       ▼
useEffect ← асинхронно, после отрисовки
```

## 3. Сигнатура и параметры

```jsx
useLayoutEffect(setup, dependencies?)
```

Сигнатура полностью идентична `useEffect`:

- **`setup`** — функция, содержащая логику эффекта. Может возвращать функцию очистки (cleanup). Cleanup предыдущего эффекта выполняется **до** запуска нового, также синхронно, до отрисовки.
- **`dependencies`** (необязательный) — массив зависимостей. Если не указан, эффект выполняется после каждого рендера. Пустой массив `[]` — только при монтировании.

```jsx
useLayoutEffect(() => {
  // setup: выполняется синхронно после коммита DOM
  const node = ref.current;
  const rect = node.getBoundingClientRect();

  return () => {
    // cleanup: выполняется перед следующим вызовом setup
    // и при размонтировании компонента
  };
}, [dependency1, dependency2]);
```

## 4. Когда использовать: измерение DOM и предотвращение мерцания

Применение `useLayoutEffect` оправдано исключительно в следующих сценариях:

1. **Измерение DOM-элементов** — получение размеров, позиций, scrollHeight для дальнейшего использования в рендере.
2. **Предотвращение визуального мерцания** — когда нужно скорректировать позицию или размер элемента до того, как пользователь его увидит.
3. **Синхронизация DOM** — принудительная корректировка стилей, классов или атрибутов, зависящих от результата рендера.
4. **Интеграция со сторонними DOM-библиотеками**, требующими синхронного доступа к актуальному DOM.

**Антипаттерн — использование для асинхронных операций:**

```jsx
// НЕПРАВИЛЬНО: блокирует отрисовку ради fetch
useLayoutEffect(() => {
  fetch('/api/data').then(res => res.json()).then(setData);
}, []);

// ПРАВИЛЬНО: fetch не влияет на DOM-макет
useEffect(() => {
  fetch('/api/data').then(res => res.json()).then(setData);
}, []);
```

## 5. Практические примеры

### Позиционирование тултипа

```jsx
import { useLayoutEffect, useRef, useState } from 'react';

function Tooltip({ anchorRef, children }) {
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!anchorRef.current || !tooltipRef.current) return;

    const anchorRect = anchorRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();

    let top = anchorRect.top - tooltipRect.height - 8;
    let left = anchorRect.left + (anchorRect.width - tooltipRect.width) / 2;

    // Корректировка при выходе за границы viewport
    if (top < 0) {
      top = anchorRect.bottom + 8;
    }
    if (left < 0) {
      left = 8;
    }

    setPosition({ top, left });
  }, [anchorRef, children]);

  return (
    <div
      ref={tooltipRef}
      style={{ position: 'fixed', top: position.top, left: position.left }}
    >
      {children}
    </div>
  );
}
```

### Автоматическая подстройка высоты textarea

```jsx
function AutoResizeTextarea({ value, onChange }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const textarea = ref.current;
    // Сбрасываем высоту для корректного измерения scrollHeight
    textarea.style.height = '0px';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      style={{ overflow: 'hidden', resize: 'none' }}
    />
  );
}
```

### Восстановление позиции скролла

```jsx
function ChatMessages({ messages }) {
  const containerRef = useRef(null);
  const prevMessagesLength = useRef(messages.length);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (messages.length > prevMessagesLength.current) {
      // Новое сообщение добавлено — скроллим вниз до отрисовки
      container.scrollTop = container.scrollHeight;
    }

    prevMessagesLength.current = messages.length;
  }, [messages]);

  return (
    <div ref={containerRef} style={{ overflowY: 'auto', maxHeight: 400 }}>
      {messages.map(msg => (
        <div key={msg.id}>{msg.text}</div>
      ))}
    </div>
  );
}
```

### Анимация при появлении элемента

```jsx
function FadeIn({ children }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const node = ref.current;
    // Устанавливаем начальное состояние ДО отрисовки
    node.style.opacity = '0';
    node.style.transition = 'none';

    // Принудительный reflow для применения стилей
    node.getBoundingClientRect();

    // Включаем анимацию
    node.style.transition = 'opacity 300ms ease-in';
    node.style.opacity = '1';
  }, []);

  return <div ref={ref}>{children}</div>;
}
```

## 6. Влияние на производительность

`useLayoutEffect` блокирует отрисовку. Любой тяжёлый код внутри него задержит появление визуального обновления. Это напрямую влияет на метрики Interaction to Next Paint (INP) и Time to Interactive (TTI).

**Антипаттерн — тяжёлые вычисления:**

```jsx
// НЕПРАВИЛЬНО: тяжёлые вычисления блокируют отрисовку
useLayoutEffect(() => {
  const data = expensiveCalculation(rawData); // 50ms вычислений
  setProcessedData(data);
}, [rawData]);

// ПРАВИЛЬНО: тяжёлые вычисления — в useEffect или useMemo
const processedData = useMemo(() => expensiveCalculation(rawData), [rawData]);
```

Рекомендации:

- Минимизируйте объём работы внутри `useLayoutEffect`.
- Используйте его **только** для чтения DOM-геометрии и немедленных корректировок.
- Если код не связан с измерением или корректировкой DOM, используйте `useEffect`.
- Профилируйте с помощью React DevTools Profiler и Chrome Performance tab.

## 7. useLayoutEffect и SSR

При серверном рендеринге (SSR) `useLayoutEffect` вызывает предупреждение, поскольку на сервере отсутствует DOM:

```
Warning: useLayoutEffect does nothing on the server
```

Решения:

```jsx
// Решение 1: условный хук через useIsomorphicLayoutEffect
import { useEffect, useLayoutEffect } from 'react';

const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function Component() {
  useIsomorphicLayoutEffect(() => {
    // Безопасно и на сервере, и на клиенте
  }, []);
}
```

```jsx
// Решение 2: рендер только на клиенте для DOM-зависимых компонентов
function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return children;
}

// Использование
<ClientOnly>
  <TooltipWithLayoutEffect />
</ClientOnly>
```

## 8. Полный порядок выполнения жизненного цикла

Понимание полного порядка выполнения критично для корректного использования `useLayoutEffect`. При обновлении компонента последовательность такова:

```
1. React вызывает функцию компонента (render phase)
2. React вычисляет diff с предыдущим Virtual DOM
3. React применяет изменения к реальному DOM (commit phase)
4. Выполняются cleanup-функции useLayoutEffect (синхронно)
5. Выполняются setup-функции useLayoutEffect (синхронно)
6. Браузер выполняет Style → Layout → Paint
7. Выполняются cleanup-функции useEffect (асинхронно)
8. Выполняются setup-функции useEffect (асинхронно)
```

При наличии вложенных компонентов порядок **монтирования** следует принципу «снизу вверх»: сначала выполняются `useLayoutEffect` дочерних компонентов, затем — родительских.

```jsx
function Parent() {
  useLayoutEffect(() => {
    console.log('Parent useLayoutEffect'); // 2
  }, []);

  useEffect(() => {
    console.log('Parent useEffect'); // 4
  }, []);

  return <Child />;
}

function Child() {
  useLayoutEffect(() => {
    console.log('Child useLayoutEffect'); // 1
  }, []);

  useEffect(() => {
    console.log('Child useEffect'); // 3
  }, []);

  return <div>Child</div>;
}

// Порядок вывода:
// 1. Child useLayoutEffect
// 2. Parent useLayoutEffect
// 3. Child useEffect
// 4. Parent useEffect
```

Этот порядок гарантирует, что родительский `useLayoutEffect` имеет доступ к полностью сконструированному DOM-поддереву, включая все дочерние узлы.
