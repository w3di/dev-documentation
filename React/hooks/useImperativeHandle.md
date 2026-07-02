# useImperativeHandle — императивный API через ref

## Оглавление

1. [Назначение](#назначение)
2. [Сигнатура](#сигнатура)
3. [Базовый пример](#базовый-пример)
4. [Кастомные методы](#кастомные-методы)
5. [React 19: ref как prop](#react-19-ref-как-prop)
6. [Когда НЕ использовать](#когда-не-использовать)

---

## Назначение

`useImperativeHandle` позволяет настроить, какой объект будет доступен через `ref` у компонента. Вместо полного DOM-узла можно экспортировать только нужные методы.

---

## Сигнатура

```jsx
useImperativeHandle(ref, createHandle, dependencies?)
```

| Параметр | Описание |
|---|---|
| `ref` | Ref, полученный от родительского компонента |
| `createHandle` | Функция, возвращающая объект с методами для экспорта |
| `dependencies?` | Массив зависимостей (как у useMemo) |

---

## Базовый пример

Экспорт только `focus()` вместо полного DOM-узла:

```jsx
import { forwardRef, useRef, useImperativeHandle } from 'react';

const MyInput = forwardRef(function MyInput(props, ref) {
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus() {
      inputRef.current.focus();
    },
    scrollIntoView() {
      inputRef.current.scrollIntoView({ behavior: 'smooth' });
    },
    // Родитель НЕ получит доступ к inputRef.current напрямую
  }), []);

  return <input {...props} ref={inputRef} />;
});

// Использование
function Form() {
  const inputRef = useRef(null);
  return (
    <>
      <MyInput ref={inputRef} />
      <button onClick={() => inputRef.current.focus()}>Фокус</button>
    </>
  );
}
```

---

## Кастомные методы

Экспорт логики, не связанной с DOM:

```jsx
const Modal = forwardRef(function Modal({ children }, ref) {
  const [isOpen, setIsOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    open() { setIsOpen(true); },
    close() { setIsOpen(false); },
    toggle() { setIsOpen(prev => !prev); },
  }), []);

  if (!isOpen) return null;
  return <div className="modal">{children}</div>;
});

// Родитель управляет модалкой императивно
function App() {
  const modalRef = useRef(null);
  return (
    <>
      <button onClick={() => modalRef.current.open()}>Открыть</button>
      <Modal ref={modalRef}>
        <p>Содержимое модалки</p>
        <button onClick={() => modalRef.current.close()}>Закрыть</button>
      </Modal>
    </>
  );
}
```

---

## React 19: ref как prop

В React 19 `forwardRef` больше не нужен — `ref` передаётся как обычный prop:

```jsx
// React 19
function MyInput({ placeholder, ref }) {
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current.focus(),
  }), []);

  return <input placeholder={placeholder} ref={inputRef} />;
}
```

---

## Когда НЕ использовать

Предпочитайте **декларативный подход** (props и state) императивному (ref и методы):

```jsx
// ❌ Императивно: parent вызывает child.open()
modalRef.current.open();

// ✅ Декларативно: parent передаёт prop
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} />
```

Используйте `useImperativeHandle` только когда декларативный подход невозможен или неудобен (фокус, скролл, анимации, интеграция с третьими библиотеками).
