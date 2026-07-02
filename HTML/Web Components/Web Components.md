# Web Components — глубокое погружение

## Содержание

1. [Custom Elements — пользовательские элементы](#1-custom-elements--пользовательские-элементы)
2. [Lifecycle — жизненный цикл компонента](#2-lifecycle--жизненный-цикл-компонента)
3. [Shadow DOM — теневой DOM](#3-shadow-dom--теневой-dom)
4. [Templates — шаблоны](#4-templates--шаблоны)
5. [Slots — слоты контента](#5-slots--слоты-контента)
6. [Custom Element Registries — реестры элементов](#6-custom-element-registries--реестры-элементов)
7. [Form-Associated Custom Elements — элементы форм](#7-form-associated-custom-elements--элементы-форм)
8. [Declarative Shadow DOM — декларативный Shadow DOM](#8-declarative-shadow-dom--декларативный-shadow-dom)
9. [CSS Scoping — области видимости CSS](#9-css-scoping--области-видимости-css)
10. [Практические паттерны — архитектура и интеграция](#10-практические-паттерны--архитектура-и-интеграция)

---

## 1. Custom Elements — пользовательские элементы

### 1.1. Основы Custom Elements

Custom Elements — API браузера, позволяющий определять новые HTML-элементы с собственным поведением. Это один из трёх столпов Web Components (наряду с Shadow DOM и HTML Templates).

Спецификация: **HTML Living Standard, Section 4.13 Custom Elements**.

### 1.2. Определение Custom Element

```html
<script>
  class MyCounter extends HTMLElement {
    #count = 0;

    constructor() {
      super(); // ОБЯЗАТЕЛЬНО первым вызовом

      // ❌ Нельзя в constructor:
      // - Обращаться к атрибутам (getAttribute)
      // - Добавлять дочерние элементы (appendChild)
      // - Подключать Shadow DOM с содержимым, зависящим от атрибутов

      // ✅ Можно в constructor:
      // - Инициализировать приватное состояние
      // - Подключить Shadow DOM (пустой)
      // - Установить обработчики событий на сам элемент (this)
      this.attachShadow({ mode: 'open' });
    }

    // Какие атрибуты отслеживать
    static get observedAttributes() {
      return ['initial', 'step', 'max'];
    }

    // Элемент добавлен в документ
    connectedCallback() {
      this.#count = parseInt(this.getAttribute('initial') || '0', 10);
      this.#render();
    }

    // Элемент удалён из документа
    disconnectedCallback() {
      // Очистка: отключение обработчиков, observers, intervals
      console.log('Counter disconnected');
    }

    // Атрибут изменён
    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;

      switch (name) {
        case 'initial':
          this.#count = parseInt(newValue, 10);
          this.#render();
          break;
        case 'step':
        case 'max':
          this.#render();
          break;
      }
    }

    // Элемент перемещён в новый документ (adoptNode)
    adoptedCallback() {
      console.log('Counter adopted into new document');
    }

    get count() {
      return this.#count;
    }

    #increment() {
      const step = parseInt(this.getAttribute('step') || '1', 10);
      const max = parseInt(this.getAttribute('max') || 'Infinity', 10);
      if (this.#count + step <= max) {
        this.#count += step;
        this.#render();
        this.dispatchEvent(new CustomEvent('count-changed', {
          detail: { count: this.#count },
          bubbles: true,
          composed: true // Пробивает Shadow DOM boundary
        }));
      }
    }

    #render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-family: system-ui;
          }
          button {
            padding: 4px 12px;
            cursor: pointer;
            border: 1px solid #ccc;
            border-radius: 4px;
            background: #f5f5f5;
          }
          button:hover { background: #e0e0e0; }
          span { min-width: 2em; text-align: center; font-variant-numeric: tabular-nums; }
        </style>
        <button id="inc">+</button>
        <span>${this.#count}</span>
      `;

      this.shadowRoot.getElementById('inc')
        .addEventListener('click', () => this.#increment());
    }
  }

  // Регистрация элемента
  customElements.define('my-counter', MyCounter);
</script>

<!-- Использование -->
<my-counter initial="10" step="5" max="100"></my-counter>
```

### 1.3. Правила именования

Custom Elements **обязаны** содержать дефис в имени тега:

```html
<!-- ✅ Корректные имена -->
<my-component></my-component>
<app-header></app-header>
<x-button></x-button>
<super-hero-card></super-hero-card>

<!-- ❌ Некорректные имена -->
<mycomponent></mycomponent>     <!-- Нет дефиса -->
<Component></Component>          <!-- Нет дефиса + заглавная -->
<font-face></font-face>          <!-- Зарезервированное имя -->
```

**Зарезервированные имена** (нельзя использовать):
`annotation-xml`, `color-profile`, `font-face`, `font-face-src`, `font-face-uri`, `font-face-format`, `font-face-name`, `missing-glyph`

### 1.4. Autonomous vs Customized Built-in Elements

```javascript
// Autonomous Custom Element — полностью новый элемент
class MyButton extends HTMLElement {
  connectedCallback() {
    this.setAttribute('role', 'button');
    this.setAttribute('tabindex', '0');
    // Нужно вручную реализовать всё поведение кнопки
  }
}
customElements.define('my-button', MyButton);
// Использование: <my-button>Click</my-button>

// Customized Built-in Element — расширение существующего
class FancyButton extends HTMLButtonElement {
  connectedCallback() {
    this.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
    this.style.color = 'white';
  }
}
customElements.define('fancy-button', FancyButton, { extends: 'button' });
// Использование: <button is="fancy-button">Click</button>
```

> **Критически важно:** Safari/WebKit НЕ поддерживает Customized Built-in Elements (`is=""`) и не планирует реализовывать. Apple считает этот подход архитектурно неверным. Для кросс-браузерной совместимости используйте только Autonomous Custom Elements.

---

## 2. Lifecycle — жизненный цикл компонента

### 2.1. Порядок вызова Lifecycle Callbacks

```
1. constructor()
   ↓ (элемент создан, но не в DOM)
2. attributeChangedCallback()  ← вызывается для начальных атрибутов
   ↓ (если атрибуты заданы в HTML)
3. connectedCallback()
   ↓ (элемент вставлен в DOM)
4. attributeChangedCallback()  ← при последующих изменениях атрибутов
   ↓
5. disconnectedCallback()
   ↓ (элемент удалён из DOM)
6. adoptedCallback()  ← при adoptNode (редко)
```

### 2.2. Правила constructor

Строгие ограничения спецификации для `constructor()`:

| Правило | Описание |
|---------|----------|
| Вызов `super()` | Обязательно первым оператором |
| Не возвращать ничего | Только implicit `this` |
| Не использовать `document.write()` / `document.open()` | Запрещено |
| Не инспектировать атрибуты/children | Могут быть ещё не доступны (upgrade) |
| Не добавлять children/атрибуты | Нарушает ожидания парсера |

```javascript
class MyElement extends HTMLElement {
  constructor() {
    // ❌ Ошибка: super() не первый
    // this.value = 0;
    // super();

    super(); // ✅ Первым!

    // ✅ Можно: инициализировать состояние
    this._data = null;

    // ✅ Можно: подключить shadow DOM
    this.attachShadow({ mode: 'open' });

    // ✅ Можно: добавить обработчики на this
    this.addEventListener('click', this._onClick);

    // ❌ Нельзя: читать атрибуты
    // const value = this.getAttribute('value');

    // ❌ Нельзя: добавлять children
    // this.innerHTML = '<p>Hello</p>';
  }
}
```

### 2.3. Процесс Upgrade

Когда браузер встречает неизвестный тег в HTML, он создаёт `HTMLUnknownElement`. После вызова `customElements.define()` происходит **upgrade** — элемент «обновляется» до Custom Element:

```html
<!-- Парсер встречает тег ДО регистрации класса -->
<my-widget data-id="42">Content</my-widget>

<!-- На этом этапе my-widget — это HTMLUnknownElement -->
<!-- :not(:defined) стили применяются -->

<script>
  // После define() происходит upgrade:
  // 1. Вызывается constructor()
  // 2. Вызывается attributeChangedCallback('data-id', null, '42')
  // 3. Вызывается connectedCallback()
  customElements.define('my-widget', MyWidget);
</script>
```

### 2.4. :defined и :not(:defined)

```css
/* Элемент ещё не зарегистрирован (или undefined) */
my-widget:not(:defined) {
  /* Скрыть до инициализации — предотвращает FOUC */
  display: block;
  min-height: 100px;
  background: #f0f0f0;
  opacity: 0;
}

/* Элемент зарегистрирован и upgraded */
my-widget:defined {
  opacity: 1;
  transition: opacity 0.3s ease;
}
```

### 2.5. connectedCallback — подводные камни

```javascript
class MyComponent extends HTMLElement {
  connectedCallback() {
    // ⚠️ connectedCallback может быть вызван НЕСКОЛЬКО РАЗ
    // (при перемещении элемента в DOM)
    // Используйте флаг для одноразовой инициализации

    if (!this._initialized) {
      this._initialized = true;
      this._setup();
    }

    // ⚠️ Children могут быть ещё не доступны при upgrade
    // (парсер ещё не обработал дочерние элементы)
    console.log(this.children.length); // Может быть 0!

    // ✅ Отложите доступ к children
    requestAnimationFrame(() => {
      console.log(this.children.length); // Теперь доступны
    });

    // Или используйте MutationObserver для отслеживания
  }

  disconnectedCallback() {
    // Очистка ресурсов
    this._observer?.disconnect();
    clearInterval(this._timer);
    this._abortController?.abort();
  }
}
```

---

## 3. Shadow DOM — теневой DOM

### 3.1. Концепция инкапсуляции

Shadow DOM обеспечивает инкапсуляцию DOM и CSS. Элементы и стили внутри Shadow DOM изолированы от основного документа.

```javascript
class MyCard extends HTMLElement {
  constructor() {
    super();

    // mode: 'open' — shadowRoot доступен через element.shadowRoot
    const shadow = this.attachShadow({ mode: 'open' });

    shadow.innerHTML = `
      <style>
        /* Эти стили НЕ влияют на основной документ */
        p { color: blue; margin: 0; }
        .title { font-size: 1.2em; font-weight: bold; }
      </style>
      <div class="card">
        <p class="title"><slot name="title">Default Title</slot></p>
        <p><slot>Default content</slot></p>
      </div>
    `;
  }
}
customElements.define('my-card', MyCard);
```

### 3.2. Open vs Closed Shadow DOM

```javascript
// Open: shadowRoot доступен извне
const open = this.attachShadow({ mode: 'open' });
// element.shadowRoot === open  ✅

// Closed: shadowRoot недоступен извне
const closed = this.attachShadow({ mode: 'closed' });
// element.shadowRoot === null  ✅
// Только внутренний код компонента имеет ссылку на closed
```

| Аспект | `mode: 'open'` | `mode: 'closed'` |
|--------|----------------|-------------------|
| `element.shadowRoot` | Возвращает ShadowRoot | Возвращает `null` |
| DevTools | Показывает содержимое | Показывает содержимое (DevTools игнорирует closed) |
| Практика | Рекомендуется в большинстве случаев | Ложное чувство безопасности |
| Доступ из JS | `element.shadowRoot.querySelector(...)` | Только через внутреннюю ссылку |

> **Реальность:** `mode: 'closed'` не обеспечивает настоящей безопасности. Существуют способы обойти закрытый Shadow DOM (перехват `attachShadow`, `Element.prototype`). Google использует closed mode для встроенных элементов (`<video>`, `<input>`), но для пользовательских компонентов рекомендуется `open`.

### 3.3. Инкапсуляция стилей

```html
<!-- Внешние стили НЕ проникают в Shadow DOM -->
<style>
  p { color: red; font-size: 24px; }
  .card { background: yellow; }
</style>

<my-card>
  <!-- p внутри shadow root будет blue, не red -->
  <!-- .card внутри shadow root НЕ получит жёлтый фон -->
</my-card>

<!-- НО! Наследуемые свойства проникают через boundary: -->
<!-- font-family, color (если не переопределён), line-height, и т.д. -->
<!-- наследуются от host-элемента -->
```

**Что проникает через Shadow DOM boundary:**

| Проникает | Не проникает |
|-----------|-------------|
| Наследуемые CSS-свойства (`color`, `font-family`, `line-height`, `direction`) | Ненаследуемые свойства (`margin`, `padding`, `border`, `background`) |
| CSS Custom Properties (`--my-var`) | Обычные CSS-селекторы (`.class`, `#id`, `tag`) |
| `all: initial` сбрасывает наследование | `@keyframes` из внешнего документа |

### 3.4. ::part() — стилизация извне

```javascript
class MyAlert extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        .container { padding: 16px; border-radius: 8px; }
        .icon { margin-right: 8px; }
      </style>
      <div class="container" part="container">
        <span class="icon" part="icon">⚠️</span>
        <span part="message"><slot></slot></span>
      </div>
    `;
  }
}
customElements.define('my-alert', MyAlert);
```

```css
/* Внешние стили могут целить в part */
my-alert::part(container) {
  background: #fff3cd;
  border: 1px solid #ffc107;
}

my-alert::part(icon) {
  font-size: 1.5em;
}

my-alert::part(message) {
  font-weight: 500;
}

/* ❌ Нельзя: селекторы после ::part() */
my-alert::part(container) .inner { }  /* Не работает */
my-alert::part(container):hover { }   /* ✅ Работает! Псевдоклассы — можно */
```

### 3.5. ::slotted() — стилизация распределённых элементов

```css
/* Внутри Shadow DOM */

/* Стилизация элементов, переданных через slot */
::slotted(p) {
  color: darkblue;
  margin: 0;
}

::slotted(.highlight) {
  background: yellow;
}

/* ⚠️ Ограничение: только direct children хоста */
::slotted(div > p) { }   /* ❌ Не работает — составные селекторы запрещены */
::slotted(div p) { }      /* ❌ Не работает — потомки запрещены */
::slotted(p) { }           /* ✅ Только простые селекторы */
::slotted(.cls) { }        /* ✅ Класс — OK */
::slotted([attr]) { }      /* ✅ Атрибут — OK */
```

---

## 4. Templates — шаблоны

### 4.1. Элемент template

`<template>` содержит HTML-фрагмент, который не рендерится и не выполняется до клонирования:

```html
<template id="card-template">
  <style>
    .card {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 16px;
      margin: 8px;
    }
    .card-title {
      font-size: 1.2em;
      font-weight: bold;
      margin-bottom: 8px;
    }
  </style>
  <div class="card">
    <h2 class="card-title"></h2>
    <p class="card-body"></p>
    <slot name="actions"></slot>
  </div>
</template>

<script>
  class ProductCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });

      // Клонирование template
      const template = document.getElementById('card-template');
      const content = template.content.cloneNode(true); // deep clone

      this.shadowRoot.appendChild(content);
    }

    connectedCallback() {
      const title = this.getAttribute('title') || 'Untitled';
      const body = this.getAttribute('body') || '';

      this.shadowRoot.querySelector('.card-title').textContent = title;
      this.shadowRoot.querySelector('.card-body').textContent = body;
    }
  }

  customElements.define('product-card', ProductCard);
</script>

<!-- Использование -->
<product-card title="Ноутбук ProMax" body="Мощный ноутбук для разработчиков">
  <button slot="actions">Купить</button>
</product-card>
```

### 4.2. DocumentFragment — content

`template.content` возвращает `DocumentFragment` — легковесный контейнер DOM-узлов:

```javascript
const template = document.getElementById('my-template');

// template.content — это DocumentFragment
console.log(template.content instanceof DocumentFragment); // true

// Клонирование для переиспользования
const clone1 = template.content.cloneNode(true);
const clone2 = template.content.cloneNode(true);

// ⚠️ Без cloneNode:
// document.body.appendChild(template.content);
// ПЕРЕМЕЩАЕТ содержимое (template станет пустым)
// При следующем обращении template.content будет пуст

// ✅ С cloneNode(true):
// Создаёт глубокую копию, оригинал не изменяется
document.body.appendChild(template.content.cloneNode(true));
```

### 4.3. Template с JavaScript-данными

```javascript
class DataTable extends HTMLElement {
  #data = [];

  set data(value) {
    this.#data = value;
    this.#render();
  }

  get data() {
    return this.#data;
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.#render();
  }

  #render() {
    const rowTemplate = document.createElement('template');
    rowTemplate.innerHTML = `
      <tr>
        <td class="name"></td>
        <td class="value"></td>
      </tr>
    `;

    this.shadowRoot.innerHTML = `
      <style>
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 8px 12px; border: 1px solid #ddd; text-align: left; }
        th { background: #f5f5f5; }
        tr:hover { background: #f0f7ff; }
      </style>
      <table>
        <thead>
          <tr>
            <th>Название</th>
            <th>Значение</th>
          </tr>
        </thead>
        <tbody id="body"></tbody>
      </table>
    `;

    const tbody = this.shadowRoot.getElementById('body');
    for (const item of this.#data) {
      const row = rowTemplate.content.cloneNode(true);
      row.querySelector('.name').textContent = item.name;
      row.querySelector('.value').textContent = item.value;
      tbody.appendChild(row);
    }
  }
}

customElements.define('data-table', DataTable);
```

---

## 5. Slots — слоты контента

### 5.1. Named Slots и Default Slot

```html
<template id="layout-template">
  <style>
    .layout { display: grid; grid-template-rows: auto 1fr auto; min-height: 100vh; }
    header { background: #333; color: white; padding: 16px; }
    main { padding: 24px; }
    footer { background: #f5f5f5; padding: 16px; text-align: center; }
  </style>
  <div class="layout">
    <header>
      <!-- Named slot: только элементы с slot="header" попадут сюда -->
      <slot name="header">Default Header</slot>
    </header>
    <main>
      <!-- Default slot: все элементы без slot="" попадут сюда -->
      <slot></slot>
    </main>
    <footer>
      <slot name="footer">&copy; 2026</slot>
    </footer>
  </div>
</template>

<!-- Использование -->
<app-layout>
  <!-- Попадёт в slot name="header" -->
  <nav slot="header">
    <a href="/">Home</a>
    <a href="/about">About</a>
  </nav>

  <!-- Попадёт в default slot (нет атрибута slot) -->
  <h1>Заголовок страницы</h1>
  <p>Основной контент</p>

  <!-- Попадёт в slot name="footer" -->
  <p slot="footer">Подвал страницы &copy; 2026</p>
</app-layout>
```

### 5.2. Fallback Content (содержимое по умолчанию)

```html
<template>
  <div>
    <!-- Если в слот ничего не передано, показывается fallback -->
    <slot name="icon">
      <span class="default-icon">📦</span>
    </slot>
    <slot>
      <p>Нет содержимого</p>
    </slot>
  </div>
</template>
```

### 5.3. Событие slotchange

```javascript
class SlotWatcher extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <div>
        <slot></slot>
      </div>
    `;

    // Отслеживание изменений в слоте
    const slot = this.shadowRoot.querySelector('slot');

    slot.addEventListener('slotchange', (e) => {
      const assigned = slot.assignedNodes({ flatten: true });
      console.log('Slot content changed:', assigned);
      console.log('Number of nodes:', assigned.length);

      // assignedElements — только Element-узлы (без текстовых)
      const elements = slot.assignedElements({ flatten: true });
      console.log('Elements:', elements);
    });
  }
}
```

### 5.4. Composed Path и события

```javascript
// События, генерируемые внутри Shadow DOM
class MyButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <button id="inner-btn">
        <slot>Click me</slot>
      </button>
    `;

    // Клик внутри Shadow DOM
    this.shadowRoot.getElementById('inner-btn').addEventListener('click', (e) => {
      // composedPath() показывает полный путь, включая shadow boundaries
      console.log(e.composedPath());
      // [button#inner-btn, ShadowRoot, my-button, body, html, document, Window]

      console.log(e.composed); // true — для встроенных событий (click, focus...)
    });
  }
}

// ⚠️ Кастомные события по умолчанию НЕ пересекают Shadow DOM boundary
this.dispatchEvent(new CustomEvent('my-event', {
  bubbles: true,
  composed: false // ❌ Событие останется внутри Shadow DOM
}));

this.dispatchEvent(new CustomEvent('my-event', {
  bubbles: true,
  composed: true // ✅ Событие пробьёт Shadow DOM boundary
}));
```

| Свойство | Описание |
|----------|----------|
| `bubbles: true` | Событие всплывает по DOM-дереву |
| `composed: true` | Событие пересекает Shadow DOM boundary |
| `cancelable: true` | Событие можно отменить через `preventDefault()` |

---

## 6. Custom Element Registries — реестры элементов

### 6.1. customElements API

```javascript
// Регистрация
customElements.define('my-element', MyElement);

// Регистрация с extends (Customized Built-in)
customElements.define('fancy-button', FancyButton, { extends: 'button' });

// Получение класса по имени
const MyElementClass = customElements.get('my-element');
// MyElementClass === MyElement

// Проверка, что элемент не зарегистрирован
if (!customElements.get('my-element')) {
  customElements.define('my-element', MyElement);
}

// Получение имени по классу
const name = customElements.getName(MyElement);
// name === 'my-element'

// Ожидание регистрации элемента
customElements.whenDefined('my-element').then(() => {
  console.log('my-element теперь определён');
  // Безопасно создавать экземпляры
  const el = document.createElement('my-element');
});

// С async/await
async function waitForElement() {
  await customElements.whenDefined('my-element');
  // Элемент готов к использованию
}
```

### 6.2. Upgrade элементов

```javascript
// Элемент уже в DOM, но ещё не зарегистрирован
const el = document.querySelector('my-widget');
console.log(el instanceof HTMLElement); // true
console.log(el instanceof MyWidget);    // false (ещё не upgraded)

// Регистрация класса — все существующие экземпляры будут upgraded
customElements.define('my-widget', MyWidget);
console.log(el instanceof MyWidget); // true ✅

// Принудительный upgrade
const el2 = document.createElement('my-widget');
// el2 ещё не upgraded (не в DOM, define уже вызван, но createElement не upgrade-ит)
customElements.upgrade(el2); // Принудительный upgrade
console.log(el2 instanceof MyWidget); // true
```

### 6.3. Scoped Custom Element Registries (предложение)

На стадии предложения находится API для создания изолированных реестров:

```javascript
// ⚠️ Экспериментальный API (Scoped Custom Element Registries)
// Позволяет разным Shadow DOM деревьям иметь разные определения элементов

const registry = new CustomElementRegistry();
registry.define('my-button', MyButtonV2);

const shadow = this.attachShadow({
  mode: 'open',
  customElements: registry // Scoped registry для этого Shadow DOM
});

// Внутри этого Shadow DOM 'my-button' — это MyButtonV2
// В глобальном DOM 'my-button' может быть MyButtonV1 или вообще не определён
```

> **Статус:** Scoped Custom Element Registries — это предложение (proposal), находящееся на стадии обсуждения. Chrome имеет экспериментальную реализацию за флагом. Это решает критическую проблему конфликтов имён при использовании micro-frontends.

---

## 7. Form-Associated Custom Elements — элементы форм

### 7.1. Концепция

Form-Associated Custom Elements позволяют создавать кастомные элементы, которые участвуют в HTML-формах наравне с нативными `<input>`, `<select>`, `<textarea>`.

### 7.2. ElementInternals API

```javascript
class RatingInput extends HTMLElement {
  // Обязательный статический флаг
  static formAssociated = true;

  #internals;
  #value = 0;

  constructor() {
    super();
    // Получаем ElementInternals
    this.#internals = this.attachInternals();
    this.attachShadow({ mode: 'open' });
  }

  // Form lifecycle callbacks
  formAssociatedCallback(form) {
    console.log('Присоединён к форме:', form.id);
  }

  formDisabledCallback(disabled) {
    console.log('Disabled:', disabled);
    this.shadowRoot.querySelectorAll('button').forEach(btn => {
      btn.disabled = disabled;
    });
  }

  formResetCallback() {
    console.log('Форма сброшена');
    this.#value = 0;
    this.#internals.setFormValue('');
    this.#render();
  }

  formStateRestoreCallback(state, mode) {
    // mode: 'restore' (навигация назад/вперёд) или 'autocomplete'
    console.log('Восстановление состояния:', state, mode);
    this.#value = parseInt(state, 10);
    this.#internals.setFormValue(state);
    this.#render();
  }

  connectedCallback() {
    this.#render();
  }

  static get observedAttributes() {
    return ['required', 'name'];
  }

  get value() { return this.#value; }

  set value(val) {
    this.#value = val;
    this.#internals.setFormValue(String(val));
    this.#updateValidity();
    this.#render();
  }

  #updateValidity() {
    if (this.hasAttribute('required') && this.#value === 0) {
      this.#internals.setValidity(
        { valueMissing: true },
        'Пожалуйста, выберите рейтинг',
        this.shadowRoot.querySelector('.stars')
      );
    } else {
      this.#internals.setValidity({});
    }
  }

  #render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: inline-block; }
        .stars { display: flex; gap: 4px; }
        button {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          filter: grayscale(100%);
          transition: filter 0.2s;
        }
        button.active { filter: grayscale(0%); }
        button:hover { transform: scale(1.2); }
        button:disabled { cursor: not-allowed; opacity: 0.5; }
      </style>
      <div class="stars" role="radiogroup" aria-label="Рейтинг">
        ${[1, 2, 3, 4, 5].map(i => `
          <button
            type="button"
            class="${i <= this.#value ? 'active' : ''}"
            aria-label="${i} ${i === 1 ? 'звезда' : i < 5 ? 'звезды' : 'звёзд'}"
            role="radio"
            aria-checked="${i === this.#value}"
          >⭐</button>
        `).join('')}
      </div>
    `;

    this.shadowRoot.querySelectorAll('button').forEach((btn, index) => {
      btn.addEventListener('click', () => {
        this.value = index + 1;
        this.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  // Доступ к связанной форме и label-ам
  get form() { return this.#internals.form; }
  get labels() { return this.#internals.labels; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  get willValidate() { return this.#internals.willValidate; }

  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }
}

customElements.define('rating-input', RatingInput);
```

```html
<form id="review-form">
  <label for="rating">Ваша оценка:</label>
  <rating-input id="rating" name="rating" required></rating-input>

  <button type="submit">Отправить</button>
  <button type="reset">Сбросить</button>
</form>

<script>
  document.getElementById('review-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    console.log('Rating:', formData.get('rating'));
    // Кастомный элемент участвует в FormData!
  });
</script>
```

### 7.3. ElementInternals — полный API

| Метод / Свойство | Описание |
|------------------|----------|
| `setFormValue(value, state?)` | Устанавливает значение для FormData |
| `setValidity(flags, message?, anchor?)` | Устанавливает состояние валидности |
| `form` | Ссылка на родительскую форму |
| `labels` | NodeList связанных `<label>` |
| `validity` | ValidityState объект |
| `validationMessage` | Текст ошибки валидации |
| `willValidate` | Будет ли участвовать в валидации |
| `checkValidity()` | Проверяет валидность (без UI) |
| `reportValidity()` | Проверяет валидность (с UI) |
| `shadowRoot` | Ссылка на ShadowRoot (даже для closed) |
| `states` | CustomStateSet для кастомных CSS-состояний |
| `ariaLabel`, `ariaDescribedBy`... | ARIA-свойства через IDL |

---

## 8. Declarative Shadow DOM — декларативный Shadow DOM

### 8.1. Проблема SSR

Традиционный Shadow DOM требует JavaScript для инициализации (`attachShadow()`). Это создаёт проблему для Server-Side Rendering (SSR), где HTML должен содержать весь контент до выполнения JS.

### 8.2. Синтаксис Declarative Shadow DOM

```html
<!-- Shadow DOM объявлен декларативно в HTML -->
<my-card>
  <template shadowrootmode="open">
    <style>
      .card { padding: 16px; border: 1px solid #ddd; border-radius: 8px; }
      ::slotted(h2) { color: navy; }
    </style>
    <div class="card">
      <slot name="title"></slot>
      <slot></slot>
    </div>
  </template>

  <!-- Light DOM контент -->
  <h2 slot="title">Заголовок карточки</h2>
  <p>Содержимое карточки</p>
</my-card>
```

**Как это работает:**

1. HTML-парсер встречает `<template shadowrootmode="open">`
2. Создаёт Shadow Root для родительского элемента
3. Содержимое template перемещается в Shadow Root
4. Template-элемент удаляется из DOM
5. Всё происходит **без JavaScript**

### 8.3. Hydration — активация компонента

```html
<!-- Сервер отдаёт HTML с Declarative Shadow DOM -->
<toggle-button>
  <template shadowrootmode="open">
    <style>
      button { padding: 8px 16px; border-radius: 4px; }
      :host([pressed]) button { background: #4A90D9; color: white; }
    </style>
    <button><slot></slot></button>
  </template>
  Переключить
</toggle-button>

<script>
  // Hydration: JS подключает интерактивность к уже отрендеренному DOM
  class ToggleButton extends HTMLElement {
    constructor() {
      super();

      // Shadow Root уже существует (создан парсером)
      // НЕ вызываем attachShadow() повторно!

      if (this.shadowRoot) {
        // Hydration — подключаем обработчики к существующему Shadow DOM
        this._hydrateExistingShadow();
      } else {
        // Client-side rendering — создаём Shadow DOM программно
        this.attachShadow({ mode: 'open' });
        this._render();
      }
    }

    _hydrateExistingShadow() {
      const button = this.shadowRoot.querySelector('button');
      button.addEventListener('click', () => this.toggle());
    }

    _render() {
      // Полный рендер для CSR
      this.shadowRoot.innerHTML = `...`;
    }

    toggle() {
      this.toggleAttribute('pressed');
    }
  }

  customElements.define('toggle-button', ToggleButton);
</script>
```

### 8.4. Сериализация для SSR

```javascript
// Метод getHTML() для сериализации Shadow DOM
const element = document.querySelector('my-card');
const html = element.getHTML({ serializableShadowRoots: true });
// Возвращает HTML с <template shadowrootmode="open">

// Или для конкретных Shadow Roots
const html2 = element.getHTML({
  shadowRoots: [element.shadowRoot]
});
```

### 8.5. shadowrootclonable и shadowrootdelegatesfocus

```html
<!-- Клонируемый Shadow DOM -->
<my-element>
  <template shadowrootmode="open" shadowrootclonable>
    <!-- При cloneNode(true) Shadow DOM тоже клонируется -->
    <p>Клонируемый контент</p>
  </template>
</my-element>

<!-- Shadow DOM с делегированием фокуса -->
<my-input>
  <template shadowrootmode="open" shadowrootdelegatesfocus>
    <!-- Фокус на host-элементе делегируется первому фокусируемому внутри -->
    <input type="text" placeholder="Введите текст">
  </template>
</my-input>
```

---

## 9. CSS Scoping — области видимости CSS

### 9.1. :host — стилизация хост-элемента

```css
/* Базовые стили хост-элемента */
:host {
  display: block;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-family: system-ui, sans-serif;
}

/* ⚠️ Стили :host имеют НИЗКУЮ специфичность */
/* Внешние стили МОГУТ переопределить :host */
/* my-card { display: none; } — победит :host { display: block; } */
```

### 9.2. :host() — условная стилизация

```css
/* Стили, когда хост имеет определённый атрибут/класс */
:host([variant="primary"]) {
  background: #4A90D9;
  color: white;
}

:host([variant="danger"]) {
  background: #D94A4A;
  color: white;
}

:host([disabled]) {
  opacity: 0.5;
  pointer-events: none;
}

:host(:hover) {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:host(:focus-within) {
  outline: 2px solid #4A90D9;
  outline-offset: 2px;
}

/* Размерные варианты */
:host([size="small"]) { padding: 8px; font-size: 0.875rem; }
:host([size="large"]) { padding: 24px; font-size: 1.125rem; }
```

### 9.3. :host-context() — контекстная стилизация

```css
/* Стили зависят от контекста (родительских элементов) */

/* Если компонент внутри .dark-theme */
:host-context(.dark-theme) {
  background: #2a2a2a;
  color: #e0e0e0;
  border-color: #444;
}

/* Если компонент внутри form.error */
:host-context(form.error) {
  border-color: red;
}

/* Если компонент внутри элемента с dir="rtl" */
:host-context([dir="rtl"]) {
  direction: rtl;
  text-align: right;
}
```

> **Важно:** `:host-context()` имеет ограниченную поддержку. Firefox долгое время не реализовывал его. Проверяйте поддержку перед использованием. Альтернатива — CSS Custom Properties для темизации.

### 9.4. CSS Custom Properties — проникновение через Shadow DOM

```css
/* Внешний документ: определение переменных */
:root {
  --primary-color: #4A90D9;
  --border-radius: 8px;
  --font-family: 'Inter', system-ui, sans-serif;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
}

.dark-theme {
  --primary-color: #6BB5FF;
  --bg-color: #1a1a1a;
  --text-color: #e0e0e0;
}
```

```css
/* Внутри Shadow DOM: использование переменных */
:host {
  /* CSS Custom Properties НАСЛЕДУЮТСЯ через Shadow DOM boundary */
  font-family: var(--font-family, system-ui);
  color: var(--text-color, #1a1a1a);
  background: var(--bg-color, white);
}

.button {
  background: var(--primary-color, blue);
  border-radius: var(--border-radius, 4px);
  padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
}
```

> **Best practice:** CSS Custom Properties — это рекомендуемый способ темизации Web Components. Определите «API» из custom properties и документируйте их.

### 9.5. Adoptable Stylesheets — разделяемые стили

```javascript
// Создание разделяемого стиля
const sharedStyles = new CSSStyleSheet();
sharedStyles.replaceSync(`
  :host {
    display: block;
    box-sizing: border-box;
  }
  *, *::before, *::after {
    box-sizing: inherit;
  }
`);

const buttonStyles = new CSSStyleSheet();
buttonStyles.replaceSync(`
  button {
    padding: 8px 16px;
    border: 1px solid currentColor;
    border-radius: 4px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font: inherit;
  }
  button:hover {
    opacity: 0.8;
  }
`);

class MyButton extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    // Подключение разделяемых стилей
    shadow.adoptedStyleSheets = [sharedStyles, buttonStyles];

    shadow.innerHTML = `<button><slot></slot></button>`;
  }
}

// Стили разделяются между экземплярами — экономия памяти
// Обновление стиля отражается на всех компонентах
// sharedStyles.replaceSync('...'); — обновит все
```

---

## 10. Практические паттерны — архитектура и интеграция

### 10.1. Паттерн компонента Design System

```javascript
// Базовый класс для компонентов дизайн-системы
class DSElement extends HTMLElement {
  static styles = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    if (!this._rendered) {
      this._rendered = true;
      this.shadowRoot.innerHTML = `
        <style>${this.constructor.styles}</style>
        ${this.render()}
      `;
      this.hydrate();
    }
  }

  // Переопределяется в подклассах
  render() { return ''; }
  hydrate() {}

  // Утилиты
  $(selector) { return this.shadowRoot.querySelector(selector); }
  $$(selector) { return this.shadowRoot.querySelectorAll(selector); }

  emit(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true
    }));
  }
}

// Конкретный компонент
class DSButton extends DSElement {
  static styles = `
    :host { display: inline-block; }
    :host([disabled]) { opacity: 0.5; pointer-events: none; }
    button {
      all: unset;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: var(--ds-button-padding, 8px 16px);
      background: var(--ds-button-bg, var(--ds-primary, #4A90D9));
      color: var(--ds-button-color, white);
      border-radius: var(--ds-button-radius, 4px);
      cursor: pointer;
      font: inherit;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    button:focus-visible {
      outline: 2px solid var(--ds-focus-color, #4A90D9);
      outline-offset: 2px;
    }
    :host([variant="secondary"]) button {
      background: transparent;
      color: var(--ds-primary, #4A90D9);
      box-shadow: inset 0 0 0 1px currentColor;
    }
    :host([size="small"]) button { padding: 4px 12px; font-size: 0.875rem; }
    :host([size="large"]) button { padding: 12px 24px; font-size: 1.125rem; }
  `;

  static get observedAttributes() {
    return ['disabled'];
  }

  render() {
    return `
      <button part="button" ${this.hasAttribute('disabled') ? 'disabled' : ''}>
        <slot name="prefix"></slot>
        <slot></slot>
        <slot name="suffix"></slot>
      </button>
    `;
  }

  hydrate() {
    this.$('button').addEventListener('click', () => {
      if (!this.hasAttribute('disabled')) {
        this.emit('ds-click');
      }
    });
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'disabled') {
      const button = this.$('button');
      if (button) {
        button.disabled = newValue !== null;
      }
    }
  }
}

customElements.define('ds-button', DSButton);
```

```html
<!-- Использование дизайн-системы -->
<ds-button>Основная кнопка</ds-button>
<ds-button variant="secondary">Вторичная кнопка</ds-button>
<ds-button size="small" disabled>Маленькая отключённая</ds-button>
<ds-button size="large">
  <svg slot="prefix" width="16" height="16">...</svg>
  С иконкой
</ds-button>
```

### 10.2. Интеграция с React

```jsx
// React wrapper для Web Component
import { useRef, useEffect } from 'react';

function DSButtonReact({ children, variant, size, disabled, onClick, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    if (onClick) {
      element.addEventListener('ds-click', onClick);
      return () => element.removeEventListener('ds-click', onClick);
    }
  }, [onClick]);

  return (
    <ds-button
      ref={ref}
      variant={variant}
      size={size}
      disabled={disabled || undefined}
      {...props}
    >
      {children}
    </ds-button>
  );
}

// Использование в React
function App() {
  return (
    <DSButtonReact
      variant="primary"
      onClick={() => console.log('Clicked!')}
    >
      React + Web Component
    </DSButtonReact>
  );
}
```

### 10.3. Ленивая загрузка компонентов

```javascript
// Паттерн: загрузка определения компонента при первом появлении в viewport
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const tagName = entry.target.tagName.toLowerCase();
      loadComponent(tagName);
      observer.unobserve(entry.target);
    }
  }
});

// Наблюдать за неопределёнными элементами
document.querySelectorAll(':not(:defined)').forEach(el => {
  observer.observe(el);
});

async function loadComponent(tagName) {
  const components = {
    'data-chart': () => import('./components/data-chart.js'),
    'video-player': () => import('./components/video-player.js'),
    'code-editor': () => import('./components/code-editor.js'),
  };

  const loader = components[tagName];
  if (loader && !customElements.get(tagName)) {
    await loader();
  }
}
```

### 10.4. Тестирование Web Components

```javascript
// С использованием Web Test Runner или Playwright

// Пример теста
describe('ds-button', () => {
  let element;

  beforeEach(async () => {
    element = document.createElement('ds-button');
    element.textContent = 'Test Button';
    document.body.appendChild(element);
    await customElements.whenDefined('ds-button');
  });

  afterEach(() => {
    element.remove();
  });

  it('renders shadow DOM', () => {
    const button = element.shadowRoot.querySelector('button');
    expect(button).toBeTruthy();
  });

  it('reflects disabled attribute', () => {
    element.setAttribute('disabled', '');
    const button = element.shadowRoot.querySelector('button');
    expect(button.disabled).toBe(true);
  });

  it('dispatches ds-click event', async () => {
    const spy = jasmine.createSpy('ds-click');
    element.addEventListener('ds-click', spy);

    const button = element.shadowRoot.querySelector('button');
    button.click();

    expect(spy).toHaveBeenCalled();
  });

  it('does not dispatch when disabled', () => {
    element.setAttribute('disabled', '');
    const spy = jasmine.createSpy('ds-click');
    element.addEventListener('ds-click', spy);

    const button = element.shadowRoot.querySelector('button');
    button.click();

    expect(spy).not.toHaveBeenCalled();
  });
});
```

### 10.5. Проблемы и решения

| Проблема | Решение |
|----------|---------|
| FOUC (Flash of Unstyled Content) | `:not(:defined) { opacity: 0; }` + `:defined { transition: opacity 0.2s; }` |
| SSR | Declarative Shadow DOM + hydration |
| Конфликты имён | Scoped Custom Element Registries (предложение) или уникальные префиксы |
| Крупные bundle | Ленивая загрузка при пересечении viewport |
| React/Vue интеграция | Обёртки-компоненты или `@lit-labs/react` |
| Доступность | Используйте ARIA, `delegatesFocus`, `ElementInternals` |
| Формы | `static formAssociated = true` + `ElementInternals` |
| Тестирование | Web Test Runner, Playwright, `shadowRoot.querySelector()` |
