# Fonts в Next.js — оптимизация шрифтов и self-hosting

> Модуль `next/font` автоматически оптимизирует шрифты, обеспечивает self-hosting и устраняет layout shift (CLS). Google Fonts загружаются на этапе сборки и раздаются как статические ресурсы -- браузер не отправляет запросы к Google.

---

## Оглавление

1. [next/font — встроенная оптимизация](#1-nextfont--встроенная-оптимизация)
2. [Google Fonts](#2-google-fonts)
3. [Локальные шрифты](#3-локальные-шрифты)
4. [Несколько шрифтов](#4-несколько-шрифтов)
5. [CSS-переменные и Tailwind CSS](#5-css-переменные-и-tailwind-css)
6. [Настройки шрифтов](#6-настройки-шрифтов)
7. [Применение к элементам](#7-применение-к-элементам)

---

## 1. next/font -- встроенная оптимизация

`next/font` -- встроенный модуль Next.js для работы со шрифтами. Он обеспечивает:

- **Self-hosting** -- шрифты раздаются с того же домена, что и приложение
- **Zero layout shift** -- автоматический fallback-шрифт с подогнанными метриками
- **Preload** -- шрифты предзагружаются в зависимости от контекста использования
- **Автоматическое subsetting** -- загружаются только нужные символы

Два источника шрифтов:
- `next/font/google` -- Google Fonts с автоматическим self-hosting
- `next/font/local` -- локальные файлы шрифтов

Базовый паттерн использования:

```tsx
// app/layout.tsx
import { Geist } from 'next/font/google'

const geist = Geist({
  subsets: ['latin'],
})

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={geist.className}>
      <body>{children}</body>
    </html>
  )
}
```

Шрифт привязывается к компоненту, в котором используется. Для глобального применения добавьте его в [[Layouts и Pages|root layout]].

---

## 2. Google Fonts

Google Fonts автоматически загружаются на этапе сборки и раздаются как статические ресурсы. Браузер не отправляет запросы к Google.

### Variable fonts (рекомендуется)

```tsx
import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})
```

Для variable fonts **не нужно** указывать `weight`.

### Фиксированные шрифты

Если шрифт не поддерживает variable fonts, необходимо указать `weight`:

```tsx
import { Roboto } from 'next/font/google'

const roboto = Roboto({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
})
```

Несколько начертаний:

```tsx
const roboto = Roboto({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  display: 'swap',
})
```

> Для шрифтов с несколькими словами в названии используйте underscore: `Roboto_Mono`.

### Subsets

Subsets уменьшают размер файла шрифта. Указание subset обязательно для preload:

```tsx
const inter = Inter({ subsets: ['latin'] })
```

Если `preload: true` (по умолчанию) и subsets не указаны, Next.js выведет предупреждение.

---

## 3. Локальные шрифты

Для использования локальных шрифтов импортируйте `localFont` из `next/font/local`:

```tsx
// app/layout.tsx
import localFont from 'next/font/local'

const myFont = localFont({
  src: './my-font.woff2',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={myFont.className}>
      <body>{children}</body>
    </html>
  )
}
```

Путь к файлу разрешается **относительно файла**, в котором вызывается `localFont`. Шрифты можно хранить в `app/`, `public/` или любой другой директории.

### Несколько файлов для одного шрифта

`src` может быть массивом объектов:

```tsx
const roboto = localFont({
  src: [
    { path: './Roboto-Regular.woff2', weight: '400', style: 'normal' },
    { path: './Roboto-Italic.woff2', weight: '400', style: 'italic' },
    { path: './Roboto-Bold.woff2', weight: '700', style: 'normal' },
    { path: './Roboto-BoldItalic.woff2', weight: '700', style: 'italic' },
  ],
})
```

---

## 4. Несколько шрифтов

### Подход 1: utility-файл

Создайте файл с определениями шрифтов и импортируйте где нужно:

```ts
// app/fonts.ts
import { Inter, Roboto_Mono } from 'next/font/google'

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
})

export const roboto_mono = Roboto_Mono({
  subsets: ['latin'],
  display: 'swap',
})
```

```tsx
// app/layout.tsx
import { inter } from './fonts'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={inter.className}>
      <body>{children}</body>
    </html>
  )
}
```

```tsx
// app/page.tsx
import { roboto_mono } from './fonts'

export default function Page() {
  return <h1 className={roboto_mono.className}>Моноширинный заголовок</h1>
}
```

Шрифт preload-ится только на маршрутах, где используется.

### Подход 2: CSS-переменные

```tsx
// app/layout.tsx
import { Inter, Roboto_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const roboto_mono = Roboto_Mono({ subsets: ['latin'], variable: '--font-roboto-mono', display: 'swap' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${roboto_mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

```css
/* app/globals.css */
html {
  font-family: var(--font-inter);
}
h1 {
  font-family: var(--font-roboto-mono);
}
```

### Path alias для удобного импорта

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/fonts": ["./styles/fonts"]
    }
  }
}
```

> **Рекомендация:** используйте шрифты экономно -- каждый новый шрифт увеличивает объём загрузки.

---

## 5. CSS-переменные и Tailwind CSS

`next/font` интегрируется с [[Стилизация#3-tailwind-css|Tailwind CSS]] через CSS-переменные.

### Настройка шрифтов

```tsx
// app/layout.tsx
import { Inter, Roboto_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
const roboto_mono = Roboto_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-roboto-mono' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${roboto_mono.variable} antialiased`}>
      <body>{children}</body>
    </html>
  )
}
```

### Tailwind v4 (CSS config)

```css
/* globals.css */
@import 'tailwindcss';

@theme inline {
  --font-sans: var(--font-inter);
  --font-mono: var(--font-roboto-mono);
}
```

### Tailwind v3 (JS config)

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
        mono: ['var(--font-roboto-mono)'],
      },
    },
  },
}
```

Теперь доступны utility-классы `font-sans` и `font-mono`:

```html
<p class="font-sans">Текст Inter</p>
<p class="font-mono">Код Roboto Mono</p>
```

---

## 6. Настройки шрифтов

| Опция | font/google | font/local | Тип | Описание |
|---|---|---|---|---|
| `src` | -- | Да | `string \| Array` | Путь к файлу шрифта (обязательный для local) |
| `weight` | Да | Да | `string \| string[]` | Начертание: `'400'`, `'100 900'`, `['400','700']` |
| `style` | Да | Да | `string \| string[]` | Стиль: `'normal'`, `'italic'`, `['normal','italic']` |
| `subsets` | Да | -- | `string[]` | Подмножества символов: `['latin']`, `['cyrillic']` |
| `axes` | Да | -- | `string[]` | Дополнительные оси variable font: `['slnt']` |
| `display` | Да | Да | `string` | `font-display`: `'swap'` (default), `'auto'`, `'block'`, `'fallback'`, `'optional'` |
| `preload` | Да | Да | `boolean` | Предзагрузка шрифта, по умолчанию `true` |
| `fallback` | Да | Да | `string[]` | Fallback-шрифты: `['system-ui', 'arial']` |
| `adjustFontFallback` | Да | Да | `boolean \| string` | Автоподстройка fallback для уменьшения CLS |
| `variable` | Да | Да | `string` | CSS-переменная: `'--font-inter'` |
| `declarations` | -- | Да | `Array<{prop, value}>` | Дополнительные `@font-face` дескрипторы |

### Примеры adjustFontFallback

- Для `next/font/google`: `true` (default) -- автоматический fallback
- Для `next/font/local`: `'Arial'` (default), `'Times New Roman'` или `false`

### Preload-поведение

Шрифт preload-ится на маршрутах в зависимости от того, где он определён:

- В `page.tsx` -- только на этом маршруте
- В `layout.tsx` -- на всех маршрутах, обёрнутых layout
- В root layout -- на всех маршрутах

---

## 7. Применение к элементам

Три способа применить шрифт к элементу:

### className

```tsx
<p className={inter.className}>Hello, Next.js!</p>
```

Возвращает read-only CSS `className` с уникальным классом шрифта.

### style

```tsx
<p style={inter.style}>Hello World</p>
```

Возвращает read-only CSS `style` объект с `fontFamily` и fallback-шрифтами.

### CSS Variables

Для внешних стилей используйте опцию `variable`:

```tsx
import { Inter } from 'next/font/google'
import styles from '../styles/component.module.css'

const inter = Inter({ variable: '--font-inter' })

export default function Page() {
  return (
    <main className={inter.variable}>
      <p className={styles.text}>Hello World</p>
    </main>
  )
}
```

```css
/* styles/component.module.css */
.text {
  font-family: var(--font-inter);
  font-weight: 200;
  font-style: italic;
}
```

> **Важно:** каждый вызов `localFont` или Google font функции создаёт один экземпляр шрифта. Для повторного использования загружайте шрифт в одном месте и импортируйте объект.
