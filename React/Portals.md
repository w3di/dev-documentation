# Portals — рендеринг за пределами родительского DOM

> Portal позволяет рендерить дочерние элементы в DOM-узел, находящийся за пределами
> иерархии родительского компонента, сохраняя при этом все свойства React-дерева:
> контекст, всплытие событий, жизненный цикл. Это ключевой механизм для модальных окон,
> тултипов и оверлеев.

---

## Оглавление

1. [Что такое Portal — концепция и мотивация](#1-что-такое-portal--концепция-и-мотивация)
2. [API: ReactDOM.createPortal](#2-api-reactdomcreateportal)
3. [Типичные use-cases](#3-типичные-use-cases)
4. [Всплытие событий через Portals](#4-всплытие-событий-через-portals)
5. [Доступность (a11y) при использовании Portals](#5-доступность-a11y-при-использовании-portals)
6. [Управление z-index и стилями](#6-управление-z-index-и-стилями)
7. [Portals и Context — контекст сохраняется](#7-portals-и-context--контекст-сохраняется)
8. [Паттерн: Portal-компонент с useEffect](#8-паттерн-portal-компонент-с-useeffect)
9. [Portals и SSR — ограничения](#9-portals-и-ssr--ограничения)
10. [Антипаттерны при использовании Portals](#10-антипаттерны-при-использовании-portals)

---

## 1. Что такое Portal — концепция и мотивация

Стандартный React-рендеринг подчиняется иерархии DOM: дочерний компонент всегда
рендерится внутри DOM-узла родительского компонента. Это создаёт проблему
для элементов, которые **визуально** должны выходить за границы родителя:
модальные окна, тултипы, выпадающие меню.

**Проблема без Portals:**

```
<div class="card" style="overflow: hidden; position: relative;">
  <div class="tooltip">    ←── tooltip обрезается overflow: hidden
    Подсказка                    родительского контейнера
  </div>
</div>
```

**Решение с Portal:**
Portal рендерит элемент в произвольный DOM-узел (обычно прямой потомок `<body>`),
обходя CSS-ограничения родительских контейнеров.

### DOM-дерево vs React-дерево

```
DOM-дерево (реальный DOM):              React-дерево (виртуальное):

<body>                                   <App>
  ├── <div id="root">                      ├── <Card>
  │     └── <div class="card">             │     ├── <CardContent />
  │           └── <div class="content">    │     └── <Tooltip>        ←── Portal
  │                 ...                    │           └── "Подсказка"
  │                                        │
  └── <div id="portal-root">              └── (контекст, события
        └── <div class="tooltip">               сохраняются в React-дереве)
              └── "Подсказка"
              ↑
              Portal рендерит сюда
```

Ключевой инсайт: **в DOM-дереве** tooltip находится вне card, но **в React-дереве**
он остаётся дочерним элементом Card. Это означает, что события всплывают
по React-иерархии, а не по DOM-иерархии.

---

## 2. API: ReactDOM.createPortal

```jsx
import { createPortal } from 'react-dom';

// Сигнатура:
createPortal(children, domNode, key?)
```

| Параметр | Тип | Описание |
|---|---|---|
| `children` | `ReactNode` | Любой валидный React-элемент (JSX, строка, массив, фрагмент) |
| `domNode` | `HTMLElement` | Целевой DOM-узел, куда будет рендериться содержимое |
| `key` | `string \| number` | Необязательный ключ для уникальной идентификации Portal |

**Возвращает** React-элемент, который можно использовать в JSX как обычный компонент.

```jsx
// Базовый пример — рендеринг в document.body
function Overlay({ children }) {
  return createPortal(
    <div className="overlay">{children}</div>,
    document.body
  );
}
```

---

## 3. Типичные use-cases

| Сценарий | Причина использования Portal | Альтернатива |
|---|---|---|
| **Модальные окна** | Выход из `overflow: hidden`, позиционирование поверх всего | `<dialog>` (нативный), но без гибкости React |
| **Тултипы** | Обход `overflow`, z-index стекового контекста родителя | `position: fixed` (но ненадёжно в nested контекстах) |
| **Выпадающие меню (Dropdown)** | Меню не обрезается контейнером | Popper.js / Floating UI |
| **Уведомления (Toast)** | Фиксированная позиция, независимость от родителя | Глобальный контейнер через Context |
| **Полноэкранные оверлеи** | Перекрытие всего интерфейса | CSS `position: fixed` |
| **Рендеринг в iframe** | Вставка контента в другой документ | `postMessage` API |

### Пример: модальное окно

```jsx
import { createPortal } from 'react-dom';
import { useEffect, useRef } from 'react';

function Modal({ isOpen, onClose, children }) {
  const overlayRef = useRef(null);

  // Закрытие по клику на оверлей
  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) {
      onClose();
    }
  }

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-content">
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Закрыть"
        >
          &times;
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}
```

---

## 4. Всплытие событий через Portals

Несмотря на то что Portal рендерит элемент в другой DOM-узел, **события всплывают
по React-дереву**, а не по DOM-дереву. Это одно из важнейших свойств Portals.

```jsx
import { useState } from 'react';
import { createPortal } from 'react-dom';

function Parent() {
  const [clicks, setClicks] = useState(0);

  // Этот обработчик сработает при клике на кнопку в Portal,
  // потому что событие всплывает по React-дереву
  function handleClick() {
    setClicks(c => c + 1);
  }

  return (
    <div onClick={handleClick}>
      <p>Кликов поймано родителем: {clicks}</p>
      {createPortal(
        <button>Я рендерюсь в document.body, но клик всплывает к Parent</button>,
        document.body
      )}
    </div>
  );
}
```

### Механизм всплытия

```
DOM-дерево:                          React-дерево:
                                     (события всплывают здесь)
<body>
  ├── <div id="root">                <Parent onClick={handleClick}>
  │     └── <div> ← handleClick        │
  │           └── <p>                   └── <button> ← клик здесь
  │                                            │
  └── <button> ← клик здесь                   ▼
        │                               Событие всплывает
        ▼                               к <Parent> через
   В DOM событие всплывает              React-дерево, а НЕ
   к <body>, минуя <div>               через DOM-дерево
```

**Практическое следствие:** если Portal рендерится в `document.body`, а родительский
компонент ловит `onClick`, обработчик сработает. Это интуитивно для React-разработчика,
но может удивить при отладке в DevTools (DOM-структура не совпадает).

---

## 5. Доступность (a11y) при использовании Portals

Portal не добавляет никакой семантики автоматически. Ответственность за доступность
полностью лежит на разработчике.

### Обязательные атрибуты для модальных окон

```jsx
function AccessibleModal({ isOpen, onClose, titleId, children }) {
  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
    >
      <h2 id={titleId}>Заголовок модального окна</h2>
      {children}
      <button onClick={onClose} aria-label="Закрыть модальное окно">
        &times;
      </button>
    </div>,
    document.body
  );
}
```

**Контрольный список a11y для Portal:**
- `role="dialog"` и `aria-modal="true"` для модальных окон
- `aria-labelledby` ссылается на заголовок внутри модала
- **Фокус-ловушка** (focus trap): Tab не должен выходить за пределы модала
- При открытии — фокус переносится в модал
- При закрытии — фокус возвращается к элементу, вызвавшему модал
- `aria-live` для уведомлений (Toast)
- Закрытие по `Escape`

---

## 6. Управление z-index и стилями

### Проблема стекового контекста (stacking context)

CSS `z-index` работает в пределах стекового контекста. Если родитель создаёт
новый контекст (через `transform`, `opacity < 1`, `filter` и др.), дочерний элемент
не может «выпрыгнуть» выше родителя в z-порядке — даже с `z-index: 999999`.

Portal решает эту проблему, рендеря элемент вне стекового контекста родителя.

```
Без Portal:                              С Portal:

<div style="transform: scale(1)">       <body>
  ← НОВЫЙ стековый контекст               ├── <div id="root">
  <div style="z-index: 999999">           │     └── ...
    ← НЕ выйдет выше родителя             │
  </div>                                   └── <div class="tooltip"
</div>                                           style="z-index: 100">
                                                 ← В корневом стековом
                                                   контексте, работает
```

### Рекомендации по z-index для Portal-элементов

| Элемент | z-index | Комментарий |
|---|---|---|
| Dropdown | 100 | Над контентом, но под модалами |
| Tooltip | 200 | Над dropdown |
| Модальное окно | 300 | Над тултипами |
| Overlay модала | 299 | Затемнение под модалом |
| Toast-уведомления | 400 | Поверх всего, включая модалы |

---

## 7. Portals и Context — контекст сохраняется

Поскольку Portal является частью React-дерева (а не DOM-дерева), он имеет доступ
ко всем контекстам, определённым выше в React-иерархии.

```jsx
import { createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';

const ThemeContext = createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <Card />
    </ThemeContext.Provider>
  );
}

function Card() {
  const [showTooltip, setShowTooltip] = useState(false);
  return (
    <div onMouseEnter={() => setShowTooltip(true)}
         onMouseLeave={() => setShowTooltip(false)}>
      Наведите для подсказки
      {showTooltip && <TooltipPortal text="Это подсказка" />}
    </div>
  );
}

function TooltipPortal({ text }) {
  // Контекст доступен, несмотря на рендеринг в document.body
  const theme = useContext(ThemeContext); // "dark"

  return createPortal(
    <div className={`tooltip tooltip--${theme}`}>{text}</div>,
    document.body
  );
}
```

Это работает, потому что React передаёт контекст по **Fiber-дереву**, которое
не зависит от DOM-иерархии. `createPortal` создаёт Fiber-узел с `return` указателем
на родительский Fiber, обеспечивая непрерывность цепочки контекстов.

---

## 8. Паттерн: Portal-компонент с useEffect

Универсальный паттерн — компонент-обёртка, который создаёт DOM-контейнер при монтировании
и удаляет при размонтировании.

```jsx
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function Portal({ children, containerId = 'portal-root' }) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    // Ищем существующий контейнер или создаём новый
    let container = document.getElementById(containerId);

    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      document.body.appendChild(container);
    }

    containerRef.current = container;
    setMounted(true);

    return () => {
      // Удаляем контейнер только если он пуст и был создан нами
      if (container.childNodes.length === 0) {
        container.remove();
      }
    };
  }, [containerId]);

  if (!mounted || !containerRef.current) return null;

  return createPortal(children, containerRef.current);
}

// Использование
function App() {
  const [showModal, setShowModal] = useState(false);

  return (
    <div>
      <button onClick={() => setShowModal(true)}>Открыть</button>
      {showModal && (
        <Portal containerId="modal-container">
          <div className="modal">
            <p>Содержимое модала</p>
            <button onClick={() => setShowModal(false)}>Закрыть</button>
          </div>
        </Portal>
      )}
    </div>
  );
}
```

**Преимущества паттерна:**
- Контейнер создаётся лениво (только при первом использовании)
- Несколько Portal могут использовать один контейнер (`containerId`)
- Автоматическая очистка при размонтировании
- Совместимость с SSR (создание DOM только в `useEffect`)

---

## 9. Portals и SSR — ограничения

Portal зависит от реального DOM-узла (`document.body`, `document.getElementById`),
который недоступен на сервере. Это создаёт ограничения для SSR.

**Проблема:**

```jsx
// Ошибка на сервере: document is not defined
function Tooltip({ text }) {
  return createPortal(
    <div className="tooltip">{text}</div>,
    document.body // document не существует на сервере
  );
}
```

**Решения:**

1. **Условный рендеринг через useEffect** (паттерн из раздела 8)
2. **Проверка окружения:**

```jsx
function SafePortal({ children }) {
  if (typeof window === 'undefined') {
    // На сервере — рендерим inline или null
    return null;
  }
  return createPortal(children, document.body);
}
```

3. **useIsClient хук:**

```jsx
function useIsClient() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return isClient;
}

function Tooltip({ text }) {
  const isClient = useIsClient();
  if (!isClient) return null;

  return createPortal(
    <div className="tooltip">{text}</div>,
    document.body
  );
}
```

---

## 10. Антипаттерны при использовании Portals

### 10.1 Чрезмерное использование

```jsx
// Антипаттерн: Portal для элемента, который не нуждается в выходе из DOM-контекста
function Card({ title, description }) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {createPortal(          // Зачем? description не нуждается в Portal
        <p>{description}</p>,
        document.body
      )}
    </div>
  );
}
```

### 10.2 Утечка DOM-узлов

```jsx
// Антипаттерн: создание контейнера без очистки
function LeakyPortal({ children }) {
  const container = document.createElement('div');
  document.body.appendChild(container); // Каждый рендер — новый div!

  return createPortal(children, container);
}

// Правильно: создание в useEffect с очисткой (см. раздел 8)
```

### 10.3 Игнорирование доступности

```jsx
// Антипаттерн: модал без управления фокусом и ARIA-атрибутов
function BadModal({ isOpen, children }) {
  if (!isOpen) return null;
  return createPortal(
    <div className="modal">{children}</div>, // нет role, aria-modal, focus trap
    document.body
  );
}
```

### 10.4 Рендеринг в несуществующий узел

```jsx
// Антипаттерн: жёсткая привязка к DOM-узлу, который может не существовать
function Tooltip({ text }) {
  const target = document.getElementById('tooltip-root');
  // target может быть null, если DOM ещё не готов или элемент удалён
  return createPortal(<span>{text}</span>, target); // TypeError!
}
```

**Правило:** Portal — инструмент для решения конкретных проблем CSS-позиционирования
и стекового контекста. Если элемент можно разместить с помощью `position: fixed`
или `position: absolute` без CSS-конфликтов — Portal не нужен.
