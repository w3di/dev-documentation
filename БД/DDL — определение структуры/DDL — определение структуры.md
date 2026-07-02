# DDL -- определение структуры

DDL (Data Definition Language) -- подмножество SQL для создания и изменения структуры объектов базы данных: баз данных, таблиц, индексов, представлений.

## Создание и удаление баз данных

При написании SQL-запросов мы активно используем таблицы. Сами же таблицы хранятся в рамках конкретных баз данных.

### CREATE DATABASE

Синтаксис создания базы данных:

```sql
CREATE DATABASE имя_базы_данных;
```

Правила именования:
- Можно использовать буквы, цифры, символы `_` и `$`
- Имя не может начинаться с цифры
- Не может содержать специальные символы (кроме подчеркивания)
- Максимальная длина имени -- 63 знака

Создание базы данных с проверкой существования:

```sql
CREATE DATABASE IF NOT EXISTS имя_базы_данных;
```

Проверка созданных баз данных:

```sql
SELECT datname FROM pg_database WHERE datistemplate = false;
```

Результат:

```
datname
user_database_1
user_database_2
postgres
```

Кроме пользовательских баз данных PostgreSQL также содержит служебные базы данных: `postgres`, `template0`, `template1`.

### DROP DATABASE

Удаление базы данных:

```sql
DROP DATABASE имя_базы_данных;
```

Удаление с проверкой существования:

```sql
DROP DATABASE IF EXISTS имя_базы_данных;
```

Важные моменты:
- Нельзя удалить базу данных, к которой подключены активные сеансы
- При удалении базы данных все ее объекты (таблицы, функции, процедуры) также удаляются
- Операции создания и удаления баз данных требуют соответствующих прав доступа
- Служебные базы данных PostgreSQL (`postgres`, `template0`, `template1`) не следует удалять

### Системная таблица pg_database

Таблица `pg_database` содержит информацию обо всех базах данных в PostgreSQL.

Основные столбцы:
- `datname` -- имя базы данных
- `datistemplate` -- флаг, указывающий, является ли база данных шаблоном

```sql
-- Просмотр всех баз данных
SELECT * FROM pg_database;

-- Просмотр только пользовательских баз данных
SELECT datname FROM pg_database WHERE datistemplate = false;
```

## Создание таблиц (CREATE TABLE)

Для создания таблицы используется оператор `CREATE TABLE`.

### Базовый синтаксис

```sql
CREATE TABLE [IF NOT EXISTS] имя_таблицы (
    столбец_1 тип_данных,
    [столбец_2 тип_данных,]
    ...
    [столбец_n тип_данных]
);
```

Пример создания таблицы пользователей:

```sql
CREATE TABLE Users (
    id INTEGER,
    name VARCHAR(255),
    age INTEGER
);
```

### Параметры определения столбцов

Помимо названия столбца и его типа в определение можно добавлять дополнительные параметры:

| Параметр | Описание |
|----------|----------|
| `PRIMARY KEY` | Указывает колонку как первичный ключ |
| `SERIAL` / `GENERATED ALWAYS AS IDENTITY` | Автоинкрементное значение |
| `UNIQUE` | Значения должны быть уникальными |
| `NOT NULL` | Значения не могут быть NULL |
| `DEFAULT` | Значение по умолчанию |

```sql
CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL DEFAULT 18
);
```

В данном примере:
- `id` -- поле типа `SERIAL` (автоинкрементное целое число), являющееся первичным ключом
- `name` -- поле строкового типа с максимальной длиной 255 символов, обязательное к заполнению
- `age` -- поле числового типа со значением по умолчанию 18

### Описание таблицы

Для просмотра описания созданной таблицы используется запрос к информационной схеме:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users';
```

Результат:

```
column_name    data_type           is_nullable    column_default
id             integer             NO             nextval('users_id_seq'::regclass)
name           character varying   NO             <NULL>
age            integer             NO             18
```

### Первичный ключ на уровне таблицы

Если первичный ключ не определен через параметры столбца, это можно сделать после перечисления столбцов:

```sql
CREATE TABLE Users (
    id INTEGER,
    name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL DEFAULT 18,
    PRIMARY KEY (id)
);
```

### Внешние ключи

Создание таблицы компаний:

```sql
CREATE TABLE Companies (
    id INTEGER,
    name VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);
```

Добавление внешнего ключа в таблицу пользователей:

```sql
CREATE TABLE Users (
    id INTEGER,
    name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL DEFAULT 18,
    company INTEGER,
    PRIMARY KEY (id),
    FOREIGN KEY (company) REFERENCES Companies (id)
);
```

Синтаксис внешнего ключа:

```sql
FOREIGN KEY (<столбец_1>, <столбец_n>)
REFERENCES <внешняя_таблица> (<столбец_во_внешней_таблице_1>, <столбец_во_внешней_таблице_n>)
[ON DELETE действие]
[ON UPDATE действие]
```

## Изменение таблиц (ALTER TABLE)

Оператор `ALTER TABLE` позволяет изменять структуру существующей таблицы.

### Добавление столбца

```sql
ALTER TABLE Users ADD COLUMN email VARCHAR(255);
ALTER TABLE Users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
```

### Удаление столбца

```sql
ALTER TABLE Users DROP COLUMN email;
```

### Переименование столбца

```sql
ALTER TABLE Users RENAME COLUMN name TO full_name;
```

### Изменение типа столбца

```sql
ALTER TABLE Users ALTER COLUMN age TYPE SMALLINT;
ALTER TABLE Users ALTER COLUMN name TYPE TEXT;
```

### Установка / снятие NOT NULL

```sql
ALTER TABLE Users ALTER COLUMN email SET NOT NULL;
ALTER TABLE Users ALTER COLUMN email DROP NOT NULL;
```

### Установка / снятие DEFAULT

```sql
ALTER TABLE Orders ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE Orders ALTER COLUMN status DROP DEFAULT;
```

### Переименование таблицы

```sql
ALTER TABLE Users RENAME TO Customers;
```

### Добавление ограничений

```sql
ALTER TABLE Users ADD PRIMARY KEY (id);
ALTER TABLE Users ADD CONSTRAINT uq_email UNIQUE (email);
ALTER TABLE Products ADD CONSTRAINT chk_price CHECK (price > 0);
ALTER TABLE Orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES Users(id);
```

### Удаление ограничений

```sql
ALTER TABLE Users DROP CONSTRAINT users_pkey;
ALTER TABLE Users DROP CONSTRAINT uq_email;
ALTER TABLE Products DROP CONSTRAINT chk_price;
ALTER TABLE Orders DROP CONSTRAINT fk_user;
```

## Удаление таблиц

### DROP TABLE

Полностью удаляет таблицу и все ее данные:

```sql
DROP TABLE [IF EXISTS] имя_таблицы;
```

Нельзя удалить таблицу, если на нее ссылаются другие таблицы через внешние ключи (при использовании `RESTRICT`). Для принудительного удаления вместе со всеми зависимостями:

```sql
DROP TABLE имя_таблицы CASCADE;
```

### TRUNCATE

Быстрое удаление всех данных из таблицы без удаления самой таблицы:

```sql
TRUNCATE TABLE имя_таблицы;
```

Отличия TRUNCATE от DELETE:
- Не срабатывают триггеры, в частности триггер удаления
- Не записывает удаление отдельных строк в журнал транзакций
- Сбрасывает счетчик идентификаторов до начального значения
- Для использования необходимы права на изменение таблицы
- Работает значительно быстрее на больших таблицах

Сброс счетчика SERIAL:

```sql
TRUNCATE TABLE Users RESTART IDENTITY;
```

## Ограничения (Constraints)

Ограничения -- правила, применяемые к данным в таблице для поддержания их точности и надежности. Они предотвращают добавление, изменение или удаление данных, нарушающих установленные правила.

Это помогает избежать:
- Наличия нескольких пользователей с одинаковыми идентификаторами
- Ссылок на несуществующие записи в других таблицах
- Отсутствия обязательных данных
- Ввода некорректных значений (например, отрицательного возраста)

### PRIMARY KEY (Первичный ключ)

Столбец или комбинация столбцов, однозначно идентифицирующие каждую строку в таблице.

Особенности:
- Не может содержать NULL-значения
- Должен быть уникальным
- Таблица может иметь только один первичный ключ

```sql
CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100)
);
```

Альтернативный синтаксис с именованным ограничением:

```sql
CREATE TABLE Users (
    id SERIAL,
    username VARCHAR(50),
    email VARCHAR(100),
    CONSTRAINT pk_users PRIMARY KEY (id)
);
```

При нарушении ограничения:

```
ERROR: duplicate key value violates unique constraint "users_pkey"
DETAIL: Key (id)=(1) already exists.
```

### FOREIGN KEY (Внешний ключ)

Столбец или группа столбцов в одной таблице, ссылающиеся на первичный ключ другой таблицы. Обеспечивает ссылочную целостность данных.

```sql
CREATE TABLE Orders (
    order_id INT PRIMARY KEY,
    user_id INT,
    order_date DATE,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);
```

Благодаря ограничению `FOREIGN KEY`:
- Нельзя добавить заказ для несуществующего пользователя
- Нельзя удалить пользователя, у которого есть заказы (если не указаны специальные опции)

### UNIQUE (Уникальность)

Гарантирует, что все значения в столбце или группе столбцов уникальны.

В отличие от `PRIMARY KEY`:
- Допускает NULL-значения (обычно только одно NULL-значение)
- Может быть несколько UNIQUE ограничений в одной таблице

```sql
CREATE TABLE Users (
    id INT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE
);
```

### NOT NULL (Запрет пустых значений)

Гарантирует, что столбец не может содержать NULL-значения. Полезно для обязательных полей.

```sql
CREATE TABLE Users (
    id INT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    bio TEXT
);
```

### CHECK (Проверка условия)

Позволяет определить условие, которому должны соответствовать значения в столбце.

Простой пример:

```sql
CREATE TABLE Products (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) CHECK (price > 0),
    quantity INT CHECK (quantity >= 0)
);
```

Именованное ограничение с проверкой между столбцами:

```sql
CREATE TABLE Employees (
    employee_id INT PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    birth_date DATE NOT NULL,
    hire_date DATE NOT NULL,
    CONSTRAINT chk_dates CHECK (hire_date > birth_date)
);
```

CHECK с регулярным выражением (PostgreSQL):

```sql
CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    age INT CHECK (age >= 0 AND age <= 150)
);
```

### DEFAULT (Значение по умолчанию)

Устанавливает значение, которое будет использовано, если при добавлении записи не указано значение для этого столбца.

```sql
CREATE TABLE Orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT,
    order_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);
```

PostgreSQL поддерживает сложные DEFAULT значения с функциями:

```sql
CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    uuid_field UUID DEFAULT gen_random_uuid()
);
```

## ON DELETE / ON UPDATE

Определяют поведение при изменении или удалении связанных записей в родительской таблице.

```sql
CREATE TABLE Users (
    id INTEGER,
    name VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL DEFAULT 18,
    company INTEGER,
    PRIMARY KEY (id),
    FOREIGN KEY (company) REFERENCES Companies (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);
```

### Опции для ON DELETE и ON UPDATE

| Действие | Описание |
|----------|----------|
| `CASCADE` | Автоматически удаляет или обновляет связанные записи |
| `SET NULL` | Устанавливает NULL для внешнего ключа |
| `SET DEFAULT` | Устанавливает значение по умолчанию |
| `RESTRICT` | Запрещает удаление или обновление (по умолчанию) |
| `NO ACTION` | Аналогично `RESTRICT` в большинстве случаев, но проверка отложена до конца транзакции |

Пример с CASCADE:

```sql
CREATE TABLE Orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2),
    FOREIGN KEY (user_id) REFERENCES Users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);
-- При удалении пользователя все его заказы удалятся автоматически
```

Пример с SET NULL:

```sql
CREATE TABLE Products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    category_id INT,
    FOREIGN KEY (category_id) REFERENCES Categories(id)
        ON DELETE SET NULL
);
-- При удалении категории у товаров category_id станет NULL
```

Пример с RESTRICT:

```sql
CREATE TABLE Orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) CHECK (total_amount >= 0),
    order_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES Users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);
-- Пользователя нельзя удалить, пока у него есть заказы
```

Ошибка при нарушении RESTRICT:

```
Cannot delete or update a parent row: a foreign key constraint fails
```

## Комплексные примеры

### Таблица пользователей с различными ограничениями

```sql
CREATE TABLE Users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    age INT CHECK (age >= 18),
    created_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active'
);
```

### Таблица заказов с внешними ключами

```sql
CREATE TABLE Orders (
    order_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    total_amount DECIMAL(10, 2) CHECK (total_amount >= 0),
    order_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES Users(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);
```

### Таблица продуктов с комплексными ограничениями

```sql
CREATE TABLE Products (
    product_id SERIAL PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    discount_price DECIMAL(10, 2),
    quantity INT NOT NULL DEFAULT 0,
    category_id INT,
    CONSTRAINT chk_price_positive CHECK (price > 0),
    CONSTRAINT chk_quantity_non_negative CHECK (quantity >= 0),
    CONSTRAINT chk_discount_less_than_price CHECK (discount_price IS NULL OR discount_price < price),
    FOREIGN KEY (category_id) REFERENCES Categories(id)
        ON DELETE SET NULL
);
```

## Лучшие практики

- Всегда определяйте первичный ключ для каждой таблицы
- Используйте внешние ключи для обеспечения ссылочной целостности
- Применяйте `NOT NULL` для столбцов, которые должны содержать значения
- Используйте `UNIQUE` для столбцов с уникальными значениями (email, номер телефона)
- Добавляйте `CHECK` для столбцов, значения которых должны соответствовать бизнес-правилам
- Устанавливайте `DEFAULT` для столбцов, которые часто принимают одно и то же значение
- Указывайте имена для ограничений: `CONSTRAINT pk_users PRIMARY KEY (id)` -- облегчает идентификацию и управление
- Используйте `IF NOT EXISTS` / `IF EXISTS` для предотвращения ошибок при создании/удалении
