# Metro и сборка React Native: полное руководство

## Оглавление

1. [Metro Bundler](#1-metro-bundler)
2. [Конфигурация Metro](#2-конфигурация-metro)
3. [Процесс сборки](#3-процесс-сборки)
4. [Fast Refresh](#4-fast-refresh)
5. [Сборка Android (APK/AAB)](#5-сборка-android-apkaab)
6. [Сборка iOS (IPA)](#6-сборка-ios-ipa)
7. [Code Signing](#7-code-signing)
8. [OTA Updates](#8-ota-updates)

---

## 1. Metro Bundler

Metro — JavaScript бандлер, созданный для React Native. Аналог webpack/Vite для мобильных приложений.

### Что делает Metro

```
Исходный код (.js/.ts/.tsx)
        │
        ▼  Resolution (разрешение модулей)
Граф зависимостей
        │
        ▼  Transformation (Babel)
Трансформированный JS
        │
        ▼  Serialization
JS Bundle (один файл)
        │
        ▼  (Release) Hermes Compiler
Hermes Bytecode (.hbc)
```

### Три фазы

1. **Resolution** — построение графа зависимостей (какие модули импортируют какие)
2. **Transformation** — трансформация каждого модуля через Babel (JSX → JS, TypeScript → JS, Flow → JS)
3. **Serialization** — объединение всех модулей в один bundle

### Запуск

```bash
# Dev server (автоматически при npx react-native start)
npx react-native start

# С очисткой кеша
npx react-native start --reset-cache

# Генерация bundle вручную
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios/main.jsbundle \
  --assets-dest ios
```

---

## 2. Конфигурация Metro

### metro.config.js

```js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  // Расширения файлов для резолвинга
  resolver: {
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg', 'cjs'],
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),

    // Алиасы путей (аналог webpack aliases)
    extraNodeModules: {
      '@components': `${__dirname}/src/components`,
      '@utils': `${__dirname}/src/utils`,
    },
  },

  // Трансформация
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true, // lazy loading модулей
      },
    }),

    // SVG как компоненты
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },

  // Наблюдение за файлами
  watchFolders: [
    // Дополнительные папки для отслеживания (monorepo)
    `${__dirname}/../shared-lib`,
  ],
};

module.exports = mergeConfig(defaultConfig, config);
```

### Inline Requires

```js
// Без inline requires: все модули загружаются при старте
import HeavyModule from './HeavyModule'; // загружается сразу

// С inline requires: модули загружаются при первом использовании
// Metro автоматически преобразует import в lazy require
const HeavyModule = require('./HeavyModule'); // ← Metro делает это за вас
```

---

## 3. Процесс сборки

### Debug (Development)

```
Source Code → Metro Dev Server → JS Bundle (в памяти)
                    │
                    ▼
             Устройство/Эмулятор
             загружает bundle по HTTP
             (http://localhost:8081/index.bundle)
```

Особенности debug:
- Bundle загружается по сети с dev server
- Hot Module Replacement (Fast Refresh)
- Source maps для отладки
- `__DEV__ === true`
- Hermes без bytecode-оптимизаций

### Release (Production)

```
Source Code
    │
    ▼ Metro Bundle
JS Bundle (.js)
    │
    ▼ Hermes Compiler
Hermes Bytecode (.hbc)
    │
    ├──▶ Android: встраивается в APK/AAB (assets/index.android.bundle)
    └──▶ iOS: встраивается в IPA (main.jsbundle)
```

Особенности release:
- Bundle встроен в бинарник приложения
- Hermes bytecode (.hbc) — максимальная производительность
- Нет source maps (или загружены отдельно для crash reporting)
- `__DEV__ === false`
- ProGuard (Android) / Bitcode (iOS) оптимизации

---

## 4. Fast Refresh

Fast Refresh — система hot-reloading в React Native.

### Как работает

```
Изменение файла
      │
      ▼ Metro обнаруживает изменение
Перекомпиляция ТОЛЬКО изменённого модуля
      │
      ▼ Отправка по WebSocket на устройство
React Native применяет изменения
      │
      ├── Компонент → сохраняет state, перерендеривает
      └── Не-компонент → перезагружает модуль + все зависящие от него
```

### Правила сохранения state

- **Сохраняется**: изменения в JSX, стилях, обработчиках событий
- **Сбрасывается**: изменения в hooks (добавление/удаление), изменение сигнатуры компонента
- **Полная перезагрузка**: изменения вне компонентов (глобальные переменные, module-level code)

---

## 5. Сборка Android (APK/AAB)

### Debug APK

```bash
npx react-native run-android
# Или вручную:
cd android && ./gradlew assembleDebug
# Результат: android/app/build/outputs/apk/debug/app-debug.apk
```

### Release AAB (для Google Play)

```bash
cd android && ./gradlew bundleRelease
# Результат: android/app/build/outputs/bundle/release/app-release.aab
```

### Release APK

```bash
cd android && ./gradlew assembleRelease
# Результат: android/app/build/outputs/apk/release/app-release.apk
```

### Конфигурация (android/app/build.gradle)

```groovy
android {
    defaultConfig {
        applicationId "com.myapp"
        minSdkVersion 24
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }

    signingConfigs {
        release {
            storeFile file('my-release-key.keystore')
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias 'my-key-alias'
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true        // ProGuard
            shrinkResources true      // удаление неиспользуемых ресурсов
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 6. Сборка iOS (IPA)

### Debug

```bash
npx react-native run-ios
# Или через Xcode: Product → Run
```

### Release

```bash
# Через Xcode:
# 1. Product → Scheme → Edit Scheme → Release
# 2. Product → Archive
# 3. Distribute App → App Store Connect
```

### Конфигурация

В Xcode:
- **Bundle Identifier**: `com.myapp.example`
- **Version**: `1.0.0` (отображается в App Store)
- **Build**: `1` (внутренний номер, инкрементируется)
- **Deployment Target**: минимальная версия iOS

---

## 7. Code Signing

### iOS

| Артефакт | Назначение |
|----------|-----------|
| **Certificate** | Идентифицирует разработчика/команду |
| **Provisioning Profile** | Связывает certificate + app ID + devices |
| **App ID** | Уникальный идентификатор приложения |

Типы профилей:
- **Development** — для установки на тестовые устройства
- **Ad Hoc** — для ограниченного тестирования (до 100 устройств)
- **App Store** — для публикации
- **Enterprise** — для внутреннего распространения

### Android

**Keystore** — хранилище ключей для подписи APK/AAB:

```bash
# Генерация keystore
keytool -genkeypair -v \
  -storetype PKCS12 \
  -keystore my-release-key.keystore \
  -alias my-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**Keystore нельзя восстановить** — потеря = невозможность обновить приложение в Google Play.

---

## 8. OTA Updates

OTA (Over-The-Air) обновления позволяют обновить JS bundle **без публикации в App Store / Google Play**.

### Как работает

```
Пользователь открывает приложение
        │
        ▼
Проверка наличия обновлений (HTTP)
        │
        ├── Обновление найдено → скачать новый JS bundle
        │                         │
        │                         ▼
        │                    Применить при следующем запуске
        │
        └── Нет обновлений → использовать текущий bundle
```

### Ограничения OTA

- Можно обновить: **JS код, изображения, стили** (всё что в JS bundle)
- Нельзя обновить: **нативный код** (новые native modules, обновление SDK, изменение AndroidManifest/Info.plist)

### EAS Update (Expo)

```bash
# Публикация OTA-обновления
eas update --branch production --message "Fix login bug"
```

### CodePush (Microsoft AppCenter)

```bash
# Публикация
appcenter codepush release-react -a MyOrg/MyApp -d Production
```

### Политики App Store / Google Play

Apple и Google разрешают OTA-обновления JS bundle при условии:
- Обновление не меняет основную функциональность приложения
- Не добавляет фичи, обходящие review
- Соответствует изначально одобренному функционалу
