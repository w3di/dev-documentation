# useEffectEvent — нереактивная логика в эффектах

> **Статус:** experimental (React 19+). API может измениться.

## Оглавление

1. [Проблема](#проблема)
2. [Решение: useEffectEvent](#решение-useeffectevent)
3. [Примеры](#примеры)
4. [Правила использования](#правила-использования)
5. [Отличие от useCallback](#отличие-от-usecallback)

---

## Проблема

Иногда эффект должен «видеть» актуальные значения props/state, но **не перезапускаться** при их изменении:

```jsx
function Page({ url, shoppingCart }) {
  useEffect(() => {
    logVisit(url, shoppingCart.length);
    // shoppingCart в зависимостях → эффект запускается при каждом
    // изменении корзины, хотя мы хотим логировать только при смене url
  }, [url, shoppingCart]); // ❌ Лишняя зависимость
}
```

Убрать `shoppingCart` из зависимостей нельзя — линтер ругается, и значение будет устаревшим.

---

## Решение: useEffectEvent

`useEffectEvent` создаёт функцию, которая всегда видит **актуальные** значения, но не является реактивной зависимостью:

```jsx
import { useEffect, useEffectEvent } from 'react';

function Page({ url, shoppingCart }) {
  const onVisit = useEffectEvent((visitedUrl) => {
    logVisit(visitedUrl, shoppingCart.length);
    // shoppingCart.length всегда актуален
  });

  useEffect(() => {
    onVisit(url);
  }, [url]); // ✅ Только url — эффект не зависит от shoppingCart
}
```

---

## Примеры

### Чат с логированием темы

```jsx
function ChatRoom({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    showNotification('Подключено!', theme);
    // theme всегда актуален, но переподключение не происходит при смене темы
  });

  useEffect(() => {
    const connection = createConnection(roomId);
    connection.on('connected', () => onConnected());
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]); // ✅ Переподключение только при смене roomId
}
```

### Таймер с настраиваемым шагом

```jsx
function Timer({ interval, increment }) {
  const onTick = useEffectEvent(() => {
    setCount(c => c + increment);
    // increment всегда актуален, таймер не пересоздаётся
  });

  useEffect(() => {
    const id = setInterval(onTick, interval);
    return () => clearInterval(id);
  }, [interval]); // ✅ Пересоздаётся только при смене interval
}
```

---

## Правила использования

1. **Вызывать только из `useEffect`** — не из обработчиков событий, не из рендера
2. **Не передавать в другие компоненты или хуки** — это не обычный колбэк
3. **Не включать в зависимости** — useEffectEvent намеренно не является реактивным

```jsx
// ❌ Нельзя передавать как prop
<Child onTick={onTick} />

// ❌ Нельзя вызывать вне useEffect
function handleClick() {
  onTick(); // Запрещено
}

// ✅ Только внутри useEffect
useEffect(() => {
  onTick(); // Правильно
}, []);
```

---

## Отличие от useCallback

| | useCallback | useEffectEvent |
|---|---|---|
| Назначение | Стабильная ссылка на функцию | Нереактивная логика в эффекте |
| Реактивная зависимость | Да (перечислена в deps) | Нет (исключена из deps) |
| Видит актуальные значения | Только при пересоздании | Всегда |
| Можно передать как prop | ✅ | ❌ |
| Можно вызвать вне useEffect | ✅ | ❌ |
| Статус | Стабильный | Experimental |
