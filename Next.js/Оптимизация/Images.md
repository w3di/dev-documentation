# Images (next/image) — оптимизация изображений

> Компонент `<Image>` из `next/image` автоматически оптимизирует изображения: конвертирует
> в современные форматы (AVIF, WebP), сжимает, адаптирует под устройство и предотвращает
> **layout shift** благодаря обязательным размерам. Lazy loading включён по умолчанию.

---

## Оглавление

1. [Проблемы, которые решает](#1-проблемы-которые-решает)
2. [Базовое использование](#2-базовое-использование)
3. [Локальные vs внешние изображения](#3-локальные-vs-внешние-изображения)
4. [Fill prop и адаптивность](#4-fill-prop-и-адаптивность)
5. [Качество и placeholder](#5-качество-и-placeholder)
6. [CSS и позиционирование](#6-css-и-позиционирование)
7. [Loaders и кастомизация](#7-loaders-и-кастомизация)
8. [Priority и preload](#8-priority-и-preload)
9. [Основные пропсы](#9-основные-пропсы)
10. [Рекомендации](#10-рекомендации)

---

## 1. Проблемы, которые решает

- **Layout shift** — без указания размеров изображение «прыгает» при загрузке (ухудшает CLS).
- **Неоптимизированные файлы** — отправка 5 MB PNG вместо 50 KB WebP.
- **Отсутствие responsive** — одно изображение для всех устройств.
- **Нет lazy loading** — загрузка всех изображений сразу, включая невидимые.

---

## 2. Базовое использование

```tsx
import Image from 'next/image'
import profilePic from '@/public/profile.jpg'

export default function Page() {
  return (
    <Image
      src={profilePic}
      alt="Фото профиля"
      width={500}
      height={300}
      // width/height определяются автоматически для локальных импортов
    />
  )
}
```

Результат: оптимизированный `<img>` с `srcset`, `sizes`, `loading="lazy"` и правильными размерами.

---

## 3. Локальные vs внешние изображения

### Локальные

```tsx
import heroImage from '@/public/hero.jpg'
// width, height, blurDataURL определяются автоматически
<Image src={heroImage} alt="Hero" />
```

### Внешние

```tsx
<Image
  src="https://example.com/photo.jpg"
  alt="Фото"
  width={800}
  height={600}
/>
```

Для внешних изображений **обязательно** настройте allowlist в `next.config.js`:

```js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
        pathname: '/images/**',
      },
    ],
  },
}
```

Безопасность: без allowlist злоумышленник может использовать ваш сервер для оптимизации произвольных изображений.

---

## 4. Fill prop и адаптивность

Когда размеры неизвестны заранее — используйте `fill`:

```tsx
<div style={{ position: 'relative', width: '100%', height: '400px' }}>
  <Image
    src="/banner.jpg"
    alt="Banner"
    fill
    sizes="(max-width: 768px) 100vw, 50vw"
    style={{ objectFit: 'cover' }}
  />
</div>
```

- **`fill`** — изображение заполняет родительский контейнер.
- **`sizes`** (обязателен с `fill`) — определяет, какие варианты генерировать для `srcset`.
- Родитель **должен** иметь `position: relative` (или `absolute`/`fixed`).

---

## 5. Качество и placeholder

### Quality

```tsx
<Image src={photo} alt="Фото" quality={85} /> // по умолчанию 75
```

Диапазон: 1–100. Для hero/фоновых изображений: 85–100. Для превью: 60–75.

### Blur placeholder

```tsx
// Автоматический blur для локальных изображений
<Image src={localImage} alt="Фото" placeholder="blur" />

// Кастомный blur для внешних
<Image
  src="https://example.com/photo.jpg"
  alt="Фото"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
/>
```

---

## 6. CSS и позиционирование

### object-fit

```tsx
<Image src={photo} alt="" fill style={{ objectFit: 'cover' }} />
<Image src={photo} alt="" fill style={{ objectFit: 'contain' }} />
```

### CSS Grid галерея

```tsx
<div className="grid grid-cols-3 gap-4">
  {images.map((img) => (
    <div key={img.id} className="relative aspect-square">
      <Image src={img.src} alt={img.alt} fill style={{ objectFit: 'cover' }} />
    </div>
  ))}
</div>
```

---

## 7. Loaders и кастомизация

### Встроенный loader

По умолчанию Next.js оптимизирует на своём сервере (`/_next/image`).

### Внешний CDN

```tsx
const cloudinaryLoader = ({ src, width, quality }) => {
  return `https://res.cloudinary.com/demo/image/upload/w_${width},q_${quality || 75}/${src}`
}

<Image loader={cloudinaryLoader} src="sample.jpg" alt="" width={500} height={300} />
```

### Глобальный loader

```js
// next.config.js
module.exports = {
  images: {
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
  },
}
```

---

## 8. Priority и preload

Для LCP-изображений (hero, above-the-fold):

```tsx
<Image src={hero} alt="Hero" priority />
```

- Отключает lazy loading.
- Добавляет `<link rel="preload">` в `<head>`.
- Используйте только для 1–2 самых важных изображений на странице.

---

## 9. Основные пропсы

| Проп | Тип | Обязателен | Описание |
|------|-----|:----------:|----------|
| `src` | `string \| StaticImport` | ✅ | Источник изображения |
| `alt` | `string` | ✅ | Описание для доступности |
| `width` | `number` | ✅* | Ширина в пикселях |
| `height` | `number` | ✅* | Высота в пикселях |
| `fill` | `boolean` | — | Заполнить родительский контейнер |
| `sizes` | `string` | — | Медиа-условия для srcset |
| `quality` | `number` | — | Качество 1–100 (по умолчанию 75) |
| `priority` | `boolean` | — | Preload для LCP |
| `placeholder` | `'blur' \| 'empty'` | — | Placeholder при загрузке |
| `loader` | `function` | — | Кастомный URL-генератор |

*Не нужен при `fill` или при статическом импорте.

---

## 10. Рекомендации

- **Всегда указывайте `alt`** — для доступности и SEO.
- **Используйте `fill` + `sizes`** для адаптивных изображений вместо фиксированных размеров.
- **Настройте `remotePatterns`** для внешних изображений — безопасность.
- **Ставьте `priority`** только на LCP-изображения (1–2 на страницу).
- **Используйте `placeholder="blur"`** для улучшения воспринимаемой скорости.
- **Оптимизируйте `quality`**: 75 для большинства, 85–100 для hero.

---

**См. также**: [[Fonts]], [[Metadata и SEO]], [[Стилизация]]
