# Паттерн OLOO

## Что такое OLOO

- **OLOO** — Objects Linked to Other Objects (объекты, связанные с другими объектами).
- Стиль использования прототипной системы без классов; авторский термин Kyle для контраста с OO.
- По сути «истинно объектно-ориентированными» можно назвать лишь те языки, где объект создаётся без класса — JavaScript и OLOO. Но термин «object oriented» закрепился за class-языками, поэтому используется OLOO.
- Цель — упрощение: получить те же возможности, что класс-система, но без классов, прототипов, `super`, constructor-функций и `new`.

## OLOO-стиль в коде

- Вместо классов и функций — только объекты:

```js
var Workshop = { /* методы */ };

var AnotherWorkshop = Object.create(Workshop);
// ...методы AnotherWorkshop

var JSRecentParts = Object.create(AnotherWorkshop);
```

- `Workshop`, `AnotherWorkshop`, `JSRecentParts` — просто объекты, связанные через `Object.create`.
- Вызов `JSRecentParts.setTeacher(...)`:
  1. На `JSRecentParts` метода нет → идёт к `AnotherWorkshop`.
  2. Там тоже нет → идёт к `Workshop`, где `setTeacher` найден.
  3. Метод использует `this` из call-site и ставит свойство на `JSRecentParts`.
- Получаем те же преимущества class-системы, но без `.prototype`, constructor-функций и `new` — только объекты, связанные с объектами.

## Object.create

- Добавлен в ES5; предложен Doug Crockford и продвинут им через комитет.
- Один из любимых механизмов: позволяет создавать и связывать объекты без `new`, прототипов, constructors, классов и `extends`.
- Примечание: Doug Crockford впоследствии отрёкся от `Object.create` и считает, что использовать его не стоит.

## Сравнение с class-эквивалентом

- Построчно синтаксической разницы с class-вариантом почти нет — это не «намного больше сахара».
- Различие в честности: OLOO напрямую показывает, что это просто объекты, связанные с объектами, без artifice (притворства, будто это что-то иное).

## Как Object.create делает «магию» (старый polyfill)

```js
if (!Object.create) {
  Object.create = function(o) {
    function F() {}
    F.prototype = o;
    return new F();
  };
}
```

- Создаёт фиктивную пустую функцию (её суть не важна).
- Ставит её `.prototype` равным переданному объекту `o`.
- Вызывает `new` на ней, чтобы получить новый объект, связанный с `o`.
- Итог: все ненужные constructor-функции, `.prototype` и `new` спрятаны внутри `Object.create`, а в коде остаётся чистая линковка между объектами.

## Главное

- **OLOO** (Objects Linked to Other Objects) — стиль использования прототипов без классов, прототипов в коде, `super`, constructors и `new`.
- Связывание объектов делается через `Object.create`; поведение находится поиском вверх по prototype chain, `this` берётся из call-site.
- По возможностям OLOO эквивалентен class-варианту, но честно показывает суть — объекты, связанные с объектами.
- `Object.create` (ES5, Doug Crockford) внутри прячет constructor-функцию, `.prototype` и `new`, оставляя чистую линковку.
