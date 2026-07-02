# Часть 49. Public static fields

## Зачем нужен синтаксис class
- **class** (синтаксический способ записи) становится новым стандартом и внешне похож на классы из других языков (Python, C++, Java).
- Позволяет держать в одной конструкции и **constructor** (функцию, конструирующую объекты), и **method** (методы, общие для всех создаваемых объектов).
- Не нужно по отдельности дописывать методы в `UserCreator.prototype.increment`, `UserCreator.prototype.login` — они просто перечисляются внутри класса.
- Предупреждение: 95–99% разработчиков не понимают, как class работает внутри, и из-за этого ошибаются. Понимание внутреннего устройства даёт преимущество.

## Что добавили в язык в 2022 году
- Возможность добавлять static, private, instance fields.
- Эти возможности приближают JavaScript к традиционным object-oriented языкам.

## class — это всё ещё function + object combo
- Объявление `class UserCreator` создаёт не «настоящий» класс, а **function + object combo** (функцию, у которой автоматически есть свойство-объект).
- У этого объекта автоматически есть свойство **prototype** — ещё один объект.
- Всю конструкцию (функцию + её prototype) можно называть class.

## Из чего состоит класс
1. **constructor piece** — функция, которая запускается, когда `UserCreator` вызывают. Это обычная сохранённая функция, ничего нового.
2. Методы, перечисленные внутри класса (`increment`, `login`), сохраняются в объект `prototype` функции — как раньше делалось вручную через `UserCreator.prototype.increment = ...`.
3. **static field** — добавляется ключевым словом `static`.

```js
class UserCreator {
  static describe() {
    console.log('creates users');
  }
  constructor(name, score) {
    this.name = name;
    this.score = score;
  }
  increment() { this.score++; }
  login() { this.loggedIn = true; }
}
```

## Что делает static
- Ключевое слово `static` кладёт функцию (`describe`) не в `prototype`, а прямо на объектную часть `UserCreator` (на сам function + object combo).
- `describe` относится к классу в целом, а не к создаваемым объектам.
- Порядок объявления внутри класса не важен — JavaScript настраивает всё разом при определении класса.

## Вызов static-метода
- `UserCreator.describe()` ищет метод `describe` прямо на объекте `UserCreator` и выполняет его.
- Это аналогично прежнему `multiplyBy2.stored` — обращение к свойству-функции прямо на функции.
- Поиск НЕ идёт в `prototype` — метод найден непосредственно на объектной части.
- Результат: в консоль выводится `creates users`.

## Природа static field
- Это чистый syntactic sugar: ничего нового «под капотом» не добавляется, просто функция приписывается прямо к классу (function + object combo), а не в prototype.
- На этом этапе никакие объекты-пользователи ещё не создаются — есть только сам function + object combo.

## Главное
- `class` — это по-прежнему function + object combo; ключевое слово лишь «оборачивает» прежнее ручное создание функции с prototype.
- **public static field** (метод, помеченный `static`) кладётся прямо на объектную часть класса, а не в `prototype`, и относится ко всему классу.
- static — это чистый syntactic sugar, поведение function + object combo не меняется.
- Вызов `UserCreator.describe()` находит метод прямо на объекте `UserCreator`, без обращения к prototype chain.
