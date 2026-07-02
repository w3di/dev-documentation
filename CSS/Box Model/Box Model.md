# Box Model — глубокое погружение

## Содержание

1. [Box Model — content, padding, border, margin](#1-box-model--content-padding-border-margin)
2. [Content categories — block-level vs inline-level](#2-content-categories--block-level-vs-inline-level)
3. [Margin collapse](#3-margin-collapse)
4. [Box-sizing](#4-box-sizing)
5. [Inline formatting](#5-inline-formatting)
6. [Block Formatting Context (BFC)](#6-block-formatting-context-bfc)
7. [Visual Formatting Model](#7-visual-formatting-model)
8. [Outline vs Border](#8-outline-vs-border)
9. [Box-shadow](#9-box-shadow)
10. [Box-decoration-break](#10-box-decoration-break)
11. [Logical Properties](#11-logical-properties)

---

## 1. Box Model — content, padding, border, margin

### 1.1 Четыре области box model

Каждый элемент в CSS генерирует прямоугольный **бокс (box)**, состоящий из четырёх вложенных областей:

```
┌─────────────────────────────────────┐
│              margin                 │
│  ┌───────────────────────────────┐  │
│  │           border              │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │        padding          │  │  │
│  │  │  ┌───────────────────┐  │  │  │
│  │  │  │     content       │  │  │  │
│  │  │  │                   │  │  │  │
│  │  │  └───────────────────┘  │  │  │
│  │  └─────────────────────────┘  │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

| Область | Описание | Свойства |
|---------|----------|----------|
| **Content** | Содержимое элемента (текст, изображения, дочерние элементы) | `width`, `height`, `min-width`, `max-width`, `min-height`, `max-height` |
| **Padding** | Внутренний отступ между content и border | `padding-top`, `padding-right`, `padding-bottom`, `padding-left` |
| **Border** | Рамка вокруг padding | `border-width`, `border-style`, `border-color` |
| **Margin** | Внешний отступ от border до соседних элементов | `margin-top`, `margin-right`, `margin-bottom`, `margin-left` |

### 1.2 Свойства content area

```css
.element {
  /* Фиксированные размеры */
  width: 300px;
  height: 200px;

  /* Ограничения */
  min-width: 200px;
  max-width: 100%;
  min-height: 100px;
  max-height: 500px;

  /* Авто-размеры */
  width: auto;     /* Для block: заполняет родителя. Для inline: по контенту */
  height: auto;    /* По высоте контента */

  /* Современные значения */
  width: fit-content;    /* min(max-content, max(min-content, fill-available)) */
  width: min-content;    /* Минимальная ширина без переполнения */
  width: max-content;    /* Ширина по самой длинной строке */
  width: fit-content(300px); /* min(max-content, max(min-content, 300px)) */
}
```

**Разница между `min-content`, `max-content` и `fit-content`:**

```css
/* Текст: "Hello World, this is a long sentence" */

.min-content {
  width: min-content;
  /* Ширина = ширина самого длинного слова ("sentence") */
  /* Текст переносится по каждому слову */
}

.max-content {
  width: max-content;
  /* Ширина = ширина всего текста в одну строку */
  /* Текст не переносится */
}

.fit-content {
  width: fit-content;
  /* Если контейнер шире max-content → max-content */
  /* Если контейнер уже max-content → занимает доступную ширину, с переносами */
  /* Но не уже min-content */
}
```

### 1.3 Padding

```css
.element {
  /* Longhand */
  padding-top: 10px;
  padding-right: 20px;
  padding-bottom: 10px;
  padding-left: 20px;

  /* Shorthand — по часовой стрелке (top right bottom left) */
  padding: 10px 20px 10px 20px;

  /* 3 значения: top, right/left, bottom */
  padding: 10px 20px 30px;

  /* 2 значения: top/bottom, right/left */
  padding: 10px 20px;

  /* 1 значение: все стороны */
  padding: 10px;
}
```

> **Важно:** Padding не может быть отрицательным. `padding: -10px` — невалидное значение. Проценты в padding вычисляются относительно **ширины** содержащего блока (даже для `padding-top` и `padding-bottom`!).

```css
/* Хак для соотношения сторон (до появления aspect-ratio) */
.aspect-ratio-16-9 {
  position: relative;
  padding-bottom: 56.25%; /* 9/16 * 100% */
  height: 0;
}
.aspect-ratio-16-9 > * {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
}

/* Современное решение */
.aspect-ratio-modern {
  aspect-ratio: 16 / 9;
}
```

### 1.4 Border

```css
.element {
  /* Shorthand */
  border: 1px solid #ccc;

  /* По сторонам */
  border-top: 2px dashed red;
  border-right: none;
  border-bottom: 3px double blue;
  border-left: 1px dotted green;

  /* По компонентам */
  border-width: 1px 2px 3px 4px;
  border-style: solid dashed dotted double;
  border-color: red green blue orange;

  /* Border-radius */
  border-radius: 8px;
  border-radius: 8px 16px;             /* top-left/bottom-right, top-right/bottom-left */
  border-radius: 50%;                   /* Круг (если элемент квадратный) */
  border-radius: 10px 20px 30px 40px;  /* Каждый угол */

  /* Эллиптические углы */
  border-radius: 10px / 20px;          /* Горизонтальный / вертикальный радиус */
  border-radius: 10px 20px 30px 40px / 15px 25px 35px 45px;

  /* Border-image */
  border-image: url(border.png) 30 round;
  border-image-source: url(border.png);
  border-image-slice: 30;
  border-image-width: 30px;
  border-image-outset: 0;
  border-image-repeat: round;
}
```

**Стили border-style:**

| Значение | Описание |
|----------|----------|
| `none` | Нет рамки (граница не занимает места) |
| `hidden` | Как none, но побеждает в конфликтах таблиц |
| `solid` | Сплошная линия |
| `dashed` | Штриховая линия |
| `dotted` | Точечная линия |
| `double` | Двойная линия |
| `groove` | Вдавленная рамка (3D-эффект) |
| `ridge` | Выпуклая рамка (3D-эффект) |
| `inset` | Элемент выглядит вдавленным |
| `outset` | Элемент выглядит выпуклым |

### 1.5 Margin

```css
.element {
  /* Shorthand */
  margin: 10px 20px;

  /* Авто-центрирование по горизонтали */
  margin: 0 auto;

  /* Отрицательные margin (допустимы!) */
  margin-top: -20px;    /* Элемент «поднимается» вверх */
  margin-left: -10px;   /* Элемент сдвигается влево */

  /* Margin auto в flex/grid */
  margin-left: auto;    /* «Толкает» элемент вправо */
  margin: auto;         /* Центрирует во flex/grid контейнере */
}
```

> **Margin и проценты:** Как и padding, процентные значения margin вычисляются относительно **ширины** содержащего блока. Это касается и `margin-top`/`margin-bottom`.

---

## 2. Content categories — block-level vs inline-level

### 2.1 Block-level boxes

Элементы с `display: block` (или подобным) генерируют **block-level box**:

```css
/* Block-level по умолчанию */
div, p, h1-h6, ul, ol, li, table, section, article, header, footer, main, nav, aside, form, fieldset, figure, figcaption, blockquote, pre, hr, address, details, dialog
```

**Характеристики:**
- Занимает всю доступную ширину родителя
- Начинается с новой строки
- Свойства `width` и `height` применяются
- Горизонтальные и вертикальные margin/padding работают полностью
- Участвует в Block Formatting Context (BFC)

### 2.2 Inline-level boxes

Элементы с `display: inline` генерируют **inline-level box**:

```css
/* Inline по умолчанию */
span, a, strong, em, b, i, code, abbr, cite, small, sub, sup, img, br, input, button, select, textarea, label
```

**Характеристики:**
- Не начинает новую строку
- Занимает только ширину контента
- `width` и `height` **не** применяются
- Вертикальные `margin-top`/`margin-bottom` **не работают**
- Вертикальные `padding-top`/`padding-bottom` — визуально работают, но **не раздвигают** соседние элементы

```css
span {
  width: 200px;        /* Игнорируется */
  height: 100px;       /* Игнорируется */
  margin-top: 20px;    /* Игнорируется */
  margin-bottom: 20px; /* Игнорируется */
  margin-left: 10px;   /* Работает */
  margin-right: 10px;  /* Работает */
  padding: 20px;       /* Визуально работает, но вертикальный не раздвигает */
}
```

### 2.3 Inline-block

```css
.element {
  display: inline-block;
}
```

**Характеристики — гибрид:**
- Не начинает новую строку (как inline)
- `width` и `height` применяются (как block)
- Все margin и padding работают полностью (как block)
- Участвует в inline formatting context (как inline)

### 2.4 Display: внутренний и внешний тип

Свойство `display` определяет **два** типа отображения:

```css
/* Двухзначный синтаксис (Level 3) */
display: block flow;       /* Эквивалент display: block */
display: block flex;       /* Эквивалент display: flex */
display: block grid;       /* Эквивалент display: grid */
display: inline flow;      /* Эквивалент display: inline */
display: inline flex;      /* Эквивалент display: inline-flex */
display: inline grid;      /* Эквивалент display: inline-grid */
display: block flow-root;  /* Эквивалент display: flow-root */
```

| Внешний (outer) | Как элемент ведёт себя снаружи |
|-----------------|-------------------------------|
| `block` | Block-level box |
| `inline` | Inline-level box |

| Внутренний (inner) | Как располагаются дочерние элементы |
|--------------------|-------------------------------------|
| `flow` | Normal flow (block + inline) |
| `flex` | Flex layout |
| `grid` | Grid layout |
| `table` | Table layout |
| `flow-root` | Normal flow с новым BFC |

### 2.5 Другие значения display

```css
display: none;          /* Элемент полностью удаляется из layout */
display: contents;      /* Box элемента удаляется, дети «поднимаются» к родителю */
display: list-item;     /* Генерирует маркер списка */
display: table;         /* Ведёт себя как <table> */
display: table-row;     /* Как <tr> */
display: table-cell;    /* Как <td> */
```

> **`display: contents` — мощный инструмент:**
> Убирает собственный бокс элемента, но сохраняет дочерние элементы. Полезно для grid/flex, когда нужно «развернуть» обёртку:

```css
/* Проблема: обёртка ломает grid */
.grid { display: grid; grid-template-columns: repeat(3, 1fr); }
.wrapper { /* Этот бокс становится одним grid-item */ }

/* Решение: */
.wrapper { display: contents; /* Дети wrapper становятся grid-items */ }
```

---

## 3. Margin collapse

### 3.1 Что такое margin collapse

**Margin collapse (схлопывание отступов)** — механизм, при котором вертикальные margin смежных block-level элементов объединяются в один, равный **наибольшему** из двух.

```css
.first { margin-bottom: 30px; }
.second { margin-top: 20px; }

/* Ожидаемый отступ между ними: 50px (30 + 20) */
/* Фактический отступ: 30px (max(30, 20)) — margin collapse! */
```

### 3.2 Три случая margin collapse

**1. Смежные сиблинги (adjacent siblings):**

```css
.block-a { margin-bottom: 30px; }
.block-b { margin-top: 20px; }
/* Отступ между ними: 30px (не 50px) */
```

**2. Родитель и первый/последний ребёнок (parent-child):**

```css
.parent { margin-top: 0; }
.child:first-child { margin-top: 30px; }
/* margin-top ребёнка «проваливается» в margin-top родителя */
/* Визуально: margin-top родителя = 30px */
```

```html
<div class="parent">
  <div class="child">Контент</div>
</div>
```

Margin ребёнка «выходит» за пределы родителя, если между краем родителя и ребёнком нет:
- border
- padding
- inline-контента
- BFC
- `overflow` (кроме `visible`)

**3. Пустой блок (empty block):**

```css
.empty {
  margin-top: 20px;
  margin-bottom: 30px;
  /* Нет контента, padding, border, height, min-height */
}
/* margin-top и margin-bottom схлопываются: результат = 30px */
```

### 3.3 Когда margin collapse НЕ происходит

| Ситуация | Почему |
|----------|--------|
| Flex-items | flex formatting context |
| Grid-items | grid formatting context |
| Элементы с `float` | Выходят из normal flow |
| Абсолютно позиционированные | Выходят из normal flow |
| Inline-block элементы | Inline formatting context |
| Элемент с `overflow` !== `visible` | Создаёт новый BFC |
| Элемент с `display: flow-root` | Создаёт новый BFC |
| Между parent и child при наличии border/padding | Нет «касания» margin |
| Горизонтальные margin | Схлопываются только вертикальные! |

### 3.4 Отрицательные margin при collapse

Если один margin положительный, а другой отрицательный:
```
Результат = max(positive) + min(negative)
```

```css
.a { margin-bottom: 30px; }
.b { margin-top: -10px; }
/* Результат: 30 + (-10) = 20px */
```

Если оба отрицательные:
```
Результат = min(negative1, negative2) = наибольший по модулю отрицательный
```

```css
.a { margin-bottom: -20px; }
.b { margin-top: -30px; }
/* Результат: min(-20, -30) = -30px */
```

### 3.5 Предотвращение margin collapse

```css
/* 1. Создание BFC */
.parent {
  display: flow-root;     /* Лучший способ */
}

/* 2. Overflow */
.parent {
  overflow: hidden;        /* Побочный эффект: обрезка контента */
  overflow: auto;          /* Может создать скроллбар */
}

/* 3. Padding или border */
.parent {
  padding-top: 1px;        /* Минимальный padding предотвращает collapse */
  /* или */
  border-top: 1px solid transparent;
}

/* 4. Flexbox/Grid */
.parent {
  display: flex;
  flex-direction: column;  /* Дети — flex-items, margin не схлопывается */
}
```

### 3.6 Практический пример проблемы

```html
<div class="card">
  <h2>Заголовок</h2>
  <p>Текст</p>
</div>
```

```css
.card {
  background: white;
  /* Нет padding-top! */
}

h2 {
  margin-top: 20px;
  /* margin-top h2 «проваливается» за пределы .card */
  /* Визуально: отступ над .card, а не внутри */
}

/* Решение 1 */
.card {
  padding-top: 1px; /* Или любое значение > 0 */
}

/* Решение 2 */
.card {
  display: flow-root;
}

/* Решение 3 (часто уже есть) */
.card {
  overflow: hidden;
}
```

---

## 4. Box-sizing

### 4.1 content-box vs border-box

`box-sizing` определяет, что включают в себя `width` и `height`:

```css
/* content-box (по умолчанию) */
.element {
  box-sizing: content-box;
  width: 300px;
  padding: 20px;
  border: 5px solid;
  /* Общая ширина: 300 + 20*2 + 5*2 = 350px */
  /* width задаёт ТОЛЬКО content area */
}

/* border-box */
.element {
  box-sizing: border-box;
  width: 300px;
  padding: 20px;
  border: 5px solid;
  /* Общая ширина: 300px */
  /* Content area: 300 - 20*2 - 5*2 = 250px */
  /* width задаёт content + padding + border */
}
```

Визуальное сравнение:

```
content-box (width: 300px, padding: 20px, border: 5px):
├─ border: 5px
│  ├─ padding: 20px
│  │  ├─ content: 300px ──┤
│  │  ├─ padding: 20px
│  ├─ border: 5px
├─ Итого: 350px ──────────┤

border-box (width: 300px, padding: 20px, border: 5px):
├─ width: 300px ──────────┤
│  ├─ border: 5px
│  │  ├─ padding: 20px
│  │  │  ├─ content: 250px
│  │  ├─ padding: 20px
│  ├─ border: 5px
├─ Итого: 300px ──────────┤
```

### 4.2 Universal Reset

```css
/* Рекомендуемый reset */
html {
  box-sizing: border-box;
}

*,
*::before,
*::after {
  box-sizing: inherit;
}
```

**Почему `inherit` вместо `border-box`?**

Если у вас есть компонент третьей стороны, который рассчитан на `content-box`:

```css
.third-party-widget {
  box-sizing: content-box;
  /* Все потомки также получат content-box через inherit */
}
```

При `box-sizing: border-box` на `*` потомки `.third-party-widget` получили бы `border-box`, сломав layout. С `inherit` — они унаследуют `content-box` от своего родителя.

### 4.3 Когда использовать content-box

Несмотря на повсеместное использование `border-box`, есть случаи, когда `content-box` предпочтительнее:

```css
/* Пропорциональные padding (напр. aspect ratio хак) */
.aspect-wrapper {
  box-sizing: content-box;
  width: 100%;
  padding-bottom: 56.25%; /* Зависит от width, а не от общего размера */
  height: 0;
}

/* Элементы с padding, зависящим от content size */
.tooltip {
  box-sizing: content-box;
  width: max-content;
  padding: 8px 12px;
  /* Ширина определяется контентом, padding добавляется сверху */
}
```

---

## 5. Inline formatting

### 5.1 Line boxes

В inline formatting context текст и inline-элементы размещаются в **line boxes** (строковые боксы):

```
┌──────────────────────────────────────────────┐
│ Line box 1: [Текст] [<strong>жирный</strong>]│
│ Line box 2: [продолжение] [<a>ссылка</a>]   │
│ Line box 3: [конец абзаца.]                  │
└──────────────────────────────────────────────┘
```

Каждый line box:
- Имеет высоту, достаточную для вмещения самого высокого inline-элемента
- Ширина определяется контейнером (с учётом float)
- Содержит один или более inline boxes

### 5.2 Line-height

`line-height` определяет минимальную высоту line box:

```css
p {
  font-size: 16px;
  line-height: 1.5;      /* Безразмерное — рекомендуется */
  /* line-height: 24px;      Абсолютное */
  /* line-height: 150%;      Процентное */
  /* line-height: 1.5em;     Em */
}
```

> **Критическая разница между `1.5`, `150%` и `1.5em`:**

```css
.parent {
  font-size: 20px;
  line-height: 1.5;    /* Каждый потомок пересчитает: свой font-size * 1.5 */
}
.child {
  font-size: 12px;
  /* line-height = 12 * 1.5 = 18px ✓ */
}

.parent-bad {
  font-size: 20px;
  line-height: 150%;   /* Вычисляется СРАЗУ: 20 * 1.5 = 30px */
}
.child-bad {
  font-size: 12px;
  /* line-height = 30px (наследуется computed value!) — слишком много! */
}
```

**Правило:** Всегда используйте безразмерное значение (`1.5`), а не процент или `em`, для `line-height`.

### 5.3 Vertical-align

Определяет вертикальное выравнивание inline-элемента относительно line box:

```css
.element {
  vertical-align: baseline;    /* По умолчанию — выравнивание по baseline */
  vertical-align: top;         /* По верху line box */
  vertical-align: bottom;      /* По низу line box */
  vertical-align: middle;      /* По середине (x-height / 2 + baseline) */
  vertical-align: text-top;    /* По верху шрифта родителя */
  vertical-align: text-bottom; /* По низу шрифта родителя */
  vertical-align: sub;         /* Подстрочное положение */
  vertical-align: super;       /* Надстрочное положение */
  vertical-align: 5px;         /* Смещение от baseline */
  vertical-align: 50%;         /* % от line-height */
}
```

> **Распространённая проблема:** Лишний отступ под `<img>`:

```html
<div>
  <img src="photo.jpg" alt="">
  <!-- Под картинкой появляется зазор в ~3-4px -->
</div>
```

```css
/* Причина: img — inline элемент, выравненный по baseline.
   Пространство под baseline (для «хвостов» букв g, p, y) создаёт зазор */

/* Решение 1 */
img { display: block; }

/* Решение 2 */
img { vertical-align: bottom; }
/* или */
img { vertical-align: middle; }

/* Решение 3 */
div { font-size: 0; } /* Убирает пространство для текста */
```

### 5.4 Baseline alignment

**Baseline** — невидимая линия, на которой «стоят» буквы:

```
  ┌─── ascender line (верхняя граница b, d, h)
  │ ┌── cap height (высота заглавных)
  │ │
  │ │ Hbdpqg
  │ │ ▲▲▲▲▲▲── baseline
  │ │     ▼▼── descender line (нижняя граница g, p, q)
  │ │
```

Inline-элементы по умолчанию выравниваются по baseline:

```css
/* Проблема с inline-block */
.box-a { display: inline-block; height: 100px; }
.box-b { display: inline-block; height: 60px; }
/* Оба выравниваются по baseline (нижний край текста внутри) */
/* Если текста нет — по нижнему краю бокса */
/* Это может создать неожиданное вертикальное смещение */

/* Решение */
.box-a, .box-b {
  vertical-align: top; /* Выравнивание по верху line box */
}
```

### 5.5 Пробелы между inline/inline-block элементами

```html
<!-- Между inline-block элементами появляются пробелы -->
<div>
  <span class="box">A</span>
  <span class="box">B</span>
  <span class="box">C</span>
</div>
```

```css
/* Пробелы ~ 4px между элементами из-за whitespace в HTML */

/* Решение 1: font-size: 0 на родителе */
.parent {
  font-size: 0;
}
.parent .box {
  font-size: 16px; /* Восстанавливаем */
}

/* Решение 2: Flexbox (современное решение) */
.parent {
  display: flex;
}

/* Решение 3: float */
.box { float: left; }

/* Решение 4: Убрать пробелы в HTML */
/* <span>A</span><span>B</span><span>C</span> */
```

---

## 6. Block Formatting Context (BFC)

### 6.1 Что такое BFC

**Block Formatting Context** — область рендеринга, в которой block-level boxes располагаются и взаимодействуют друг с другом. BFC определяет, как элементы:
- Располагаются вертикально
- Взаимодействуют с float-элементами
- Обрабатывают margin collapse

### 6.2 Что создаёт BFC

| Способ | Свойство |
|--------|----------|
| Корневой элемент | `<html>` |
| Float | `float: left` или `float: right` |
| Absolute/Fixed positioning | `position: absolute` или `position: fixed` |
| Inline-block | `display: inline-block` |
| Table cells | `display: table-cell` |
| Table captions | `display: table-caption` |
| Overflow | `overflow: hidden`, `overflow: auto`, `overflow: scroll` (не `visible`) |
| **Flow-root** | **`display: flow-root`** — специально для создания BFC |
| Flex items | Прямые потомки flex-контейнера |
| Grid items | Прямые потомки grid-контейнера |
| Contain | `contain: layout`, `contain: paint` |
| Column-span | `column-span: all` |
| Multicol containers | `column-count` или `column-width` |

> **Best practice:** Используйте `display: flow-root` для создания BFC. В отличие от `overflow: hidden`, он не имеет побочных эффектов.

### 6.3 Float Clearing

Классическая проблема: float-элементы «выпадают» из родителя:

```html
<div class="container">
  <div class="float-left">Float</div>
  <p>Текст обтекает float</p>
</div>
<!-- .container "схлопывается", т.к. float выпадает из потока -->
```

**Решения:**

```css
/* 1. display: flow-root (лучший способ) */
.container {
  display: flow-root;
}

/* 2. overflow: hidden (классический) */
.container {
  overflow: hidden;
  /* Побочный эффект: обрезка контента, выходящего за границы */
}

/* 3. clearfix (псевдоэлемент) */
.container::after {
  content: "";
  display: table; /* или block */
  clear: both;
}

/* 4. clear на следующем элементе */
.after-floats {
  clear: both;
}
```

### 6.4 Margin Collapse Prevention

BFC предотвращает margin collapse между родителем и ребёнком:

```css
.parent {
  display: flow-root; /* Создаёт BFC */
  background: lightblue;
}

.child {
  margin-top: 50px;
  /* Margin остаётся ВНУТРИ parent, не «проваливается» */
}
```

### 6.5 BFC и float containment

Элемент с BFC не перекрывается float-элементами:

```css
.float { float: left; width: 200px; }
.text { /* Без BFC текст обтекает float */ }

/* С BFC — элемент занимает оставшееся пространство */
.text-with-bfc {
  display: flow-root; /* Не перекрывается float, формирует отдельный блок */
}
```

---

## 7. Visual Formatting Model

### 7.1 Normal Flow

**Normal flow** — стандартный способ размещения элементов:
- Block-level boxes располагаются вертикально, друг за другом
- Inline-level boxes располагаются горизонтально, с переносом строк

```css
/* Элементы в normal flow */
.block { display: block; }    /* Вертикально, на всю ширину */
.inline { display: inline; }   /* Горизонтально, по контенту */
```

### 7.2 Floats

Float выводит элемент из normal flow и прижимает его к краю контейнера:

```css
.element {
  float: left;    /* Прижимается к левому краю */
  float: right;   /* Прижимается к правому краю */
  float: none;    /* Нет float (по умолчанию) */
  float: inline-start;  /* К началу inline-направления */
  float: inline-end;    /* К концу inline-направления */
}
```

> **Современный CSS:** Floats практически полностью заменены Flexbox и Grid для layout. Они остаются полезными только для обтекания текстом (их изначальное предназначение).

### 7.3 Positioning

| Значение | Описание | Из normal flow? | Относительно |
|----------|----------|----------------|-------------|
| `static` | По умолчанию, normal flow | Нет | — |
| `relative` | Смещается от normal flow позиции | Нет (занимает место) | Себя |
| `absolute` | Выходит из normal flow | Да | Ближайшего positioned предка |
| `fixed` | Выходит из normal flow | Да | Viewport |
| `sticky` | Гибрид relative/fixed | Нет (до «прилипания») | Scroll-контейнер |

```css
/* Sticky header */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
}

/* Модальное окно */
.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

/* Абсолютное позиционирование */
.parent {
  position: relative; /* Становится containing block */
}
.child {
  position: absolute;
  top: 10px;
  right: 10px;
}
```

### 7.4 Stacking Context

**Stacking context** определяет порядок наложения элементов по оси Z:

Что создаёт stacking context:

```css
/* 1. Корневой элемент (html) */

/* 2. position + z-index (не auto) */
.element { position: relative; z-index: 1; }
.element { position: absolute; z-index: 0; }
.element { position: fixed; z-index: -1; }

/* 3. opacity < 1 */
.element { opacity: 0.99; }

/* 4. transform (не none) */
.element { transform: translateZ(0); }

/* 5. filter (не none) */
.element { filter: blur(0); }

/* 6. will-change */
.element { will-change: transform; }

/* 7. isolation */
.element { isolation: isolate; }

/* 8. mix-blend-mode (не normal) */
.element { mix-blend-mode: multiply; }

/* 9. Flex/Grid items с z-index (не auto) */
.flex-child { z-index: 1; } /* Если родитель — flex/grid container */

/* 10. contain: layout или paint */
.element { contain: layout; }

/* 11. Другие: backdrop-filter, clip-path, mask, perspective */
```

**Порядок отрисовки внутри stacking context** (от заднего плана к переднему):

1. Background и border самого контекста
2. Дочерние stacking contexts с отрицательным `z-index`
3. Block-level boxes в normal flow
4. Float boxes
5. Inline-level boxes в normal flow
6. Дочерние stacking contexts с `z-index: 0` / `auto`
7. Дочерние stacking contexts с положительным `z-index`

> **Gotcha:** `z-index` работает только внутри своего stacking context. Элемент с `z-index: 9999` не может перекрыть элемент в **другом** stacking context, если родительский stacking context имеет более низкий `z-index`.

```css
/* Проблема */
.parent-a { position: relative; z-index: 1; }
.child-a { position: relative; z-index: 9999; } /* Внутри parent-a */

.parent-b { position: relative; z-index: 2; }
.child-b { position: relative; z-index: 1; } /* Внутри parent-b */

/* child-b ПЕРЕД child-a! Потому что parent-b (z-index: 2) > parent-a (z-index: 1) */
```

### 7.5 Containing Block

**Containing block** — прямоугольная область, относительно которой вычисляются размеры и позиция элемента.

| Position элемента | Containing block |
|-------------------|-----------------|
| `static`, `relative`, `sticky` | Content edge ближайшего block-level предка |
| `absolute` | Padding edge ближайшего предка с `position` != `static` |
| `fixed` | Viewport (или ближайший предок с `transform`/`filter`/`will-change`) |

> **Gotcha с fixed:** `transform` на предке ломает `position: fixed`:

```css
.parent {
  transform: translateZ(0); /* Или любой transform */
}
.child {
  position: fixed; /* Больше НЕ relative viewport! */
  /* Теперь relative к .parent */
  top: 0;
  /* Прижмётся к верху .parent, а не viewport */
}
```

---

## 8. Outline vs Border

### 8.1 Ключевые различия

| Характеристика | `border` | `outline` |
|----------------|----------|-----------|
| Занимает место в layout | Да | **Нет** |
| Входит в box model | Да (часть border-box) | **Нет** |
| Может быть на каждой стороне разным | Да | **Нет** (одинаковый со всех сторон) |
| Поддерживает border-radius | Да | Да (в современных браузерах) |
| Может иметь offset | Нет | **Да** (`outline-offset`) |
| Влияет на размеры элемента | Да | **Нет** |
| Может перекрывать другие элементы | Нет (часть layout) | **Да** (рисуется поверх) |

### 8.2 Outline

```css
.element {
  outline: 2px solid blue;

  /* Longhand */
  outline-width: 2px;
  outline-style: solid;     /* solid, dashed, dotted, double, groove, ridge, inset, outset, auto */
  outline-color: blue;

  /* Offset */
  outline-offset: 4px;      /* Положительный — от элемента */
  outline-offset: -4px;     /* Отрицательный — внутрь элемента */
}
```

### 8.3 Accessibility

```css
/* НЕ убирайте outline без замены! */
*:focus {
  outline: none; /* ПЛОХО для accessibility */
}

/* Правильный подход */
*:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Или кастомный focus-ring */
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);
}
```

> **Критически важно:** Outline — основной визуальный индикатор фокуса для пользователей, навигирующих с клавиатуры. Удаление `outline` без адекватной замены — нарушение WCAG 2.1 (критерий 2.4.7).

### 8.4 Практические применения outline

```css
/* Debug layout */
* {
  outline: 1px solid rgba(255, 0, 0, 0.2); /* Не ломает layout */
}

/* Focus-ring с анимацией */
button:focus-visible {
  outline: 2px solid transparent;
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--color-primary);
  transition: outline-offset 0.1s ease, box-shadow 0.1s ease;
}

/* Negative outline-offset для внутренней рамки */
.image-frame {
  outline: 3px solid white;
  outline-offset: -10px;
}
```

---

## 9. Box-shadow

### 9.1 Синтаксис

```css
/* Базовый синтаксис: offset-x | offset-y | color */
box-shadow: 5px 5px black;

/* С blur-radius: offset-x | offset-y | blur-radius | color */
box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.3);

/* С spread-radius: offset-x | offset-y | blur-radius | spread-radius | color */
box-shadow: 5px 5px 10px 2px rgba(0, 0, 0, 0.3);

/* Inset (внутренняя тень) */
box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
```

| Параметр | Описание |
|----------|----------|
| `offset-x` | Горизонтальное смещение (+ вправо, - влево) |
| `offset-y` | Вертикальное смещение (+ вниз, - вверх) |
| `blur-radius` | Радиус размытия (0 = чёткая тень). Опционально |
| `spread-radius` | Расширение/сжатие тени. Опционально |
| `color` | Цвет тени |
| `inset` | Внутренняя тень |

### 9.2 Spread radius

```css
/* Положительный spread — тень расширяется */
box-shadow: 0 0 0 5px blue; /* Эффект «рамки» без использования border */

/* Отрицательный spread — тень сжимается */
box-shadow: 0 10px 20px -5px rgba(0, 0, 0, 0.3);
/* Тень видна только снизу, т.к. spread сжимает её с боков */
```

### 9.3 Multiple shadows

```css
/* Множественные тени (через запятую) */
.card {
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.07),
    0 2px 4px rgba(0, 0, 0, 0.07),
    0 4px 8px rgba(0, 0, 0, 0.07),
    0 8px 16px rgba(0, 0, 0, 0.07),
    0 16px 32px rgba(0, 0, 0, 0.07),
    0 32px 64px rgba(0, 0, 0, 0.07);
  /* Многослойная реалистичная тень */
}

/* Имитация нескольких рамок */
.multi-border {
  box-shadow:
    0 0 0 3px blue,
    0 0 0 6px white,
    0 0 0 9px red;
}
```

> **Порядок:** Первая тень в списке — **сверху**. Каждая следующая тень рисуется **за** предыдущей.

### 9.4 Performance

```css
/* box-shadow ДОРОГОЙ для производительности */

/* ПЛОХО: анимация box-shadow */
.card {
  transition: box-shadow 0.3s;
}
.card:hover {
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  /* Каждый кадр — repaint! */
}

/* ХОРОШО: анимация псевдоэлемента с opacity */
.card {
  position: relative;
}
.card::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  z-index: -1;
}
.card:hover::after {
  opacity: 1;
  /* opacity использует GPU compositor — значительно дешевле */
}
```

### 9.5 Практические паттерны

```css
/* Elevation system (Material Design подход) */
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
}

/* Colored shadow */
.card-blue {
  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
}

/* Neumorphism */
.neumorphic {
  background: #e0e5ec;
  box-shadow:
    8px 8px 16px #c8ccd3,
    -8px -8px 16px #ffffff;
}

/* Inset для «вдавленного» вида */
.neumorphic-inset {
  background: #e0e5ec;
  box-shadow:
    inset 8px 8px 16px #c8ccd3,
    inset -8px -8px 16px #ffffff;
}
```

---

## 10. Box-decoration-break

### 10.1 Проблема

Когда inline-элемент переносится на несколько строк или block-элемент разбивается на колонки/страницы, как отображаются его декоративные свойства (background, border, padding, box-shadow)?

### 10.2 slice vs clone

```css
.element {
  box-decoration-break: slice; /* По умолчанию */
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone; /* Для WebKit */
}
```

**`slice` (по умолчанию):**
Элемент рисуется как единый прямоугольник, а затем «разрезается» на фрагменты. Каждый фрагмент получает свою часть декорации.

**`clone`:**
Каждый фрагмент получает **полную** декорацию, как если бы он был отдельным элементом.

```css
/* Inline-элемент на нескольких строках */
.highlight {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
  /* Каждая строка получает полный padding, border-radius и gradient */
}
```

### 10.3 Различия в деталях

| Свойство | `slice` | `clone` |
|----------|---------|---------|
| `background` | Один фон, разрезанный | Полный фон на каждом фрагменте |
| `border` | Только на внешних краях | Полная рамка на каждом фрагменте |
| `border-radius` | Только на углах первого/последнего фрагмента | Все углы на каждом фрагменте |
| `padding` | Только слева у первого, справа у последнего | Полный padding на каждом фрагменте |
| `box-shadow` | Одна тень для всей фигуры | Отдельная тень на каждом фрагменте |
| `margin` | Только у первого и последнего фрагмента | У каждого фрагмента |

### 10.4 Практические применения

```css
/* Подсветка текста с красивым переносом */
mark {
  background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%);
  padding: 0.1em 0.3em;
  border-radius: 0.2em;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

/* Тег / бейдж, переносящийся на несколько строк */
.tag {
  background: #3b82f6;
  color: white;
  padding: 2px 8px;
  border-radius: 4px;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

/* Для column breaks */
.article {
  column-count: 2;
}
.article blockquote {
  border-left: 4px solid #3b82f6;
  padding-left: 1rem;
  box-decoration-break: clone;
  /* При разрыве на колонки — border и padding на обоих фрагментах */
}
```

---

## 11. Logical Properties

### 11.1 Проблема физических свойств

Физические свойства (`margin-top`, `padding-left`, `border-right`) привязаны к физическим направлениям экрана. Это создаёт проблемы для:
- **RTL (right-to-left)** языков (арабский, иврит)
- **Вертикальных** режимов письма (японский, традиционный китайский)
- **Интернационализации** (i18n)

### 11.2 Оси и направления

В CSS Logical Properties используются два понятия:
- **Block** — ось, перпендикулярная строке (обычно вертикальная)
- **Inline** — ось строки (обычно горизонтальная)

```
Горизонтальный LTR:          Горизонтальный RTL:
block-start (top)             block-start (top)
│                             │
├─ inline-start (left)        ├─ inline-start (RIGHT)
│                             │
├─ inline-end (right)         ├─ inline-end (LEFT)
│                             │
block-end (bottom)            block-end (bottom)

Вертикальный (writing-mode: vertical-rl):
inline-start (top)
│
├─ block-start (RIGHT)
│
├─ block-end (LEFT)
│
inline-end (bottom)
```

### 11.3 Margin

```css
/* Физические → Логические */
margin-top    → margin-block-start
margin-bottom → margin-block-end
margin-left   → margin-inline-start
margin-right  → margin-inline-end

/* Shorthand */
margin-block: 10px 20px;    /* block-start, block-end */
margin-block: 10px;         /* block-start = block-end */
margin-inline: 10px 20px;   /* inline-start, inline-end */
margin-inline: auto;        /* Центрирование в inline-направлении */
```

```css
/* Вместо margin: 0 auto */
.centered {
  margin-inline: auto; /* Работает для LTR и RTL */
}
```

### 11.4 Padding

```css
/* Физические → Логические */
padding-top    → padding-block-start
padding-bottom → padding-block-end
padding-left   → padding-inline-start
padding-right  → padding-inline-end

/* Shorthand */
padding-block: 1rem 2rem;
padding-inline: 1rem;
```

### 11.5 Border

```css
/* Физические → Логические */
border-top    → border-block-start
border-bottom → border-block-end
border-left   → border-inline-start
border-right  → border-inline-end

/* Shorthand */
border-block: 1px solid #ccc;
border-inline: 2px dashed blue;

/* По компонентам */
border-block-start-width: 2px;
border-block-start-style: solid;
border-block-start-color: red;

/* Border-radius */
border-top-left-radius    → border-start-start-radius
border-top-right-radius   → border-start-end-radius
border-bottom-left-radius → border-end-start-radius
border-bottom-right-radius → border-end-end-radius
```

### 11.6 Размеры

```css
/* Физические → Логические */
width      → inline-size
height     → block-size
min-width  → min-inline-size
max-width  → max-inline-size
min-height → min-block-size
max-height → max-block-size
```

```css
.card {
  inline-size: 300px;   /* width в LTR/RTL, height в вертикальном */
  block-size: auto;     /* height в LTR/RTL */
  max-inline-size: 100%; /* max-width */
}
```

### 11.7 Positioning

```css
/* Физические → Логические */
top    → inset-block-start
bottom → inset-block-end
left   → inset-inline-start
right  → inset-inline-end

/* Shorthand */
inset-block: 0;         /* top: 0; bottom: 0; */
inset-inline: 0;        /* left: 0; right: 0; */
inset: 0;               /* top: 0; right: 0; bottom: 0; left: 0; */
inset: 10px 20px;       /* block: 10px, inline: 20px */
```

### 11.8 Другие логические свойства

```css
/* Text-align */
text-align: start;   /* left в LTR, right в RTL */
text-align: end;      /* right в LTR, left в RTL */

/* Float */
float: inline-start;  /* left в LTR, right в RTL */
float: inline-end;    /* right в LTR, left в RTL */

/* Clear */
clear: inline-start;
clear: inline-end;

/* Resize */
resize: block;
resize: inline;

/* Overflow */
overflow-block: auto;
overflow-inline: hidden;
```

### 11.9 Полная таблица соответствий

| Физическое (LTR) | Логическое |
|-------------------|-----------|
| `margin-top` | `margin-block-start` |
| `margin-bottom` | `margin-block-end` |
| `margin-left` | `margin-inline-start` |
| `margin-right` | `margin-inline-end` |
| `padding-top` | `padding-block-start` |
| `padding-bottom` | `padding-block-end` |
| `padding-left` | `padding-inline-start` |
| `padding-right` | `padding-inline-end` |
| `border-top` | `border-block-start` |
| `border-bottom` | `border-block-end` |
| `border-left` | `border-inline-start` |
| `border-right` | `border-inline-end` |
| `top` | `inset-block-start` |
| `bottom` | `inset-block-end` |
| `left` | `inset-inline-start` |
| `right` | `inset-inline-end` |
| `width` | `inline-size` |
| `height` | `block-size` |
| `min-width` | `min-inline-size` |
| `max-width` | `max-inline-size` |
| `min-height` | `min-block-size` |
| `max-height` | `max-block-size` |
| `border-top-left-radius` | `border-start-start-radius` |
| `border-top-right-radius` | `border-start-end-radius` |
| `border-bottom-left-radius` | `border-end-start-radius` |
| `border-bottom-right-radius` | `border-end-end-radius` |

### 11.10 Практический пример: RTL-совместимый компонент

```css
/* Вместо физических свойств */
.card-old {
  margin-left: 1rem;
  padding-left: 1.5rem;
  border-left: 3px solid blue;
  text-align: left;
}

/* Логические свойства — работает для LTR и RTL */
.card {
  margin-inline-start: 1rem;
  padding-inline-start: 1.5rem;
  border-inline-start: 3px solid blue;
  text-align: start;
}

/* Навигация */
.nav-item {
  margin-inline-end: 1rem; /* Отступ справа в LTR, слева в RTL */
}
.nav-item:last-child {
  margin-inline-end: 0;
}

/* Иконка перед текстом */
.icon-text {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem; /* gap не зависит от направления — всегда ОК */
}

/* Стрелка «Читать далее» */
.read-more::after {
  content: "→";
  margin-inline-start: 0.5rem;
}

/* В RTL стрелка автоматически окажется слева от текста */
/* Но содержимое content НЕ переворачивается — нужен dir или transform */
[dir="rtl"] .read-more::after {
  content: "←";
}
```

> **Рекомендация:** Если ваш проект поддерживает только LTR, вы всё равно можете использовать `margin-inline` и `padding-block` как **более семантичные** альтернативы. Это улучшает читаемость кода и упрощает будущее добавление RTL-поддержки.

---

## Заключение

Box Model — фундамент layout в CSS, и глубокое понимание его механик критически важно:

- **`box-sizing: border-box`** должен быть в каждом проекте — он делает размеры предсказуемыми
- **Margin collapse** — один из самых частых источников «непонятных» багов в CSS. `display: flow-root` — лучшее лекарство
- **BFC (Block Formatting Context)** — ключевая концепция для понимания float clearing, margin collapse prevention и изоляции layout
- **Stacking context** — необходимое знание для работы с `z-index` и наложением элементов. Помните: `z-index` работает только внутри своего stacking context
- **`box-shadow`** — мощный, но дорогой для производительности инструмент. Анимируйте `opacity` вместо `box-shadow`
- **Logical Properties** — будущее CSS-layout. Они обеспечивают корректную работу для всех направлений письма и упрощают интернационализацию

Понимание различий между `content-box` и `border-box`, inline и block formatting, а также механик stacking context позволяет уверенно решать сложные задачи layout без «магических» значений и хаков.
