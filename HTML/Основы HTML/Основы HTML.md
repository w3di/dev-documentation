# Основы HTML — глубокое погружение

## Оглавление

1. [Что такое HTML](#1-что-такое-html)
2. [DOCTYPE](#2-doctype)
3. [Структура HTML-документа](#3-структура-html-документа)
4. [Теги и атрибуты](#4-теги-и-атрибуты)
5. [Блочные vs строчные элементы и Content Categories](#5-блочные-vs-строчные-элементы-и-content-categories)
6. [HTML парсинг](#6-html-парсинг)
7. [Валидация HTML](#7-валидация-html)
8. [Content Model](#8-content-model)
9. [Пустые элементы (Void Elements)](#9-пустые-элементы-void-elements)
10. [Entity References](#10-entity-references)

---

## 1. Что такое HTML

### 1.1 Определение и спецификация

HTML (HyperText Markup Language) — это язык разметки, определяющий структуру и семантику веб-контента. HTML не является языком программирования: он не содержит конструкций управления потоком выполнения, переменных или функций. Его единственная задача — описать **что** представляет собой контент, а не **как** он выглядит.

Спецификация HTML поддерживается консорциумом **WHATWG** (Web Hypertext Application Technology Working Group) и доступна по адресу [https://html.spec.whatwg.org/](https://html.spec.whatwg.org/). Это единственный нормативный источник истины для реализации HTML в браузерах.

### 1.2 Краткая история

| Версия | Год | Ключевые особенности |
|--------|-----|---------------------|
| HTML 1.0 | 1993 | Базовые теги, гиперссылки |
| HTML 2.0 | 1995 | Формы, таблицы (RFC 1866) |
| HTML 3.2 | 1997 | Скрипты, апплеты, таблицы стилей |
| HTML 4.01 | 1999 | Strict/Transitional/Frameset DTD |
| XHTML 1.0 | 2000 | HTML как XML-приложение |
| HTML5 | 2014 | Семантика, Canvas, Video, Web APIs |
| HTML Living Standard | 2019+ | Непрерывное обновление спецификации |

### 1.3 HTML Living Standard vs HTML5

Термин «HTML5» технически устарел. W3C прекратил независимую разработку HTML-спецификации в 2019 году, передав полномочия WHATWG. Теперь существует только **HTML Living Standard** — вечно обновляемый документ без версионирования.

> **Важно:** Когда в собеседованиях или документации упоминается «HTML5», речь идёт о наборе фич, появившихся примерно в 2014 году (семантические элементы, Canvas API, Web Storage и т.д.), а не о конкретной версии спецификации.

Ключевые различия подходов:

| Аспект | HTML5 (W3C) | HTML Living Standard (WHATWG) |
|--------|-------------|-------------------------------|
| Версионирование | Фиксированные версии (5.0, 5.1, 5.2) | Непрерывное обновление |
| Статус | Прекращена разработка | Активная спецификация |
| DOM API | Отдельные спецификации | Интегрированы в одну спецификацию |
| Процесс обновления | Формальный W3C Process | GitHub Issues + Pull Requests |

### 1.4 Роль HTML в веб-платформе

HTML — один из трёх столпов веб-платформы:

- **HTML** — структура и семантика контента
- **CSS** — визуальное представление
- **JavaScript** — поведение и интерактивность

Браузер получает HTML-документ, парсит его в DOM-дерево, применяет CSS для построения Render Tree и выполняет JavaScript. Понимание того, как HTML превращается в DOM, критически важно для оптимизации производительности.

---

## 2. DOCTYPE

### 2.1 Что такое DOCTYPE

DOCTYPE (Document Type Declaration) — это инструкция для браузера, указывающая, какой стандарт разметки используется в документе. В современном HTML объявление выглядит так:

```html
<!DOCTYPE html>
```

Это **не** HTML-тег. Это инструкция для парсера, которая должна находиться в самом начале документа, до корневого элемента `<html>`.

### 2.2 Историческая эволюция DOCTYPE

В эпоху HTML 4.01 и XHTML 1.0 DOCTYPE представлял собой громоздкую конструкцию с указанием DTD (Document Type Definition):

```html
<!-- HTML 4.01 Strict -->
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"
  "http://www.w3.org/TR/html4/strict.dtd">

<!-- HTML 4.01 Transitional -->
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
  "http://www.w3.org/TR/html4/loose.dtd">

<!-- XHTML 1.0 Strict -->
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
```

Современный `<!DOCTYPE html>` — самая короткая строка, необходимая для переключения браузера в standards mode.

### 2.3 Режимы рендеринга

DOCTYPE определяет, какой режим рендеринга использует браузер. Существует три режима:

#### Quirks Mode (Режим совместимости)

Активируется при отсутствии DOCTYPE или при использовании устаревших DOCTYPE. В этом режиме браузер эмулирует поведение Internet Explorer 5.x:

- Box model работает по-другому: `width` включает `padding` и `border` (аналог `box-sizing: border-box`)
- Таблицы не наследуют `font-size` от `body`
- Inline-элементы не поддерживают `width` и `height`
- Центрирование через `text-align: center` работает для блочных элементов
- Высота изображений рассчитывается иначе

```html
<!-- Quirks Mode: нет DOCTYPE -->
<html>
<head><title>Quirks</title></head>
<body>...</body>
</html>
```

#### Standards Mode (Стандартный режим)

Активируется при использовании корректного современного DOCTYPE. Браузер следует спецификации CSS и HTML максимально точно:

```html
<!DOCTYPE html>
<html>
<head><title>Standards</title></head>
<body>...</body>
</html>
```

#### Almost Standards Mode (Почти стандартный режим)

Особый режим, активируемый некоторыми DOCTYPE из эпохи XHTML. Единственное отличие от standards mode — обработка вертикального расположения изображений в ячейках таблиц (inline-box baseline alignment):

```html
<!-- Almost Standards Mode -->
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
  "http://www.w3.org/TR/html4/loose.dtd">
```

### 2.4 Как браузер выбирает режим

Алгоритм определения режима описан в спецификации и работает следующим образом:

1. Парсер читает первые байты документа
2. Если DOCTYPE отсутствует — quirks mode
3. Если DOCTYPE — `<!DOCTYPE html>` — standards mode
4. Если DOCTYPE содержит public identifier из «чёрного списка» — quirks mode
5. Если DOCTYPE содержит system identifier с определёнными URL — almost standards mode
6. Иначе — standards mode

> **Gotcha:** Любой символ (включая пробел или BOM) перед DOCTYPE в IE может переключить страницу в quirks mode. Современные браузеры более лояльны, но лучше не рисковать.

### 2.5 Проверка текущего режима

JavaScript позволяет проверить режим рендеринга:

```html
<script>
  // "CSS1Compat" — standards mode
  // "BackCompat" — quirks mode
  console.log(document.compatMode);
</script>
```

---

## 3. Структура HTML-документа

### 3.1 Минимальная валидная структура

Согласно спецификации, минимальный валидный HTML-документ:

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Заголовок</title>
</head>
<body>
  <p>Контент</p>
</body>
</html>
```

Обязательные элементы:
- `<!DOCTYPE html>` — объявление DOCTYPE
- `<html>` — корневой элемент
- `<head>` — контейнер для метаданных
- `<title>` — заголовок документа (единственный обязательный элемент в `<head>`)
- `<body>` — контент документа

### 3.2 Опциональные теги

Спецификация HTML разрешает опускать некоторые открывающие и закрывающие теги. Парсер восстановит их автоматически:

```html
<!DOCTYPE html>
<title>Минимум</title>
<p>Это валидный HTML.
```

Парсер построит полное DOM-дерево:

```
#document
├── DOCTYPE: html
├── html
│   ├── head
│   │   └── title
│   │       └── "Минимум"
│   └── body
│       └── p
│           └── "Это валидный HTML."
```

Элементы с опциональным открывающим тегом: `<html>`, `<head>`, `<body>`

Элементы с опциональным закрывающим тегом: `<html>`, `<head>`, `<body>`, `<li>`, `<dt>`, `<dd>`, `<p>`, `<rt>`, `<rp>`, `<optgroup>`, `<option>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<td>`, `<th>`, `<colgroup>`

> **Важно:** Опциональность тегов не означает, что элементы отсутствуют в DOM. Парсер всегда создаёт узлы `<html>`, `<head>` и `<body>`, даже если соответствующие теги не написаны явно.

### 3.3 Порядок элементов в head

Порядок элементов в `<head>` влияет на производительность:

```html
<head>
  <!-- 1. charset — должен быть в первых 1024 байтах -->
  <meta charset="utf-8">

  <!-- 2. viewport — до загрузки CSS для корректного layout -->
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- 3. title — для SEO и доступности -->
  <title>Заголовок страницы</title>

  <!-- 4. Preconnect к критичным доменам -->
  <link rel="preconnect" href="https://fonts.googleapis.com">

  <!-- 5. Критичный CSS (inline) -->
  <style>/* critical CSS */</style>

  <!-- 6. Внешние стили -->
  <link rel="stylesheet" href="/styles/main.css">

  <!-- 7. Preload критичных ресурсов -->
  <link rel="preload" href="/fonts/main.woff2" as="font" crossorigin>

  <!-- 8. Скрипты (defer или в конце body) -->
  <script src="/js/app.js" defer></script>

  <!-- 9. Мета-теги для SEO и социальных сетей -->
  <meta name="description" content="...">
  <meta property="og:title" content="...">
</head>
```

### 3.4 Атрибут lang

Атрибут `lang` на элементе `<html>` критически важен для:

- **Accessibility:** Скринридеры выбирают правильный голосовой движок
- **SEO:** Поисковые системы определяют язык контента
- **CSS:** Псевдокласс `:lang()` и свойство `hyphens` зависят от языка
- **Браузерные функции:** Автоматический перевод, проверка орфографии

```html
<html lang="ru">
<!-- Для многоязычных страниц -->
<p lang="en">This paragraph is in English.</p>
<p lang="ja">この段落は日本語です。</p>
```

Формат значения — BCP 47 language tag: `ru`, `en-US`, `zh-Hans-CN`.

---

## 4. Теги и атрибуты

### 4.1 Анатомия HTML-тега

```
  открывающий тег          закрывающий тег
  ┌────┴────┐              ┌──┴──┐
  <p class="intro">Текст параграфа</p>
   │  └────┬────┘  └──────┬──────┘
   │    атрибут       содержимое
   имя элемента
```

HTML-элемент состоит из:
- **Открывающий тег** — `<tagname>`
- **Атрибуты** — пары ключ-значение в открывающем теге
- **Содержимое** — текст и/или вложенные элементы
- **Закрывающий тег** — `</tagname>` (не для void elements)

### 4.2 Глобальные атрибуты

Глобальные атрибуты применимы к **любому** HTML-элементу. Ключевые:

| Атрибут | Описание | Пример |
|---------|----------|--------|
| `id` | Уникальный идентификатор | `id="main-nav"` |
| `class` | CSS-классы (через пробел) | `class="btn btn-primary"` |
| `style` | Inline-стили | `style="color: red"` |
| `title` | Всплывающая подсказка | `title="Подсказка"` |
| `lang` | Язык содержимого | `lang="en"` |
| `dir` | Направление текста | `dir="rtl"` |
| `tabindex` | Порядок фокуса | `tabindex="0"` |
| `hidden` | Скрытие элемента | `hidden` |
| `contenteditable` | Редактируемость | `contenteditable="true"` |
| `draggable` | Перетаскиваемость | `draggable="true"` |
| `spellcheck` | Проверка орфографии | `spellcheck="false"` |
| `translate` | Разрешение перевода | `translate="no"` |
| `autofocus` | Автофокус при загрузке | `autofocus` |
| `inert` | Делает элемент инертным | `inert` |
| `popover` | Popover API | `popover` |

### 4.3 data-* атрибуты

Пользовательские data-атрибуты позволяют хранить произвольные данные на элементах:

```html
<article
  data-author-id="42"
  data-category="tech"
  data-publish-date="2024-01-15"
  data-is-featured="true"
>
  <h2>Заголовок</h2>
</article>
```

Доступ из JavaScript через `dataset`:

```html
<script>
  const article = document.querySelector('article');

  // kebab-case → camelCase
  console.log(article.dataset.authorId);     // "42"
  console.log(article.dataset.category);     // "tech"
  console.log(article.dataset.publishDate);  // "2024-01-15"
  console.log(article.dataset.isFeatured);   // "true"

  // Все значения — строки! Нужна явная конвертация
  const id = Number(article.dataset.authorId);
  const featured = article.dataset.isFeatured === 'true';
</script>
```

> **Gotcha:** Имена data-атрибутов не должны содержать заглавных букв ASCII. `data-userName` невалиден, используйте `data-user-name`.

CSS может использовать data-атрибуты через селекторы атрибутов и функцию `attr()`:

```html
<style>
  [data-category="tech"] { border-left: 3px solid blue; }
  [data-is-featured="true"]::before { content: "★ "; }
</style>
```

### 4.4 Boolean-атрибуты

Boolean-атрибуты не имеют значения «true» / «false». Их **наличие** означает `true`, **отсутствие** — `false`:

```html
<!-- Все эти формы эквивалентны — disabled === true -->
<input disabled>
<input disabled="">
<input disabled="disabled">
<input disabled="anything-here">

<!-- Единственный способ задать false — убрать атрибут -->
<input>
```

Список распространённых boolean-атрибутов:

`disabled`, `checked`, `selected`, `readonly`, `required`, `multiple`, `autofocus`, `autoplay`, `controls`, `loop`, `muted`, `hidden`, `novalidate`, `open`, `defer`, `async`, `reversed`, `allowfullscreen`, `inert`

> **Gotcha:** `disabled="false"` всё равно означает `true`! Атрибут присутствует, значит элемент отключён. Это частая ошибка при работе с фреймворками.

### 4.5 Правила именования атрибутов

Согласно спецификации:
- Имена атрибутов case-insensitive в HTML (но case-sensitive в XHTML)
- Значения атрибутов можно указывать без кавычек, если они не содержат пробелов и спецсимволов
- Допускаются одинарные и двойные кавычки

```html
<!-- Все варианты валидны -->
<div class="container">
<div class='container'>
<div class=container>

<!-- Кавычки обязательны, если значение содержит пробелы -->
<div class="container main">
```

### 4.6 Event handler атрибуты

HTML позволяет указывать обработчики событий как атрибуты. Имена начинаются с `on`:

```html
<button onclick="handleClick()">Нажми</button>
<input oninput="validate(this.value)">
<form onsubmit="return false">
```

> **Best Practice:** Inline event handlers считаются антипаттерном. Используйте `addEventListener` для разделения HTML и JavaScript, улучшения тестируемости и возможности навешивать несколько обработчиков на одно событие. Inline handlers также блокируются строгими CSP-политиками.

### 4.7 Атрибуты ARIA

ARIA-атрибуты (Accessible Rich Internet Applications) добавляют семантику для assistive technologies:

```html
<button
  aria-label="Закрыть диалог"
  aria-pressed="false"
  aria-expanded="false"
  aria-controls="menu-panel"
>
  ✕
</button>

<div
  role="alert"
  aria-live="polite"
  aria-atomic="true"
>
  Сообщение обновлено
</div>
```

Три категории ARIA-атрибутов:
- **Roles** — определяют роль элемента (`role="dialog"`)
- **States** — текущее состояние (`aria-checked="true"`)
- **Properties** — свойства элемента (`aria-label="Название"`)

---

## 5. Блочные vs строчные элементы и Content Categories

### 5.1 Устаревшая классификация

Традиционное деление на «блочные» (block) и «строчные» (inline) элементы пришло из CSS, а не из HTML. В современной спецификации эти термины заменены на **Content Categories** — система категорий контента.

Тем не менее, понимание старой модели важно:

| Block-level | Inline-level |
|-------------|-------------|
| Занимают всю ширину родителя | Занимают только ширину контента |
| Начинаются с новой строки | Не начинают новую строку |
| Могут содержать block и inline | Могут содержать только inline |
| `div`, `p`, `h1`-`h6`, `ul`, `ol` | `span`, `a`, `em`, `strong`, `img` |

### 5.2 Content Categories по спецификации

Спецификация HTML Living Standard определяет следующие категории контента:

#### Metadata Content

Элементы, определяющие поведение или представление остального контента, или устанавливающие отношения с другими документами:

`base`, `link`, `meta`, `noscript`, `script`, `style`, `template`, `title`

#### Flow Content

Большинство элементов, которые могут находиться в `<body>`. Это «базовая» категория:

`a`, `abbr`, `address`, `article`, `aside`, `audio`, `b`, `bdi`, `bdo`, `blockquote`, `br`, `button`, `canvas`, `cite`, `code`, `data`, `datalist`, `del`, `details`, `dfn`, `dialog`, `div`, `dl`, `em`, `embed`, `fieldset`, `figure`, `footer`, `form`, `h1`-`h6`, `header`, `hgroup`, `hr`, `i`, `iframe`, `img`, `input`, `ins`, `kbd`, `label`, `link`, `main`, `map`, `mark`, `math`, `menu`, `meter`, `nav`, `noscript`, `object`, `ol`, `output`, `p`, `picture`, `pre`, `progress`, `q`, `ruby`, `s`, `samp`, `script`, `search`, `section`, `select`, `slot`, `small`, `span`, `strong`, `sub`, `sup`, `svg`, `table`, `template`, `textarea`, `time`, `u`, `ul`, `var`, `video`, `wbr`, text

#### Phrasing Content

Текст документа и элементы, размечающие текст внутри параграфов. Это подмножество flow content:

`a`, `abbr`, `audio`, `b`, `bdi`, `bdo`, `br`, `button`, `canvas`, `cite`, `code`, `data`, `datalist`, `del`, `dfn`, `em`, `embed`, `i`, `iframe`, `img`, `input`, `ins`, `kbd`, `label`, `link`, `map`, `mark`, `math`, `meter`, `noscript`, `object`, `output`, `picture`, `progress`, `q`, `ruby`, `s`, `samp`, `script`, `select`, `slot`, `small`, `span`, `strong`, `sub`, `sup`, `svg`, `template`, `textarea`, `time`, `u`, `var`, `video`, `wbr`, text

#### Heading Content

Определяет заголовки секций: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `hgroup`

#### Sectioning Content

Определяет секции документа: `article`, `aside`, `nav`, `section`

#### Embedded Content

Внедрённый контент из других ресурсов: `audio`, `canvas`, `embed`, `iframe`, `img`, `math`, `object`, `picture`, `svg`, `video`

#### Interactive Content

Элементы, предназначенные для взаимодействия: `a` (с `href`), `audio` (с `controls`), `button`, `details`, `embed`, `iframe`, `img` (с `usemap`), `input` (не `type="hidden"`), `label`, `select`, `textarea`, `video` (с `controls`)

#### Palpable Content

Элементы, которые должны иметь хотя бы один непустой текстовый узел или embedded/interactive дочерний элемент. Это правило помогает избегать пустых элементов.

### 5.3 Диаграмма вложенности категорий

```
Flow Content
├── Phrasing Content
│   ├── Embedded Content
│   └── (частично) Interactive Content
├── Heading Content
├── Sectioning Content
└── (некоторые элементы принадлежат нескольким категориям)
```

> **Важно:** Один элемент может принадлежать нескольким категориям. Например, `<a>` — это flow content, phrasing content и interactive content одновременно.

### 5.4 Transparent Content Model

Элементы `<a>`, `<ins>`, `<del>`, `<object>`, `<video>`, `<audio>`, `<map>`, `<noscript>`, `<canvas>`, `<slot>` имеют **transparent content model**. Это значит, что их content model наследуется от родительского элемента:

```html
<!-- <a> внутри <p> может содержать только phrasing content -->
<p>Текст <a href="/">ссылка с <em>выделением</em></a></p>

<!-- <a> внутри <div> может содержать flow content -->
<div>
  <a href="/">
    <h2>Заголовок-ссылка</h2>
    <p>Описание</p>
  </a>
</div>
```

---

## 6. HTML парсинг

### 6.1 Обзор процесса

HTML-парсинг — один из самых сложных алгоритмов в спецификации. В отличие от XML, HTML-парсер **обязан** обрабатывать любой ввод, включая невалидный. Парсинг состоит из двух основных этапов:

1. **Tokenization** (Токенизация) — преобразование байтового потока в токены
2. **Tree Construction** (Построение дерева) — построение DOM из токенов

### 6.2 Tokenization

Токенизатор работает как конечный автомат (state machine) с ~80 состояниями. Основные типы токенов:

| Тип токена | Пример | Описание |
|-----------|--------|----------|
| DOCTYPE | `<!DOCTYPE html>` | Объявление типа документа |
| Start tag | `<div class="x">` | Открывающий тег с атрибутами |
| End tag | `</div>` | Закрывающий тег |
| Comment | `<!-- коммент -->` | HTML-комментарий |
| Character | `Hello` | Текстовые символы |
| End-of-file | — | Конец документа |

Пример работы токенизатора для `<p class="text">Hello</p>`:

```
State: Data state
Символ: '<'  → переход в Tag open state
Символ: 'p'  → переход в Tag name state, буфер: "p"
Символ: ' '  → переход в Before attribute name state
Символ: 'c'  → переход в Attribute name state, буфер: "c"
...
Символ: '>'  → emit Start tag token {name: "p", attributes: [{name: "class", value: "text"}]}
Символ: 'H'  → emit Character token "H"
Символ: 'e'  → emit Character token "e"
...
Символ: '<'  → переход в Tag open state
Символ: '/'  → переход в End tag open state
Символ: 'p'  → переход в Tag name state
Символ: '>'  → emit End tag token {name: "p"}
```

### 6.3 Tree Construction

Tree construction algorithm получает токены от токенизатора и строит DOM-дерево. Алгоритм использует **стек открытых элементов** (stack of open elements) и **список активных форматирующих элементов** (list of active formatting elements).

Ключевые концепции:

#### Insertion Mode

Алгоритм построения дерева работает в разных режимах вставки (insertion modes), каждый из которых определяет, как обрабатывать входящие токены:

- `initial` — до DOCTYPE
- `before html` — до `<html>`
- `before head` — до `<head>`
- `in head` — внутри `<head>`
- `after head` — между `</head>` и `<body>`
- `in body` — внутри `<body>` (основной режим)
- `in table` — внутри `<table>`
- `in select` — внутри `<select>`
- `after body` — после `</body>`
- `after after body` — после `</html>`

#### Foster Parenting

Когда парсер встречает элемент, недопустимый в текущем контексте (например, `<p>` внутри `<table>`), он применяет foster parenting — помещает элемент перед таблицей, а не внутрь неё:

```html
<!-- Исходный HTML -->
<table>
  <p>Текст в таблице</p>
  <tr><td>Ячейка</td></tr>
</table>

<!-- Результирующий DOM -->
<p>Текст в таблице</p>
<table>
  <tbody>
    <tr><td>Ячейка</td></tr>
  </tbody>
</table>
```

### 6.4 Adoption Agency Algorithm

Один из самых сложных алгоритмов парсера. Он обрабатывает неправильно вложенные форматирующие элементы:

```html
<!-- Исходный HTML -->
<p>Привет <b>жирный <i>жирный-курсив</b> курсив</i></p>

<!-- DOM после adoption agency algorithm -->
<p>
  Привет
  <b>жирный <i>жирный-курсив</i></b>
  <i> курсив</i>
</p>
```

Алгоритм «усыновления» обеспечивает, что форматирование не теряется при неправильной вложенности. Он работает с **list of active formatting elements** и может рекконструировать элементы при необходимости.

### 6.5 Error Recovery

HTML-парсер **никогда** не выдаёт синтаксическую ошибку. Вместо этого он применяет алгоритмы восстановления:

```html
<!-- Незакрытые теги -->
<div><p>Текст     → парсер автоматически закроет <p> и <div>

<!-- Неправильная вложенность -->
<b><p></b></p>    → парсер переупорядочит узлы

<!-- Лишние закрывающие теги -->
</div></div></div> → парсер проигнорирует лишние

<!-- Невалидные символы в тегах -->
<div<span>         → парсер интерпретирует как атрибуты или текст
```

> **Важно:** Хотя парсер восстанавливает ошибки, результат может не совпадать с ожиданиями разработчика. Всегда пишите валидный HTML, чтобы DOM-дерево было предсказуемым.

### 6.6 Speculative Parsing (Предварительный парсинг)

Когда основной парсер блокирован выполнением синхронного `<script>`, браузер запускает **speculative parser** (preload scanner), который продолжает сканировать HTML и начинает загрузку ресурсов заранее:

```html
<script src="heavy-script.js"></script>
<!-- Основной парсер заблокирован, но preload scanner -->
<!-- уже обнаружил и начал загрузку: -->
<link rel="stylesheet" href="styles.css">
<img src="hero.jpg">
<script src="analytics.js"></script>
```

Preload scanner обнаруживает:
- `<link rel="stylesheet">` — CSS-файлы
- `<script src>` — JavaScript-файлы
- `<img src>` — изображения
- `<link rel="preload">` — предзагрузка ресурсов

> **Performance:** Speculative parsing — причина, по которой перемещение `<script>` в конец `<body>` менее критично, чем раньше. Тем не менее, `defer` и `async` остаются предпочтительными.

### 6.7 Парсинг script-элементов

Поведение парсера при встрече `<script>`:

```html
<!-- Блокирует парсинг. Загрузка + выполнение до продолжения. -->
<script src="app.js"></script>

<!-- Загрузка параллельно, выполнение после парсинга, в порядке объявления. -->
<script src="app.js" defer></script>

<!-- Загрузка параллельно, выполнение сразу после загрузки, порядок не гарантирован. -->
<script src="app.js" async></script>

<!-- ES-модуль. По умолчанию defer. -->
<script type="module" src="app.mjs"></script>

<!-- Inline-скрипт. Выполняется синхронно. -->
<script>
  console.log('Блокирует парсинг');
</script>
```

Визуализация порядка загрузки и выполнения:

```
HTML парсинг:  ████████░░░░░░░░████████████
                       ↑              ↑
               (обычный script)  (продолжение)

defer:         ████████████████████████████
               ↑ загрузка ↑            ↑выполнение
                                  DOMContentLoaded

async:         ████████░░░████████████████
               ↑ загрузка ↑↑выполнение
                          (когда готов)
```

---

## 7. Валидация HTML

### 7.1 Зачем валидировать

Валидация HTML помогает:
- Обнаруживать ошибки до того, как они повлияют на пользователей
- Обеспечивать корректную интерпретацию браузерами
- Улучшать accessibility
- Повышать SEO-показатели
- Обеспечивать предсказуемое поведение JavaScript (корректное DOM-дерево)

### 7.2 W3C Validator

Основной инструмент — [W3C Markup Validation Service](https://validator.w3.org/) (он же Nu HTML Checker).

Типы проверок:
- **Structural:** Корректная вложенность элементов
- **Content Model:** Допустимые дочерние элементы
- **Attributes:** Валидные атрибуты для каждого элемента
- **Duplicate IDs:** Уникальность идентификаторов
- **Obsolete Features:** Устаревшие элементы и атрибуты

### 7.3 Распространённые ошибки валидации

```html
<!-- Ошибка: <div> внутри <p> -->
<p>Текст <div>блок</div> ещё текст</p>
<!-- Парсер закроет <p> перед <div> -->

<!-- Ошибка: дублирование id -->
<div id="main">Первый</div>
<div id="main">Второй</div>

<!-- Ошибка: button внутри a -->
<a href="/"><button>Нажми</button></a>

<!-- Ошибка: интерактивный контент внутри интерактивного -->
<a href="/"><a href="/other">Вложенная ссылка</a></a>

<!-- Ошибка: отсутствие alt у img -->
<img src="photo.jpg">
<!-- Правильно: -->
<img src="photo.jpg" alt="Описание изображения">

<!-- Ошибка: form внутри form -->
<form>
  <form>Вложенная форма</form>
</form>
```

### 7.4 HTML vs XHTML: well-formedness

В HTML (text/html):
- Парсер допускает ошибки и восстанавливает DOM
- Некоторые теги можно не закрывать
- Регистр тегов и атрибутов не важен
- Атрибуты можно писать без кавычек

В XHTML (application/xhtml+xml):
- Парсер XML, который **останавливается** при первой ошибке
- Все теги **обязательно** закрываются
- Все атрибуты в кавычках
- Всё в нижнем регистре
- Void elements: `<br />`, `<img src="x" />`

```html
<!-- Валидный HTML, невалидный XHTML -->
<p>Текст
<br>
<IMG SRC=photo.jpg ALT=Фото>

<!-- Валидный и в HTML, и в XHTML -->
<p>Текст</p>
<br />
<img src="photo.jpg" alt="Фото" />
```

### 7.5 Интеграция в CI/CD

Валидацию можно автоматизировать с помощью инструментов:

- **html-validate** (npm) — настраиваемый HTML-валидатор
- **vnu-jar** — локальная версия W3C Validator
- **HTMLHint** — линтер для HTML
- **axe-core** — проверка accessibility

```html
<!-- Конфигурация .htmlvalidate.json -->
<!--
{
  "extends": ["html-validate:recommended"],
  "rules": {
    "no-trailing-whitespace": "off",
    "void-style": ["error", { "style": "selfclose" }]
  }
}
-->
```

---

## 8. Content Model

### 8.1 Что такое Content Model

Content Model определяет, какие типы контента допустимы в качестве дочерних элементов. Каждый HTML-элемент имеет свою content model, описанную в спецификации.

### 8.2 Категории content model

| Тип | Описание | Примеры элементов |
|-----|----------|-------------------|
| Nothing | Не может иметь дочерних | void elements, `<template>` |
| Text | Только текстовые узлы | `<title>`, `<textarea>`, `<script>` |
| Phrasing | Только phrasing content | `<p>`, `<h1>`-`<h6>`, `<pre>` |
| Flow | Любой flow content | `<div>`, `<article>`, `<section>` |
| Transparent | Наследует от родителя | `<a>`, `<ins>`, `<del>` |
| Specific | Только определённые дети | `<table>`, `<ul>`, `<ol>`, `<dl>`, `<select>` |

### 8.3 Правила вложенности

#### Элемент `<p>` — только phrasing content

```html
<!-- Правильно -->
<p>Текст с <em>выделением</em> и <a href="/">ссылкой</a></p>

<!-- Неправильно — div не является phrasing content -->
<p>Текст <div>блок</div></p>
<!-- Парсер создаст: <p>Текст </p><div>блок</div><p></p> -->
```

#### Элемент `<a>` — transparent, но без interactive content

```html
<!-- Правильно -->
<a href="/">
  <div>
    <h2>Заголовок</h2>
    <p>Описание</p>
  </div>
</a>

<!-- Неправильно — button это interactive content -->
<a href="/"><button>Нажми</button></a>

<!-- Неправильно — вложенные ссылки -->
<a href="/"><a href="/other">Ссылка</a></a>
```

#### Элемент `<table>` — строгая структура

```html
<table>
  <!-- Допустимые прямые дочерние элементы: -->
  <caption>Заголовок таблицы</caption>
  <colgroup>
    <col span="2">
  </colgroup>
  <thead>
    <tr><th>Колонка 1</th><th>Колонка 2</th></tr>
  </thead>
  <tbody>
    <tr><td>Данные</td><td>Данные</td></tr>
  </tbody>
  <tfoot>
    <tr><td colspan="2">Итого</td></tr>
  </tfoot>
</table>
```

#### Списки — только `<li>` как прямые дети

```html
<!-- Правильно -->
<ul>
  <li>Пункт 1</li>
  <li>Пункт 2</li>
</ul>

<!-- Неправильно -->
<ul>
  <div>Не li!</div>
  <li>Пункт</li>
</ul>
```

#### Definition List — чередование `<dt>` и `<dd>`

```html
<dl>
  <dt>Термин 1</dt>
  <dd>Определение 1</dd>

  <dt>Термин 2</dt>
  <dd>Определение 2a</dd>
  <dd>Определение 2b</dd>

  <!-- Допускается оборачивание в div (для стилизации) -->
  <div>
    <dt>Термин 3</dt>
    <dd>Определение 3</dd>
  </div>
</dl>
```

### 8.4 Часто нарушаемые правила

```html
<!-- 1. <header> и <footer> не могут быть вложены в <header>, <footer> или <address> -->
<header>
  <footer>Ошибка!</footer>
</header>

<!-- 2. <main> должен быть уникален на странице (если не hidden) -->
<main>Основной контент</main>
<main hidden>Скрытый основной контент — допустимо</main>

<!-- 3. <form> не может содержать другой <form> -->
<form>
  <form>Ошибка!</form>
</form>

<!-- 4. <label> не может содержать другой <label> -->
<label>
  Внешний
  <label>Внутренний — ошибка!</label>
</label>

<!-- 5. Heading elements (h1-h6) содержат только phrasing content -->
<h1><div>Ошибка!</div></h1>

<!-- 6. <select> содержит только <option>, <optgroup>, <hr> и script-supporting -->
<select>
  <option>Выбор 1</option>
  <optgroup label="Группа">
    <option>Выбор 2</option>
  </optgroup>
</select>
```

---

## 9. Пустые элементы (Void Elements)

### 9.1 Определение

Void elements (пустые элементы) — это элементы, которые **не могут иметь дочерних узлов** (ни элементов, ни текста). У них нет закрывающего тега.

### 9.2 Полный список void elements

| Элемент | Назначение | Пример |
|---------|-----------|--------|
| `<area>` | Область в image map | `<area shape="rect" coords="0,0,50,50" href="/">` |
| `<base>` | Базовый URL | `<base href="https://example.com/">` |
| `<br>` | Перенос строки | `Строка 1<br>Строка 2` |
| `<col>` | Колонка таблицы | `<col span="2">` |
| `<embed>` | Внедрённый контент | `<embed src="plugin.swf">` |
| `<hr>` | Тематический разрыв | `<hr>` |
| `<img>` | Изображение | `<img src="photo.jpg" alt="Фото">` |
| `<input>` | Поле ввода | `<input type="text" name="q">` |
| `<link>` | Связанный ресурс | `<link rel="stylesheet" href="style.css">` |
| `<meta>` | Метаданные | `<meta charset="utf-8">` |
| `<param>` | Параметр object (устарел) | `<param name="movie" value="video.swf">` |
| `<source>` | Источник медиа | `<source srcset="img.webp" type="image/webp">` |
| `<track>` | Текстовые дорожки | `<track src="subs.vtt" kind="subtitles">` |
| `<wbr>` | Возможный перенос | `суперкалифр<wbr>агилистик<wbr>экспиалидошес` |

### 9.3 Синтаксис

```html
<!-- Правильно в HTML -->
<br>
<img src="photo.jpg" alt="Фото">
<input type="text">

<!-- Тоже допустимо (XHTML-стиль), но необязательно -->
<br />
<img src="photo.jpg" alt="Фото" />
<input type="text" />

<!-- ОШИБКА: void elements не имеют закрывающего тега -->
<br></br>      <!-- Создаст ДВА элемента br! -->
<img></img>    <!-- Парсер проигнорирует </img> -->
```

> **Gotcha:** В HTML `<br/>` и `<br />` допустимы, но `<br></br>` создаст два элемента `<br>` — парсер интерпретирует `</br>` как ещё один `<br>`.

### 9.4 Void elements vs Self-closing Tags

Самозакрывающий синтаксис (`/>`) имеет значение только в XML/XHTML. В HTML-парсере слэш перед `>` **игнорируется**:

```html
<!-- Для void elements: / необязателен и игнорируется -->
<br>    === <br />    === <br/>

<!-- Для non-void elements: / НЕ закрывает элемент! -->
<div />  !== <div></div>
<!-- <div /> парсится как просто <div>, он остаётся открытым -->

<!-- SVG и MathML — исключения, там / работает -->
<svg><circle cx="50" cy="50" r="40" /></svg>
```

### 9.5 Распространённые ошибки с void elements

```html
<!-- Ошибка: контент внутри void element -->
<br>Текст после переноса</br>
<!-- Создаст: <br>"Текст после переноса"<br> -->

<!-- Ошибка: src обязателен для img -->
<img alt="Фото">
<!-- Валидатор выдаст предупреждение -->

<!-- Ошибка: alt обязателен для img -->
<img src="photo.jpg">
<!-- Нарушение accessibility -->

<!-- Правильное использование hr -->
<section>
  <h2>Раздел 1</h2>
  <p>Текст...</p>
</section>
<hr>
<section>
  <h2>Раздел 2</h2>
  <p>Текст...</p>
</section>
```

---

## 10. Entity References

### 10.1 Что такое HTML Entities

HTML entities — это способ представления специальных символов, которые нельзя ввести напрямую в HTML или которые имеют особое значение в синтаксисе HTML.

Три формата записи:

| Формат | Пример | Результат |
|--------|--------|-----------|
| Named entity | `&amp;` | & |
| Decimal | `&#38;` | & |
| Hexadecimal | `&#x26;` | & |

### 10.2 Обязательные Entity References

Некоторые символы **обязательно** должны быть экранированы в определённых контекстах:

| Символ | Entity | Когда обязательно |
|--------|--------|-------------------|
| `<` | `&lt;` | Всегда в контенте и атрибутах (чтобы не интерпретировался как начало тега) |
| `&` | `&amp;` | Всегда (чтобы не интерпретировался как начало entity) |
| `"` | `&quot;` | В значениях атрибутов в двойных кавычках |
| `'` | `&apos;` | В значениях атрибутов в одинарных кавычках (в HTML5 можно использовать `&#39;`) |

```html
<!-- Правильное экранирование -->
<p>5 &lt; 10 и 10 &gt; 5</p>
<p>Tom &amp; Jerry</p>
<a href="page.html?a=1&amp;b=2">Ссылка</a>
<img alt="Фото &quot;природа&quot;">
```

> **Gotcha:** `&apos;` не поддерживается в HTML 4. Используйте `&#39;` для максимальной совместимости.

### 10.3 Часто используемые Named Entities

| Entity | Символ | Описание |
|--------|--------|----------|
| `&nbsp;` | (неразрывный пробел) | Non-breaking space (U+00A0) |
| `&mdash;` | — | Em dash |
| `&ndash;` | – | En dash |
| `&laquo;` | « | Левая кавычка-ёлочка |
| `&raquo;` | » | Правая кавычка-ёлочка |
| `&copy;` | (c) | Знак копирайта |
| `&reg;` | (R) | Знак зарегистрированной торговой марки |
| `&trade;` | TM | Знак торговой марки |
| `&euro;` | EUR | Знак евро |
| `&hellip;` | ... | Многоточие |
| `&larr;` | <- | Стрелка влево |
| `&rarr;` | -> | Стрелка вправо |
| `&uarr;` | (стрелка вверх) | Стрелка вверх |
| `&darr;` | (стрелка вниз) | Стрелка вниз |
| `&times;` | x | Знак умножения |
| `&divide;` | / | Знак деления |
| `&infin;` | (бесконечность) | Знак бесконечности |
| `&ne;` | != | Знак неравенства |
| `&le;` | <= | Меньше или равно |
| `&ge;` | >= | Больше или равно |

### 10.4 Числовые Entity References

Числовые entities позволяют вставить любой Unicode-символ:

```html
<!-- Decimal: &#код; -->
<p>&#169; 2024</p>        <!-- © 2024 -->
<p>&#9829;</p>             <!-- ♥ -->
<p>&#128512;</p>           <!-- 😀 -->

<!-- Hexadecimal: &#xкод; -->
<p>&#x00A9; 2024</p>      <!-- © 2024 -->
<p>&#x2665;</p>            <!-- ♥ -->
<p>&#x1F600;</p>           <!-- 😀 -->
```

### 10.5 Unicode и UTF-8

При использовании `<meta charset="utf-8">` большинство символов можно вводить напрямую без entities:

```html
<meta charset="utf-8">

<!-- Все эти варианты эквивалентны -->
<p>&copy; 2024</p>
<p>&#169; 2024</p>
<p>&#xA9; 2024</p>
<p>© 2024</p>        <!-- Напрямую, если charset="utf-8" -->
```

> **Best Practice:** Используйте UTF-8 и вводите символы напрямую. Entities нужны только для: (1) символов, конфликтующих с синтаксисом HTML (`<`, `&`, `"`), (2) невидимых символов (`&nbsp;`, `&shy;`, `&zwnj;`), (3) символов, которые сложно отличить визуально (`&minus;` vs дефис).

### 10.6 Entity References в атрибутах

Правила экранирования в атрибутах отличаются от контента:

```html
<!-- В атрибутах с двойными кавычками: экранировать " и & -->
<a href="page?a=1&amp;b=2" title="Книга &quot;Война и мир&quot;">

<!-- В атрибутах с одинарными кавычками: экранировать ' и & -->
<a href='page?a=1&amp;b=2' title='Tom&#39;s page'>

<!-- В атрибутах без кавычек: экранировать &, пробелы, <, >, ", ', `, = -->
<!-- Лучше всего: всегда используйте кавычки! -->
```

### 10.7 Ambiguous Ampersand

Спецификация определяет понятие «ambiguous ampersand» — символ `&`, за которым следует последовательность, похожая на named entity, но не являющаяся ей:

```html
<!-- Ambiguous ampersand — парсер выдаст предупреждение -->
<p>AT&T</p>        <!-- &T — не существующая entity -->

<!-- Правильно -->
<p>AT&amp;T</p>

<!-- Не ambiguous — после & идёт пробел или несуществующая конструкция -->
<p>x & y</p>       <!-- ОК: после & пробел -->
<p>&notaentity</p> <!-- Зависит от парсера; &not — существует! -->
```

> **Gotcha:** `&notaentity` может быть интерпретирован как entity `&not` (символ "не": ¬) + текст `aentity`. Парсер HTML пытается найти самое длинное совпадение с именованной entity, и `&not` — валидная entity. Всегда экранируйте `&` как `&amp;` если не хотите сюрпризов.

### 10.8 Entities в JavaScript и CSS

В JavaScript-строках и CSS-контенте entities **не работают**:

```html
<script>
  // Ошибка: entity не интерпретируется в JS
  const text = "&amp;";  // Строка "&amp;", а не "&"

  // Правильно
  const text = "&";
  const encoded = "&amp;";  // Если нужна именно строка "&amp;"
</script>

<style>
  /* В CSS используйте Unicode escape */
  .icon::before {
    content: "\00A9";    /* © */
    content: "\2665";    /* ♥ */
  }
</style>
```

### 10.9 Специальные невидимые Entities

| Entity | Код | Описание | Использование |
|--------|-----|----------|---------------|
| `&nbsp;` | U+00A0 | Неразрывный пробел | Предотвращает перенос строки между словами |
| `&shy;` | U+00AD | Мягкий перенос | Точка возможного переноса слова |
| `&zwnj;` | U+200C | Zero-width non-joiner | Предотвращает лигатуру |
| `&zwj;` | U+200D | Zero-width joiner | Соединяет символы |
| `&lrm;` | U+200E | Left-to-right mark | Управление направлением текста |
| `&rlm;` | U+200F | Right-to-left mark | Управление направлением текста |

```html
<!-- Неразрывный пробел — 100 000 не перенесётся посередине -->
<p>Население: 100&nbsp;000 человек</p>

<!-- Мягкий перенос — слово перенесётся только если нужно -->
<p>Суперкалифра&shy;гилистик&shy;экспиалидошес</p>
```

---

## Итого

HTML — это не «простая разметка», а сложная спецификация с детально описанными алгоритмами парсинга, правилами вложенности и множеством нюансов. Ключевые моменты:

- Используйте `<!DOCTYPE html>` для standards mode
- Понимание content categories важнее запоминания «блочных» и «строчных» элементов
- HTML-парсер всегда восстанавливает ошибки, но результат может быть неожиданным
- Speculative parsing оптимизирует загрузку, но `defer`/`async` всё равно важны
- Валидный HTML — основа для предсказуемого DOM, корректной accessibility и надёжного JavaScript
- Entities нужны для экранирования синтаксических символов и вставки специальных символов
