# useDeferredValue Overview — раздел Transitions & Deferred Values

## Когда использовать

- **`useDeferredValue`** — когда **нет полного контроля** над кодом: значение приходит из библиотеки, родительского компонента, micro-frontend и т.п.
- Контраст с `useTransition`: там разработчик сам вызывает оба `setState`, поэтому может одно обновить сразу, а другое — обернуть в transition. Здесь же значение **приходит как prop** — его смена сама триггерит дорогую операцию, и управлять этим setState нельзя («оказался на принимающем конце бомбы»).

## Как работает

```js
function Results({ query }) {
  const deferredQuery = useDeferredValue(query);
  const filtered = useMemo(
    () => filterPokemon(deferredQuery),
    [deferredQuery]
  );
  // ...
}
```

- `useDeferredValue` возвращает **последнее «известно хорошее» (last known good)** значение, даже если пришло новое, — пока React не дойдёт до низкоприоритетной работы.
- Эффект: `deferredQuery` остаётся старым → **memo не инвалидируется** → дорогая операция не запускается немедленно. Когда Fiber доберётся до low-priority работы, он обновит `deferredQuery` и каскадом запустит фильтрацию.
- Метафора: «придержать у двери» значение, которое вызовет хаос, отдавая пока known-good, а отложенную единицу работы (fiber) React выполнит, когда освободится.

## Индикатор pending без isPending

- У `useDeferredValue` нет `isPending`. Признак «ещё не догнало»:

```js
const isStale = inputQuery !== deferredQuery;
```

- Если актуальное значение не равно отложенному — deferred ещё не догнал urgent, значит идёт ожидание.

## Сравнение и итог раздела

- `useTransition` поддерживает urgent и non-urgent на отдельных дорожках, когда **ты** управляешь setState.
- `useDeferredValue` — «middleman» для значения, которое ты только **получаешь**; кода ещё меньше.
- Эвристика: **предпочитай `useTransition`** почти всегда (~90% случаев, когда владеешь кодом); `useDeferredValue` — для third-party / принимающего конца.
- Несмотря на сложную внутреннюю механику (Fiber, lanes, scheduling), API-поверхность обоих хуков мала.
- Всё рассмотренное в transitions относится к **client-side** рендерингу; впереди остался один класс тем (и пара его вариаций).

## Главное

- `useDeferredValue` для значений, которые ты **получаешь** и не контролируешь их setState; возвращает last-known-good, пока Fiber не дойдёт до low-priority работы.
- Отложенное значение не инвалидирует `useMemo` сразу, поэтому дорогая операция откладывается.
- Pending-состояние определяется сравнением `inputValue !== deferredValue` (нет встроенного `isPending`).
- Правило выбора: владеешь кодом → `useTransition`; на принимающем конце → `useDeferredValue`.
