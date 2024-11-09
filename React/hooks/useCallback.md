`useCallback` — это хук в React, который позволяет кэшировать определение функции между перерисовками компонента.

```jsx
const memoizedFunction = useCallback(fn, dependencies);
```

## Параметры

- **fn**: Функция, которую вы хотите кэшировать.
- **dependencies**: Массив зависимостей, по изменению которых функция пересоздастся.

```jsx
import { useCallback } from 'react';

export default function ProductPage({ productId, referrer }) {
  const handleSubmit = useCallback((orderDetails) => {
    post('/product/' + productId + '/buy', { referrer, orderDetails });
  }, [productId, referrer]);
}
```
### Возвращаемое значение:

- В первой перерисовке `useCallback` возвращает переданную функцию.
- В последующих перерисовках возвращает сохраненную функцию, если зависимости не изменились, или новую, если зависимости изменились.

### Предостережения

- `useCallback` можно вызывать только на верхнем уровне компонента или пользовательских хуков, не внутри циклов или условий.
- React не удаляет кэшированную функцию без причины. Например, в режиме разработки кэш удаляется при изменении файла компонента, а также если компонент приостанавливается при монтировании.
- В будущем React может добавить механизмы удаления кэша (например, для виртуализированных списков), что стоит учитывать, если вы используете `useCallback` для оптимизации производительности. В таких случаях лучше использовать состояние или ссылки.



## Пример использования

В примере с компонентами `ProductPage` и `ShippingForm` важно оптимизировать рендеры с помощью `useCallback` и `memo`.

При изменении `theme` в `ProductPage` компонент `ShippingForm` перерисовывается, даже если его свойства не изменились. Это происходит потому, что каждый раз создается новая версия функции `handleSubmit`, передаваемой в `ShippingForm`.

Чтобы избежать лишних рендеров, можно обернуть `ShippingForm` в `memo`, чтобы он не перерисовывался, если его свойства не изменились:

```jsx
import { memo } from 'react';

const ShippingForm = memo(function ShippingForm({ onSubmit }) {
  // ...
});
```

Однако без использования `useCallback` для `handleSubmit` при изменении `theme` функция будет пересоздаваться, и `ShippingForm` всегда будет получать новые свойства, что отменяет оптимизацию с `memo`.

Используя `useCallback`, можно гарантировать, что функция `handleSubmit` останется той же между рендерами:

```jsx
import { useCallback } from 'react';

function ProductPage({ productId, referrer, theme }) {
  const handleSubmit = useCallback((orderDetails) => {
    post('/product/' + productId + '/buy', { referrer, orderDetails });
  }, [productId, referrer]);

  return (
    <div className={theme}>
      <ShippingForm onSubmit={handleSubmit} />
    </div>
  );
}
```

Теперь `ShippingForm` будет перерисовываться только при изменении его свойств, и оптимизация с `memo` будет работать.

## Связь между useCallback и useMemo

**useMemo** кэширует результат функции, а **useCallback** — саму функцию. `useMemo` пересчитывает значение только при изменении зависимостей, а `useCallback` возвращает одну и ту же функцию между рендерами, пока не изменятся зависимости.

## Пример использования

```jsx
import { useMemo, useCallback } from 'react';

function ProductPage({ productId, referrer }) {
  const product = useData('/product/' + productId);
  const requirements = useMemo(() => computeRequirements(product), [product]);
  const handleSubmit = useCallback((orderDetails) => {
    post('/product/' + productId + '/buy', { referrer, orderDetails });
  }, [productId, referrer]);

  return (
    <div>
      <ShippingForm requirements={requirements} onSubmit={handleSubmit} />
    </div>
  );
}
```

В этом примере `requirements` кэшируется с помощью `useMemo`, чтобы избежать повторного вычисления при каждом рендере компонента, если `product` не изменился. Функция `handleSubmit` кэшируется с помощью `useCallback`, чтобы не создавать новую функцию при каждом рендере.

## Когда использовать useCallback и useMemo?

- **Передача функций как пропсов**: Для компонентов, обернутых в `React.memo`, `useCallback` помогает избежать ненужной повторной отрисовки.
- **Зависимости других хуков**: Если функция используется в зависимостях других хуков (например, `useEffect`), `useCallback` предотвратит ненужные вызовы эффектов.
- **Тяжелые вычисления**: Используйте `useMemo`, чтобы избежать повторного выполнения дорогостоящих вычислений.

## Не стоит ли использовать useCallback везде?

Не рекомендуется использовать `useCallback` и `useMemo` без нужды. Если приложение не испытывает проблем с производительностью, их использование может усложнить код. Эти хуки следует применять только при явных проблемах с производительностью или частых перерисовках компонентов.

## Заключение

`useCallback` и `useMemo` могут улучшить производительность приложения, если используются по делу. Однако важно избегать излишней мемоизации, чтобы не усложнять код и не снижать его читабельность.


### Обновление состояния через мемоизированный callback

Функция `handleAddTodo` в компоненте `TodoList` обновляет состояние на основе предыдущего значения, используя мемоизацию через хук `useCallback`. В первом примере функция зависит от массива `todos`, что требует его указания в зависимостях:

```jsx
function TodoList() {
  const [todos, setTodos] = useState([]);
  const handleAddTodo = useCallback((text) => {
    const newTodo = { id: nextId++, text };
    setTodos([...todos, newTodo]);
  }, [todos]);
}
```

Этот подход может вызвать проблемы с производительностью, так как функция пересоздаётся при каждом изменении `todos`. Чтобы избежать этого, можно передать функцию обновления состояния, не включая `todos` в зависимости:

```jsx
function TodoList() {
  const [todos, setTodos] = useState([]);
  const handleAddTodo = useCallback((text) => {
    const newTodo = { id: nextId++, text };
    setTodos(todos => [...todos, newTodo]);
  }, []); // ✅ Зависимость todos не нужна
}
```

В этом случае React сам управляет обновлением состояния, что делает код более эффективным.

