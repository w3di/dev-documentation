#### 1. **Что такое Shadow DOM?**

**Shadow DOM** — это технология, которая позволяет создавать инкапсулированные DOM-деревья в веб-компонентах. Она предоставляет способ для веб-разработчиков создавать элементы с полностью изолированными структурами DOM и стилями, не влияя на глобальное DOM-дерево страницы.

- **Shadow host (хост теневого DOM)**: Обычный узел DOM, к которому прикреплен теневой DOM.
- **Shadow tree (теневое дерево)**: Дерево DOM внутри теневого DOM.
- **Shadow boundary (граница теневого DOM)**: Место, где заканчивается теневой DOM и начинается обычный DOM.
- **Shadow root (корень теневого DOM)**: Корневой узел теневого дерева.

![[shadowDom.png.png]]


#### 2. **Проблемы, которые решает Shadow DOM**

Shadow DOM решает две основные проблемы:

- **Инкапсуляция стилей и логики**: HTML и CSS внутри компонента защищены от воздействия внешнего окружения. Это предотвращает такие проблемы, как конфликт стилей и утечка событий в глобальное пространство.
- **Упрощение модульности**: Использование Shadow DOM позволяет создавать более изолированные и повторно используемые компоненты.

#### 3. **Создание Shadow DOM**

Чтобы создать Shadow DOM, используется метод `attachShadow()`:

```js
const shadow = element.attachShadow({ mode: 'open' });
```

**Режимы Shadow DOM:**

- **open**: разработчики могут обращаться к `shadowRoot` через JavaScript.
- **closed**: доступ к `shadowRoot` невозможен за пределами компонента.

#### 4. **Пример создания компонента с Shadow DOM**

```html
<my-element></my-element>

<script>
  class MyElement extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });

      // Создание элементов внутри shadow DOM
      const wrapper = document.createElement('div');
      wrapper.textContent = 'This is in shadow DOM!';

      // Добавление стилей
      const style = document.createElement('style');
      style.textContent = `
        div {
          color: red;
        }
      `;

      shadow.appendChild(style);
      shadow.appendChild(wrapper);
    }
  }

  customElements.define('my-element', MyElement);
</script>

```


Этот пример создает пользовательский элемент `<my-element>`, который является Shadow Host, и который инкапсулирует стили и структуру в своем Shadow DOM.

#### 5. **Инкапсуляция стилей**

Одним из ключевых аспектов Shadow DOM является то, что стили внутри Shadow DOM не влияют на элементы вне его, и наоборот.

```html
<style>
  div {
    color: blue;
  }
</style>

<my-element></my-element>

<script>
  class MyElement extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });

      const wrapper = document.createElement('div');
      wrapper.textContent = 'Shadow DOM';

      const style = document.createElement('style');
      style.textContent = `
        div {
          color: red;
        }
      `;

      shadow.appendChild(style);
      shadow.appendChild(wrapper);
    }
  }

  customElements.define('my-element', MyElement);
</script>

```

**Результат**: текст внутри Shadow DOM будет красного цвета, а глобальный `div` — синего, даже если стили идентичны.

#### 6. **Изоляция событий**

Shadow DOM также изолирует события. События, сгенерированные внутри Shadow DOM, не распространяются на внешнее DOM-дерево, если явно не указать всплытие событий.

```html
<my-element></my-element>

<script>
  class MyElement extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      const button = document.createElement('button');
      button.textContent = 'Click me';
      button.addEventListener('click', () => {
        console.log('Clicked inside Shadow DOM');
      });
      shadow.appendChild(button);
    }
  }

  customElements.define('my-element', MyElement);
</script>

```

Внешние обработчики событий не сработают на события внутри Shadow DOM, если не произойдет явного всплытия событий.

#### 7. **Слоты (Slots) в Shadow DOM**

Слоты позволяют вставлять внешние элементы в Shadow DOM. Это помогает кастомизировать компоненты, сохраняя их инкапсуляцию.

```html
<my-element>
  <p slot="content">This content is projected!</p>
</my-element>

<script>
  class MyElement extends HTMLElement {
    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });

      const wrapper = document.createElement('div');
      wrapper.innerHTML = `
        <slot name="content"></slot>
      `;

      shadow.appendChild(wrapper);
    }
  }

  customElements.define('my-element', MyElement);
</script>
```

Элемент `<p>` будет вставлен в слот внутри компонента.

#### 8. **Преимущества и ограничения Shadow DOM**

##### Преимущества:

- Полная инкапсуляция стилей и поведения.
- Возможность создания независимых, многократно используемых компонентов.
- Улучшение производительности за счет изолирования локального DOM от глобального.

##### Ограничения:

- Не всегда удобно для интеграции со сторонними библиотеками, которые ожидают, что стили и элементы будут доступны глобально.
- Некоторые инструменты тестирования и отладки могут не полностью поддерживать работу с Shadow DOM.

#### 9. **Пример реального использования**

Shadow DOM часто используется в комбинации с веб-компонентами для создания элементов, которые можно легко внедрить на любой веб-странице. Например, Google Maps, YouTube и другие сервисы используют Shadow DOM для инкапсуляции своих виджетов.

#### Заключение

Shadow DOM — это мощная технология, которая значительно улучшает создание модульных, изолированных компонентов. Она позволяет разработчикам избегать проблем, связанных с конфликтом стилей и утечкой событий, и предоставляет инструменты для создания по-настоящему независимых веб-компонентов.