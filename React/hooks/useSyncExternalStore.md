# useSyncExternalStore — подписка на внешние хранилища

## Оглавление

1. [Назначение](#назначение)
2. [Сигнатура](#сигнатура)
3. [Проблема tearing](#проблема-tearing)
4. [Примеры использования](#примеры-использования)
5. [Почему не useState + useEffect](#почему-не-usestate--useeffect)
6. [Мемоизация getSnapshot](#мемоизация-getsnapshot)

---

## Назначение

`useSyncExternalStore` обеспечивает безопасную подписку на данные, хранящиеся **вне React** (Redux, Zustand, browser API, кастомные store). Гарантирует консистентность UI при Concurrent Rendering.

---

## Сигнатура

```jsx
const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)
```

| Параметр | Описание |
|---|---|
| `subscribe(callback)` | Функция подписки. Вызывает `callback` при изменении данных. Возвращает функцию отписки. |
| `getSnapshot()` | Возвращает текущее значение. Должна возвращать **тот же объект** (по ===), если данные не изменились. |
| `getServerSnapshot?()` | Значение для SSR (вызывается на сервере и при hydration). |
| **Возвращает** | Текущий snapshot данных |

---

## Проблема tearing

В Concurrent Mode React может прерывать рендер. Если между частями рендера внешний store изменится, разные компоненты покажут **разные версии данных** — это tearing (разрыв).

`useSyncExternalStore` решает это, гарантируя синхронный повторный рендер при изменении store.

---

## Примеры использования

### Подписка на browser API

```jsx
import { useSyncExternalStore } from 'react';

function useOnlineStatus() {
  return useSyncExternalStore(
    (callback) => {
      window.addEventListener('online', callback);
      window.addEventListener('offline', callback);
      return () => {
        window.removeEventListener('online', callback);
        window.removeEventListener('offline', callback);
      };
    },
    () => navigator.onLine,     // client
    () => true                   // server (assume online)
  );
}

function StatusBar() {
  const isOnline = useOnlineStatus();
  return <span>{isOnline ? '🟢 Online' : '🔴 Offline'}</span>;
}
```

### Подписка на matchMedia

```jsx
function useMediaQuery(query) {
  return useSyncExternalStore(
    (callback) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', callback);
      return () => mql.removeEventListener('change', callback);
    },
    () => window.matchMedia(query).matches,
    () => false // server fallback
  );
}

function App() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}
```

### Подписка на Redux store

```jsx
import { useSyncExternalStore } from 'react';
import { store } from './store';

function useSelector(selector) {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.getState()),
  );
}

function Counter() {
  const count = useSelector(state => state.counter.value);
  return <span>{count}</span>;
}
```

---

## Почему не useState + useEffect

```jsx
// ❌ Проблемный подход — не safe при Concurrent Rendering
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handler = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);
    return () => {
      window.removeEventListener('online', handler);
      window.removeEventListener('offline', handler);
    };
  }, []);
  return isOnline;
  // Проблема: между рендером и эффектом значение может измениться → tearing
}

// ✅ useSyncExternalStore гарантирует синхронность
```

---

## Мемоизация getSnapshot

`getSnapshot` вызывается при каждом рендере. Если она возвращает новый объект каждый раз — бесконечный ререндер:

```jsx
// ❌ Новый объект каждый вызов → бесконечный цикл
const data = useSyncExternalStore(subscribe, () => ({
  width: window.innerWidth,
  height: window.innerHeight,
}));

// ✅ Кэшировать объект, обновлять только при изменении
let cachedSize = { width: 0, height: 0 };
function getSnapshot() {
  const w = window.innerWidth, h = window.innerHeight;
  if (w !== cachedSize.width || h !== cachedSize.height) {
    cachedSize = { width: w, height: h };
  }
  return cachedSize;
}
```
