# Worklets в React Native

> **Актуально для:** React Native 0.82-0.84 / Reanimated 4.x / VisionCamera 4.x

## Оглавление

1. [Что такое Worklet](#1-что-такое-worklet)
2. [Зачем нужны Worklets](#2-зачем-нужны-worklets)
3. [Как работают Worklets под капотом](#3-как-работают-worklets-под-капотом)
4. [SharedValue — мост между потоками](#4-sharedvalue--мост-между-потоками)
5. [Worklets в Reanimated 4](#5-worklets-в-reanimated-4)
6. [CSS Animations vs Worklets (Reanimated 4)](#6-css-animations-vs-worklets-reanimated-4)
7. [Worklets в VisionCamera](#7-worklets-в-visioncamera)
8. [Два пакета worklets](#8-два-пакета-worklets)
9. [Правила и ограничения](#9-правила-и-ограничения)
10. [Отладка Worklets](#10-отладка-worklets)

---

## 1. Что такое Worklet

Worklet — это **JavaScript-функция, которая выполняется не на JS Thread, а на другом потоке** (обычно UI Thread). Помечается директивой `'worklet'`:

```javascript
function moveBox(x) {
  'worklet';
  // Эта функция выполняется на UI Thread, не на JS Thread
  return { transform: [{ translateX: x }] };
}
```

### Ключевая идея

В React Native есть одна проблема: **JS Thread — один**, и он занят React-рендерингом, логикой, навигацией. Если анимация или обработка кадров камеры тоже работает на JS Thread — всё тормозит.

Worklet решает это: код переносится на **UI Thread** (или другой поток), который свободен и не блокируется React-рендерингом.

```
Без Worklets:
  JS Thread: React render + анимация + логика = перегрузка → jank

С Worklets:
  JS Thread: React render + логика
  UI Thread: анимация (worklet)          → 60fps
  Camera Thread: обработка кадров (worklet) → 30fps
```

---

## 2. Зачем нужны Worklets

### Проблема: анимации на JS Thread

```javascript
// Animated API без native driver
// Каждый кадр: JS вычисляет → Bridge → Native обновляет View
// Если JS Thread занят рендерингом — анимация дёргается

onScroll={(e) => {
  // Выполняется на JS Thread
  // Если одновременно идёт setState → кадр пропущен
  const y = e.nativeEvent.contentOffset.y;
  headerOpacity.setValue(1 - y / 100);
}}
```

### Решение: Worklet на UI Thread

```javascript
// Reanimated — worklet на UI Thread
const scrollHandler = useAnimatedScrollHandler({
  onScroll: (event) => {
    'worklet';
    // Выполняется на UI Thread — JS Thread не задействован
    // React может рендерить параллельно — анимация не дёргается
    headerOffset.value = event.contentOffset.y;
  },
});
```

### Где нужны Worklets

| Задача | Без Worklet | С Worklet |
|--------|------------|-----------|
| Анимация при скролле | JS Thread → jank при рендере | UI Thread → 60fps всегда |
| Gesture-driven анимация | Задержка ~16-32ms | Мгновенный отклик |
| Обработка кадров камеры | Невозможно (30fps × сериализация) | UI/Camera Thread → real-time |
| Условная логика в анимации | Только через JS Thread | Прямо в worklet |

---

## 3. Как работают Worklets под капотом

### Компиляция

Worklet — это обычная JS-функция. Babel-плагин `react-native-worklets/plugin` (в Reanimated 4 worklets вынесены в отдельный пакет) при сборке:

1. Находит функции с `'worklet'` директивой
2. **Сериализует** их в строку (вместе с замыканием)
3. Генерирует код для передачи этой строки на UI Thread

```javascript
// Что ты пишешь:
const myWorklet = () => {
  'worklet';
  return Math.random();
};

// Что Babel-плагин генерирует (упрощённо):
const myWorklet = {
  __workletCode: '() => { return Math.random(); }',
  __closure: {},          // захваченные переменные
  __location: 'App.js:5', // для отладки
};
```

### Выполнение

```
1. JS Thread: создаётся worklet-объект (код + замыкание)
        │
        ▼ JSI (прямой вызов C++)
2. C++ Reanimated Runtime: получает worklet-объект
        │
        ▼ Создаёт отдельный JS-контекст (Hermes Runtime) на UI Thread
3. UI Thread Hermes Runtime: eval(workletCode) с замыканием
        │
        ▼ Функция выполняется на UI Thread
4. Результат применяется к View напрямую (без Bridge, без JS Thread)
```

### Три типа Runtime

Библиотека `react-native-worklets` определяет **три типа runtime**:

```
┌─────────────────────┐
│  RN Runtime          │  JS Thread
│  (React Native)      │  - React, бизнес-логика, навигация
│  - единственный с    │  - доступ к React Native API
│    доступом к React  │  - один на приложение
└─────────┬───────────┘
          │ scheduleOnUI / scheduleOnRN
          │ Shareable / Synchronizable
          ▼
┌─────────────────────┐
│  UI Runtime          │  UI Thread (Main Thread)
│  (Worklet Runtime)   │  - анимации, gesture handlers
│  - высокий приоритет │  - синхронные нативные события
│  - один на прилож.   │  - frame-aligned отклик
└─────────┬───────────┘
          │ scheduleOnRuntime
          ▼
┌─────────────────────┐
│  Worker Runtime(s)   │  Отдельные потоки
│  (Worklet Runtime)   │  - тяжёлые вычисления
│  - создаются через   │  - фоновая обработка данных
│    createWorkletRunt │  - может быть несколько
└─────────────────────┘

Каждый runtime — отдельный экземпляр Hermes с изолированной памятью.
Обмен данными — через Shareable / Synchronizable / scheduleOn* API.
```

---

## 4. SharedValue — мост между потоками

`SharedValue` — значение, доступное **одновременно** из JS Thread и UI Thread через JSI shared memory.

### Создание

```javascript
import { useSharedValue } from 'react-native-reanimated';

const offset = useSharedValue(0);
// offset.value доступен из обоих потоков
```

### Чтение и запись

```javascript
// JS Thread — чтение/запись
offset.value = 100;
console.log(offset.value); // 100

// UI Thread (worklet) — чтение/запись
const style = useAnimatedStyle(() => {
  'worklet';
  // Читаем offset.value на UI Thread
  return { transform: [{ translateX: offset.value }] };
});

// Изменение на одном потоке мгновенно видно на другом
// Нет сериализации — JSI shared memory
```

### Как SharedValue работает под капотом

```
JS Thread                          UI Thread
    │                                  │
    │  offset.value = 100              │
    │      │                           │
    │      ▼                           │
    │  JSI: записать в C++ объект      │
    │  (shared memory, без копии)      │
    │      │                           │
    │      └──── тот же C++ объект ────▶│ worklet читает offset.value
    │                                  │ = 100 (мгновенно, без задержки)
```

### Типы SharedValue

```javascript
// Примитивы
const x = useSharedValue(0);             // number
const visible = useSharedValue(true);     // boolean
const name = useSharedValue('hello');     // string

// Объекты (глубокое копирование при записи)
const position = useSharedValue({ x: 0, y: 0 });
position.value = { x: 100, y: 200 }; // новый объект (copy-on-write)

// Массивы
const points = useSharedValue([0, 0, 0]);

// ⚠️ Мутация объекта НЕ триггерит обновление:
position.value.x = 100; // НЕ сработает!
position.value = { ...position.value, x: 100 }; // ✓ правильно
```

---

## 5. Worklets в Reanimated 4

> Reanimated 4 поддерживает **только New Architecture** (Fabric). Worklet runtime вынесен в отдельный пакет `react-native-worklets` (устанавливается автоматически как зависимость Reanimated).

### useAnimatedStyle

Самый частый случай — worklet определяет стили на UI Thread:

```javascript
const offset = useSharedValue(0);

const animatedStyle = useAnimatedStyle(() => {
  // 'worklet' — подразумевается автоматически в useAnimatedStyle
  return {
    transform: [
      { translateX: offset.value },
      { scale: interpolate(offset.value, [0, 100], [1, 0.5]) },
    ],
    opacity: interpolate(offset.value, [0, 100], [1, 0]),
  };
});

// Стиль пересчитывается на UI Thread при каждом изменении offset.value
// JS Thread вообще не задействован
```

### useAnimatedScrollHandler

```javascript
const scrollY = useSharedValue(0);

const scrollHandler = useAnimatedScrollHandler({
  onScroll: (event) => {
    // worklet — UI Thread
    scrollY.value = event.contentOffset.y;
  },
  onBeginDrag: (event) => {
    // worklet — UI Thread
    console.log('drag started'); // ⚠️ console.log работает, но через JSI → JS Thread
  },
});

<Animated.ScrollView onScroll={scrollHandler} />
```

### Gesture Handlers (react-native-gesture-handler)

```javascript
const translateX = useSharedValue(0);
const context = useSharedValue({ startX: 0 });

const panGesture = Gesture.Pan()
  .onStart(() => {
    'worklet';
    context.value = { startX: translateX.value };
  })
  .onUpdate((event) => {
    'worklet';
    translateX.value = context.value.startX + event.translationX;
  })
  .onEnd(() => {
    'worklet';
    // Snap к ближайшей позиции
    translateX.value = withSpring(
      Math.round(translateX.value / 100) * 100
    );
  });
```

### scheduleOnRN — вызов RN Runtime из Worklet

> `runOnJS` deprecated в пользу `scheduleOnRN`

Worklet не может вызывать React-функции (setState, navigation, fetch). Для этого нужен `scheduleOnRN`:

```javascript
import { scheduleOnRN } from 'react-native-worklets';

const [label, setLabel] = useState('');

const gesture = Gesture.Tap()
  .onEnd(() => {
    'worklet';
    // setLabel('tapped'); // ❌ ОШИБКА — setState нельзя из worklet

    scheduleOnRN(setLabel, 'tapped'); // ✓ планирует вызов setLabel на RN Runtime
  });

// Reanimated 4 всё ещё экспортирует runOnJS — он работает, но deprecated
```

### scheduleOnUI — вызов UI Runtime из RN Runtime

> `runOnUI` deprecated в пользу `scheduleOnUI`

```javascript
import { scheduleOnUI } from 'react-native-worklets';

function handlePress() {
  // RN Runtime (JS Thread)
  scheduleOnUI(() => {
    'worklet';
    // Выполнится на UI Runtime (UI Thread)
    offset.value = withSpring(100);
  });
}
```

### Синхронные и асинхронные варианты

```javascript
import {
  scheduleOnUI,       // async, fire-and-forget
  runOnUISync,        // sync, блокирует вызывающий поток, возвращает значение
  runOnUIAsync,       // async, возвращает Promise
  scheduleOnRuntime,  // async на Worker Runtime
  runOnRuntimeSync,   // sync на Worker Runtime
  runOnRuntimeAsync,  // async на Worker Runtime, возвращает Promise
} from 'react-native-worklets';

// Синхронный вызов — получить значение с UI Runtime
const currentX = runOnUISync(() => {
  'worklet';
  return offset.value;
});

// Асинхронный вызов с Promise
const result = await runOnUIAsync(() => {
  'worklet';
  return someCalculation();
});
```

### createWorkletRuntime — создание Worker Runtime

```javascript
import { createWorkletRuntime, scheduleOnRuntime } from 'react-native-worklets';

// Создать новый runtime на отдельном потоке
const worker = createWorkletRuntime({
  name: 'heavy-computation',
  enableEventLoop: true,  // даёт setTimeout, setInterval, requestAnimationFrame
});

// Выполнить worklet на Worker Runtime
scheduleOnRuntime(worker, () => {
  'worklet';
  // Тяжёлые вычисления на отдельном потоке
  // JS Thread и UI Thread свободны
  const result = processLargeDataset(data);
  scheduleOnRN(setResult, result);
});
```

### Условная логика в Worklet

Одно из главных преимуществ над Animated API с `useNativeDriver`:

```javascript
const animatedStyle = useAnimatedStyle(() => {
  'worklet';

  // Условия, циклы, Math — всё работает на UI Thread
  if (offset.value > 200) {
    return { backgroundColor: 'red' };
  }

  const clamped = Math.min(Math.max(offset.value, 0), 300);
  const progress = clamped / 300;

  return {
    backgroundColor: interpolateColor(progress, [0, 1], ['blue', 'green']),
    borderRadius: progress * 20,
  };
});

// Animated API с useNativeDriver: нельзя — условия только на JS Thread
// Reanimated worklet: можно — условия выполняются на UI Thread
```

---

## 6. CSS Animations vs Worklets (Reanimated 4)

Reanimated 4 добавил **CSS Animations & Transitions API** — декларативный способ анимировать без worklets:

### CSS Transitions

```javascript
import Animated, { CSSTransition } from 'react-native-reanimated';

function FadeBox({ visible }) {
  return (
    <Animated.View
      style={[
        styles.box,
        {
          opacity: visible ? 1 : 0,
          transform: [{ scale: visible ? 1 : 0.8 }],
        },
        CSSTransition.create({
          property: ['opacity', 'transform'],
          duration: 300,
          timingFunction: 'ease-in-out',
        }),
      ]}
    />
  );
}

// Нет SharedValue, нет worklet, нет 'worklet' директивы
// Просто меняешь стиль через state — анимация автоматическая
```

### CSS Keyframe Animations

```javascript
import Animated, { CSSKeyframes } from 'react-native-reanimated';

const bounce = CSSKeyframes.create({
  '0%':   { transform: [{ translateY: 0 }] },
  '50%':  { transform: [{ translateY: -30 }] },
  '100%': { transform: [{ translateY: 0 }] },
});

<Animated.View
  style={[
    styles.ball,
    {
      animationName: bounce,
      animationDuration: 600,
      animationIterationCount: 'infinite',
    },
  ]}
/>
```

### Когда CSS Animations, когда Worklets

| Сценарий | CSS Animations | Worklets |
|----------|---------------|----------|
| Fade in/out по state | CSS Transition | Избыточно |
| Зацикленная анимация | CSS Keyframes | Избыточно |
| Анимация при скролле | Нет | **Worklet** (useAnimatedScrollHandler) |
| Gesture-driven (drag, swipe) | Нет | **Worklet** (Gesture + SharedValue) |
| Условная логика в анимации | Нет | **Worklet** (if/else на UI Thread) |
| Обработка кадров камеры | Нет | **Worklet** (VisionCamera) |
| Shared Element переходы | Нет | **Worklet** |

**Правило:** если анимация зависит от state → CSS. Если от жестов, скролла, кадров — worklets.

---

## 7. Worklets в VisionCamera

VisionCamera использует worklets для **обработки каждого кадра камеры** в реальном времени:

```javascript
import { useFrameProcessor } from 'react-native-vision-camera';

const frameProcessor = useFrameProcessor((frame) => {
  'worklet';

  // frame — JSI Host Object (ссылка на C++ буфер, не копия)
  // Выполняется на Camera Thread (~30fps)

  // Размеры кадра
  const { width, height } = frame;

  // Вызов нативного плагина (C++ → C++, без Bridge)
  const faces = detectFaces(frame);

  if (faces.length > 0) {
    // Передать результат на JS Thread
    runOnJS(setFaceCount)(faces.length);
  }
}, []);

<Camera frameProcessor={frameProcessor} />
```

### Почему без Worklet камера не работает

```
Без Worklet (Bridge):
  Кадр (8MB) → JSON.stringify (невозможно) → Bridge → JS Thread
  30fps × 8MB = 240MB/sec через JSON = физически нереально

С Worklet (JSI):
  Кадр → JSI Host Object (ссылка, 0 копий) → Camera Thread Worklet
  Worklet получает ССЫЛКУ на буфер в C++ памяти
  Обработка на Camera Thread, JS Thread свободен
```

---

## 8. Два пакета worklets

В экосистеме React Native существуют **два разных пакета** с похожими названиями:

### react-native-worklets (Software Mansion)

```
Автор: Software Mansion (авторы Reanimated)
Версия: 0.8.x
Назначение: worklet runtime, извлечённый из Reanimated 4
Babel-плагин: react-native-worklets/plugin
Зависимость: устанавливается автоматически с Reanimated 4
```

В Reanimated 4 worklet runtime **вынесен** в отдельный пакет. Это позволяет другим библиотекам использовать тот же worklet runtime без зависимости от Reanimated целиком.

### react-native-worklets-core (Margelo)

```
Автор: Margelo (Marc Rousavy, автор VisionCamera)
Версия: 1.6.x
Назначение: standalone worklet runner, независимый от Reanimated
Используется: VisionCamera, react-native-skia
```

```javascript
import { Worklets } from 'react-native-worklets-core';

// Создание worklet-контекста на произвольном потоке
const context = Worklets.createContext('myWorker');

const heavyWork = Worklets.createRunOnContextFn((data) => {
  'worklet';
  // Выполняется на background thread (не JS, не UI)
  let result = 0;
  for (let i = 0; i < data.length; i++) {
    result += data[i] * Math.sin(data[i]);
  }
  return result;
}, context);

const result = await heavyWork([1, 2, 3, 4, 5]);
```

### Разница

| Аспект | react-native-worklets (SWM) | react-native-worklets-core (Margelo) |
|--------|----------------------------|--------------------------------------|
| Автор | Software Mansion | Margelo |
| Связь с Reanimated | Внутренняя зависимость | Независимый |
| Babel-плагин | Да (`react-native-worklets/plugin`) | Свой |
| Произвольные потоки | **Да** (createWorkletRuntime) | **Да** (createContext) |
| VisionCamera | Нет | Да (peer dependency) |
| Когда использовать | С Reanimated 4 (автоматически) | Без Reanimated, для камеры/вычислений |

Если используешь Reanimated 4 — `react-native-worklets` уже есть. Если нужны worklets без Reanimated (VisionCamera, тяжёлые вычисления) — `react-native-worklets-core`.

---

## 9. Правила и ограничения

### Что можно в Worklet

```javascript
const myWorklet = () => {
  'worklet';

  // ✓ Математика
  const x = Math.sin(0.5) * 100;

  // ✓ Условия и циклы
  if (x > 50) { /* ... */ }
  for (let i = 0; i < 10; i++) { /* ... */ }

  // ✓ SharedValues
  offset.value = x;

  // ✓ Другие worklet-функции
  const result = anotherWorklet(x);

  // ✓ Reanimated утилиты (interpolate, withSpring, withTiming, ...)
  offset.value = withSpring(100);

  // ✓ Примитивные значения из замыкания (копируются)
  const threshold = 50; // ← захватывается из внешнего scope
};
```

### Что нельзя в Worklet

```javascript
const myWorklet = () => {
  'worklet';

  // ❌ React state
  setState(value);              // → используй scheduleOnRN(setState, value)

  // ❌ React hooks
  useState(0);                  // hooks работают только в компонентах на JS Thread

  // ❌ Fetch / async операции
  await fetch('...');           // → scheduleOnRN

  // ⚠️ console.log работает (каждый runtime имеет свой console),
  //    но может замедлить анимацию при вызове каждый кадр
  console.log('debug');         // лучше использовать __DEV__ && console.log

  // ❌ Навигация
  navigation.navigate('Home');  // → scheduleOnRN

  // ❌ Доступ к DOM / NativeModules
  NativeModules.Camera.take();  // → scheduleOnRN

  // ❌ Импорты, которые не помечены как worklet
  import { someUtil } from './utils'; // если someUtil не worklet — ошибка
};
```

### Замыкания в Worklets

Поведение замыканий **зависит от того, на каком runtime выполняется worklet**:

```javascript
// ВНУТРИ одного runtime: замыкание захватывает ССЫЛКУ
let counter = 0;
const increment = () => {
  'worklet';
  counter++; // ← если вызван на том же runtime — мутирует оригинал
};

// МЕЖДУ разными runtimes: замыкание — КОПИЯ на момент вызова
// Мутации НЕ распространяются между runtime-ами
```

```javascript
const THRESHOLD = 100;        // ✓ примитив — копируется при кросс-runtime вызове
const config = { max: 200 };  // ✓ объект — копируется (snapshot на момент вызова)
const ref = useRef(null);     // ❌ ref — нельзя передать между runtimes

const animatedStyle = useAnimatedStyle(() => {
  'worklet';
  // Выполняется на UI Runtime (другой runtime)
  // THRESHOLD = 100 (скопирован)
  // config = { max: 200 } (скопирован, изменения из RN Runtime не видны!)

  if (offset.value > THRESHOLD) {
    return { opacity: 0 };
  }
  return { opacity: 1 };
});
```

### Глобальные переменные

Каждый Worklet Runtime имеет **свой собственный** `global`. Глобальные переменные НЕ разделяются между рантаймами:

```javascript
// RN Runtime
global.myFlag = true;

scheduleOnUI(() => {
  'worklet';
  console.log(global.myFlag); // undefined — другой global!
});
```

### Частая ошибка: объект из замыкания

```javascript
const [data, setData] = useState({ count: 0 });

const style = useAnimatedStyle(() => {
  'worklet';
  // ⚠️ data скопирован на момент вызова worklet (кросс-runtime)
  // Если setData обновит data — worklet НЕ увидит изменение
  return { opacity: data.count > 5 ? 0 : 1 };
});

// ✓ Правильно:
const count = useSharedValue(0);
const style = useAnimatedStyle(() => {
  'worklet';
  return { opacity: count.value > 5 ? 0 : 1 };
  // count.value — SharedValue (Shareable), изменения видны мгновенно
});
```

---

## 10. Отладка Worklets

### console.log

Каждый Worklet Runtime имеет свой объект `console`. Логи работают, но в dev-режиме необработанные ошибки автоматически перехватываются и показываются в LogBox:

```javascript
const style = useAnimatedStyle(() => {
  'worklet';
  // console.log работает на UI Runtime (свой console)
  // Может замедлить анимацию если вызывается каждый кадр
  if (__DEV__) {
    console.log('offset:', offset.value);
  }
  return { transform: [{ translateX: offset.value }] };
});
```

### Ошибки

Ошибка в worklet показывается как обычная JS-ошибка, но с пометкой потока:

```
Error: undefined is not a function
    at worklet (App.js:42)
    at <UIThread>          ← указание что ошибка на UI Thread
```

### Babel-плагин

Worklets не работают без Babel-плагина. Проверь `babel.config.js`:

```javascript
// Reanimated 4 — плагин переехал в react-native-worklets
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-worklets/plugin', // ОБЯЗАТЕЛЬНО последним!
  ],
};

// Reanimated 3 (legacy) — старый путь
// plugins: ['react-native-reanimated/plugin']
// Всё ещё работает в Reanimated 4 (re-export), но deprecated
```

Если плагин не подключён — `'worklet'` директива игнорируется, функция выполняется на JS Thread, и всё "работает", но без преимуществ.

### Определение текущего runtime

```javascript
import {
  isRNRuntime,
  isUIRuntime,
  isWorkerRuntime,
  getRuntimeKind,
} from 'react-native-worklets';

// В worklet:
function debugRuntime() {
  'worklet';
  if (isUIRuntime()) {
    console.log('UI Runtime');
  } else if (isWorkerRuntime()) {
    console.log('Worker Runtime');
  }
}

// Заменяет deprecated глобальную переменную _WORKLET
```

### Тестирование

```javascript
// jest.config.js — мок для unit-тестов
jest.mock('react-native-worklets', () =>
  require('react-native-worklets/src/mock')
);

// Или использовать web-реализацию (v0.8.x+):
// jest.config.js
module.exports = {
  resolver: 'react-native-worklets/jest/resolver',
};
```
