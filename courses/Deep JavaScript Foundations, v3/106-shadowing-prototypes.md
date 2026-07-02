# Shadowing в прототипах

## Что такое shadowing

- **Shadowing** (затенение) — наличие свойства с одинаковым именем на разных уровнях prototype chain.
- Пример: метод `ask` создан на `Workshop.prototype`, и такой же `ask` добавлен напрямую на объект `deepJS`.
- В результате свойство на `deepJS` «затеняет» одноимённое свойство на `Workshop.prototype`.

```js
deepJS.ask = function ask(...) {
  this.ask(...) // что здесь this?
}
```

## Проблема с this при попытке вызвать «родительскую» версию

- Внутри метода `this` определяется по **call-site** (правило implicit binding — главное из всех правил привязки).
- Если вызов идёт как `deepJS.ask()`, то `this === deepJS`.
- Значит `this.ask` внутри метода снова обращается к `deepJS.ask` → **бесконечная рекурсия** (infinite recursion).
- Вывод: `this.` здесь не заменяет `super` — это **не** relative polymorphic reference (относительная полиморфная ссылка).

## Как подняться на уровень вверх по prototype chain

- `__proto__` — свойство, которое поднимает на один уровень вверх по prototype chain (к `Workshop.prototype`).
- Но если вызвать `this.__proto__.ask()`, то `this` внутри станет `Workshop.prototype` — это **не то**, что нужно.
- Чтобы найти метод уровнем выше, но выполнить его в нужном контексте, приходится писать:

```js
this.__proto__.ask.call(this)
```

## Explicit pseudo-polymorphism

- Такой приём Kyle называет **explicit pseudo-polymorphism** (явный псевдополиморфизм).
- Это не настоящий relative polymorphism и не замена `super`.
- Хрупкость: число `__proto__` зависит от глубины цепочки.
  - Один лишний уровень → нужно два `__proto__`: `this.__proto__.__proto__.ask.call(this)`.
  - Третий уровень → три `__proto__`, и так далее.

## Почему shadowing вообще нужен

- Shadowing — это механизм полиморфизма.
- В теории классов смысл child class: унаследовать метод от parent, переопределить его и через `super` вызвать родительскую версию, чтобы её расширить.
- Та же цель здесь: override + extend метода `ask`.
- Но вне class-системы это ломается — нет способа сделать relative polymorphism.

## Главное

- Shadowing — одноимённое свойство на нескольких уровнях prototype chain; реализует полиморфизм.
- Без классов попытка вызвать «родительскую» версию через `this.` ведёт к бесконечной рекурсии, т.к. `this` остаётся прежним.
- Обход через `this.__proto__...ask.call(this)` — explicit pseudo-polymorphism: хрупкий, ломается при изменении глубины цепочки, не равен `super`.
- Корректный relative polymorphism возможен только внутри class-системы, которая «склеена» поверх прототипов через `super`.
