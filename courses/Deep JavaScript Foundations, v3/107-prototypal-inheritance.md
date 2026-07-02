# Prototypal Inheritance

## Создание «child class» в прототипном стиле

- Чтобы один constructor наследовал от другого, объявляют второй constructor (`AnotherWorkshop`).
- Связь «extends/inherits» создаётся строкой с **Object.create**:

```js
AnotherWorkshop.prototype = Object.create(Workshop.prototype)
```

- Без этой строки наследование сломается: `AnotherWorkshop.prototype` указывал бы только на `Object.prototype`.
- Эта строка — аналог `extends` в class-синтаксисе.

## Что делает Object.create

- Утилита, добавленная в ES5; выполняет два действия:
  1. Создаёт новый пустой объект «из воздуха».
  2. Линкует этот объект к переданному объекту (prototype-связь).
- Это, по сути, первые два шага алгоритма `new`, оформленные как отдельный API-метод.
- Альтернатива (anti-pattern):

```js
AnotherWorkshop.prototype.__proto__ = Workshop.prototype
```

- Предпочтительнее создавать новый объект через `Object.create`, чтобы получить чистую новую линковку.

## Цепочка связанных объектов

- В итоге объект `JSRecentParts` (созданный через `new AnotherWorkshop()`) связан с `AnotherWorkshop.prototype`, который связан с `Workshop.prototype`.
- Объекты соединены через скрытый prototype chain.
- Сама линковка объектов — не недостаток, а источник всей мощи системы.
- Вся «обвязка» вокруг (constructor-функции, многословный `.prototype`, запутанный `new`) — это лишь artifice (искусственная надстройка) поверх трёх связанных объектов.

## Разрешение методов и this по цепочке

- Вызов `JSRecentParts.speakUp()`:
  1. На самом `JSRecentParts` метода `speakUp` нет.
  2. Поиск идёт вверх → `AnotherWorkshop.prototype`, где `speakUp` есть.
- При вызове `this` указывает на `JSRecentParts` (по call-site).
- Внутри `speakUp` вызов `this.ask` снова идёт вверх по цепочке до объекта, где `ask` определён.
- Сколько бы уровней prototype chain ни пришлось пройти для поиска метода, привязка `this` остаётся прикреплённой к корню — к call-site.
- Kyle называет это «super unicorn magic»: методы находятся в разных местах цепочки, но их `this` всегда тот, что задан местом вызова.

## Главное

- В прототипном «наследовании» связь между prototype-объектами создаётся через `Object.create(Parent.prototype)` — это аналог `extends`.
- `Object.create` делает две вещи: создаёт новый пустой объект и линкует его к указанному (первые два шага `new`).
- Метод ищется вверх по prototype chain, но `this` всегда определяется call-site и остаётся прикреплённым к исходному объекту.
- Реальную мощь даёт линковка объектов; constructor-функции и `.prototype` — лишь надстройка над ней.
