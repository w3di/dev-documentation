это хук React, который позволяет кэшировать результат вычислений между перерисовками.

```jsx
import { useMemo } from 'react';

function TodoList({ todos, tab }) {
  const visibleTodos = useMemo(
    () => filterTodos(todos, tab),
    [todos, tab]
  );
  // ...
}
```


```jsx
useMemo(calculateValue, dependencies)
```
## Параметры

- **calculateValue**: Функция, вычисляющая значение для кэширования. Должна быть чистой, без аргументов. React вызывает её при первой перерисовке и повторно — только если изменились зависимости.
    
- **dependencies**: Список значений, на которые ссылается `calculateValue` (props, состояние, переменные и функции внутри компонента). React проверяет каждую зависимость через `Object.is`, чтобы определить необходимость повторного вычисления.

## Возвращает

- При первой перерисовке `useMemo` возвращает результат `calculateValue`.

- При следующих перерисовках возвращает кэшированное значение, если зависимости не изменились; иначе вызывает `calculateValue` заново.

## Предостережения
-Если компонент приостанавливается во время монтирования (например, при асинхронной загрузке данных), React удалит кэш и пересчитает значение при повторном рендере.


### Как определить, является ли вычисление затратным?

Если вы не создаете и не обрабатываете тысячи объектов, вычисление, скорее всего, не является затратным. Чтобы проверить это, можно добавить логирование в консоль для измерения времени выполнения:

```jsx
console.time('filter array');
const visibleTodos = filterTodos(todos, tab);
console.timeEnd('filter array');
```

После выполнения действия (например, ввода текста в поле) вы увидите лог, например: `filter array: 0.15ms`. Если время заметное (например, от 1 мс и выше), стоит попробовать мемоизировать вычисление с помощью `useMemo`:

```jsx
console.time('filter array');
const visibleTodos = useMemo(() => {
  return filterTodos(todos, tab); // пропускается, если todos и tab не изменились
}, [todos, tab]);
console.timeEnd('filter array');
```

`useMemo` не ускоряет первый рендер, но позволяет избежать лишних расчетов при обновлениях. Компьютеры пользователей обычно медленнее вашего, поэтому тестирование с замедлением (например, ограничение ЦП в Chrome) поможет оценить реальную производительность. Также для точности лучше тестировать в продакшене, так как в режиме разработки замеры могут быть неточными.

### Следует ли добавлять `useMemo` повсюду?

Если в вашем приложении основные взаимодействия — замена страниц или разделов, мемоизация обычно не нужна. Но для более детализированных взаимодействий, как в графических редакторах, она полезна.

Оптимизация с помощью `useMemo` имеет смысл в случаях, когда:

- Вычисление медленное, а его зависимости редко изменяются.
- Вы передаете его как пропс компоненту, обернутому в `memo`, чтобы избежать лишнего рендеринга.
- Значение, передаваемое в `useMemo`, позже используется в зависимостях других хуков (например, `useEffect`).

Если же ни одно из условий не выполнено, оборачивать в `useMemo` не обязательно. Однако чрезмерная мемоизация может ухудшить читаемость кода. Мемоизация может быть неэффективной, если зависимости часто меняются, что может привести к повторным расчетам.

### Принципы для уменьшения необходимости в `useMemo`

Много мемоизации можно избежать, если соблюдать следующие принципы:

- При создании обертывающих компонентов принимайте дочерние элементы как JSX, чтобы при обновлении состояния родителя React не рендерил их заново.
- Избегайте поднимания состояния выше необходимого уровня.
- Держите логику рендеринга «чистой». Если повторный рендеринг вызывает артефакты, исправьте ошибку, а не мемоизируйте.
- Минимизируйте эффекты, обновляющие состояние, так как это может вызвать избыточные рендеры.
- Убирайте ненужные зависимости из эффектов. Часто проще переместить объект или функцию внутрь эффекта, чем мемоизировать их.

Если взаимодействие все еще кажется медленным, используйте профайлер React для анализа производительности и добавьте мемоизацию только там, где это необходимо.

## Пропуск повторного рендеринга компонентов

Для оптимизации повторного рендеринга компонентов можно использовать `useMemo`, чтобы предотвратить ненужные пересчёты данных, если входные данные не изменились.

Предположим, компонент `TodoList` передаёт `visibleTodos` в дочерний компонент `List`:

```jsx
export default function TodoList({ todos, tab, theme }) {
  // ...
  return (
    <div className={theme}>
      <List items={visibleTodos} />
    </div>
  );
}
```

Вы заметили, что при смене темы приложение подтормаживает. Если убрать `<List />` из JSX, рендеринг становится быстрее. Это указывает на необходимость оптимизации `List`. React по умолчанию повторно рендерит всех детей компонента, поэтому при изменении `theme` рендерится и `List`. Если рендеринг `List` занимает много ресурсов, оберните его в `memo`, чтобы пропустить повторный рендеринг при тех же пропсах:

```jsx
import { memo } from 'react';

const List = memo(function List({ items }) {
  // ...
});
```

Теперь `List` будет избегать повторного рендеринга, если его пропсы не изменились. Но чтобы `memo` работал, пропсы должны оставаться одинаковыми. В текущем примере функция `filterTodos` всегда создаёт новый массив:

```jsx
export default function TodoList({ todos, tab, theme }) {
  const visibleTodos = filterTodos(todos, tab);
  return (
    <div className={theme}>
      <List items={visibleTodos} />
    </div>
  );
}
```

В этом случае `List` будет всегда рендериться заново. Здесь поможет `useMemo`:

```jsx
export default function TodoList({ todos, tab, theme }) {
  const visibleTodos = useMemo(
    () => filterTodos(todos, tab),
    [todos, tab]
  );
  return (
    <div className={theme}>
      <List items={visibleTodos} />
    </div>
  );
}
```

Использование `useMemo` обеспечивает, что `visibleTodos` останется тем же объектом, если `todos` и `tab` не изменились, что позволяет `List` избежать ненужного рендеринга.

### Мемоизация JSX узлов с useMemo

Вместо того чтобы оборачивать компонент `List` в `memo`, можно обернуть сам узел JSX `<List />` с помощью `useMemo`:

```jsx
export default function TodoList({ todos, tab, theme }) {
  const visibleTodos = useMemo(() => filterTodos(todos, tab), [todos, tab]);
  const children = useMemo(() => <List items={visibleTodos} />, [visibleTodos]);

  return (
    <div className={theme}>
      {children}
    </div>
  );
}
```

Это позволяет избежать повторного рендеринга `List`, если `visibleTodos` не изменились. JSX-узел `<List items={visibleTodos} />` создается как объект `{ type: List, props: { items: visibleTodos } }`, и React не знает, изменился ли он, поэтому рендерит его каждый раз.

Использование `useMemo` делает узел тем же объектом между рендерами, что позволяет React избежать лишних обновлений.

## Предотвращение слишком частого срабатывания эффекта

Иногда необходимо использовать значение внутри эффекта, что может привести к его повторному срабатыванию.

```jsx
function ChatRoom({ roomId }) {  
  const [message, setMessage] = useState('');  
  const options = { serverUrl: 'https://localhost:1234', roomId: roomId }; 

  useEffect(() => {    
    const connection = createConnection(options);    
    connection.connect();    
    return () => connection.disconnect();  
  }, [options]); // 🔴 Проблема: будет переподключаться при каждом рендере
}
```

При указании `options` как зависимости, эффект будет срабатывать при каждом изменении рендера, что вызовет постоянные переподключения.

#### Решение с использованием `useMemo`

Чтобы избежать этой проблемы, оберните объект `options` в `useMemo`:

```jsx
function ChatRoom({ roomId }) {  
  const [message, setMessage] = useState('');  
  const options = useMemo(() => ({ 
    serverUrl: 'https://localhost:1234', 
    roomId: roomId 
  }), [roomId]); // ✅ Обновляется только при изменении roomId

  useEffect(() => {    
    const connection = createConnection(options);    
    connection.connect();    
    return () => connection.disconnect();  
  }, [options]); // ✅ Срабатывает только при изменении options
}
```
Теперь `options` не изменяется между рендерами, пока не изменится `roomId`. Однако `useMemo` — это оптимизация производительности, а не гарантированный способ избежать зависимостей.

### Упрощенный подход: определение объекта внутри эффекта

Вместо `useMemo` можно поместить объект `options` прямо внутрь `useEffect`, полностью устранив необходимость в зависимости:

```jsx
function ChatRoom({ roomId }) {  
  const [message, setMessage] = useState('');  

  useEffect(() => {    
    const options = { 
      serverUrl: 'https://localhost:1234', 
      roomId: roomId 
    }; // ✅ Нет необходимости в useMemo или зависимостях

    const connection = createConnection(options);    
    connection.connect();    
    return () => connection.disconnect();  
  }, [roomId]); // ✅ Срабатывает только при изменении roomId
}
```

Таким образом, код становится проще и не требует дополнительных зависимостей.

## Мемоизация зависимости другого хука

Предположим, у вас есть вычисление, которое зависит от объекта, созданного прямо в теле компонента:

```jsx
function Dropdown({ allItems, text }) {   
  const searchOptions = { matchMode: 'whole-word', text };   
  const visibleItems = useMemo(() => {    
    return searchItems(allItems, searchOptions);  
  }, [allItems, searchOptions]); // 🚩 Зависимость от объекта, создающегося в теле компонента
}
```

Зависимость от объекта, созданного внутри компонента, сводит на нет смысл мемоизации. При каждом рендере `searchOptions` создается заново, и `useMemo` считает, что зависимости изменились, поэтому пересчитывает `searchItems` каждый раз. Чтобы избежать этого, можно мемоизировать сам `searchOptions`:

```jsx
function Dropdown({ allItems, text }) {   
  const searchOptions = useMemo(() => ({ matchMode: 'whole-word', text }), [text]); // ✅ Меняется только при изменении text   
  const visibleItems = useMemo(() => {    
    return searchItems(allItems, searchOptions);  
  }, [allItems, searchOptions]); // ✅ Меняется только при изменении allItems или searchOptions
}
```

Теперь объект `searchOptions` будет меняться только при изменении `text`. Но еще лучше перенести `searchOptions` внутрь `useMemo`:

```jsx
function Dropdown({ allItems, text }) {   
  const visibleItems = useMemo(() => {    
    const searchOptions = { matchMode: 'whole-word', text };    
    return searchItems(allItems, searchOptions);  
  }, [allItems, text]); // ✅ Меняется только при изменении allItems или text
}
```

Теперь зависимость — строка `text`, которая не меняется «случайно», как объект.

## Мемоизация функции

Если, например, компонент `Form` обернут в `memo`, вы можете передавать ему функцию как пропс:

```jsx
export default function ProductPage({ productId, referrer }) {   
  function handleSubmit(orderDetails) {    
    post('/product/' + productId + '/buy', { referrer, orderDetails });  
  }   
  return <Form onSubmit={handleSubmit} />;
}
```

Создание новой функции при каждом рендере само по себе не проблема, но в случае мемоизированного `Form` это сводит на нет смысл мемоизации, так как пропсы всегда будут различными. Чтобы мемоизировать функцию с помощью `useMemo`, функция должна возвращать другую функцию:

```jsx
export default function Page({ productId, referrer }) {   
  const handleSubmit = useMemo(() => {    
    return (orderDetails) => {      
      post('/product/' + productId + '/buy', { referrer, orderDetails });    
    };  
  }, [productId, referrer]);   
  return <Form onSubmit={handleSubmit} />;
}
```

Чтобы избежать вложенной функции, используйте `useCallback`:

```jsx
export default function Page({ productId, referrer }) {   
  const handleSubmit = useCallback((orderDetails) => {    
    post('/product/' + productId + '/buy', { referrer, orderDetails });  
  }, [productId, referrer]);   
  return <Form onSubmit={handleSubmit} />;
}
```

Оба примера эквивалентны, но `useCallback` позволяет избежать лишней вложенности.