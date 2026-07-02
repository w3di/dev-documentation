# JSI (JavaScript Interface)

> **Актуально для:** React Native 0.82+ (New Architecture обязательна, Bridge удалён)

## Оглавление

1. [Что такое JSI](#1-что-такое-jsi)
2. [Зачем создали JSI](#2-зачем-создали-jsi)
3. [Как работает JSI](#3-как-работает-jsi)
4. [Host Objects](#4-host-objects)
5. [Абстракция над JS-движком](#5-абстракция-над-js-движком)
6. [JSI в экосистеме React Native](#6-jsi-в-экосистеме-react-native)
7. [Практические примеры](#7-практические-примеры)
8. [JSI vs Bridge — сравнение](#8-jsi-vs-bridge--сравнение)

---

## 1. Что такое JSI

JSI (JavaScript Interface) — это **lightweight C++ API**, позволяющий JavaScript коду **напрямую** вызывать C++ функции и наоборот, без сериализации.

JSI — это **фундамент** всей новой архитектуры React Native. На нём построены:

```
JSI (C++ API)
 ├── Turbo Native Modules  — нативные модули через JSI
 ├── Fabric Renderer        — рендеринг UI через JSI
 ├── Expo Modules API       — под капотом использует JSI
 ├── Hermes                 — реализует jsi::Runtime
 └── Библиотеки (Reanimated, VisionCamera, MMKV, ...)
```

### Одной фразой

JSI — это способ для JavaScript и C++ **разделять объекты в памяти** и вызывать функции друг друга напрямую, без JSON-сериализации и асинхронных очередей.

---

## 2. Зачем создали JSI

### Проблема: Bridge

В старой архитектуре JS и Native общались через Bridge — асинхронную очередь JSON-сообщений:

```
JS: NativeModules.Camera.takePicture({ quality: 0.8 })

1. JS Thread:    JSON.stringify({ module: "Camera", method: "takePicture", args: [{ quality: 0.8 }] })
2. Bridge Queue: сообщение ждёт в очереди
3. Native:       JSON.parse(...) → Camera.takePicture(quality: 0.8)
4. Native:       JSON.stringify(result)
5. Bridge Queue: ответ ждёт в очереди
6. JS Thread:    JSON.parse(...) → callback(result)

Итого: 2× JSON сериализация + 2× ожидание в очереди = ~5-15ms на каждый вызов
```

### Критические проблемы Bridge

1. **Serialization overhead** — каждый вызов = `JSON.stringify` + `JSON.parse`. Для простых вызовов — ок, для потоковых данных (камера, анимации) — bottleneck
2. **Async only** — нельзя синхронно получить значение. `getDeviceName()` → нужен callback/promise
3. **Bottleneck** — все модули делят одну очередь. Если один модуль шлёт много сообщений (scroll events) — остальные ждут
4. **Нет shared memory** — JS и Native не могут разделять объекты. Каждый раз копирование через JSON

### Решение: JSI

```
JS: NativeModule.takePicture({ quality: 0.8 })

1. JS вызывает C++ функцию напрямую через jsi::HostObject
2. C++ функция вызывает нативный код
3. Результат возвращается синхронно (или через callback)

Итого: ~0.01-0.1ms — прямой вызов C++ метода, без очередей
```

---

## 3. Как работает JSI

### C++ слой между JS и Native

```
┌──────────────────────┐
│     JavaScript       │
│   (Hermes Runtime)   │
└──────────┬───────────┘
           │  JS вызывает global.__turboModuleProxy
           │  или обращается к HostObject
           ▼
┌──────────────────────┐
│        JSI           │  ← C++ API (jsi::Runtime, jsi::Value, jsi::Object, ...)
│  Прямой вызов C++    │
│  Без сериализации    │
│  Синхронный доступ   │
└──────────┬───────────┘
           │  C++ вызывает платформенный код
           ▼
┌──────────────────────┐
│   Native Platform    │
│  (Swift/Kotlin/ObjC) │
└──────────────────────┘
```

### Ключевой принцип: shared memory

JSI позволяет JS и C++ **работать с одними и теми же объектами в памяти**:

```cpp
// C++ создаёт объект
auto storage = std::make_shared<NativeStorage>();

// JS получает ссылку на ЭТОТ ЖЕ объект (не копию!)
runtime.global().setProperty(runtime, "nativeStorage",
  jsi::Object::createFromHostObject(runtime, storage));
```

```javascript
// JS вызывает метод C++ объекта НАПРЯМУЮ
const value = nativeStorage.getString("key");
// Нет JSON, нет копирования — прямой вызов C++ метода
```

### Типы данных JSI

JSI оперирует своими типами, которые маппятся между JS и C++:

```cpp
// jsi::Value — универсальный тип (JS: any)
// jsi::String — строка
// jsi::Object — объект
// jsi::Array — массив
// jsi::Function — функция
// jsi::Symbol — символ

// Пример: C++ функция, доступная из JS
auto multiply = jsi::Function::createFromHostFunction(
  runtime,
  jsi::PropNameID::forAscii(runtime, "multiply"),
  2,  // количество аргументов
  [](jsi::Runtime& rt, const jsi::Value& thisVal,
     const jsi::Value* args, size_t count) -> jsi::Value {
    double a = args[0].asNumber();
    double b = args[1].asNumber();
    return jsi::Value(a * b);
  }
);

// Регистрация в глобальном объекте
runtime.global().setProperty(runtime, "multiply", std::move(multiply));
```

```javascript
// JS — вызов напрямую, синхронно
const result = multiply(3, 4); // 12
// Это НЕ NativeModules.multiply() через Bridge
// Это прямой вызов C++ функции, как будто она нативная JS-функция
```

---

## 4. Host Objects

Host Objects — C++ объекты, доступные из JavaScript как обычные JS-объекты.

### Создание Host Object

```cpp
// C++ — определение Host Object
class NativeStorage : public jsi::HostObject {
  std::unordered_map<std::string, std::string> storage_;

public:
  // GET — вызывается при чтении свойства из JS
  jsi::Value get(jsi::Runtime& rt, const jsi::PropNameID& name) override {
    auto key = name.utf8(rt);

    if (key == "getItem") {
      return jsi::Function::createFromHostFunction(rt, name, 1,
        [this](jsi::Runtime& rt, const jsi::Value&,
               const jsi::Value* args, size_t) -> jsi::Value {
          auto k = args[0].asString(rt).utf8(rt);
          auto it = storage_.find(k);
          if (it != storage_.end()) {
            return jsi::String::createFromUtf8(rt, it->second);
          }
          return jsi::Value::undefined();
        });
    }

    if (key == "setItem") {
      return jsi::Function::createFromHostFunction(rt, name, 2,
        [this](jsi::Runtime& rt, const jsi::Value&,
               const jsi::Value* args, size_t) -> jsi::Value {
          auto k = args[0].asString(rt).utf8(rt);
          auto v = args[1].asString(rt).utf8(rt);
          storage_[k] = v;
          return jsi::Value::undefined();
        });
    }

    return jsi::Value::undefined();
  }
};

// Регистрация
auto storage = std::make_shared<NativeStorage>();
runtime.global().setProperty(runtime, "nativeStorage",
  jsi::Object::createFromHostObject(runtime, storage));
```

```javascript
// JS — использование как обычного объекта
nativeStorage.setItem("token", "abc123");
const token = nativeStorage.getItem("token"); // "abc123" — синхронно!
```

### Почему это быстро

```
Bridge (старый подход):
  JS: AsyncStorage.setItem("token", "abc123")
    → JSON.stringify({module:"AsyncStorage", method:"setItem", args:["token","abc123"]})
    → Bridge Queue (ожидание)
    → JSON.parse на нативной стороне
    → SQLite write
    → JSON.stringify(result)
    → Bridge Queue (ожидание)
    → JSON.parse
  Итого: ~5-15ms

JSI Host Object:
  JS: nativeStorage.setItem("token", "abc123")
    → Прямой вызов C++ метода (0.01ms)
    → storage_["token"] = "abc123"
  Итого: ~0.01-0.1ms
```

---

## 5. Абстракция над JS-движком

JSI определяет интерфейс `jsi::Runtime`, который должен реализовать JS-движок. Это позволяет React Native работать с **любым** движком:

```
         JavaScript Code
              │
         ┌────▼────┐
         │   JSI   │  (jsi::Runtime — абстрактный C++ интерфейс)
         └────┬────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
 Hermes      JSC      V8 (потенциально)
 (default)  (community)

Каждый движок реализует jsi::Runtime:
  - evaluateJavaScript()
  - global()
  - createObject()
  - createFunction()
  - ...
```

### Почему это важно

1. **Заменяемость** — переключение между движками не требует переписывания нативных модулей
2. **Тестирование** — можно создать mock `jsi::Runtime` для unit-тестов
3. **Будущее** — Static Hermes (компиляция JS в нативный код) будет другой реализацией `jsi::Runtime`

---

## 6. JSI в экосистеме React Native

### Turbo Native Modules

Turbo Modules — высокоуровневая абстракция над JSI:

```
TypeScript Spec → Codegen → C++ JSI binding → Native код (Kotlin/Swift)

Разработчик пишет TypeScript Spec + нативный код.
Codegen генерирует JSI-слой автоматически.
Не нужно вручную писать jsi::HostObject.
```

### Fabric Renderer

Fabric использует JSI для создания Shadow Tree напрямую из JS:

```
React (JS) → JSI → C++ Shadow Tree → Yoga layout → Native Views

Без Bridge: React напрямую создаёт C++ ноды через JSI.
Layout (Yoga) выполняется синхронно в C++.
Результат mount-ится на UI Thread.
```

### Expo Modules API

Expo Modules под капотом тоже используют JSI через `expo-modules-core`:

```
Expo DSL (Swift/Kotlin) → expo-modules-core → JSI → JS

Разработчик пишет Swift/Kotlin DSL.
expo-modules-core создаёт JSI bindings автоматически.
```

### Популярные JSI-библиотеки

| Библиотека | Зачем JSI |
|------------|-----------|
| **react-native-reanimated** | Анимации выполняются в C++/UI thread, JS worklets вызываются через JSI |
| **react-native-mmkv** | Синхронное key-value хранилище через JSI (~30x быстрее AsyncStorage) |
| **react-native-vision-camera** | Обработка кадров камеры (~30fps) — невозможно через Bridge |
| **react-native-skia** | 2D-рендеринг через Skia C++ engine, объекты шарятся через JSI |
| **@shopify/flash-list** | Оптимизированный список с JSI для быстрого recycling |
| **WatermelonDB** | JSI для синхронных запросов к SQLite без Bridge overhead |

---

## 7. Практические примеры

### MMKV vs AsyncStorage

```javascript
// AsyncStorage (Bridge, async)
await AsyncStorage.setItem('token', 'abc123');        // ~5-10ms
const token = await AsyncStorage.getItem('token');     // ~5-10ms

// MMKV (JSI, sync)
storage.set('token', 'abc123');                        // ~0.01ms
const token = storage.getString('token');               // ~0.01ms

// Разница: ~500-1000x для единичных операций
```

### Reanimated worklets

```javascript
// Без JSI (Bridge): анимация дёргается
// Каждый кадр: JS → Bridge → Native → Bridge → JS = ~16ms (не влезает в 60fps)

// С JSI (Reanimated):
const style = useAnimatedStyle(() => {
  // Этот код выполняется в UI thread через JSI worklet
  // JS-функция скомпилирована в C++ контексте
  // Нет Bridge, нет задержки
  return {
    transform: [{ translateX: offset.value }],
  };
});
// Каждый кадр: C++ worklet → Native = ~0.5ms (60fps легко)
```

### VisionCamera — обработка кадров

```javascript
// Bridge: 8MB буфер × 30fps = 240MB/sec через JSON.stringify
// Физически невозможно

// JSI: JS получает ССЫЛКУ на C++ буфер, не копию
const frameProcessor = useFrameProcessor((frame) => {
  'worklet';
  // frame — это JSI Host Object
  // frame.width, frame.height — прямой доступ к C++ данным
  // Никакой сериализации, ~2GB/sec throughput
  const result = detectFaces(frame);
}, []);
```

---

## 8. JSI vs Bridge — сравнение

| Аспект | Bridge (удалён в 0.82) | JSI |
|--------|------------------------|-----|
| **Сериализация** | JSON.stringify / JSON.parse | Нет — shared memory |
| **Тип вызовов** | Только async | Sync + async |
| **Скорость вызова** | ~5-15ms | ~0.01-0.1ms |
| **Shared memory** | Нет — всегда копирование | Да — Host Objects |
| **Потоки** | JS Thread ↔ Native Thread через очередь | Любой поток может вызвать JSI |
| **Bottleneck** | Все модули делят одну очередь | Нет очереди |
| **Типизация** | Runtime (any → any) | Compile-time (Codegen/JSI types) |
| **Бинарные данные** | Base64 encode/decode | Прямой доступ к буферам |
| **Статус** | Полностью удалён (RN 0.82) | Единственный способ коммуникации |

### Производительность

```
Одиночный вызов:
  Bridge:  ████████████████████ 5-15ms
  JSI:     █ 0.01-0.1ms

Batch (1000 вызовов):
  Bridge:  5-15 секунд (bottleneck на очереди)
  JSI:     10-100ms

Потоковые данные (камера, 30fps):
  Bridge:  невозможно (JSON serialization > frame time)
  JSI:     легко (~0.5ms per frame)
```
