# DML -- манипуляция данными

DML (Data Manipulation Language) -- подмножество SQL для работы с данными: добавление, обновление, удаление записей.

## INSERT

Оператор INSERT предназначен для добавления новых записей в таблицу.

### Общий синтаксис

```sql
INSERT INTO имя_таблицы [(поле_таблицы, ...)]
VALUES (значение_поля_таблицы, ...)
| SELECT поле_таблицы, ... FROM имя_таблицы ...
```

Значения можно вставлять перечислением с помощью слова VALUES или с помощью оператора SELECT.

### Перечисление полей и соответствие значениям

При использовании INSERT можно явно указать, в какие поля таблицы будут вставлены данные.

```sql
INSERT INTO имя_таблицы (поле1, поле2, поле3)
VALUES (значение1, значение2, значение3);
```

Важные правила:
- Порядок значений в VALUES должен строго соответствовать порядку полей в перечислении
- Количество значений должно совпадать с количеством указанных полей
- Если поле не указано в перечислении, оно получит значение по умолчанию (если задано) или NULL (если поле допускает NULL)

```sql
INSERT INTO Goods (good_id, good_name, type)
VALUES (20, 'Table', 2);
```

```sql
-- Порядок полей можно менять -- значения следуют за порядком полей
INSERT INTO Goods (good_name, type, good_id)
VALUES ('Table', 2, 20);
```

Если не указывать список полей, значения должны быть перечислены для всех полей таблицы в том порядке, в котором они были определены при создании таблицы:

```sql
INSERT INTO Goods
VALUES (20, 'Table', 2);
```

Рекомендуется всегда явно указывать список полей. Это делает код более читаемым, защищает от ошибок при изменении структуры таблицы и позволяет вставлять значения только в нужные поля.

### INSERT INTO ... VALUES

Используется для вставки заранее известных значений.

Вставка одной строки:

```sql
INSERT INTO Goods (good_id, good_name, type)
VALUES (20, 'Table', 2);
```

### Множественная вставка

Одним запросом можно вставить несколько строк:

```sql
INSERT INTO Goods (good_id, good_name, type)
VALUES
    (20, 'Table', 2),
    (21, 'Chair', 2),
    (22, 'Lamp', 8);
```

Когда использовать: для вставки конкретных, статических данных, которые известны заранее.

### INSERT INTO ... SELECT

Используется для вставки данных, полученных из запроса. Позволяет копировать данные из одной таблицы в другую или вставлять результаты сложных вычислений.

```sql
INSERT INTO Goods (good_id, good_name, type)
SELECT 20, 'Table', 2;
```

Копирование и преобразование данных из другой таблицы:

```sql
INSERT INTO Goods (good_id, good_name, type)
SELECT good_id + 100, good_name, type
FROM Goods
WHERE type = 2;
```

Когда использовать: для копирования данных между таблицами, вставки результатов вычислений или когда данные зависят от существующих записей в базе.

### Первичный ключ при добавлении

Первичный ключ таблицы является уникальным значением. Добавление уже существующего значения приведет к ошибке.

Ручная генерация нового ключа (ненадежный способ):

```sql
INSERT INTO Goods SELECT MAX(good_id) + 1, 'Table', 2 FROM Goods;
```

### Автоматическая генерация первичного ключа

В PostgreSQL для автоматической генерации уникального идентификатора используются типы SMALLSERIAL, SERIAL, BIGSERIAL.

```sql
CREATE TABLE Goods (
    good_id SERIAL,
    good_name VARCHAR(255),
    type INT
);

-- При вставке не нужно указывать значение для SERIAL поля
INSERT INTO Goods (good_name, type) VALUES ('Table', 2);
```

## UPDATE

Оператор UPDATE предназначен для редактирования существующих записей в таблицах.

### Общий синтаксис

```sql
UPDATE имя_таблицы
SET поле_таблицы1 = значение_поля_таблицы1,
    поле_таблицыN = значение_поля_таблицыN
[WHERE условие_выборки]
```

```sql
UPDATE FamilyMembers
SET member_name = 'Andie Anthony'
WHERE member_name = 'Andie Quincey';
```

Важно: если пропустить оператор WHERE, будут обновлены все записи в таблице.

### Вычисления на основе текущих значений

В запросах на обновление данных можно менять значения, опираясь на предыдущее значение:

```sql
UPDATE Payments
SET unit_price = unit_price * 2;
```

Разрешается значения одних столбцов присваивать другим столбцам. При этом типы столбцов должны быть совместимыми:

```sql
UPDATE Products
SET discount_price = price * 0.9
WHERE category = 'electronics';
```

### UPDATE с подзапросом

```sql
UPDATE Orders
SET status = 'shipped'
WHERE user_id IN (
    SELECT id FROM Users WHERE country = 'RU'
);
```

### UPDATE нескольких столбцов

```sql
UPDATE Users
SET name = 'John Doe',
    email = 'john@example.com',
    updated_at = NOW()
WHERE id = 1;
```

## DELETE

Для удаления записей из таблицы предусмотрены операторы DELETE и TRUNCATE. Наиболее универсальным и безопасным является DELETE.

### Общий синтаксис

```sql
DELETE FROM имя_таблицы
[WHERE условие_отбора_записей];
```

Если условие WHERE отсутствует, будут удалены все записи указанной таблицы.

```sql
DELETE FROM Users WHERE id = 5;
```

### TRUNCATE

TRUNCATE выполняет удаление всех записей из таблицы. Работает быстрее, чем DELETE для больших таблиц, так как пересоздает таблицу заново.

```sql
TRUNCATE TABLE имя_таблицы;
```

Отличия TRUNCATE от DELETE:
- Не срабатывают триггеры, в частности триггер удаления
- Удаляет все строки, не записывая удаление отдельных строк в журнал транзакций
- Сбрасывает счетчик идентификаторов до начального значения
- Для использования необходимы права на изменение таблицы

### DELETE с USING (многотабличные запросы)

Если при удалении нужно учитывать данные из другой таблицы, используется конструкция USING:

```sql
DELETE FROM имя_таблицы_1
USING имя_таблицы_2
WHERE имя_таблицы_1.поле = имя_таблицы_2.поле
[AND условие_отбора_записей];
```

```sql
DELETE FROM Reservations
USING Rooms
WHERE Reservations.room_id = Rooms.id
AND Rooms.has_kitchen = false;
-- Удаляет все бронирования жилья, в котором отсутствует кухня
```

Для удаления из нескольких таблиц одновременно используются отдельные DELETE запросы в транзакции:

```sql
BEGIN;
DELETE FROM Reservations
USING Rooms
WHERE Reservations.room_id = Rooms.id
AND Rooms.has_kitchen = false;

DELETE FROM Rooms
WHERE Rooms.has_kitchen = false;
COMMIT;
```

## UPSERT -- INSERT ON CONFLICT

PostgreSQL поддерживает конструкцию `INSERT ... ON CONFLICT`, которая позволяет выполнить обновление записи, если вставка приводит к конфликту (нарушение уникальности).

### Общий синтаксис

```sql
INSERT INTO имя_таблицы (столбец1, столбец2, ...)
VALUES (значение1, значение2, ...)
ON CONFLICT (столбец_конфликта)
DO UPDATE SET столбец = значение
| DO NOTHING;
```

### DO NOTHING -- игнорирование конфликта

Если запись с таким ключом уже существует, вставка просто пропускается:

```sql
INSERT INTO Users (id, username, email)
VALUES (1, 'john', 'john@example.com')
ON CONFLICT (id) DO NOTHING;
```

### DO UPDATE -- обновление при конфликте

Если запись с таким ключом уже существует, выполняется обновление:

```sql
INSERT INTO Users (id, username, email)
VALUES (1, 'john', 'john_new@example.com')
ON CONFLICT (id)
DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
```

`EXCLUDED` -- специальная ссылка на строку, которая не была вставлена из-за конфликта. Через нее доступны значения, которые предполагалось вставить.

### Конфликт по нескольким столбцам

```sql
INSERT INTO ProductPrices (product_id, region, price)
VALUES (1, 'RU', 999.99)
ON CONFLICT (product_id, region)
DO UPDATE SET
    price = EXCLUDED.price;
```

### Конфликт по ограничению

Можно указать имя ограничения вместо столбца:

```sql
INSERT INTO Users (username, email)
VALUES ('john', 'john@example.com')
ON CONFLICT ON CONSTRAINT uq_username
DO UPDATE SET email = EXCLUDED.email;
```

### Условное обновление с WHERE

```sql
INSERT INTO Products (id, name, price, updated_at)
VALUES (1, 'Laptop', 1200.00, NOW())
ON CONFLICT (id)
DO UPDATE SET
    price = EXCLUDED.price,
    updated_at = EXCLUDED.updated_at
WHERE Products.price <> EXCLUDED.price;
-- Обновляет только если цена действительно изменилась
```

### Пример: счетчик просмотров

```sql
INSERT INTO PageViews (page_url, view_count)
VALUES ('/about', 1)
ON CONFLICT (page_url)
DO UPDATE SET view_count = PageViews.view_count + 1;
```

## RETURNING

PostgreSQL поддерживает конструкцию `RETURNING`, которая возвращает данные из измененных строк. Работает с INSERT, UPDATE и DELETE.

### RETURNING с INSERT

```sql
INSERT INTO Users (username, email)
VALUES ('john', 'john@example.com')
RETURNING id;
-- Вернет автоматически сгенерированный id новой записи
```

```sql
INSERT INTO Users (username, email)
VALUES ('john', 'john@example.com')
RETURNING *;
-- Вернет всю вставленную строку
```

```sql
INSERT INTO Users (username, email)
VALUES
    ('john', 'john@example.com'),
    ('jane', 'jane@example.com')
RETURNING id, username;
-- Вернет id и username для всех вставленных строк
```

### RETURNING с UPDATE

```sql
UPDATE Products
SET price = price * 1.1
WHERE category = 'electronics'
RETURNING id, name, price AS new_price;
-- Вернет id, name и новую цену для всех обновленных товаров
```

### RETURNING с DELETE

```sql
DELETE FROM Sessions
WHERE expires_at < NOW()
RETURNING user_id, session_id;
-- Вернет данные удаленных сессий
```

### RETURNING в комбинации с CTE

```sql
WITH inserted AS (
    INSERT INTO Orders (user_id, total_amount)
    VALUES (1, 150.00)
    RETURNING id
)
INSERT INTO OrderItems (order_id, product_id, quantity)
SELECT id, 5, 2 FROM inserted;
-- Вставляет заказ и сразу использует его id для вставки позиций
```

### RETURNING с UPSERT

```sql
INSERT INTO Users (id, username, email)
VALUES (1, 'john', 'john_new@example.com')
ON CONFLICT (id)
DO UPDATE SET email = EXCLUDED.email
RETURNING id, username, email,
    (xmax = 0) AS is_inserted;
-- xmax = 0 означает, что строка была вставлена, а не обновлена
```
