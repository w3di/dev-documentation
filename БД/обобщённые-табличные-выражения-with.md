## Обобщённое табличное выражение, оператор WITH

CTE (Common Table Expressions) — временный результирующий набор данных, к которому можно обращаться в последующих запросах. Для написания обобщённого табличного выражения используется оператор WITH.

```sql
WITH Aeroflot_trips AS
    (SELECT TRIP.* FROM Company
        INNER JOIN Trip ON Trip.company = Company.id WHERE name = 'Aeroflot')

SELECT plane, COUNT(plane) AS amount FROM Aeroflot_trips GROUP BY plane;
```
Пример использования CTE

CTE считается «временным», потому что результат не сохраняется в схеме базы данных, а действует как временное представление, которое существует только на время выполнения запроса. Оно доступно только во время выполнения операторов SELECT, INSERT, UPDATE, DELETE или MERGE и действительно только в том запросе, которому он принадлежит.

## Синтаксис оператора WITH

```sql
WITH название_cte [(столбец_1 [, столбец_2 ] …)] AS (подзапрос)
    [, название_cte [(столбец_1 [, столбец_2 ] …)] AS (подзапрос)] …
```
Общая структура оператора WITH

Порядок использования:
1. Ввести оператор WITH
2. Указать название обобщённого табличного выражения
3. Опционально: определить названия для столбцов получившегося табличного выражения, разделённых запятой
4. Ввести AS и далее подзапрос, результат которого можно использовать в других частях SQL запроса
5. Опционально: если необходимо более одного табличного выражения, ставится запятая и повторяются шаги 2-4

## Примеры запросов с WITH

```sql
WITH Aeroflot_trips AS
    (SELECT plane, town_from, town_to FROM Company
        INNER JOIN Trip ON Trip.company = Company.id WHERE name = 'Aeroflot')

SELECT * FROM Aeroflot_trips;
```
Создаёт табличное выражение Aeroflot_trips, содержащее все полёты авиакомпании «Aeroflot»

```sql
WITH Aeroflot_trips (aeroflot_plane, town_from, town_to) AS
    (SELECT plane, town_from, town_to FROM Company
        INNER JOIN Trip ON Trip.company = Company.id WHERE name = 'Aeroflot')

SELECT * FROM Aeroflot_trips;
```
Создаёт табличное выражение с переименованными колонками

```sql
WITH Aeroflot_trips AS
    (SELECT TRIP.* FROM Company
        INNER JOIN Trip ON Trip.company = Company.id WHERE name = 'Aeroflot'),
    Don_avia_trips AS
    (SELECT TRIP.* FROM Company
        INNER JOIN Trip ON Trip.company = Company.id WHERE name = 'Don_avia')

SELECT * FROM Don_avia_trips UNION SELECT * FROM Aeroflot_trips;
```
Определяет несколько табличных выражений в одном запросе

## Рекурсивные CTE

CTE также могут быть использованы для выполнения рекурсивных запросов, которые позволяют итеративно обрабатывать данные, например, для работы с иерархическими структурами данных.

```sql
WITH RECURSIVE название_cte (столбец_1, столбец_2, ...) AS (
    -- Начальный набор данных
    SELECT столбец_1, столбец_2, ...
    FROM таблица
    WHERE условие

    UNION ALL

    -- Рекурсивная часть
    SELECT столбец_1, столбец_2, ...
    FROM название_cte
    INNER JOIN таблица ON название_cte.столбец = таблица.столбец
    WHERE условие
)

SELECT * FROM название_cte;
```
Синтаксис рекурсивного CTE

Рекурсивное CTE состоит из двух частей, разделённых оператором UNION ALL:
1. Начальный набор данных — не содержит рекурсивных ссылок
2. Рекурсивная часть — запрос, который ссылается на CTE, чтобы продолжить рекурсию

## Пример: иерархия руководителей и подчинённых

```sql
WITH RECURSIVE Subordinates AS (
    -- Начальный набор данных
    SELECT id, name, managerId
    FROM Employees
    WHERE managerId = 1

    UNION ALL

    -- Рекурсивная часть: подчинённые подчинённых
    SELECT e.id, e.name, e.managerId
    FROM Employees e
    INNER JOIN Subordinates s ON e.managerId = s.id
)

SELECT * FROM Subordinates;
```
Находит всех подчинённых John Smith (id=1) на всех уровнях иерархии

Шаги выполнения рекурсивного CTE:
1. Начальный набор данных: выбираются все сотрудники, у которых managerId=1
2. Рекурсивная часть: для каждого сотрудника из начального набора выбираются их подчинённые
3. Объединение: результаты начального набора данных и рекурсивной части объединяются с помощью UNION ALL
4. Рекурсия: процесс повторяется для каждого нового набора подчинённых, пока не будут выбраны все уровни иерархии

## Преимущества CTE

CTE были добавлены в SQL для упрощения сложных длинных запросов, особенно с множественными подзапросами. Их главная задача — улучшение читабельности, простоты написания запросов и их дальнейшей поддержки. Это происходит за счёт сокрытия больших и сложных запросов в созданные именованные выражения, которые потом используются в основном запросе.
