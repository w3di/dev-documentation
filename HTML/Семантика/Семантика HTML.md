# Семантика HTML — глубокое погружение

## Оглавление

1. [Что такое семантика](#1-что-такое-семантика)
2. [Структурные элементы](#2-структурные-элементы)
3. [Контентные семантические элементы](#3-контентные-семантические-элементы)
4. [Текстовые семантические элементы](#4-текстовые-семантические-элементы)
5. [Outline Algorithm](#5-outline-algorithm)
6. [Landmark Roles](#6-landmark-roles)
7. [Microformats и семантическая разметка](#7-microformats-и-семантическая-разметка)
8. [Антипаттерны](#8-антипаттерны)
9. [Практические паттерны](#9-практические-паттерны)
10. [Accessibility Tree](#10-accessibility-tree)

---

## 1. Что такое семантика

### 1.1 Определение

Семантика в HTML — это использование элементов разметки в соответствии с их **значением**, а не визуальным представлением. Семантический HTML описывает **что** представляет собой контент, а не **как** он выглядит.

```html
<!-- Несемантично: визуальная разметка -->
<div class="header">
  <div class="nav">
    <div class="nav-item"><span class="bold">Ссылка</span></div>
  </div>
</div>

<!-- Семантично: описывает структуру и значение -->
<header>
  <nav>
    <ul>
      <li><a href="/">Ссылка</a></li>
    </ul>
  </nav>
</header>
```

### 1.2 Зачем нужна семантика

#### Accessibility (Доступность)

Assistive technologies (скринридеры, брайлевские дисплеи) **зависят** от семантики HTML. Скринридер, встречая `<nav>`, объявляет пользователю «навигация» и позволяет перейти к ней напрямую. `<div class="nav">` для скринридера — просто безымянный контейнер.

Статистика: по данным WebAIM Million Report, более 96% домашних страниц имеют автоматически обнаруживаемые ошибки доступности, и большинство из них связаны с отсутствием семантической разметки.

#### SEO (Поисковая оптимизация)

Поисковые системы используют семантику для:
- Понимания структуры страницы
- Определения основного контента (`<main>`)
- Извлечения навигации (`<nav>`)
- Идентификации отдельных статей (`<article>`)
- Отображения rich snippets (структурированные данные)

#### Maintainability (Поддерживаемость)

Семантический код **самодокументирован**. Разработчик, читающий `<aside>`, сразу понимает, что это побочный контент. `<div class="sidebar-left-v2-new">` требует дополнительного контекста.

#### Machine Readability (Машинная обработка)

RSS-ридеры, архиваторы (Wayback Machine), AI-модели и другие инструменты лучше обрабатывают семантический HTML.

### 1.3 Принцип выбора элемента

Алгоритм принятия решения:

1. Есть ли HTML-элемент, который точно описывает **значение** контента?
2. Если да — используйте его
3. Если нет — используйте `<div>` (для блочной группировки) или `<span>` (для inline-группировки)
4. Добавьте ARIA-роли только если нативная семантика недостаточна

> **Первое правило ARIA:** Если можно использовать нативный HTML-элемент с нужной семантикой и поведением — используйте его вместо добавления ARIA-роли.

---

## 2. Структурные элементы

### 2.1 Элемент `<header>`

**Спецификация:** Вводный контент или набор навигационных средств. Обычно содержит заголовок, логотип, поисковую форму, навигацию.

```html
<!-- Глобальный header страницы -->
<header>
  <a href="/" class="logo">
    <img src="/logo.svg" alt="Название компании">
  </a>
  <nav aria-label="Основная навигация">
    <ul>
      <li><a href="/about">О нас</a></li>
      <li><a href="/services">Услуги</a></li>
      <li><a href="/contact">Контакты</a></li>
    </ul>
  </nav>
  <form role="search" action="/search">
    <input type="search" name="q" aria-label="Поиск по сайту">
    <button type="submit">Найти</button>
  </form>
</header>

<!-- Header конкретной секции -->
<article>
  <header>
    <h2>Заголовок статьи</h2>
    <p>Автор: <a href="/author/ivan">Иван Петров</a></p>
    <time datetime="2024-01-15">15 января 2024</time>
  </header>
  <p>Текст статьи...</p>
</article>
```

**Правила:**
- Может быть несколько `<header>` на странице (по одному на секцию)
- Не может содержать вложенные `<header>` или `<footer>`
- Не является sectioning content — не создаёт новую секцию в outline
- Implicit ARIA role: `banner` (только если является дочерним элементом `<body>`)

### 2.2 Элемент `<nav>`

**Спецификация:** Секция с навигационными ссылками — либо внутри документа, либо на другие страницы.

```html
<!-- Основная навигация -->
<nav aria-label="Основная навигация">
  <ul>
    <li><a href="/">Главная</a></li>
    <li><a href="/catalog">Каталог</a></li>
    <li><a href="/about">О нас</a></li>
  </ul>
</nav>

<!-- Хлебные крошки -->
<nav aria-label="Хлебные крошки">
  <ol>
    <li><a href="/">Главная</a></li>
    <li><a href="/catalog">Каталог</a></li>
    <li aria-current="page">Товар</li>
  </ol>
</nav>

<!-- Навигация по оглавлению -->
<nav aria-label="Оглавление">
  <h2>Содержание</h2>
  <ol>
    <li><a href="#section-1">Введение</a></li>
    <li><a href="#section-2">Основная часть</a></li>
    <li><a href="#section-3">Заключение</a></li>
  </ol>
</nav>

<!-- Пагинация -->
<nav aria-label="Пагинация">
  <ul>
    <li><a href="/page/1">1</a></li>
    <li><a href="/page/2" aria-current="page">2</a></li>
    <li><a href="/page/3">3</a></li>
  </ul>
</nav>
```

**Правила:**
- Не обязательно оборачивать каждый набор ссылок в `<nav>` — только основные навигационные блоки
- Implicit ARIA role: `navigation`
- При нескольких `<nav>` на странице используйте `aria-label` для различения

> **Gotcha:** Футерные ссылки на социальные сети или правовые документы обычно **не** нужно оборачивать в `<nav>`. Используйте `<nav>` для ключевых навигационных блоков.

### 2.3 Элемент `<main>`

**Спецификация:** Доминирующий контент `<body>` документа. Контент, непосредственно связанный с центральной темой или функциональностью.

```html
<body>
  <header>...</header>
  <nav>...</nav>

  <main>
    <h1>Заголовок страницы</h1>
    <article>...</article>
    <article>...</article>
  </main>

  <aside>...</aside>
  <footer>...</footer>
</body>
```

**Правила:**
- **Уникален** на странице — только один видимый `<main>` (другие должны иметь атрибут `hidden`)
- Не должен быть потомком `<article>`, `<aside>`, `<footer>`, `<header>` или `<nav>`
- Исключает контент, повторяющийся на нескольких страницах (навигация, шапка, подвал, сайдбар)
- Implicit ARIA role: `main`
- Скринридеры используют его как landmark для быстрого перехода к основному контенту

```html
<!-- Skip link для keyboard-навигации -->
<body>
  <a href="#main-content" class="skip-link">
    Перейти к основному контенту
  </a>
  <header>...</header>
  <main id="main-content">
    <!-- Основной контент -->
  </main>
</body>
```

### 2.4 Элемент `<section>`

**Спецификация:** Тематическая группировка контента, обычно с заголовком.

```html
<main>
  <section>
    <h2>Преимущества</h2>
    <p>Описание преимуществ...</p>
  </section>

  <section>
    <h2>Отзывы</h2>
    <article>
      <h3>Отзыв от Ивана</h3>
      <p>Отличный продукт!</p>
    </article>
    <article>
      <h3>Отзыв от Марии</h3>
      <p>Рекомендую всем!</p>
    </article>
  </section>

  <section>
    <h2>Контакты</h2>
    <form>...</form>
  </section>
</main>
```

**Правила:**
- Является sectioning content — создаёт новый раздел в document outline
- Должен иметь заголовок (`<h1>`-`<h6>`)
- Implicit ARIA role: `region` (только если есть accessible name через `aria-label` или `aria-labelledby`)
- Не используйте `<section>` как замену `<div>` для стилизации

> **Когда использовать `<section>`:** Если контент логически самостоятелен, имеет свой заголовок и может быть перечислен в оглавлении — используйте `<section>`. Если нужен просто контейнер для CSS — используйте `<div>`.

### 2.5 Элемент `<article>`

**Спецификация:** Самостоятельный, независимый фрагмент контента, который может быть распространён или повторно использован отдельно (например, в RSS-ленте).

```html
<!-- Блог-пост -->
<article>
  <header>
    <h2>Как работает Event Loop</h2>
    <p>Опубликовано <time datetime="2024-03-15">15 марта 2024</time></p>
    <p>Автор: <address><a href="/authors/ivan">Иван Петров</a></address></p>
  </header>

  <p>Event Loop — это механизм...</p>

  <section>
    <h3>Call Stack</h3>
    <p>Стек вызовов...</p>
  </section>

  <section>
    <h3>Task Queue</h3>
    <p>Очередь задач...</p>
  </section>

  <footer>
    <p>Теги: <a href="/tags/js">JavaScript</a>, <a href="/tags/async">Async</a></p>
  </footer>
</article>

<!-- Комментарий (article внутри article) -->
<article>
  <h2>Статья</h2>
  <p>Текст статьи...</p>

  <section>
    <h3>Комментарии</h3>

    <article>
      <header>
        <p><b>Мария</b> <time datetime="2024-03-16T14:30">16 марта, 14:30</time></p>
      </header>
      <p>Отличная статья!</p>
    </article>

    <article>
      <header>
        <p><b>Пётр</b> <time datetime="2024-03-16T15:00">16 марта, 15:00</time></p>
      </header>
      <p>Спасибо за объяснение!</p>
    </article>
  </section>
</article>

<!-- Карточка товара -->
<article>
  <h3>iPhone 15 Pro</h3>
  <img src="iphone.jpg" alt="iPhone 15 Pro в чёрном цвете">
  <p>Цена: 89 990 ₽</p>
  <button>В корзину</button>
</article>
```

**Правила:**
- Является sectioning content
- Implicit ARIA role: `article`
- Может содержать вложенные `<article>` (комментарии к статье)
- Тест: «Будет ли этот контент иметь смысл вне текущей страницы?» Если да — `<article>`.

### 2.6 Элемент `<aside>`

**Спецификация:** Контент, который косвенно связан с окружающим содержимым. Часто представлен как боковая панель.

```html
<!-- Боковая панель сайта -->
<aside aria-label="Боковая панель">
  <section>
    <h2>Популярные статьи</h2>
    <ul>
      <li><a href="/post/1">Статья 1</a></li>
      <li><a href="/post/2">Статья 2</a></li>
    </ul>
  </section>

  <section>
    <h2>Подписка</h2>
    <form>
      <input type="email" placeholder="Email">
      <button>Подписаться</button>
    </form>
  </section>
</aside>

<!-- Вставка внутри статьи (pull quote) -->
<article>
  <h2>Реактивное программирование</h2>
  <p>Реактивное программирование — это парадигма...</p>

  <aside>
    <p>«Реактивные системы отзывчивы, устойчивы, эластичны и управляемы сообщениями» — Reactive Manifesto</p>
  </aside>

  <p>Продолжение текста...</p>
</article>

<!-- Связанный контент -->
<article>
  <h2>Обзор TypeScript 5.0</h2>
  <p>Текст обзора...</p>

  <aside>
    <h3>Связанные статьи</h3>
    <ul>
      <li><a href="/ts-4">Что нового в TypeScript 4.0</a></li>
      <li><a href="/ts-generics">Generics в TypeScript</a></li>
    </ul>
  </aside>
</article>
```

**Правила:**
- Является sectioning content
- Implicit ARIA role: `complementary` (только как прямой дочерний элемент `<body>`)
- Контент в `<aside>` должен быть связан с окружающим контентом, но не обязателен для его понимания

### 2.7 Элемент `<footer>`

**Спецификация:** Footer секции или всего документа. Обычно содержит информацию об авторе, копирайт, ссылки на связанные документы.

```html
<!-- Глобальный footer сайта -->
<footer>
  <nav aria-label="Навигация в подвале">
    <ul>
      <li><a href="/privacy">Политика конфиденциальности</a></li>
      <li><a href="/terms">Условия использования</a></li>
      <li><a href="/sitemap">Карта сайта</a></li>
    </ul>
  </nav>
  <p><small>&copy; 2024 Компания. Все права защищены.</small></p>
</footer>

<!-- Footer статьи -->
<article>
  <h2>Заголовок</h2>
  <p>Текст...</p>
  <footer>
    <p>Автор: Иван Петров</p>
    <p>Опубликовано: <time datetime="2024-01-15">15 января 2024</time></p>
    <p>Категория: <a href="/category/tech">Технологии</a></p>
  </footer>
</article>
```

**Правила:**
- Может быть несколько `<footer>` на странице
- Не может содержать вложенные `<footer>` или `<header>`
- Не является sectioning content
- Implicit ARIA role: `contentinfo` (только как прямой дочерний элемент `<body>`)

### 2.8 Элемент `<search>`

**Спецификация (новый элемент):** Контейнер для элементов, связанных с функциональностью поиска или фильтрации.

```html
<search>
  <form action="/search">
    <label for="search-input">Поиск по сайту</label>
    <input id="search-input" type="search" name="q">
    <button type="submit">Найти</button>
  </form>
</search>

<!-- Фильтрация результатов -->
<search>
  <h2>Фильтры</h2>
  <form>
    <fieldset>
      <legend>Категория</legend>
      <label><input type="checkbox" name="cat" value="js"> JavaScript</label>
      <label><input type="checkbox" name="cat" value="css"> CSS</label>
    </fieldset>
    <button type="submit">Применить</button>
  </form>
</search>
```

**Правила:**
- Implicit ARIA role: `search`
- Заменяет устаревший паттерн `<div role="search">`
- Поддержка браузерами с 2023 года

---

## 3. Контентные семантические элементы

### 3.1 `<figure>` и `<figcaption>`

`<figure>` — самостоятельная единица контента с опциональной подписью. Может быть изображением, диаграммой, фрагментом кода, таблицей — чем угодно, что дополняет основной текст, но может быть перемещено без потери смысла основного контента.

```html
<!-- Изображение с подписью -->
<figure>
  <img src="architecture.png"
       alt="Диаграмма микросервисной архитектуры с API Gateway,
            тремя сервисами и общей базой данных">
  <figcaption>
    Рис. 1 — Типичная микросервисная архитектура с API Gateway
  </figcaption>
</figure>

<!-- Фрагмент кода -->
<figure>
  <pre><code class="language-js">
const memoize = (fn) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};
  </code></pre>
  <figcaption>Пример реализации мемоизации в JavaScript</figcaption>
</figure>

<!-- Цитата -->
<figure>
  <blockquote>
    <p>Premature optimization is the root of all evil.</p>
  </blockquote>
  <figcaption>— Donald Knuth, <cite>The Art of Computer Programming</cite></figcaption>
</figure>

<!-- Группа изображений -->
<figure>
  <img src="before.jpg" alt="Дизайн до редизайна">
  <img src="after.jpg" alt="Дизайн после редизайна">
  <figcaption>Сравнение дизайна до и после редизайна 2024 года</figcaption>
</figure>
```

**Правила:**
- `<figcaption>` должен быть первым или последним дочерним элементом `<figure>`
- Может быть только один `<figcaption>` внутри `<figure>`
- `<figure>` не обязан содержать `<figcaption>`
- Implicit ARIA role: `figure`

### 3.2 `<time>`

Представляет дату и/или время в машиночитаемом формате.

```html
<!-- Дата -->
<p>Опубликовано: <time datetime="2024-03-15">15 марта 2024</time></p>

<!-- Дата и время -->
<p>Начало: <time datetime="2024-03-15T19:00:00+03:00">15 марта в 19:00 МСК</time></p>

<!-- Только время -->
<p>Открыто с <time datetime="09:00">9:00</time> до <time datetime="18:00">18:00</time></p>

<!-- Длительность -->
<p>Продолжительность: <time datetime="PT2H30M">2 часа 30 минут</time></p>

<!-- Год и месяц -->
<p>Выпуск: <time datetime="2024-03">март 2024</time></p>

<!-- Без видимого текста (machine-readable only) -->
<time datetime="2024-03-15"></time>
```

Форматы `datetime`:
| Формат | Пример | Описание |
|--------|--------|----------|
| `YYYY-MM-DD` | `2024-03-15` | Дата |
| `HH:MM` | `19:30` | Время |
| `YYYY-MM-DDTHH:MM:SS` | `2024-03-15T19:30:00` | Дата и время |
| `YYYY-MM-DDTHH:MM:SS±HH:MM` | `2024-03-15T19:30:00+03:00` | С часовым поясом |
| `PTXHXMXS` | `PT2H30M` | Длительность (ISO 8601) |
| `YYYY-Www` | `2024-W11` | Неделя года |
| `YYYY-MM` | `2024-03` | Год и месяц |
| `YYYY` | `2024` | Только год |

### 3.3 `<mark>`

Выделение текста, релевантного в текущем контексте. Не путать с `<em>` (смысловое ударение) или `<strong>` (важность).

```html
<!-- Результаты поиска -->
<p>Найдено 15 результатов по запросу «JavaScript»:</p>
<p>...<mark>JavaScript</mark> — это язык программирования...</p>

<!-- Выделение в цитате -->
<blockquote>
  <p>Согласно документации, <mark>все запросы должны быть аутентифицированы</mark>.
  Анонимный доступ не поддерживается.</p>
</blockquote>

<!-- Текущий элемент в навигации (нестандартное, но допустимое использование) -->
<p>Шаг 1 → Шаг 2 → <mark>Шаг 3</mark> → Шаг 4</p>
```

### 3.4 `<progress>` и `<meter>`

#### `<progress>` — индикатор прогресса выполнения задачи

```html
<!-- Определённый прогресс -->
<label for="file-upload">Загрузка файла:</label>
<progress id="file-upload" value="70" max="100">70%</progress>

<!-- Неопределённый прогресс (без value) -->
<label for="processing">Обработка:</label>
<progress id="processing">Обработка...</progress>
```

#### `<meter>` — скалярное измерение в известном диапазоне

```html
<!-- Использование диска -->
<label for="disk">Использовано:</label>
<meter id="disk" value="75" min="0" max="100"
       low="60" high="85" optimum="30">75 ГБ из 100 ГБ</meter>

<!-- Оценка -->
<meter value="4.5" min="0" max="5">4.5 из 5</meter>

<!-- Температура -->
<meter value="36.6" min="35" max="42"
       low="36" high="37.5" optimum="36.6">36.6°C</meter>
```

| Атрибут | `<progress>` | `<meter>` |
|---------|-------------|-----------|
| `value` | Текущий прогресс | Текущее значение |
| `max` | Максимальное значение | Максимум диапазона |
| `min` | Нет | Минимум диапазона |
| `low` | Нет | Нижняя граница «нормы» |
| `high` | Нет | Верхняя граница «нормы» |
| `optimum` | Нет | Оптимальное значение |

> **Важно:** `<progress>` — для задач с началом и концом (загрузка, установка). `<meter>` — для измерений в известном диапазоне (температура, оценка, заполненность). Не используйте `<meter>` для прогресса и наоборот.

### 3.5 `<details>` и `<summary>`

Нативный интерактивный элемент раскрытия/скрытия контента без JavaScript.

```html
<!-- Базовое использование -->
<details>
  <summary>Показать подробности</summary>
  <p>Скрытый контент, который раскрывается при клике на summary.</p>
</details>

<!-- Открыт по умолчанию -->
<details open>
  <summary>Подробная информация</summary>
  <p>Этот контент виден сразу.</p>
</details>

<!-- FAQ -->
<section>
  <h2>Часто задаваемые вопросы</h2>

  <details>
    <summary>Как оформить возврат?</summary>
    <p>Для оформления возврата перейдите в раздел «Мои заказы»...</p>
  </details>

  <details>
    <summary>Каковы сроки доставки?</summary>
    <p>Стандартная доставка занимает 3-5 рабочих дней...</p>
  </details>
</section>

<!-- Аккордеон (exclusive accordion с атрибутом name) -->
<details name="faq">
  <summary>Вопрос 1</summary>
  <p>Ответ 1</p>
</details>
<details name="faq">
  <summary>Вопрос 2</summary>
  <p>Ответ 2</p>
</details>
<!-- При открытии одного details с тем же name другие автоматически закрываются -->
```

**Правила:**
- `<summary>` должен быть первым дочерним элементом `<details>`
- Если `<summary>` отсутствует, браузер подставит текст по умолчанию (обычно «Details»)
- Событие `toggle` срабатывает при открытии/закрытии
- Атрибут `name` (с 2023) позволяет создавать эксклюзивные аккордеоны

```html
<script>
  document.querySelector('details').addEventListener('toggle', (event) => {
    console.log(event.target.open ? 'Открыт' : 'Закрыт');
  });
</script>
```

### 3.6 `<dialog>`

Нативный диалог (модальное или немодальное окно).

```html
<!-- Модальный диалог -->
<dialog id="confirm-dialog">
  <h2>Подтверждение</h2>
  <p>Вы уверены, что хотите удалить элемент?</p>
  <form method="dialog">
    <button value="cancel">Отмена</button>
    <button value="confirm">Удалить</button>
  </form>
</dialog>

<button onclick="document.getElementById('confirm-dialog').showModal()">
  Удалить
</button>

<script>
  const dialog = document.getElementById('confirm-dialog');

  dialog.addEventListener('close', () => {
    console.log(dialog.returnValue); // "cancel" или "confirm"
  });

  // Модальный: блокирует взаимодействие с остальной страницей
  // dialog.showModal();

  // Немодальный: не блокирует
  // dialog.show();

  // Закрыть программно
  // dialog.close('result-value');
</script>
```

**Правила:**
- `showModal()` — модальный, с backdrop, focus trap, закрытие по Escape
- `show()` — немодальный, без backdrop
- `method="dialog"` на `<form>` внутри `<dialog>` — автоматическое закрытие при submit
- `::backdrop` — псевдоэлемент для стилизации фона модального окна
- Implicit ARIA role: `dialog`
- Focus trap: при модальном открытии фокус не может выйти за пределы диалога

---

## 4. Текстовые семантические элементы

### 4.1 `<em>` vs `<i>`

| Элемент | Семантика | ARIA | Пример |
|---------|-----------|------|--------|
| `<em>` | Смысловое ударение, акцент | Скринридер меняет интонацию | «Я *не* говорил этого» |
| `<i>` | Альтернативный голос, технический термин, иноязычное слово | Нет особой роли | Термин *closure* означает... |

```html
<!-- em: смысловое ударение меняет значение предложения -->
<p>Кот сидел на <em>коврике</em>.</p>   <!-- Именно на коврике, а не на стуле -->
<p><em>Кот</em> сидел на коврике.</p>    <!-- Именно кот, а не собака -->

<!-- i: альтернативный тон, без изменения смысла -->
<p>Термин <i lang="en">event loop</i> обозначает цикл обработки событий.</p>
<p>Корабль <i>Аврора</i> — музей в Санкт-Петербурге.</p>
<p>Он подумал: <i>Вот это поворот!</i></p>
```

> **Важно:** Вложенные `<em>` усиливают акцент: `<em>очень <em>важно</em></em>`.

### 4.2 `<strong>` vs `<b>`

| Элемент | Семантика | ARIA | Пример |
|---------|-----------|------|--------|
| `<strong>` | Важность, серьёзность, срочность | Некоторые скринридеры меняют интонацию | **Внимание: файл будет удалён!** |
| `<b>` | Привлечение внимания без особой важности | Нет особой роли | **Ключевые слова** в тексте |

```html
<!-- strong: важность -->
<p><strong>Внимание!</strong> Этот процесс необратим.</p>

<!-- Вложенные strong: повышение важности -->
<p><strong>Внимание! <strong>Все данные будут удалены!</strong></strong></p>

<!-- b: стилистическое выделение без семантической важности -->
<p>В рецепте используются <b>помидоры</b>, <b>базилик</b> и <b>моцарелла</b>.</p>
```

### 4.3 Прочие текстовые элементы

#### `<abbr>` — аббревиатура

```html
<p>Используйте <abbr title="Application Programming Interface">API</abbr>
для интеграции.</p>

<!-- При первом упоминании раскройте аббревиатуру в тексте -->
<p>Cascading Style Sheets (<abbr>CSS</abbr>) — язык стилей.</p>
```

#### `<cite>` — ссылка на произведение

```html
<p>Как описано в книге <cite>Clean Code</cite> Роберта Мартина...</p>

<blockquote>
  <p>Programs must be written for people to read, and only
  incidentally for machines to execute.</p>
</blockquote>
<p>— Harold Abelson, <cite>Structure and Interpretation of Computer Programs</cite></p>
```

> **Gotcha:** `<cite>` — для названий произведений (книг, фильмов, статей, спецификаций), **не** для имён авторов. Спецификация явно запрещает использовать `<cite>` для имён людей.

#### `<code>`, `<kbd>`, `<samp>`, `<var>`

```html
<!-- code: фрагмент кода -->
<p>Используйте метод <code>Array.prototype.map()</code> для трансформации.</p>

<!-- kbd: пользовательский ввод с клавиатуры -->
<p>Нажмите <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>I</kbd> для DevTools.</p>

<!-- samp: вывод программы -->
<p>Консоль выведет: <samp>Hello, World!</samp></p>

<!-- var: математическая переменная или placeholder -->
<p>Площадь круга: <var>S</var> = &pi;<var>r</var><sup>2</sup></p>

<!-- Комбинации -->
<pre><code>
$ <kbd>npm install express</kbd>
<samp>added 64 packages in 2.3s</samp>
</code></pre>
```

#### `<dfn>` — определяемый термин

```html
<p><dfn>Closure</dfn> — это функция, которая сохраняет доступ к переменным
из внешнего лексического окружения даже после завершения выполнения внешней функции.</p>

<!-- С id для ссылок -->
<p><dfn id="dfn-hoisting">Hoisting</dfn> — поведение JavaScript, при котором
объявления переменных и функций перемещаются в начало области видимости.</p>

<p>Благодаря <a href="#dfn-hoisting">hoisting</a>, функции можно вызывать до объявления.</p>
```

#### `<address>` — контактная информация

```html
<!-- Контакт автора статьи -->
<article>
  <h2>Заголовок</h2>
  <p>Текст...</p>
  <footer>
    <address>
      Автор: <a href="mailto:ivan@example.com">Иван Петров</a><br>
      <a href="https://twitter.com/ivanpetrov">@ivanpetrov</a>
    </address>
  </footer>
</article>

<!-- Контакт организации -->
<footer>
  <address>
    ООО «Компания»<br>
    ул. Примерная, д. 1<br>
    Москва, 123456<br>
    <a href="tel:+74951234567">+7 (495) 123-45-67</a>
  </address>
</footer>
```

> **Важно:** `<address>` — для контактной информации, **не** для произвольных почтовых адресов. Физический адрес магазина в карточке товара — это не `<address>`, а просто текст. `<address>` уместен для контактов автора страницы/статьи или организации, владеющей сайтом.

#### `<blockquote>` и `<q>`

```html
<!-- Блочная цитата -->
<blockquote cite="https://www.w3.org/WAI/fundamentals/accessibility-intro/">
  <p>The Web is fundamentally designed to work for all people,
  whatever their hardware, software, language, location, or ability.</p>
</blockquote>
<p>— <cite>W3C Web Accessibility Initiative</cite></p>

<!-- Строчная цитата -->
<p>Согласно документации,
<q cite="https://developer.mozilla.org">the <code>fetch()</code> method
starts the process of fetching a resource from the network</q>.</p>
```

**Разница:**
- `<blockquote>` — блочная цитата, отдельный параграф или несколько параграфов
- `<q>` — строчная цитата внутри текста, браузер добавляет кавычки автоматически
- Атрибут `cite` — URL источника (не отображается, но машиночитаем)

#### `<s>`, `<del>`, `<ins>`

```html
<!-- s: неактуальная информация (не удаление!) -->
<p>Цена: <s>5 000 ₽</s> <strong>3 500 ₽</strong></p>

<!-- del + ins: редактирование документа -->
<p>Встреча состоится <del datetime="2024-03-10">15 марта</del>
<ins datetime="2024-03-10">22 марта</ins> в 14:00.</p>

<!-- Diff-стиль -->
<pre>
<del>- const x = 1;</del>
<ins>+ const x = 2;</ins>
</pre>
```

#### `<small>` — мелкий шрифт, побочная информация

```html
<!-- Юридические примечания -->
<p><small>* Предложение действительно до 31 марта 2024 года.
Подробности на сайте.</small></p>

<!-- Copyright -->
<footer>
  <p><small>&copy; 2024 Компания. Все права защищены.</small></p>
</footer>
```

#### `<sub>` и `<sup>` — подстрочный и надстрочный текст

```html
<!-- Химические формулы -->
<p>Вода: H<sub>2</sub>O</p>
<p>Серная кислота: H<sub>2</sub>SO<sub>4</sub></p>

<!-- Математические выражения -->
<p>E = mc<sup>2</sup></p>
<p>x<sup>n</sup> + y<sup>n</sup> = z<sup>n</sup></p>

<!-- Сноски -->
<p>Это утверждение требует уточнения<sup><a href="#fn1">[1]</a></sup>.</p>
```

#### `<data>` — машиночитаемый эквивалент

```html
<ul>
  <li><data value="UPC:036000291452">Молоко 2.5%</data></li>
  <li><data value="UPC:036000291469">Кефир 1%</data></li>
</ul>
```

#### `<ruby>`, `<rt>`, `<rp>` — аннотации для восточноазиатских языков

```html
<ruby>
  漢 <rp>(</rp><rt>かん</rt><rp>)</rp>
  字 <rp>(</rp><rt>じ</rt><rp>)</rp>
</ruby>
```

---

## 5. Outline Algorithm

### 5.1 Что такое Document Outline

Document Outline (контур документа) — это иерархическая структура заголовков и секций, отражающая логическую организацию контента. Представьте оглавление книги — outline выполняет ту же функцию для веб-страницы.

### 5.2 Алгоритм из спецификации (и его провал)

HTML5 представил **sectioning content** (`<article>`, `<aside>`, `<nav>`, `<section>`) и определил алгоритм, который автоматически строил outline на основе секций. По замыслу, вложенные секции автоматически понижали уровень заголовков:

```html
<!-- По замыслу HTML5 Outline Algorithm -->
<body>
  <h1>Сайт</h1>                    <!-- Уровень 1 -->
  <section>
    <h1>Раздел</h1>                 <!-- Должен стать уровнем 2 -->
    <section>
      <h1>Подраздел</h1>            <!-- Должен стать уровнем 3 -->
    </section>
  </section>
</body>
```

**Проблема:** Ни один браузер не реализовал этот алгоритм. Скринридеры не используют его. В 2022 году алгоритм был **удалён** из спецификации.

### 5.3 Текущая реальность

Используйте **плоскую иерархию заголовков** (`h1` > `h2` > `h3` ...) без полагания на секции:

```html
<!-- Правильно: явная иерархия заголовков -->
<body>
  <header>
    <h1>Название сайта</h1>
  </header>
  <main>
    <h2>Раздел 1</h2>
    <p>Текст...</p>

    <h3>Подраздел 1.1</h3>
    <p>Текст...</p>

    <h2>Раздел 2</h2>
    <p>Текст...</p>
  </main>
</body>

<!-- Неправильно: полагание на section для определения уровня -->
<body>
  <h1>Сайт</h1>
  <section>
    <h1>Раздел</h1>           <!-- Скринридер объявит как h1! -->
    <section>
      <h1>Подраздел</h1>       <!-- И это как h1! -->
    </section>
  </section>
</body>
```

### 5.4 Элемент `<hgroup>`

`<hgroup>` группирует заголовок с подзаголовками или подписями. После удаления outline algorithm его семантика была пересмотрена:

```html
<hgroup>
  <h1>Основы JavaScript</h1>
  <p>Полное руководство для начинающих разработчиков</p>
</hgroup>

<hgroup>
  <h2>Глава 3: Функции</h2>
  <p>Объявление, вызов, замыкания и контекст выполнения</p>
</hgroup>
```

**Правила (современные):**
- Содержит один heading element (`h1`-`h6`) и ноль или более `<p>` элементов
- `<p>` элементы выступают как подзаголовки / подписи
- Implicit ARIA role: `group`
- Реализация в браузерах неоднородна — не все скринридеры корректно обрабатывают `<hgroup>`

### 5.5 Рекомендации по заголовкам

1. **Один `<h1>` на страницу** — для основного заголовка
2. **Не пропускайте уровни** — не используйте `<h4>` после `<h1>` без `<h2>` и `<h3>`
3. **Используйте заголовки для структуры**, а не для размера шрифта
4. **Каждый `<section>` должен иметь заголовок**

```html
<!-- Правильная иерархия -->
<h1>Руководство по Git</h1>
  <h2>Основы</h2>
    <h3>Инициализация репозитория</h3>
    <h3>Первый коммит</h3>
  <h2>Ветвление</h2>
    <h3>Создание веток</h3>
    <h3>Слияние веток</h3>
      <h4>Fast-forward merge</h4>
      <h4>Three-way merge</h4>
```

---

## 6. Landmark Roles

### 6.1 Что такое Landmarks

Landmarks — это ARIA-роли, определяющие основные области страницы. Скринридеры используют их для быстрой навигации: пользователь может «перепрыгивать» между landmarks, вместо того чтобы слушать весь контент последовательно.

### 6.2 Implicit ARIA Roles семантических элементов

Семантические HTML-элементы автоматически получают ARIA-роли:

| HTML-элемент | Implicit ARIA Role | Условие |
|-------------|-------------------|---------|
| `<header>` | `banner` | Только как прямой дочерний `<body>` (не внутри `<article>`, `<section>` и т.д.) |
| `<nav>` | `navigation` | Всегда |
| `<main>` | `main` | Всегда |
| `<section>` | `region` | Только если есть accessible name (`aria-label` или `aria-labelledby`) |
| `<article>` | `article` | Всегда |
| `<aside>` | `complementary` | Только как прямой дочерний `<body>` |
| `<footer>` | `contentinfo` | Только как прямой дочерний `<body>` |
| `<form>` | `form` | Только если есть accessible name |
| `<search>` | `search` | Всегда |

> **Важно:** Добавление явной ARIA-роли к элементу, который уже имеет implicit role, **не нужно** и является антипаттерном: `<nav role="navigation">` — избыточно.

### 6.3 Когда implicit role не применяется

```html
<body>
  <!-- header прямой дочерний body → role="banner" -->
  <header>Шапка сайта</header>

  <main>
    <article>
      <!-- header внутри article → НЕТ role="banner" (просто generic) -->
      <header>Шапка статьи</header>
      <p>Текст...</p>
      <!-- footer внутри article → НЕТ role="contentinfo" -->
      <footer>Подвал статьи</footer>
    </article>
  </main>

  <!-- footer прямой дочерний body → role="contentinfo" -->
  <footer>Подвал сайта</footer>
</body>
```

### 6.4 Множественные landmarks одного типа

При наличии нескольких landmarks одного типа используйте `aria-label` для различения:

```html
<nav aria-label="Основная навигация">
  <ul>...</ul>
</nav>

<nav aria-label="Хлебные крошки">
  <ol>...</ol>
</nav>

<nav aria-label="Навигация в подвале">
  <ul>...</ul>
</nav>
```

Скринридер объявит:
- «Основная навигация, navigation landmark»
- «Хлебные крошки, navigation landmark»
- «Навигация в подвале, navigation landmark»

### 6.5 Полный пример с landmarks

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Пример landmarks</title>
</head>
<body>
  <!-- banner landmark -->
  <header>
    <a href="/">Логотип</a>
    <!-- navigation landmark -->
    <nav aria-label="Основная навигация">
      <ul>
        <li><a href="/">Главная</a></li>
        <li><a href="/about">О нас</a></li>
      </ul>
    </nav>
    <!-- search landmark -->
    <search>
      <form action="/search">
        <input type="search" name="q" aria-label="Поиск">
        <button type="submit">Найти</button>
      </form>
    </search>
  </header>

  <!-- main landmark -->
  <main>
    <h1>Заголовок страницы</h1>

    <!-- region landmark (есть aria-labelledby) -->
    <section aria-labelledby="latest-heading">
      <h2 id="latest-heading">Последние статьи</h2>
      <!-- article landmark -->
      <article>
        <h3>Статья 1</h3>
        <p>Текст...</p>
      </article>
    </section>
  </main>

  <!-- complementary landmark -->
  <aside aria-label="Боковая панель">
    <h2>Популярное</h2>
    <ul>...</ul>
  </aside>

  <!-- contentinfo landmark -->
  <footer>
    <!-- navigation landmark -->
    <nav aria-label="Навигация в подвале">
      <ul>
        <li><a href="/privacy">Конфиденциальность</a></li>
        <li><a href="/terms">Условия</a></li>
      </ul>
    </nav>
    <p>&copy; 2024</p>
  </footer>
</body>
</html>
```

---

## 7. Microformats и семантическая разметка

### 7.1 Обзор технологий структурированных данных

| Технология | Синтаксис | Использование |
|------------|----------|---------------|
| Microdata | HTML-атрибуты (`itemscope`, `itemprop`) | Встроено в HTML |
| RDFa | HTML-атрибуты (`vocab`, `typeof`, `property`) | Встроено в HTML |
| JSON-LD | `<script type="application/ld+json">` | Отдельный блок в head/body |
| Microformats | CSS-классы (`h-card`, `p-name`) | Встроено в HTML через классы |

### 7.2 JSON-LD (рекомендуемый подход)

Google рекомендует JSON-LD как предпочтительный формат:

```html
<head>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Семантика HTML: полное руководство",
    "author": {
      "@type": "Person",
      "name": "Иван Петров",
      "url": "https://example.com/authors/ivan"
    },
    "datePublished": "2024-03-15",
    "dateModified": "2024-03-20",
    "publisher": {
      "@type": "Organization",
      "name": "Tech Blog",
      "logo": {
        "@type": "ImageObject",
        "url": "https://example.com/logo.png"
      }
    },
    "description": "Подробное руководство по семантическому HTML",
    "image": "https://example.com/article-image.jpg"
  }
  </script>
</head>
```

### 7.3 Microdata

```html
<article itemscope itemtype="https://schema.org/Article">
  <header>
    <h2 itemprop="headline">Заголовок статьи</h2>
    <p>Автор:
      <span itemprop="author" itemscope itemtype="https://schema.org/Person">
        <a itemprop="url" href="/authors/ivan">
          <span itemprop="name">Иван Петров</span>
        </a>
      </span>
    </p>
    <time itemprop="datePublished" datetime="2024-03-15">15 марта 2024</time>
  </header>
  <div itemprop="articleBody">
    <p>Текст статьи...</p>
  </div>
</article>
```

### 7.4 Распространённые Schema.org типы

| Тип | Использование | Rich Snippet |
|-----|--------------|-------------|
| `Article` / `BlogPosting` | Статьи, блог-посты | Заголовок, автор, дата |
| `Product` | Товары | Цена, рейтинг, наличие |
| `Organization` | Информация о компании | Knowledge Panel |
| `BreadcrumbList` | Хлебные крошки | Навигационный путь в поиске |
| `FAQPage` | Часто задаваемые вопросы | Раскрывающиеся ответы |
| `HowTo` | Инструкции | Пошаговое руководство |
| `Event` | Мероприятия | Дата, место, цена |
| `Recipe` | Рецепты | Фото, время, ингредиенты |
| `Review` / `AggregateRating` | Отзывы и рейтинги | Звёзды в поиске |
| `LocalBusiness` | Местный бизнес | Адрес, часы работы |
| `VideoObject` | Видео | Превью в поиске |
| `JobPosting` | Вакансии | Зарплата, локация |

### 7.5 Хлебные крошки с JSON-LD

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Главная",
      "item": "https://example.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Каталог",
      "item": "https://example.com/catalog/"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Электроника"
    }
  ]
}
</script>
```

### 7.6 FAQ Page

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Что такое семантический HTML?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Семантический HTML — это использование HTML-элементов в соответствии с их значением для описания структуры контента."
      }
    },
    {
      "@type": "Question",
      "name": "Зачем нужна семантика?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Семантика улучшает доступность, SEO и поддерживаемость кода."
      }
    }
  ]
}
</script>
```

### 7.7 Проверка структурированных данных

Инструменты проверки:
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema Markup Validator](https://validator.schema.org/)
- Chrome DevTools → Lighthouse → SEO audit

---

## 8. Антипаттерны

### 8.1 Div Soup

«Div soup» — использование `<div>` для всего вместо семантических элементов:

```html
<!-- Антипаттерн: div soup -->
<div class="header">
  <div class="logo">Компания</div>
  <div class="nav">
    <div class="nav-item"><a href="/">Главная</a></div>
    <div class="nav-item"><a href="/about">О нас</a></div>
  </div>
</div>
<div class="content">
  <div class="article">
    <div class="article-header">
      <div class="title">Заголовок</div>
    </div>
    <div class="article-body">Текст...</div>
  </div>
</div>
<div class="sidebar">
  <div class="widget">Виджет</div>
</div>
<div class="footer">
  <div class="copyright">&copy; 2024</div>
</div>

<!-- Семантическая версия -->
<header>
  <a href="/" class="logo">Компания</a>
  <nav aria-label="Основная навигация">
    <ul>
      <li><a href="/">Главная</a></li>
      <li><a href="/about">О нас</a></li>
    </ul>
  </nav>
</header>
<main>
  <article>
    <header>
      <h1>Заголовок</h1>
    </header>
    <p>Текст...</p>
  </article>
</main>
<aside aria-label="Боковая панель">
  <section>
    <h2>Виджет</h2>
  </section>
</aside>
<footer>
  <p><small>&copy; 2024</small></p>
</footer>
```

### 8.2 Неправильное использование заголовков

```html
<!-- Антипаттерн: заголовок для стилизации -->
<h3 class="small-text">Обычный текст, стилизованный как мелкий</h3>

<!-- Правильно: используйте CSS для стилизации -->
<p class="small-text">Обычный текст</p>

<!-- Антипаттерн: пропуск уровней -->
<h1>Главная</h1>
<h4>Подраздел</h4>  <!-- Где h2 и h3? -->

<!-- Антипаттерн: несколько h1 -->
<h1>Шапка</h1>
<h1>Контент</h1>
<h1>Подвал</h1>
```

### 8.3 Злоупотребление `<br>`

```html
<!-- Антипаттерн: <br> для отступов -->
<p>Текст</p>
<br>
<br>
<br>
<p>Другой текст</p>

<!-- Правильно: используйте CSS margin -->
<p>Текст</p>
<p class="mt-large">Другой текст</p>

<!-- Антипаттерн: <br> вместо списка -->
<p>
  Пункт 1<br>
  Пункт 2<br>
  Пункт 3
</p>

<!-- Правильно -->
<ul>
  <li>Пункт 1</li>
  <li>Пункт 2</li>
  <li>Пункт 3</li>
</ul>
```

### 8.4 Неправильное использование `<table>`

```html
<!-- Антипаттерн: таблица для layout -->
<table>
  <tr>
    <td>Шапка</td>
  </tr>
  <tr>
    <td>Навигация</td>
    <td>Контент</td>
    <td>Сайдбар</td>
  </tr>
  <tr>
    <td>Подвал</td>
  </tr>
</table>

<!-- Правильно: CSS Grid/Flexbox для layout, table — только для табличных данных -->
<table>
  <caption>Продажи за 2024 год</caption>
  <thead>
    <tr>
      <th scope="col">Месяц</th>
      <th scope="col">Продажи</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Январь</th>
      <td>150 000 ₽</td>
    </tr>
  </tbody>
</table>
```

### 8.5 Кнопки и ссылки

```html
<!-- Антипаттерн: div как кнопка -->
<div class="button" onclick="doSomething()">Нажми</div>
<!-- Проблемы: нет focus, нет keyboard support, нет роли для скринридеров -->

<!-- Антипаттерн: ссылка как кнопка -->
<a href="#" onclick="doSomething(); return false;">Действие</a>
<!-- Проблемы: неправильная семантика, курсор-указатель вводит в заблуждение -->

<!-- Правильно -->
<button type="button" onclick="doSomething()">Действие</button>

<!-- Антипаттерн: кнопка как ссылка -->
<button onclick="window.location='/page'">Перейти</button>

<!-- Правильно: ссылка для навигации -->
<a href="/page">Перейти</a>
```

**Правило:** Ссылки (`<a>`) — для навигации (переход на URL). Кнопки (`<button>`) — для действий (submit, toggle, trigger).

### 8.6 Злоупотребление ARIA

```html
<!-- Антипаттерн: ARIA-роль на семантическом элементе -->
<nav role="navigation">...</nav>     <!-- Избыточно -->
<main role="main">...</main>         <!-- Избыточно -->
<button role="button">Нажми</button> <!-- Избыточно -->

<!-- Антипаттерн: ARIA вместо нативной семантики -->
<div role="button" tabindex="0" onclick="...">Кнопка</div>
<!-- Нужно вручную реализовать: focus, Enter, Space, disabled state -->

<!-- Правильно: нативный элемент -->
<button onclick="...">Кнопка</button>
```

### 8.7 Неправильное использование `<section>`

```html
<!-- Антипаттерн: section вместо div для стилизации -->
<section class="container">
  <section class="row">
    <section class="col-6">Колонка</section>
    <section class="col-6">Колонка</section>
  </section>
</section>

<!-- Правильно: div для layout-контейнеров -->
<div class="container">
  <div class="row">
    <div class="col-6">Колонка</div>
    <div class="col-6">Колонка</div>
  </div>
</div>
```

---

## 9. Практические паттерны

### 9.1 Правильная структура страницы

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Название страницы — Название сайта</title>
  <meta name="description" content="Описание страницы">
</head>
<body>
  <!-- Skip link -->
  <a href="#main" class="visually-hidden focusable">
    Перейти к основному контенту
  </a>

  <!-- Шапка сайта -->
  <header>
    <a href="/" aria-label="Главная страница">
      <img src="/logo.svg" alt="Название компании">
    </a>

    <nav aria-label="Основная навигация">
      <ul>
        <li><a href="/" aria-current="page">Главная</a></li>
        <li><a href="/catalog">Каталог</a></li>
        <li><a href="/about">О нас</a></li>
        <li><a href="/contact">Контакты</a></li>
      </ul>
    </nav>

    <search>
      <form action="/search">
        <label for="site-search" class="visually-hidden">Поиск по сайту</label>
        <input id="site-search" type="search" name="q" placeholder="Поиск...">
        <button type="submit">
          <span class="visually-hidden">Найти</span>
          <svg aria-hidden="true"><!-- иконка --></svg>
        </button>
      </form>
    </search>
  </header>

  <!-- Хлебные крошки -->
  <nav aria-label="Хлебные крошки">
    <ol>
      <li><a href="/">Главная</a></li>
      <li><a href="/catalog">Каталог</a></li>
      <li aria-current="page">Товар</li>
    </ol>
  </nav>

  <!-- Основной контент -->
  <main id="main">
    <h1>Заголовок страницы</h1>

    <section aria-labelledby="products-heading">
      <h2 id="products-heading">Товары</h2>
      <!-- Карточки товаров -->
      <article>...</article>
      <article>...</article>
    </section>
  </main>

  <!-- Боковая панель -->
  <aside aria-label="Дополнительная информация">
    <section>
      <h2>Популярные категории</h2>
      <ul>...</ul>
    </section>
  </aside>

  <!-- Подвал -->
  <footer>
    <nav aria-label="Навигация в подвале">
      <ul>
        <li><a href="/privacy">Конфиденциальность</a></li>
        <li><a href="/terms">Условия</a></li>
      </ul>
    </nav>

    <address>
      ООО «Компания»<br>
      <a href="mailto:info@example.com">info@example.com</a>
    </address>

    <p><small>&copy; 2024 Компания. Все права защищены.</small></p>
  </footer>
</body>
</html>
```

### 9.2 Когда `<article>` vs `<section>`

| Критерий | `<article>` | `<section>` |
|----------|-------------|-------------|
| Самостоятельность | Самостоятелен, может быть переиспользован | Часть более крупного целого |
| RSS | Подходит для RSS-ленты | Не подходит для RSS |
| Примеры | Блог-пост, комментарий, карточка товара, твит | Глава, вкладка, тематический раздел страницы |
| Вложенность | Может содержать `<section>` | Может содержать `<article>` |

```html
<!-- Блог: article содержит sections -->
<article>
  <h2>Руководство по Git</h2>
  <section>
    <h3>Установка</h3>
    <p>...</p>
  </section>
  <section>
    <h3>Базовые команды</h3>
    <p>...</p>
  </section>
</article>

<!-- Каталог: section содержит articles -->
<section>
  <h2>Новинки</h2>
  <article>
    <h3>Товар 1</h3>
    <p>Описание...</p>
  </article>
  <article>
    <h3>Товар 2</h3>
    <p>Описание...</p>
  </article>
</section>
```

### 9.3 Карточка товара

```html
<article class="product-card">
  <a href="/products/123" class="product-card__link">
    <figure>
      <picture>
        <source srcset="product.avif" type="image/avif">
        <source srcset="product.webp" type="image/webp">
        <img src="product.jpg"
             alt="Беспроводные наушники Sony WH-1000XM5 в чёрном цвете"
             loading="lazy"
             width="300"
             height="300">
      </picture>
    </figure>

    <h3 class="product-card__title">Sony WH-1000XM5</h3>
  </a>

  <p class="product-card__price">
    <data value="29990">29 990 ₽</data>
  </p>

  <p class="product-card__rating" aria-label="Рейтинг: 4.8 из 5">
    <meter value="4.8" min="0" max="5">4.8 из 5</meter>
    <span>(256 отзывов)</span>
  </p>

  <button type="button" class="product-card__buy">
    Добавить в корзину
  </button>
</article>
```

### 9.4 Паттерн «Карточка-ссылка»

```html
<!-- Вся карточка — кликабельная ссылка -->
<article class="card">
  <a href="/post/123" class="card__link">
    <img src="thumbnail.jpg" alt="" loading="lazy" width="400" height="200">
    <h3>Заголовок статьи</h3>
    <p>Краткое описание статьи для привлечения внимания читателя.</p>
    <time datetime="2024-03-15">15 марта 2024</time>
  </a>
</article>
```

### 9.5 Навигация с текущей страницей

```html
<nav aria-label="Основная навигация">
  <ul>
    <li><a href="/">Главная</a></li>
    <li><a href="/about" aria-current="page">О нас</a></li>
    <li><a href="/contact">Контакты</a></li>
  </ul>
</nav>

<style>
  [aria-current="page"] {
    font-weight: bold;
    border-bottom: 2px solid currentColor;
  }
</style>
```

---

## 10. Accessibility Tree

### 10.1 Что такое Accessibility Tree

Accessibility Tree — это параллельное DOM-дереву представление страницы, используемое assistive technologies. Браузер строит его на основе DOM, удаляя визуальные детали и оставляя **семантическую информацию**.

```
DOM Tree                          Accessibility Tree
─────────                         ──────────────────
<header>                    →     banner landmark
  <nav>                     →       navigation "Основная навигация"
    <ul>                    →         list (3 items)
      <li>                  →           listitem
        <a href="/">        →             link "Главная"
  <h1>                      →     heading level 1 "Заголовок"
<main>                      →     main landmark
  <p>                       →       paragraph
    <em>                    →         emphasis
<button>                    →     button "Отправить"
```

### 10.2 Компоненты узла в Accessibility Tree

Каждый узел Accessibility Tree содержит:

| Свойство | Описание | Пример |
|----------|----------|--------|
| **Role** | Роль элемента | `button`, `link`, `heading`, `navigation` |
| **Name** | Accessible name | «Отправить», «Основная навигация» |
| **Description** | Дополнительное описание | `aria-describedby` текст |
| **State** | Текущее состояние | `expanded`, `checked`, `disabled` |
| **Value** | Текущее значение | «50%» для progress bar |

### 10.3 Как вычисляется Accessible Name

Алгоритм вычисления Accessible Name (Accessible Name Computation) определяет порядок приоритетов:

1. `aria-labelledby` (наивысший приоритет)
2. `aria-label`
3. Нативная метка (`<label>` для input, `alt` для img, text content для button)
4. `title` (наименьший приоритет)
5. `placeholder` (только как fallback для input)

```html
<!-- 1. aria-labelledby (приоритет: высший) -->
<h2 id="section-title">Новости</h2>
<section aria-labelledby="section-title">
  <!-- Accessible name: "Новости" -->
</section>

<!-- 2. aria-label -->
<button aria-label="Закрыть диалог">✕</button>
<!-- Accessible name: "Закрыть диалог", а не "✕" -->

<!-- 3. Нативная метка -->
<label for="email">Email:</label>
<input id="email" type="email">
<!-- Accessible name: "Email:" -->

<img src="photo.jpg" alt="Горный пейзаж">
<!-- Accessible name: "Горный пейзаж" -->

<button>Отправить форму</button>
<!-- Accessible name: "Отправить форму" -->

<!-- 4. title (fallback) -->
<input type="text" title="Введите имя">
<!-- Accessible name: "Введите имя" (если нет label) -->
```

### 10.4 Элементы, скрытые из Accessibility Tree

```html
<!-- Скрыто из AT и визуально -->
<div hidden>Скрыто</div>
<div style="display: none">Скрыто</div>
<div style="visibility: hidden">Скрыто</div>

<!-- Скрыто из AT, но видно визуально -->
<div aria-hidden="true">Декоративный элемент</div>
<svg aria-hidden="true"><!-- декоративная иконка --></svg>

<!-- Видно в AT, но скрыто визуально (visually-hidden паттерн) -->
<span class="visually-hidden">Описание только для скринридеров</span>
```

CSS-класс `visually-hidden`:

```html
<style>
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  /* Показать при фокусе (для skip links) */
  .visually-hidden.focusable:focus {
    position: static;
    width: auto;
    height: auto;
    margin: 0;
    overflow: visible;
    clip: auto;
    clip-path: none;
    white-space: normal;
  }
</style>
```

### 10.5 Роль семантики в Accessibility Tree

Сравнение семантического и несемантического подходов:

```html
<!-- Несемантично -->
<div class="nav">
  <div class="nav-list">
    <div class="nav-item">
      <span onclick="navigate('/')">Главная</span>
    </div>
  </div>
</div>

<!-- Accessibility Tree для несемантичного варианта:
  generic
    generic
      generic
        text "Главная"
  — Скринридер: "Главная" (нет контекста, нет роли, нет навигации)
-->

<!-- Семантично -->
<nav aria-label="Основная навигация">
  <ul>
    <li><a href="/">Главная</a></li>
  </ul>
</nav>

<!-- Accessibility Tree для семантичного варианта:
  navigation "Основная навигация"
    list (1 item)
      listitem
        link "Главная"
  — Скринридер: "Основная навигация, navigation landmark,
    list, 1 item, link, Главная"
-->
```

### 10.6 Инструменты проверки Accessibility Tree

- **Chrome DevTools:** Elements panel → Accessibility tab
- **Firefox DevTools:** Accessibility Inspector (F12 → Accessibility)
- **Safari:** Web Inspector → Node → Accessibility
- **axe DevTools:** Browser extension
- **Lighthouse:** Accessibility audit
- **NVDA / VoiceOver / JAWS:** Тестирование со скринридером

### 10.7 Роли presentation и none

`role="presentation"` (синоним `role="none"`) удаляет семантическую роль элемента:

```html
<!-- Таблица для layout (не рекомендуется, но если необходимо) -->
<table role="presentation">
  <tr>
    <td>Контент</td>
    <td>Контент</td>
  </tr>
</table>
<!-- Скринридер не объявит это как таблицу -->

<!-- Декоративное изображение -->
<img src="divider.png" alt="" role="presentation">
<!-- Или просто: -->
<img src="divider.png" alt="">
```

> **Важно:** `role="presentation"` не скрывает контент из AT — только убирает роль элемента. Текст внутри всё равно будет прочитан. Для полного скрытия используйте `aria-hidden="true"`.

---

## Итого

Семантический HTML — это фундамент доступного, SEO-оптимизированного и поддерживаемого веба. Ключевые принципы:

- Используйте HTML-элементы по назначению, а не по внешнему виду
- Один `<h1>` на страницу, иерархия заголовков без пропусков
- `<article>` — самостоятельный контент, `<section>` — тематическая группировка
- Landmarks помогают пользователям assistive technologies навигировать по странице
- JSON-LD — предпочтительный формат для структурированных данных
- Accessibility Tree строится на основе семантики — каждый семантический элемент делает страницу доступнее
- Первое правило ARIA: предпочитайте нативные HTML-элементы
