# Наследование и @extend

> `@extend` позволяет одному селектору наследовать стили другого.
> Sass выполняет "умное объединение" селекторов, минимизируя дублирование CSS.

---

## Оглавление

1. [Основы @extend](#1-основы-extend)
2. [Как это работает](#2-как-это-работает)
3. [Плейсхолдеры %](#3-плейсхолдеры-)
4. [Необязательное расширение](#4-необязательное-расширение)
5. [Ограничения](#5-ограничения)
6. [@extend vs @mixin](#6-extend-vs-mixin)

---

## 1. Основы @extend

`@extend` позволяет одному селектору наследовать стили другого:

```scss
.error {
  border: 1px #f00;
  background-color: #fdd;

  &--serious {
    @extend .error;
    border-width: 3px;
  }
}
```

Компилируется в:
```css
.error, .error--serious {
  border: 1px #f00;
  background-color: #fdd;
}
.error--serious {
  border-width: 3px;
}
```

---

## 2. Как это работает

В отличие от миксинов, `@extend` **не копирует стили**. Вместо этого он обновляет правила, содержащие расширяемый селектор, добавляя расширяющий селектор.

Sass выполняет "умное объединение" (intelligent unification):
- Не создает невозможных селекторов (как `#main#footer`)
- Правильно обрабатывает сложные селекторы
- Убирает избыточные селекторы
- Работает с комбинаторами, универсальными селекторами и псевдоклассами

### Расширение во всех контекстах

```scss
.error:hover { background-color: #fee; }
.error--serious { @extend .error; }
// Также генерирует: .error--serious:hover { background-color: #fee; }
```

Sass находит **все** правила, содержащие расширяемый селектор, и добавляет туда расширяющий.

---

## 3. Плейсхолдеры % -- рекомендуемый подход

Плейсхолдеры начинаются с `%` и не генерируют CSS сами по себе:

```scss
%strong-alert {
  font-weight: bold;
  color: red;
}

.alert {
  @extend %strong-alert;
  border: 1px solid red;
}

.notification {
  @extend %strong-alert;
  border: 1px solid orange;
}
```

Компилируется в:
```css
.alert, .notification {
  font-weight: bold;
  color: red;
}
.alert { border: 1px solid red; }
.notification { border: 1px solid orange; }
```

**Преимущества плейсхолдеров:**
- Не генерируют лишний CSS если не расширены
- Явно показывают намерение переиспользования
- Не загрязняют CSS неиспользуемыми селекторами

---

## 4. Необязательное расширение

Если расширяемый селектор не существует, `@extend` вызовет ошибку. `!optional` подавляет ее:

```scss
.alert { @extend .message !optional; }
```

---

## 5. Ограничения

### Только простые селекторы

Можно расширять: `.info`, `a`, `%placeholder`

Нельзя расширять: `.message.info` (составные), `.main .info` (потомки)

### @media

`@extend` внутри `@media` не может расширять селекторы за пределами этого `@media`:

```scss
.error { border: 1px red; }

@media screen {
  .alert {
    @extend .error;  // Ошибка! .error за пределами @media
  }
}
```

### Модули

Расширения в рамках `@use` действуют только на "восходящие" модули (те, что были загружены, а не те, что загрузили текущий файл).

---

## 6. @extend vs @mixin

| Критерий | @extend | @mixin |
|---|---|---|
| Механизм | Объединяет селекторы | Копирует стили |
| Параметры | Нет | Да |
| @content | Нет | Да |
| Размер CSS | Меньше (объединение) | Больше (копирование) |
| Предсказуемость | Сложнее (каскад) | Проще |
| Когда использовать | Семантическая связь ("является") | Несемантические коллекции стилей |

### Когда @extend

```scss
// Кнопка "является" базовой кнопкой
%button-base { padding: 8px 16px; border: none; cursor: pointer; }
.button { @extend %button-base; background: blue; }
.button-danger { @extend %button-base; background: red; }
```

### Когда @mixin

```scss
// Позиционирование -- не семантическая связь, нужны параметры
@mixin position($type, $top: null, $right: null, $bottom: null, $left: null) {
  position: $type;
  top: $top;
  right: $right;
  bottom: $bottom;
  left: $left;
}

.modal { @include position(fixed, 0, 0, 0, 0); }
```

> **Рекомендация из Sass Guidelines:** Предпочитайте `@mixin` перед `@extend`. `@extend` может привести к непредсказуемому росту селекторов и проблемам при gzip-сжатии.
