# Решение упражнения по module pattern

## Шаги решения

1. Обернуть все функции (которые были внизу) в одну большую функцию — **module factory** `defineWorkshop`. Сами функции оставить внизу её scope.
2. Внутри объявить данные для замыкания — два **пустых** массива:

```js
function defineWorkshop() {
    var currentEnrollment = [];
    var studentRecords = [];
    // ...функции...
    return publicAPI;
}
```

3. Создать и вернуть **public API** с пятью методами.

## Реализация методов

```js
function addStudent(id, name, paid) {
    studentRecords.push({ id, name, paid });
}

function enrollStudent(id) {
    if (!currentEnrollment.includes(id)) {
        currentEnrollment.push(id);
    }
}
```

- `addStudent(id, name, paid)` — `push` объекта записи в `studentRecords`.
- `enrollStudent(id)` — `push` в `currentEnrollment`. **Дополнительная проверка** (т.к. теперь это API): `if (!currentEnrollment.includes(id))` — не добавлять дубликаты ID.
- `printCurrentEnrollment()` — без аргументов, печатает `currentEnrollment`. Снаружи список ID не передаётся — смысл module в абстрагировании этой детали.
- `enrollPaidStudents()` — вычисляет студентов, готовых к зачислению (`paidStudentsToEnroll`), обновляет `currentEnrollment` и печатает записи.
- `remindUnpaidStudents()` — заменяет вызов `remindUnpaid` с `currentEnrollment`.

Итог: данные приватны, открыто пять методов public API; **closure** поддерживает state во времени.

## Использование module

```js
var deepJS = defineWorkshop();

deepJS.addStudent(/* ... */);   // многократно
deepJS.enrollStudent(/* ... */); // многократно

deepJS.printCurrentEnrollment();
deepJS.enrollPaidStudents();
deepJS.remindUnpaidStudents();
```

- Вместо хардкода массивов — instance через `defineWorkshop()`.
- Множественные вызовы `addStudent` / `enrollStudent` наполняют данные.
- Обращения к исполняемым функциям заменены вызовами методов `deepJS`.

## Главное

- Все функции обёрнуты в module factory `defineWorkshop`, закрывающую два приватных массива.
- Public API из пяти методов; `enrollStudent` дополнительно отсекает дубликаты ID.
- Module прячет implementation detail (массивы), а closure хранит state во времени.
- Module — один из важнейших паттернов организации кода; стоит практиковать его на своём коде.
