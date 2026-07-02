# Метатеги и head — глубокое погружение

## Оглавление

1. [Элемент head](#1-элемент-head)
2. [meta charset](#2-meta-charset)
3. [meta viewport](#3-meta-viewport)
4. [title](#4-title)
5. [meta description](#5-meta-description)
6. [meta robots](#6-meta-robots)
7. [Open Graph Protocol](#7-open-graph-protocol)
8. [Twitter Cards](#8-twitter-cards)
9. [link rel](#9-link-rel)
10. [Resource Hints](#10-resource-hints)
11. [CSP meta tag](#11-csp-meta-tag)
12. [PWA meta tags](#12-pwa-meta-tags)

---

## 1. Элемент head

### 1.1 Назначение

Элемент `<head>` — контейнер для метаданных документа. Его содержимое не отображается на странице, но определяет поведение документа, его связи с внешними ресурсами и информацию для браузеров, поисковых систем и социальных платформ.

### 1.2 Допустимое содержимое

Согласно спецификации, `<head>` может содержать:

| Элемент | Обязательность | Количество |
|---------|---------------|-----------|
| `<title>` | Обязателен (кроме `<iframe srcdoc>`) | Ровно 1 |
| `<base>` | Опционален | Не более 1 |
| `<meta>` | Опционален | Любое количество |
| `<link>` | Опционален | Любое количество |
| `<style>` | Опционален | Любое количество |
| `<script>` | Опционален | Любое количество |
| `<noscript>` | Опционален | Любое количество |
| `<template>` | Опционален | Любое количество |

> **Важно:** Элементы, не допустимые в `<head>` (например, `<div>`, `<p>`, текстовые узлы), при обнаружении парсером **неявно закрывают** `<head>` и открывают `<body>`. Это означает, что ошибка в `<head>` может привести к неожиданному размещению метаданных в `<body>`.

### 1.3 Порядок элементов и производительность

Порядок элементов в `<head>` критически влияет на производительность загрузки страницы. Рекомендуемый порядок:

```html
<head>
  <!-- 1. charset — ОБЯЗАТЕЛЬНО в первых 1024 байтах документа -->
  <meta charset="utf-8">

  <!-- 2. Viewport — определяет layout до загрузки CSS -->
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- 3. CSP — блокирует небезопасные ресурсы как можно раньше -->
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; img-src * data:; script-src 'self'">

  <!-- 4. Title — быстро показать в табе браузера -->
  <title>Заголовок страницы — Сайт</title>

  <!-- 5. Preconnect — установить соединения до запроса ресурсов -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://cdn.example.com" crossorigin>

  <!-- 6. Inline critical CSS — первая отрисовка без блокировки -->
  <style>
    /* Критичные стили для above-the-fold контента */
    body { margin: 0; font-family: system-ui, sans-serif; }
    .header { height: 60px; background: #fff; }
  </style>

  <!-- 7. Preload — критичные ресурсы, обнаруживаемые поздно -->
  <link rel="preload" href="/fonts/inter.woff2" as="font"
        type="font/woff2" crossorigin>
  <link rel="preload" href="/images/hero.webp" as="image">

  <!-- 8. Async/defer скрипты — не блокируют рендеринг -->
  <script src="/js/analytics.js" async></script>
  <script src="/js/app.js" defer></script>

  <!-- 9. Синхронные CSS — блокируют рендеринг (минимизируйте!) -->
  <link rel="stylesheet" href="/css/main.css">

  <!-- 10. Prefetch — ресурсы для будущей навигации -->
  <link rel="prefetch" href="/next-page.html">

  <!-- 11. SEO и социальные мета-теги -->
  <meta name="description" content="Описание страницы">
  <meta property="og:title" content="Заголовок для соцсетей">
  <meta property="og:image" content="https://example.com/og.jpg">

  <!-- 12. Favicon и иконки -->
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">

  <!-- 13. Manifest -->
  <link rel="manifest" href="/manifest.json">
</head>
```

### 1.4 Критический путь рендеринга

Элементы в `<head>` напрямую влияют на Critical Rendering Path:

```
Загрузка HTML
    │
    ├── <meta charset> — определяет кодировку, без неё парсер может начать заново
    │
    ├── <link rel="stylesheet"> — БЛОКИРУЕТ рендеринг (render-blocking)
    │   └── Браузер не покажет ничего, пока CSS не загрузится и не распарсится
    │
    ├── <script> (без async/defer) — БЛОКИРУЕТ парсинг (parser-blocking)
    │   └── Парсер останавливается, ждёт загрузки и выполнения
    │
    ├── <script defer> — НЕ блокирует парсинг
    │   └── Загружается параллельно, выполняется после парсинга
    │
    ├── <script async> — НЕ блокирует парсинг
    │   └── Загружается параллельно, выполняется сразу после загрузки
    │
    └── <link rel="preload"> — Начинает загрузку немедленно
        └── Высокий приоритет, но не блокирует рендеринг
```

> **Performance tip:** Каждый render-blocking ресурс в `<head>` увеличивает время до First Contentful Paint (FCP). Минимизируйте количество синхронных CSS-файлов и перемещайте некритичный CSS в async-загрузку.

### 1.5 Элемент `<base>`

`<base>` устанавливает базовый URL для всех относительных URL в документе:

```html
<head>
  <base href="https://example.com/docs/" target="_blank">
</head>
<body>
  <!-- Резолвится в https://example.com/docs/page.html -->
  <a href="page.html">Ссылка</a>

  <!-- Резолвится в https://example.com/docs/images/logo.png -->
  <img src="images/logo.png" alt="Логотип">

  <!-- Абсолютные URL не затрагиваются -->
  <a href="https://other.com">Другой сайт</a>

  <!-- Якорные ссылки тоже затрагиваются! -->
  <!-- ВНИМАНИЕ: #section резолвится в https://example.com/docs/#section -->
  <a href="#section">Секция</a>
</body>
```

> **Gotcha:** `<base>` влияет на **все** относительные URL, включая якорные ссылки (`#section`), `<form action>`, `<script src>` и даже `url()` в inline-стилях. Это часто приводит к неожиданным багам. Большинство проектов избегают `<base>`.

---

## 2. meta charset

### 2.1 Кодировка символов

`<meta charset>` определяет кодировку символов HTML-документа:

```html
<meta charset="utf-8">
```

### 2.2 Почему UTF-8

**UTF-8** — единственная рекомендуемая кодировка для веб-документов. Причины:

| Свойство | UTF-8 | Другие кодировки |
|----------|-------|------------------|
| Покрытие Unicode | Полное (все ~150 000 символов) | Частичное (256-65536 символов) |
| Обратная совместимость | ASCII-совместимый | Зависит от кодировки |
| Размер для латиницы | 1 байт на символ | Зависит от кодировки |
| Размер для кириллицы | 2 байта на символ | 1-2 байта |
| Размер для CJK | 3 байта на символ | 2 байта (в CJK-кодировках) |
| Безопасность | Нет уязвимостей | Возможны XSS через перекодировку |
| Стандарт | Требуется спецификацией HTML | Допускается, но не рекомендуется |

### 2.3 Как браузер определяет кодировку

Браузер использует следующий алгоритм (в порядке приоритета):

1. **BOM (Byte Order Mark):** Если файл начинается с `EF BB BF` (UTF-8 BOM), браузер использует UTF-8
2. **HTTP-заголовок:** `Content-Type: text/html; charset=utf-8`
3. **meta charset:** `<meta charset="utf-8">` (должен быть в первых 1024 байтах)
4. **meta http-equiv:** `<meta http-equiv="Content-Type" content="text/html; charset=utf-8">`
5. **Автоопределение:** Эвристические алгоритмы (ненадёжно)
6. **Fallback:** `windows-1252` (для совместимости с устаревшими страницами)

```html
<!-- Рекомендуемый способ (HTML5) -->
<meta charset="utf-8">

<!-- Устаревший способ (HTML 4.01) — всё ещё работает -->
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
```

### 2.4 Расположение meta charset

```html
<!-- ПРАВИЛЬНО: в первых 1024 байтах, до любого контента -->
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Заголовок</title>
</head>

<!-- НЕПРАВИЛЬНО: слишком поздно -->
<!DOCTYPE html>
<html lang="ru">
<head>
  <title>Очень длинный заголовок страницы, содержащий кириллические символы...</title>
  <!-- К этому моменту браузер мог уже начать парсить контент -->
  <!-- с неправильной кодировкой и будет вынужден начать заново -->
  <meta charset="utf-8">
</head>
```

> **Performance:** Если `<meta charset>` обнаруживается позже первых 1024 байт, браузер **перезапускает парсинг** с начала, что приводит к задержке загрузки. Всегда ставьте `<meta charset>` первым элементом в `<head>`.

### 2.5 BOM (Byte Order Mark)

BOM — это невидимый символ `U+FEFF` в начале файла. В UTF-8 он закодирован как 3 байта: `EF BB BF`.

| Ситуация | Рекомендация |
|----------|-------------|
| UTF-8 | BOM **не рекомендуется** (но допускается) |
| UTF-16 | BOM **обязателен** |
| Серверные скрипты (PHP) | BOM может вызвать проблемы с `header()` |
| JSON | BOM **запрещён** |
| CSS | BOM может вызвать проблемы с `@charset` |

```html
<!-- Проверка BOM в файле (через командную строку) -->
<!-- xxd -l 3 file.html → "efbb bf" если BOM присутствует -->
```

### 2.6 Безопасность кодировки

Неправильная кодировка может привести к уязвимостям:

```html
<!-- UTF-7 XSS (исторический пример) -->
<!-- Если браузер интерпретирует страницу как UTF-7: -->
<!-- +ADw-script+AD4-alert(1)+ADw-/script+AD4- -->
<!-- превращается в: <script>alert(1)</script> -->

<!-- Защита: всегда указывайте charset -->
<meta charset="utf-8">
<!-- И HTTP-заголовок: Content-Type: text/html; charset=utf-8 -->
```

---

## 3. meta viewport

### 3.1 Проблема мобильных браузеров

До появления responsive design мобильные браузеры рендерили страницы в виртуальном viewport шириной ~980px и масштабировали результат до ширины экрана. Тег `<meta viewport>` позволяет управлять этим поведением:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

### 3.2 Параметры viewport

| Параметр | Значения | По умолчанию | Описание |
|----------|----------|-------------|----------|
| `width` | Число в px или `device-width` | ~980px | Ширина viewport |
| `height` | Число в px или `device-height` | Авто | Высота viewport |
| `initial-scale` | 0.1 - 10 | Зависит от ширины | Начальный масштаб |
| `minimum-scale` | 0.1 - 10 | 0.1 | Минимальный масштаб |
| `maximum-scale` | 0.1 - 10 | 10 | Максимальный масштаб |
| `user-scalable` | `yes` или `no` | `yes` | Разрешение масштабирования |
| `interactive-widget` | `resizes-visual`, `resizes-content`, `overlays-content` | `resizes-visual` | Поведение при появлении клавиатуры |

### 3.3 Рекомендуемая конфигурация

```html
<!-- Стандартная для responsive сайтов -->
<meta name="viewport" content="width=device-width, initial-scale=1">
```

Что делает каждый параметр:
- `width=device-width` — viewport = ширина устройства (в CSS-пикселях)
- `initial-scale=1` — начальный масштаб 1:1 (без увеличения/уменьшения)

### 3.4 Антипаттерны viewport

```html
<!-- АНТИПАТТЕРН: запрет масштабирования -->
<meta name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<!-- Нарушает WCAG 1.4.4: пользователь должен иметь возможность увеличить текст до 200% -->
<!-- Lighthouse помечает это как accessibility violation -->

<!-- АНТИПАТТЕРН: фиксированная ширина -->
<meta name="viewport" content="width=1024">
<!-- Страница будет масштабироваться на мобильных, мелкий текст -->

<!-- АНТИПАТТЕРН: отсутствие viewport -->
<!-- Мобильный браузер будет использовать viewport ~980px -->
<!-- и масштабировать десктопную версию — плохой UX -->
```

### 3.5 Влияние на CSS единицы

`viewport` влияет на единицы `vw`, `vh`, `vmin`, `vmax`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1">

<style>
  /* 100vw = ширина viewport = ширина устройства */
  .full-width { width: 100vw; }

  /* На мобильных: vh учитывает URL-бар -->
  /* Используйте dvh (dynamic viewport height) для учёта UI браузера */
  .full-height {
    height: 100vh;  /* Может быть больше видимой области */
    height: 100dvh; /* Динамически учитывает URL-бар */
  }
</style>
```

### 3.6 Interactive Widget

Новый параметр, управляющий поведением viewport при появлении виртуальной клавиатуры:

```html
<!-- Клавиатура уменьшает visual viewport, content не перестраивается -->
<meta name="viewport"
      content="width=device-width, initial-scale=1, interactive-widget=resizes-visual">

<!-- Клавиатура уменьшает layout viewport, content перестраивается -->
<meta name="viewport"
      content="width=device-width, initial-scale=1, interactive-widget=resizes-content">

<!-- Клавиатура перекрывает контент, viewport не меняется -->
<meta name="viewport"
      content="width=device-width, initial-scale=1, interactive-widget=overlays-content">
```

---

## 4. title

### 4.1 Назначение

Элемент `<title>` определяет заголовок документа, отображаемый:
- Во вкладке браузера
- В результатах поиска (SERP — Search Engine Results Page)
- В закладках
- В истории браузера
- При шаринге в социальных сетях (как fallback)
- Скринридерами при объявлении страницы

```html
<title>Семантика HTML — Полное руководство | WebDev Docs</title>
```

### 4.2 SEO значение

`<title>` — один из самых важных SEO-факторов on-page оптимизации:

| Аспект | Рекомендация |
|--------|-------------|
| Длина | 50-60 символов (Google обрезает ~600px шириной) |
| Ключевые слова | В начале title для максимального веса |
| Уникальность | Каждая страница — уникальный title |
| Бренд | В конце через разделитель `—` или `|` |
| Формат | `Тема страницы — Категория | Бренд` |

### 4.3 Best Practices

```html
<!-- Главная страница -->
<title>WebDev Docs — Документация для веб-разработчиков</title>

<!-- Статья -->
<title>Семантика HTML: полное руководство — WebDev Docs</title>

<!-- Товар -->
<title>iPhone 15 Pro Max 256GB — купить в Москве | TechStore</title>

<!-- Результаты поиска -->
<title>Поиск: "семантика html" — WebDev Docs</title>

<!-- Страница ошибки -->
<title>Страница не найдена (404) — WebDev Docs</title>
```

### 4.4 Динамический title

```html
<script>
  // Обновление title при получении уведомлений
  document.title = "(3) Новые сообщения — Чат";

  // Восстановление при фокусе
  window.addEventListener('focus', () => {
    document.title = "Чат — Мессенджер";
  });
</script>
```

> **Gotcha:** Google может изменить title в результатах поиска, если сочтёт его неподходящим. Алгоритм может использовать `<h1>`, anchor text входящих ссылок или другие источники.

---

## 5. meta description

### 5.1 Назначение

`<meta name="description">` предоставляет краткое описание страницы для поисковых систем:

```html
<meta name="description"
      content="Полное руководство по семантике HTML: структурные элементы,
               ARIA-роли, accessibility tree, антипаттерны и best practices.
               Для middle и senior разработчиков.">
```

### 5.2 SEO и сниппеты

| Аспект | Рекомендация |
|--------|-------------|
| Длина | 150-160 символов (Google обрезает ~920px) |
| Содержание | Краткое описание контента страницы |
| Ключевые слова | Включайте целевые запросы естественно |
| Уникальность | Каждая страница — уникальное описание |
| Call to action | Побуждайте кликнуть: «Узнайте...», «Пошаговое руководство...» |
| Дубликаты | Избегайте одинаковых description на разных страницах |

```html
<!-- Хорошо -->
<meta name="description"
      content="Узнайте, как правильно использовать семантические HTML-элементы.
               Подробные примеры header, nav, main, article, section с объяснениями.">

<!-- Плохо: слишком короткое -->
<meta name="description" content="Семантика HTML">

<!-- Плохо: keyword stuffing -->
<meta name="description"
      content="семантика html семантический html html5 семантические теги
               html семантика веб разработка html теги семантические элементы">

<!-- Плохо: не описывает контент -->
<meta name="description"
      content="Добро пожаловать на наш сайт. У нас много интересного. Заходите!">
```

> **Важно:** Google не гарантирует использование вашего description в сниппете. Поисковик может выбрать фрагмент контента страницы, если сочтёт его более релевантным запросу пользователя.

---

## 6. meta robots

### 6.1 Директивы для поисковых роботов

`<meta name="robots">` управляет поведением поисковых роботов:

```html
<meta name="robots" content="noindex, nofollow">
```

### 6.2 Доступные директивы

| Директива | Описание |
|-----------|----------|
| `index` | Разрешить индексацию (по умолчанию) |
| `noindex` | Запретить индексацию страницы |
| `follow` | Разрешить переход по ссылкам (по умолчанию) |
| `nofollow` | Не передавать вес по ссылкам на странице |
| `none` | Эквивалент `noindex, nofollow` |
| `noarchive` | Не сохранять кэшированную версию |
| `nosnippet` | Не показывать сниппет в результатах поиска |
| `max-snippet:N` | Максимум N символов в сниппете |
| `max-image-preview:SIZE` | Размер превью изображения (`none`, `standard`, `large`) |
| `max-video-preview:N` | Максимум N секунд видео-превью |
| `notranslate` | Не предлагать перевод в результатах поиска |
| `noimageindex` | Не индексировать изображения на странице |
| `unavailable_after:DATE` | Не показывать после указанной даты |

### 6.3 Примеры использования

```html
<!-- Публичная страница (значения по умолчанию, можно не указывать) -->
<meta name="robots" content="index, follow">

<!-- Страница входа — не индексировать, но следовать по ссылкам -->
<meta name="robots" content="noindex, follow">

<!-- Архивная страница — индексировать, не передавать вес -->
<meta name="robots" content="index, nofollow">

<!-- Полностью скрыть от поисковиков -->
<meta name="robots" content="noindex, nofollow, noarchive">

<!-- Управление сниппетом -->
<meta name="robots" content="max-snippet:200, max-image-preview:large">

<!-- Для конкретного робота -->
<meta name="googlebot" content="noindex">
<meta name="bingbot" content="noarchive">
```

### 6.4 robots.txt vs meta robots

| Аспект | robots.txt | meta robots |
|--------|-----------|-------------|
| Расположение | Корень сайта `/robots.txt` | В `<head>` каждой страницы |
| Гранулярность | Директории и файлы | Отдельные страницы |
| Действие | Блокирует краулинг | Блокирует индексацию |
| `nofollow` | Нет | Да |
| Приоритет | Робот не увидит meta, если заблокирован | Всегда обрабатывается |

> **Gotcha:** Если robots.txt запрещает краулинг страницы, робот не увидит `<meta name="robots">` на ней. Но Google **всё равно может проиндексировать** URL (без контента), если на него ведут внешние ссылки. Для полного запрета индексации используйте `meta robots noindex` **и** разрешите краулинг в robots.txt.

### 6.5 HTTP-заголовок X-Robots-Tag

Альтернатива `<meta robots>` для не-HTML ресурсов (PDF, изображения):

```
X-Robots-Tag: noindex, nofollow
X-Robots-Tag: googlebot: noindex
```

---

## 7. Open Graph Protocol

### 7.1 Что такое Open Graph

Open Graph Protocol (OGP) — протокол, разработанный Facebook (Meta), для управления отображением ссылок при шаринге в социальных сетях. Превращает URL в «rich object» с заголовком, описанием, изображением и типом.

### 7.2 Обязательные свойства

```html
<meta property="og:title" content="Семантика HTML — Полное руководство">
<meta property="og:type" content="article">
<meta property="og:url" content="https://example.com/html-semantics">
<meta property="og:image" content="https://example.com/images/html-semantics-og.jpg">
```

### 7.3 Рекомендуемые свойства

```html
<meta property="og:description"
      content="Подробное руководство по семантическому HTML для продвинутых разработчиков">
<meta property="og:site_name" content="WebDev Docs">
<meta property="og:locale" content="ru_RU">
<meta property="og:locale:alternate" content="en_US">
```

### 7.4 Свойства для изображений

```html
<!-- Основное изображение -->
<meta property="og:image" content="https://example.com/images/og-main.jpg">
<meta property="og:image:secure_url" content="https://example.com/images/og-main.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt"
      content="Инфографика: структура семантического HTML-документа">

<!-- Дополнительное изображение (fallback) -->
<meta property="og:image" content="https://example.com/images/og-fallback.jpg">
```

Рекомендации по размерам:

| Платформа | Рекомендуемый размер | Соотношение |
|-----------|---------------------|-------------|
| Facebook | 1200 x 630 px | 1.91:1 |
| LinkedIn | 1200 x 627 px | 1.91:1 |
| VK | 1200 x 630 px | 1.91:1 |
| Telegram | 1200 x 630 px | 1.91:1 |
| Минимальный | 600 x 315 px | 1.91:1 |

### 7.5 og:type

| Тип | Использование |
|-----|--------------|
| `website` | Главная страница, общие страницы |
| `article` | Статьи, блог-посты |
| `profile` | Профиль пользователя |
| `book` | Книга |
| `music.song` | Музыкальный трек |
| `music.album` | Музыкальный альбом |
| `video.movie` | Фильм |
| `video.episode` | Эпизод сериала |
| `product` | Товар (неофициальное расширение) |

### 7.6 Дополнительные свойства для article

```html
<meta property="og:type" content="article">
<meta property="article:published_time" content="2024-03-15T10:00:00+03:00">
<meta property="article:modified_time" content="2024-03-20T14:30:00+03:00">
<meta property="article:author" content="https://example.com/authors/ivan">
<meta property="article:section" content="Веб-разработка">
<meta property="article:tag" content="HTML">
<meta property="article:tag" content="Семантика">
<meta property="article:tag" content="Accessibility">
```

### 7.7 Полный пример OG-разметки

```html
<head>
  <meta charset="utf-8">
  <title>Семантика HTML — WebDev Docs</title>

  <!-- Open Graph -->
  <meta property="og:title" content="Семантика HTML — Полное руководство">
  <meta property="og:description"
        content="Всё о семантическом HTML: от базовых элементов до Accessibility Tree.
                 Для middle и senior разработчиков.">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://webdev-docs.com/html/semantics">
  <meta property="og:image" content="https://webdev-docs.com/images/html-semantics-og.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Структура семантического HTML-документа">
  <meta property="og:site_name" content="WebDev Docs">
  <meta property="og:locale" content="ru_RU">

  <!-- Article-specific -->
  <meta property="article:published_time" content="2024-03-15T10:00:00+03:00">
  <meta property="article:author" content="https://webdev-docs.com/authors/ivan">
  <meta property="article:tag" content="HTML">
  <meta property="article:tag" content="Семантика">
</head>
```

### 7.8 Отладка Open Graph

Инструменты для проверки:
- **Facebook Sharing Debugger:** [https://developers.facebook.com/tools/debug/](https://developers.facebook.com/tools/debug/)
- **LinkedIn Post Inspector:** [https://www.linkedin.com/post-inspector/](https://www.linkedin.com/post-inspector/)
- **Telegram:** Отправьте ссылку боту `@WebpageBot`
- **VK:** Отладчик в VK Developer

> **Gotcha:** Социальные сети **кэшируют** OG-данные. После обновления мета-тегов используйте инструменты отладки для очистки кэша. Facebook кэширует на ~30 дней.

---

## 8. Twitter Cards

### 8.1 Типы карточек

| Тип | Описание | Размер изображения |
|-----|----------|-------------------|
| `summary` | Небольшое превью с заголовком и описанием | 120 x 120 px (мин.) |
| `summary_large_image` | Большое изображение сверху | 300 x 157 px (мин.) |
| `app` | Карточка приложения | Иконка приложения |
| `player` | Встроенный медиа-плеер | Зависит от контента |

### 8.2 Базовая разметка

```html
<!-- Summary Card -->
<meta name="twitter:card" content="summary">
<meta name="twitter:site" content="@webdev_docs">
<meta name="twitter:creator" content="@ivan_petrov">
<meta name="twitter:title" content="Семантика HTML — Полное руководство">
<meta name="twitter:description"
      content="Подробное руководство по семантическому HTML для продвинутых разработчиков">
<meta name="twitter:image" content="https://example.com/images/card.jpg">
<meta name="twitter:image:alt" content="Структура семантического HTML-документа">
```

### 8.3 Summary Large Image

```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@webdev_docs">
<meta name="twitter:title" content="Семантика HTML — Полное руководство">
<meta name="twitter:description"
      content="Всё о семантическом HTML: от базовых элементов до Accessibility Tree">
<meta name="twitter:image" content="https://example.com/images/card-large.jpg">
<meta name="twitter:image:alt"
      content="Инфографика: семантические HTML-элементы и их ARIA-роли">
```

### 8.4 Fallback к Open Graph

Twitter/X использует OG-теги как fallback, если Twitter Card теги не указаны:

| Twitter Card | Open Graph fallback |
|-------------|-------------------|
| `twitter:title` | `og:title` |
| `twitter:description` | `og:description` |
| `twitter:image` | `og:image` |

```html
<!-- Минимальная разметка: указать только twitter:card, остальное возьмётся из OG -->
<meta property="og:title" content="Заголовок">
<meta property="og:description" content="Описание">
<meta property="og:image" content="https://example.com/image.jpg">
<meta name="twitter:card" content="summary_large_image">
```

### 8.5 Отладка Twitter Cards

- **Twitter Card Validator:** [https://cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator)
- При первом шаринге URL карточка может не отображаться — требуется «прогрев» через валидатор

---

## 9. link rel

### 9.1 Обзор типов связей

Элемент `<link>` определяет отношение между текущим документом и внешним ресурсом:

```html
<link rel="тип_связи" href="URL">
```

### 9.2 stylesheet

```html
<!-- Основной CSS -->
<link rel="stylesheet" href="/css/main.css">

<!-- CSS для конкретного media -->
<link rel="stylesheet" href="/css/print.css" media="print">
<link rel="stylesheet" href="/css/mobile.css" media="(max-width: 768px)">

<!-- CSS с указанием приоритета (fetchpriority) -->
<link rel="stylesheet" href="/css/critical.css" fetchpriority="high">
<link rel="stylesheet" href="/css/non-critical.css" fetchpriority="low">
```

> **Performance:** Каждый `<link rel="stylesheet">` — render-blocking ресурс. Браузер не начнёт рендеринг, пока не загрузит и не распарсит все CSS-файлы. Минимизируйте количество CSS-файлов и используйте `media` атрибут для условной загрузки.

### 9.3 icon (favicon)

```html
<!-- Базовый favicon (ICO для совместимости) -->
<link rel="icon" href="/favicon.ico" sizes="32x32">

<!-- SVG favicon (масштабируется, поддерживает dark mode) -->
<link rel="icon" href="/icon.svg" type="image/svg+xml">

<!-- PNG для разных размеров -->
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
<link rel="icon" type="image/png" sizes="192x192" href="/icon-192x192.png">
```

SVG favicon с поддержкой dark mode:

```html
<link rel="icon" href="/icon.svg" type="image/svg+xml">

<!-- Содержимое icon.svg: -->
<!--
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <style>
    circle { fill: #1a1a2e; }
    @media (prefers-color-scheme: dark) {
      circle { fill: #e8e8e8; }
    }
  </style>
  <circle cx="16" cy="16" r="14"/>
</svg>
-->
```

### 9.4 canonical

`<link rel="canonical">` указывает предпочтительный URL для страницы с дублирующимся контентом:

```html
<!-- На странице https://example.com/article?page=1&ref=twitter -->
<link rel="canonical" href="https://example.com/article">

<!-- Самоссылающийся canonical (рекомендуется на каждой странице) -->
<link rel="canonical" href="https://example.com/current-page">
```

Использование:
- Консолидация URL с параметрами (`?utm_source=...`, `?page=1`)
- Объединение HTTP и HTTPS версий
- Объединение www и non-www версий
- Консолидация мобильной и десктопной версий

### 9.5 alternate

```html
<!-- Языковые версии (hreflang) -->
<link rel="alternate" hreflang="en" href="https://example.com/en/article">
<link rel="alternate" hreflang="ru" href="https://example.com/ru/article">
<link rel="alternate" hreflang="x-default" href="https://example.com/article">

<!-- RSS/Atom лента -->
<link rel="alternate" type="application/rss+xml"
      title="Блог — RSS" href="/feed.xml">
<link rel="alternate" type="application/atom+xml"
      title="Блог — Atom" href="/feed.atom">

<!-- AMP версия -->
<link rel="amphtml" href="https://example.com/amp/article">
```

### 9.6 preconnect

Устанавливает раннее соединение с внешним доменом:

```html
<!-- DNS + TCP + TLS handshake заранее -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdn.example.com" crossorigin>
```

> **Важно:** `crossorigin` необходим для ресурсов, загружаемых с CORS (шрифты, fetch-запросы). Без него соединение будет установлено для non-CORS запросов, и для CORS-ресурсов потребуется новое соединение.

### 9.7 dns-prefetch

Лёгкая альтернатива preconnect — только DNS-резолвинг:

```html
<!-- Только DNS lookup (дешевле preconnect) -->
<link rel="dns-prefetch" href="https://analytics.example.com">
<link rel="dns-prefetch" href="https://ads.example.com">

<!-- Паттерн: preconnect для критичных + dns-prefetch как fallback -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://fonts.googleapis.com">
```

### 9.8 preload

Загружает ресурс с высоким приоритетом, который понадобится в ближайшее время:

```html
<!-- Шрифт (обнаруживается поздно — после загрузки CSS) -->
<link rel="preload" href="/fonts/inter-var.woff2"
      as="font" type="font/woff2" crossorigin>

<!-- Критичное изображение (hero image) -->
<link rel="preload" href="/images/hero.webp"
      as="image" type="image/webp">

<!-- CSS модуль, загружаемый через @import -->
<link rel="preload" href="/css/fonts.css" as="style">

<!-- JavaScript модуль -->
<link rel="preload" href="/js/critical-module.js" as="script">

<!-- Видео постер -->
<link rel="preload" href="/images/video-poster.jpg"
      as="image" fetchpriority="high">

<!-- Preload с media query -->
<link rel="preload" href="/images/hero-mobile.webp"
      as="image" media="(max-width: 768px)">
<link rel="preload" href="/images/hero-desktop.webp"
      as="image" media="(min-width: 769px)">
```

Значения атрибута `as`:

| Значение | Тип ресурса |
|----------|------------|
| `script` | JavaScript |
| `style` | CSS |
| `image` | Изображения |
| `font` | Шрифты |
| `fetch` | fetch/XHR запросы |
| `document` | HTML (для iframe) |
| `video` | Видео |
| `audio` | Аудио |
| `track` | WebVTT |
| `worker` | Web Worker |

> **Gotcha:** Если preloaded ресурс не используется в течение ~3 секунд, Chrome выводит предупреждение в консоли. Не preload-ьте ресурсы, которые не понадобятся на текущей странице.

### 9.9 prefetch

Загружает ресурс с **низким** приоритетом для будущей навигации:

```html
<!-- Следующая страница -->
<link rel="prefetch" href="/next-article.html">

<!-- CSS следующей страницы -->
<link rel="prefetch" href="/css/article-detail.css" as="style">

<!-- JavaScript следующей страницы -->
<link rel="prefetch" href="/js/article-detail.js" as="script">
```

### 9.10 modulepreload

Специализированный preload для ES-модулей — загружает, парсит и компилирует модуль:

```html
<!-- Preload ES-модуля и его зависимостей -->
<link rel="modulepreload" href="/js/app.mjs">
<link rel="modulepreload" href="/js/utils.mjs">
<link rel="modulepreload" href="/js/components/header.mjs">

<script type="module" src="/js/app.mjs"></script>
```

Отличие от `<link rel="preload" as="script">`:
- `modulepreload` парсит и компилирует модуль сразу
- `modulepreload` учитывает module map (не загружает один модуль дважды)
- `modulepreload` может загрузить зависимости модуля

---

## 10. Resource Hints

### 10.1 Сравнение Resource Hints

| Hint | Когда | Что делает | Приоритет | Блокирует рендеринг |
|------|-------|-----------|-----------|-------------------|
| `dns-prefetch` | Будущая навигация | DNS lookup | Низкий | Нет |
| `preconnect` | Скоро понадобится | DNS + TCP + TLS | Средний | Нет |
| `preload` | Текущая страница | Полная загрузка | Высокий | Нет (но `as` влияет) |
| `prefetch` | Будущая навигация | Полная загрузка (idle) | Очень низкий | Нет |
| `modulepreload` | Текущая страница | Загрузка + парсинг модуля | Высокий | Нет |

### 10.2 Визуализация по времени

```
Текущая страница                    Следующая страница
├── dns-prefetch ─── DNS ─────┐
├── preconnect ──── DNS+TCP+TLS    │
├── preload ─────── Загрузка ──── Использование
├── modulepreload ─ Загр+Парс ── Использование
├── prefetch ────── ·········· Загрузка (idle) ──── Использование →
└── prerender ───── ·········· Полный рендеринг ── Мгновенный переход →
```

### 10.3 Speculation Rules API

Современная замена устаревшему `<link rel="prerender">`. Позволяет декларативно указать правила для предварительной загрузки/рендеринга:

```html
<script type="speculationrules">
{
  "prerender": [
    {
      "urls": ["/next-page", "/popular-page"]
    }
  ],
  "prefetch": [
    {
      "where": {
        "href_matches": "/articles/*"
      },
      "eagerness": "moderate"
    }
  ]
}
</script>
```

Уровни `eagerness`:
- `immediate` — немедленно
- `eager` — при высокой вероятности навигации
- `moderate` — при hover 200ms+
- `conservative` — при mousedown/touchstart

### 10.4 Практические паттерны

#### E-commerce: страница каталога

```html
<head>
  <!-- Критичные ресурсы текущей страницы -->
  <link rel="preconnect" href="https://cdn.example.com" crossorigin>
  <link rel="preload" href="/fonts/brand.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/images/hero-banner.webp" as="image">

  <!-- DNS для аналитики и рекламы -->
  <link rel="dns-prefetch" href="https://analytics.example.com">
  <link rel="dns-prefetch" href="https://ads.example.com">

  <!-- Prefetch CSS/JS страницы товара (пользователь скорее всего кликнет) -->
  <link rel="prefetch" href="/css/product-detail.css" as="style">
  <link rel="prefetch" href="/js/product-detail.js" as="script">
</head>
```

#### SPA: предзагрузка модулей

```html
<head>
  <!-- Критичные модули текущего маршрута -->
  <link rel="modulepreload" href="/js/app.mjs">
  <link rel="modulepreload" href="/js/router.mjs">
  <link rel="modulepreload" href="/js/pages/home.mjs">

  <!-- Prefetch модулей вероятных маршрутов -->
  <link rel="prefetch" href="/js/pages/about.mjs" as="script">
  <link rel="prefetch" href="/js/pages/contact.mjs" as="script">
</head>
```

### 10.5 Fetchpriority

Атрибут `fetchpriority` позволяет тонко управлять приоритетом загрузки:

```html
<!-- Высокий приоритет: LCP-изображение -->
<img src="hero.jpg" fetchpriority="high" alt="Hero">

<!-- Низкий приоритет: изображения ниже fold -->
<img src="footer-bg.jpg" fetchpriority="low" loading="lazy" alt="">

<!-- Высокий приоритет: критичный скрипт -->
<link rel="preload" href="/js/critical.js" as="script" fetchpriority="high">

<!-- Низкий приоритет: некритичный CSS -->
<link rel="stylesheet" href="/css/animations.css" fetchpriority="low">
```

Значения:
- `high` — повысить приоритет относительно стандартного
- `low` — понизить приоритет
- `auto` — браузер решает сам (по умолчанию)

---

## 11. CSP meta tag

### 11.1 Content Security Policy через meta

CSP (Content Security Policy) — механизм защиты от XSS и других инъекционных атак. Может быть задан через HTTP-заголовок или мета-тег:

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; img-src * data:; script-src 'self' 'nonce-abc123'">
```

### 11.2 Основные директивы

| Директива | Описание |
|-----------|----------|
| `default-src` | Fallback для всех типов ресурсов |
| `script-src` | Источники JavaScript |
| `style-src` | Источники CSS |
| `img-src` | Источники изображений |
| `font-src` | Источники шрифтов |
| `connect-src` | URL для fetch, XHR, WebSocket |
| `media-src` | Источники аудио и видео |
| `frame-src` | Источники для iframe |
| `base-uri` | Допустимые значения для `<base>` |
| `form-action` | Допустимые URL для action форм |
| `frame-ancestors` | Кто может встраивать страницу в iframe |

### 11.3 Значения источников

| Значение | Описание |
|----------|----------|
| `'self'` | Тот же origin |
| `'none'` | Ничего не разрешено |
| `'unsafe-inline'` | Inline скрипты и стили (небезопасно!) |
| `'unsafe-eval'` | `eval()`, `new Function()` (небезопасно!) |
| `'nonce-XXX'` | Скрипты/стили с соответствующим nonce |
| `'strict-dynamic'` | Доверять скриптам, загруженным доверенными скриптами |
| `https:` | Любой HTTPS-источник |
| `data:` | Data URI |
| `blob:` | Blob URI |
| `*.example.com` | Конкретный домен с подстановкой |

### 11.4 Примеры CSP

```html
<!-- Строгая политика: только собственные ресурсы -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'">

<!-- С Google Fonts и аналитикой -->
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               style-src 'self' https://fonts.googleapis.com;
               font-src 'self' https://fonts.gstatic.com;
               script-src 'self' https://www.googletagmanager.com;
               img-src 'self' data: https:;
               connect-src 'self' https://www.google-analytics.com">

<!-- С nonce для inline-скриптов -->
<meta http-equiv="Content-Security-Policy"
      content="script-src 'nonce-r4nd0mV4lu3'">

<script nonce="r4nd0mV4lu3">
  // Этот скрипт выполнится
  console.log('Разрешён');
</script>

<script>
  // Этот скрипт заблокирован CSP!
  console.log('Заблокирован');
</script>
```

### 11.5 Ограничения CSP через meta

По сравнению с HTTP-заголовком, CSP через `<meta>` имеет ограничения:

| Возможность | HTTP-заголовок | meta-тег |
|-------------|---------------|----------|
| `frame-ancestors` | Да | **Нет** |
| `report-uri` / `report-to` | Да | **Нет** |
| `sandbox` | Да | **Нет** |
| Множественные политики | Да | Да (но все применяются) |
| Timing | До загрузки HTML | После парсинга meta-тега |

> **Best Practice:** Предпочитайте CSP через HTTP-заголовок. Используйте meta-тег только если нет контроля над сервером (статический хостинг). При использовании meta-тега размещайте его **как можно раньше** в `<head>`.

### 11.6 Report-Only режим

Через HTTP-заголовок можно включить режим только отчётов (не через meta!):

```
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```

Это позволяет тестировать CSP-политику без блокировки ресурсов.

---

## 12. PWA meta tags

### 12.1 Theme Color

`<meta name="theme-color">` управляет цветом адресной строки в мобильных браузерах:

```html
<!-- Статический цвет -->
<meta name="theme-color" content="#1a1a2e">

<!-- Разный цвет для светлой и тёмной темы -->
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1a1a2e" media="(prefers-color-scheme: dark)">
```

Динамическое изменение через JavaScript:

```html
<script>
  function setThemeColor(color) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', color);
    }
  }

  // Изменить цвет при скролле
  window.addEventListener('scroll', () => {
    setThemeColor(window.scrollY > 100 ? '#000000' : '#ffffff');
  });
</script>
```

### 12.2 Web App Manifest

`<link rel="manifest">` связывает страницу с JSON-манифестом PWA:

```html
<link rel="manifest" href="/manifest.json">
```

Пример `manifest.json`:

```html
<!--
{
  "name": "WebDev Docs — Документация для разработчиков",
  "short_name": "WebDev Docs",
  "description": "Полная документация по веб-разработке",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a1a2e",
  "orientation": "portrait-primary",
  "scope": "/",
  "lang": "ru",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshots/home.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/home-mobile.png",
      "sizes": "750x1334",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
-->
```

Значения `display`:

| Значение | Описание |
|----------|----------|
| `fullscreen` | Полный экран, без UI браузера |
| `standalone` | Как нативное приложение, без адресной строки |
| `minimal-ui` | Минимальный UI браузера (назад/обновить) |
| `browser` | Обычная вкладка браузера |

### 12.3 Apple Touch Icon

Иконка для iOS (Safari, Add to Home Screen):

```html
<!-- Основная иконка (180x180 рекомендуется) -->
<link rel="apple-touch-icon" href="/apple-touch-icon.png">

<!-- Размеры для разных устройств -->
<link rel="apple-touch-icon" sizes="120x120" href="/icons/apple-120x120.png">
<link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-152x152.png">
<link rel="apple-touch-icon" sizes="167x167" href="/icons/apple-167x167.png">
<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-180x180.png">
```

> **Важно:** iOS автоматически добавляет скругление и тень к иконке. Не добавляйте их в самом изображении. Используйте квадратное изображение без прозрачности.

### 12.4 Apple-специфичные мета-теги

```html
<!-- Включить полноэкранный режим при запуске с Home Screen -->
<meta name="apple-mobile-web-app-capable" content="yes">

<!-- Стиль статус-бара -->
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<!-- Значения: default, black, black-translucent -->

<!-- Название приложения на Home Screen -->
<meta name="apple-mobile-web-app-title" content="WebDev">

<!-- Splash screen (startup image) -->
<!-- Для каждого устройства нужен свой размер -->
<link rel="apple-touch-startup-image"
      href="/splash/iphone12.png"
      media="(device-width: 390px) and (device-height: 844px)
             and (-webkit-device-pixel-ratio: 3)">
<link rel="apple-touch-startup-image"
      href="/splash/ipad.png"
      media="(device-width: 768px) and (device-height: 1024px)
             and (-webkit-device-pixel-ratio: 2)">
```

### 12.5 Полный набор PWA мета-тегов

```html
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WebDev Docs</title>

  <!-- PWA: Manifest -->
  <link rel="manifest" href="/manifest.json">

  <!-- PWA: Theme Color -->
  <meta name="theme-color" content="#ffffff"
        media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#1a1a2e"
        media="(prefers-color-scheme: dark)">

  <!-- PWA: Apple -->
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="default">
  <meta name="apple-mobile-web-app-title" content="WebDev">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">

  <!-- PWA: Microsoft -->
  <meta name="msapplication-TileColor" content="#1a1a2e">
  <meta name="msapplication-config" content="/browserconfig.xml">

  <!-- Favicons -->
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">

  <!-- Disable telephone detection (iOS) -->
  <meta name="format-detection" content="telephone=no">

  <!-- Disable automatic translation prompt -->
  <meta name="google" content="notranslate">
</head>
```

### 12.6 Мета-теги для мобильных браузеров

```html
<!-- Запретить автоматическое определение телефонов (iOS Safari) -->
<meta name="format-detection" content="telephone=no">

<!-- Запретить автоматическое определение email (iOS Safari) -->
<meta name="format-detection" content="email=no">

<!-- Запретить автоматическое определение адресов (iOS Safari) -->
<meta name="format-detection" content="address=no">

<!-- Комбинация -->
<meta name="format-detection" content="telephone=no, email=no, address=no">

<!-- Цвет подсветки при тапе (устаревший, Chrome Android) -->
<!-- Используйте CSS: -webkit-tap-highlight-color: transparent; -->
```

### 12.7 Другие полезные мета-теги

```html
<!-- Автор страницы -->
<meta name="author" content="Иван Петров">

<!-- Генератор (CMS, framework) -->
<meta name="generator" content="Next.js 14.1">

<!-- Цветовая схема (hint для браузера до загрузки CSS) -->
<meta name="color-scheme" content="light dark">
<!-- Предотвращает белую вспышку при dark mode -->

<!-- Referrer policy -->
<meta name="referrer" content="strict-origin-when-cross-origin">

<!-- Запрет перевода -->
<meta name="google" content="notranslate">

<!-- Верификация -->
<meta name="google-site-verification" content="...">
<meta name="yandex-verification" content="...">
<meta property="fb:app_id" content="123456789">

<!-- HTTP-equiv: редирект через 5 секунд -->
<meta http-equiv="refresh" content="5; url=https://example.com/new-page">

<!-- HTTP-equiv: X-UA-Compatible (для legacy IE) -->
<meta http-equiv="X-UA-Compatible" content="IE=edge">

<!-- HTTP-equiv: Permissions-Policy (ограниченно) -->
<!-- Лучше через HTTP-заголовок -->
```

---

## Итого: шаблон идеального head

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <!-- Кодировка: первым, в первых 1024 байтах -->
  <meta charset="utf-8">

  <!-- Viewport: до CSS для корректного layout -->
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- CSP: как можно раньше -->
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; img-src * data:; style-src 'self' 'unsafe-inline'">

  <!-- Color scheme: предотвращает белую вспышку -->
  <meta name="color-scheme" content="light dark">

  <!-- Title: SEO + UX -->
  <title>Название страницы — Сайт</title>

  <!-- Preconnect: критичные домены -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

  <!-- Preload: ресурсы, обнаруживаемые поздно -->
  <link rel="preload" href="/fonts/inter.woff2"
        as="font" type="font/woff2" crossorigin>

  <!-- CSS: критичный inline + внешний -->
  <style>/* critical CSS */</style>
  <link rel="stylesheet" href="/css/main.css">

  <!-- Scripts: defer/async -->
  <script src="/js/app.js" defer></script>

  <!-- SEO -->
  <meta name="description" content="Описание страницы (150-160 символов)">
  <link rel="canonical" href="https://example.com/current-page">
  <meta name="robots" content="index, follow">

  <!-- Open Graph -->
  <meta property="og:title" content="Заголовок для соцсетей">
  <meta property="og:description" content="Описание для соцсетей">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://example.com/current-page">
  <meta property="og:image" content="https://example.com/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:site_name" content="Название сайта">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@username">

  <!-- PWA -->
  <meta name="theme-color" content="#ffffff"
        media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#1a1a2e"
        media="(prefers-color-scheme: dark)">
  <link rel="manifest" href="/manifest.json">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">

  <!-- Favicons -->
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">

  <!-- Alternate: языки, RSS -->
  <link rel="alternate" hreflang="en" href="https://example.com/en/page">
  <link rel="alternate" type="application/rss+xml"
        title="RSS" href="/feed.xml">

  <!-- Prefetch: будущая навигация -->
  <link rel="prefetch" href="/next-page.html">
</head>
```

Этот порядок оптимизирует Critical Rendering Path: кодировка и viewport определяются первыми, критичные ресурсы загружаются рано, некритичные мета-теги не задерживают рендеринг.
