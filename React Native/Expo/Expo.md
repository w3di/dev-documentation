# Expo: полное руководство

## Оглавление

1. [Что такое Expo](#1-что-такое-expo)
2. [Expo Go vs Dev Build](#2-expo-go-vs-dev-build)
3. [EAS (Expo Application Services)](#3-eas-expo-application-services)
4. [Expo Router](#4-expo-router)
5. [Expo Modules API](#5-expo-modules-api)
6. [Prebuild и Continuous Native Generation](#6-prebuild-и-continuous-native-generation)
7. [OTA Updates через EAS Update](#7-ota-updates-через-eas-update)
8. [Основные пакеты Expo](#8-основные-пакеты-expo)
9. [Когда нужен Dev Build вместо Expo Go](#9-когда-нужен-dev-build-вместо-expo-go)

---

## 1. Что такое Expo

Expo — это **набор инструментов и сервисов** поверх React Native, упрощающий разработку, сборку и деплой.

### Состав экосистемы

```
Expo Ecosystem
├── Expo CLI         — CLI для разработки (npx expo start)
├── Expo SDK         — библиотеки (expo-camera, expo-location, ...)
├── Expo Router      — file-based навигация
├── Expo Go          — приложение для быстрого запуска без сборки
├── EAS Build        — облачная сборка (iOS/Android)
├── EAS Submit       — публикация в App Store / Google Play
├── EAS Update       — OTA-обновления JS bundle
└── Expo Modules API — создание нативных модулей
```

### Expo НЕ является отдельным фреймворком

Expo — это **надстройка** над React Native. Приложение на Expo — это обычное React Native приложение с дополнительными инструментами. Можно использовать любые React Native библиотеки.

---

## 2. Expo Go vs Dev Build

### Expo Go

Готовое приложение из App Store / Google Play с предустановленным набором нативных модулей:

```bash
npx expo start
# → QR-код → открыть в Expo Go
```

**Ограничения Expo Go:**
- Только модули из Expo SDK
- Нельзя использовать произвольные нативные модули
- Нельзя менять `AndroidManifest.xml` или `Info.plist`
- Привязан к конкретной версии Expo SDK

### Dev Build (Development Build)

Кастомная сборка приложения с вашими нативными модулями:

```bash
# Установка
npx expo install expo-dev-client

# Локальная сборка
npx expo run:ios
npx expo run:android

# Или облачная сборка через EAS
eas build --profile development --platform ios
```

**Dev Build = Expo Go с вашими нативными модулями.**

### Сравнение

| Аспект | Expo Go | Dev Build |
|--------|---------|-----------|
| Нативные модули | Только Expo SDK | **Любые** |
| Скорость старта | Мгновенно (приложение уже установлено) | Нужна сборка |
| Кастомный нативный код | Нет | **Да** |
| Push Notifications | Ограничено | **Полноценно** |
| Background tasks | Ограничено | **Полноценно** |
| Для прототипирования | **Идеально** | Избыточно |
| Для продакшена | Нет | **Да** |

---

## 3. EAS (Expo Application Services)

### EAS Build

Облачная сборка iOS и Android приложений:

```bash
# Конфигурация
# eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}

# Запуск сборки
eas build --platform ios --profile production
eas build --platform android --profile production
```

Преимущества:
- Не нужен Mac для сборки iOS
- Автоматическое управление certificates и provisioning profiles
- CI/CD из коробки

### EAS Submit

Публикация в App Store / Google Play:

```bash
eas submit --platform ios
eas submit --platform android
```

### EAS Update

OTA-обновления JS bundle:

```bash
# Публикация обновления
eas update --branch production --message "Fix critical bug"

# Обновление конкретной группы пользователей
eas update --branch staging --message "New feature testing"
```

---

## 4. Expo Router

File-based routing система. Подробно описана в разделе [[Навигация]].

Ключевые особенности:
- Структура файлов в `app/` = структура навигации
- Автоматический deep linking
- Universal (iOS, Android, Web)
- Построен поверх React Navigation

---

## 5. Expo Modules API

API для создания нативных модулей с использованием Kotlin (Android) и Swift (iOS):

```swift
// ios/MyModule.swift
import ExpoModulesCore

public class MyModule: Module {
  public func definition() -> ModuleDefinition {
    Name("MyModule")

    Function("getDeviceName") {
      return UIDevice.current.name
    }

    AsyncFunction("fetchData") { (url: String, promise: Promise) in
      // асинхронная операция
    }
  }
}
```

```kotlin
// android/src/main/java/com/myapp/MyModule.kt
package com.myapp

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class MyModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MyModule")

    Function("getDeviceName") {
      android.os.Build.MODEL
    }

    AsyncFunction("fetchData") { url: String ->
      // асинхронная операция
    }
  }
}
```

```jsx
// JS
import { requireNativeModule } from 'expo-modules-core';
const MyModule = requireNativeModule('MyModule');

const name = MyModule.getDeviceName();
```

---

## 6. Prebuild и Continuous Native Generation

### Что такое Prebuild

`npx expo prebuild` генерирует `ios/` и `android/` директории из конфигурации в `app.json` / `app.config.js`:

```bash
npx expo prebuild
# Генерирует ios/ и android/ из app.json

npx expo prebuild --clean
# Удаляет и пересоздаёт нативные папки
```

### Continuous Native Generation (CNG)

Философия Expo: нативные папки (`ios/`, `android/`) — это **генерируемые артефакты**, а не ручной код.

```
app.json / app.config.js
        │
        ▼ npx expo prebuild
     ┌──┴──┐
     │     │
   ios/  android/
     │     │
     ▼     ▼
  Сборка приложения
```

Преимущества:
- `ios/` и `android/` добавляются в `.gitignore`
- Обновление React Native = `npx expo prebuild --clean`
- Нативная конфигурация через **Config Plugins** в JS

### Config Plugins

```js
// app.config.js
export default {
  name: 'MyApp',
  plugins: [
    // Встроенные плагины
    ['expo-camera', { cameraPermission: 'Для сканирования QR' }],

    // Кастомный плагин
    ['./plugins/withCustomConfig', { apiKey: 'xxx' }],
  ],
};
```

Config Plugin — JS-функция, модифицирующая нативные конфиги при prebuild:

```js
// plugins/withCustomConfig.js
const { withInfoPlist } = require('@expo/config-plugins');

module.exports = function withCustomConfig(config, { apiKey }) {
  return withInfoPlist(config, (config) => {
    config.modResults.MY_API_KEY = apiKey;
    return config;
  });
};
```

---

## 7. OTA Updates через EAS Update

### Как работает

```
Сборка (EAS Build)
├── Native binary (APK/IPA)     → App Store / Google Play
└── JS Bundle                    → EAS Update (CDN)

Пользователь открывает приложение:
1. Нативный код загружается из бинарника
2. JS Bundle проверяется на наличие обновлений
3. Если есть обновление → скачивается в фоне
4. При следующем запуске → новый bundle
```

### Конфигурация

```json
// app.json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/your-project-id",
      "fallbackToCacheTimeout": 0
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

### Runtime Version

Определяет совместимость OTA-обновления с нативным бинарником:

```
Binary v1.0 (runtime: "1.0") → может получить OTA для runtime "1.0"
Binary v1.1 (runtime: "1.1") → может получить OTA для runtime "1.1"
                                НЕ может получить OTA для runtime "1.0"
```

Если обновление меняет нативный код — нужна новая runtime version и публикация в App Store.

---

## 8. Основные пакеты Expo

| Пакет | Назначение |
|-------|-----------|
| `expo-camera` | Камера |
| `expo-image-picker` | Выбор изображений из галереи |
| `expo-location` | Геолокация |
| `expo-notifications` | Push и local notifications |
| `expo-secure-store` | Безопасное хранение данных |
| `expo-file-system` | Файловая система |
| `expo-sqlite` | SQLite база данных |
| `expo-image` | Оптимизированный Image с кешированием |
| `expo-av` | Аудио и видео |
| `expo-haptics` | Тактильная обратная связь |
| `expo-clipboard` | Буфер обмена |
| `expo-linking` | Deep linking |
| `expo-web-browser` | In-app browser |
| `expo-local-authentication` | Биометрическая аутентификация |
| `expo-splash-screen` | Splash screen |

---

## 9. Когда нужен Dev Build вместо Expo Go

| Сценарий | Expo Go | Dev Build |
|----------|---------|-----------|
| Прототип / быстрый тест | Да | — |
| react-native-maps | Нет | Да |
| Push Notifications (кастомные) | Нет | Да |
| Bluetooth (react-native-ble) | Нет | Да |
| In-App Purchases | Нет | Да |
| Кастомные шрифты (native) | Нет | Да |
| Background tasks | Ограничено | Да |
| Любой нативный модуль вне Expo SDK | **Нет** | **Да** |

Рекомендация: начинать с Expo Go для прототипирования, переходить на Dev Build когда нужны кастомные нативные модули.
