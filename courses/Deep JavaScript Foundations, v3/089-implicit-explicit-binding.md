# this: implicit и explicit binding

## 1. Implicit binding

```js
var workshop = {
    teacher: "Kyle",
    ask(question) {
        console.log(this.teacher, question);
    }
};
workshop.ask("What is implicit binding?");   // this -> workshop
```

- **Implicit binding** — `this` определяется **call site** (местом вызова).
- `this` указывает на объект, через который функция вызвана. В `workshop.ask(...)` это `workshop`.
- Самое распространённое и интуитивное правило — так `this` работает и в других языках.

### Шаринг поведения через контексты

```js
function ask(question) {
    console.log(this.teacher, question);
}
var workshop1 = { teacher: "Kyle", ask: ask };
var workshop2 = { teacher: "Suzy", ask: ask };

workshop1.ask("...");   // this -> workshop1
workshop2.ask("...");   // this -> workshop2
```

- Одна функция `ask` используется разными объектами. Implicit binding вызывает её **в разном контексте** каждый раз.
- Одна функция — сколько угодно контекстов (2, 1000, миллион).

### Предсказуемость vs гибкость

- Lexical scope **фиксирован и предсказуем** (определён на этапе написания, runtime его не меняет).
- `this` — **полностью динамичен**, определяется в runtime.
- Это **намеренный trade-off**: выбор между **predictable** и **flexible**. Ни одно не «правильнее» — это разные инструменты с разными преимуществами. Здесь видно преимущество гибкости.

## 2. Explicit binding: .call / .apply

```js
ask.call(workshop1, "...");   // this -> workshop1 (явно)
```

- `.call` и `.apply` принимают первым аргументом объект для `this`.
- Та же шаринг-функция, но контекст задаётся **явно**, а не неявно: «где бы функция ни была, выполни её в указанном контексте».

## Потеря this binding

```js
setTimeout(workshop.ask, 10);   // this -> НЕ workshop
```

- Это явление — **losing your this binding** (потеря привязки `this`).
- Строка `workshop.ask` — **не call site**. Когда таймер сработает, call site будет вида `cb()`, а не `workshop.ask()` → контекст `workshop` теряется, `this` становится другим.
- **Деталь:** `setTimeout` (определён в HTML) фактически вызывает callback через `.call` в контексте global (`cb.call(window)`), так что `this` перепривязывается к global object → получаем `undefined` для `this.teacher`.

## Hard binding: .bind

Под-вариант explicit binding для решения потери `this`.

```js
setTimeout(workshop.ask.bind(workshop), 10);   // this всегда workshop
```

- `.bind` **не вызывает** функцию, а **возвращает новую функцию**, жёстко привязанную к указанному `this`.
- Как бы её потом ни вызвали — `this` всегда будет заданным.
- Это убирает гибкость и делает поведение предсказуемым.

**Замечание про arrow function:** превращение `ask` в arrow function проблему **не** решает (разбирается отдельно).

## Tension: гибкость vs предсказуемость, и эвристика

- Весь смысл `this`-системы (и «налога» в виде `this.` перед каждым обращением) — получить **динамизм**.
- Если затем всё запирать через `.bind`, теряется смысл — проще написать **module на closure** с фиксированным предсказуемым поведением.

**Эвристика автора:**
- Если большинство call sites используют гибкий динамизм, а hard binding нужен изредка — система оправдана, trade-off разумен.
- Если большинство вызовов вынуждены использовать `.bind` — это **сигнал**, что выбран не тот инструмент. Лучше вернуться к **lexical scope / closure**.
- Итог: нужна гибкость — используем `this`; нужна предсказуемость — используем closures / lexical scope.

## Главное

- **Implicit binding:** `this` = объект перед `.` в call site; позволяет шарить одну функцию по многим контекстам.
- **Explicit binding** (`.call`/`.apply`): контекст `this` задаётся явно первым аргументом.
- **Hard binding** (`.bind`): возвращает новую функцию с навсегда зафиксированным `this`; решает «потерю this binding» (например, в `setTimeout`).
- `this` — про гибкость, closure — про предсказуемость; если всюду нужен `.bind`, лучше взять closure.
