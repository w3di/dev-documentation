# Dunder Proto (__proto__)

## Свойство constructor через цепочку

- `deepJS.constructor` работает, хотя у `deepJS` нет собственного свойства `constructor`.
- Поиск идёт вверх по prototype chain: `deepJS` → `Workshop.prototype`, где есть `constructor`, указывающий на `Workshop`.
- Поэтому `deepJS.constructor === Workshop`.
- Это **создаёт иллюзию**, что `deepJS` сконструирован `Workshop`. На деле объект создал `new`, а `Workshop`-объект почти ни при чём — это лишь расставленные связи, рисующие «нарратив» класса.

## __proto__ (dunder proto)

- `deepJS.__proto__` указывает на `Workshop.prototype` — то есть на объект, с которым `deepJS` связан.
- **dunder proto** — жаргонное имя для `__proto__` (double underscore).

## Как разрешается __proto__

1. У `deepJS` **нет** собственного свойства `__proto__`.
2. Поиск идёт вверх: `deepJS` → `Workshop.prototype`. Там тоже нет `__proto__`.
3. Дальше вверх: `Workshop.prototype` связан с `Object.prototype`.
4. На `Object.prototype` `__proto__` **есть** — и это не обычное свойство, а **getter-функция**.

## __proto__ как getter

- Хотя `__proto__` обращаются как к свойству, на `Object.prototype` это **getter function**, поэтому она вызывается как функция.
- Внутри getter `this` определяется call site — это `deepJS`.
- Хоть скобок нет, обращение работает как вызов функции, и тот же this binding rule применяется.
- Getter, вызванный в контексте `deepJS`, возвращает скрытую внутреннюю связь — prototype chain.

## Главное

- `deepJS.constructor` и `deepJS.__proto__` находятся не на самом объекте, а через подъём по prototype chain (на `Workshop.prototype` и `Object.prototype`).
- `__proto__` — это getter-функция на `Object.prototype`; при доступе её `this` = объект из call site, и она возвращает связанный прототип.
- `constructor` существует лишь ради видимости классов; реально объект создаёт `new`.
