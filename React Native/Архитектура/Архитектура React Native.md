# Архитектура React Native: полное руководство

## Оглавление

1. [Обзор архитектуры](#1-обзор-архитектуры)
2. [Старая архитектура (Bridge)](#2-старая-архитектура-bridge)
3. [JavaScript Interface (JSI)](#3-javascript-interface-jsi)
4. [Fabric](#4-fabric)
5. [Turbo Native Modules](#5-turbo-native-modules)
6. [Codegen](#6-codegen)
7. [Yoga Layout Engine](#7-yoga-layout-engine)
8. [Concurrent Renderer](#8-concurrent-renderer)
9. [Сравнительная таблица](#9-сравнительная-таблица)
10. [Диаграммы потоков данных](#10-диаграммы-потоков-данных)

---

## 1. Обзор архитектуры

React Native — это фреймворк, который рендерит **реальные нативные компоненты** платформы (`UIView` на iOS, `android.view.View` на Android), в отличие от гибридных решений на базе `WebView` (Cordova, Ionic).

### Ключевая идея

JavaScript описывает **что** должно быть на экране, а нативная часть решает **как** это отрисовать. React Native выступает мостом между этими двумя мирами.

```
┌─────────────────────────────────────────┐
│            JavaScript (Hermes)           │
│  React компоненты → Virtual DOM → Diff  │
└──────────────────┬──────────────────────┘
                   │
          JSI (C++ прослойка)
                   │
┌──────────────────▼──────────────────────┐
│           Native Platform               │
│  iOS: UIKit / SwiftUI                   │
│  Android: Android Views / Jetpack       │
└─────────────────────────────────────────┘
```

### Отличие от других подходов

| Подход | Рендеринг | Примеры |
|--------|-----------|---------|
| **WebView-based** | HTML/CSS в WebView | Cordova, Ionic |
| **Custom rendering** | Собственный рендер-движок (Skia) | Flutter |
| **Native bridge** | Нативные компоненты платформы | React Native |

React Native `<View>` на iOS превращается в `UIView`, `<Text>` — в `UITextView`, `<Image>` — в `UIImageView`. На Android — `android.view.View`, `TextView`, `ImageView` соответственно.

---

## 2. Старая архитектура (Bridge)

> Старая архитектура использовалась до версии 0.76. Новая архитектура включена **по умолчанию** с v0.76.

### 2.1 Три потока

Старая архитектура работала на трёх потоках:

1. **JS Thread** — выполняет JavaScript (бизнес-логика, React reconciliation)
2. **UI Thread (Main Thread)** — отрисовывает нативные компоненты, обрабатывает касания
3. **Shadow Thread** — рассчитывает layout через Yoga

### 2.2 Как работал Bridge

Bridge — это **асинхронная очередь сообщений** между JS и Native. Все данные сериализовались в JSON:

```
JS Thread                    Bridge                    Native Thread
    │                          │                            │
    │  JSON.stringify({        │                            │
    │    module: "UIManager",  │                            │
    │    method: "createView", │                            │
    │    args: [...]           │                            │
    │  })                      │                            │
    │ ─────────────────────▶   │                            │
    │                          │  JSON.parse() ──────────▶  │
    │                          │                            │
    │                          │  ◀────── JSON.stringify()  │
    │  ◀─────────────────────  │                            │
    │  JSON.parse()            │                            │
```

Каждое сообщение проходило через:
1. Сериализация в JSON на стороне отправителя
2. Передача через `BatchedBridge` (группировка сообщений для уменьшения overhead)
3. Десериализация на стороне получателя

### 2.3 Алгоритм первого запуска (старая архитектура)

1. **Native Thread** запускается системой, загружает нативные модули
2. Инициализируется **JS Thread**, загружается JS Bundle
3. JS Thread отправляет сериализованное JSON-сообщение через Bridge в Native Thread
4. Native Thread передаёт данные в **Shadow Thread**
5. Shadow Thread строит UI Tree, рассчитывает layout через **Yoga**
6. Shadow Thread передаёт результат в Native Thread
7. Native Thread отрисовывает нативные компоненты

### 2.4 Проблемы Bridge

1. **Асинхронность** — все вызовы асинхронны, невозможно синхронно измерить layout
2. **Сериализация** — JSON.stringify/parse на каждое сообщение, overhead при активном UI
3. **Перегрузка очереди** — при частых обновлениях (жесты, скролл) Bridge становится bottleneck
4. **Нет concurrent rendering** — невозможно поддержать React 18+ фичи (Suspense, Transitions)
5. **Eager инициализация** — все нативные модули загружались при старте, увеличивая TTI

```
// Типичная проблема: жест скролла генерирует сотни событий
// Каждое событие → JSON.stringify → Bridge → JSON.parse
// При перегрузке — видимые лаги и пропуск кадров
onScroll={(event) => {
  // Это сообщение проходит через Bridge для КАЖДОГО кадра скролла
  const offsetY = event.nativeEvent.contentOffset.y;
  // Ещё одно сообщение обратно для обновления UI
  setScrollPosition(offsetY);
}}
```

---

## 3. JavaScript Interface (JSI)

JSI — это **C++ прослойка**, которая заменяет асинхронный Bridge. Это фундамент новой архитектуры.

### 3.1 Что такое JSI

`JSI` (JavaScript Interface) — это lightweight C++ API, позволяющий JavaScript коду **напрямую** вызывать C++ функции и наоборот, **без сериализации**.

```cpp
// C++ сторона — регистрация host object
runtime.global().setProperty(
  runtime,
  "nativeStorage",
  jsi::Object::createFromHostObject(runtime, std::make_shared<NativeStorage>())
);
```

```js
// JS сторона — прямой вызов, никакой сериализации
const value = global.nativeStorage.getString("key");
// ↑ Это синхронный вызов C++ метода напрямую
```

### 3.2 Ключевые отличия от Bridge

| Аспект | Bridge | JSI |
|--------|--------|-----|
| Сериализация | JSON.stringify/parse | Нет |
| Тип вызова | Только асинхронный | Синхронный и асинхронный |
| Связь с движком | Привязан к JSC | Абстракция над любым движком |
| Доступ к объектам | Копирование данных | Прямые ссылки на C++ объекты |
| Overhead на вызов | ~10ms (сериализация + очередь) | ~0.01ms |

### 3.3 Host Objects

JSI вводит концепцию **Host Objects** — C++ объекты, доступные из JavaScript:

```cpp
class NativeStorage : public jsi::HostObject {
public:
  jsi::Value get(jsi::Runtime& rt, const jsi::PropNameID& name) override {
    if (name.utf8(rt) == "getString") {
      return jsi::Function::createFromHostFunction(rt, name, 1,
        [](jsi::Runtime& rt, const jsi::Value& thisVal,
           const jsi::Value* args, size_t count) -> jsi::Value {
          std::string key = args[0].getString(rt).utf8(rt);
          std::string value = storage->get(key); // нативный вызов
          return jsi::String::createFromUtf8(rt, value);
        });
    }
    return jsi::Value::undefined();
  }
};
```

JS видит Host Object как обычный объект с методами, но каждый вызов метода исполняется в C++.

### 3.4 Абстракция над JS-движком

JSI абстрагирует JavaScript runtime. Это позволяет React Native работать с **любым** JS-движком:

```
         JavaScript Code
              │
         ┌────▼────┐
         │   JSI   │  (C++ абстракция)
         └────┬────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
 Hermes     JSC      V8
(default)  (legacy) (optional)
```

### 3.5 Практический пример: скорость

VisionCamera — пример реального выигрыша JSI. Камера генерирует ~30 кадров/сек, каждый кадр — ~8MB буфер:

```
Bridge: 8MB × JSON.stringify = невозможно в реальном времени
JSI:    прямая ссылка на буфер в C++ памяти → ~2GB/sec throughput
```

---

## 4. Fabric

Fabric — это **новая система рендеринга** React Native, заменяющая старый `UIManager`.

### 4.1 Что изменилось

| Аспект | Старый рендерер | Fabric |
|--------|----------------|--------|
| Shadow Tree | Java/ObjC, отдельный поток | **C++**, доступен из любого потока |
| Layout | Асинхронный | Синхронный через `useLayoutEffect` |
| Immutability | Мутабельное дерево | **Иммутабельное** (copy-on-write) |
| React 18 | Не поддерживает | Concurrent Renderer |
| Создание view | Все через Bridge | JSI прямые вызовы |

### 4.2 Иммутабельное Shadow Tree

В Fabric Shadow Tree — иммутабельная C++ структура. При обновлении создаётся **новая версия** дерева, а не мутируется существующая:

```
State N:    [View] ─── [Text "Hello"]
                  └── [Image]

setState({ text: "World" })

State N+1:  [View] ─── [Text "World"]  ← новый узел
                  └── [Image]          ← переиспользован (shared pointer)
```

Это позволяет:
- Безопасно читать дерево из **любого потока**
- Поддерживать **приоритетные обновления** (concurrent rendering)
- Откатывать изменения без side effects

### 4.3 Синхронный layout

В старой архитектуре `onLayout` был асинхронным — между рендером и получением размеров проходило несколько кадров, вызывая визуальные "прыжки".

Fabric поддерживает `useLayoutEffect` для **синхронного** измерения и обновления:

```jsx
function MeasuredComponent() {
  const ref = useRef(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    // В Fabric это выполняется СИНХРОННО до отрисовки
    ref.current.measure((x, y, width, height) => {
      setHeight(height);
    });
  }, []);

  return <View ref={ref}><Text>Height: {height}</Text></View>;
}
```

### 4.4 Rendering Pipeline в Fabric

```
1. React render phase (JS Thread)
   │ → Создание React Element Tree
   │ → Diff с предыдущим деревом
   │
2. Commit phase
   │ → Создание нового C++ Shadow Tree (иммутабельно)
   │ → Yoga рассчитывает layout
   │
3. Mount phase (UI Thread)
   │ → Diff между старым и новым Shadow Tree
   │ → Создание/обновление нативных views
   │ → Отрисовка на экране
```

---

## 5. Turbo Native Modules

Turbo Native Modules заменяют legacy Native Modules. Они основаны на JSI и обеспечивают **compile-time type safety**.

### 5.1 Ключевые отличия

| Аспект | Legacy Native Modules | Turbo Native Modules |
|--------|----------------------|---------------------|
| Спецификация | Нетипизированная | TypeScript/Flow spec |
| Type safety | Только runtime | Compile-time (Codegen) |
| Boilerplate | Ручной | Автогенерация |
| Инициализация | Eager (все при старте) | **Lazy** (по требованию) |
| Производительность | Bridge + JSON | JSI (прямые вызовы) |

### 5.2 Процесс создания

```
1. Определить TypeScript spec
   │
   ▼
2. Codegen генерирует C++/Java/ObjC boilerplate
   │
   ▼
3. Реализовать нативный код (Android + iOS)
   │
   ▼
4. Вызвать из JS через TurboModuleRegistry
```

### 5.3 TypeScript Spec

Имя модуля **обязательно** начинается с `Native`:

```typescript
// NativeLocalStorage.ts
import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  getString(key: string): string | null;
  setString(key: string, value: string): void;
  removeKey(key: string): void;
  getAll(): { [key: string]: string };
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeLocalStorage');
```

### 5.4 Lazy Loading

В отличие от legacy модулей, которые загружались все при старте приложения, Turbo Modules загружаются **по первому вызову**:

```js
// Модуль НЕ загружен в память
import NativeLocalStorage from './NativeLocalStorage';

// Модуль загружается ТОЛЬКО здесь, при первом обращении
const value = NativeLocalStorage.getString('key');
```

Это значительно улучшает **Time to Interactive (TTI)**, особенно в приложениях с десятками нативных модулей.

### 5.5 Android реализация (Kotlin)

```kotlin
package com.myapp.storage

import com.facebook.react.bridge.ReactApplicationContext
import com.myapp.NativeLocalStorageSpec

class NativeLocalStorageModule(reactContext: ReactApplicationContext)
  : NativeLocalStorageSpec(reactContext) {

  override fun getName() = NAME

  override fun getString(key: String): String? {
    val prefs = reactApplicationContext
      .getSharedPreferences("MyAppStorage", Context.MODE_PRIVATE)
    return prefs.getString(key, null)
  }

  override fun setString(key: String, value: String) {
    val prefs = reactApplicationContext
      .getSharedPreferences("MyAppStorage", Context.MODE_PRIVATE)
    prefs.edit().putString(key, value).apply()
  }

  companion object {
    const val NAME = "NativeLocalStorage"
  }
}
```

### 5.6 iOS реализация (Objective-C++)

```objc
// RCTNativeLocalStorage.mm
#import "RCTNativeLocalStorage.h"

@implementation RCTNativeLocalStorage

RCT_EXPORT_MODULE(NativeLocalStorage)

- (NSString *)getString:(NSString *)key {
  return [[NSUserDefaults standardUserDefaults] stringForKey:key];
}

- (void)setString:(NSString *)key value:(NSString *)value {
  [[NSUserDefaults standardUserDefaults] setObject:value forKey:key];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeLocalStorageSpecJSI>(params);
}

@end
```

---

## 6. Codegen

Codegen — инструмент, который генерирует **платформо-специфичный boilerplate** из TypeScript/Flow спецификаций.

### 6.1 Что генерирует Codegen

```
TypeScript Spec (NativeLocalStorage.ts)
              │
              ▼
         ┌─────────┐
         │ Codegen  │
         └────┬────┘
              │
    ┌─────────┼─────────┐
    ▼                   ▼
 Android              iOS
 ├── NativeLocalStorageSpec.java   ├── RCTNativeLocalStorageSpec.h
 └── (abstract class с             └── (protocol + C++ JSI binding)
      типизированными методами)
```

### 6.2 Конфигурация

В `package.json`:

```json
{
  "codegenConfig": {
    "name": "MyAppSpecs",
    "type": "modules",
    "jsSrcsDir": "src/native",
    "android": {
      "javaPackageName": "com.myapp"
    }
  }
}
```

Codegen запускается автоматически:
- **Android** — при `./gradlew generateCodegenArtifactsFromSchema`
- **iOS** — при `bundle exec pod install`

### 6.3 Типы данных

| TypeScript | Android (Java) | iOS (ObjC) | C++ (JSI) |
|-----------|----------------|-------------|-----------|
| `string` | `String` | `NSString *` | `jsi::String` |
| `number` | `double` | `double` | `jsi::Value` (number) |
| `boolean` | `boolean` | `BOOL` | `jsi::Value` (bool) |
| `string[]` | `ReadableArray` | `NSArray<NSString *> *` | `jsi::Array` |
| `Object` | `ReadableMap` | `NSDictionary *` | `jsi::Object` |
| `Promise<T>` | `Promise` | `RCTPromiseResolveBlock` | callback |
| `(value: T) => void` | `Callback` | `RCTResponseSenderBlock` | `jsi::Function` |

---

## 7. Yoga Layout Engine

Yoga — это **кроссплатформенный C++ layout engine**, реализующий Flexbox.

### 7.1 Как работает

Yoga получает дерево узлов с CSS-подобными стилями и вычисляет **абсолютные координаты и размеры** каждого элемента.

```
Input (React Native стили):
<View style={{ flexDirection: 'row', padding: 10 }}>
  <View style={{ flex: 1, height: 50 }} />
  <View style={{ flex: 2, height: 50 }} />
</View>

Yoga вычисляет:
Node 0: { x: 0, y: 0, width: 375, height: 70 }
  Node 1: { x: 10, y: 10, width: 118, height: 50 }
  Node 2: { x: 128, y: 10, width: 237, height: 50 }
```

### 7.2 Отличия от Web Flexbox

| Свойство | Web CSS | React Native |
|----------|---------|-------------|
| `flexDirection` | `row` (default) | **`column`** (default) |
| `flex` | shorthand (`flex: 1 0 auto`) | **только число** (`flex: 1`) |
| CSS Grid | Поддерживается | **Нет** |
| `display` | `block`, `flex`, `grid`, etc. | Только `flex` и `none` |
| Единицы измерения | px, em, rem, %, vw, vh | **dp** (density-independent pixels) и `%` |

### 7.3 Yoga в новой архитектуре

В Fabric Yoga вызывается **синхронно** в C++, как часть commit phase. Shadow Tree содержит Yoga-узлы напрямую, что устраняет overhead на передачу данных между потоками.

---

## 8. Concurrent Renderer

С Fabric React Native полностью поддерживает **React 18+ Concurrent Features**.

### 8.1 Поддерживаемые фичи

**Suspense** — для загрузки данных:

```jsx
function ProfilePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProfileDetails />
      <Suspense fallback={<PostsSkeleton />}>
        <ProfilePosts />
      </Suspense>
    </Suspense>
  );
}
```

**Transitions** — для приоритизации обновлений:

```jsx
function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isPending, startTransition] = useTransition();

  function handleChange(text) {
    setQuery(text); // Высокий приоритет — обновить input немедленно
    startTransition(() => {
      setResults(filterResults(text)); // Низкий приоритет — можно прервать
    });
  }

  return (
    <View>
      <TextInput value={query} onChangeText={handleChange} />
      {isPending ? <ActivityIndicator /> : <ResultsList data={results} />}
    </View>
  );
}
```

**Automatic Batching** — автоматическая группировка обновлений состояния, включая из нативных событий (в старой архитектуре batching работал только внутри React event handlers).

---

## 9. Сравнительная таблица

| Аспект | Старая архитектура | Новая архитектура (v0.76+) |
|--------|-------------------|---------------------------|
| Коммуникация JS ↔ Native | Bridge (JSON) | JSI (C++ прямые вызовы) |
| Сериализация | Обязательная | Нет |
| Тип вызовов | Только async | Sync + async |
| Shadow Tree | Java/ObjC, отдельный поток | C++, доступен из любого потока |
| Shadow Tree mutability | Мутабельный | Иммутабельный |
| Layout measurement | Асинхронный | Синхронный (`useLayoutEffect`) |
| Нативные модули | Legacy (eager loading) | Turbo Modules (lazy loading) |
| Нативные компоненты | Legacy | Fabric Components |
| Type safety | Runtime | Compile-time (Codegen) |
| React 18 | Нет | Suspense, Transitions, Batching |
| JS движок | Привязан к JSC | Абстракция (Hermes, JSC, V8) |
| Отключение | — | `newArchEnabled=false` (Android), `RCT_NEW_ARCH_ENABLED=0` (iOS) |

---

## 10. Диаграммы потоков данных

### Старая архитектура

```
┌───────────────┐     ┌─────────────────┐     ┌───────────────┐
│   JS Thread   │     │     Bridge      │     │  Native Thread │
│               │     │  (JSON Queue)   │     │   (UI Thread)  │
│ React render  │────▶│ serialize ──────│────▶│ create views   │
│ setState()    │     │                 │     │ update views   │
│ event handler │◀────│──── serialize   │◀────│ capture touch  │
│               │     │                 │     │                │
└───────────────┘     └─────────────────┘     └───────┬───────┘
                                                      │
                                              ┌───────▼───────┐
                                              │ Shadow Thread  │
                                              │ Yoga layout    │
                                              └───────────────┘
```

### Новая архитектура

```
┌───────────────┐                              ┌───────────────┐
│   JS Thread   │         JSI (C++)            │  Native Thread │
│               │◀════════════════════════════▶│   (UI Thread)  │
│ React render  │   прямые вызовы, без JSON    │ mount views    │
│ setState()    │                              │ handle touch   │
│               │   ┌──────────────────────┐   │                │
│               │──▶│  C++ Shadow Tree     │──▶│                │
│               │   │  Yoga layout         │   │                │
│               │   │  (иммутабельный)     │   │                │
│               │   └──────────────────────┘   │                │
└───────────────┘     доступен из любого       └───────────────┘
                          потока
```

### Важное замечание

Включение новой архитектуры **не даёт автоматического прироста производительности**. Код может потребовать рефакторинга для использования новых возможностей (синхронный layout, lazy loading модулей, concurrent features).
