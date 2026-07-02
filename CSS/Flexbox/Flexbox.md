# Flexbox — глубокое погружение

> Flexbox (Flexible Box Layout Module) — одномерная модель раскладки,
> спроектированная для распределения пространства и выравнивания элементов
> вдоль одной оси. Понимание алгоритмов `flex-grow`, `flex-shrink` и
> взаимодействия `flex-basis` с `min-width`/`max-width` критически важно
> для предсказуемого поведения flex-раскладок.

---

## Оглавление

1. [Flex Container — основа](#1-flex-container--основа)
2. [Main axis и Cross axis](#2-main-axis-и-cross-axis)
3. [flex-wrap — перенос строк](#3-flex-wrap--перенос-строк)
4. [justify-content — выравнивание по main axis](#4-justify-content--выравнивание-по-main-axis)
5. [align-items и align-self](#5-align-items-и-align-self)
6. [align-content — распределение строк](#6-align-content--распределение-строк)
7. [gap — отступы между элементами](#7-gap--отступы-между-элементами)
8. [flex-grow — алгоритм роста](#8-flex-grow--алгоритм-роста)
9. [flex-shrink — алгоритм сжатия](#9-flex-shrink--алгоритм-сжатия)
10. [flex-basis — базовый размер](#10-flex-basis--базовый-размер)
11. [flex shorthand — сокращённая запись](#11-flex-shorthand--сокращённая-запись)
12. [order — визуальный порядок](#12-order--визуальный-порядок)
13. [min-width: auto — проблема минимального размера](#13-min-width-auto--проблема-минимального-размера)
14. [Практические паттерны](#14-практические-паттерны)

---

## 1. Flex Container — основа

### 1.1 Создание flex container

Flex container создаётся через `display: flex` или `display: inline-flex`:

```css
.container {
  display: flex;           /* block-level flex container */
}

.inline-container {
  display: inline-flex;    /* inline-level flex container */
}
```

| Свойство          | Внешнее поведение     | Внутреннее поведение    |
| ----------------- | --------------------- | ----------------------- |
| `display: flex`       | Block-level (занимает всю ширину) | Flex formatting context |
| `display: inline-flex` | Inline-level (по содержимому)     | Flex formatting context |

### 1.2 Flex Formatting Context

Внутри flex container создаётся **flex formatting context**. Это означает:

- Все прямые потомки становятся **flex items** (даже inline-элементы вроде `<span>`)
- `float` на flex items **игнорируется**
- `vertical-align` на flex items **игнорируется**
- `::first-line` и `::first-letter` **не применяются** к flex container
- `margin-collapsing` между flex items **не происходит**
- Псевдоэлементы `::before` и `::after` на flex container становятся flex items

```css
.flex-container {
  display: flex;
}

/* Все эти элементы — flex items: */
.flex-container > div { }      /* block → flex item */
.flex-container > span { }     /* inline → flex item */
.flex-container > a { }        /* inline → flex item */
.flex-container::before { content: ""; }  /* flex item */
```

### 1.3 Что НЕ становится flex item

- **Абсолютно позиционированные** элементы (`position: absolute/fixed`) внутри flex
  container — это **out-of-flow flex items**. Они позиционируются относительно
  flex container (как containing block), но не участвуют во flex-раскладке.
- Текстовые узлы без обёртки становятся **anonymous flex items**:

```html
<div style="display: flex;">
  Текст без обёртки  <!-- anonymous flex item -->
  <div>Обычный item</div>
</div>
```

### 1.4 Вложенные flex containers

Flex item сам может быть flex container:

```css
.outer {
  display: flex;
}

.inner {
  display: flex;           /* flex item внешнего + flex container для своих потомков */
  flex-direction: column;
}
```

---

## 2. Main axis и Cross axis

### 2.1 Концепция осей

Flexbox оперирует двумя осями:
- **Main axis** — основная ось, вдоль которой располагаются flex items
- **Cross axis** — перпендикулярная ось

Направление осей определяется свойством `flex-direction`:

```
flex-direction: row (по умолчанию, LTR)
──────────────────────────────────────────
Main axis:   → (слева направо)
Cross axis:  ↓ (сверху вниз)

flex-direction: row-reverse (LTR)
──────────────────────────────────────────
Main axis:   ← (справа налево)
Cross axis:  ↓ (сверху вниз)

flex-direction: column
──────────────────────────────────────────
Main axis:   ↓ (сверху вниз)
Cross axis:  → (слева направо)

flex-direction: column-reverse
──────────────────────────────────────────
Main axis:   ↑ (снизу вверх)
Cross axis:  → (слева направо)
```

### 2.2 flex-direction

```css
.row         { flex-direction: row; }            /* по умолчанию */
.row-rev     { flex-direction: row-reverse; }
.col         { flex-direction: column; }
.col-rev     { flex-direction: column-reverse; }
```

| Значение          | Main axis    | Main start | Main end | Cross axis |
| ----------------- | ------------ | ---------- | -------- | ---------- |
| `row`             | Горизонталь  | Left       | Right    | Вертикаль  |
| `row-reverse`     | Горизонталь  | Right      | Left     | Вертикаль  |
| `column`          | Вертикаль    | Top        | Bottom   | Горизонталь |
| `column-reverse`  | Вертикаль    | Bottom     | Top      | Горизонталь |

### 2.3 Влияние writing-mode

В режиме `writing-mode: vertical-rl` оси `row` и `column` меняются местами:

```css
.vertical-container {
  display: flex;
  writing-mode: vertical-rl;
  flex-direction: row;
  /* Main axis теперь вертикальная! */
}
```

> **Важно**: `flex-direction: row` всегда следует inline direction текущего
> `writing-mode`, а `column` — block direction. В горизонтальных языках (LTR/RTL)
> `row` = горизонталь, `column` = вертикаль.

---

## 3. flex-wrap — перенос строк

### 3.1 Значения

```css
.nowrap       { flex-wrap: nowrap; }       /* по умолчанию — без переноса */
.wrap         { flex-wrap: wrap; }         /* перенос на новые строки */
.wrap-reverse { flex-wrap: wrap-reverse; } /* перенос в обратном направлении */
```

### 3.2 nowrap и переполнение

При `flex-wrap: nowrap` (по умолчанию) все items размещаются в одной строке.
Если суммарный размер items превышает размер container — items будут **сжаты**
(через `flex-shrink`), а если сжатие невозможно — контейнер переполнится:

```css
.container {
  display: flex;
  flex-wrap: nowrap;
  width: 300px;
}

.item {
  min-width: 150px;  /* 3 × 150 = 450 > 300 → переполнение */
  flex-shrink: 0;    /* запрет сжатия → overflow */
}
```

### 3.3 wrap и flex lines

При `flex-wrap: wrap` flex items переносятся на новые **flex lines**. Каждая flex line —
это отдельная строка flex-раскладки:

```
┌───────────────────────────────────┐
│ [Item 1] [Item 2] [Item 3]       │ ← flex line 1
│ [Item 4] [Item 5]                │ ← flex line 2
│ [Item 6]                         │ ← flex line 3
└───────────────────────────────────┘
```

> **Ключевой момент**: `flex-grow` и `flex-shrink` работают **внутри одной flex line**.
> Item на строке 2 не может занять пространство строки 1.

### 3.4 wrap-reverse

При `wrap-reverse` строки идут в обратном направлении cross axis:

```css
.container {
  display: flex;
  flex-wrap: wrap-reverse;
}
```

```
┌───────────────────────────────────┐
│ [Item 6]                         │ ← flex line 3 (визуально сверху)
│ [Item 4] [Item 5]                │ ← flex line 2
│ [Item 1] [Item 2] [Item 3]       │ ← flex line 1 (визуально снизу)
└───────────────────────────────────┘
```

### 3.5 flex-flow shorthand

```css
.container {
  flex-flow: row wrap;
  /* Эквивалент: */
  /* flex-direction: row; */
  /* flex-wrap: wrap; */
}

.column-wrap {
  flex-flow: column wrap;
}
```

---

## 4. justify-content — выравнивание по main axis

### 4.1 Значения

`justify-content` распределяет **свободное пространство** вдоль main axis:

```css
.container {
  display: flex;
  justify-content: flex-start;    /* по умолчанию */
}
```

Визуальное сравнение (flex-direction: row):

```
flex-start:
[A][B][C]

flex-end:
                         [A][B][C]

center:
            [A][B][C]

space-between:
[A]          [B]          [C]

space-around:
  [A]      [B]      [C]
 ↕    ↕  ↕    ↕  ↕    ↕
 0.5x  1x  1x  1x  1x  0.5x  ← отступы

space-evenly:
   [A]     [B]     [C]
  ↕    ↕  ↕    ↕  ↕    ↕
  1x   1x  1x  1x  1x  1x   ← все отступы равны
```

### 4.2 Алгоритм распределения

1. Вычислить суммарный размер всех flex items по main axis
2. Вычислить свободное пространство: `container_size - sum(items_size) - sum(gaps)`
3. Распределить свободное пространство по правилу выбранного значения

| Значение         | До первого | Между    | После последнего |
| ---------------- | ---------- | -------- | ---------------- |
| `flex-start`     | 0          | 0        | Всё остальное    |
| `flex-end`       | Всё остальное | 0     | 0                |
| `center`         | Половина   | 0        | Половина         |
| `space-between`  | 0          | Равные   | 0                |
| `space-around`   | x          | 2x       | x                |
| `space-evenly`   | x          | x        | x                |

### 4.3 Отрицательное свободное пространство

Если свободное пространство **отрицательное** (items шире container и не могут
сжиматься), `justify-content` ведёт себя иначе:

- `flex-start` — overflow справа
- `flex-end` — overflow слева
- `center` — overflow с обеих сторон (элементы обрезаются слева и справа)
- `space-between` — ведёт себя как `flex-start`
- `space-around` — ведёт себя как `center`
- `space-evenly` — ведёт себя как `center`

> **Gotcha**: `center` при overflow обрезает контент **слева**, что делает его
> недоступным для прокрутки. Для безопасного центрирования используйте `safe center`:

```css
.container {
  justify-content: safe center;
  /* Если overflow — ведёт себя как flex-start */
}
```

### 4.4 start / end vs flex-start / flex-end

Кроме `flex-start`/`flex-end` существуют `start`/`end`, которые учитывают
`writing-mode`, а не `flex-direction`:

```css
.container {
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-start; /* элементы справа (main-start для row-reverse) */
  justify-content: start;      /* элементы слева (start текущего writing-mode) */
}
```

---

## 5. align-items и align-self

### 5.1 align-items — выравнивание по cross axis

`align-items` задаёт выравнивание **всех** flex items по cross axis:

```css
.container {
  display: flex;
  align-items: stretch;    /* по умолчанию */
}
```

Визуальное сравнение (flex-direction: row, items разной высоты):

```
stretch (по умолчанию):
┌──────────────────────────────┐
│ ┌────┐ ┌────┐ ┌────┐        │ items растянуты на всю высоту
│ │ A  │ │ B  │ │ C  │        │ строки (если height не задан)
│ │    │ │    │ │    │        │
│ └────┘ └────┘ └────┘        │
└──────────────────────────────┘

flex-start:
┌──────────────────────────────┐
│ ┌──┐ ┌────┐ ┌─┐             │
│ │A │ │ B  │ │C│             │
│ └──┘ │    │ └─┘             │
│      └────┘                 │
└──────────────────────────────┘

flex-end:
┌──────────────────────────────┐
│      ┌────┐                 │
│ ┌──┐ │ B  │ ┌─┐             │
│ │A │ │    │ │C│             │
│ └──┘ └────┘ └─┘             │
└──────────────────────────────┘

center:
┌──────────────────────────────┐
│      ┌────┐                 │
│ ┌──┐ │ B  │ ┌─┐             │
│ │A │ │    │ │C│             │
│ └──┘ └────┘ └─┘             │
└──────────────────────────────┘

baseline:
┌──────────────────────────────┐
│ ┌──────┐ ┌──┐               │
│ │ A    │ │B │ ┌──┐          │ baseline текста выровнен
│ │ text │ └──┘ │C │          │
│ └──────┘      └──┘          │
└──────────────────────────────┘
```

### 5.2 stretch и auto height

`align-items: stretch` работает только если у flex item **не задана** явная высота
(при `flex-direction: row`) или ширина (при `flex-direction: column`):

```css
.container {
  display: flex;
  align-items: stretch;
  height: 200px;
}

.item-a {
  /* height не задана → растянется на 200px */
}

.item-b {
  height: 100px; /* stretch игнорируется, height = 100px */
}
```

### 5.3 align-self — индивидуальное выравнивание

`align-self` позволяет переопределить `align-items` для конкретного flex item:

```css
.container {
  display: flex;
  align-items: center;
}

.special-item {
  align-self: flex-end; /* только этот элемент внизу */
}

.auto-item {
  align-self: auto; /* наследует значение align-items контейнера */
}
```

Возможные значения: `auto`, `flex-start`, `flex-end`, `center`, `baseline`, `stretch`.

### 5.4 baseline alignment

При `align-items: baseline` элементы выравниваются по **базовой линии** их текста:

```css
.container {
  display: flex;
  align-items: baseline;
}

.large-text {
  font-size: 32px; /* базовая линия выше */
}

.small-text {
  font-size: 14px; /* базовая линия ниже */
}
/* Тексты выровнены по одной линии */
```

Для multi-line flex containers есть `first baseline` и `last baseline`:

```css
.container {
  align-items: first baseline; /* по первой строке текста */
  align-items: last baseline;  /* по последней строке текста */
}
```

---

## 6. align-content — распределение строк

### 6.1 Работает только при wrap

`align-content` распределяет **flex lines** по cross axis. Работает **только** когда
есть несколько flex lines (т.е. `flex-wrap: wrap` или `wrap-reverse`):

```css
.container {
  display: flex;
  flex-wrap: wrap;
  height: 400px;
  align-content: flex-start; /* все строки прижаты к верху */
}
```

### 6.2 Значения

| Значение         | Описание                                               |
| ---------------- | ------------------------------------------------------ |
| `stretch`        | Строки растягиваются, занимая всё пространство (по умолчанию) |
| `flex-start`     | Строки прижаты к cross-start                           |
| `flex-end`       | Строки прижаты к cross-end                             |
| `center`         | Строки по центру cross axis                            |
| `space-between`  | Равные промежутки между строками                       |
| `space-around`   | Равные промежутки вокруг каждой строки                  |
| `space-evenly`   | Равные промежутки между и по краям                      |

### 6.3 align-content vs align-items

Это один из самых частых источников путаницы:

| Свойство         | Что выравнивает        | Когда работает           |
| ---------------- | ---------------------- | ------------------------ |
| `align-items`    | Items внутри flex line | Всегда                   |
| `align-content`  | Flex lines внутри container | Только при `flex-wrap: wrap` с несколькими строками |

```css
.container {
  display: flex;
  flex-wrap: wrap;
  height: 500px;
  align-content: center;  /* строки по центру */
  align-items: flex-start; /* items внутри строк прижаты к верху */
}
```

```
Без align-content (stretch по умолчанию):
┌──────────────────────────────┐
│ [A] [B] [C]                 │ ← line 1 занимает 250px
│                              │
│ [D] [E]                     │ ← line 2 занимает 250px
│                              │
└──────────────────────────────┘

С align-content: center:
┌──────────────────────────────┐
│                              │
│ [A] [B] [C]                 │ ← line 1 (auto height)
│ [D] [E]                     │ ← line 2 (auto height)
│                              │
└──────────────────────────────┘
```

### 6.4 align-content: normal

Значение `normal` (новое) ведёт себя как `stretch` для flex containers:

```css
.container {
  align-content: normal; /* = stretch для flex */
}
```

---

## 7. gap — отступы между элементами

### 7.1 Синтаксис

```css
.container {
  display: flex;
  gap: 20px;                /* row-gap: 20px, column-gap: 20px */
  gap: 20px 10px;           /* row-gap: 20px, column-gap: 10px */
  row-gap: 20px;            /* только между строками */
  column-gap: 10px;         /* только между колонками */
}
```

### 7.2 gap vs margin

| Характеристика    | `gap`                         | `margin`                    |
| ----------------- | ----------------------------- | --------------------------- |
| Где применяется   | На container                  | На каждом item              |
| Внешние отступы   | Нет (только между items)      | Есть (и по краям)           |
| Collapsing        | Не бывает                     | Есть (в normal flow)        |
| Отрицательные     | Нет                           | Да                          |
| Специфичность     | Проще — одно объявление       | Нужно на каждом item + убрать лишние |

```css
/* С margin — нужно убрать лишние отступы */
.container {
  display: flex;
  flex-wrap: wrap;
  margin: -10px; /* компенсация */
}
.item {
  margin: 10px;
}

/* С gap — просто */
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
```

### 7.3 gap и justify-content

`gap` учитывается при расчёте `justify-content`. Свободное пространство вычисляется
как `container_size - sum(items) - sum(gaps)`:

```css
.container {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  /* gaps добавляются МЕЖДУ items, space-between распределяет ОСТАВШЕЕСЯ пространство */
}
```

> **Важно**: при `space-between` gaps **суммируются** с пространством, которое
> `space-between` уже распределяет. Это может привести к бОльшим отступам, чем ожидалось.
> В таких случаях обычно достаточно только `gap` с `flex-start`.

### 7.4 Процентные gap

```css
.container {
  display: flex;
  gap: 5%; /* 5% от ширины container (inline size) */
}
```

Процентные `gap` вычисляются от размера flex container по соответствующей оси.
Поведение при `flex-direction: column` с процентными gap может быть непредсказуемым,
если высота container не задана явно.

---

## 8. flex-grow — алгоритм роста

### 8.1 Базовое поведение

`flex-grow` определяет, какую долю **свободного пространства** получает flex item:

```css
.item {
  flex-grow: 0; /* по умолчанию — не растёт */
}

.growing-item {
  flex-grow: 1; /* получает долю свободного пространства */
}
```

### 8.2 Формула распределения

```
Свободное пространство = Container size - Сумма(flex-basis всех items) - Сумма(gaps)

Доля item = (flex-grow item) / Сумма(flex-grow всех items)

Добавленный размер item = Свободное пространство × Доля item

Итоговый размер item = flex-basis + Добавленный размер
```

### 8.3 Пример с числами

```css
.container {
  display: flex;
  width: 600px;
}

.item-a { flex-basis: 100px; flex-grow: 1; }
.item-b { flex-basis: 150px; flex-grow: 2; }
.item-c { flex-basis: 50px;  flex-grow: 1; }
```

Расчёт:
```
Свободное пространство = 600 - (100 + 150 + 50) = 300px
Сумма flex-grow = 1 + 2 + 1 = 4

Item A: 100 + 300 × (1/4) = 100 + 75 = 175px
Item B: 150 + 300 × (2/4) = 150 + 150 = 300px
Item C:  50 + 300 × (1/4) =  50 + 75 = 125px

Проверка: 175 + 300 + 125 = 600px ✓
```

### 8.4 flex-grow и max-width

Если item достигает `max-width`, он перестаёт расти. Оставшееся пространство
перераспределяется между другими items. Алгоритм выполняется **итеративно**:

```css
.container { display: flex; width: 600px; }
.item-a { flex-basis: 100px; flex-grow: 1; max-width: 150px; }
.item-b { flex-basis: 100px; flex-grow: 1; }
.item-c { flex-basis: 100px; flex-grow: 1; }
```

```
Итерация 1:
  Свободное = 600 - 300 = 300px
  Каждый получает 100px (300/3)
  Item A: 100 + 100 = 200px → превышает max-width (150px) → фиксируется на 150px

Итерация 2:
  Свободное = 600 - 150 - 100 - 100 = 250px
  Распределяется между B и C: по 125px
  Item B: 100 + 125 = 225px
  Item C: 100 + 125 = 225px

Итог: 150 + 225 + 225 = 600px ✓
```

### 8.5 flex-grow: дробные значения

`flex-grow` принимает дробные значения:

```css
.item-a { flex-grow: 0.5; }
.item-b { flex-grow: 1.5; }
/* Сумма = 2, доли: 0.25 и 0.75 */
```

### 8.6 flex-grow и переполнение

`flex-grow` никогда не приводит к отрицательным размерам. Если свободное пространство
отрицательное (items больше container), `flex-grow` не применяется — вместо этого
работает `flex-shrink`.

---

## 9. flex-shrink — алгоритм сжатия

### 9.1 Базовое поведение

`flex-shrink` определяет, как item **уменьшается**, когда суммарный размер items
превышает размер container:

```css
.item {
  flex-shrink: 1; /* по умолчанию — сжимается */
}

.no-shrink {
  flex-shrink: 0; /* не сжимается */
}
```

### 9.2 Формула сжатия — отличие от flex-grow

> **Критически важно**: алгоритм сжатия отличается от роста. При сжатии учитывается
> не только `flex-shrink`, но и `flex-basis` (или размер) каждого item. Это сделано
> для того, чтобы маленькие элементы не сжимались до нуля.

```
Дефицит = Сумма(flex-basis всех items) + Сумма(gaps) - Container size

Scaled shrink factor item = flex-shrink × flex-basis

Доля сжатия item = Scaled shrink factor item / Сумма(scaled shrink factors всех items)

Уменьшение item = Дефицит × Доля сжатия item

Итоговый размер item = flex-basis - Уменьшение item
```

### 9.3 Пример с числами

```css
.container {
  display: flex;
  width: 400px;
}

.item-a { flex-basis: 200px; flex-shrink: 1; }
.item-b { flex-basis: 300px; flex-shrink: 2; }
```

Расчёт:
```
Дефицит = (200 + 300) - 400 = 100px

Scaled shrink factors:
  A: 1 × 200 = 200
  B: 2 × 300 = 600
  Сумма = 800

Уменьшение:
  A: 100 × (200/800) = 25px
  B: 100 × (600/800) = 75px

Итоговые размеры:
  A: 200 - 25 = 175px
  B: 300 - 75 = 225px

Проверка: 175 + 225 = 400px ✓
```

> **Обратите внимание**: несмотря на то что `flex-shrink` у B в 2 раза больше,
> сжатие B (75px) в 3 раза больше сжатия A (25px). Это потому что учитывается
> произведение `flex-shrink × flex-basis`.

### 9.4 flex-shrink: 0 — запрет сжатия

```css
.fixed-sidebar {
  flex-shrink: 0;
  width: 250px; /* гарантированно не сожмётся */
}

.flexible-content {
  flex-shrink: 1;
  flex-grow: 1;
}
```

### 9.5 min-width ограничивает сжатие

Flex item не может сжаться меньше `min-width` (для row) или `min-height` (для column).
По умолчанию `min-width: auto` для flex items, что означает `min-content` — минимальный
размер, при котором контент не обрезается (подробнее в секции 13).

```css
.item {
  flex-basis: 300px;
  flex-shrink: 1;
  min-width: 150px; /* не сожмётся меньше 150px */
}
```

---

## 10. flex-basis — базовый размер

### 10.1 Что такое flex-basis

`flex-basis` определяет **начальный размер** flex item вдоль main axis **до** применения
`flex-grow` и `flex-shrink`. Это отправная точка для алгоритмов роста/сжатия.

```css
.item {
  flex-basis: 200px;  /* начальный размер 200px */
}
```

### 10.2 flex-basis vs width/height

| Характеристика     | `flex-basis`                          | `width`/`height`              |
| ------------------- | ------------------------------------- | ----------------------------- |
| Работает на         | Main axis (зависит от flex-direction)  | Всегда ширина / высота       |
| Приоритет           | Выше `width`/`height`                 | Ниже `flex-basis`             |
| Значение `auto`     | Берёт `width`/`height`               | Автоматический размер         |
| Значение `content`  | По содержимому (игнорирует width)     | —                             |

```css
.item {
  width: 200px;
  flex-basis: 300px;
  /* В flex-direction: row → item будет 300px (flex-basis побеждает) */
  /* В flex-direction: column → width = 200px, height = 300px (flex-basis = main axis) */
}
```

### 10.3 Порядок определения размера (resolving)

Алгоритм определения начального размера flex item:

```
1. flex-basis задан (не auto)?
   → Да: используем flex-basis
   → Нет (auto): переходим к шагу 2

2. width/height задан (зависит от flex-direction)?
   → Да: используем width/height
   → Нет: переходим к шагу 3

3. Размер по содержимому (content size)
```

```css
/* flex-basis: auto → берёт width → 200px */
.item-1 {
  flex-basis: auto;
  width: 200px;
}

/* flex-basis: auto → width не задана → по содержимому */
.item-2 {
  flex-basis: auto;
}

/* flex-basis: 300px → 300px (width игнорируется) */
.item-3 {
  flex-basis: 300px;
  width: 200px;
}

/* flex-basis: 0 → начальный размер 0, всё пространство через flex-grow */
.item-4 {
  flex-basis: 0;
  flex-grow: 1;
}
```

### 10.4 flex-basis: 0 vs flex-basis: auto

Это фундаментальное различие:

```css
.container { display: flex; width: 600px; }

/* flex-basis: auto — grow распределяет ОСТАТОК */
.item-auto-a { flex: 1 1 auto; width: 100px; } /* 100 + доля остатка */
.item-auto-b { flex: 1 1 auto; width: 200px; } /* 200 + доля остатка */

/* flex-basis: 0 — grow распределяет ВСЁ пространство */
.item-zero-a { flex: 1 1 0; } /* 600/2 = 300px */
.item-zero-b { flex: 1 1 0; } /* 600/2 = 300px */
```

```
С flex-basis: auto (width: 100px и 200px, flex-grow: 1):
  Остаток = 600 - 100 - 200 = 300px
  A: 100 + 150 = 250px
  B: 200 + 150 = 350px

С flex-basis: 0 (flex-grow: 1):
  "Остаток" = 600 - 0 - 0 = 600px
  A: 0 + 300 = 300px
  B: 0 + 300 = 300px
```

### 10.5 flex-basis и min/max constraints

`min-width`/`max-width` (или `min-height`/`max-height` для column) ограничивают
**итоговый** размер, но **не** flex-basis:

```css
.item {
  flex-basis: 500px;
  max-width: 300px;
  /* flex-basis = 500px для расчёта, но итоговый размер ≤ 300px */
}
```

### 10.6 flex-basis: content

Значение `content` заставляет flex-basis равняться размеру содержимого,
**игнорируя** `width`/`height`:

```css
.item {
  flex-basis: content;
  width: 500px; /* игнорируется */
  /* Размер определяется содержимым */
}
```

> **Поддержка**: `flex-basis: content` поддерживается во всех современных браузерах,
> но в старых может потребоваться fallback через `flex-basis: auto` без `width`.

### 10.7 Процентные flex-basis

```css
.item {
  flex-basis: 50%; /* 50% от main size контейнера */
}
```

Если main size контейнера не определён (например, `flex-direction: column` без
явной высоты), процентные `flex-basis` вычисляются как `auto` (по содержимому).

---

## 11. flex shorthand — сокращённая запись

### 11.1 Синтаксис

```css
.item {
  flex: <flex-grow> <flex-shrink> <flex-basis>;
}
```

### 11.2 Распространённые значения

| Shorthand          | Эквивалент                    | Описание                                 |
| ------------------ | ----------------------------- | ---------------------------------------- |
| `flex: initial`    | `flex: 0 1 auto`             | По умолчанию. Не растёт, сжимается, размер по содержимому |
| `flex: auto`       | `flex: 1 1 auto`             | Растёт и сжимается, базис по содержимому |
| `flex: none`       | `flex: 0 0 auto`             | Не растёт и не сжимается (жёсткий размер) |
| `flex: 1`          | `flex: 1 1 0`                | Растёт и сжимается, базис = 0            |
| `flex: 2`          | `flex: 2 1 0`                | Растёт с весом 2, базис = 0              |
| `flex: 0 0 200px`  | —                             | Фиксированный размер 200px              |
| `flex: 1 0 200px`  | —                             | Минимум 200px, растёт                    |

### 11.3 flex: 1 vs flex: auto

Это самое важное различие в shorthand:

```css
/* flex: 1 → flex: 1 1 0 → flex-basis: 0 */
/* ВСЁ пространство делится поровну */
.equal-size {
  flex: 1;
}

/* flex: auto → flex: 1 1 auto → flex-basis: auto */
/* Сначала каждый item получает свой размер, потом ОСТАТОК делится */
.proportional {
  flex: auto;
}
```

```html
<div style="display: flex; width: 600px;">
  <div style="flex: 1;">Short</div>
  <div style="flex: 1;">Much longer content here</div>
</div>
<!-- Оба item ≈ 300px (flex-basis: 0, пространство делится поровну) -->

<div style="display: flex; width: 600px;">
  <div style="flex: auto;">Short</div>
  <div style="flex: auto;">Much longer content here</div>
</div>
<!-- Второй item шире (flex-basis: auto, учитывает размер контента) -->
```

### 11.4 Gotcha: flex shorthand сбрасывает значения

> **Важно**: `flex` shorthand **сбрасывает** не указанные значения:

```css
/* Если указать только flex-grow: */
.item {
  flex: 2;
  /* Эквивалентно: flex: 2 1 0 */
  /* flex-basis сброшен в 0, а не auto! */
}

/* Сравните с отдельным свойством: */
.item {
  flex-grow: 2;
  /* flex-shrink остаётся 1 (по умолчанию) */
  /* flex-basis остаётся auto (по умолчанию) */
}
```

Именно поэтому `flex: 1` (= `flex: 1 1 0`) ведёт себя иначе, чем `flex-grow: 1`
(при `flex-basis: auto`).

### 11.5 Рекомендация по использованию

Спецификация рекомендует **всегда** использовать shorthand `flex`, а не отдельные
свойства, потому что shorthand корректно сбрасывает все три компонента:

```css
/* Рекомендуется */
.item { flex: 1 0 200px; }

/* Не рекомендуется (неочевидное взаимодействие) */
.item {
  flex-grow: 1;
  flex-shrink: 0;
  flex-basis: 200px;
}
```

---

## 12. order — визуальный порядок

### 12.1 Базовое использование

`order` изменяет **визуальный** порядок flex items без изменения DOM:

```css
.item {
  order: 0; /* по умолчанию */
}

.first-visually {
  order: -1; /* визуально первый */
}

.last-visually {
  order: 1; /* визуально последний */
}
```

### 12.2 Алгоритм сортировки

Items сортируются по возрастанию `order`. При одинаковом `order` — по порядку в DOM:

```html
<div style="display: flex;">
  <div style="order: 2;">A (DOM: 1)</div>
  <div style="order: 1;">B (DOM: 2)</div>
  <div style="order: 1;">C (DOM: 3)</div>
  <div style="order: 0;">D (DOM: 4)</div>
</div>
<!-- Визуальный порядок: D, B, C, A -->
```

### 12.3 Accessibility concerns

> **Критически важно**: `order` изменяет только **визуальный** порядок. Tab-порядок
> и порядок чтения скринридером остаются **по DOM**. Это создаёт несоответствие
> между визуальным и логическим порядком, что является проблемой доступности.

```css
/* Анти-паттерн — визуальный порядок не совпадает с tab-порядком */
.nav-item-1 { order: 3; }
.nav-item-2 { order: 1; }
.nav-item-3 { order: 2; }
/* Пользователь tab'ом пройдёт 1 → 2 → 3, но видит 2 → 3 → 1 */
```

WCAG 2.1, критерий 1.3.2: «Когда последовательность, в которой представлено
содержимое, влияет на его значение, правильная последовательность чтения может
быть определена программно». Нарушение `order` может привести к несоответствию
этому критерию.

**Когда `order` допустим**:
- Перестановка визуально декоративных элементов
- Незначительная перестановка (например, иконка до/после текста)
- Если одновременно обновляется `tabindex` (хотя это увеличивает сложность)

### 12.4 order и flex-direction: row-reverse

`order` применяется **после** `flex-direction`. Т.е. при `row-reverse` items сначала
разворачиваются, а потом сортируются по `order`:

```css
.container {
  display: flex;
  flex-direction: row-reverse;
}

.item-a { order: 0; } /* визуально последний (справа) */
.item-b { order: 0; } /* визуально в середине */
.item-c { order: 0; } /* визуально первый (слева) */
/* row-reverse: C, B, A (обратный DOM-порядок) */

.item-a { order: -1; } /* теперь первый в обратном порядке → крайний правый */
```

---

## 13. min-width: auto — проблема минимального размера

### 13.1 Суть проблемы

По спецификации, `min-width` (для row) и `min-height` (для column) flex items
по умолчанию равны `auto`. Для flex items `auto` означает `min-content` —
**минимальный размер, при котором контент не переполняется**.

Это значит, что flex item **не может сжаться меньше** своего контента:

```css
.container {
  display: flex;
  width: 300px;
}

.item {
  flex: 1 1 0;
  /* Даже с flex-shrink: 1, item не сожмётся меньше min-content */
}
```

### 13.2 Типичные проблемы

**Длинное слово или URL**:

```html
<div style="display: flex; width: 200px;">
  <div style="flex: 1;">
    superlongwordwithoutanybreaks
  </div>
  <div style="flex: 1;">
    Normal text
  </div>
</div>
<!-- Первый item выходит за container! -->
```

**Изображение**:

```html
<div style="display: flex; width: 300px;">
  <div style="flex: 1;">
    <img src="large.jpg" width="500">
    <!-- Flex item не сожмётся меньше 500px! -->
  </div>
</div>
```

**Таблица или pre**:

```html
<div style="display: flex;">
  <div style="flex: 1;">
    <table style="width: 800px;">...</table>
    <!-- Flex item минимум 800px -->
  </div>
</div>
```

### 13.3 Решения

**1. min-width: 0**:

```css
.item {
  flex: 1;
  min-width: 0; /* Разрешить сжатие до 0 */
}
```

**2. overflow: hidden/auto**:

```css
.item {
  flex: 1;
  overflow: hidden; /* Тоже устанавливает min-width: 0 по факту */
}
```

> **Объяснение**: спецификация говорит, что `min-width: auto` для flex items
> вычисляется как `min(min-content, flex-basis)`, но **только если overflow: visible**.
> При `overflow: hidden/auto/scroll` min-width: auto = 0.

**3. word-break для текста**:

```css
.item {
  flex: 1;
  min-width: 0;
  word-break: break-word; /* или overflow-wrap: break-word */
}
```

**4. Для изображений**:

```css
.item img {
  max-width: 100%;
  height: auto;
}

.item {
  min-width: 0;
}
```

### 13.4 Вложенные flex containers

Проблема усугубляется при вложенности:

```html
<div class="outer" style="display: flex;">
  <div class="inner" style="display: flex; flex: 1;">
    <div class="content" style="flex: 1;">
      Long unbreakable content...
    </div>
  </div>
</div>
```

```css
/* Нужно min-width: 0 на КАЖДОМ уровне вложенности! */
.inner {
  min-width: 0;
}
.content {
  min-width: 0;
}
```

### 13.5 min-height: auto для column

То же самое для `flex-direction: column` — `min-height: auto` предотвращает
сжатие по высоте:

```css
.container {
  display: flex;
  flex-direction: column;
  height: 300px;
}

.item {
  flex: 1;
  min-height: 0; /* Разрешить сжатие по высоте */
  overflow-y: auto;
}
```

---

## 14. Практические паттерны

### 14.1 Holy Grail Layout

Классическая трёхколоночная раскладка с header и footer:

```css
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  flex-shrink: 0;
}

.main {
  display: flex;
  flex: 1;
}

.sidebar-left {
  flex: 0 0 200px; /* фиксированная ширина */
  order: -1;       /* визуально слева, в DOM после content */
}

.content {
  flex: 1;
  min-width: 0; /* предотвращаем overflow */
}

.sidebar-right {
  flex: 0 0 200px;
}

.footer {
  flex-shrink: 0;
}
```

```html
<div class="page">
  <header class="header">Header</header>
  <div class="main">
    <main class="content">Content</main>
    <aside class="sidebar-left">Left</aside>
    <aside class="sidebar-right">Right</aside>
  </div>
  <footer class="footer">Footer</footer>
</div>
```

### 14.2 Card Layout

```css
.card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.card {
  flex: 1 1 300px; /* минимум 300px, растёт равномерно */
  max-width: 400px;
  display: flex;
  flex-direction: column;
}

.card__content {
  flex: 1; /* занимает оставшееся пространство */
}

.card__footer {
  flex-shrink: 0; /* footer всегда внизу */
  margin-top: auto; /* альтернатива: push to bottom */
}
```

### 14.3 Navigation bar

```css
.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  height: 56px;
}

.nav__logo {
  flex-shrink: 0;
  margin-right: auto; /* отталкивает остальные items вправо */
}

.nav__links {
  display: flex;
  gap: 4px;
}

.nav__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
```

### 14.4 Centering — все способы

```css
/* 1. justify-content + align-items */
.center-1 {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 2. margin: auto на item */
.center-2 {
  display: flex;
}
.center-2 > .item {
  margin: auto;
}

/* 3. place-content (shorthand для align-content + justify-content) */
.center-3 {
  display: flex;
  flex-wrap: wrap;
  place-content: center;
}
```

> **margin: auto в flex** — ведёт себя иначе, чем в block layout. В flex `margin: auto`
> поглощает **всё доступное пространство** по обеим осям. Это делает его мощным
> инструментом для центрирования и spacing.

### 14.5 Sticky footer

Footer прижат к низу, даже если контента мало:

```css
body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  margin: 0;
}

main {
  flex: 1;
}

footer {
  flex-shrink: 0;
}
```

```html
<body>
  <header>Header</header>
  <main>Content (может быть мало)</main>
  <footer>Footer (всегда внизу)</footer>
</body>
```

### 14.6 Input group

```css
.input-group {
  display: flex;
}

.input-group__prefix,
.input-group__suffix {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: #f0f0f0;
  border: 1px solid #ccc;
}

.input-group__input {
  flex: 1;
  min-width: 0; /* предотвращаем overflow */
  border: 1px solid #ccc;
  padding: 8px 12px;
}
```

### 14.7 Media object (avatar + content)

```css
.media {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.media__avatar {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.media__body {
  flex: 1;
  min-width: 0;
}
```

### 14.8 Truncation в flex items

```css
.list-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.list-item__text {
  flex: 1;
  min-width: 0;           /* обязательно для truncation */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-item__actions {
  flex-shrink: 0;
}
```

### 14.9 Equal-height columns без stretch

```css
.columns {
  display: flex;
  gap: 20px;
}

.column {
  flex: 1;
  /* align-items: stretch по умолчанию — все колонки одной высоты */
  display: flex;
  flex-direction: column;
}

.column__content {
  flex: 1; /* занимает оставшееся пространство */
}

.column__footer {
  margin-top: auto; /* прижат к низу */
}
```

### 14.10 Responsive без media queries

```css
.responsive-flex {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.responsive-flex > * {
  flex: 1 1 250px;
  /* Минимум 250px, растёт равномерно, переносится при нехватке места */
}
```

### 14.11 Сводная таблица свойств flex container

| Свойство            | Значения                                                    | По умолчанию |
| ------------------- | ----------------------------------------------------------- | ------------ |
| `display`           | `flex`, `inline-flex`                                       | —            |
| `flex-direction`    | `row`, `row-reverse`, `column`, `column-reverse`            | `row`        |
| `flex-wrap`         | `nowrap`, `wrap`, `wrap-reverse`                            | `nowrap`     |
| `flex-flow`         | `<direction> <wrap>`                                        | `row nowrap` |
| `justify-content`   | `flex-start`, `flex-end`, `center`, `space-between`, `space-around`, `space-evenly` | `flex-start` |
| `align-items`       | `stretch`, `flex-start`, `flex-end`, `center`, `baseline`   | `stretch`    |
| `align-content`     | `stretch`, `flex-start`, `flex-end`, `center`, `space-between`, `space-around`, `space-evenly` | `stretch` |
| `gap`               | `<row-gap> <column-gap>`                                    | `0`          |

### 14.12 Сводная таблица свойств flex item

| Свойство       | Значения                                              | По умолчанию |
| -------------- | ----------------------------------------------------- | ------------ |
| `flex-grow`    | `<number>` (≥ 0)                                     | `0`          |
| `flex-shrink`  | `<number>` (≥ 0)                                     | `1`          |
| `flex-basis`   | `auto`, `content`, `<length>`, `<percentage>`, `0`   | `auto`       |
| `flex`         | `<grow> <shrink> <basis>`                             | `0 1 auto`   |
| `align-self`   | `auto`, `flex-start`, `flex-end`, `center`, `baseline`, `stretch` | `auto` |
| `order`        | `<integer>`                                           | `0`          |

---

> **Итог**: Flexbox — мощная и интуитивная система для одномерных раскладок.
> Ключ к её освоению — понимание алгоритмов `flex-grow`/`flex-shrink`,
> разницы между `flex-basis: 0` и `auto`, и проблемы `min-width: auto`.
> Для двумерных раскладок используйте CSS Grid.
