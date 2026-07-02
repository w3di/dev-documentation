# Yoga: Layout Engine React Native

> **Актуально для:** React Native 0.82-0.83 / Yoga 3.2.x

## Оглавление

1. [Что такое Yoga](#1-что-такое-yoga)
2. [Архитектура](#2-архитектура)
3. [Отличия от Web Flexbox](#3-отличия-от-web-flexbox)
4. [Поддерживаемые свойства](#4-поддерживаемые-свойства)
5. [Как Yoga вычисляет layout](#5-как-yoga-вычисляет-layout)
6. [Yoga в новой архитектуре (Fabric)](#6-yoga-в-новой-архитектуре-fabric)
7. [Производительность](#7-производительность)
8. [Ограничения](#8-ограничения)

---

## 1. Что такое Yoga

Yoga — это **кроссплатформенный layout engine на C++**, разработанный Meta. Реализует спецификацию **Flexbox** для вычисления позиций и размеров элементов.

### Почему не CSS-движок браузера

React Native рендерит **нативные View** (UIView на iOS, android.view.View на Android), а не HTML. Браузерный CSS-движок работает только с DOM. Yoga — это отдельная реализация Flexbox, которая:

- Работает без DOM и браузера
- Написана на C++ для максимальной скорости
- Кроссплатформенная — один и тот же код на iOS, Android, Windows
- Используется не только в React Native (Flutter имеет свой аналог, Litho/ComponentKit от Meta тоже используют Yoga)

### Что делает Yoga

```
Входные данные (стили):                 Результат (абсолютные координаты):
┌────────────────────────┐             ┌────────────────────────┐
│ <View style={{         │             │ View: x=0, y=0,        │
│   flexDirection:'col', │             │   width=375, height=812│
│   padding: 16          │             │                        │
│ }}>                    │   Yoga      │   Text: x=16, y=16,    │
│   <Text style={{       │ ────────▶   │     width=343, h=20    │
│     fontSize: 16       │             │                        │
│   }}>Hello</Text>      │             │   Button: x=16, y=52,  │
│   <Button style={{     │             │     width=343, h=44    │
│     marginTop: 16      │             │                        │
│   }}/>                 │             └────────────────────────┘
│ </View>                │
└────────────────────────┘
```

Yoga принимает дерево узлов с CSS-подобными стилями и вычисляет **абсолютные координаты и размеры** каждого элемента.

---

## 2. Архитектура

### Yoga Node Tree

Каждый React Native компонент создаёт соответствующий **YogaNode** в C++:

```
React Tree (JS)              Yoga Tree (C++)              Native Views
┌─────────┐                  ┌──────────┐                 ┌──────────┐
│  <View>  │ ──────────────▶ │ YogaNode │ ─── layout ──▶ │ UIView   │
│          │                 │ flex:1   │   x,y,w,h       │ frame:   │
│  <Text>  │ ──────────────▶ │ YogaNode │ ─── layout ──▶ │ UILabel  │
│          │                 │ h:20     │   x,y,w,h       │ frame:   │
│  <Image> │ ──────────────▶ │ YogaNode │ ─── layout ──▶ │ UIImage  │
│          │                 │ w:100    │   x,y,w,h       │ frame:   │
└─────────┘                  └──────────┘                 └──────────┘
```

### Процесс layout

```
1. JS описывает стили      → style={{ flex: 1, padding: 16 }}
2. Стили передаются в Yoga  → YogaNode.setFlexGrow(1), YogaNode.setPadding(16)
3. Yoga вычисляет layout    → calculateLayout(width, height)
4. Результат — координаты   → node.getComputedLeft(), getComputedTop(), ...
5. Native View получает     → view.frame = CGRect(x, y, width, height)
```

---

## 3. Отличия от Web Flexbox

### Критические отличия

| Свойство | Web CSS | React Native (Yoga) |
|----------|---------|---------------------|
| `flexDirection` | **`row`** (по умолчанию) | **`column`** (по умолчанию) |
| `flex` | Shorthand (`flex: 1 0 auto`) | **Только число** (`flex: 1`) |
| Единицы измерения | px, em, rem, vw, vh, ... | **dp** (density-independent) и `%` |
| `display` | block, inline, flex, grid, ... | **Только `flex` и `none`** |
| CSS Grid | Да | **Нет** |
| `position` | static, relative, absolute, fixed, sticky | **`relative`, `absolute`, `static`** (Yoga 3.0+) |
| `overflow` | visible, hidden, scroll, auto | `visible`, `hidden`, `scroll` |
| Box model | content-box / border-box | **border-box** по умолчанию, `boxSizing` настраиваемый (Yoga 3.2+) |
| `display` values | block, inline, flex, grid, ... | `flex`, `none`, **`contents`** (Yoga 3.2+) |

### Почему `flexDirection: 'column'` по умолчанию

Мобильные экраны **вертикальные** — контент естественно идёт сверху вниз. На вебе горизонтальный поток текста делает `row` разумным дефолтом.

### flex: число

```jsx
// Web CSS:
flex: 1 0 auto;     // flex-grow, flex-shrink, flex-basis
flex: 1;            // flex: 1 1 0

// React Native:
flex: 1             // НЕ shorthand!
                    // flex > 0 → flexGrow: flex, flexShrink: 1, flexBasis: 0
                    // flex = 0 → компонент определяется по width/height
                    // flex = -1 → определяется по width/height, но сжимается до minWidth/minHeight
```

### Единицы измерения

```jsx
// React Native — все значения в dp (density-independent pixels)
<View style={{ width: 100, height: 50, padding: 16 }} />

// dp автоматически масштабируются:
// iPhone SE (2x): 100dp = 200 физических пикселей
// iPhone 15 (3x): 100dp = 300 физических пикселей

// Проценты тоже поддерживаются:
<View style={{ width: '50%', height: '100%' }} />

// Нет em, rem, vw, vh — только dp и %
```

---

## 4. Поддерживаемые свойства

### Flex Container

```jsx
<View style={{
  flexDirection: 'column',    // 'row' | 'column' | 'row-reverse' | 'column-reverse'
  justifyContent: 'center',   // 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  alignItems: 'stretch',      // 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  alignContent: 'flex-start', // для многострочных (flexWrap)
  flexWrap: 'nowrap',         // 'wrap' | 'nowrap' | 'wrap-reverse'
  gap: 8,                     // gap между элементами
  rowGap: 8,                  // gap между строками
  columnGap: 8,               // gap между колонками
}} />
```

### Flex Item

```jsx
<View style={{
  flex: 1,                    // grow + shrink + basis (упрощённо)
  flexGrow: 1,                // сколько свободного пространства занять
  flexShrink: 0,              // как сильно сжиматься
  flexBasis: 'auto',          // начальный размер (число или 'auto')
  alignSelf: 'center',        // переопределение alignItems родителя
}} />
```

### Размеры

```jsx
<View style={{
  width: 100,                 // фиксированная ширина (dp)
  height: 50,                 // фиксированная высота (dp)
  minWidth: 50,               // минимальная ширина
  maxWidth: 300,              // максимальная ширина
  minHeight: 20,
  maxHeight: 200,
  aspectRatio: 16 / 9,        // соотношение сторон
}} />
```

### Spacing

```jsx
<View style={{
  // Padding (внутренний отступ)
  padding: 16,
  paddingHorizontal: 16,      // paddingLeft + paddingRight
  paddingVertical: 8,         // paddingTop + paddingBottom
  paddingTop: 8,
  paddingBottom: 8,
  paddingLeft: 16,
  paddingRight: 16,
  paddingStart: 16,           // LTR: left, RTL: right
  paddingEnd: 16,             // LTR: right, RTL: left

  // Margin (внешний отступ)
  margin: 8,
  marginHorizontal: 8,
  marginVertical: 4,
  marginTop: 4,
  // ... аналогично padding
  // margin: 'auto' — поддерживается для центрирования
}} />
```

### Position

```jsx
<View style={{
  position: 'relative',       // 'relative' (default) | 'absolute' | 'static' (Yoga 3.0+)
  top: 10,
  left: 10,
  right: 10,
  bottom: 10,
  zIndex: 1,                  // порядок наложения

  // 'relative' — смещение от рассчитанной позиции, без влияния на соседей
  // 'absolute' — выход из потока flex, позиционирование относительно ближайшего
  //              non-static родителя (как в CSS)
  // 'static'   — (Yoga 3.0+) элемент НЕ является containing block для absolute-детей,
  //              top/left/right/bottom игнорируются
}} />
```

### boxSizing (Yoga 3.2+)

```jsx
<View style={{
  boxSizing: 'border-box',   // (default) width/height включают padding и border
}} />

<View style={{
  boxSizing: 'content-box',  // width/height НЕ включают padding и border
  width: 100,
  padding: 10,
  // итого: 100 + 10 + 10 = 120 пикселей
}} />
```

### display: 'contents' (Yoga 3.2+)

```jsx
// display: 'contents' — элемент "исчезает" из layout,
// его дети становятся прямыми flex-детьми родителя
<View style={{ flexDirection: 'row', gap: 8 }}>
  <View style={{ display: 'contents' }}>
    {/* Эти View ведут себя как прямые дети внешнего row-контейнера */}
    <View style={{ width: 50, height: 50 }} />
    <View style={{ width: 50, height: 50 }} />
  </View>
  <View style={{ width: 50, height: 50 }} />
</View>

// Полезно для wrapper-компонентов, которые не должны влиять на layout
```

---

## 5. Как Yoga вычисляет layout

### Алгоритм

Yoga использует **двухпроходный алгоритм** (как и браузерный Flexbox):

```
Pass 1: Measure (снизу вверх)
  Определение intrinsic size каждого узла
  Leaf nodes (Text, Image) измеряют свой контент
  Container nodes запрашивают размеры у детей

Pass 2: Layout (сверху вниз)
  Распределение пространства по flex-правилам
  Вычисление абсолютных координат

Результат: каждый узел получает (x, y, width, height)
```

### Measure Functions

Для leaf-узлов (Text, Image) Yoga вызывает **measure function** — нативную функцию, определяющую intrinsic size контента:

```
<Text>Hello World</Text>

1. Yoga вызывает measureFunction для Text node
2. Нативная сторона вычисляет размер текста "Hello World"
   (учитывая шрифт, fontSize, maxWidth)
3. Возвращает { width: 85, height: 18 }
4. Yoga использует эти размеры для flex-расчётов
```

Measure functions — одна из причин, почему layout-вычисления идут в нативном слое, а не в JS.

### Пример расчёта

```jsx
<View style={{ width: 300, padding: 10, flexDirection: 'row' }}>
  <View style={{ flex: 1, height: 50 }} />   {/* A */}
  <View style={{ flex: 2, height: 50 }} />   {/* B */}
  <View style={{ width: 60, height: 50 }} /> {/* C */}
</View>

// Доступное пространство: 300 - 10 - 10 = 280 (за вычетом padding)
// C фиксированный: 60
// Оставшееся: 280 - 60 = 220
// A (flex:1): 220 × (1/3) ≈ 73.3
// B (flex:2): 220 × (2/3) ≈ 146.7

// Результат:
// A: x=10, y=10, width=73.3,  height=50
// B: x=83.3, y=10, width=146.7, height=50
// C: x=230, y=10, width=60,    height=50
```

---

## 6. Yoga в новой архитектуре (Fabric)

> С React Native 0.82 New Architecture (Fabric) — **единственная** архитектура. Bridge полностью удалён, `newArchEnabled=false` игнорируется.

### Как Yoga работает в Fabric

```
JS Thread → C++ (Fabric) → Yoga → Shadow Tree → UI Thread
                │                      │
                └──────────────────────┘
                  Всё в C++, синхронно

Fabric commit phase:
  1. React diff в JS
  2. Создание C++ Shadow Tree с Yoga-нодами
  3. Yoga.calculateLayout() — синхронно в C++
  4. Mount на UI Thread
```

- **Нет отдельного Shadow Thread** — Yoga интегрирована в Fabric C++ layer
- **Нет Bridge** — Shadow Tree доступен из любого потока напрямую через JSI
- **Синхронные layout-вычисления** — нет visual glitches
- **React 19 concurrent features** — приоритеты рендеринга

### Историческая справка (старая архитектура, до RN 0.82)

В старой архитектуре Yoga работала на отдельном **Shadow Thread**, обмениваясь данными через Bridge (JSON-сериализация). Это вызывало задержки и visual glitches при быстрых обновлениях (scroll, анимации). С RN 0.82 этой проблемы больше нет.

---

## 7. Производительность

### Почему Yoga быстрая

1. **C++** — нативный код, без overhead интерпретатора
2. **Кеширование** — если стили не изменились, layout не пересчитывается
3. **Инкрементальный layout** — пересчитывается только изменённое поддерево
4. **Нет CSS parsing** — стили приходят как числа, не как строки

### Что может замедлить layout

```jsx
// Глубокая вложенность — каждый уровень = проход Yoga
// Плохо:
<View>
  <View>
    <View>
      <View>
        <View>
          <Text>Deep</Text>    {/* 5 уровней */}
        </View>
      </View>
    </View>
  </View>
</View>

// Лучше: плоская структура
<View style={{ flex: 1 }}>
  <Text>Flat</Text>
</View>

// onLayout — вызывает дополнительный проход
// Используй осторожно на часто обновляемых компонентах
<View onLayout={(e) => {
  const { width, height } = e.nativeEvent.layout;
}} />
```

### Layout thrashing

```jsx
// Плохо: частая смена стилей вызывает пересчёт layout каждый рендер
function Bad() {
  const [size, setSize] = useState(100);
  // Каждый рендер — новый объект style → Yoga пересчитывает
  return <View style={{ width: size, height: size }} />;
}

// Лучше: стабильные стили + transform для анимаций
function Good() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    // transform НЕ вызывает Yoga layout — обрабатывается на GPU
  }));
  return <Animated.View style={[styles.box, style]} />;
}
```

---

## 8. Ограничения

### Нет CSS Grid

Yoga реализует **только Flexbox**. CSS Grid не поддерживается. Для grid-подобных layouts:

```jsx
// Эмуляция grid через flexWrap
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
  {items.map(item => (
    <View key={item.id} style={{ width: '48%', height: 100 }} />
  ))}
</View>
```

### Нет `display: inline`

Все элементы — flex containers. Нет inline-элементов как на вебе. `<Text>` — единственный компонент с inline-подобным поведением (вложенные `<Text>` располагаются inline).

### Нет `calc()`, `min()`, `max()`, `clamp()`

CSS-функции не поддерживаются. Используй `minWidth`/`maxWidth` и JS-вычисления:

```jsx
// Вместо width: calc(100% - 32px)
<View style={{ width: '100%', paddingHorizontal: 16 }}>
  <View style={{ flex: 1 }} />  {/* займёт 100% - 32px */}
</View>

// Или через Dimensions
import { Dimensions } from 'react-native';
const width = Dimensions.get('window').width - 32;
```

### Нет `position: fixed` и `position: sticky`

- `fixed` — используй `position: 'absolute'` + координаты экрана
- `sticky` — используй `stickyHeaderIndices` в `ScrollView`/`FlatList`

```jsx
<ScrollView stickyHeaderIndices={[0]}>
  <View>{/* этот header будет "sticky" */}</View>
  <View>{/* контент */}</View>
</ScrollView>
```
