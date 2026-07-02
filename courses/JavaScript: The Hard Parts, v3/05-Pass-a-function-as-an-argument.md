# Часть 5. Передача функции в качестве аргумента

## Идея

- Вместо отдельных функций под каждую операцию создаётся одна обобщённая `copyArrayAndManipulate`, которая не предопределяет, что делать с элементом — это передаётся при вызове как функция.

```js
function copyArrayAndManipulate(array, instructions) {
  const output = [];
  for (let i = 0; i < array.length; i++) {
    output.push(instructions(array[i]));
  }
  return output;
}
function multiplyBy2(input) { return input * 2; }
const result = copyArrayAndManipulate([1, 2, 3], multiplyBy2);
```

- Функциональность (`multiplyBy2`) нельзя передать как строку — её нужно обернуть в функцию.

## Разбор выполнения

1. В global memory сохраняются `copyArrayAndManipulate` и `multiplyBy2` (как F-box-ы). `result` — uninitialized.
   - Для `const` значение остаётся **uninitialized**, а не `undefined`: тип константы нельзя поменять с `undefined` на возвращаемое значение.
2. Вызов `copyArrayAndManipulate([1,2,3], multiplyBy2)` создаёт execution context (на call stack).
   - Передаётся **код** функции `multiplyBy2` (F-box), а не её метка. Метка `multiplyBy2` лишь использовалась, чтобы найти код.
3. В local memory: параметр `array` ← `[1,2,3]`; параметр `instructions` ← код функции (ранее известной как `multiplyBy2`). Внутри функция «теряет» имя `multiplyBy2` и доступна как `instructions`.
4. Объявляется `output = []`.
5. **for loop**, `i` = 0,1,2:
   - `array[i]` evaluates (вычисляется) в число (метка превращается в значение в памяти — ничто во время выполнения не остаётся меткой).
   - `instructions` тоже метка → подставляется код функции. Запуск `instructions(...)` — по **parentheses** `()`. Без скобок код бы лишь копировался, а не выполнялся.
   - Каждый запуск `instructions` создаёт новый execution context (на call stack как `instructions`), возвращает `input * 2`, результат push-ится в output.
6. Output `[2,4,6]` возвращается в `result`. Контекст `copyArrayAndManipulate` снимается со стека.

## Ключевые понятия

- **higher-order function** (функция высшего порядка) — внешняя функция, принимающая (или возвращающая) другую функцию; здесь `copyArrayAndManipulate`. Никакого спец-синтаксиса для её объявления не нужно.
- **callback function** (callback-функция) — функция, вставляемая внутрь; здесь `multiplyBy2`.
  - Здесь callback запускается *сразу* внутри HOF (не «позже»). Иные названия по роли: handler, transformation function, argument function; без имени — lambda function. Технически всё это callback functions.
  - «Настоящий» отложенный вызов callback (отсюда название «call back») будет в асинхронном JS. [Тема продолжается.]
- Параметр-placeholder для функциональности здесь назван `instructions`, для данных — `array`.

## Главное

- Функциональность оборачивается в функцию и передаётся как аргумент (callback).
- HOF подставляет callback под меткой параметра (`instructions`) и запускает его через `()`.
- Каждый вызов callback создаёт собственный execution context.
- Это «магия под капотом» встроенных `map`, `filter`, `reduce`; ранее `reverse` и др. так себя не вели (см. далее non-mutating методы).
