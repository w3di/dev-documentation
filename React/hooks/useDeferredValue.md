# useDeferredValue — откладывание обновления значения для отзывчивого UI

`useDeferredValue` — это хук React, позволяющий **отложить обновление части интерфейса**, сохраняя отзывчивость для срочных взаимодействий. Хук принимает значение и возвращает его «отложенную» копию: при обновлении входного значения React сначала выполнит рендер со **старым** отложенным значением (обеспечивая мгновенный отклик), а затем запустит фоновый ре-рендер с новым значением. Если за время фонового рендера поступит новое обновление, React прервёт текущий фоновый рендер и начнёт заново с актуальным значением.

## Оглавление

1. [Что такое useDeferredValue](#1-что-такое-usedeferredvalue)
2. [Сигнатура хука](#2-сигнатура-хука)
3. [Как работает: механизм отложенного рендеринга](#3-как-работает-механизм-отложенного-рендеринга)
4. [Поисковая строка с debounce-подобным поведением](#4-поисковая-строка-с-debounce-подобным-поведением)
5. [Отложенный рендеринг тяжёлого компонента](#5-отложенный-рендеринг-тяжёлого-компонента)
6. [Связь с Concurrent Mode и Suspense](#6-связь-с-concurrent-mode-и-suspense)
7. [useDeferredValue vs useTransition](#7-usedeferredvalue-vs-usetransition)
8. [useDeferredValue vs debounce/throttle](#8-usedeferredvalue-vs-debouncethrottle)
9. [initialValue — начальное значение при первом рендере (React 19)](#9-initialvalue--начальное-значение-при-первом-рендере-react-19)

---

## 1. Что такое useDeferredValue

В архитектуре Concurrent React обновления разделены на срочные и несрочные. `useDeferredValue` позволяет пометить **конкретное значение** как несрочное: React отобразит интерфейс с предыдущей версией этого значения, пока в фоне подготавливает рендер с обновлённой версией.

Концептуально `useDeferredValue` можно представить как механизм, который говорит React: «Можешь показать старое значение, пока вычисляешь рендер с новым. Если приходит ещё более свежее значение — брось текущие вычисления и начни с него.»

```jsx
import { useState, useDeferredValue } from 'react';

function SearchResults({ query }) {
  // query обновляется мгновенно при вводе
  // deferredQuery «отстаёт» — обновляется, когда React закончит фоновый рендер
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  return (
    <div style={{ opacity: isStale ? 0.6 : 1 }}>
      <HeavyResultsList query={deferredQuery} />
    </div>
  );
}
```

## 2. Сигнатура хука

```jsx
const deferredValue = useDeferredValue(value, initialValue?)
```

**Параметры:**

- **`value`** — значение, которое необходимо отложить. Может быть любого типа: примитив, объект, массив. При передаче объекта рекомендуется, чтобы он создавался вне компонента или был мемоизирован — иначе новая ссылка на каждом рендере будет провоцировать бесполезные фоновые ре-рендеры.
- **`initialValue`** (необязательный, React 19+) — начальное значение, используемое при первом рендере компонента. Если передано, `deferredValue` будет равно `initialValue` при монтировании, а затем запустится фоновый ре-рендер с актуальным `value`.

**Возвращаемое значение:**

- **`deferredValue`** — при первом рендере равно `initialValue` (если передано) или `value`. При последующих обновлениях React сначала рендерит со старым значением, затем запускает фоновый ре-рендер с новым.

**Предостережения:**

- Передавайте примитивные значения (строки, числа) или объекты, созданные вне рендера. Новый объект, создаваемый при каждом рендере и передаваемый в `useDeferredValue`, вызовет лишние фоновые ре-рендеры.
- `useDeferredValue` интегрирован с `Suspense`: если фоновый рендер приостанавливается (suspend), пользователь продолжит видеть старое значение до готовности нового.

## 3. Как работает: механизм отложенного рендеринга

Внутренний механизм `useDeferredValue` основан на системе приоритетов (Lanes) Concurrent React:

```
Обновление value (срочный приоритет)
       │
       ▼
React рендерит компонент с deferredValue = старое значение
       │
       ▼
Браузер отрисовывает кадр (пользователь видит мгновенную реакцию)
       │
       ▼
React запускает фоновый ре-рендер с deferredValue = новое значение
       │
       ├── Если поступает новое обновление value → прерывает фоновый рендер
       │                                           и начинает заново
       │
       └── Если рендер завершён → применяет результат, deferredValue = новое значение
```

Ключевое отличие от `setTimeout` или `debounce`: задержка **адаптивна**. На мощном устройстве фоновый рендер завершится быстро, и задержка будет незаметна. На слабом устройстве задержка увеличится, но UI останется отзывчивым.

```jsx
function TypeaheadSearch() {
  const [text, setText] = useState('');
  const deferredText = useDeferredValue(text);

  // text обновляется синхронно — ввод остаётся отзывчивым
  // deferredText обновляется в фоне — тяжёлый список не блокирует ввод
  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} />
      <SuggestionsList query={deferredText} />
    </div>
  );
}
```

## 4. Поисковая строка с debounce-подобным поведением

Типичный сценарий: пользователь вводит текст, и по мере ввода отображаются отфильтрованные результаты. Без оптимизации каждый символ вызывает полный ре-рендер тяжёлого списка.

```jsx
import { useState, useDeferredValue, useMemo, memo } from 'react';

const PRODUCTS = Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  name: `Продукт #${i}: ${['Ноутбук', 'Телефон', 'Планшет', 'Монитор'][i % 4]}`,
  price: Math.floor(Math.random() * 100000),
}));

function ProductSearch() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  const filteredProducts = useMemo(() => {
    if (!deferredQuery) return PRODUCTS.slice(0, 100);
    return PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(deferredQuery.toLowerCase())
    );
  }, [deferredQuery]);

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Поиск продуктов..."
      />
      <div style={{
        opacity: isStale ? 0.5 : 1,
        transition: 'opacity 150ms',
      }}>
        <ProductList products={filteredProducts} />
      </div>
    </div>
  );
}

const ProductList = memo(function ProductList({ products }) {
  return (
    <ul>
      {products.map(p => (
        <li key={p.id}>{p.name} — {p.price} ₽</li>
      ))}
    </ul>
  );
});
```

Критически важно, что `ProductList` обёрнут в `memo`. Без мемоизации компонент будет перерисовываться при каждом рендере родителя, нивелируя эффект `useDeferredValue`. Мемоизация гарантирует, что `ProductList` пропустит ре-рендер, когда `deferredQuery` не изменился.

## 5. Отложенный рендеринг тяжёлого компонента

```jsx
import { useState, useDeferredValue, memo } from 'react';

function Dashboard() {
  const [filters, setFilters] = useState({
    dateRange: 'month',
    category: 'all',
    region: 'all',
  });

  const deferredFilters = useDeferredValue(filters);
  const isStale = filters !== deferredFilters;

  return (
    <div>
      <FilterPanel
        filters={filters}
        onChange={setFilters}
      />

      {isStale && <ProgressBar />}

      <div style={{ opacity: isStale ? 0.4 : 1 }}>
        <HeavyCharts filters={deferredFilters} />
      </div>
    </div>
  );
}

const HeavyCharts = memo(function HeavyCharts({ filters }) {
  // Рендер 12 графиков с тысячами точек данных
  return (
    <div className="charts-grid">
      <RevenueChart dateRange={filters.dateRange} />
      <ConversionChart category={filters.category} />
      <GeoMap region={filters.region} />
      {/* ... ещё 9 графиков */}
    </div>
  );
});
```

**Антипаттерн — передача нового объекта каждый рендер:**

```jsx
// НЕПРАВИЛЬНО: новый объект на каждом рендере
const deferredValue = useDeferredValue({ query, page });
// React будет запускать бесполезные фоновые ре-рендеры,
// потому что ссылка на объект всегда новая

// ПРАВИЛЬНО: передавайте примитивы или мемоизированные объекты
const deferredQuery = useDeferredValue(query);
const deferredPage = useDeferredValue(page);

// Или мемоизируйте объект
const params = useMemo(() => ({ query, page }), [query, page]);
const deferredParams = useDeferredValue(params);
```

## 6. Связь с Concurrent Mode и Suspense

`useDeferredValue` глубоко интегрирован с `Suspense`. Когда компонент, рендерящийся с отложенным значением, приостанавливается (throws a Promise), React не показывает fallback Suspense-границы. Вместо этого он продолжает отображать предыдущее значение, пока данные не будут загружены.

```jsx
import { Suspense, useState, useDeferredValue } from 'react';

function ArtistPage({ artistId }) {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <Suspense fallback={<AlbumsGlimmer />}>
        <SearchResults query={deferredQuery} />
      </Suspense>
    </div>
  );
}

// SearchResults использует use() или data-fetching с Suspense
function SearchResults({ query }) {
  const albums = use(fetchAlbums(query));
  return (
    <ul>
      {albums.map(album => (
        <li key={album.id}>{album.title}</li>
      ))}
    </ul>
  );
}
```

В данном примере при вводе текста:

1. React мгновенно обновляет `<input>` (срочное обновление).
2. Пытается рендерить `SearchResults` с новым `deferredQuery` в фоне.
3. Если `fetchAlbums` ещё не завершён — показывает результаты с предыдущим `deferredQuery`.
4. Когда данные готовы — обновляет `SearchResults` без мерцания fallback.

## 7. useDeferredValue vs useTransition

| Критерий | `useDeferredValue` | `useTransition` |
|---|---|---|
| Контроль | Откладывает **значение** | Откладывает **обновление состояния** |
| isPending | Нет (сравнивайте `value !== deferredValue`) | Да, встроенный флаг |
| Где применять | Значение приходит как prop, нет доступа к setState | Вы контролируете setState |
| Код вызова | `useDeferredValue(value)` | `startTransition(() => setState(...))` |
| Типичный кейс | Дочерний компонент получает prop | Родительский компонент обновляет состояние |
| Мемоизация | Требуется `memo` на дочернем компоненте | Не обязательна |

**Когда что использовать:**

```jsx
// useDeferredValue — когда не контролируете источник обновления
function ChildComponent({ searchQuery }) {
  const deferredQuery = useDeferredValue(searchQuery);
  // searchQuery приходит как prop — нет доступа к setState
  return <HeavyList query={deferredQuery} />;
}

// useTransition — когда контролируете setState
function ParentComponent() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleChange = (value) => {
    setQuery(value); // срочное
    startTransition(() => {
      setFilteredResults(filterData(value)); // несрочное
    });
  };
}
```

## 8. useDeferredValue vs debounce/throttle

| Характеристика | `useDeferredValue` | `debounce` | `throttle` |
|---|---|---|---|
| Задержка | Адаптивная (зависит от устройства) | Фиксированная | Фиксированная |
| Прерываемость | Да (React прерывает фоновый рендер) | Нет | Нет |
| Интеграция с React | Встроена (Concurrent Features) | Внешняя утилита | Внешняя утилита |
| Промежуточные рендеры | Пропускаются React | Не вызываются (таймер) | Вызываются с интервалом |
| SSR-совместимость | Полная | Полная | Полная |
| Suspense-интеграция | Да | Нет | Нет |
| Работает с | Фазой рендеринга | Фазой обработки событий | Фазой обработки событий |

```jsx
// debounce — откладывает ВЫЗОВ setState (событие)
const debouncedSearch = useMemo(
  () => debounce((value) => setResults(search(value)), 300),
  []
);
const handleChange = (e) => {
  setQuery(e.target.value);
  debouncedSearch(e.target.value);
};

// useDeferredValue — откладывает РЕНДЕР с новым значением
function SearchResults({ query }) {
  const deferredQuery = useDeferredValue(query);
  // React сам решает, когда обновить deferredQuery
}
```

Ключевое различие: `debounce` откладывает **вызов функции** на фиксированное время — 300мс задержки на мощном компьютере ощущается излишней, а на слабом устройстве может быть недостаточной. `useDeferredValue` не добавляет искусственную задержку — React обновляет отложенное значение, как только завершит все срочные обновления и фоновый рендер.

## 9. initialValue — начальное значение при первом рендере (React 19)

React 19 добавляет необязательный второй аргумент `initialValue`, позволяющий указать значение, которое `useDeferredValue` вернёт при первом рендере компонента. При монтировании хук вернёт `initialValue`, после чего запустит фоновый ре-рендер с актуальным `value`.

```jsx
const deferredValue = useDeferredValue(value, initialValue);
```

Это полезно для оптимизации начальной загрузки: компонент может быстро отрендериться с лёгким начальным значением, а затем в фоне подготовить рендер с полными данными.

```jsx
function HeavyComponent({ items }) {
  // При монтировании: deferredItems = [] (мгновенный рендер)
  // Затем фоновый ре-рендер: deferredItems = items (полные данные)
  const deferredItems = useDeferredValue(items, []);

  return (
    <div>
      {deferredItems.length === 0 ? (
        <Placeholder />
      ) : (
        <ComplexVisualization data={deferredItems} />
      )}
    </div>
  );
}
```

Без `initialValue` первый рендер выполнялся бы с полным массивом `items`, что могло бы замедлить монтирование. С `initialValue: []` компонент мгновенно отобразит `<Placeholder />`, а затем в фоне подготовит тяжёлую визуализацию.

```jsx
// Пример с Suspense: показываем fallback только при первой загрузке
function UserProfile({ userId }) {
  const data = use(fetchUserProfile(userId));
  const deferredData = useDeferredValue(data, null);

  if (deferredData === null) {
    return <ProfileSkeleton />;
  }

  return (
    <div>
      <Avatar src={deferredData.avatar} />
      <h1>{deferredData.name}</h1>
      <HeavyActivityFeed activities={deferredData.activities} />
    </div>
  );
}
```

**Ограничения `initialValue`:**

- Работает только при первом рендере компонента. При последующих обновлениях `initialValue` игнорируется.
- Если `initialValue` совпадает с `value`, фоновый ре-рендер не запускается.
- При использовании `initialValue` компонент всегда рендерится дважды при монтировании: один раз с `initialValue`, затем в фоне с `value`.
