# CLI и инструменты Dart Sass

> Dart Sass -- единственная активно поддерживаемая реализация Sass.
> LibSass и Ruby Sass устарели. Dart Sass включает мощный CLI.

---

## Оглавление

1. [Установка](#1-установка)
2. [Режимы использования](#2-режимы-использования)
3. [Основные опции](#3-основные-опции)
4. [Source Maps](#4-source-maps)
5. [Наблюдение и отладка](#5-наблюдение-и-отладка)
6. [Управление устареваниями](#6-управление-устареваниями)
7. [Информационные команды](#7-информационные-команды)

---

## 1. Установка

```bash
# npm (рекомендуемый)
npm install -g sass

# Homebrew (macOS)
brew install sass/sass/sass

# Chocolatey (Windows)
choco install sass

# Standalone (GitHub releases)
# https://github.com/sass/dart-sass/releases
```

---

## 2. Режимы использования

### Один-к-одному

```bash
sass input.scss output.css
```

### Многие-ко-многим

```bash
sass style.scss:style.css light.scss:light.css
sass themes:public/css     # Все файлы из директории
```

Sass игнорирует частичные файлы (с `_`) при компиляции директорий.

### Определение синтаксиса

По расширению: `.scss` -> SCSS, `.sass` -> indented, `.css` -> plain CSS.

---

## 3. Основные опции

| Опция | Описание |
|---|---|
| `--stdin` | Читать из stdin |
| `--indented` | Принудительно indented syntax |
| `--load-path=PATH` / `-I PATH` | Дополнительные пути поиска |
| `--pkg-importer=node` / `-p node` | Node.js pkg: импортер |
| `--style=expanded\|compressed` / `-s` | Стиль вывода |
| `--no-charset` | Без `@charset` |
| `--error-css` | CSS-файл с описанием ошибки |
| `--update` | Компилировать только измененные |

### Стили вывода

**expanded** (по умолчанию) -- читаемый, с отступами:
```css
.button {
  padding: 8px 16px;
  background: blue;
}
```

**compressed** -- минифицированный:
```css
.button{padding:8px 16px;background:blue}
```

---

## 4. Source Maps

| Опция | Описание |
|---|---|
| `--no-source-map` | Отключить source maps |
| `--source-map-urls=relative\|absolute` | Тип URL в source map |
| `--embed-sources` | Встроить исходники в source map |
| `--embed-source-map` | Встроить source map в CSS |

Source maps позволяют инспектору браузера показывать исходные `.scss` файлы вместо скомпилированного CSS.

---

## 5. Наблюдение и отладка

| Опция | Описание |
|---|---|
| `--watch` / `-w` | Следить за изменениями файлов |
| `--poll` | Ручная проверка изменений (для сетевых дисков) |
| `--stop-on-error` | Остановиться при первой ошибке |
| `--interactive` / `-i` | Интерактивный режим REPL |
| `--color` / `-c` | Цветной вывод в терминале |
| `--no-unicode` | Только ASCII в сообщениях |
| `--verbose` | Все предупреждения об устаревании |
| `--quiet` / `-q` | Подавить все предупреждения |
| `--quiet-deps` | Подавить предупреждения зависимостей |
| `--trace` | Полный стек-трейс ошибок |

### Примеры

```bash
# Следить за изменениями и компилировать
sass --watch src/scss:dist/css

# Минификация
sass --style=compressed src/main.scss dist/main.min.css

# REPL для экспериментов
sass --interactive
>> 1px + 2px
3px
>> darken(#036, 20%)
#000e29
```

---

## 6. Управление устареваниями

| Опция | Описание |
|---|---|
| `--fatal-deprecation=ID` | Сделать устаревание ошибкой |
| `--future-deprecation=ID` | Включить будущие предупреждения |
| `--silence-deprecation=ID` | Подавить конкретное предупреждение |

### ID устареваний

| ID | Описание |
|---|---|
| `slash-div` | `/` как деление |
| `import` | `@import` |
| `color-functions` | Глобальные цветовые функции (`darken`, `lighten`) |
| `global-builtin` | Глобальные встроенные функции |
| `legacy-js-api` | Старый JS API |
| `call-string` | `call()` со строкой вместо функции |
| `elseif` | `@elseif` вместо `@else if` |
| `strict-unary` | Строгий парсинг унарных операторов |
| `function-units` | Строгая проверка единиц |
| `null-alpha` | `null` в альфа-канале |
| `abs-percent` | `abs()` с процентами |
| `if-function` | Legacy `if()` |

```bash
# Подготовка к Sass 3.0: сделать @import ошибкой
sass --fatal-deprecation=import src/main.scss dist/main.css

# Подавить шум от зависимостей
sass --quiet-deps --silence-deprecation=import src/main.scss dist/main.css
```

---

## 7. Информационные команды

```bash
sass --help     # Справка
sass --version  # Версия
```

### Интеграция со сборщиками

**Vite:**
```javascript
// vite.config.js
export default {
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "src/styles/abstracts" as *;`,
      },
    },
  },
};
```

**Webpack:**
```javascript
// webpack.config.js
{
  test: /\.scss$/,
  use: ['style-loader', 'css-loader', 'sass-loader'],
}
```
