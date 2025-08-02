 
```jsx
import { useEffect } from 'react';
import { createConnection } from './chat.js';

function ChatRoom({ roomId }) {
  const [serverUrl, setServerUrl] = useState('https://localhost:1234');

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.connect();
    return () => {
      connection.disconnect();
    };
  }, [serverUrl, roomId]);
  // ...
}
```
### Параметры

- **setup:**  
    Функция с логикой эффекта. Она может возвращать функцию очистки (cleanup). React выполнит `setup` при монтировании, а затем при изменении зависимостей выполнит сначала `cleanup` с предыдущими значениями, затем новый `setup`. При размонтировании компонента выполнится `cleanup`.
    
- **dependencies:**  
    Массив зависимостей (props, state и любые переменные из компонента). React будет выполнять эффект только при изменении зависимостей. Если не указать массив, эффект будет выполняться при каждом рендере.



Каждый раз, когда ваш компонент рендерится, React обновляет экран, а затем выполняет код внутри `useEffect`. Другими словами, `useEffect` «откладывает» выполнение части кода до тех пор, пока этот рендер не отразится на экране.

### Возвращаемое значение

- **undefined**  
    Хук `useEffect` всегда возвращает `undefined`.

### Важные моменты

1. **Когда эффект не нужен:**  
    Если цель — не синхронизация с внешней системой, эффект может быть не нужен.
    
2. **useLayoutEffect:**  
    Используйте его, если эффект влияет на визуальные изменения и требуется минимизировать задержку.
    
3. **Асинхронные эффекты:**  
    Для откладывания выполнения эффекта используйте `setTimeout` или другие механизмы.
    
4. **Клиентские эффекты:**  
    Эффекты работают только на клиенте, не во время серверного рендеринга.

5. В режиме разработки React вызывает функции подключения и очистки дважды при каждом рендере,


### Использование

Чтобы подключить компонент к внешней системе, используйте хук `useEffect` в верхнем уровне компонента:

```jsx
import { useEffect } from 'react';
import { createConnection } from './chat.js';

function ChatRoom({ roomId }) {
  const [serverUrl, setServerUrl] = useState('https://localhost:1234');

  useEffect(() => {
  	const connection = createConnection(serverUrl, roomId);
    connection.connect();
  	return () => {
      connection.disconnect();
  	};
  }, [serverUrl, roomId]);
  // ...
}
```

В `useEffect` передаются два аргумента:
- **setup function**, которая отвечает за соединение с системой.
- **cleanup function**, которая отключает систему.

Также передаётся список зависимостей — значения, которые влияют на выполнение эффекта.

React автоматически вызывает функции подключения и очистки:
1. Когда компонент добавляется на страницу (монтируется), запускается функция подключения.
2. После каждого рендера, если изменились зависимости:
    - Сначала вызывается функция очистки для предыдущего состояния и пропсов.
    - Затем вызывается функция подключения с новыми значениями зависимостей.
3. Когда компонент удаляется со страницы (размонтируется), выполняется финальная очистка.


### Specifying reactive dependencies

Все реактивные значения в коде эффекта должны быть указаны в списке зависимостей:

```jsx
function ChatRoom({ roomId }) { // roomId — это реактивное значение
  const [serverUrl, setServerUrl] = useState('https://localhost:1234'); // тоже реактивное значение

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId); // Эффект использует эти реактивные значения
    connection.connect();
    return () => connection.disconnect();
  }, [serverUrl, roomId]); // ✅ Ты обязан указать их как зависимости эффекта
  // ...
}
```


Реактивные значения включают пропсы и переменные/функции внутри компонента.

Чтобы исключить зависимость, можно вынести значение за пределы компонента чтобы сделать ее не реактивным значением.

```jsx
const serverUrl = 'https://localhost:1234'; // Больше не реактивное значение
const roomId = 'music'; // Тоже не реактивное значение

function ChatRoom() {
  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);
    connection.connect();
    return () => connection.disconnect();
  }, []); // ✅ Все зависимости указаны
  // ...
}
```

Эффект с пустым списком зависимостей не будет повторно запускаться при изменении пропсов или состояния компонента.


###  Examples of passing reactive dependencies

Если вы укажете зависимости, ваш эффект будет выполняться **после первого рендеринга и при изменении зависимостей.**
```jsx
useEffect(() => {  
// ...  
}, [a, b]); // Runs again if a or b are different
```

Если эффект не использует реактивные значения, он сработает только **после первого рендеринга.**
```jsx
useEffect(() => {  
// ...  
}, []); // Does not run again (except once in development)
```

Если не передать массив зависимостей, эффект будет выполняться **после каждого рендеринга.**
```jsx
useEffect(() => {  
// ...  
}); // Always runs again
```




### Reading the latest props and state from an Effect

Когда вы используете эффекты в React, по умолчанию необходимо указывать все зависимости, чтобы обеспечить правильное реагирование на изменения. Если вам нужно получить актуальные значения свойств и состояния без повторного выполнения эффекта, можно использовать `useEffectEvent`.

Чтобы логировать количество элементов в корзине при каждом изменении URL, но не при изменении самой корзины, сделайте так:

```jsx
function Page({ url, shoppingCart }) {
  const onVisit = useEffectEvent(visitedUrl => {
    logVisit(visitedUrl, shoppingCart.length);
  });

  useEffect(() => {
    onVisit(url);
  }, [url]); // Указана только зависимость от URL
}
```



### Removing unnecessary function dependencies

Если ваш эффект зависит от объекта или функции, созданной во время рендеринга, он может выполняться слишком часто. Например, функция `createOptions` создаётся заново при каждом рендере, и её ссылка каждый раз отличается:

```jsx
function ChatRoom({ roomId }) {
  const [message, setMessage] = useState('');

  function createOptions() { // 🚩 Эта функция создаётся с нуля при каждом рендере
    return {
      serverUrl: serverUrl,
      roomId: roomId
    };
  }
  
	const createOptions = { /// 🚩 Эта функция создаётся с нуля при каждом
		serverUrl: serverUrl,  
		roomId: roomId  
	};

  useEffect(() => {
    const options = createOptions(); // Она используется внутри эффекта
    const connection = createConnection();
    connection.connect();
    return () => connection.disconnect();
  }, [createOptions]); // 🚩 В результате эти зависимости всегда разные при рендере
  // ...
}
```

Чтобы избежать этого, объявите функцию внутри эффекта:
```jsx
function ChatRoom({ roomId }) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    function createOptions() {
      return {
        serverUrl: serverUrl,
        roomId: roomId
      };
    }
    const options = createOptions();
    const connection = createConnection(options);
    connection.connect();
    return () => connection.disconnect();
  }, [roomId]);
}
```
