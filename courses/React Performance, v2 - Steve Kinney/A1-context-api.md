# Context API — раздел Context (архивный курс v1)

> Дополнение из старого курса React Performance (archive). Покрывает тему, которой нет в v2.

## Проблема, которую решает Context

- После предыдущих оптимизаций (memoization, push state down) элементы списка больше не ре-рендерятся, но `dispatch` / `setItems` приходится **пробрасывать через промежуточные компоненты** (`ItemList`), которым он не нужен.
- Сам по себе это **не** performance-проблема (значение то же каждый раз, сравнение дешёвое), но в большом дереве (на 38 уровней вглубь) prop drilling невыносим для поддержки.
- `dispatch` и `setItems` взаимозаменяемы: оба дают те же performance-гейны; разница лишь в импортах action creators.

## Что такое Context API

- **Context API** — «секретный prop», доступный всем потомкам дерева: любой из них может «зацепиться» (`useContext`) и достать положенные туда значения, минуя ручной проброс props на каждом уровне.
- Цель — productivity и maintainability, а не performance ради performance (не оптимизировать то, что неважно, ради удобства команды).

## Реализация (танец из createContext)

```js
const ItemsContext = createContext();

export function ItemsProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, initialItems);
  return (
    <ItemsContext.Provider value={{ items, dispatch }}>
      {children}
    </ItemsContext.Provider>
  );
}
```

- **Частая ошибка:** забыть обернуть `App` в `ItemsProvider` — приложение «не работает».
- Не забыть **export** контекста.
- Потребление: `const { items, dispatch } = useContext(ItemsContext);` — позволяет удалить проброс props через `ItemList` и отдельные `item`.

## Ловушка: Context ломает memoization

- После перехода на Context **все performance-гейны пропадают** — всё снова ре-рендерится (всё «в цвете» в профайлере).
- Причина — те самые «2.5 причины ре-рендера»:
  1. state changes (но `useMemo` их останавливал — и они на месте);
  2. **props changed** — а **context это и есть скрытый prop**.
- `value={{ items, dispatch }}` создаёт **новый объект на каждом рендере** → потребители видят изменившийся «prop» → `React.memo`-проверки обесцениваются.

## Главное

- Context API убирает prop drilling: «скрытый prop», доступный всем потомкам через `useContext` — выигрыш в maintainability.
- Не забывать обернуть приложение в Provider и экспортировать контекст.
- Расплата: `value={{...}}` — новый объект каждый рендер, считается изменившимся prop'ом и ломает всю memoization (решение — в следующей части).
