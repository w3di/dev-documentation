# SEO и микроразметка — глубокое погружение

## Содержание

1. [Основы SEO в HTML](#1-основы-seo-в-html)
2. [Schema.org — структурированные данные](#2-schemaorg--структурированные-данные)
3. [JSON-LD — формат структурированных данных](#3-json-ld--формат-структурированных-данных)
4. [Microdata — атрибуты в HTML](#4-microdata--атрибуты-в-html)
5. [Open Graph — протокол социальных сетей](#5-open-graph--протокол-социальных-сетей)
6. [Structured Data Testing — проверка разметки](#6-structured-data-testing--проверка-разметки)
7. [Canonical URLs — канонические адреса](#7-canonical-urls--канонические-адреса)
8. [Hreflang — мультиязычные сайты](#8-hreflang--мультиязычные-сайты)
9. [Robots — управление индексацией](#9-robots--управление-индексацией)
10. [Core Web Vitals и SEO](#10-core-web-vitals-и-seo)

---

## 1. Основы SEO в HTML

### 1.1. Элемент title

`<title>` — один из самых важных on-page SEO-факторов. Отображается в результатах поиска (SERP), вкладках браузера и при сохранении в закладки.

```html
<head>
  <!-- ✅ Хороший title: ключевое слово + бренд, 50-60 символов -->
  <title>Руководство по JavaScript Promises — DevDocs</title>

  <!-- ❌ Плохой title: слишком общий -->
  <title>Главная страница</title>

  <!-- ❌ Плохой title: keyword stuffing -->
  <title>JavaScript JS Tutorial JS Guide JavaScript Promises JavaScript Async</title>
</head>
```

**Правила для title:**

| Правило | Описание |
|---------|----------|
| Длина | 50-60 символов (Google обрежет ~600px по ширине) |
| Уникальность | Каждая страница — уникальный title |
| Ключевые слова | В начале title, естественно вписанные |
| Бренд | В конце, через разделитель (`—`, `|`, `-`) |
| Формат | `Основное ключевое слово — Уточнение | Бренд` |

> **Важно:** Google может заменить ваш title в SERP, если сочтёт его нерелевантным запросу. Это поведение документировано и контролируется алгоритмом.

### 1.2. Meta description

```html
<meta name="description" content="Полное руководство по JavaScript Promises:
создание, цепочки, обработка ошибок, Promise.all, Promise.race.
Примеры кода и best practices.">
```

| Параметр | Рекомендация |
|----------|-------------|
| Длина | 150-160 символов (до ~920px в SERP) |
| Уникальность | Каждая страница — уникальный description |
| Содержание | Краткое описание содержимого страницы с ключевыми словами |
| Call to action | Стимулируйте клик: «Узнайте...», «Полное руководство...» |

> **Факт:** Meta description НЕ является прямым фактором ранжирования в Google. Однако качественный description увеличивает CTR (Click-Through Rate), что косвенно влияет на позиции. Google также может использовать текст со страницы вместо вашего description.

### 1.3. Иерархия заголовков h1-h6

```html
<!-- ✅ Правильная иерархия -->
<h1>JavaScript Promises</h1>                    <!-- Один h1 на страницу -->
  <h2>Что такое Promise</h2>                     <!-- Основной раздел -->
    <h3>Состояния Promise</h3>                   <!-- Подраздел -->
    <h3>Создание Promise</h3>
  <h2>Цепочки Promises</h2>
    <h3>.then()</h3>
    <h3>.catch()</h3>
      <h4>Обработка ошибок в цепочке</h4>        <!-- Под-подраздел -->
  <h2>Статические методы</h2>

<!-- ❌ Пропуск уровней -->
<h1>Заголовок</h1>
<h3>Подраздел</h3>  <!-- Пропущен h2 -->
<h6>Деталь</h6>     <!-- Пропущены h4, h5 -->
```

**SEO-аспекты заголовков:**

- **h1** — один на страницу (технически можно несколько, но для SEO лучше один)
- Заголовки формируют **outline** документа
- Ключевые слова в h1-h3 имеют вес для ранжирования
- Не используйте заголовки для стилизации (используйте CSS)
- Screen readers используют заголовки для навигации — иерархия критична для доступности

### 1.4. Семантическая разметка для SEO

```html
<!-- Семантические элементы помогают поисковикам понять структуру -->
<article>
  <header>
    <h1>Название статьи</h1>
    <time datetime="2026-03-22">22 марта 2026</time>
    <address>
      Автор: <a rel="author" href="/authors/ivan">Иван Петров</a>
    </address>
  </header>

  <section>
    <h2>Введение</h2>
    <p>Основной текст...</p>
  </section>

  <section>
    <h2>Подробности</h2>
    <figure>
      <img src="diagram.png" alt="Диаграмма процесса" width="800" height="600">
      <figcaption>Рис. 1 — Диаграмма жизненного цикла Promise</figcaption>
    </figure>
  </section>

  <footer>
    <p>Теги: <a href="/tags/javascript">JavaScript</a>, <a href="/tags/async">Async</a></p>
  </footer>
</article>

<aside>
  <h2>Похожие статьи</h2>
  <nav>
    <ul>
      <li><a href="/async-await">Async/Await</a></li>
      <li><a href="/callbacks">Callbacks</a></li>
    </ul>
  </nav>
</aside>
```

### 1.5. Дополнительные meta-теги для SEO

```html
<head>
  <!-- Кодировка — ОБЯЗАТЕЛЬНО первым в head -->
  <meta charset="UTF-8">

  <!-- Viewport — критично для mobile-first indexing -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Язык — дополняет атрибут lang на html -->
  <html lang="ru">

  <!-- Robots — управление индексацией (подробнее в секции 9) -->
  <meta name="robots" content="index, follow">

  <!-- Канонический URL (подробнее в секции 7) -->
  <link rel="canonical" href="https://example.com/page">

  <!-- Favicon — отображается в SERP -->
  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
</head>
```

---

## 2. Schema.org — структурированные данные

### 2.1. Что такое Schema.org

**Schema.org** — совместная инициатива Google, Microsoft (Bing), Yahoo и Yandex, определяющая словарь для структурированных данных. Поисковые системы используют schema.org для создания **rich snippets** — расширенных сниппетов в результатах поиска.

Rich snippets увеличивают CTR на 20-30% по данным различных исследований.

### 2.2. Форматы разметки

| Формат | Описание | Рекомендация Google |
|--------|----------|--------------------|
| **JSON-LD** | JavaScript-объект в `<script>` | Рекомендуемый формат |
| **Microdata** | Атрибуты в HTML-элементах | Поддерживается |
| **RDFa** | Атрибуты в HTML (стандарт W3C) | Поддерживается |

### 2.3. Основные типы Schema.org

#### Article

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Полное руководство по JavaScript Promises",
  "description": "Подробное руководство с примерами кода",
  "image": "https://example.com/images/promises-guide.jpg",
  "author": {
    "@type": "Person",
    "name": "Иван Петров",
    "url": "https://example.com/authors/ivan"
  },
  "publisher": {
    "@type": "Organization",
    "name": "DevDocs",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  },
  "datePublished": "2026-03-15",
  "dateModified": "2026-03-22",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://example.com/js-promises"
  }
}
</script>
```

#### Product

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Ноутбук ProMax 16",
  "image": [
    "https://example.com/images/promax-1.jpg",
    "https://example.com/images/promax-2.jpg"
  ],
  "description": "Профессиональный ноутбук для разработчиков",
  "sku": "PM16-2026",
  "brand": {
    "@type": "Brand",
    "name": "TechBrand"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/products/promax-16",
    "priceCurrency": "RUB",
    "price": "149990",
    "priceValidUntil": "2026-12-31",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "ТехМагазин"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.7",
    "reviewCount": "234"
  }
}
</script>
```

#### Organization

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "DevDocs",
  "url": "https://devdocs.example.com",
  "logo": "https://devdocs.example.com/logo.png",
  "sameAs": [
    "https://github.com/devdocs",
    "https://twitter.com/devdocs",
    "https://www.linkedin.com/company/devdocs"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+7-800-555-35-35",
    "contactType": "customer service",
    "areaServed": "RU",
    "availableLanguage": "Russian"
  }
}
</script>
```

#### FAQ

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Что такое Promise в JavaScript?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Promise — это объект, представляющий результат асинхронной операции. Он может быть в одном из трёх состояний: pending, fulfilled или rejected."
      }
    },
    {
      "@type": "Question",
      "name": "Чем async/await отличается от Promise?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "async/await — это синтаксический сахар над Promise. Функция с async всегда возвращает Promise, а await приостанавливает выполнение до резолва Promise."
      }
    }
  ]
}
</script>
```

#### BreadcrumbList

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
      "name": "JavaScript",
      "item": "https://example.com/javascript"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Promises",
      "item": "https://example.com/javascript/promises"
    }
  ]
}
</script>
```

#### Event

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Frontend Conf 2026",
  "startDate": "2026-06-15T10:00:00+03:00",
  "endDate": "2026-06-16T18:00:00+03:00",
  "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
  "eventStatus": "https://schema.org/EventScheduled",
  "location": {
    "@type": "Place",
    "name": "Технопарк «Инноватор»",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "ул. Программистов, 42",
      "addressLocality": "Москва",
      "postalCode": "123456",
      "addressCountry": "RU"
    }
  },
  "image": "https://example.com/events/frontend-conf.jpg",
  "description": "Конференция для frontend-разработчиков",
  "offers": {
    "@type": "Offer",
    "url": "https://example.com/events/frontend-conf/tickets",
    "price": "5000",
    "priceCurrency": "RUB",
    "availability": "https://schema.org/InStock",
    "validFrom": "2026-01-01T00:00:00+03:00"
  },
  "organizer": {
    "@type": "Organization",
    "name": "DevEvents",
    "url": "https://devevents.example.com"
  }
}
</script>
```

#### LocalBusiness

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Кофейня «Код и Кофе»",
  "image": "https://example.com/cafe-photo.jpg",
  "@id": "https://example.com/cafe",
  "url": "https://example.com/cafe",
  "telephone": "+7-495-555-12-34",
  "priceRange": "₽₽",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "ул. Ленина, 42",
    "addressLocality": "Москва",
    "postalCode": "101000",
    "addressCountry": "RU"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 55.7558,
    "longitude": 37.6173
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "08:00",
      "closes": "22:00"
    },
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Saturday", "Sunday"],
      "opens": "10:00",
      "closes": "20:00"
    }
  ]
}
</script>
```

---

## 3. JSON-LD — формат структурированных данных

### 3.1. Синтаксис и размещение

JSON-LD (JavaScript Object Notation for Linked Data) — рекомендуемый Google формат для структурированных данных.

```html
<!-- Размещение в head (рекомендуется) или body -->
<head>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "DevDocs",
    "url": "https://devdocs.example.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://devdocs.example.com/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  }
  </script>
</head>
```

### 3.2. Вложенные типы

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Руководство по React",
  "author": {
    "@type": "Person",
    "name": "Анна Сидорова",
    "jobTitle": "Senior Frontend Developer",
    "worksFor": {
      "@type": "Organization",
      "name": "TechCorp",
      "url": "https://techcorp.example.com"
    }
  },
  "publisher": {
    "@type": "Organization",
    "name": "DevDocs",
    "logo": {
      "@type": "ImageObject",
      "url": "https://devdocs.example.com/logo.png",
      "width": 600,
      "height": 60
    }
  }
}
</script>
```

### 3.3. Multiple Schemas на одной странице

```html
<!-- Вариант 1: Несколько script-блоков -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [...]
}
</script>

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "..."
}
</script>

<!-- Вариант 2: @graph для объединения -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://example.com/article#webpage",
      "url": "https://example.com/article",
      "name": "Название страницы",
      "isPartOf": { "@id": "https://example.com/#website" }
    },
    {
      "@type": "Article",
      "@id": "https://example.com/article#article",
      "mainEntityOfPage": { "@id": "https://example.com/article#webpage" },
      "headline": "Заголовок статьи",
      "author": { "@id": "https://example.com/#author" }
    },
    {
      "@type": "Person",
      "@id": "https://example.com/#author",
      "name": "Иван Петров"
    },
    {
      "@type": "WebSite",
      "@id": "https://example.com/#website",
      "url": "https://example.com",
      "name": "DevDocs"
    }
  ]
}
</script>
```

### 3.4. Ссылки между объектами через @id

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://example.com/#org",
      "name": "Компания",
      "url": "https://example.com"
    },
    {
      "@type": "Person",
      "@id": "https://example.com/#author",
      "name": "Иван",
      "worksFor": { "@id": "https://example.com/#org" }
    },
    {
      "@type": "Article",
      "author": { "@id": "https://example.com/#author" },
      "publisher": { "@id": "https://example.com/#org" }
    }
  ]
}
</script>
```

> **Best practice:** Используйте `@id` для связи объектов между собой вместо дублирования данных. Это особенно полезно при использовании `@graph`.

---

## 4. Microdata — атрибуты в HTML

### 4.1. Синтаксис Microdata

Microdata встраивает структурированные данные непосредственно в HTML-элементы с помощью атрибутов:

| Атрибут | Описание |
|---------|----------|
| `itemscope` | Определяет контейнер элемента schema |
| `itemtype` | URL типа schema.org |
| `itemprop` | Имя свойства |
| `itemid` | Глобальный идентификатор элемента |

```html
<article itemscope itemtype="https://schema.org/Article">
  <h1 itemprop="headline">Руководство по JavaScript Promises</h1>

  <div itemprop="author" itemscope itemtype="https://schema.org/Person">
    Автор: <span itemprop="name">Иван Петров</span>
  </div>

  <time itemprop="datePublished" datetime="2026-03-22">22 марта 2026</time>

  <img itemprop="image" src="/images/promises.jpg"
       alt="Диаграмма Promise lifecycle" width="800" height="600">

  <div itemprop="articleBody">
    <p>Promise — это объект, представляющий результат асинхронной операции...</p>
  </div>

  <div itemprop="publisher" itemscope itemtype="https://schema.org/Organization">
    <meta itemprop="name" content="DevDocs">
    <link itemprop="logo" href="https://example.com/logo.png">
  </div>
</article>
```

### 4.2. Скрытые значения в Microdata

```html
<!-- meta и link для значений, не видимых на странице -->
<div itemscope itemtype="https://schema.org/Product">
  <h2 itemprop="name">Ноутбук ProMax</h2>
  <meta itemprop="sku" content="PM16-2026">
  <link itemprop="url" href="https://example.com/products/promax">

  <div itemprop="offers" itemscope itemtype="https://schema.org/Offer">
    <span itemprop="price" content="149990">149 990</span>
    <meta itemprop="priceCurrency" content="RUB">
    <link itemprop="availability" href="https://schema.org/InStock">
  </div>
</div>
```

### 4.3. JSON-LD vs Microdata — сравнение

| Критерий | JSON-LD | Microdata |
|----------|---------|-----------|
| **Размещение** | Отдельный `<script>` блок | Атрибуты в HTML-элементах |
| **Связь с DOM** | Не связан с визуальными элементами | Тесно связан с разметкой |
| **Рекомендация Google** | Рекомендуемый формат | Поддерживается |
| **Поддержка Yandex** | Поддерживается | Поддерживается |
| **Простота добавления** | Можно добавить без изменения HTML | Требует модификации HTML |
| **Динамический контент** | Легко генерировать на сервере/клиенте | Сложнее для SPA |
| **Читаемость** | Компактный JSON | Распределён по HTML |
| **Дублирование данных** | Возможно дублирование с HTML | Данные привязаны к контенту |

> **Рекомендация:** Используйте JSON-LD как основной формат. Microdata оправдан, когда данные schema.org точно соответствуют видимому контенту и вы хотите гарантировать синхронизацию.

---

## 5. Open Graph — протокол социальных сетей

### 5.1. Основные свойства

Open Graph Protocol (OGP), разработанный Facebook (Meta), определяет, как контент отображается при шеринге в социальных сетях.

```html
<head>
  <!-- Обязательные свойства -->
  <meta property="og:title" content="Руководство по JavaScript Promises">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://example.com/js-promises">
  <meta property="og:image" content="https://example.com/images/promises-og.jpg">

  <!-- Рекомендуемые свойства -->
  <meta property="og:description" content="Полное руководство по Promises с примерами кода">
  <meta property="og:site_name" content="DevDocs">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:locale:alternate" content="en_US">
</head>
```

### 5.2. Свойства изображения

```html
<!-- Основное изображение -->
<meta property="og:image" content="https://example.com/images/article-og.jpg">
<meta property="og:image:secure_url" content="https://example.com/images/article-og.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Диаграмма Promise lifecycle">

<!-- Несколько изображений (в порядке приоритета) -->
<meta property="og:image" content="https://example.com/images/primary.jpg">
<meta property="og:image" content="https://example.com/images/secondary.jpg">
```

**Рекомендуемые размеры изображений:**

| Платформа | Размер | Соотношение |
|-----------|--------|-------------|
| Facebook | 1200x630 | 1.91:1 |
| Twitter (X) | 1200x628 | 1.91:1 |
| LinkedIn | 1200x627 | 1.91:1 |
| VK | 1200x630 | 1.91:1 |
| Telegram | 1200x630 | 1.91:1 |

### 5.3. Типы контента (og:type)

```html
<!-- Статья -->
<meta property="og:type" content="article">
<meta property="article:published_time" content="2026-03-22T10:00:00+03:00">
<meta property="article:modified_time" content="2026-03-22T15:30:00+03:00">
<meta property="article:author" content="https://example.com/authors/ivan">
<meta property="article:section" content="JavaScript">
<meta property="article:tag" content="Promises">
<meta property="article:tag" content="Async">

<!-- Профиль -->
<meta property="og:type" content="profile">
<meta property="profile:first_name" content="Иван">
<meta property="profile:last_name" content="Петров">
<meta property="profile:username" content="ivanpetrov">

<!-- Вебсайт (главная страница) -->
<meta property="og:type" content="website">

<!-- Видео -->
<meta property="og:type" content="video.other">
<meta property="og:video" content="https://example.com/video/tutorial.mp4">
<meta property="og:video:type" content="video/mp4">
<meta property="og:video:width" content="1280">
<meta property="og:video:height" content="720">
```

### 5.4. Twitter Cards

```html
<!-- Twitter (X) specific meta tags -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@devdocs">
<meta name="twitter:creator" content="@ivanpetrov">
<meta name="twitter:title" content="Руководство по JavaScript Promises">
<meta name="twitter:description" content="Полное руководство с примерами">
<meta name="twitter:image" content="https://example.com/images/promises-twitter.jpg">
<meta name="twitter:image:alt" content="Диаграмма Promise lifecycle">
```

| Тип карточки | Описание |
|-------------|----------|
| `summary` | Маленькое изображение слева, текст справа |
| `summary_large_image` | Большое изображение сверху, текст снизу |
| `app` | Карточка приложения |
| `player` | Видео/аудио плеер |

### 5.5. Полный шаблон социальных meta-тегов

```html
<head>
  <!-- Основные meta -->
  <title>Заголовок страницы — Бренд</title>
  <meta name="description" content="Описание страницы для поисковиков">

  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:title" content="Заголовок для соцсетей">
  <meta property="og:description" content="Описание для соцсетей">
  <meta property="og:url" content="https://example.com/page">
  <meta property="og:image" content="https://example.com/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Бренд">
  <meta property="og:locale" content="ru_RU">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@brand">
  <meta name="twitter:title" content="Заголовок для Twitter">
  <meta name="twitter:description" content="Описание для Twitter">
  <meta name="twitter:image" content="https://example.com/twitter-image.jpg">

  <!-- Telegram (использует Open Graph) -->
  <!-- VK (использует Open Graph) -->
</head>
```

---

## 6. Structured Data Testing — проверка разметки

### 6.1. Инструменты тестирования

| Инструмент | URL | Описание |
|------------|-----|----------|
| **Google Rich Results Test** | search.google.com/test/rich-results | Проверяет, подходит ли разметка для rich snippets в Google |
| **Schema Markup Validator** | validator.schema.org | Проверяет синтаксическую корректность schema.org |
| **Google Search Console** | search.google.com/search-console | Мониторинг rich results в реальном времени, ошибки разметки |
| **Yandex Webmaster** | webmaster.yandex.ru | Валидатор микроразметки Яндекса |
| **Facebook Sharing Debugger** | developers.facebook.com/tools/debug | Проверка и обновление кеша Open Graph |
| **Twitter Card Validator** | cards-dev.twitter.com/validator | Проверка Twitter Cards |
| **LinkedIn Post Inspector** | linkedin.com/post-inspector | Проверка превью для LinkedIn |

### 6.2. Типичные ошибки в структурированных данных

| Ошибка | Описание | Решение |
|--------|----------|---------|
| Missing required fields | Не заполнены обязательные свойства типа | Добавить все required и recommended поля |
| Invalid URL | Некорректная ссылка в свойстве | Использовать абсолютные URL с https |
| Image too small | Изображение меньше минимальных требований | Минимум 1200x630 для OG, 696px по ширине для Google |
| Markup mismatch | Данные в разметке не соответствуют видимому контенту | Синхронизировать JSON-LD с контентом страницы |
| Duplicate schemas | Несколько конфликтующих schemas одного типа | Использовать один главный тип на страницу |

> **Важно:** Google может удалить rich snippets за нарушение рекомендаций (spam structured data). Никогда не размечайте контент, которого нет на странице, не завышайте рейтинги и не указывайте ложные данные.

### 6.3. Мониторинг в Google Search Console

```
Search Console → Enhancements → раздел для каждого типа:
  - FAQ
  - Product snippets
  - Breadcrumbs
  - Article
  - Sitelinks searchbox
  - и другие

Для каждого типа видны:
  - Valid — корректные страницы
  - Valid with warnings — работает, но есть предупреждения
  - Error — ошибки, rich snippets не показываются
```

---

## 7. Canonical URLs — канонические адреса

### 7.1. Проблема дубликатов контента

Одна и та же страница может быть доступна по разным URL:

```
https://example.com/page
https://example.com/page/
https://example.com/page?ref=social
https://example.com/page?utm_source=newsletter
http://example.com/page
https://www.example.com/page
https://example.com/Page  (разный регистр)
```

Без указания canonical Google может:
- Разделить «ссылочный вес» между дубликатами
- Выбрать неправильный URL для показа в SERP
- Тратить crawl budget на дубли

### 7.2. Реализация rel=canonical

```html
<!-- На каждой странице — указание канонического URL -->
<head>
  <link rel="canonical" href="https://example.com/page">
</head>
```

**Правила:**

| Правило | Описание |
|---------|----------|
| Абсолютный URL | Всегда используйте полный URL с протоколом |
| Self-referencing | Каждая страница должна указывать на саму себя, если она каноническая |
| Один canonical | Только один `<link rel="canonical">` на страницу |
| Доступность | Каноническая страница должна возвращать 200 OK |
| Содержимое | Canonical должен указывать на страницу с похожим контентом |
| Не используйте для пагинации | rel=canonical не заменяет пагинацию (Google удалил rel=prev/next) |

### 7.3. Canonical для разных сценариев

```html
<!-- Страница с параметрами фильтрации -->
<!-- URL: /catalog?color=red&size=L&sort=price -->
<link rel="canonical" href="https://example.com/catalog">

<!-- Мобильная версия (m.example.com) указывает на десктопную -->
<link rel="canonical" href="https://example.com/page">

<!-- AMP-страница указывает на основную -->
<link rel="canonical" href="https://example.com/article">

<!-- Синдицированный контент (перепечатка) указывает на оригинал -->
<link rel="canonical" href="https://original-site.com/article">
```

### 7.4. HTTP-заголовок Link

Для не-HTML ресурсов (PDF, документы):

```
HTTP/1.1 200 OK
Link: <https://example.com/document>; rel="canonical"
```

> **Подводный камень:** Если canonical указывает на URL, который сам имеет другой canonical (цепочка), Google может проигнорировать указание. Избегайте цепочек canonical.

---

## 8. Hreflang — мультиязычные сайты

### 8.1. Зачем нужен hreflang

`hreflang` сообщает поисковикам, какие языковые и региональные версии страницы существуют. Это помогает показывать правильную версию в нужном регионе.

### 8.2. Синтаксис

```html
<head>
  <!-- Русская версия (Россия) -->
  <link rel="alternate" hreflang="ru-RU" href="https://example.com/ru/page">

  <!-- Русская версия (Украина) -->
  <link rel="alternate" hreflang="ru-UA" href="https://example.ua/ru/page">

  <!-- Украинская версия -->
  <link rel="alternate" hreflang="uk-UA" href="https://example.ua/uk/page">

  <!-- Английская версия -->
  <link rel="alternate" hreflang="en" href="https://example.com/en/page">

  <!-- Немецкая версия (Германия) -->
  <link rel="alternate" hreflang="de-DE" href="https://example.de/page">

  <!-- Немецкая версия (Австрия) -->
  <link rel="alternate" hreflang="de-AT" href="https://example.at/page">

  <!-- Версия по умолчанию (для всех остальных) -->
  <link rel="alternate" hreflang="x-default" href="https://example.com/page">

  <!-- Canonical — текущая страница -->
  <link rel="canonical" href="https://example.com/ru/page">
</head>
```

### 8.3. Формат значений hreflang

```
hreflang="[язык]"           → hreflang="ru"      (ISO 639-1)
hreflang="[язык]-[регион]"  → hreflang="ru-RU"   (ISO 639-1 + ISO 3166-1 Alpha-2)
hreflang="x-default"        → Страница по умолчанию
```

| Значение | Описание |
|----------|----------|
| `ru` | Русский язык, любой регион |
| `ru-RU` | Русский язык, Россия |
| `ru-UA` | Русский язык, Украина |
| `en-US` | Английский язык, США |
| `en-GB` | Английский язык, Великобритания |
| `x-default` | Версия по умолчанию / страница выбора языка |

### 8.4. Правила hreflang

1. **Двусторонняя связь:** Каждая страница должна ссылаться на все языковые версии, включая саму себя
2. **Self-referencing:** Страница ОБЯЗАНА включать hreflang на саму себя
3. **x-default:** Рекомендуется всегда указывать для обработки неподдерживаемых языков
4. **Валидные URL:** Все URL должны возвращать 200 OK
5. **Canonical consistency:** Каноническая страница должна содержать hreflang-аннотации

### 8.5. Альтернативные способы указания hreflang

```
<!-- Вариант 1: HTML-теги в head (описан выше) -->

<!-- Вариант 2: HTTP-заголовок -->
Link: <https://example.com/en/page>; rel="alternate"; hreflang="en",
      <https://example.com/ru/page>; rel="alternate"; hreflang="ru",
      <https://example.com/page>; rel="alternate"; hreflang="x-default"

<!-- Вариант 3: Sitemap XML -->
```

```xml
<!-- sitemap.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>https://example.com/ru/page</loc>
    <xhtml:link rel="alternate" hreflang="ru" href="https://example.com/ru/page"/>
    <xhtml:link rel="alternate" hreflang="en" href="https://example.com/en/page"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/page"/>
  </url>
</urlset>
```

> **Для крупных сайтов:** Sitemap — предпочтительный метод, так как не раздувает HTML и проще поддерживать.

---

## 9. Robots — управление индексацией

### 9.1. Meta robots

```html
<head>
  <!-- Разрешить индексацию и переход по ссылкам (по умолчанию) -->
  <meta name="robots" content="index, follow">

  <!-- Запретить индексацию, но следовать ссылкам -->
  <meta name="robots" content="noindex, follow">

  <!-- Разрешить индексацию, но не следовать ссылкам -->
  <meta name="robots" content="index, nofollow">

  <!-- Запретить всё -->
  <meta name="robots" content="noindex, nofollow">

  <!-- Запретить кеширование -->
  <meta name="robots" content="noarchive">

  <!-- Запретить сниппет в SERP -->
  <meta name="robots" content="nosnippet">

  <!-- Ограничить длину сниппета -->
  <meta name="robots" content="max-snippet:160">

  <!-- Ограничить размер превью изображения -->
  <meta name="robots" content="max-image-preview:large">

  <!-- Запретить перевод страницы -->
  <meta name="robots" content="notranslate">

  <!-- Комбинация -->
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">

  <!-- Специфично для Googlebot -->
  <meta name="googlebot" content="noindex">

  <!-- Специфично для Yandex -->
  <meta name="yandex" content="noindex">
</head>
```

### 9.2. Все директивы meta robots

| Директива | Описание |
|-----------|----------|
| `index` | Разрешить индексацию (по умолчанию) |
| `noindex` | Запретить индексацию |
| `follow` | Следовать по ссылкам на странице (по умолчанию) |
| `nofollow` | Не следовать по ссылкам |
| `noarchive` | Не показывать кешированную копию |
| `nosnippet` | Не показывать текстовый сниппет |
| `max-snippet:[N]` | Максимальная длина текстового сниппета в символах |
| `max-image-preview:[size]` | Максимальный размер превью: none, standard, large |
| `max-video-preview:[N]` | Максимальная длина видеопревью в секундах |
| `notranslate` | Не предлагать перевод страницы |
| `noimageindex` | Не индексировать изображения на странице |
| `unavailable_after:[date]` | Не показывать после указанной даты |

### 9.3. X-Robots-Tag (HTTP-заголовок)

Для не-HTML ресурсов или серверного управления:

```
HTTP/1.1 200 OK
X-Robots-Tag: noindex, nofollow

# Для конкретного бота
X-Robots-Tag: googlebot: noindex
X-Robots-Tag: bingbot: noarchive

# Для PDF-файлов (nginx)
location ~* \.pdf$ {
    add_header X-Robots-Tag "noindex, nofollow";
}
```

### 9.4. robots.txt

```
# /robots.txt

User-agent: *
Disallow: /admin/
Disallow: /api/
Disallow: /search
Disallow: /tmp/
Allow: /api/public/

User-agent: Googlebot
Disallow: /private/
Allow: /

User-agent: YandexBot
Disallow: /private/
Crawl-delay: 2

# Sitemap
Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/sitemap-news.xml
```

> **Критически важно:** `robots.txt` Disallow НЕ запрещает индексацию. Он запрещает СКАНИРОВАНИЕ. Если другие сайты ссылаются на заблокированную страницу, Google может показать URL в SERP (без сниппета). Для запрета индексации используйте `noindex`.

### 9.5. Sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2026-03-22</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2026-01-15</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

**Индекс sitemap для крупных сайтов:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://example.com/sitemap-pages.xml</loc>
    <lastmod>2026-03-22</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-products.xml</loc>
    <lastmod>2026-03-20</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://example.com/sitemap-images.xml</loc>
    <lastmod>2026-03-18</lastmod>
  </sitemap>
</sitemapindex>
```

---

## 10. Core Web Vitals и SEO

### 10.1. Что такое Core Web Vitals

Core Web Vitals (CWV) — набор метрик Google, измеряющих пользовательский опыт. С июня 2021 года CWV является фактором ранжирования.

| Метрика | Что измеряет | Хорошо | Нужна работа | Плохо |
|---------|-------------|--------|--------------|-------|
| **LCP** (Largest Contentful Paint) | Скорость загрузки главного контента | ≤ 2.5с | ≤ 4.0с | > 4.0с |
| **INP** (Interaction to Next Paint) | Отзывчивость на взаимодействия | ≤ 200мс | ≤ 500мс | > 500мс |
| **CLS** (Cumulative Layout Shift) | Визуальная стабильность | ≤ 0.1 | ≤ 0.25 | > 0.25 |

> **Примечание:** INP (Interaction to Next Paint) заменил FID (First Input Delay) в марте 2024 года как основную метрику отзывчивости.

### 10.2. LCP — как HTML влияет

LCP-элементы — это крупнейшие видимые элементы в viewport:
- `<img>` элементы
- `<image>` внутри `<svg>`
- `<video>` с poster-изображением
- Элементы с `background-image` через CSS
- Блочные текстовые элементы

```html
<!-- ✅ Оптимизация LCP через HTML -->

<!-- Preload для LCP-изображения -->
<link rel="preload" as="image" href="/hero.webp"
      fetchpriority="high"
      imagesrcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
      imagesizes="100vw">

<!-- fetchpriority на LCP-изображении -->
<img src="/hero.webp" alt="Главное изображение"
     fetchpriority="high"
     width="1200" height="600"
     loading="eager">

<!-- Preconnect к CDN -->
<link rel="preconnect" href="https://cdn.example.com">
<link rel="dns-prefetch" href="https://cdn.example.com">

<!-- Inline critical CSS -->
<style>
  /* Только критические стили для above-the-fold */
  .hero { display: block; width: 100%; }
</style>
```

### 10.3. INP — влияние HTML

```html
<!-- ❌ Тяжёлый обработчик в атрибуте -->
<button onclick="heavyComputation()">Нажми</button>

<!-- ✅ Делегирование событий для минимизации слушателей -->
<ul id="list">
  <li data-action="view" data-id="1">Товар 1</li>
  <li data-action="view" data-id="2">Товар 2</li>
  <!-- ... сотни элементов -->
</ul>

<script>
  document.getElementById('list').addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (target) {
      const { action, id } = target.dataset;
      handleAction(action, id);
    }
  });
</script>
```

### 10.4. CLS — предотвращение сдвигов

```html
<!-- ✅ Всегда указывайте width и height для изображений -->
<img src="photo.jpg" width="800" height="600" alt="Фото">

<!-- ✅ Или aspect-ratio через CSS -->
<style>
  img { aspect-ratio: 4 / 3; width: 100%; height: auto; }
</style>

<!-- ✅ Резервируйте место для динамического контента -->
<div class="ad-slot" style="min-height: 250px;">
  <!-- Рекламный баннер загрузится позже -->
</div>

<!-- ✅ Используйте CSS containment -->
<div style="contain: layout;">
  <!-- Контент, размер которого может меняться -->
</div>

<!-- ❌ Причины CLS -->
<!-- Изображения без размеров -->
<img src="photo.jpg" alt="Без размеров">

<!-- Шрифты, вызывающие FOUT -->
<link href="https://fonts.googleapis.com/css2?family=Roboto" rel="stylesheet">
<!-- (без font-display: swap и preload) -->

<!-- Динамически вставленный контент над текущим viewport -->
<div id="banner"></div> <!-- Баннер появляется через 2 секунды -->
```

### 10.5. HTML-оптимизации для Core Web Vitals — сводная таблица

| Метрика | HTML-оптимизация | Влияние |
|---------|-----------------|---------|
| **LCP** | `fetchpriority="high"` на LCP-элементе | Приоритет загрузки |
| **LCP** | `<link rel="preload">` для критических ресурсов | Раннее обнаружение |
| **LCP** | `<link rel="preconnect">` к origin-серверам | Ускорение соединения |
| **LCP** | Inline critical CSS | Устранение render-blocking |
| **LCP** | `loading="eager"` для LCP-изображения | Немедленная загрузка |
| **INP** | `loading="lazy"` для offscreen-изображений | Меньше работы main thread |
| **INP** | `<script defer>` / `<script async>` | Не блокировать parsing |
| **INP** | `content-visibility: auto` | Ленивый rendering |
| **CLS** | `width` и `height` атрибуты на img/video | Резервирование места |
| **CLS** | `aspect-ratio` в CSS | Стабильность layout |
| **CLS** | `font-display: swap` / `optional` | Контроль FOIT/FOUT |
| **CLS** | `min-height` для динамических блоков | Стабильность layout |
