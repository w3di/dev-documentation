# Часть 50. Public instance fields

## Что такое public instance field
- **public instance field** (публичное поле экземпляра) — свойство, которое автоматически появляется на КАЖДОМ новом объекте, созданном при запуске `UserCreator` (теперь называемого constructor function).
- В отличие от static field, это уже не чистый syntactic sugar: добавлены реальные изменения «под капотом» (нововведение 2022 года), не свойственные обычным function + object combo.

## Как поле объявляется в классе
- Внутри класса пишется присваивание вида `loggedIn = false`.
- При определении класса JavaScript сохраняет на function + object combo скрытое свойство **fields** (скрытая секция полей).
- Туда попадает всё, что нужно автоматически добавлять каждому возвращаемому объекту.

```js
class UserCreator {
  loggedIn = false;
  constructor(name, score) {
    this.name = name;
    this.score = score;
  }
  increment() { this.score++; }
  login() { this.loggedIn = true; }
}

const user1 = new UserCreator('Ari', 3);
user1.login();
```

## Пошаговый разбор: создание user1
1. В global memory объявляется `user1`, значение пока неизвестно.
2. Вызывается `new UserCreator('Ari', 3)` — это обычная функция, но с **the new keyword** (ключевым словом `new`), создаётся новый **execution context**.
3. В local memory сначала обрабатываются параметры: `name = 'Ari'`, `score = 3`. (Параметры берутся из constructor — функциональной части combo.)
4. the new keyword создаёт новый пустой объект с меткой **this**.
5. the new keyword выставляет скрытую ссылку **proto** этого объекта на `UserCreator.prototype`.
6. JavaScript вмешивается: просматривает скрытое свойство **fields** на `UserCreator` и копирует каждое поле в авто-созданный объект. Так на объект попадает `this.loggedIn = false` — автоматически.
7. Выполняется код constructor, написанный вручную: `this.name = 'Ari'`, `this.score = 3`.
8. the new keyword автоматически возвращает объект в `user1`.

## Итоговый объект user1
- `loggedIn` = false (вставлено автоматически из fields)
- `name` = 'Ari'
- `score` = 3
- скрытая ссылка proto → `UserCreator.prototype`

## Вызов user1.login()
1. `user1` находится в global memory.
2. Поиск `login` сначала на самом `user1` — там только `loggedIn`, `name`, `score`. Не найдено.
3. Поиск идёт по prototype chain через скрытую ссылку proto в `UserCreator.prototype`, где найдены `increment` и `login`.
4. `login` запускается в новом execution context. Его код: `this.loggedIn = true`, где `this` — то, что слева от точки, то есть `user1`.
5. `user1.loggedIn` меняется с false на true.

## Важные нюансы
- Свойство `loggedIn` не добавляется вручную в constructor — оно появляется автоматически, потому что было сохранено в скрытой секции fields при определении класса.
- Это не «деталь реализации под капотом», а прямая возможность языка, которую можно контролировать — поэтому она «честная» тема для интервью.

## Главное
- **public instance field** хранится в скрытой секции fields на function + object combo и автоматически копируется на каждый создаваемый объект.
- the new keyword отвечает за: создание объекта `this`, установку скрытой ссылки proto на `prototype`, копирование полей из fields, возврат объекта.
- В отличие от static field, instance fields реально меняют поведение «под капотом» (нововведение 2022).
- Каждый новый объект получает собственную копию такого поля.
