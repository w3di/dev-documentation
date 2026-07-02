# Next.js — полное руководство

> **Next.js** — React-фреймворк для production-приложений. Предоставляет серверный рендеринг,
> файловую маршрутизацию, оптимизацию производительности, кэширование и стриминг из коробки.
> App Router (Next.js 13+) использует React Server Components как основу архитектуры.

---

## Оглавление

### Основы

- [[Структура проекта и организация]] — файловые конвенции, папки, специальные файлы

### Маршрутизация

- [[Routing]] — файловая маршрутизация, layouts, pages, динамические и параллельные маршруты
- [[Linking и Navigating]] — навигация, префетчинг, стриминг, клиентские переходы

### Рендеринг

- [[Рендеринг]] — SSR, SSG, ISR, CSR, Streaming, гидратация
- [[Server и Client Components]] — модель компонентов, RSC Payload, директива `'use client'`
- [[Partial Pre-rendering (PPR)]] — гибридный статический + динамический рендеринг

### Данные

- [[Fetching Data]] — получение данных на сервере и клиенте, дедупликация, стриминг
- [[Server Actions]] — мутации данных, формы, ревалидация кэша
- [[Caching]] — Request Memoization, Data Cache, Full Route Cache, Router Cache

### Оптимизация

- [[Images]] — компонент `next/image`, форматы, lazy loading, responsive
- [[Fonts]] — `next/font`, Google Fonts, локальные шрифты, zero layout shift
- [[Metadata и SEO]] — Metadata API, Open Graph, sitemap, robots.txt

### Стилизация

- [[Стилизация]] — CSS Modules, Tailwind CSS, Sass, CSS-in-JS, Global CSS

### Обработка ошибок

- [[Обработка ошибок]] — error.tsx, global-error, not-found, error boundaries

### Middleware и API

- [[Middleware]] — серверная логика до маршрутизации, аутентификация, CORS, A/B тесты
- [[Route Handlers]] — API endpoints, HTTP-методы, streaming, CORS

### API Reference

- [[API Reference]] — директивы, компоненты (Link, Image, Script), хуки (useRouter, usePathname)

### Конфигурация

- [[next.config.js]] — настройки проекта, images, redirects, rewrites, webpack

### Развёртывание

- [[Deployment]] — Vercel, self-hosting, Docker, static export, CI/CD

### Справочник

- [[Questions]] — вопросы и ответы по всем темам Next.js

---

## Структура базы знаний

```
Next.js/
├── Next.js.md                          ← вы здесь
├── Структура проекта и организация.md
├── Routing/
│   ├── Routing.md
│   └── Linking и Navigating.md
├── Рендеринг/
│   ├── Рендеринг.md
│   ├── Server и Client Components.md
│   └── Partial Pre-rendering (PPR).md
├── Данные/
│   ├── Fetching Data.md
│   ├── Server Actions.md
│   └── Caching.md
├── Оптимизация/
│   ├── Images.md
│   ├── Fonts.md
│   └── Metadata и SEO.md
├── Стилизация.md
├── Обработка ошибок.md
├── Middleware.md
├── Route Handlers.md
├── API Reference/
│   └── API Reference.md
├── next.config.js.md
├── Deployment.md
└── Questions.md
```
