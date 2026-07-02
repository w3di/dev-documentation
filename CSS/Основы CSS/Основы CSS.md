# Основы CSS — глубокое погружение

## Содержание

1. [Что такое CSS](#1-что-такое-css)
2. [Способы подключения стилей](#2-способы-подключения-стилей)
3. [CSS-переменные (Custom Properties)](#3-css-переменные-custom-properties)
4. [CSS Reset vs Normalize](#4-css-reset-vs-normalize)
5. [Синтаксис CSS](#5-синтаксис-css)
6. [Единицы измерения](#6-единицы-измерения)
7. [CSS Functions](#7-css-functions)
8. [At-rules](#8-at-rules)
9. [Наследование](#9-наследование)
10. [Вычисление значений](#10-вычисление-значений)

---

## 1. Что такое CSS

### 1.1 Определение и история

**CSS (Cascading Style Sheets)** — формальный язык описания внешнего вида документа, написанного с использованием языка разметки. CSS был предложен Хоконом Виумом Ли (Håkon Wium Lie) в 1994 году и стандартизирован W3C.

Ключевые вехи:
- **CSS1 (1996)** — базовые свойства шрифтов, цветов, отступов
- **CSS2 (1998)** — позиционирование, z-index, media types
- **CSS2.1 (2011)** — исправления и уточнения CSS2
- **CSS3 (модульная архитектура)** — спецификация разделена на независимые модули

### 1.2 CSS Working Group (CSSWG)

CSS Working Group — рабочая группа в рамках W3C, ответственная за разработку спецификаций CSS. В неё входят представители крупнейших браузерных вендоров (Google, Mozilla, Apple, Microsoft), а также независимые эксперты.

Процесс стандартизации CSS-модуля проходит через несколько этапов:

| Этап | Название | Описание |
|------|----------|----------|
| 1 | Working Draft (WD) | Первый публичный черновик |
| 2 | Candidate Recommendation (CR) | Готов к реализации в браузерах |
| 3 | Proposed Recommendation (PR) | Финальная проверка перед принятием |
| 4 | Recommendation (REC) | Официальный стандарт W3C |

### 1.3 Модульная архитектура спецификации

Начиная с CSS3, спецификация разделена на **независимые модули**, каждый из которых развивается в своём темпе. Нет единой «CSS4» — есть отдельные модули разных уровней:

- **CSS Selectors Level 4** — новые селекторы (:has(), :is(), :where())
- **CSS Grid Layout Level 2** — subgrid
- **CSS Color Level 4** — lch(), oklch(), color-mix()
- **CSS Containment Level 3** — container queries
- **CSS Cascade Level 6** — @scope

> **Важно:** Термин «CSS3» технически некорректен для современных возможностей. Правильнее говорить о конкретных модулях и их уровнях (levels).

Каждый модуль имеет свою нумерацию уровней:
- **Level 1** — полностью новый модуль (например, CSS Containment Level 1)
- **Level 3+** — продолжение спецификации CSS2.1 (например, CSS Selectors Level 4)

---

## 2. Способы подключения стилей

### 2.1 External Stylesheet (внешний файл)

Наиболее предпочтительный способ. Файл `.css` подключается через элемент `<link>`:

```html
<link rel="stylesheet" href="styles.css">
```

Расширенный синтаксис с атрибутами:

```html
<!-- Медиа-зависимое подключение -->
<link rel="stylesheet" href="print.css" media="print">
<link rel="stylesheet" href="mobile.css" media="(max-width: 768px)">

<!-- Предзагрузка критического CSS -->
<link rel="preload" href="critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'">

<!-- Подключение с integrity для CDN -->
<link rel="stylesheet" href="https://cdn.example.com/lib.css"
      integrity="sha384-..." crossorigin="anonymous">
```

**Преимущества:**
- Кэширование браузером
- Повторное использование на разных страницах
- Разделение ответственности (separation of concerns)
- Параллельная загрузка нескольких файлов

### 2.2 Internal Stylesheet (внутренний стиль)

Стили объявляются внутри `<style>` в `<head>`:

```html
<head>
  <style>
    body {
      margin: 0;
      font-family: system-ui, sans-serif;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
  </style>
</head>
```

**Когда оправдано:**
- Critical CSS (критический CSS для first paint)
- Одностраничные приложения с изолированными стилями
- Email-вёрстка (многие email-клиенты не поддерживают external)

### 2.3 Inline Styles (инлайн-стили)

Стили назначаются непосредственно элементу через атрибут `style`:

```html
<div style="color: red; font-size: 16px;">Текст</div>
```

**Специфичность:** Inline-стили имеют специфичность `1-0-0-0` (выше, чем любой селектор, но ниже `!important`).

**Когда оправдано:**
- Динамические стили, устанавливаемые через JavaScript
- Email-вёрстка
- CSS-in-JS библиотеки (под капотом)

> **Антипаттерн:** Массовое использование inline-стилей в HTML — нарушает принцип DRY и затрудняет поддержку.

### 2.4 @import

Импорт стилей внутри CSS-файла:

```css
/* В начале CSS-файла */
@import url("reset.css");
@import url("typography.css") screen;
@import url("print.css") print;

/* CSS Layers с @import */
@import url("framework.css") layer(framework);
@import url("overrides.css") layer(overrides);
```

> **Критичная проблема производительности:** `@import` создаёт водопад (waterfall) HTTP-запросов. Браузер не может начать загрузку импортируемого файла, пока не скачает и не распарсит родительский файл. Цепочка `@import` может вызвать серьёзную задержку рендеринга.

```css
/* ПЛОХО: waterfall из 3 последовательных запросов */
/* main.css: */
@import url("a.css");

/* a.css: */
@import url("b.css");

/* b.css: */
@import url("c.css");
```

**Рекомендация:** Используйте `<link>` вместо `@import` для подключения внешних файлов. `@import` допустим для CSS Layers и внутри сборщиков (webpack, Vite), которые объединяют файлы на этапе сборки.

### 2.5 Приоритеты подключения

Порядок приоритетов (от низшего к высшему):
1. User-agent stylesheet (стили браузера по умолчанию)
2. User stylesheet (пользовательские стили, accessibility)
3. Author external/internal stylesheet (в порядке появления)
4. Author inline styles
5. Author `!important`
6. User `!important`
7. User-agent `!important`

> **Примечание:** С появлением `@layer` порядок приоритетов стал более гранулярным (подробнее в разделе каскадности).

---

## 3. CSS-переменные (Custom Properties)

### 3.1 Объявление и использование

CSS Custom Properties (кастомные свойства) объявляются с префиксом `--` и используются через функцию `var()`:

```css
:root {
  --color-primary: #3b82f6;
  --color-secondary: #10b981;
  --spacing-unit: 8px;
  --font-base: 16px;
  --border-radius: 4px;
}

.button {
  background-color: var(--color-primary);
  padding: calc(var(--spacing-unit) * 2) calc(var(--spacing-unit) * 3);
  border-radius: var(--border-radius);
  font-size: var(--font-base);
}
```

### 3.2 Наследование и scope

Custom Properties **наследуются** по дереву DOM, как и обычные наследуемые свойства:

```css
:root {
  --text-color: black;
}

.dark-theme {
  --text-color: white;
}

.card {
  color: var(--text-color); /* Получит значение от ближайшего предка */
}
```

**Scope (область видимости)** определяется селектором, в котором объявлена переменная:

```css
/* Глобальная область видимости */
:root {
  --global-var: blue;
}

/* Локальная область видимости */
.component {
  --local-var: red;
}

/* --local-var доступна только внутри .component и его потомков */
.another-component {
  color: var(--local-var); /* НЕ сработает — будет использован fallback или initial */
}
```

### 3.3 Fallback-значения

Функция `var()` принимает второй аргумент — fallback-значение:

```css
.element {
  /* Простой fallback */
  color: var(--text-color, black);

  /* Вложенный fallback — переменная как fallback */
  background: var(--bg-special, var(--bg-default, white));

  /* Fallback может содержать запятые (всё после первой запятой) */
  font-family: var(--font-stack, "Helvetica Neue", Arial, sans-serif);
}
```

> **Тонкость:** Если переменная объявлена, но имеет невалидное значение для данного свойства, fallback НЕ используется. Свойство получает initial value.

```css
:root {
  --color: 42px; /* Объявлена, но невалидна для color */
}

.element {
  color: var(--color, red); /* Fallback "red" НЕ будет использован! */
  /* color получит значение "initial" (обычно чёрный), а не "red" */
}
```

Это называется **guaranteed-invalid value** — переменная существует, но значение невалидно в контексте свойства.

### 3.4 Динамическое изменение через JavaScript

Custom Properties — живые значения, изменяемые через JS в реальном времени:

```javascript
// Установка переменной на :root
document.documentElement.style.setProperty('--color-primary', '#ef4444');

// Установка на конкретный элемент
element.style.setProperty('--local-spacing', '20px');

// Чтение текущего значения
const value = getComputedStyle(element).getPropertyValue('--color-primary');

// Удаление переменной
element.style.removeProperty('--color-primary');
```

Практический пример — слежение за курсором:

```css
.card {
  --mouse-x: 0;
  --mouse-y: 0;
  background: radial-gradient(
    circle at calc(var(--mouse-x) * 1px) calc(var(--mouse-y) * 1px),
    rgba(255, 255, 255, 0.15),
    transparent 40%
  );
}
```

```javascript
document.querySelector('.card').addEventListener('mousemove', (e) => {
  const rect = e.target.getBoundingClientRect();
  e.target.style.setProperty('--mouse-x', e.clientX - rect.left);
  e.target.style.setProperty('--mouse-y', e.clientY - rect.top);
});
```

### 3.5 @property — типизированные Custom Properties

`@property` позволяет определять Custom Properties с типом, начальным значением и правилами наследования:

```css
@property --rotation {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

@property --color-start {
  syntax: '<color>';
  initial-value: #3b82f6;
  inherits: true;
}

@property --progress {
  syntax: '<number>';
  initial-value: 0;
  inherits: false;
}
```

**Главное преимущество** — возможность анимировать Custom Properties:

```css
@property --gradient-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

.animated-gradient {
  background: linear-gradient(var(--gradient-angle), #3b82f6, #ef4444);
  transition: --gradient-angle 0.5s ease;
}

.animated-gradient:hover {
  --gradient-angle: 180deg;
}
```

Без `@property` браузер не знает тип переменной и не может интерполировать её значение, поэтому `transition` и `animation` не работают с обычными Custom Properties.

**Поддерживаемые типы `syntax`:**

| Тип | Пример |
|-----|--------|
| `<length>` | `16px`, `2em` |
| `<number>` | `0.5`, `42` |
| `<percentage>` | `50%` |
| `<color>` | `#ff0000`, `rgb(...)` |
| `<angle>` | `45deg`, `0.25turn` |
| `<time>` | `300ms`, `1s` |
| `<image>` | `url(...)`, `linear-gradient(...)` |
| `<url>` | `url(...)` |
| `<integer>` | `1`, `42` |
| `<length-percentage>` | `50%`, `20px` |
| `<custom-ident>` | Произвольный идентификатор |
| `<transform-function>` | `rotate(45deg)` |
| `*` | Любое значение |

Комбинации: `<length> | <percentage>`, `<color>#` (список через запятую).

---

## 4. CSS Reset vs Normalize

### 4.1 CSS Reset

CSS Reset полностью сбрасывает стили браузера по умолчанию. Классический пример — Reset CSS от Эрика Мейера:

```css
/* Классический CSS Reset (Eric Meyer, упрощённая версия) */
html, body, div, span, applet, object, iframe,
h1, h2, h3, h4, h5, h6, p, blockquote, pre,
a, abbr, acronym, address, big, cite, code,
del, dfn, em, img, ins, kbd, q, s, samp,
small, strike, strong, sub, sup, tt, var,
b, u, i, center,
dl, dt, dd, ol, ul, li,
fieldset, form, label, legend,
table, caption, tbody, tfoot, thead, tr, th, td,
article, aside, canvas, details, embed,
figure, figcaption, footer, header, hgroup,
menu, nav, output, ruby, section, summary,
time, mark, audio, video {
  margin: 0;
  padding: 0;
  border: 0;
  font-size: 100%;
  font: inherit;
  vertical-align: baseline;
}
```

**Проблемы:**
- Удаляет полезные стили (списки теряют маркеры)
- Заставляет переопределять всё с нуля
- Избыточный CSS

### 4.2 Normalize.css

Normalize.css **не сбрасывает**, а **нормализует** стили браузера, устраняя различия между браузерами:

```css
/* Из normalize.css v8.0.1 (фрагмент) */
html {
  line-height: 1.15;
  -webkit-text-size-adjust: 100%;
}
body {
  margin: 0;
}
main {
  display: block; /* Для IE */
}
h1 {
  font-size: 2em;
  margin: 0.67em 0;
}
```

**Преимущества:**
- Сохраняет полезные стили по умолчанию
- Исправляет баги и несоответствия между браузерами
- Хорошо документирован (комментарии объясняют каждое правило)

### 4.3 Modern CSS Reset

Современный подход — минимальный reset, решающий реальные проблемы:

```css
/* Modern CSS Reset — Andy Bell (адаптация) */

/* Box sizing */
*,
*::before,
*::after {
  box-sizing: border-box;
}

/* Сброс отступов */
* {
  margin: 0;
  padding: 0;
}

/* Предотвращение переполнения текста */
body {
  min-height: 100vh;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* Улучшение отображения медиа */
img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}

/* Наследование шрифтов для форм */
input,
button,
textarea,
select {
  font: inherit;
}

/* Предотвращение переполнения текста */
p,
h1,
h2,
h3,
h4,
h5,
h6 {
  overflow-wrap: break-word;
}

/* Создание stacking context для корневого элемента */
#root,
#__next {
  isolation: isolate;
}
```

### 4.4 Box-sizing Reset

Один из самых важных reset-правил:

```css
/* Рекомендуемый подход */
html {
  box-sizing: border-box;
}

*,
*::before,
*::after {
  box-sizing: inherit;
}
```

> **Почему `inherit`, а не `border-box` напрямую?** Это позволяет компонентам при необходимости менять `box-sizing` для себя и своих потомков, переопределив значение на своём уровне.

---

## 5. Синтаксис CSS

### 5.1 Структура правила (Rule)

```css
selector {
  property: value;
}
```

CSS-правило состоит из:
- **Селектор (selector)** — определяет, к каким элементам применяется правило
- **Блок объявлений (declaration block)** — заключён в фигурные скобки `{}`
- **Объявление (declaration)** — пара `свойство: значение;`
- **Свойство (property)** — характеристика, которую нужно изменить
- **Значение (value)** — устанавливаемое значение свойства

### 5.2 Селекторы

Селектор может быть простым или составным:

```css
/* Простые селекторы */
div { }            /* Type selector */
.class { }         /* Class selector */
#id { }            /* ID selector */
* { }              /* Universal selector */
[attr] { }         /* Attribute selector */

/* Составные селекторы */
div.active { }           /* Без пробела — оба условия на одном элементе */
div .active { }          /* С пробелом — descendant combinator */
div > .active { }        /* Child combinator */
div + .active { }        /* Adjacent sibling combinator */
div ~ .active { }        /* General sibling combinator */

/* Группировка селекторов */
h1, h2, h3 { }           /* Список селекторов */
```

### 5.3 Shorthand vs Longhand Properties

**Shorthand** (сокращённые) свойства объединяют несколько longhand-свойств:

```css
/* Longhand */
margin-top: 10px;
margin-right: 20px;
margin-bottom: 10px;
margin-left: 20px;

/* Shorthand эквивалент */
margin: 10px 20px;

/* Shorthand сбрасывает неуказанные longhand в initial! */
background-color: red;
background-image: url(bg.png);
background: blue; /* ВНИМАНИЕ: background-image сбросится в none! */
```

> **Gotcha:** Shorthand-свойства всегда сбрасывают неуказанные sub-properties в их `initial` значения. Это частая причина «потерянных» стилей.

Основные shorthand-свойства и их longhand-составляющие:

| Shorthand | Longhand-свойства |
|-----------|-------------------|
| `margin` | `margin-top`, `margin-right`, `margin-bottom`, `margin-left` |
| `padding` | `padding-top`, `padding-right`, `padding-bottom`, `padding-left` |
| `border` | `border-width`, `border-style`, `border-color` |
| `background` | `background-color`, `background-image`, `background-position`, `background-size`, `background-repeat`, `background-origin`, `background-clip`, `background-attachment` |
| `font` | `font-style`, `font-variant`, `font-weight`, `font-stretch`, `font-size`, `line-height`, `font-family` |
| `animation` | `animation-name`, `animation-duration`, `animation-timing-function`, `animation-delay`, `animation-iteration-count`, `animation-direction`, `animation-fill-mode`, `animation-play-state` |
| `transition` | `transition-property`, `transition-duration`, `transition-timing-function`, `transition-delay` |
| `flex` | `flex-grow`, `flex-shrink`, `flex-basis` |
| `grid` | `grid-template-rows`, `grid-template-columns`, `grid-template-areas`, `grid-auto-rows`, `grid-auto-columns`, `grid-auto-flow` |
| `place-items` | `align-items`, `justify-items` |
| `gap` | `row-gap`, `column-gap` |
| `inset` | `top`, `right`, `bottom`, `left` |

### 5.4 Комментарии

```css
/* Однострочный комментарий */

/*
 * Многострочный комментарий
 * используется для документации
 */

/* // Это НЕ валидный CSS-комментарий (нет однострочных комментариев в CSS) */
```

> **Примечание:** В отличие от JavaScript и многих других языков, CSS не поддерживает однострочные комментарии `//`. Однако некоторые препроцессоры (Sass, Less) их поддерживают.

---

## 6. Единицы измерения

### 6.1 Абсолютные единицы

Абсолютные единицы имеют фиксированный размер и не зависят от других значений:

| Единица | Описание | Соотношение |
|---------|----------|-------------|
| `px` | Пиксель (CSS-пиксель, не физический) | 1px = 1/96 дюйма |
| `pt` | Пункт | 1pt = 1/72 дюйма |
| `pc` | Пика | 1pc = 12pt |
| `cm` | Сантиметр | 1cm = 96px / 2.54 |
| `mm` | Миллиметр | 1mm = 1/10 cm |
| `in` | Дюйм | 1in = 96px |
| `Q` | Четверть миллиметра | 1Q = 1/4 mm |

> **Важно:** CSS-пиксель (`1px`) не равен физическому пикселю экрана. На Retina-дисплеях (device pixel ratio = 2) один CSS-пиксель соответствует 4 физическим пикселям (2x2). Значение `window.devicePixelRatio` в JavaScript показывает соотношение.

### 6.2 Относительные единицы — шрифтовые

| Единица | Относительно | Описание |
|---------|-------------|----------|
| `em` | `font-size` родителя (для font-size) или самого элемента (для других свойств) | Распространённая единица |
| `rem` | `font-size` корневого элемента (`<html>`) | Предсказуемая, не зависит от вложенности |
| `ch` | Ширина символа `0` (zero) текущего шрифта | Полезно для ширины текстовых полей |
| `ex` | Высота строчной буквы `x` текущего шрифта | Редко используется |
| `cap` | Высота заглавной буквы текущего шрифта | Экспериментальная |
| `ic` | Ширина иероглифа `水` | Для CJK-типографики |
| `lh` | Значение `line-height` элемента | Относительно line-height |
| `rlh` | Значение `line-height` корневого элемента | Глобальный line-height |

```css
/* em — рекурсивное наследование (проблема) */
.parent { font-size: 1.2em; }      /* 1.2 * 16px = 19.2px */
.parent .child { font-size: 1.2em; } /* 1.2 * 19.2px = 23.04px — каскадный эффект! */

/* rem — предсказуемое поведение */
.parent { font-size: 1.2rem; }      /* 1.2 * 16px = 19.2px */
.parent .child { font-size: 1.2rem; } /* 1.2 * 16px = 19.2px — одинаково */

/* ch — ограничение ширины текста */
.prose {
  max-width: 65ch; /* Оптимальная длина строки для чтения */
}
```

### 6.3 Относительные единицы — viewport

| Единица | Описание |
|---------|----------|
| `vw` | 1% ширины viewport |
| `vh` | 1% высоты viewport |
| `vmin` | 1% меньшего из vw/vh |
| `vmax` | 1% большего из vw/vh |
| `vi` | 1% inline-размера viewport (зависит от writing-mode) |
| `vb` | 1% block-размера viewport |

**Новые viewport-единицы (для мобильных браузеров):**

| Единица | Описание |
|---------|----------|
| `svh`, `svw` | Small viewport — viewport с видимым UI браузера (адресная строка) |
| `lvh`, `lvw` | Large viewport — viewport без UI браузера |
| `dvh`, `dvw` | Dynamic viewport — автоматически адаптируется при показе/скрытии UI |

```css
/* Проблема: 100vh на мобильных включает скрытую адресную строку */
.hero-old {
  height: 100vh; /* На мобильных контент может быть обрезан */
}

/* Решение: dvh динамически адаптируется */
.hero-modern {
  height: 100dvh; /* Всегда заполняет видимую область */
}

/* Fallback для старых браузеров */
.hero {
  height: 100vh;
  height: 100dvh;
}
```

### 6.4 Container-relative единицы

| Единица | Описание |
|---------|----------|
| `cqw` | 1% ширины контейнера |
| `cqh` | 1% высоты контейнера |
| `cqi` | 1% inline-размера контейнера |
| `cqb` | 1% block-размера контейнера |
| `cqmin` | Меньшее из cqi/cqb |
| `cqmax` | Большее из cqi/cqb |

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}

.card-title {
  font-size: clamp(1rem, 4cqi, 2rem); /* Размер зависит от контейнера */
}
```

### 6.5 Единица `fr` (fraction)

Используется исключительно в CSS Grid для распределения свободного пространства:

```css
.grid {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr; /* 25% - 50% - 25% от свободного пространства */
}

/* fr учитывает только свободное пространство */
.grid-mixed {
  display: grid;
  /* 200px фиксированно, остальное делится 1:2 */
  grid-template-columns: 200px 1fr 2fr;
}
```

---

## 7. CSS Functions

### 7.1 calc()

Выполняет математические вычисления с разными единицами:

```css
.element {
  /* Смешивание единиц */
  width: calc(100% - 60px);
  padding: calc(1rem + 5px);

  /* Вложенные вычисления */
  margin: calc(var(--spacing) * 2);

  /* Все четыре операции */
  width: calc(100vw / 3 - 20px + 1rem);
}
```

**Правила `calc()`:**
- Операторы `+` и `-` обязательно окружаются пробелами
- `*` и `/` не требуют пробелов, но рекомендуются для читаемости
- Деление на ноль приводит к ошибке
- Можно вкладывать `calc()` в `calc()`, но это избыточно

```css
/* ОШИБКА: нет пробелов вокруг + */
width: calc(100%-60px); /* Не сработает! */

/* ПРАВИЛЬНО */
width: calc(100% - 60px);
```

### 7.2 min(), max(), clamp()

```css
/* min() — возвращает наименьшее значение */
.container {
  width: min(90%, 1200px); /* Не шире 1200px, но занимает 90% при малом экране */
}

/* max() — возвращает наибольшее значение */
.sidebar {
  width: max(200px, 25%); /* Не уже 200px */
}

/* clamp(min, preferred, max) — значение в диапазоне */
.title {
  font-size: clamp(1rem, 2.5vw, 3rem);
  /* Минимум 1rem, предпочтительно 2.5vw, максимум 3rem */
}
```

> **Полезно:** `clamp()` — идеальный инструмент для fluid typography (плавно масштабируемой типографики) без медиа-запросов.

```css
/* Fluid typography */
h1 {
  font-size: clamp(1.5rem, 1rem + 3vw, 4rem);
}

/* Fluid spacing */
.section {
  padding: clamp(1rem, 5vw, 4rem);
}
```

### 7.3 var()

Подробно описана в разделе 3 (CSS-переменные). Краткий пример:

```css
.element {
  color: var(--text-color, #333);
  margin: var(--spacing-md, 16px);
}
```

### 7.4 attr()

Извлекает значение атрибута HTML-элемента. В CSS Level 4 планируется поддержка типов, но пока работает только со строковым значением в `content`:

```css
/* Работает — строковое значение в content */
.tooltip::after {
  content: attr(data-tooltip);
}

a[href^="http"]::after {
  content: " (" attr(href) ")";
}

/* CSS Level 4 (пока мало поддерживается) */
/* .element { width: attr(data-width px, 100px); } */
```

### 7.5 url()

Загружает внешние ресурсы:

```css
.element {
  background-image: url("images/bg.png");
  background-image: url(images/bg.png);   /* Кавычки необязательны */
  background-image: url('images/bg.png'); /* Одинарные тоже допустимы */

  /* Data URI */
  background-image: url("data:image/svg+xml,%3Csvg%20...");

  /* Шрифты */
  /* Используется в @font-face */
}
```

### 7.6 env()

Доступ к переменным окружения (environment variables), определяемым user-agent:

```css
/* Безопасные зоны экрана (notch на iPhone и т.д.) */
.content {
  padding-top: env(safe-area-inset-top);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
}

/* С fallback */
.content {
  padding-top: env(safe-area-inset-top, 20px);
}

/* Использование с calc() */
.header {
  height: calc(60px + env(safe-area-inset-top));
}
```

> **Важно:** Для работы `env()` с safe-area-inset на iOS необходим мета-тег:
> `<meta name="viewport" content="viewport-fit=cover">`

### 7.7 Математические функции (дополнительные)

```css
/* round() — округление */
width: round(2.5px); /* 3px */
width: round(nearest, 25px, 10px); /* 30px — ближайшее кратное 10 */
width: round(down, 25px, 10px); /* 20px — вниз до кратного 10 */
width: round(up, 25px, 10px); /* 30px — вверх до кратного 10 */

/* mod() — остаток от деления */
width: mod(18px, 5px); /* 3px */

/* rem() — remainder */
width: rem(18px, 5px); /* 3px */

/* abs() — модуль */
width: abs(-10px); /* 10px */

/* sign() — знак числа (-1, 0, 1) */
margin-left: calc(sign(var(--x)) * 20px);

/* sin(), cos(), tan(), asin(), acos(), atan(), atan2() */
transform: rotate(atan2(1, 1)); /* 45deg */

/* sqrt(), pow(), hypot(), log(), exp() */
width: calc(sqrt(2) * 100px);
```

---

## 8. At-rules

### 8.1 @import

```css
@import url("styles.css");
@import url("print.css") print;
@import url("mobile.css") (max-width: 768px);
@import url("framework.css") layer(framework);
@import url("dark.css") (prefers-color-scheme: dark);

/* Условия можно комбинировать */
@import url("responsive.css") screen and (min-width: 1024px);

/* Supports condition */
@import url("grid.css") supports(display: grid);
```

> **Правило:** `@import` должен находиться в начале файла, до любых других правил (кроме `@charset` и `@layer`).

### 8.2 @media

```css
/* Типы медиа */
@media screen { }
@media print { }
@media all { }       /* По умолчанию */

/* Медиа-характеристики */
@media (max-width: 768px) { }
@media (min-width: 1024px) { }
@media (hover: hover) { }
@media (pointer: fine) { }
@media (prefers-color-scheme: dark) { }
@media (prefers-reduced-motion: reduce) { }
@media (prefers-contrast: more) { }
@media (orientation: landscape) { }
@media (display-mode: standalone) { } /* PWA */

/* Логические операторы */
@media screen and (min-width: 768px) and (max-width: 1024px) { }
@media (min-width: 768px), (orientation: landscape) { } /* OR */
@media not print { }

/* Range syntax (Level 4) */
@media (768px <= width <= 1024px) { }
@media (width >= 1024px) { }
@media (width < 768px) { }
```

### 8.3 @supports

Feature queries — проверка поддержки CSS-свойств:

```css
/* Проверка поддержки свойства */
@supports (display: grid) {
  .container {
    display: grid;
  }
}

/* Проверка нескольких свойств */
@supports (display: grid) and (gap: 1rem) {
  .grid { display: grid; gap: 1rem; }
}

/* Логический NOT */
@supports not (display: grid) {
  .container { display: flex; }
}

/* Проверка селектора */
@supports selector(:has(*)) {
  .parent:has(.child) { background: lightblue; }
}

/* Проверка @property */
@supports (font-size: 1cqi) {
  .text { font-size: 5cqi; }
}
```

### 8.4 @font-face

```css
@font-face {
  font-family: "MyFont";
  src: url("myfont.woff2") format("woff2"),
       url("myfont.woff") format("woff");
  font-weight: 400;
  font-style: normal;
  font-display: swap; /* Стратегия загрузки */
  unicode-range: U+0400-04FF; /* Только кириллица */
}

/* Variable fonts */
@font-face {
  font-family: "MyVariableFont";
  src: url("variable.woff2") format("woff2-variations");
  font-weight: 100 900;  /* Диапазон weight */
  font-stretch: 75% 125%; /* Диапазон stretch */
}
```

**Значения `font-display`:**

| Значение | Описание |
|----------|----------|
| `auto` | Стратегия по умолчанию (зависит от браузера) |
| `block` | Невидимый текст на время загрузки (FOIT) |
| `swap` | Системный шрифт → заменяется при загрузке (FOUT) |
| `fallback` | Краткий период невидимости, затем fallback. Если не загрузился быстро — остаётся fallback |
| `optional` | Браузер решает, использовать ли загруженный шрифт |

### 8.5 @keyframes

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

.element {
  animation: fadeIn 0.3s ease-out forwards;
}
```

### 8.6 @layer

Cascade Layers — управление порядком каскада:

```css
/* Определение порядка слоёв */
@layer reset, base, components, utilities;

/* Наполнение слоёв */
@layer reset {
  * { margin: 0; padding: 0; box-sizing: border-box; }
}

@layer base {
  body { font-family: system-ui; line-height: 1.5; }
  a { color: var(--link-color); }
}

@layer components {
  .button { padding: 0.5rem 1rem; border-radius: 4px; }
  .card { border: 1px solid #e5e7eb; }
}

@layer utilities {
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; }
  .hidden { display: none; }
}
```

### 8.7 @scope

Ограничение области применения стилей (CSS Scope):

```css
@scope (.card) {
  :scope {
    border: 1px solid #ccc;
    padding: 1rem;
  }
  .title {
    font-size: 1.5rem;
  }
  .content {
    color: #666;
  }
}

/* Scope с нижней границей (donut scope) */
@scope (.card) to (.card-footer) {
  p { color: #333; }  /* Применяется только между .card и .card-footer */
}
```

### 8.8 @container

Container Queries — стилизация в зависимости от размеров контейнера:

```css
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

/* Сокращённая запись */
.card-wrapper {
  container: card / inline-size;
}

@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 200px 1fr;
  }
}

@container card (min-width: 700px) {
  .card {
    grid-template-columns: 300px 1fr;
    gap: 2rem;
  }
}
```

### 8.9 @property

Подробно описана в разделе 3.5. Краткий пример:

```css
@property --hue {
  syntax: '<number>';
  initial-value: 0;
  inherits: false;
}
```

### 8.10 Другие at-rules

```css
/* @charset — должен быть первым в файле */
@charset "UTF-8";

/* @namespace — для XML-документов */
@namespace svg url(http://www.w3.org/2000/svg);

/* @page — стили для печати */
@page {
  margin: 2cm;
  size: A4 portrait;
}
@page :first {
  margin-top: 5cm;
}

/* @counter-style — пользовательские стили счётчиков */
@counter-style thumbs {
  system: cyclic;
  symbols: "👍";
  suffix: " ";
}
```

---

## 9. Наследование

### 9.1 Наследуемые свойства

Некоторые CSS-свойства автоматически передаются от родительского элемента к дочерним:

**Наследуемые:**
- Текстовые: `color`, `font-family`, `font-size`, `font-weight`, `font-style`, `line-height`, `letter-spacing`, `word-spacing`, `text-align`, `text-indent`, `text-transform`, `white-space`
- Списки: `list-style`, `list-style-type`, `list-style-position`
- Таблицы: `border-collapse`, `border-spacing`
- Другие: `visibility`, `cursor`, `direction`, `quotes`

**Ненаследуемые:**
- Размеры: `width`, `height`, `min-width`, `max-width`
- Отступы: `margin`, `padding`
- Рамки: `border`
- Фон: `background`
- Позиционирование: `position`, `top`, `right`, `bottom`, `left`
- Flexbox/Grid: `display`, `flex`, `grid-*`
- Визуальные: `opacity`, `overflow`, `z-index`, `transform`

### 9.2 Ключевые слова управления наследованием

```css
.element {
  /* inherit — принудительно наследовать от родителя */
  border: inherit;

  /* initial — установить начальное значение свойства (из спецификации) */
  color: initial; /* Обычно чёрный */

  /* unset — если свойство наследуемое → inherit, иначе → initial */
  color: unset;     /* → inherit (color наследуется) */
  border: unset;    /* → initial (border не наследуется) */

  /* revert — откатить к значению из предыдущего origin (user-agent stylesheet) */
  display: revert;  /* Вернёт display из стилей браузера */

  /* revert-layer — откатить к значению из предыдущего @layer */
  color: revert-layer;
}
```

### 9.3 Свойство all

```css
/* Сброс ВСЕХ свойств элемента */
.isolated {
  all: initial;       /* Все свойства в initial */
  all: unset;         /* Все наследуемые → inherit, остальные → initial */
  all: revert;        /* Все свойства → значения из user-agent */
  all: revert-layer;  /* Все свойства → значения из предыдущего @layer */
}
```

> **Осторожно:** `all: initial` сбрасывает даже `display` и `unicode-bidi`, что может сломать layout. `all: revert` обычно безопаснее — возвращает к стилям браузера по умолчанию.

---

## 10. Вычисление значений

### 10.1 Этапы вычисления

CSS-значение проходит через четыре этапа преобразования:

```
Specified Value → Computed Value → Used Value → Actual Value
```

### 10.2 Specified Value (указанное значение)

Значение, определённое для свойства. Определяется по каскаду в следующем порядке:
1. Значение из каскада (с учётом специфичности, origin, layers)
2. Если не найдено и свойство наследуемое — computed value родителя
3. Если не найдено и свойство ненаследуемое — initial value из спецификации

### 10.3 Computed Value (вычисленное значение)

Specified value, обработанный для наследования. На этом этапе:
- Относительные URL разрешаются в абсолютные
- `em`, `ex` и другие font-relative единицы вычисляются в абсолютные значения (для `font-size`)
- Ключевые слова (`bold` → `700`, `transparent` → `rgba(0,0,0,0)`)
- `inherit`, `initial`, `unset` разрешаются
- Некоторые значения нормализуются

```css
.parent { font-size: 20px; }
.child { font-size: 1.5em; }
/* Computed value для .child font-size: 30px */
/* Это значение будет использоваться для наследования */
```

> **Важно:** Именно computed value возвращает `getComputedStyle()` в JavaScript (с некоторыми исключениями, где возвращается used value — например, для `width`).

### 10.4 Used Value (используемое значение)

Computed value после разрешения оставшихся зависимостей:
- Проценты вычисляются относительно containing block
- `auto` разрешается в конкретное значение
- `calc()` вычисляется до финального значения

```css
.container { width: 1000px; }
.child { width: 50%; }
/* Computed: 50% */
/* Used: 500px */
```

### 10.5 Actual Value (фактическое значение)

Used value, скорректированное под ограничения окружения:
- Округление до целых пикселей (subpixel rounding)
- Ограничения разрешения экрана
- Ограничения доступных шрифтов

```css
.element { width: 100.7px; }
/* Used: 100.7px */
/* Actual: 101px (округлено до пикселя) */
```

### 10.6 Пример полного цикла

```css
html { font-size: 16px; }
.parent { width: 800px; font-size: 1.25em; }
.child { width: 50%; padding: 1em; font-size: inherit; }
```

Для `.child` свойство `width`:
1. **Specified:** `50%`
2. **Computed:** `50%` (процент сохраняется)
3. **Used:** `400px` (50% от 800px родителя)
4. **Actual:** `400px` (целое число, без округления)

Для `.child` свойство `padding`:
1. **Specified:** `1em`
2. **Computed:** `20px` (1 × 20px — font-size родителя = 1.25 × 16px)
3. **Used:** `20px`
4. **Actual:** `20px`

Для `.parent` свойство `font-size`:
1. **Specified:** `1.25em`
2. **Computed:** `20px` (1.25 × 16px от html)
3. **Used:** `20px`
4. **Actual:** `20px`

### 10.7 getComputedStyle() в JavaScript

```javascript
const element = document.querySelector('.child');
const styles = getComputedStyle(element);

// Возвращает computed value (или used для некоторых свойств)
console.log(styles.width);        // "400px" (used value!)
console.log(styles.fontSize);     // "20px"
console.log(styles.display);      // "block"
console.log(styles.color);        // "rgb(0, 0, 0)"

// Для pseudo-elements
const beforeStyles = getComputedStyle(element, '::before');
console.log(beforeStyles.content);
```

> **Gotcha:** `getComputedStyle()` для `width` и `height` возвращает **used value** (в пикселях), а не computed. Для процентных значений вы не получите обратно `50%` — получите вычисленные пиксели. Для получения specified value нужно парсить стили из `element.style` или таблиц стилей напрямую.

---

## Заключение

Основы CSS охватывают обширный спектр тем — от способов подключения стилей до тонкостей вычисления значений. Понимание этих фундаментальных концепций критически важно:

- **Custom Properties** трансформировали работу с CSS, сделав стили динамичными и программируемыми
- **`@property`** открыл возможность типизированных и анимируемых переменных
- **`@layer`** решил проблему «войны специфичности» в крупных проектах
- **Container Queries** позволили создавать по-настоящему компонентный CSS
- **Новые viewport-единицы** (`dvh`, `svh`, `lvh`) исправили давнюю проблему с мобильными браузерами
- **Понимание цикла вычисления значений** помогает предсказывать поведение стилей и эффективно дебажить

Эти знания формируют основу, на которой строятся все остальные возможности CSS — от layout-систем (Flexbox, Grid) до анимаций и современных возможностей вроде `@scope` и `:has()`.
