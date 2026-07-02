# Решение упражнения: обычные функции

## Вспомогательная функция `getStudentById`

- Доступ к записи студента по ID нужен в нескольких местах, поэтому он вынесен в отдельную standalone-функцию (а не inline function expression) — заранее известно, что она понадобится повторно.
- Использует `array.find`: callback вызывается для каждого элемента; при первом truthy-результате возвращается сам элемент массива (не `true`).

```js
function getStudentById(studentId) {
  return studentRecords.find(function getRecord(record){
    return record.id == studentId;
  });
}
```

## `printRecords`

1. Преобразовать список ID в список записей через `map`, передав `getStudentById` (стандалон-функция переиспользуется как callback).
2. Отсортировать записи по имени.

### Сортировка

- `sort` — мутатор: меняет массив на месте (для производительности) и возвращает его же. Присваивание `records = records.sort()` не нужно; вызов как мутатора нагляднее.
- Без callback `sort` делает алфавитно-числовую сортировку, приводя элементы к строке — для объектов это даёт `[object Object]`, поэтому нужен кастомный компаратор.
- Контракт компаратора: при `record1 < record2` вернуть отрицательное число (`-1`), при `record1 > record2` — `1`, при равенстве — `0`.

```js
function sortByNameAscending(record1, record2){
  if (record1.name < record2.name) return -1;
  else if (record1.name > record2.name) return 1;
  else return 0;
}
```

- Имена — всегда строки, поэтому сравнение `<` / `>` корректно (алфавитно-числовое).
- Компаратор стоит выносить в отдельную функцию, даже если он используется один раз, особенно когда он не зависит от лексического scope.

### Печать

- Использовать `forEach` для вывода:

```js
records.forEach(function printRecord(record){
  console.log(`${record.name} (${record.id}): ${record.paid ? "Paid" : "Not Paid"}`);
});
```

## `paidStudentsToEnroll`

- Найти студентов с `paid === true`, чьего ID ещё нет в `currentEnrollment`.
- `array.includes` (ES2016) ищет значение в массиве и возвращает `true`/`false` — заменяет старый приём с `indexOf`.

```js
function paidStudentsToEnroll() {
  var idsToEnroll = studentRecords.filter(function needsToEnroll(record){
    return record.paid && !currentEnrollment.includes(record.id);
  })
  .map(function getStudentId(record){
    return record.id;
  });
  return [ ...currentEnrollment, ...idsToEnroll ];
}
```

- Сначала `filter` оставляет нужные записи, затем `map` извлекает ID.
- Возвращается новый массив через spread; `currentEnrollment` не изменяется.

## `remindUnpaid`

- Отфильтровать ID, чьи записи в статусе unpaid, и передать результат в `printRecords`.

```js
function remindUnpaid(recordIds) {
  var unpaidIds = recordIds.filter(function isUnpaid(studentId){
    var record = getStudentById(studentId);
    return !record.paid;
  });
  printRecords(unpaidIds);
}
```

## Главное

- Повторяющуюся логику (поиск по ID) выносят в standalone-функцию `getStudentById` и переиспользуют.
- Цепочка `map` → `sort` → `forEach` решает `printRecords`; `sort` требует компаратора для объектов и мутирует массив.
- `filter` + `map` + spread формируют новый массив без мутации исходного; `includes` упрощает проверку наличия.
