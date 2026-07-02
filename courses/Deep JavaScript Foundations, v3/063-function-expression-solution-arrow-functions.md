# Решение упражнения: arrow functions

## Преобразование обычных функций в arrow functions

- Часть 2 — переписать решение части 1 в виде arrow functions, сохранив поведение.

### `getStudentFromId`

```js
var getStudentFromId = studentId =>
  studentRecords.find(record => record.id == studentId);
```

- Inline-callback в `find` тоже становится arrow function.

### `printRecords`

- Все три операции (`map`, `sort`, `forEach`) можно объединить в цепочку: `sort` возвращает массив, а мутация локального массива здесь не важна.

```js
var printRecords = recordIds =>
  recordIds.map(getStudentFromId)
    .sort((record1, record2) =>
      record1.name < record2.name ? -1 :
      record1.name > record2.name ? 1 : 0
    )
    .forEach(record =>
      console.log(`${record.name} (${record.id}): ${record.paid ? "Paid" : "Not Paid"}`)
    );
```

- Конструкция `if / else if / else` заменяется вложенным ternary — тело функции не нужно.
- `console.log` — вызов функции, то есть выражение, поэтому блок arrow function не требуется.

### `paidStudentsToEnroll`

- Не принимает аргументов; возвращает массив напрямую через chaining и spread.

```js
var paidStudentsToEnroll = () =>
  [ ...currentEnrollment,
    ...studentRecords
      .filter(record => record.paid && !currentEnrollment.includes(record.id))
      .map(record => record.id)
  ];
```

### `remindUnpaid`

- Доступ к свойству можно делать прямо от вызова функции, избегая блока.

```js
var remindUnpaid = recordIds =>
  printRecords(
    recordIds.filter(studentId => !getStudentFromId(studentId).paid)
  );
```

## Наблюдение о стиле arrow functions

- Сторонники arrow functions склонны к максимально сжатому синтаксису любой ценой:
  - вложенные ternary-выражения;
  - оператор «запятая» для объединения выражений;
  - объявление неиспользуемых параметров, чтобы не вводить переменную.
- Такой стиль может ухудшать читаемость — сравнение двух частей помогает оценить компромисс между лаконичностью и поддерживаемостью.

## Главное

- Arrow functions позволяют свести функции к выражениям и объединить методы массива в одну цепочку.
- `if/else` заменяется ternary, `console.log` как выражение убирает необходимость в теле функции.
- Погоня за максимальной краткостью arrow functions часто снижает читаемость — стиль выбирается под задачу.
