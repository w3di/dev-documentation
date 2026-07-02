# CSS Grid — глубокое погружение

> CSS Grid Layout — двумерная система раскладки, позволяющая одновременно
> контролировать размещение элементов по строкам и колонкам. В отличие от
> Flexbox, Grid работает от **layout-first** подхода: сначала определяется
> сетка, затем элементы размещаются в её ячейках.

---

## Оглавление

1. [Grid Container — основа](#1-grid-container--основа)
2. [Explicit Grid — явная сетка](#2-explicit-grid--явная-сетка)
3. [grid-template-areas — именованные области](#3-grid-template-areas--именованные-области)
4. [Implicit Grid — неявная сетка](#4-implicit-grid--неявная-сетка)
5. [Grid Lines — линии сетки](#5-grid-lines--линии-сетки)
6. [grid-area shorthand](#6-grid-area-shorthand)
7. [Gap — отступы](#7-gap--отступы)
8. [Alignment — выравнивание](#8-alignment--выравнивание)
9. [Subgrid](#9-subgrid)
10. [Auto-placement algorithm](#10-auto-placement-algorithm)
11. [Sizing functions — функции размеров](#11-sizing-functions--функции-размеров)
12. [auto-fill vs auto-fit](#12-auto-fill-vs-auto-fit)
13. [Grid vs Flexbox](#13-grid-vs-flexbox)
14. [Практические паттерны](#14-практические-паттерны)

---

## 1. Grid Container — основа

### 1.1 Создание grid container

```css
.container {
  display: grid;          /* block-level grid container */
}

.inline-container {
  display: inline-grid;   /* inline-level grid container */
}
```

| Свойство             | Внешнее поведение           | Внутреннее поведение       |
| -------------------- | --------------------------- | -------------------------- |
| `display: grid`      | Block-level (занимает ширину) | Grid formatting context   |
| `display: inline-grid` | Inline-level (по содержимому) | Grid formatting context  |

### 1.2 Grid Formatting Context

Внутри grid container создаётся **grid formatting context**:

- Все прямые потомки становятся **grid items**
- `float` на grid items **игнорируется**
- `vertical-align` на grid items **игнорируется**
- `display: inline` на grid items **вычисляется как block** (blockified)
- `margin-collapsing` между grid items **не происходит**
- `::before` и `::after` на grid container становятся grid items

```css
.grid {
  display: grid;
}

/* Все эти элементы — grid items */
.grid > div { }
.grid > span { }      /* blockified: display вычисляется как block */
.grid > a { }          /* blockified */
.grid::before { content: ""; }  /* grid item */
```

### 1.3 Терминология

```
                Column 1    Column 2    Column 3
              ┌───────────┬───────────┬───────────┐
     Row 1    │  Cell 1,1 │  Cell 1,2 │  Cell 1,3 │
              ├───────────┼───────────┼───────────┤
     Row 2    │  Cell 2,1 │  Cell 2,2 │  Cell 2,3 │
              ├───────────┼───────────┼───────────┤
     Row 3    │  Cell 3,1 │  Cell 3,2 │  Cell 3,3 │
              └───────────┴───────────┴───────────┘

Grid Line:       1         2         3         4      (column lines)
Grid Line:  1 ─── 2 ─── 3 ─── 4                       (row lines)

Grid Cell:    Пересечение одной строки и одной колонки
Grid Track:   Полная строка или полная колонка
Grid Area:    Прямоугольная область из одной или нескольких ячеек
```

- **Grid Line** — горизонтальная или вертикальная линия, разделяющая сетку.
  Линии нумеруются с 1 (а не с 0).
- **Grid Track** — пространство между двумя смежными линиями (строка или колонка).
- **Grid Cell** — пересечение одного row track и одного column track.
- **Grid Area** — прямоугольная область, ограниченная четырьмя grid lines.

### 1.4 Что НЕ является grid item

Абсолютно позиционированные элементы (`position: absolute/fixed`) внутри grid
container — **out-of-flow**. Они не участвуют в grid-раскладке, но используют
grid container как containing block. Они могут ссылаться на grid lines для
позиционирования:

```css
.grid {
  display: grid;
  position: relative;
  grid-template-columns: 100px 1fr 100px;
}

.absolute-child {
  position: absolute;
  grid-column: 2 / 3; /* позиционируется между линиями 2 и 3 */
  top: 0;
  bottom: 0;
}
```

---

## 2. Explicit Grid — явная сетка

### 2.1 grid-template-columns и grid-template-rows

```css
.grid {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  grid-template-rows: 60px auto 1fr;
}
```

### 2.2 Единицы измерения для tracks

| Единица       | Описание                                                  |
| ------------- | --------------------------------------------------------- |
| `px`, `em`, `rem` | Фиксированный размер                                 |
| `%`           | Процент от размера grid container                         |
| `fr`          | Доля **свободного пространства** (flexible fraction)      |
| `auto`        | Размер по содержимому (с учётом min/max)                  |
| `min-content` | Минимальный размер, при котором контент не переполняется   |
| `max-content` | Размер, при котором контент не переносится на новые строки |
| `fit-content()` | `min(max-content, max(min-content, argument))`          |
| `minmax()`    | Минимальный и максимальный размер                         |

### 2.3 fr unit — подробный разбор

`fr` распределяет **свободное пространство** — пространство, оставшееся после
вычитания фиксированных tracks, gaps и padding:

```css
.grid {
  display: grid;
  width: 1000px;
  gap: 20px;
  grid-template-columns: 200px 1fr 2fr;
}
```

```
Свободное пространство = 1000 - 200 - (20 × 2) = 760px
                                  ↑       ↑
                              fixed    2 gaps

1fr = 760 / (1 + 2) = 253.33px
2fr = 253.33 × 2 = 506.67px

Column 1: 200px
Column 2: 253.33px
Column 3: 506.67px
```

> **Важно**: `fr` работает **после** вычисления фиксированных размеров.
> `1fr` не означает «1/3 контейнера» — это «1 доля оставшегося».

### 2.4 fr и min-content

Track с `fr` не может быть меньше `min-content` своего содержимого:

```css
.grid {
  grid-template-columns: 1fr 1fr 1fr;
  width: 300px;
}

/* Если item в первой колонке имеет min-content = 200px,
   колонка будет 200px, а не 100px (300/3) */
```

Для принудительного сжатия используйте `minmax(0, 1fr)`:

```css
.grid {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
  /* Теперь колонки могут сжаться до 0, контент обрезается */
}
```

### 2.5 repeat()

```css
/* Повторение одинаковых tracks */
.grid {
  grid-template-columns: repeat(3, 1fr);
  /* Эквивалент: 1fr 1fr 1fr */
}

/* Повторение паттерна */
.grid {
  grid-template-columns: repeat(3, 100px 1fr);
  /* Эквивалент: 100px 1fr 100px 1fr 100px 1fr */
}

/* Комбинирование с другими tracks */
.grid {
  grid-template-columns: 200px repeat(3, 1fr) 200px;
  /* 200px 1fr 1fr 1fr 200px */
}
```

### 2.6 minmax()

```css
.grid {
  grid-template-columns: minmax(200px, 1fr) minmax(300px, 2fr);
  /* Колонка 1: минимум 200px, максимум 1fr */
  /* Колонка 2: минимум 300px, максимум 2fr */
}

/* Часто используемые паттерны */
.grid {
  grid-template-rows: minmax(100px, auto);   /* минимум 100px, растёт по содержимому */
  grid-template-columns: minmax(0, 1fr);     /* fr без min-content ограничения */
}
```

Ограничения `minmax()`:
- `fr` может быть только в `max` позиции: `minmax(100px, 1fr)` — ок
- `minmax(1fr, 200px)` — **невалидно** (fr в min позиции)

### 2.7 Именованные линии

```css
.grid {
  grid-template-columns:
    [sidebar-start] 200px
    [sidebar-end content-start] 1fr
    [content-end aside-start] 300px
    [aside-end];
  grid-template-rows:
    [header-start] 60px
    [header-end main-start] 1fr
    [main-end footer-start] 80px
    [footer-end];
}

.header {
  grid-column: sidebar-start / aside-end;
  grid-row: header-start / header-end;
}

.sidebar {
  grid-column: sidebar-start / sidebar-end;
  grid-row: main-start / main-end;
}
```

### 2.8 Множественные имена на одной линии

Одна линия может иметь несколько имён:

```css
.grid {
  grid-template-columns: [full-start sidebar-start] 200px [sidebar-end content-start] 1fr [content-end full-end];
}

.full-width {
  grid-column: full-start / full-end;
}
```

---

## 3. grid-template-areas — именованные области

### 3.1 ASCII-art layout

```css
.grid {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  grid-template-rows: 60px 1fr 80px;
  grid-template-areas:
    "header  header  header"
    "sidebar content aside"
    "footer  footer  footer";
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.content { grid-area: content; }
.aside   { grid-area: aside; }
.footer  { grid-area: footer; }
```

### 3.2 Правила именования

1. Каждая строка в кавычках — одна строка grid
2. Имена разделяются пробелами
3. Количество имён в каждой строке должно совпадать с количеством колонок
4. Пустые ячейки обозначаются точкой (`.` или `...`):

```css
.grid {
  grid-template-areas:
    "header header header"
    "sidebar content ."      /* правая ячейка пустая */
    "footer footer footer";
}
```

5. Области должны быть **прямоугольными** — L-образные или T-образные формы невалидны:

```css
/* НЕВАЛИДНО — area "sidebar" не прямоугольная */
.grid {
  grid-template-areas:
    "sidebar header header"
    "sidebar content aside"
    "footer  footer  sidebar"; /* sidebar в третьей строке ← ошибка! */
}
```

### 3.3 Автоматические линии

При использовании `grid-template-areas` автоматически создаются именованные линии:

```css
.grid {
  grid-template-areas:
    "header  header"
    "sidebar content";
}
/* Автоматически созданы линии:
   header-start (column 1, row 1)
   header-end (column 3, row 2)
   sidebar-start (column 1, row 2)
   sidebar-end (column 2, row 3)
   content-start (column 2, row 2)
   content-end (column 3, row 3)
*/
```

### 3.4 Комбинирование areas с размерами

```css
.grid {
  display: grid;
  grid-template:
    "header  header  header"  60px
    "sidebar content aside"   1fr
    "footer  footer  footer"  80px
    / 200px   1fr     200px;
  /* ↑ размеры строк после имён, размеры колонок после / */
}
```

Это `grid-template` shorthand, объединяющий `grid-template-rows`,
`grid-template-columns` и `grid-template-areas`.

### 3.5 Responsive areas

```css
.grid {
  display: grid;
  grid-template-areas:
    "header"
    "content"
    "sidebar"
    "footer";
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .grid {
    grid-template-areas:
      "header  header"
      "sidebar content"
      "footer  footer";
    grid-template-columns: 200px 1fr;
  }
}

@media (min-width: 1200px) {
  .grid {
    grid-template-areas:
      "header  header  header"
      "sidebar content aside"
      "footer  footer  footer";
    grid-template-columns: 200px 1fr 200px;
  }
}
```

---

## 4. Implicit Grid — неявная сетка

### 4.1 Когда создаётся неявная сетка

Если grid items размещаются **за пределами** explicit grid (определённого через
`grid-template-*`), создаются **implicit tracks** (неявные дорожки):

```css
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 100px;
  /* Explicit grid: 2 колонки, 1 строка */
}
```

```html
<div class="grid">
  <div>1</div>  <!-- row 1, col 1 (explicit) -->
  <div>2</div>  <!-- row 1, col 2 (explicit) -->
  <div>3</div>  <!-- row 2, col 1 (IMPLICIT row) -->
  <div>4</div>  <!-- row 2, col 2 (IMPLICIT row) -->
</div>
```

### 4.2 grid-auto-rows и grid-auto-columns

Задают размер **неявных** tracks:

```css
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 100px;      /* explicit rows */
  grid-auto-rows: 150px;          /* implicit rows = 150px */
  grid-auto-columns: 200px;       /* implicit columns = 200px */
}
```

```css
/* Несколько значений — чередование */
.grid {
  grid-auto-rows: 100px 200px;
  /* implicit row 1: 100px, implicit row 2: 200px,
     implicit row 3: 100px, implicit row 4: 200px, ... */
}
```

Типичный паттерн — `minmax` для implicit rows:

```css
.grid {
  grid-auto-rows: minmax(100px, auto);
  /* Implicit rows минимум 100px, растут по содержимому */
}
```

### 4.3 grid-auto-flow

Определяет, как auto-placed items размещаются в сетке:

```css
.grid {
  grid-auto-flow: row;          /* по умолчанию — заполнение по строкам */
  grid-auto-flow: column;       /* заполнение по колонкам */
  grid-auto-flow: row dense;    /* по строкам, плотная упаковка */
  grid-auto-flow: column dense; /* по колонкам, плотная упаковка */
}
```

| Значение        | Направление заполнения | Заполнение пропусков |
| --------------- | ---------------------- | -------------------- |
| `row`           | Слева направо, сверху вниз | Нет                |
| `column`        | Сверху вниз, слева направо | Нет                |
| `row dense`     | Слева направо, сверху вниз | Да — возвращается к пропущенным ячейкам |
| `column dense`  | Сверху вниз, слева направо | Да                  |

### 4.4 dense packing — визуальный пример

```
Без dense (grid-auto-flow: row):
┌───┬───┬───┐
│ A │ A │ B │
├───┼───┤   │
│   │ C │ B │   ← пустая ячейка (A заняла 2 колонки,
├───┼───┼───┤      C не влезает рядом с A, B занимает 2 строки)
│ D │ D │ D │
└───┴───┴───┘

С dense (grid-auto-flow: row dense):
┌───┬───┬───┐
│ A │ A │ B │
├───┼───┤   │
│ C │ D │ B │   ← C «заполнила» пропущенную ячейку
├───┼───┼───┤
│ D │ D │ E │
└───┴───┴───┘
```

> **Accessibility warning**: `dense` изменяет визуальный порядок элементов,
> что может нарушить соответствие между visual order и DOM order.
> Tab-навигация и скринридеры следуют DOM-порядку.

---

## 5. Grid Lines — линии сетки

### 5.1 Нумерация линий

Линии нумеруются с **1** (не с 0). Для grid с 3 колонками есть 4 вертикальные линии:

```
     1     2     3     4
     |     |     |     |
     ▼     ▼     ▼     ▼
     ┌─────┬─────┬─────┐
     │  1  │  2  │  3  │
     └─────┴─────┴─────┘
```

Отрицательные номера считаются **с конца**:

```
Прямая нумерация:  1     2     3     4
Обратная:         -4    -3    -2    -1
```

### 5.2 grid-column-start / grid-column-end

```css
.item {
  grid-column-start: 1;
  grid-column-end: 3;
  /* Занимает колонки 1 и 2 (от линии 1 до линии 3) */
}
```

### 5.3 grid-column / grid-row shorthand

```css
.item {
  grid-column: 1 / 3;      /* start / end */
  grid-row: 1 / 2;
}

/* span — занять N tracks */
.item {
  grid-column: 1 / span 2; /* начать с линии 1, занять 2 колонки */
  grid-column: span 2;     /* занять 2 колонки (авто-размещение) */
}

/* До конца */
.item {
  grid-column: 1 / -1;     /* от первой до последней линии */
}
```

### 5.4 Использование именованных линий

```css
.grid {
  grid-template-columns: [start] 1fr [center] 1fr [end];
}

.item {
  grid-column: start / center;
}
```

### 5.5 span keyword

```css
.item {
  grid-column: 2 / span 3;  /* начать с линии 2, занять 3 колонки */
  grid-row: span 2;         /* занять 2 строки от текущей позиции */
}
```

`span` можно использовать и с `start`:

```css
.item {
  grid-column: span 2 / 5;  /* кончить на линии 5, занять 2 колонки назад */
  /* Эквивалент: grid-column: 3 / 5; */
}
```

### 5.6 Линии с одинаковыми именами

При `repeat()` можно создать линии с одинаковыми именами. Обращение к ним — по номеру:

```css
.grid {
  grid-template-columns: repeat(3, [col-start] 1fr [col-end]);
  /* Создаёт: [col-start] 1fr [col-end col-start] 1fr [col-end col-start] 1fr [col-end] */
}

.item {
  grid-column: col-start 2 / col-end 3;
  /* От второй линии col-start до третьей линии col-end */
}
```

---

## 6. grid-area shorthand

### 6.1 Синтаксис

`grid-area` — сокращение для четырёх свойств:

```css
.item {
  grid-area: row-start / column-start / row-end / column-end;
}

/* Пример */
.item {
  grid-area: 1 / 2 / 3 / 4;
  /* Эквивалент: */
  /* grid-row-start: 1;    */
  /* grid-column-start: 2; */
  /* grid-row-end: 3;      */
  /* grid-column-end: 4;   */
}
```

> **Порядок запоминания**: row-start / col-start / row-end / col-end.
> Это отличается от привычного `top/right/bottom/left` — здесь идёт
> **по часовой стрелке**, но начинается с row.

### 6.2 С span

```css
.item {
  grid-area: 1 / 1 / span 2 / span 3;
  /* Начинается с ячейки (1,1), занимает 2 строки и 3 колонки */
}
```

### 6.3 Одно значение — имя области

Когда `grid-area` получает **одно значение без цифр**, оно интерпретируется
как имя области (для `grid-template-areas`):

```css
.header {
  grid-area: header;
  /* Размещается в области "header", определённой в grid-template-areas */
}
```

### 6.4 Неполная запись

Если указать меньше 4 значений, пропущенные устанавливаются в `auto`:

```css
.item {
  grid-area: 2 / 3;
  /* Эквивалент: grid-area: 2 / 3 / auto / auto; */
  /* grid-row: 2 / auto; grid-column: 3 / auto; */
}
```

---

## 7. Gap — отступы

### 7.1 Синтаксис

```css
.grid {
  gap: 20px;                /* row-gap и column-gap = 20px */
  gap: 20px 10px;           /* row-gap: 20px, column-gap: 10px */
  row-gap: 20px;
  column-gap: 10px;
}
```

### 7.2 Устаревший синтаксис

```css
/* Старый синтаксис (с префиксом grid-) — устарел, но работает */
.grid {
  grid-gap: 20px;
  grid-row-gap: 20px;
  grid-column-gap: 10px;
}

/* Современный синтаксис */
.grid {
  gap: 20px;
  row-gap: 20px;
  column-gap: 10px;
}
```

### 7.3 Gap и fr

Gaps **вычитаются** из свободного пространства перед распределением `fr`:

```css
.grid {
  width: 1000px;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  /* Свободное пространство = 1000 - (2 × 20) = 960px */
  /* 1fr = 960 / 3 = 320px */
}
```

### 7.4 Gap только между tracks

`gap` создаёт отступы **только между** tracks. Нет отступов между элементами
и краем grid container:

```
С gap: 10px:
┌──────────────────────────┐
│┌────┐    ┌────┐    ┌────┐│
││    │    │    │    │    ││  ← нет gap по краям
│└────┘    └────┘    └────┘│
│          10px      10px  │  ← gap только между
│┌────┐    ┌────┐    ┌────┐│
││    │    │    │    │    ││
│└────┘    └────┘    └────┘│
└──────────────────────────┘
     10px        (row-gap)
```

Для отступов от краёв используйте `padding` на grid container.

### 7.5 Процентные gaps

```css
.grid {
  gap: 5%;
  /* Вычисляется от inline size (ширины) grid container */
}
```

> **Gotcha**: в отличие от margin, процентные `row-gap` в Grid вычисляются
> от **ширины** контейнера (inline size), а не от высоты. Это соответствует
> поведению процентных margins/paddings.

---

## 8. Alignment — выравнивание

### 8.1 Две оси выравнивания

В Grid есть два направления выравнивания:
- **Inline axis** (горизонтальная в LTR) — `justify-*`
- **Block axis** (вертикальная) — `align-*`

### 8.2 Полная карта свойств

| Свойство           | Что выравнивает        | Ось     | Применяется к      |
| ------------------- | ---------------------- | ------- | ------------------- |
| `justify-items`     | Items внутри ячеек     | Inline  | Container           |
| `align-items`       | Items внутри ячеек     | Block   | Container           |
| `justify-content`   | Tracks внутри container | Inline | Container           |
| `align-content`     | Tracks внутри container | Block  | Container           |
| `justify-self`      | Item внутри ячейки     | Inline  | Item                |
| `align-self`        | Item внутри ячейки     | Block   | Item                |

### 8.3 justify-items / align-items

Выравнивают **grid items внутри** их grid areas:

```css
.grid {
  display: grid;
  grid-template-columns: 200px 200px 200px;
  grid-template-rows: 200px 200px;
  justify-items: center;    /* items по центру горизонтально */
  align-items: center;      /* items по центру вертикально */
}
```

Значения:

| Значение    | Описание                                       |
| ----------- | ---------------------------------------------- |
| `stretch`   | Растянуть на всю area (по умолчанию)           |
| `start`     | В начале (left / top в LTR)                    |
| `end`       | В конце (right / bottom в LTR)                 |
| `center`    | По центру                                      |
| `baseline`  | По baseline текста (только align-items)         |

```css
/* По умолчанию — stretch */
.grid {
  justify-items: stretch;  /* items занимают всю ширину area */
  align-items: stretch;    /* items занимают всю высоту area */
}
```

> **Внимание**: `stretch` работает только если у item **не задан** явный
> `width`/`height`. Если задан — stretch игнорируется.

### 8.4 justify-content / align-content

Выравнивают **grid tracks** внутри grid container, когда tracks **не занимают**
всё пространство container:

```css
.grid {
  display: grid;
  width: 800px;
  height: 600px;
  grid-template-columns: 200px 200px;  /* 400px < 800px */
  grid-template-rows: 150px 150px;     /* 300px < 600px */
  justify-content: center;             /* tracks по центру горизонтально */
  align-content: space-between;        /* tracks по краям вертикально */
}
```

Значения аналогичны Flexbox: `start`, `end`, `center`, `space-between`,
`space-around`, `space-evenly`, `stretch`.

```
justify-content: space-between (2 колонки, контейнер шире):
┌───────────────────────────────────────┐
│┌─────────┐                ┌─────────┐│
││ Col 1   │                │ Col 2   ││
│└─────────┘                └─────────┘│
└───────────────────────────────────────┘
```

### 8.5 justify-self / align-self

Переопределяют `justify-items`/`align-items` для конкретного item:

```css
.grid {
  justify-items: start;
  align-items: start;
}

.centered-item {
  justify-self: center;
  align-self: center;
}

.stretched-item {
  justify-self: stretch;
  align-self: stretch;
}
```

### 8.6 place-* shortcuts

```css
/* place-items = align-items + justify-items */
.grid {
  place-items: center;          /* align-items: center; justify-items: center */
  place-items: start center;    /* align-items: start; justify-items: center */
}

/* place-content = align-content + justify-content */
.grid {
  place-content: center;
  place-content: space-between center;
}

/* place-self = align-self + justify-self */
.item {
  place-self: center;
  place-self: end start;
}
```

### 8.7 Центрирование элемента в Grid

Самый простой способ центрировать элемент:

```css
.grid {
  display: grid;
  place-items: center;
  height: 100vh;
}
```

Или с `place-content`:

```css
.grid {
  display: grid;
  place-content: center;
  height: 100vh;
}
```

Разница: `place-items: center` центрирует items **внутри tracks** (tracks сами
могут быть не по центру), а `place-content: center` центрирует **tracks** в container.

---

## 9. Subgrid

### 9.1 Проблема, которую решает subgrid

Без subgrid вложенные grid containers создают **независимые** сетки — их линии
не совпадают с линиями родителя:

```html
<div class="parent-grid">
  <div class="child-grid">
    <div>A</div>
    <div>B</div>
    <div>C</div>
  </div>
</div>
```

```css
/* Без subgrid: линии child-grid не совпадают с parent-grid */
.parent-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}

.child-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-column: 1 / -1;
  /* Линии НЕЗАВИСИМЫЕ — могут не совпадать с родителем */
}
```

### 9.2 Использование subgrid

```css
.parent-grid {
  display: grid;
  grid-template-columns: 200px 1fr 200px;
  grid-template-rows: auto auto auto;
  gap: 20px;
}

.child-grid {
  display: grid;
  grid-column: 1 / -1;      /* занимает все колонки родителя */
  grid-template-columns: subgrid;  /* НАСЛЕДУЕТ линии колонок от родителя */
  grid-template-rows: subgrid;     /* НАСЛЕДУЕТ линии строк от родителя */
}
```

`subgrid` **наследует** grid lines родителя для соответствующей оси. Можно
использовать `subgrid` только для одной оси:

```css
.child {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: subgrid;  /* наследует колонки */
  grid-template-rows: auto 1fr;    /* собственные строки */
}
```

### 9.3 subgrid и gap

Subgrid **наследует** `gap` от родителя, но может **переопределить** его:

```css
.parent {
  display: grid;
  gap: 20px;
}

.child {
  display: grid;
  grid-template-columns: subgrid;
  gap: 10px; /* переопределяет gap родителя для этого subgrid */
}
```

### 9.4 Практический пример — карточки с выровненными секциями

```html
<div class="card-grid">
  <div class="card">
    <h2>Короткий заголовок</h2>
    <p>Текст...</p>
    <button>Действие</button>
  </div>
  <div class="card">
    <h2>Очень длинный заголовок на несколько строк</h2>
    <p>Текст...</p>
    <button>Действие</button>
  </div>
</div>
```

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  grid-auto-rows: auto auto 1fr auto; /* 4 строки: header, desc, content, button */
  gap: 20px;
}

.card {
  display: grid;
  grid-row: span 4;
  grid-template-rows: subgrid; /* наследует 4 строки от родителя */
  gap: 8px;
  border: 1px solid #ddd;
  padding: 16px;
}
/* Теперь заголовки, тексты и кнопки всех карточек выровнены по одним линиям */
```

### 9.5 Поддержка

Subgrid поддерживается во всех современных браузерах (Chrome 117+, Firefox 71+,
Safari 16+). Для fallback используйте `@supports`:

```css
.child {
  display: grid;
  grid-template-columns: 200px 1fr 200px; /* fallback */
}

@supports (grid-template-columns: subgrid) {
  .child {
    grid-template-columns: subgrid;
  }
}
```

---

## 10. Auto-placement algorithm

### 10.1 Как браузер размещает items

Когда grid items не имеют явного `grid-column`/`grid-row`, браузер размещает их
автоматически по алгоритму auto-placement:

1. **Сначала** размещаются items с **явной** позицией
2. Затем items с **частичной** позицией (только row или только column)
3. Наконец, **auto-placed** items (без позиции)

### 10.2 grid-auto-flow: row (по умолчанию)

```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-flow: row;
}
```

Алгоритм:
1. Начать с позиции (row 1, column 1)
2. Попробовать разместить item
3. Если не помещается (item шире оставшегося места в строке) — перейти на следующую строку
4. Оставшееся пространство в текущей строке остаётся **пустым**

### 10.3 grid-auto-flow: column

```css
.grid {
  display: grid;
  grid-template-rows: repeat(3, 1fr);
  grid-auto-flow: column;
}
```

Items заполняют сетку **по колонкам** — сверху вниз, затем следующая колонка.

### 10.4 dense algorithm

С `dense` алгоритм **возвращается к началу** при поиске места для каждого item:

```css
.grid {
  grid-auto-flow: row dense;
}
```

Без `dense`:
```
Cursor → (никогда не возвращается назад)
```

С `dense`:
```
Для каждого item cursor начинает с (1,1)
```

Это позволяет заполнять «дыры», но меняет визуальный порядок.

### 10.5 Смешивание явного и авто-размещения

```css
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.explicit {
  grid-column: 3 / 5;  /* явно в колонках 3-4 */
  grid-row: 1;
}

/* Остальные items обходят .explicit при auto-placement */
```

---

## 11. Sizing functions — функции размеров

### 11.1 fr (flexible fraction)

```css
.grid {
  grid-template-columns: 1fr 2fr 1fr;
  /* Пропорции: 25% : 50% : 25% свободного пространства */
}
```

`fr` вычисляется **после** фиксированных tracks и gaps:

```css
.grid {
  width: 1200px;
  gap: 20px;
  grid-template-columns: 200px 1fr 2fr;
  /* Свободное = 1200 - 200 - (2 × 20) = 960px */
  /* 1fr = 960 / 3 = 320px */
  /* 2fr = 640px */
}
```

### 11.2 minmax()

```css
grid-template-columns: minmax(min, max);
```

| Пример                   | Минимум     | Максимум          |
| ------------------------ | ----------- | ------------------ |
| `minmax(100px, 1fr)`     | 100px       | Доля свободного    |
| `minmax(auto, 300px)`    | min-content | 300px              |
| `minmax(200px, auto)`    | 200px       | max-content        |
| `minmax(0, 1fr)`         | 0           | Доля свободного    |
| `minmax(min-content, max-content)` | min-content | max-content |

### 11.3 min-content и max-content

```css
.grid {
  grid-template-columns: min-content auto min-content;
}
```

- **`min-content`**: самая узкая возможная ширина без overflow.
  Для текста — ширина самого длинного слова.
- **`max-content`**: ширина, при которой весь контент помещается в одну строку.
  Для текста — ширина текста без переносов.

```
"Hello world, this is a long sentence"

min-content: |sentence|  (самое длинное слово)
max-content: |Hello world, this is a long sentence|  (вся строка)
```

### 11.4 fit-content()

```css
.grid {
  grid-template-columns: fit-content(300px) 1fr;
}
```

`fit-content(limit)` = `min(max-content, max(min-content, limit))`

На практике: track будет по содержимому, но не шире `limit`:

```
Содержимое 200px → track = 200px (max-content < limit)
Содержимое 500px → track = 300px (max-content > limit, обрезается до limit)
```

### 11.5 repeat()

```css
/* Фиксированное повторение */
repeat(3, 1fr)                    /* 1fr 1fr 1fr */
repeat(2, 100px 1fr)              /* 100px 1fr 100px 1fr */
repeat(4, [col] 1fr)              /* [col] 1fr [col] 1fr [col] 1fr [col] 1fr */

/* Авто-повторение */
repeat(auto-fill, minmax(200px, 1fr))
repeat(auto-fit, minmax(200px, 1fr))
```

### 11.6 auto

`auto` в grid tracks ведёт себя как:
- **Минимум**: `min-content` (если нет `align-content`/`justify-content: stretch`)
- **Максимум**: `max-content`

```css
.grid {
  grid-template-columns: auto 1fr auto;
  /* Первая и последняя колонки по содержимому, средняя — остаток */
}
```

При наличии `fr`-tracks, `auto` ведёт себя как `max-content` (т.е. не получает
долю свободного пространства — `fr` забирает всё):

```css
.grid {
  grid-template-columns: auto 1fr;
  /* auto = max-content, 1fr = всё остальное */
}
```

---

## 12. auto-fill vs auto-fit

### 12.1 Общее

Оба значения используются в `repeat()` для создания **адаптивного** количества
колонок (или строк) без media queries:

```css
.grid {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  /* ИЛИ */
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}
```

### 12.2 auto-fill

`auto-fill` создаёт **столько tracks, сколько помещается** в container, даже если
некоторые tracks будут пустыми:

```css
.grid {
  width: 800px;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  /* Помещается 4 колонки по 200px, каждая = 200px */
  /* Если items только 2 → 2 заняты, 2 пустые (но существуют!) */
}
```

```
auto-fill с 2 items в 800px container:
┌──────────┬──────────┬──────────┬──────────┐
│  Item 1  │  Item 2  │ (пусто)  │ (пусто)  │
└──────────┴──────────┴──────────┴──────────┘
  200px      200px      200px      200px
```

### 12.3 auto-fit

`auto-fit` ведёт себя как `auto-fill`, но **схлопывает** (collapses) пустые tracks
до `0px`. Их пространство перераспределяется через `1fr`:

```
auto-fit с 2 items в 800px container:
┌────────────────────┬────────────────────┐
│      Item 1        │      Item 2        │
└────────────────────┴────────────────────┘
       400px                400px
```

### 12.4 Ключевая разница

| Характеристика     | `auto-fill`                              | `auto-fit`                               |
| ------------------- | ---------------------------------------- | ---------------------------------------- |
| Пустые tracks      | Сохраняются (имеют размер)               | Схлопываются до 0                        |
| `1fr` при малом кол-ве items | Делит пространство с пустыми tracks | Items занимают всё пространство           |
| Результат          | Фиксированная ширина колонок             | Items растягиваются на всю ширину         |

### 12.5 Когда что использовать

**`auto-fit`** — когда items должны **растягиваться** на всю ширину:

```css
/* Карточки растягиваются, чтобы заполнить строку */
.card-grid {
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}
```

**`auto-fill`** — когда нужна **фиксированная** ширина колонок:

```css
/* Иконки всегда 100px, даже если строка не заполнена */
.icon-grid {
  grid-template-columns: repeat(auto-fill, 100px);
  justify-content: center;
}
```

### 12.6 auto-fill/auto-fit с minmax

Типичный адаптивный паттерн:

```css
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 20px;
}
```

`min(100%, 300px)` гарантирует, что на очень узких экранах (< 300px) колонка
не будет шире контейнера.

---

## 13. Grid vs Flexbox

### 13.1 Ключевые различия

| Характеристика     | Flexbox                    | Grid                           |
| ------------------- | -------------------------- | ------------------------------ |
| Размерность        | **1D** (одна ось)          | **2D** (строки + колонки)      |
| Подход             | **Content-first**          | **Layout-first**               |
| Направление        | Row ИЛИ column             | Row И column одновременно      |
| Выравнивание       | По одной оси               | По обеим осям                  |
| Перенос строк      | Items решают, когда переносить | Сетка определена заранее     |
| Overlap            | Сложно                     | Легко (items могут перекрываться) |
| Пропуски           | Невозможно                 | Возможно (пустые ячейки)       |

### 13.2 Content-first vs Layout-first

**Flexbox (content-first)**: размер контента определяет раскладку.

```css
.flex-nav {
  display: flex;
  gap: 8px;
}
/* Каждый пункт меню занимает столько места, сколько нужно его тексту */
```

**Grid (layout-first)**: сетка определяется заранее, контент подстраивается.

```css
.grid-dashboard {
  display: grid;
  grid-template-columns: 250px 1fr 300px;
  grid-template-rows: 60px 1fr 40px;
}
/* Раскладка определена: сайдбар, контент, панель — фиксированная структура */
```

### 13.3 Когда использовать Flexbox

- **Навигация** — пункты меню разной ширины
- **Toolbar / action bar** — кнопки и иконки в ряд
- **Media object** — аватар + текст
- **Центрирование** — одного элемента
- **Input groups** — поля ввода с кнопками
- **Распределение пространства** между несколькими items

### 13.4 Когда использовать Grid

- **Page layout** — header, sidebar, content, footer
- **Card grid** — карточки в сетке
- **Dashboard** — виджеты разных размеров
- **Form layout** — labels + inputs в колонках
- **Overlapping elements** — элементы, перекрывающие друг друга
- **Complex alignment** — выравнивание по обеим осям

### 13.5 Совместное использование

Grid и Flexbox отлично дополняют друг друга:

```css
/* Grid для общей раскладки страницы */
.page {
  display: grid;
  grid-template:
    "header header" 60px
    "sidebar content" 1fr
    "footer footer" 40px
    / 250px 1fr;
}

/* Flexbox для навигации внутри header */
.header {
  grid-area: header;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Flexbox для карточки внутри grid */
.card {
  display: flex;
  flex-direction: column;
}
.card__body { flex: 1; }
.card__footer { flex-shrink: 0; }
```

---

## 14. Практические паттерны

### 14.1 Responsive gallery

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
  gap: 16px;
}

.gallery img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 8px;
}
```

Для masonry-подобного эффекта (разная высота):

```css
.gallery-masonry {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  grid-auto-rows: 10px;
  gap: 10px;
}

.gallery-masonry .item--tall {
  grid-row: span 25;
}

.gallery-masonry .item--medium {
  grid-row: span 20;
}

.gallery-masonry .item--short {
  grid-row: span 15;
}
```

> **Настоящий masonry layout**: CSS Working Group разрабатывает нативный
> masonry (`grid-template-rows: masonry`), который экспериментально доступен
> в Firefox. Пока он не стандартизирован, для настоящего masonry используйте
> JavaScript-библиотеки.

### 14.2 Dashboard layout

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: minmax(150px, auto);
  gap: 16px;
  padding: 16px;
}

.widget--wide {
  grid-column: span 2;
}

.widget--tall {
  grid-row: span 2;
}

.widget--large {
  grid-column: span 2;
  grid-row: span 2;
}

.widget--full {
  grid-column: 1 / -1;
}
```

Responsive dashboard:

```css
@media (max-width: 1024px) {
  .dashboard {
    grid-template-columns: repeat(2, 1fr);
  }
  .widget--wide {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .dashboard {
    grid-template-columns: 1fr;
  }
  .widget--wide,
  .widget--large {
    grid-column: auto;
    grid-row: auto;
  }
}
```

### 14.3 Magazine layout

```css
.magazine {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: minmax(100px, auto);
  gap: 16px;
}

.article--featured {
  grid-column: 1 / 5;
  grid-row: 1 / 3;
}

.article--sidebar {
  grid-column: 5 / 7;
}

.article--half {
  grid-column: span 3;
}

.article--third {
  grid-column: span 2;
}

.article--full {
  grid-column: 1 / -1;
}
```

### 14.4 Overlapping elements

Grid позволяет размещать items в одних и тех же ячейках — они будут перекрываться:

```css
.hero {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 400px;
}

.hero > * {
  grid-column: 1;
  grid-row: 1;
}

.hero__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero__overlay {
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  z-index: 1;
}

.hero__text {
  z-index: 2;
  align-self: end;
  padding: 32px;
  color: white;
}
```

### 14.5 Full-bleed layout

Паттерн, когда контент ограничен шириной, но некоторые элементы выходят
на всю ширину viewport:

```css
.full-bleed-layout {
  display: grid;
  grid-template-columns:
    [full-start] 1fr
    [content-start] min(65ch, 100% - 4rem)
    [content-end] 1fr
    [full-end];
}

.full-bleed-layout > * {
  grid-column: content;
}

.full-bleed-layout > .full-width {
  grid-column: full;
}

.full-bleed-layout > .wide {
  grid-column: full;
  max-width: 90rem;
  margin-inline: auto;
  width: 100%;
}
```

```html
<div class="full-bleed-layout">
  <h1>Обычный контент (65ch ширина)</h1>
  <p>Текст ограничен шириной...</p>
  <img class="full-width" src="hero.jpg" alt="">  <!-- на всю ширину -->
  <p>Снова ограниченный контент...</p>
  <div class="wide">Широкий блок, но не полная ширина</div>
</div>
```

### 14.6 Holy Grail с Grid

```css
.page {
  display: grid;
  grid-template:
    "header  header  header"  auto
    "nav     main    aside"   1fr
    "footer  footer  footer"  auto
    / 200px   1fr     200px;
  min-height: 100vh;
  gap: 0;
}

.page > header  { grid-area: header; }
.page > nav     { grid-area: nav; }
.page > main    { grid-area: main; }
.page > aside   { grid-area: aside; }
.page > footer  { grid-area: footer; }

@media (max-width: 768px) {
  .page {
    grid-template:
      "header"  auto
      "nav"     auto
      "main"    1fr
      "aside"   auto
      "footer"  auto
      / 1fr;
  }
}
```

### 14.7 Responsive card grid с consistent heights

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: 24px;
}

/* С subgrid для выравнивания секций карточек */
.card {
  display: grid;
  grid-template-rows: auto 1fr auto; /* title, content, footer */
  gap: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 12px;
  padding: 20px;
}

/* Без subgrid — fallback */
.card__title {
  /* Высота определяется содержимым */
}

.card__body {
  /* flex: 1 аналог */
}

.card__footer {
  margin-top: auto; /* если используем flex внутри */
}
```

### 14.8 RAM (Repeat, Auto, Minmax) паттерн

```css
/* Универсальный адаптивный grid без media queries */
.ram {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, var(--min-size, 250px)), 1fr));
  gap: var(--gap, 16px);
}
```

Использование:

```html
<div class="ram" style="--min-size: 300px; --gap: 24px;">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
</div>
```

### 14.9 Pancake Stack

Паттерн header-main-footer, где footer всегда внизу:

```css
.pancake {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}
```

### 14.10 Sidebar layout (auto-sizing)

```css
.with-sidebar {
  display: grid;
  grid-template-columns: fit-content(300px) 1fr;
  gap: 24px;
}

/* Или с минимальной шириной контента */
.with-sidebar-safe {
  display: grid;
  grid-template-columns: minmax(200px, 300px) minmax(0, 1fr);
  gap: 24px;
}
```

### 14.11 12-column grid system

Воссоздание Bootstrap-подобной системы на CSS Grid:

```css
.row {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 16px;
}

.col-1  { grid-column: span 1; }
.col-2  { grid-column: span 2; }
.col-3  { grid-column: span 3; }
.col-4  { grid-column: span 4; }
.col-5  { grid-column: span 5; }
.col-6  { grid-column: span 6; }
.col-7  { grid-column: span 7; }
.col-8  { grid-column: span 8; }
.col-9  { grid-column: span 9; }
.col-10 { grid-column: span 10; }
.col-11 { grid-column: span 11; }
.col-12 { grid-column: span 12; }

/* Offset */
.offset-1  { grid-column-start: 2; }
.offset-2  { grid-column-start: 3; }
.offset-3  { grid-column-start: 4; }
/* ... */

@media (max-width: 768px) {
  .col-md-6  { grid-column: span 6; }
  .col-md-12 { grid-column: span 12; }
}

@media (max-width: 480px) {
  .row > * { grid-column: 1 / -1; } /* все на полную ширину */
}
```

### 14.12 Сводная таблица свойств grid container

| Свойство                    | Описание                                  | По умолчанию |
| --------------------------- | ----------------------------------------- | ------------ |
| `display`                   | `grid` / `inline-grid`                    | —            |
| `grid-template-columns`     | Определение явных колонок                 | `none`       |
| `grid-template-rows`        | Определение явных строк                   | `none`       |
| `grid-template-areas`       | Именованные области                       | `none`       |
| `grid-template`             | Shorthand для template-*                  | —            |
| `grid-auto-columns`         | Размер неявных колонок                    | `auto`       |
| `grid-auto-rows`            | Размер неявных строк                      | `auto`       |
| `grid-auto-flow`            | Алгоритм авто-размещения                  | `row`        |
| `gap` / `row-gap` / `column-gap` | Отступы между tracks                | `0`          |
| `justify-items`             | Выравнивание items по inline axis         | `stretch`    |
| `align-items`               | Выравнивание items по block axis          | `stretch`    |
| `justify-content`           | Выравнивание tracks по inline axis        | `start`      |
| `align-content`             | Выравнивание tracks по block axis         | `start`      |
| `place-items`               | Shorthand: align-items + justify-items    | —            |
| `place-content`             | Shorthand: align-content + justify-content | —           |

### 14.13 Сводная таблица свойств grid item

| Свойство             | Описание                          | По умолчанию |
| -------------------- | --------------------------------- | ------------ |
| `grid-column-start`  | Начальная вертикальная линия      | `auto`       |
| `grid-column-end`    | Конечная вертикальная линия       | `auto`       |
| `grid-row-start`     | Начальная горизонтальная линия    | `auto`       |
| `grid-row-end`       | Конечная горизонтальная линия     | `auto`       |
| `grid-column`        | Shorthand: start / end            | —            |
| `grid-row`           | Shorthand: start / end            | —            |
| `grid-area`          | Shorthand или имя области         | —            |
| `justify-self`       | Выравнивание по inline axis       | `stretch`    |
| `align-self`         | Выравнивание по block axis        | `stretch`    |
| `place-self`         | Shorthand: align-self + justify-self | —         |
| `order`              | Порядок авто-размещения           | `0`          |

### 14.14 Рекомендации по производительности

1. **Избегайте чрезмерного использования `auto-fit`/`auto-fill`** на очень
   большом количестве items (сотни) — каждый reflow пересчитывает количество tracks.

2. **`contain: layout`** на grid container помогает изолировать layout recalculations:

```css
.grid {
  display: grid;
  contain: layout;
}
```

3. **`content-visibility: auto`** на grid items для виртуализации off-screen контента:

```css
.grid-item {
  content-visibility: auto;
  contain-intrinsic-size: 300px 200px; /* предполагаемый размер */
}
```

4. **Предпочитайте `grid-template-areas`** для статических раскладок — браузеру
   проще оптимизировать известную заранее структуру.

5. **Минимизируйте span** на large grids — items, которые span через много
   tracks, усложняют алгоритм размещения.

---

> **Итог**: CSS Grid — самый мощный инструмент для создания двумерных раскладок.
> Ключевые концепции: **explicit vs implicit grid**, **fr и minmax для адаптивности**,
> **auto-fill/auto-fit для responsive без media queries**, и **subgrid для
> наследования линий**. В комбинации с Flexbox, Grid покрывает практически
> любые потребности в раскладке без использования CSS-фреймворков.
