# useId — генерация уникальных идентификаторов

## Оглавление

1. [Назначение](#назначение)
2. [Сигнатура и возвращаемое значение](#сигнатура-и-возвращаемое-значение)
3. [Связь label и input](#связь-label-и-input)
4. [Несколько связанных элементов](#несколько-связанных-элементов)
5. [aria-describedby](#aria-describedby)
6. [useId и SSR](#useid-и-ssr)
7. [Чего НЕ делать](#чего-не-делать)

---

## Назначение

`useId` генерирует уникальные ID, стабильные между сервером и клиентом. Решает проблему hydration mismatch, которая возникает при использовании счётчиков или `Math.random()` для генерации ID.

---

## Сигнатура и возвращаемое значение

```jsx
import { useId } from 'react';

function PasswordField() {
  const id = useId();
  // id → ':r0:', ':r1:', ':r2:' и т.д.
  // Формат специально непригоден для CSS-селекторов (содержит ':')
}
```

---

## Связь label и input

Основной use-case — доступность (accessibility):

```jsx
function EmailField() {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>Email:</label>
      <input id={id} type="email" />
    </div>
  );
}
```

---

## Несколько связанных элементов

Используйте ID как префикс:

```jsx
function LoginForm() {
  const id = useId();
  return (
    <form>
      <label htmlFor={id + '-email'}>Email:</label>
      <input id={id + '-email'} type="email" />

      <label htmlFor={id + '-password'}>Пароль:</label>
      <input id={id + '-password'} type="password" />
    </form>
  );
}
```

---

## aria-describedby

```jsx
function PasswordInput() {
  const id = useId();
  return (
    <div>
      <label htmlFor={id}>Пароль:</label>
      <input id={id} type="password" aria-describedby={id + '-hint'} />
      <p id={id + '-hint'}>Минимум 8 символов, одна заглавная буква</p>
    </div>
  );
}
```

---

## useId и SSR

ID стабильны между сервером и клиентом — React гарантирует одинаковые значения при hydration.

Для нескольких React-приложений на одной странице используйте `identifierPrefix`:

```jsx
// Приложение 1
const root1 = createRoot(container1, { identifierPrefix: 'app1-' });
// ID → ':app1-r0:', ':app1-r1:'

// Приложение 2
const root2 = createRoot(container2, { identifierPrefix: 'app2-' });
// ID → ':app2-r0:', ':app2-r1:'
```

---

## Чего НЕ делать

```jsx
// ❌ Не используйте как key для списков
{items.map(item => <li key={useId()}>{item}</li>)} // Нарушение правил хуков!

// ✅ Для key используйте данные
{items.map(item => <li key={item.id}>{item}</li>)}

// ❌ Не используйте для CSS-селекторов (содержит ':')
document.querySelector(`#${id}`); // Не сработает

// ❌ Не вызывайте в цикле
for (const field of fields) {
  const id = useId(); // Нарушение правил хуков!
}
```
