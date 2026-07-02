# Metadata и SEO в Next.js — управление метаданными и поисковая оптимизация

> Metadata API позволяет определять метаданные приложения для улучшения SEO и shareability. Next.js автоматически генерирует `<head>`-теги на основе static metadata object, dynamic `generateMetadata` или файловых конвенций.

---

## Оглавление

1. [Metadata API — обзор](#1-metadata-api--обзор)
2. [Статические метаданные](#2-статические-метаданные)
3. [Динамические метаданные — generateMetadata](#3-динамические-метаданные--generatemetadata)
4. [Наследование и мерж метаданных](#4-наследование-и-мерж-метаданных)
5. [Open Graph и Twitter Cards](#5-open-graph-и-twitter-cards)
6. [Файловые конвенции](#6-файловые-конвенции)
7. [JSON-LD — structured data](#7-json-ld--structured-data)
8. [Viewport и theme-color — generateViewport](#8-viewport-и-theme-color--generateviewport)
9. [Best practices](#9-best-practices)

---

## 1. Metadata API -- обзор

Next.js предоставляет три способа определения метаданных:

| Способ | Описание |
|---|---|
| `metadata` object | Статический экспорт из `layout.tsx` / `page.tsx` |
| `generateMetadata()` | Динамическая функция для data-dependent метаданных |
| Файловые конвенции | `favicon.ico`, `opengraph-image`, `robots.txt`, `sitemap.xml` |

**Ключевые правила:**

- `metadata` и `generateMetadata` поддерживаются **только в Server Components**
- Нельзя экспортировать **оба** из одного route segment
- Файловые метаданные имеют **приоритет** над `metadata` object и `generateMetadata`
- Next.js всегда добавляет default `<meta charset="utf-8" />` и `<meta name="viewport" ...>`

---

## 2. Статические метаданные

Экспортируйте объект `metadata` из [[Layouts и Pages|layout]] или page:

```tsx
// app/blog/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Мой блог',
  description: 'Статьи о веб-разработке',
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <section>{children}</section>
}
```

### Основные поля

```tsx
export const metadata: Metadata = {
  title: 'My App',
  description: 'Description of the app',
  keywords: ['Next.js', 'React', 'JavaScript'],
  authors: [{ name: 'Author', url: 'https://example.com' }],
  creator: 'Creator Name',
  formatDetection: { email: false, address: false, telephone: false },
}
```

### metadataBase

Устанавливает базовый URL для всех URL-полей метаданных:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://acme.com'),
  alternates: { canonical: '/', languages: { 'en-US': '/en-US' } },
  openGraph: { images: '/og-image.png' }, // => https://acme.com/og-image.png
}
```

> `metadataBase` обычно задаётся в root `app/layout.tsx` и применяется ко всем маршрутам.

---

## 3. Динамические метаданные -- generateMetadata

Для метаданных, зависящих от данных (route params, внешние API):

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export async function generateMetadata(
  { params, searchParams }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const slug = (await params).slug
  const post = await fetch(`https://api.example.com/blog/${slug}`).then(r => r.json())
  const previousImages = (await parent).openGraph?.images || []

  return {
    title: post.title,
    description: post.description,
    openGraph: { images: ['/specific-image.jpg', ...previousImages] },
  }
}
```

**Параметры:** `params` (dynamic route параметры), `searchParams` (query-параметры, только в `page.tsx`), `parent` (Promise с resolved метаданными родителей).

### Streaming metadata

Next.js стримит метаданные отдельно от UI, не блокируя рендер. Для ботов (Twitterbot, Slackbot) стриминг **отключён**. Управление через `htmlLimitedBots`:

```ts
const config: NextConfig = { htmlLimitedBots: /.*/ } // отключить streaming полностью
```

### Мемоизация запросов

Для переиспользования данных между metadata и страницей:

```ts
// app/lib/data.ts
import { cache } from 'react'
export const getPost = cache(async (slug: string) => {
  return fetch(`https://api.example.com/blog/${slug}`).then(r => r.json())
})
```

```tsx
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug) // кэшируется
  return { title: post.title }
}
export default async function Page({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug) // из кэша
  return <article>{post.content}</article>
}
```

---

## 4. Наследование и мерж метаданных

Метаданные вычисляются **по порядку**: root layout -> nested layout -> page.

Мерж -- **shallow**: вложенные объекты **перезаписываются целиком**:

```tsx
// app/layout.tsx
export const metadata = {
  title: 'Acme',
  openGraph: { title: 'Acme', description: 'Acme is a...' },
}
// app/blog/page.tsx
export const metadata = {
  title: 'Blog',
  openGraph: { title: 'Blog' }, // description ПОТЕРЯНА!
}
```

Если дочерний segment **не определяет** `openGraph`, он наследует родительский целиком.

### Расшаривание метаданных

```tsx
// app/shared-metadata.ts
export const openGraphImage = { images: ['https://example.com/og.png'] }

// app/page.tsx
import { openGraphImage } from './shared-metadata'
export const metadata = { openGraph: { ...openGraphImage, title: 'Home' } }
```

---

## 5. Open Graph и Twitter Cards

### Open Graph

```tsx
export const metadata: Metadata = {
  openGraph: {
    title: 'My App',
    description: 'Description',
    url: 'https://example.com',
    siteName: 'My App',
    images: [{ url: 'https://example.com/og.png', width: 1200, height: 630 }],
    locale: 'ru_RU',
    type: 'website', // или 'article' с publishedTime, authors
  },
}
```

### Twitter Cards

```tsx
export const metadata: Metadata = {
  twitter: {
    card: 'summary_large_image',
    title: 'My App',
    description: 'Description',
    creator: '@handle',
    images: ['https://example.com/og.png'],
  },
}
```

### Динамическая генерация OG-изображений

```tsx
// app/blog/[slug]/opengraph-image.tsx
import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
  return new ImageResponse(
    <div style={{ fontSize: 128, background: 'white', width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {post.title}
    </div>
  )
}
```

---

## 6. Файловые конвенции

| Файл | Расположение | Описание |
|---|---|---|
| `favicon.ico` | `app/` | Иконка сайта в браузере и закладках |
| `icon.png` / `icon.svg` | `app/` | Иконка (альтернатива favicon) |
| `apple-icon.png` | `app/` | Иконка для Apple-устройств |
| `opengraph-image.jpg` | `app/` или вложенная папка | OG-изображение для соцсетей |
| `twitter-image.jpg` | `app/` или вложенная папка | Изображение для Twitter Cards |
| `robots.txt` | `app/` | Инструкции для поисковых роботов |
| `sitemap.xml` | `app/` | Карта сайта для поисковых систем |

Более специфичный файл имеет приоритет: `app/blog/opengraph-image.jpg` переопределяет `app/opengraph-image.jpg` для `/blog`. Форматы: `.jpg`, `.jpeg`, `.png`, `.gif`.

---

## 7. JSON-LD -- structured data

JSON-LD передаёт структурированные данные поисковым системам через `<script>` тег:

```tsx
export default async function Page({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    author: { '@type': 'Person', name: post.author },
  }

  return (
    <>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article>{post.content}</article>
    </>
  )
}
```

> Валидация: [Rich Results Test](https://search.google.com/test/rich-results) от Google.

---

## 8. Viewport и theme-color -- generateViewport

С Next.js 14 viewport и theme-color вынесены из `metadata` в отдельный API:

```tsx
// app/layout.tsx
import type { Viewport } from 'next'

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'cyan' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'dark',
}
```

Динамический вариант через `generateViewport`:

```tsx
export function generateViewport(): Viewport {
  return { themeColor: 'black' }
}
```

> `viewport` и `generateViewport` -- **только Server Components**. Нельзя экспортировать оба из одного segment.

---

## 9. Best practices

### Title templates

```tsx
// app/layout.tsx -- template применяется к дочерним segments
export const metadata: Metadata = {
  title: { template: '%s | My App', default: 'My App' },
}
// app/about/page.tsx
export const metadata: Metadata = { title: 'About' } // => "About | My App"
```

`title.absolute` игнорирует template: `{ absolute: 'Custom Title' }`.

### Canonical URLs и robots

```tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  alternates: { canonical: '/about', languages: { 'ru-RU': '/ru/about' } },
  robots: {
    index: true, follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  verification: { google: 'code', yandex: 'code' },
}
```

### Чеклист SEO-оптимизации

- Задайте `metadataBase` в root layout
- Используйте `title.template` для единообразных заголовков
- Добавьте `description` на каждую ключевую страницу
- Настройте `openGraph` и `twitter` для социальных сетей
- Создайте `robots.txt` и `sitemap.xml`
- Добавьте JSON-LD для structured data
- Укажите `canonical` URL для предотвращения дублирования
- Используйте `generateMetadata` с мемоизацией через `cache`
