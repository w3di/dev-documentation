# React Fiber — архитектура и внутреннее устройство

> Fiber — это полная переработка ядра React (reconciler), которая заменила
> синхронный Stack Reconciler на инкрементальный, прерываемый движок рендеринга.
> Каждый элемент UI представлен объектом FiberNode, а обход дерева превращён
> из рекурсивного в итеративный, что позволяет React останавливать работу,
> возвращаться к ней и переключаться между задачами разного приоритета.

---

## Оглавление

1. [Зачем появилась Fiber-архитектура (проблемы Stack Reconciler)](#1-зачем-появилась-fiber-архитектура-проблемы-stack-reconciler)
2. [FiberNode — внутреннее устройство](#2-fibernode--внутреннее-устройство)
3. [Fiber-дерево: Current Tree и Work In Progress Tree](#3-fiber-дерево-current-tree-и-work-in-progress-tree)
4. [Процесс Reconciliation (алгоритм diffing)](#4-процесс-reconciliation-алгоритм-diffing)
5. [Work Loop — итеративный обход дерева](#5-work-loop--итеративный-обход-дерева)
6. [Фаза Render (reconciliation) — прерываемая](#6-фаза-render-reconciliation--прерываемая)
7. [Фаза Commit — синхронная](#7-фаза-commit--синхронная)
8. [Система приоритетов Lanes](#8-система-приоритетов-lanes)
9. [Scheduler — планировщик задач](#9-scheduler--планировщик-задач)
10. [Concurrent Features](#10-concurrent-features)
11. [Effect List vs subtreeFlags (React 18+)](#11-effect-list-vs-subtreeflags-react-18)
12. [Практический пример: путь обновления от setState до DOM](#12-практический-пример-путь-обновления-от-setstate-до-dom)

---

## 1. Зачем появилась Fiber-архитектура (проблемы Stack Reconciler)

### 1.1 Stack Reconciler (React ≤ 15)

До React 16 reconciler использовал **рекурсивный обход** виртуального DOM. Вызов `setState` запускал `reconcileChildren`, который рекурсивно спускался по всему поддереву. Пока стек вызовов не размотается полностью, главный поток заблокирован:

```
reconcileChildren(root)
  └── reconcileChildren(App)
        ├── reconcileChildren(Header)
        │     └── reconcileChildren(Nav) ...
        └── reconcileChildren(Main)
              └── reconcileChildren(List)
                    ├── reconcileChildren(Item1) ...
                    ├── reconcileChildren(Item2) ...
                    └── ...1000 items... ← поток заблокирован
```

Проблемы синхронного подхода:

- **Блокировка главного потока.** Обновление дерева из 10 000 узлов может занять 50–200 мс. Во время этого промежутка браузер не может обработать пользовательский ввод, анимации или отрисовку кадра.
- **Отсутствие приоритетов.** Все обновления равноправны. Набор текста в `<input>` и тяжёлая фильтрация списка обрабатываются в одной очереди.
- **Невозможность прерывания.** Рекурсию нельзя «поставить на паузу» — JavaScript не умеет сохранять и восстанавливать call stack.
- **Невозможность конкурентного рендеринга.** Без прерываемости нет Suspense, Transitions, Streaming SSR.

| Характеристика | Stack Reconciler | Fiber Reconciler |
|---|---|---|
| Обход дерева | Рекурсивный (`reconcileChildren`) | Итеративный (linked list, `while` loop) |
| Прерываемость | Нет — call stack должен размотаться | Да — можно остановиться на любом FiberNode |
| Приоритеты | Нет — FIFO очередь | Lanes — битовая маска приоритетов |
| Конкурентность | Невозможна | `startTransition`, `useDeferredValue`, Suspense |
| Структура данных | Виртуальный DOM (plain objects) | FiberNode (linked list с child/sibling/return) |
| Фазы | Одна неделимая фаза | Render (прерываемая) + Commit (синхронная) |
| Анимация при обновлении | Дропы кадров при тяжёлых обновлениях | Time slicing — работа порциями по 5 мс |

### 1.2 Ключевая идея Fiber

Fiber преобразует **рекурсию в итерацию**. Вместо call stack используется связный список FiberNode. Каждый узел — единица работы (unit of work). React обрабатывает один узел, затем проверяет: остался ли бюджет времени? Если нет — возвращает управление браузеру (`shouldYield()`), а позже продолжает с того же места.

---

## 2. FiberNode — внутреннее устройство

### 2.1 Определение

FiberNode — это JavaScript-объект, который является единицей работы для reconciler. Каждому React-элементу (`<App />`, `<div>`, `Fragment`) соответствует свой FiberNode.

```jsx
// React-элемент (что возвращает JSX)
const element = {
  type: App,
  props: { name: "Fiber" },
  key: null,
  ref: null,
};

// FiberNode (что создаёт reconciler)
// Упрощённая структура — в реальности ~30 полей
const fiberNode = {
  tag: 0,                    // FunctionComponent
  type: App,                 // функция/класс/строка ('div')
  key: null,                 // key из JSX
  stateNode: null,           // DOM-элемент или instance класса

  // === Связи (linked list) ===
  child: null,               // первый дочерний Fiber
  sibling: null,             // следующий «брат»
  return: null,              // родительский Fiber
  index: 0,                  // позиция среди siblings

  // === Props и State ===
  pendingProps: {},           // новые props (входящие)
  memoizedProps: {},          // props после последнего рендера
  memoizedState: null,        // linked list хуков (для FC)
  updateQueue: null,          // очередь обновлений

  // === Double buffering ===
  alternate: null,            // ссылка на WIP / current аналог

  // === Эффекты ===
  flags: 0,                  // битовая маска (Placement, Update, Deletion...)
  subtreeFlags: 0,            // объединённые flags потомков
  deletions: null,            // массив удалённых дочерних fiber

  // === Приоритеты ===
  lanes: 0,                  // приоритет этого fiber
  childLanes: 0,             // объединённые lanes потомков

  // === Ref ===
  ref: null,
};
```

### 2.2 Таблица ключевых полей FiberNode

| Поле | Тип | Назначение |
|---|---|---|
| `tag` | `number` | Тип компонента: `FunctionComponent (0)`, `ClassComponent (1)`, `HostComponent (5)`, `HostText (6)`, `Fragment (7)` и др. |
| `type` | `function \| string \| Symbol` | Для FC — функция; для host — строка (`'div'`); для Fragment — `Symbol(react.fragment)` |
| `stateNode` | `DOM Element \| Instance \| null` | Для `HostComponent` — реальный DOM-элемент; для `ClassComponent` — экземпляр класса; для FC — `null` |
| `child` | `FiberNode \| null` | Первый дочерний fiber-узел |
| `sibling` | `FiberNode \| null` | Следующий «брат» на том же уровне |
| `return` | `FiberNode \| null` | Родительский fiber (именно `return`, не `parent`) |
| `alternate` | `FiberNode \| null` | Ссылка на двойник — current ↔ WIP |
| `pendingProps` | `object` | Props, переданные при текущем рендере (ещё не обработаны) |
| `memoizedProps` | `object` | Props после успешного рендера |
| `memoizedState` | `Hook \| State \| null` | Для FC — linked list хуков; для CC — объект state |
| `updateQueue` | `UpdateQueue \| null` | Очередь обновлений: `setState` вызовы, `forceUpdate` |
| `flags` | `number` (битовая маска) | Тип побочного эффекта: `Placement (2)`, `Update (4)`, `Deletion (8)`, `Ref (512)` и др. |
| `subtreeFlags` | `number` | OR-объединение `flags` всех потомков (React 18+, замена Effect List) |
| `lanes` | `number` (битовая маска) | Приоритет ожидающего обновления на этом узле |
| `childLanes` | `number` | OR-объединение `lanes` потомков — для быстрого пропуска поддеревьев |
| `deletions` | `FiberNode[] \| null` | Дочерние fiber, помеченные на удаление |
| `index` | `number` | Позиция среди siblings — используется при reconciliation списков |

### 2.3 Связи child / sibling / return

FiberNode'ы образуют не классическое дерево (массив children), а **связный список**. У каждого узла ровно три ссылки:

```
            ┌─────────────┐
            │  FiberRoot   │
            │  (tag: 3)    │
            └──────┬───────┘
                   │ child
            ┌──────▼───────┐
            │     App      │
            │  (tag: 0)    │◄─────────────────────┐
            └──────┬───────┘                      │
                   │ child                        │ return
            ┌──────▼───────┐    sibling    ┌──────┴───────┐
            │    Header    │──────────────►│     Main     │
            │  (tag: 5)    │              │   (tag: 0)   │
            └──────┬───────┘              └──────┬───────┘
                   │ child                        │ child
            ┌──────▼───────┐              ┌──────▼───────┐   sibling   ┌────────────┐
            │     Nav      │              │    List      │────────────►│   Footer   │
            │  (tag: 5)    │              │  (tag: 0)    │             │  (tag: 5)  │
            └──────────────┘              └──────┬───────┘             └────────────┘
                                                 │ child
                                          ┌──────▼───────┐   sibling   ┌────────────┐
                                          │    Item1     │────────────►│   Item2    │
                                          │  (tag: 5)    │             │  (tag: 5)  │
                                          └──────────────┘             └────────────┘
```

Правила связей:
- `child` — указывает на **первого** дочернего (не на всех)
- `sibling` — указывает на следующего «брата» (того же уровня)
- `return` — указывает на родителя (каждый узел знает своего родителя)

Это превращает дерево в связный список, который можно обойти итеративно (без рекурсии), всегда зная «куда идти дальше».

---

## 3. Fiber-дерево: Current Tree и Work In Progress Tree

### 3.1 Double Buffering

React поддерживает **два fiber-дерева** одновременно — подход, заимствованный из компьютерной графики (double buffering):

```
          ┌────────────────────┐           ┌────────────────────┐
          │    Current Tree    │           │  Work In Progress  │
          │  (то, что в DOM)   │           │   (строится)       │
          ├────────────────────┤           ├────────────────────┤
          │                    │ alternate │                    │
          │   App (current)    │◄─────────►│   App (WIP)        │
          │   ├── Header       │◄─────────►│   ├── Header       │
          │   └── Main         │◄─────────►│   └── Main         │
          │       ├── List     │◄─────────►│       ├── List *   │ ← изменён
          │       │  ├── Item1 │◄─────────►│       │  ├── Item1 │
          │       │  └── Item2 │◄─────────►│       │  ├── Item2 │
          │       │            │           │       │  └── Item3 │ ← новый (Placement)
          │       └── Footer   │◄─────────►│       └── Footer   │
          └────────────────────┘           └────────────────────┘
                                                    │
                                                    ▼
                                            После Commit:
                                            WIP → Current
                                            Старый Current → WIP (для след. обновления)
```

**Current Tree** — дерево, соответствующее тому, что отображено в DOM.

**Work In Progress Tree (WIP)** — дерево, которое React строит во время рендера. Каждый FiberNode в current tree имеет `alternate` — ссылку на свой двойник в WIP-дереве (и наоборот).

### 3.2 Жизненный цикл деревьев

```jsx
// Первый рендер (mount)
function App() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <h1>Counter</h1>
      <p>{count}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  );
}
```

1. **Mount.** Current tree не существует. React строит WIP tree с нуля. После commit WIP становится current.
2. **Update.** `setCount(1)` → React клонирует текущие fiber-узлы в WIP tree (через `alternate`). Узлы, которым не нужно обновление, **переиспользуются** (bailout). Изменённые узлы получают новые props/state.
3. **Commit.** WIP tree применяется к DOM и становится новым current tree.
4. **Следующее обновление.** Старый current tree переиспользуется как заготовка для нового WIP tree → экономия на аллокациях.

### 3.3 Переиспользование FiberNode (bailout)

Если компонент получает те же props и не имеет pending-обновлений:

```jsx
function Header({ title }) {
  // Не перерендеривается, если title не изменился
  return <h1>{title}</h1>;
}

// React проверяет:
// oldProps === newProps ? (shallow comparison для memo)
// fiber.lanes === NoLanes ? (нет pending updates)
// → bailout: клонировать fiber, пропустить beginWork
```

При bailout React не вызывает функцию компонента вообще — это ключевая оптимизация.

---

## 4. Процесс Reconciliation (алгоритм diffing)

### 4.1 O(n) эвристики

Классический алгоритм сравнения деревьев имеет сложность **O(n³)**. React использует три эвристики, которые снижают сложность до **O(n)**:

1. **Разные типы → полная замена.** Если `type` элемента изменился (`<div>` → `<span>`, `<Header>` → `<Footer>`), React удаляет всё поддерево и строит новое с нуля. Не пытается искать совпадения в потомках.

2. **Сравнение на одном уровне.** React сравнивает элементы только среди siblings (на одном уровне вложенности). Если элемент переместился на другой уровень — это delete + create, а не move.

3. **key для списков.** Атрибут `key` позволяет React отслеживать элементы в списках при переупорядочивании.

```jsx
// БЕЗ key — React сравнивает по индексу:
// [A, B, C] → [C, A, B]
// index 0: A → C  (update)
// index 1: B → A  (update)
// index 2: C → B  (update)
// → 3 обновления DOM

// С key — React отслеживает идентичность:
// [A(key=a), B(key=b), C(key=c)] → [C(key=c), A(key=a), B(key=b)]
// key=a: переместить
// key=b: переместить
// key=c: переместить
// → только перемещения, без обновления содержимого
```

### 4.2 Reconciliation одиночного элемента

```jsx
// Старый: <div className="old">text</div>
// Новый:  <div className="new">text</div>

// 1. type совпадает ('div' === 'div') → переиспользовать DOM-узел
// 2. Сравнить props: className изменился
// 3. Пометить fiber flag: Update (4)
// 4. В фазе commit: domNode.className = "new"
```

### 4.3 Reconciliation списков (reconcileChildrenArray)

Алгоритм сравнения списков в React — один из самых сложных участков кода. Он состоит из нескольких проходов:

```
Проход 1: Сравнение по индексу (слева направо)
────────────────────────────────────────────────
old: [A, B, C, D, E]
new: [A, B, F, D, E]
      ✓  ✓  ✗ ← стоп, тип не совпал (C ≠ F)

Проход 2: Проверка, не осталось ли только удаление/добавление
────────────────────────────────────────────────
Если new[] закончился раньше → удалить оставшиеся old[]
Если old[] закончился раньше → добавить оставшиеся new[]

Проход 3: Построение Map по key (для переупорядочивания)
────────────────────────────────────────────────
existingChildren = Map { key_C → FiberC, key_D → FiberD, key_E → FiberE }
Для каждого оставшегося new:
  - F: нет в Map → создать (Placement)
  - D: есть в Map → переиспользовать, удалить из Map
  - E: есть в Map → переиспользовать, удалить из Map
Оставшиеся в Map (C) → удалить (Deletion)
```

### 4.4 Почему key={index} — плохо

```jsx
// Начальный список: ["Яблоко", "Банан", "Вишня"]
// Удаляем "Банан": ["Яблоко", "Вишня"]

// С key={index}:
// index 0: "Яблоко" → "Яблоко"  ✓ (совпало)
// index 1: "Банан"  → "Вишня"   ✗ (Update — ненужная работа)
// index 2: "Вишня"  → null      ✗ (Deletion)
// React обновляет DOM-узел "Банан" → "Вишня" и удаляет последний

// С key={item.id}:
// id=1: "Яблоко" → "Яблоко"  ✓
// id=2: "Банан"  → null       ✗ (Deletion — единственное изменение)
// id=3: "Вишня"  → "Вишня"   ✓
// React удаляет только один DOM-узел — корректно и эффективно
```

---

## 5. Work Loop — итеративный обход дерева

### 5.1 performUnitOfWork

Сердце Fiber — цикл `workLoopConcurrent`, который обрабатывает fiber по одному:

```jsx
// Упрощённая реализация workLoop
function workLoopConcurrent() {
  // Пока есть работа И есть бюджет времени
  while (workInProgress !== null && !shouldYield()) {
    performUnitOfWork(workInProgress);
  }
}

function performUnitOfWork(unitOfWork) {
  const current = unitOfWork.alternate;

  // === Фаза "begin" — спуск вниз ===
  const next = beginWork(current, unitOfWork, renderLanes);

  // Зафиксировать props после рендера
  unitOfWork.memoizedProps = unitOfWork.pendingProps;

  if (next !== null) {
    // Есть дочерний → идём вниз
    workInProgress = next;
  } else {
    // Нет дочерних → завершаем узел и идём к sibling/return
    completeUnitOfWork(unitOfWork);
  }
}
```

### 5.2 beginWork — спуск по дереву

`beginWork` вызывается для каждого fiber при спуске. В зависимости от `tag` вызывается соответствующий обработчик:

```jsx
function beginWork(current, workInProgress, renderLanes) {
  // Проверка bailout (можно ли пропустить)
  if (current !== null) {
    const oldProps = current.memoizedProps;
    const newProps = workInProgress.pendingProps;

    if (oldProps === newProps && !hasScheduledUpdate(workInProgress, renderLanes)) {
      // Bailout — пропустить этот компонент
      return bailoutOnAlreadyFinishedWork(current, workInProgress, renderLanes);
    }
  }

  switch (workInProgress.tag) {
    case FunctionComponent:
      return updateFunctionComponent(current, workInProgress, renderLanes);
    case ClassComponent:
      return updateClassComponent(current, workInProgress, renderLanes);
    case HostComponent: // 'div', 'span', etc.
      return updateHostComponent(current, workInProgress, renderLanes);
    case HostText:
      return updateHostText(current, workInProgress);
    // ... другие типы
  }
}

// Для FunctionComponent:
function updateFunctionComponent(current, workInProgress, renderLanes) {
  // Вызвать функцию компонента (здесь выполняются хуки)
  const children = renderWithHooks(current, workInProgress, Component, props);

  // Reconcile — сравнить старых и новых children
  reconcileChildren(current, workInProgress, children, renderLanes);

  // Вернуть первого дочернего — workLoop пойдёт вглубь
  return workInProgress.child;
}
```

### 5.3 completeWork — подъём наверх

Когда у узла нет дочерних (или все дочерние уже обработаны), вызывается `completeWork`:

```jsx
function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;

  do {
    const current = completedWork.alternate;
    const returnFiber = completedWork.return;

    // Завершить узел — создать DOM-элемент (если mount), diff props
    completeWork(current, completedWork, renderLanes);

    // Пробросить flags вверх (bubbleProperties)
    // returnFiber.subtreeFlags |= completedWork.subtreeFlags | completedWork.flags;
    // returnFiber.childLanes |= completedWork.childLanes | completedWork.lanes;

    // Есть sibling → перейти к нему (beginWork)
    if (completedWork.sibling !== null) {
      workInProgress = completedWork.sibling;
      return;
    }

    // Нет sibling → подняться к parent
    completedWork = returnFiber;
    workInProgress = completedWork;
  } while (completedWork !== null);
}
```

### 5.4 Порядок обхода (визуализация)

```
Дерево:
        App
       /   \
    Header  Main
             |
            List
           /    \
        Item1  Item2

Порядок обработки:

beginWork(App)          ──── спуск ────►
  beginWork(Header)
    completeWork(Header)  ◄── подъём ──
  beginWork(Main)         ──── спуск ────►
    beginWork(List)
      beginWork(Item1)
        completeWork(Item1)  ◄── подъём ──
      beginWork(Item2)
        completeWork(Item2)  ◄── подъём ──
      completeWork(List)     ◄── подъём ──
    completeWork(Main)       ◄── подъём ──
  completeWork(App)          ◄── подъём ──

Маршрут: App → Header ↩ → Main → List → Item1 ↩ → Item2 ↩ ↩ ↩ ↩
```

Каждая стрелка `→` — это `beginWork` (спуск через `child` или `sibling`).
Каждая стрелка `↩` — это `completeWork` (подъём через `return`).

---

## 6. Фаза Render (reconciliation) — прерываемая

### 6.1 Характеристики

Render-фаза — это выполнение `workLoopConcurrent`. Она **чистая** (pure): не производит побочных эффектов, не изменяет DOM, не вызывает lifecycle с побочными эффектами.

Что происходит:
1. React начинает с корня (или с узла, на котором произошло обновление).
2. Для каждого fiber вызывается `beginWork` → `completeWork`.
3. Функции компонентов вызываются, хуки выполняются.
4. `reconcileChildren` сравнивает старые и новые children.
5. На fiber'ах проставляются `flags` (Placement, Update, Deletion).
6. `subtreeFlags` пробрасываются вверх (bubble).

### 6.2 Прерываемость

```
Render-фаза (concurrent mode):

┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  React   │     │ Browser │     │  React   │     │ Browser │
│  работает│     │ рисует  │     │ работает │     │ рисует  │
│  5 мс    │     │ кадр    │     │  5 мс    │     │ кадр    │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
├── slice 1 ──►├── idle ──►├── slice 2 ──►├── idle ──►
     ▲                            ▲
     │                            │
  beginWork(A)                 beginWork(D)
  beginWork(B)                 beginWork(E)
  beginWork(C)                 completeWork(E)
  shouldYield()=true           completeWork(D)
  → PAUSE                     → DONE, commit
```

React использует `MessageChannel` (не `requestIdleCallback`) для планирования порций работы. По умолчанию бюджет одного «среза» — **5 мс** (`yieldInterval`).

### 6.3 Чистота render-фазы

Критически важно: функции компонентов могут быть вызваны **повторно** при прерывании. Именно поэтому:

```jsx
// ❌ НЕПРАВИЛЬНО: побочный эффект в render
function BadComponent() {
  document.title = "Updated"; // Может выполниться 2+ раз
  fetch("/api/track");        // Дублирование запросов
  return <div />;
}

// ✓ ПРАВИЛЬНО: побочные эффекты только в useEffect / commit-фазе
function GoodComponent() {
  useEffect(() => {
    document.title = "Updated";
    fetch("/api/track");
  }, []);
  return <div />;
}
```

---

## 7. Фаза Commit — синхронная

### 7.1 Три подфазы

После завершения render-фазы React входит в commit-фазу. Она **синхронная** (не может быть прервана) и состоит из трёх подфаз:

```
                    ┌─────────────────────────────────────────────────┐
                    │              COMMIT PHASE                       │
                    │          (синхронная, неразрывная)               │
                    ├─────────────┬───────────────┬───────────────────┤
                    │  Before     │   Mutation    │     Layout        │
                    │  Mutation   │               │                   │
                    ├─────────────┼───────────────┼───────────────────┤
                    │getSnapshot  │appendChild    │useLayoutEffect    │
                    │Before-      │removeChild    │componentDidMount  │
                    │ Update      │setText        │componentDidUpdate │
                    │             │setAttribute   │ref присваивание   │
                    │             │               │                   │
                    │ DOM ещё     │ DOM           │ DOM уже           │
                    │ старый      │ изменяется    │ обновлён          │
                    └─────────────┴───────────────┴───────────────────┘
                                                          │
                                                          ▼
                                                  После Commit:
                                                  WIP → Current
                                                  Планирование
                                                  useEffect (async)
```

### 7.2 Таблица подфаз Commit

| Подфаза | Состояние DOM | Что выполняется | Прерываемость |
|---|---|---|---|
| **Before Mutation** | Старый (не обновлён) | `getSnapshotBeforeUpdate`, чтение DOM-метрик, `Snapshot` flag | Нет |
| **Mutation** | Изменяется | `appendChild`, `removeChild`, `insertBefore`, `textContent`, обновление атрибутов, `Ref` detach | Нет |
| **Layout** | Новый (обновлён) | `useLayoutEffect` (setup), `componentDidMount`, `componentDidUpdate`, `Ref` attach | Нет |
| **Passive Effects** (после commit) | Новый | `useEffect` (cleanup + setup) — вызывается **асинхронно** после отрисовки кадра | Да (планируется) |

### 7.3 Порядок выполнения эффектов

```jsx
function Component() {
  useLayoutEffect(() => {
    console.log("3: layout effect setup"); // синхронно в commit
    return () => console.log("cleanup layout");
  });

  useEffect(() => {
    console.log("4: passive effect setup"); // асинхронно после paint
    return () => console.log("cleanup passive");
  });

  console.log("1: render"); // в render-фазе
  return <div ref={(node) => console.log("2: ref callback")} />;
}

// Порядок при mount:
// 1: render            (render phase)
// 2: ref callback      (layout sub-phase)
// 3: layout effect     (layout sub-phase)
// 4: passive effect    (после browser paint)
```

### 7.4 Переключение деревьев

В конце commit-фазы происходит:

```
fiberRoot.current = finishedWork; // WIP tree становится current tree
```

Одна строка — но она означает, что теперь при следующем обновлении `current` ссылается на то, что мы только что построили, а старое current-дерево будет переиспользовано как заготовка для нового WIP.

---

## 8. Система приоритетов Lanes

### 8.1 Что такое Lanes

Lanes (дословно «полосы», как на шоссе) — это система приоритетов в React 18+, основанная на **битовых масках**. Каждый приоритет — это один или несколько бит в 31-битном числе.

```jsx
// Определение lanes в исходном коде React (ReactFiberLane.js)
const NoLanes           = 0b0000000000000000000000000000000;
const SyncLane          = 0b0000000000000000000000000000010;  // bit 1
const InputContinuousLane = 0b0000000000000000000000000001000; // bit 3
const DefaultLane       = 0b0000000000000000000000000100000;  // bit 5
const TransitionLane1   = 0b0000000000000000000001000000000;  // bit 9
const TransitionLane2   = 0b0000000000000000000010000000000;  // bit 10
// ... TransitionLane3-16
const IdleLane          = 0b0100000000000000000000000000000;  // bit 30
const OffscreenLane     = 0b1000000000000000000000000000000;  // bit 31
```

Битовые маски позволяют **объединять** несколько lanes через OR и **проверять** пересечения через AND — за O(1).

### 8.2 Таблица приоритетов Lane

| Lane | Приоритет | Источник | Пример |
|---|---|---|---|
| `SyncLane` | Наивысший | `flushSync`, legacy `ReactDOM.render` | `flushSync(() => setState(x))` |
| `InputContinuousLane` | Высокий | Непрерывные пользовательские события | `mousemove`, `drag`, `scroll` |
| `DefaultLane` | Нормальный | Дискретные события | `click`, `keydown`, `setState` внутри обработчиков |
| `TransitionLane1..16` | Низкий | `startTransition`, `useTransition` | Фильтрация списка, навигация |
| `RetryLane1..4` | Низкий | Повторные попытки Suspense | Подгрузка данных, lazy-компоненты |
| `IdleLane` | Минимальный | `requestIdleCallback` в React | Предзагрузка, offscreen-рендеринг |
| `OffscreenLane` | Фоновый | Offscreen API (experimental) | Предрендеринг невидимых UI |

### 8.3 Как lanes используются

```jsx
function handleClick() {
  // Обновление получает DefaultLane (дискретное событие)
  setCount(c => c + 1); // lane = DefaultLane (0b...0100000)

  startTransition(() => {
    // Обновление получает TransitionLane
    setFilteredList(filterItems(query)); // lane = TransitionLane1 (0b...1000000000)
  });
}

// React обрабатывает DefaultLane ПЕРВЫМ,
// затем, если есть время, — TransitionLane.
// Если во время обработки TransitionLane приходит
// новый click → React прерывает Transition и обрабатывает click.
```

### 8.4 Батчинг через lanes

```jsx
function handleClick() {
  setA(1);  // lane = DefaultLane
  setB(2);  // lane = DefaultLane
  setC(3);  // lane = DefaultLane
  // Три обновления с одинаковым lane → React объединяет их в один рендер
  // fiber.lanes |= DefaultLane (идемпотентно)
}
```

---

## 9. Scheduler — планировщик задач

### 9.1 Архитектура Scheduler

Scheduler — это отдельный пакет (`scheduler`), который React использует для управления временем. Он работает на уровне выше Fiber Reconciler:

```
┌───────────────────────────────────────────────────────────────┐
│                    React Application                          │
├───────────────────────────────────────────────────────────────┤
│                    React Reconciler (Fiber)                    │
│                  beginWork / completeWork                      │
├───────────────────────────────────────────────────────────────┤
│                      Scheduler                                │
│            scheduleCallback / shouldYield                      │
│           priority queue (min-heap по expirationTime)          │
├───────────────────────────────────────────────────────────────┤
│                    Host Environment                            │
│               MessageChannel / setTimeout                     │
│              performance.now() для тайминга                   │
└───────────────────────────────────────────────────────────────┘
```

### 9.2 Уровни приоритета Scheduler

Scheduler имеет свою систему приоритетов (не путать с Lanes — они маппятся друг на друга):

```jsx
// scheduler/src/SchedulerPriorities.js
const ImmediatePriority = 1;   // timeout = -1 мс (просрочено немедленно)
const UserBlockingPriority = 2; // timeout = 250 мс
const NormalPriority = 3;       // timeout = 5000 мс
const LowPriority = 4;          // timeout = 10000 мс
const IdlePriority = 5;         // timeout = maxSigned31BitInt (~1073741823 мс)
```

### 9.3 Time Slicing и shouldYield

```jsx
// Упрощённая реализация
let deadline = 0;
const yieldInterval = 5; // мс

function shouldYieldToHost() {
  const currentTime = performance.now();
  return currentTime >= deadline;
}

function performWorkUntilDeadline() {
  const currentTime = performance.now();
  deadline = currentTime + yieldInterval; // 5 мс бюджет

  const hasMoreWork = scheduledCallback(); // workLoopConcurrent

  if (hasMoreWork) {
    // Запланировать следующий slice через MessageChannel
    port.postMessage(null);
  }
}

// MessageChannel используется вместо setTimeout(fn, 0),
// потому что setTimeout имеет минимальную задержку 4мс (после 5 вложенных вызовов).
// MessageChannel вызывается в начале следующего макротаска (~0.1мс).
const channel = new MessageChannel();
channel.port1.onmessage = performWorkUntilDeadline;

function requestHostCallback(callback) {
  scheduledCallback = callback;
  channel.port2.postMessage(null);
}
```

### 9.4 Min-Heap для задач

Scheduler хранит задачи в **min-heap** (сортировка по `expirationTime`):

```
            ┌─────────────────┐
            │ Task A          │
            │ expiration: 100 │  ← наименьший, обрабатывается первым
            └────────┬────────┘
               ┌─────┴──────┐
        ┌──────▼──────┐  ┌──▼────────────┐
        │ Task B      │  │ Task C        │
        │ exp: 350    │  │ exp: 5100     │
        └─────────────┘  └───────────────┘

expirationTime = startTime + timeout(priority)
```

Операции: `push` — O(log n), `peek` (минимальный) — O(1), `pop` — O(log n).

---

## 10. Concurrent Features

### 10.1 startTransition

Маркирует обновления как «переходные» — с низким приоритетом:

```jsx
import { startTransition, useState } from 'react';

function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  function handleChange(e) {
    const value = e.target.value;

    // Срочное обновление — DefaultLane
    setQuery(value); // Мгновенно обновляет input

    // Переходное обновление — TransitionLane
    startTransition(() => {
      setResults(filterHugeList(value)); // Может быть прервано
    });
  }

  return (
    <>
      <input value={query} onChange={handleChange} />
      <ResultsList results={results} />
    </>
  );
}
```

Как это работает внутри:
1. `startTransition` устанавливает глобальный флаг `ReactCurrentBatchConfig.transition`.
2. Все `setState` внутри callback получают `TransitionLane` вместо `DefaultLane`.
3. React может прервать рендер transition, если приходит более срочное обновление.

### 10.2 useTransition

```jsx
function TabContainer() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState('home');

  function selectTab(nextTab) {
    startTransition(() => {
      setTab(nextTab); // TransitionLane
    });
  }

  return (
    <>
      <TabBar activeTab={tab} onSelect={selectTab} />
      {isPending && <Spinner />}
      <TabPanel tab={tab} />
    </>
  );
}
// isPending = true пока transition-рендер не завершён
// UI остаётся отзывчивым: старый tab видим, пока новый рендерится
```

### 10.3 useDeferredValue

```jsx
function SearchResults({ query }) {
  // deferredQuery обновляется с TransitionLane
  const deferredQuery = useDeferredValue(query);
  // query = "abc" (актуальное), deferredQuery = "ab" (отложенное)

  const results = useMemo(() => {
    return filterHugeList(deferredQuery);
  }, [deferredQuery]);

  return (
    <div style={{ opacity: query !== deferredQuery ? 0.7 : 1 }}>
      {results.map(item => <Item key={item.id} data={item} />)}
    </div>
  );
}
```

Внутренний механизм: `useDeferredValue` хранит два значения. При обновлении `query` React сначала рендерит с предыдущим `deferredQuery` (мгновенно), затем планирует transition-рендер с новым значением.

### 10.4 Suspense и Fiber

```jsx
function ProfilePage() {
  return (
    <Suspense fallback={<Skeleton />}>
      <ProfileDetails />  {/* может «приостановить» рендер */}
    </Suspense>
  );
}

// Внутри React:
// 1. beginWork(ProfileDetails) → компонент выбрасывает Promise (throw promise)
// 2. React ловит promise в ближайшем Suspense boundary
// 3. Fiber ProfileDetails получает flag: Incomplete
// 4. Suspense boundary переключается на fallback
// 5. Когда promise разрешается → React планирует ре-рендер (RetryLane)
// 6. ProfileDetails рендерится повторно, уже с данными
```

---

## 11. Effect List vs subtreeFlags (React 18+)

### 11.1 Effect List (React ≤ 17)

В React 16–17 после render-фазы строился **Effect List** — связный список fiber'ов, которые имеют побочные эффекты:

```
// React 17: Effect List (linked list через firstEffect/nextEffect)
commitRoot:
  effectList → Fiber(Placement) → Fiber(Update) → Fiber(Deletion) → null

// Проблемы:
// 1. Дополнительная сложность кода — нужно поддерживать связный список
// 2. Баги при пропуске узлов (edge cases с Suspense)
// 3. Невозможно эффективно обрабатывать subtree-эффекты (Offscreen)
```

### 11.2 subtreeFlags (React 18+)

В React 18 Effect List заменён на **subtreeFlags** — битовую маску, которая проталкивается вверх при `completeWork`:

```
// React 18: bubbleProperties
function bubbleProperties(completedWork) {
  let subtreeFlags = NoFlags;
  let child = completedWork.child;

  while (child !== null) {
    subtreeFlags |= child.subtreeFlags;  // flags потомков
    subtreeFlags |= child.flags;          // flags самого child
    child = child.sibling;
  }

  completedWork.subtreeFlags |= subtreeFlags;
}
```

```
Пример дерева с subtreeFlags:

        App (flags: 0, subtreeFlags: Placement | Update)
         │
    ┌────┴────┐
    │         │
  Header    Main (flags: Update, subtreeFlags: Placement)
 (flags: 0,  │
  stFlags: 0)│
             │
           List (flags: 0, subtreeFlags: Placement)
             │
         ┌───┴───┐
         │       │
       Item1   Item3 (NEW)
    (flags: 0) (flags: Placement)
```

В commit-фазе React может **пропустить целое поддерево**, если `subtreeFlags === NoFlags` — нет смысла спускаться туда, где нет эффектов. Это значительно ускоряет commit для больших деревьев, где меняется малая часть.

---

## 12. Практический пример: путь обновления от setState до DOM

### 12.1 Полный путь обновления

Рассмотрим конкретный сценарий:

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <span>{count}</span>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  );
}
```

Пользователь нажимает кнопку. Вот полный путь обновления:

```
Шаг 1: Пользователь кликает кнопку
════════════════════════════════════════════════
• Браузер создаёт нативное событие click
• React SyntheticEvent перехватывает его (event delegation на root)
• Вызывается onClick → setCount(c => c + 1)

Шаг 2: dispatchSetState (создание Update)
════════════════════════════════════════════════
• React создаёт объект Update:
  {
    lane: DefaultLane,         // click = дискретное событие
    action: c => c + 1,        // функция обновления
    next: null                 // linked list обновлений
  }
• Update добавляется в updateQueue fiber-узла Counter
• Вызывается scheduleUpdateOnFiber(fiber, DefaultLane)

Шаг 3: ensureRootIsScheduled
════════════════════════════════════════════════
• React определяет наивысший pending lane = DefaultLane
• Маппит DefaultLane → NormalPriority (Scheduler)
• Вызывает Scheduler.scheduleCallback(NormalPriority, performConcurrentWorkOnRoot)

Шаг 4: Scheduler планирует через MessageChannel
════════════════════════════════════════════════
• Callback помещается в min-heap
• port2.postMessage(null) → макротаск в очереди браузера

Шаг 5: Render Phase — beginWork
════════════════════════════════════════════════
• workLoopConcurrent() запускается
• beginWork(HostRoot) → проверяет childLanes, спускается
• beginWork(Counter) → вызывает Counter():
  - processUpdateQueue: count = 0 + 1 = 1
  - renderWithHooks: вызов Counter(), useState возвращает 1
  - reconcileChildren: сравнивает старое и новое дерево
    - <div> → тот же type → переиспользовать
    - <span> → тот же type → проверить children
      - "0" → "1" → Update flag
    - <button> → тот же type → переиспользовать

Шаг 6: Render Phase — completeWork
════════════════════════════════════════════════
• completeWork(button) → нет изменений
• completeWork(span) → diffProperties: text "0" → "1"
  - span.flags |= Update
• completeWork(div) → нет изменений
  - div.subtreeFlags |= Update (от span)
• completeWork(Counter) → subtreeFlags пробрасываются вверх

Шаг 7: Commit Phase — Before Mutation
════════════════════════════════════════════════
• getSnapshotBeforeUpdate (для class-компонентов)
• В нашем примере — ничего

Шаг 8: Commit Phase — Mutation
════════════════════════════════════════════════
• Обход дерева, проверка subtreeFlags
• span имеет flag Update → commitUpdate:
  - spanDomNode.textContent = "1"

Шаг 9: Commit Phase — Layout
════════════════════════════════════════════════
• useLayoutEffect callbacks (если есть)
• ref callbacks (если есть)
• fiberRoot.current = finishedWork (переключение деревьев)

Шаг 10: Passive Effects
════════════════════════════════════════════════
• useEffect callbacks (запланированы, выполнятся после paint)
• Браузер рисует кадр — пользователь видит "1" вместо "0"
```

### 12.2 Визуализация потока данных

```
   setState(c => c + 1)
          │
          ▼
   ┌──────────────┐     ┌─────────────┐     ┌───────────────┐
   │  Create       │     │ Schedule     │     │  Scheduler    │
   │  Update       │────►│ Update On    │────►│  scheduleCall │
   │  {lane, action}│    │  Fiber       │     │  back()       │
   └──────────────┘     └─────────────┘     └───────┬───────┘
                                                     │
                                              MessageChannel
                                                     │
                                                     ▼
   ┌──────────────┐     ┌─────────────┐     ┌───────────────┐
   │  Commit       │     │  Complete   │     │  Begin Work   │
   │  Phase        │◄────│  Work      │◄────│  (render      │
   │  (sync)       │     │  (bubble ↑) │     │   phase)      │
   └──────┬───────┘     └─────────────┘     └───────────────┘
          │
          ▼
   ┌──────────────┐
   │  DOM Updated  │
   │  WIP → Current│
   │  Paint        │
   └──────────────┘
```

### 12.3 Пример с конкурентным прерыванием

```jsx
function App() {
  const [text, setText] = useState('');
  const [items, setItems] = useState([]);

  function handleInput(e) {
    const value = e.target.value;
    setText(value);                    // DefaultLane (срочно)

    startTransition(() => {
      setItems(generateItems(value));  // TransitionLane (не срочно)
    });
  }

  return (
    <>
      <input value={text} onChange={handleInput} />
      <HeavyList items={items} />
    </>
  );
}
```

```
Сценарий: пользователь быстро набирает "abc"

Время ──────────────────────────────────────────────────►

Ввод 'a':
├── DefaultLane: setText('a')     ── render ── commit ── paint ──►
├── TransitionLane: setItems(...)  ── render─────────┐
│                                                     │ shouldYield()
Ввод 'b':                                            │
├── DefaultLane: setText('ab')    ── render ── commit ── paint ──►
│   (прерывает transition!)                           │
├── TransitionLane: ОТБРОШЕН     ◄────────────────────┘
├── TransitionLane: setItems(...)  ── render (restart) ───────┐
│                                                              │
Ввод 'c':                                                     │
├── DefaultLane: setText('abc')   ── render ── commit ── paint ──►
├── TransitionLane: ОТБРОШЕН     ◄─────────────────────────────┘
├── TransitionLane: setItems(...)  ── render ── commit ── paint ──►
│                                    (наконец завершён)

Результат: input обновляется мгновенно, список — с задержкой,
но всегда с актуальными данными (не устаревшими).
```

---

## Итого

React Fiber — это не «оптимизация», а фундаментальная перестройка ядра React:

1. **FiberNode** заменяет рекурсивный обход на итеративный linked list, превращая каждый компонент в единицу работы.
2. **Double buffering** (current ↔ WIP) позволяет безопасно строить новое дерево, не затрагивая текущий UI.
3. **Work Loop** (`beginWork` → `completeWork`) обходит дерево предсказуемым порядком, проверяя бюджет времени через `shouldYield()`.
4. **Lanes** дают битовую маску приоритетов, позволяя обрабатывать срочные обновления (input) раньше тяжёлых (фильтрация).
5. **Scheduler** управляет порциями работы через `MessageChannel`, обеспечивая 60 fps даже при тяжёлых обновлениях.
6. **Commit phase** (Before Mutation → Mutation → Layout) — единственная синхронная часть, непосредственно изменяющая DOM.
7. **subtreeFlags** (React 18+) позволяют пропускать целые поддеревья без эффектов в commit-фазе.

Fiber — это инфраструктура, на которой построены все concurrent-фичи React: `startTransition`, `useDeferredValue`, `Suspense`, `useTransition`, Streaming SSR, Server Components, Offscreen rendering.
