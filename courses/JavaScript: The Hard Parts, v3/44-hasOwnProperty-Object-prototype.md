# Часть 44. hasOwnProperty и Object.prototype

## Постановка задачи

- Нужно проверить, есть ли у `user1` собственное свойство `score`. Используется встроенный метод **hasOwnProperty** (проверяет наличие собственного свойства объекта).

```js
user1.hasOwnProperty("score");
```

## Lookup для hasOwnProperty

1. `user1` ищется в global memory — найдено.
2. Ищется метод `hasOwnProperty` на самом `user1`: это не `name`, не `score` — нет.
3. JS не паникует, идёт по prototype-ссылке на `userFunctionStore`.
4. На `userFunctionStore` есть только `increment` и `login` — `hasOwnProperty` там нет.
5. Куда дальше? У самого `userFunctionStore` тоже есть своё скрытое свойство prototype, установленное автоматически при его создании.

## Object.prototype

- В JS есть встроенный объект **Object** — это большой объект, у которого есть свойство **prototype** (обычная строковая ключ-метка, не скрытое `[[Prototype]]`).
- **Object.prototype** — большой объект, полный полезных встроенных функций, к которым должны иметь доступ все объекты. В нём лежит `hasOwnProperty` и многие другие.
- Все объекты по умолчанию при создании получают скрытую ссылку `[[Prototype]]` на этот `Object.prototype`.

## Важное различие имён

- Скрытое свойство-ссылка `[[Prototype]]` (раньше лектор называл его `__proto__` / proto) — это НЕ то же самое, что свойство `prototype` на объекте `Object`.
- К скрытой ссылке всё ещё можно обратиться напрямую через `__proto__` — это legacy, почти deprecated способ, но он работает и показывает, на что указана ссылка.
- Спецификация определяет скрытую ссылку как `[[Prototype]]` (в двойных квадратных скобках).
- Из-за совпадения слова `prototype` в двух разных ролях возникает путаница в именовании JS.

## Цепочка для hasOwnProperty

1. `user1.hasOwnProperty` — на `user1` нет.
2. Вверх на `userFunctionStore` — нет.
3. У `userFunctionStore` своя скрытая prototype-ссылка указывает на `Object.prototype`.
4. На `Object.prototype` находится `hasOwnProperty` — метод запускается с аргументом `"score"`.

## Конец цепочки

- Скрытая prototype-ссылка самого `Object.prototype` указывает на **null** — это конец prototype chain.
- Если бы `user1` объявлялся как обычный объект (без `Object.create`), его prototype указывал бы напрямую на `Object.prototype`, давая доступ к встроенным функциям.
- При использовании `Object.create(userFunctionStore)` единственная prototype-ссылка `user1` занята указанием на `userFunctionStore`. Доступ к `Object.prototype` не теряется: `userFunctionStore` сам имеет ссылку вверх на `Object.prototype`, и JS идёт по цепочке дальше.

## Полная prototype chain

- `user1` → `userFunctionStore` → `Object.prototype` → `null`.
- Любой lookup поднимается по этой цепочке без ошибок, пока не найдёт свойство или не дойдёт до null.
- Намёк: массивы тоже имеют после точки множество встроенных методов — вероятно, они также поднимаются по своей prototype chain к встроенным функциям (подробнее — в курсе OOP Hard Parts).

## Подготовка к следующему примеру

- Из `userFunctionStore` убран `login`, оставлен только `increment` (для читаемости).
- `increment` переписан так, чтобы внутри него объявлялась отдельная функция `addOne`, которая делает `this.score++` и вызывается тут же.

```js
const userFunctionStore = {
  increment: function () {
    function addOne() {
      this.score++;
    }
    addOne();
  }
};
```

- Причина: часто в методе (`increment`) нужно разбить работу на отдельные функции. Этот пример заготовлен, чтобы показать дальнейшее поведение `this`.

## Главное

- **Object.prototype** — встроенный объект с общими методами (включая **hasOwnProperty**), на который по умолчанию ведёт prototype chain всех объектов.
- Свойство `prototype` на объекте `Object` — это не скрытая ссылка `[[Prototype]]`; совпадение имён — источник путаницы.
- Полная цепочка `user1` → `userFunctionStore` → `Object.prototype` → `null`; lookup идёт по ней до находки или до null.
- Доступ к `Object.prototype` сохраняется и при `Object.create`, потому что промежуточный объект сам ссылается на `Object.prototype`.
