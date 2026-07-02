# PostgreSQL -- особенности

## Оглавление

- [PostgreSQL как СУБД](#postgresql-как-субд)
- [MVCC (Multi-Version Concurrency Control)](#mvcc-multi-version-concurrency-control)
- [VACUUM](#vacuum)
- [WAL (Write-Ahead Logging)](#wal-write-ahead-logging)
- [Репликация](#репликация)
- [Типы данных PostgreSQL (уникальные)](#типы-данных-postgresql-уникальные)
- [Полнотекстовый поиск](#полнотекстовый-поиск)
- [Расширения (Extensions)](#расширения-extensions)
- [Роли и права доступа](#роли-и-права-доступа)
- [Схемы (Schemas)](#схемы-schemas)
- [Партиционирование таблиц](#партиционирование-таблиц)

---

## PostgreSQL как СУБД

### Объектно-реляционная СУБД

PostgreSQL -- это **объектно-реляционная** система управления базами данных (ORDBMS). В отличие от чисто реляционных СУБД, PostgreSQL поддерживает:

- **Наследование таблиц** -- дочерняя таблица наследует столбцы родительской.
- **Пользовательские типы данных** -- можно создавать составные типы, перечисления, диапазоны.
- **Табличные функции** -- функции, возвращающие набор строк.
- **Правила (Rules)** и **триггеры** на уровне строк и операторов.

```sql
-- Наследование таблиц
CREATE TABLE vehicles (
    id      SERIAL PRIMARY KEY,
    brand   VARCHAR(50),
    model   VARCHAR(50),
    year    INT
);

CREATE TABLE trucks (
    payload_kg  NUMERIC(10, 2)
) INHERITS (vehicles);

-- Запрос к родительской таблице включает строки дочерних:
SELECT * FROM vehicles;       -- все транспортные средства, включая грузовики
SELECT * FROM ONLY vehicles;  -- только записи из vehicles, без наследников
```

### Расширяемость

PostgreSQL спроектирован как расширяемая система. Пользователи могут добавлять:
- Новые типы данных
- Новые функции и операторы
- Новые языки процедур (PL/pgSQL, PL/Python, PL/Perl, PL/v8)
- Новые методы индексирования
- Расширения (extensions)

```sql
-- Создание пользовательского составного типа
CREATE TYPE address AS (
    street  VARCHAR(200),
    city    VARCHAR(100),
    zip     VARCHAR(10)
);

-- Использование в таблице
CREATE TABLE companies (
    id       SERIAL PRIMARY KEY,
    name     VARCHAR(100),
    hq       address
);

INSERT INTO companies (name, hq)
VALUES ('Компания А', ROW('ул. Ленина 1', 'Москва', '101000'));

SELECT name, (hq).city FROM companies;
```

### Лицензия и экосистема

PostgreSQL распространяется под **PostgreSQL License** -- либеральной лицензией, аналогичной MIT/BSD. Это позволяет:
- Использовать в коммерческих продуктах без ограничений
- Модифицировать исходный код
- Распространять без раскрытия изменений

Экосистема включает множество инструментов:
- **pgAdmin** -- графический клиент администрирования
- **pg_dump / pg_restore** -- резервное копирование и восстановление
- **pgBouncer** -- пулинг соединений
- **Patroni** -- высокая доступность и автоматический failover
- **Citus** -- горизонтальное масштабирование (шардирование)
- **TimescaleDB** -- расширение для временных рядов

---

## MVCC (Multi-Version Concurrency Control)

### Принцип работы

MVCC -- механизм управления параллельным доступом, при котором каждая транзакция видит **согласованный снимок (snapshot)** данных на момент начала транзакции (или оператора, в зависимости от уровня изоляции). Вместо блокировки строк для чтения PostgreSQL хранит **несколько версий** каждой строки.

Ключевой принцип: **читатели не блокируют писателей, писатели не блокируют читателей**.

### xmin и xmax -- версионность строк

Каждая строка (tuple) в PostgreSQL содержит скрытые системные столбцы:

| Столбец | Описание |
|---------|----------|
| `xmin` | ID транзакции, создавшей эту версию строки |
| `xmax` | ID транзакции, удалившей или обновившей эту версию (0, если строка актуальна) |
| `ctid` | Физическое расположение строки на диске (номер страницы, позиция) |

```sql
-- Просмотр системных столбцов
CREATE TABLE test_mvcc (id INT, value TEXT);
INSERT INTO test_mvcc VALUES (1, 'hello');

SELECT xmin, xmax, ctid, * FROM test_mvcc;
--  xmin | xmax | ctid  | id | value
-- ------+------+-------+----+-------
--   100 |    0 | (0,1) |  1 | hello

-- После UPDATE создаётся новая версия строки:
UPDATE test_mvcc SET value = 'world' WHERE id = 1;

SELECT xmin, xmax, ctid, * FROM test_mvcc;
--  xmin | xmax | ctid  | id | value
-- ------+------+-------+----+-------
--   101 |    0 | (0,2) |  1 | world
-- Старая версия (0,1) помечена как удалённая (xmax = 101)
```

### Как работает видимость строк

Когда транзакция читает данные, она проверяет для каждой версии строки:

1. Была ли транзакция `xmin` завершена (committed) на момент начала текущей транзакции?
2. Не была ли строка удалена транзакцией `xmax`, которая завершилась до начала текущей?

Если `xmin` зафиксирована и `xmax` либо 0, либо не зафиксирована -- строка видима.

```sql
-- Демонстрация MVCC: две параллельные транзакции

-- Сессия 1:
BEGIN;
SELECT * FROM test_mvcc;  -- видит (1, 'world')

-- Сессия 2 (одновременно):
BEGIN;
UPDATE test_mvcc SET value = 'updated' WHERE id = 1;
COMMIT;

-- Сессия 1 (продолжение):
SELECT * FROM test_mvcc;  -- всё ещё видит (1, 'world') при READ COMMITTED
                          -- (снимок обновляется для каждого оператора)
COMMIT;
```

### «Мёртвые» версии строк

При UPDATE или DELETE старые версии строк **не удаляются сразу** -- они остаются на диске как «мёртвые» (dead tuples). Это необходимо, потому что другие транзакции могут всё ещё их видеть.

Последствия:
- Таблицы со временем «раздуваются» (table bloat).
- Индексы также содержат ссылки на мёртвые строки.
- Для очистки необходим процесс VACUUM.

```sql
-- Проверка количества мёртвых строк
SELECT relname, n_live_tup, n_dead_tup, last_vacuum, last_autovacuum
FROM pg_stat_user_tables
WHERE relname = 'test_mvcc';
```

---

## VACUUM

### Зачем нужен

VACUUM -- процесс сборки мусора в PostgreSQL. Он выполняет:

1. **Освобождение пространства**, занятого мёртвыми версиями строк.
2. **Обновление карты видимости** (Visibility Map) -- отметки о страницах, где все строки видимы всем транзакциям.
3. **Обновление карты свободного пространства** (Free Space Map) -- информация о доступном пространстве на страницах.
4. **Предотвращение «оборачивания» счётчика транзакций** (transaction ID wraparound) -- без VACUUM при исчерпании 32-битного счётчика возможна потеря данных.

### VACUUM vs VACUUM FULL

```sql
-- Обычный VACUUM: освобождает пространство внутри файлов таблицы,
-- но не возвращает место операционной системе.
-- Не блокирует чтение и запись.
VACUUM my_table;

-- VACUUM FULL: полностью переписывает таблицу в новый файл,
-- возвращает место ОС, но БЛОКИРУЕТ таблицу на всё время работы.
-- Использовать только при сильном bloat.
VACUUM FULL my_table;
```

| Характеристика | VACUUM | VACUUM FULL |
|---------------|--------|-------------|
| Блокировка таблицы | Нет (ShareUpdateExclusiveLock) | Да (AccessExclusiveLock) |
| Возврат места ОС | Нет | Да |
| Время работы | Быстро | Медленно (перезаписывает всю таблицу) |
| Параллельная работа | Да, можно читать и писать | Нет, таблица заблокирована |
| Перестроение индексов | Нет | Да |

### Autovacuum

Autovacuum -- фоновый процесс, который автоматически запускает VACUUM и ANALYZE для таблиц, в которых накопилось достаточно изменений.

```sql
-- Проверка настроек autovacuum
SHOW autovacuum;                         -- on/off
SHOW autovacuum_vacuum_threshold;        -- мин. кол-во мёртвых строк (по умолчанию 50)
SHOW autovacuum_vacuum_scale_factor;     -- доля таблицы (по умолчанию 0.2 = 20%)
SHOW autovacuum_naptime;                 -- интервал проверки (по умолчанию 1 мин)

-- Формула запуска: dead_tuples > threshold + scale_factor * n_live_tup

-- Настройка autovacuum для конкретной таблицы
ALTER TABLE high_write_table SET (
    autovacuum_vacuum_scale_factor = 0.01,    -- 1% вместо 20%
    autovacuum_vacuum_threshold = 100,
    autovacuum_analyze_scale_factor = 0.005
);

-- Просмотр последних запусков autovacuum
SELECT relname, last_autovacuum, autovacuum_count, n_dead_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

### VACUUM ANALYZE

```sql
-- VACUUM ANALYZE: очистка + обновление статистики для планировщика запросов
VACUUM ANALYZE my_table;

-- Только ANALYZE (без очистки):
ANALYZE my_table;

-- ANALYZE для конкретного столбца:
ANALYZE my_table(important_column);
```

Статистика, собранная ANALYZE, используется планировщиком запросов для выбора оптимального плана выполнения (выбор индекса, порядок JOIN и т.д.).

---

## WAL (Write-Ahead Logging)

### Принцип журналирования

**Write-Ahead Logging** -- механизм, гарантирующий, что все изменения данных **сначала записываются в журнал (WAL)**, и только потом -- в файлы данных. Это обеспечивает долговечность (durability) транзакций даже при сбое.

Принцип работы:
1. Транзакция изменяет данные в **общем буферном кэше** (shared buffers) в памяти.
2. Запись об изменении добавляется в **WAL-буфер**.
3. При COMMIT WAL-буфер **сбрасывается на диск** (fsync).
4. Изменённые страницы данных записываются на диск **позже** (checkpoint).

```sql
-- Просмотр текущей позиции в WAL
SELECT pg_current_wal_lsn();

-- Просмотр размера WAL
SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0') AS wal_bytes;

-- Настройки WAL
SHOW wal_level;             -- minimal, replica, logical
SHOW max_wal_size;          -- макс. размер WAL между контрольными точками
SHOW min_wal_size;          -- мин. размер WAL
SHOW checkpoint_timeout;    -- интервал между контрольными точками
SHOW wal_compression;       -- сжатие WAL (on/off)
```

### Восстановление после сбоя

При запуске после аварийного завершения PostgreSQL автоматически выполняет **восстановление (crash recovery)**:

1. Находит последнюю контрольную точку (checkpoint) в WAL.
2. **Повторяет (replay)** все записи WAL от контрольной точки до конца журнала.
3. База данных возвращается в согласованное состояние.

Это гарантирует, что зафиксированные транзакции не теряются, а незафиксированные откатываются.

### Контрольные точки (Checkpoints)

```sql
-- Ручной вызов контрольной точки
CHECKPOINT;

-- Мониторинг контрольных точек
SELECT * FROM pg_stat_bgwriter;
-- checkpoints_timed   -- по таймауту
-- checkpoints_req     -- по запросу или достижению max_wal_size
-- checkpoint_write_time
-- checkpoint_sync_time
```

### pg_wal

Файлы WAL хранятся в каталоге `$PGDATA/pg_wal/`. Каждый файл WAL имеет размер 16 МБ (по умолчанию). Файлы WAL именуются по формату `TIMELINE + LSN`.

```sql
-- Просмотр файлов WAL (из SQL):
SELECT * FROM pg_ls_waldir() ORDER BY modification DESC LIMIT 5;

-- Архивация WAL (для резервного копирования)
-- В postgresql.conf:
-- archive_mode = on
-- archive_command = 'cp %p /archive/%f'
```

---

## Репликация

### Физическая репликация (Streaming Replication)

Физическая репликация передаёт **WAL-записи** на реплику, которая применяет их побайтово. Реплика является точной копией основного сервера.

```sql
-- На основном сервере (primary):
-- postgresql.conf
-- wal_level = replica
-- max_wal_senders = 10
-- wal_keep_size = 1GB

-- Создание роли для репликации
CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD 'secure_password';

-- pg_hba.conf (разрешение подключения реплики)
-- host replication replicator 192.168.1.0/24 scram-sha-256
```

На реплике создаётся файл конфигурации:

```sql
-- На реплике (standby):
-- primary_conninfo = 'host=192.168.1.1 port=5432 user=replicator password=secure_password'
-- В PostgreSQL 12+ используется файл standby.signal

-- Проверка статуса репликации (на primary):
SELECT client_addr, state, sent_lsn, write_lsn, flush_lsn, replay_lsn
FROM pg_stat_replication;

-- Проверка отставания реплики:
SELECT
    client_addr,
    pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag_bytes,
    replay_lag
FROM pg_stat_replication;
```

### Логическая репликация

Логическая репликация передаёт **изменения данных** на уровне строк (INSERT, UPDATE, DELETE). Позволяет реплицировать отдельные таблицы и даже между разными версиями PostgreSQL.

```sql
-- На издателе (publisher):
-- wal_level = logical

-- Создание публикации
CREATE PUBLICATION my_pub FOR TABLE orders, customers;

-- Публикация всех таблиц
CREATE PUBLICATION all_tables_pub FOR ALL TABLES;

-- Публикация с фильтрацией (PostgreSQL 15+)
CREATE PUBLICATION filtered_pub FOR TABLE orders WHERE (status = 'completed');

-- На подписчике (subscriber):
CREATE SUBSCRIPTION my_sub
    CONNECTION 'host=192.168.1.1 port=5432 dbname=mydb user=replicator password=secret'
    PUBLICATION my_pub;

-- Проверка статуса подписки
SELECT * FROM pg_stat_subscription;

-- Проверка статуса публикации
SELECT * FROM pg_publication_tables;
```

### Синхронная vs асинхронная репликация

| Характеристика | Асинхронная | Синхронная |
|---------------|------------|------------|
| COMMIT ждёт реплику | Нет | Да |
| Потеря данных при сбое primary | Возможна | Нет (гарантия) |
| Задержка записи | Минимальная | Зависит от сети |
| Доступность | Высокая | Зависит от реплики |

```sql
-- Настройка синхронной репликации (на primary):
-- synchronous_standby_names = 'replica1'
-- synchronous_commit = on       -- ждать подтверждения от реплики

-- Варианты synchronous_commit:
-- off           -- не ждать даже локальной записи WAL (быстро, но рискованно)
-- local         -- ждать только локальной записи WAL
-- remote_write  -- ждать записи WAL на реплике (в буфер ОС)
-- on            -- ждать сброса WAL на диск реплики
-- remote_apply  -- ждать применения WAL на реплике (самый строгий)
```

### Read replicas

Реплики могут обслуживать **запросы на чтение**, распределяя нагрузку:

```sql
-- На реплике:
-- hot_standby = on  (по умолчанию в PostgreSQL 10+)

-- Реплика принимает SELECT-запросы:
SELECT * FROM orders WHERE order_date > '2025-01-01';

-- Но запись запрещена:
INSERT INTO orders (...) VALUES (...);  -- ERROR: cannot execute INSERT in a read-only transaction

-- Проверка, является ли сервер репликой:
SELECT pg_is_in_recovery();  -- true = реплика, false = primary
```

---

## Типы данных PostgreSQL (уникальные)

### JSONB

JSONB -- бинарный формат хранения JSON. В отличие от `JSON`, данные парсятся при записи, хранятся в разобранном виде, поддерживают индексирование.

```sql
CREATE TABLE events (
    id    SERIAL PRIMARY KEY,
    data  JSONB NOT NULL
);

INSERT INTO events (data) VALUES
('{"type": "click", "page": "/home", "user": {"id": 1, "name": "Иванов"}}'),
('{"type": "view", "page": "/about", "tags": ["info", "company"]}'),
('{"type": "click", "page": "/products", "user": {"id": 2, "name": "Петров"}}');
```

#### Операторы доступа

```sql
-- -> возвращает JSON-элемент (тип jsonb)
SELECT data -> 'type' FROM events;                -- "click" (с кавычками, тип jsonb)

-- ->> возвращает текстовое значение (тип text)
SELECT data ->> 'type' FROM events;               -- click (без кавычек, тип text)

-- Вложенный доступ
SELECT data -> 'user' ->> 'name' FROM events;     -- Иванов

-- #> путь к вложенному элементу (возвращает jsonb)
SELECT data #> '{user, name}' FROM events;         -- "Иванов"

-- #>> путь к вложенному элементу (возвращает text)
SELECT data #>> '{user, name}' FROM events;        -- Иванов
```

#### Операторы проверки

```sql
-- @> содержит (containment) -- левый JSONB содержит правый
SELECT * FROM events WHERE data @> '{"type": "click"}';

-- <@ содержится в
SELECT * FROM events WHERE '{"type": "click"}' <@ data;

-- ? ключ существует
SELECT * FROM events WHERE data ? 'tags';

-- ?| хотя бы один из ключей существует
SELECT * FROM events WHERE data ?| array['tags', 'user'];

-- ?& все ключи существуют
SELECT * FROM events WHERE data ?& array['type', 'page'];
```

#### Функции для работы с JSONB

```sql
-- jsonb_each: разворачивает JSON-объект в набор пар (key, value)
SELECT key, value FROM events, jsonb_each(data) WHERE id = 1;

-- jsonb_array_elements: разворачивает JSON-массив в набор строк
SELECT jsonb_array_elements(data -> 'tags') AS tag
FROM events
WHERE data ? 'tags';

-- jsonb_set: изменение значения по пути
UPDATE events
SET data = jsonb_set(data, '{page}', '"/new-page"')
WHERE id = 1;

-- || объединение JSONB
UPDATE events
SET data = data || '{"priority": "high"}'
WHERE id = 1;

-- - удаление ключа
UPDATE events
SET data = data - 'priority'
WHERE id = 1;

-- #- удаление по пути
UPDATE events
SET data = data #- '{user, name}'
WHERE id = 1;

-- jsonb_pretty: форматированный вывод
SELECT jsonb_pretty(data) FROM events WHERE id = 1;

-- jsonb_typeof: тип значения
SELECT jsonb_typeof(data -> 'tags') FROM events WHERE id = 2;  -- array
```

#### Индексирование JSONB

```sql
-- GIN-индекс для операторов @>, ?, ?|, ?&
CREATE INDEX idx_events_data ON events USING GIN (data);

-- GIN-индекс с классом jsonb_path_ops (компактнее, только @>)
CREATE INDEX idx_events_data_path ON events USING GIN (data jsonb_path_ops);

-- B-tree индекс на конкретное поле
CREATE INDEX idx_events_type ON events ((data ->> 'type'));
```

---

### Массивы (ARRAY)

PostgreSQL поддерживает столбцы-массивы для любого встроенного или пользовательского типа.

```sql
CREATE TABLE students (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100),
    scores  INT[],
    tags    TEXT[]
);

INSERT INTO students (name, scores, tags) VALUES
('Иванов', ARRAY[5, 4, 5, 3], ARRAY['отличник', 'активист']),
('Петров', '{4, 3, 4, 4}', '{"спортсмен"}'),
('Сидоров', ARRAY[3, 3, 2, 3], ARRAY['прогульщик']);
```

#### Операции с массивами

```sql
-- Доступ по индексу (индексация с 1)
SELECT name, scores[1] AS first_score FROM students;

-- Срез массива
SELECT name, scores[2:3] FROM students;

-- ANY: хотя бы один элемент удовлетворяет условию
SELECT name FROM students WHERE 5 = ANY(scores);

-- ALL: все элементы удовлетворяют условию
SELECT name FROM students WHERE 3 <= ALL(scores);

-- @> массив содержит элементы
SELECT name FROM students WHERE tags @> ARRAY['отличник'];

-- <@ массив содержится в
SELECT name FROM students WHERE ARRAY['отличник'] <@ tags;

-- || конкатенация массивов
SELECT ARRAY[1, 2] || ARRAY[3, 4];  -- {1,2,3,4}

-- Добавление элемента
UPDATE students SET tags = tags || ARRAY['староста'] WHERE name = 'Иванов';

-- array_agg: агрегация в массив
SELECT array_agg(name) FROM students WHERE 4 = ANY(scores);

-- unnest: развёртывание массива в строки
SELECT name, unnest(scores) AS score FROM students;

-- array_length: длина массива
SELECT name, array_length(scores, 1) AS num_scores FROM students;

-- array_remove: удаление элемента
UPDATE students SET scores = array_remove(scores, 3) WHERE name = 'Сидоров';
```

#### Индексирование массивов

```sql
-- GIN-индекс для операторов @>, <@, &&
CREATE INDEX idx_students_tags ON students USING GIN (tags);

-- Поиск с использованием индекса
SELECT * FROM students WHERE tags @> ARRAY['отличник'];
```

---

### hstore

hstore -- тип данных для хранения пар ключ-значение. Подходит для полуструктурированных данных.

```sql
-- Установка расширения
CREATE EXTENSION IF NOT EXISTS hstore;

CREATE TABLE product_attrs (
    id     SERIAL PRIMARY KEY,
    name   VARCHAR(100),
    attrs  hstore
);

INSERT INTO product_attrs (name, attrs) VALUES
('Ноутбук', 'cpu => "Intel i7", ram => "16GB", ssd => "512GB"'),
('Телефон', 'cpu => "Snapdragon 8", ram => "8GB", screen => "6.7 inch"');

-- Доступ по ключу
SELECT name, attrs -> 'ram' AS ram FROM product_attrs;

-- Проверка наличия ключа
SELECT name FROM product_attrs WHERE attrs ? 'ssd';

-- Получение всех ключей / значений
SELECT name, akeys(attrs), avals(attrs) FROM product_attrs;

-- Преобразование в набор строк
SELECT name, key, value
FROM product_attrs, each(attrs);
```

---

### UUID

```sql
-- Расширение для генерации UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE sessions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sessions (user_id) VALUES (1);

SELECT * FROM sessions;
-- id: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11

-- В PostgreSQL 13+ можно использовать встроенную функцию:
CREATE TABLE tokens (
    id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT NOT NULL
);
```

---

### Сетевые типы

```sql
CREATE TABLE network_config (
    id       SERIAL PRIMARY KEY,
    host_ip  inet,           -- IP-адрес с маской (192.168.1.1/24)
    network  cidr,           -- сеть (192.168.1.0/24)
    mac      macaddr         -- MAC-адрес
);

INSERT INTO network_config (host_ip, network, mac) VALUES
('192.168.1.100/24', '192.168.1.0/24', '08:00:2b:01:02:03'),
('10.0.0.1/8', '10.0.0.0/8', 'aa:bb:cc:dd:ee:ff');

-- Проверка принадлежности к сети
SELECT * FROM network_config WHERE host_ip << '192.168.0.0/16'::cidr;

-- Операторы:
-- << содержится в сети
-- >> содержит сеть
-- && пересечение сетей
-- host() извлечение адреса без маски
SELECT host(host_ip), masklen(host_ip) FROM network_config;
```

---

### Диапазоны (Ranges)

```sql
CREATE TABLE reservations (
    id        SERIAL PRIMARY KEY,
    room      VARCHAR(50),
    period    tsrange NOT NULL,     -- диапазон timestamp
    EXCLUDE USING gist (room WITH =, period WITH &&)  -- запрет пересекающихся бронирований
);

INSERT INTO reservations (room, period) VALUES
('Зал А', '[2025-06-01 10:00, 2025-06-01 12:00)'),
('Зал А', '[2025-06-01 14:00, 2025-06-01 16:00)'),
('Зал Б', '[2025-06-01 10:00, 2025-06-01 15:00)');

-- Попытка создать пересекающееся бронирование вызовет ошибку:
-- INSERT INTO reservations (room, period) VALUES
--   ('Зал А', '[2025-06-01 11:00, 2025-06-01 13:00)');
-- ERROR: conflicting key value violates exclusion constraint

-- Операторы диапазонов
SELECT * FROM reservations
WHERE period @> '2025-06-01 11:00'::timestamp;       -- содержит значение

SELECT * FROM reservations
WHERE period && '[2025-06-01 09:00, 2025-06-01 11:00)'::tsrange;  -- пересечение

-- Встроенные типы диапазонов:
-- int4range, int8range     -- целочисленные
-- numrange                 -- numeric
-- tsrange, tstzrange       -- timestamp (с/без таймзоны)
-- daterange                -- даты
```

---

### Перечисления (ENUM)

```sql
CREATE TYPE order_status AS ENUM ('new', 'processing', 'shipped', 'delivered', 'cancelled');

CREATE TABLE orders (
    id      SERIAL PRIMARY KEY,
    status  order_status NOT NULL DEFAULT 'new'
);

INSERT INTO orders (status) VALUES ('new'), ('processing'), ('shipped');

-- ENUM поддерживает сравнения по порядку определения значений:
SELECT * FROM orders WHERE status > 'processing';  -- shipped, delivered

-- Добавление нового значения в ENUM
ALTER TYPE order_status ADD VALUE 'returned' AFTER 'delivered';

-- Просмотр значений ENUM
SELECT enum_range(NULL::order_status);
-- {new,processing,shipped,delivered,returned,cancelled}
```

---

## Полнотекстовый поиск

PostgreSQL имеет встроенный полнотекстовый поиск без необходимости внешних систем (Elasticsearch, Sphinx).

### tsvector и tsquery

```sql
-- tsvector: предобработанный текст (лексемы с позициями)
SELECT to_tsvector('russian', 'PostgreSQL -- мощная объектно-реляционная база данных');
-- 'баз':4 'данн':5 'мощн':2 'объектно-реляцион':3 'postgresql':1

-- tsquery: поисковый запрос
SELECT to_tsquery('russian', 'мощная & база');
-- 'мощн' & 'баз'

-- plainto_tsquery: более простой вариант (без необходимости операторов)
SELECT plainto_tsquery('russian', 'мощная база данных');
-- 'мощн' & 'баз' & 'дан'

-- phraseto_tsquery: фразовый поиск (учитывает порядок слов)
SELECT phraseto_tsquery('russian', 'база данных');
-- 'баз' <-> 'дан'

-- websearch_to_tsquery (PostgreSQL 11+): синтаксис как в поисковиках
SELECT websearch_to_tsquery('russian', '"база данных" -oracle');
-- 'баз' <-> 'дан' & !'oracl'
```

### Оператор @@ (поиск)

```sql
CREATE TABLE articles (
    id       SERIAL PRIMARY KEY,
    title    VARCHAR(200),
    body     TEXT,
    tsv      tsvector  -- предвычисленный вектор
);

INSERT INTO articles (title, body) VALUES
('Введение в PostgreSQL', 'PostgreSQL -- мощная объектно-реляционная система управления базами данных.'),
('Индексы в базах данных', 'Индексы ускоряют выборку данных. B-tree -- самый распространённый тип индекса.'),
('Транзакции и ACID', 'Транзакция -- это группа операций, выполняемых как единое целое.');

-- Обновление tsvector
UPDATE articles
SET tsv = to_tsvector('russian', title || ' ' || body);

-- Поиск
SELECT title
FROM articles
WHERE tsv @@ to_tsquery('russian', 'индекс & данные');

-- Поиск без предвычисленного столбца (медленнее)
SELECT title
FROM articles
WHERE to_tsvector('russian', title || ' ' || body) @@ to_tsquery('russian', 'PostgreSQL');

-- Ранжирование результатов
SELECT title, ts_rank(tsv, query) AS rank
FROM articles, to_tsquery('russian', 'база & данные') AS query
WHERE tsv @@ query
ORDER BY rank DESC;

-- Подсветка найденных слов
SELECT ts_headline('russian', body, to_tsquery('russian', 'индекс & данные'),
    'StartSel=<b>, StopSel=</b>, MaxFragments=2')
FROM articles
WHERE tsv @@ to_tsquery('russian', 'индекс & данные');
```

### Автоматическое обновление tsvector через триггер

```sql
-- Создание триггера для автоматического обновления tsvector
CREATE TRIGGER tsvector_update
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION tsvector_update_trigger(tsv, 'pg_catalog.russian', title, body);
```

### GIN-индексы для полнотекстового поиска

```sql
-- GIN-индекс на предвычисленный столбец (рекомендуемый способ)
CREATE INDEX idx_articles_tsv ON articles USING GIN (tsv);

-- GIN-индекс на выражение (без дополнительного столбца)
CREATE INDEX idx_articles_fts ON articles
    USING GIN (to_tsvector('russian', title || ' ' || body));

-- Проверка использования индекса
EXPLAIN ANALYZE
SELECT title FROM articles WHERE tsv @@ to_tsquery('russian', 'индекс');
```

| Тип индекса | Размер | Скорость создания | Скорость поиска | Обновление |
|------------|--------|-------------------|-----------------|------------|
| GIN | Больше | Медленнее | Быстрее | Медленнее |
| GiST | Меньше | Быстрее | Медленнее | Быстрее |

---

## Расширения (Extensions)

### CREATE EXTENSION

Расширения -- механизм упаковки и распространения дополнительной функциональности.

```sql
-- Установка расширения
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Просмотр установленных расширений
SELECT * FROM pg_extension;

-- Просмотр доступных расширений
SELECT * FROM pg_available_extensions ORDER BY name;

-- Обновление расширения
ALTER EXTENSION pg_trgm UPDATE TO '1.6';

-- Удаление расширения
DROP EXTENSION pg_trgm;
```

### Популярные расширения

#### pg_trgm -- поиск по триграммам

```sql
CREATE EXTENSION pg_trgm;

-- Нечёткий поиск (опечатки, похожие строки)
SELECT similarity('PostgreSQL', 'PostreSQL');    -- 0.7 (от 0 до 1)
SELECT word_similarity('data', 'database');      -- 0.5

-- Поиск похожих строк
SELECT name FROM customers
WHERE name % 'Иванв'                            -- оператор % (похожесть > порог)
ORDER BY similarity(name, 'Иванв') DESC;

-- GIN/GiST индексы для триграммного поиска
CREATE INDEX idx_customers_name_trgm ON customers USING GIN (name gin_trgm_ops);

-- LIKE и ILIKE с использованием GIN-индекса
SELECT * FROM customers WHERE name ILIKE '%ванов%';
```

#### uuid-ossp -- генерация UUID

```sql
CREATE EXTENSION "uuid-ossp";

SELECT uuid_generate_v4();            -- случайный UUID
SELECT uuid_generate_v1();            -- на основе MAC-адреса и времени
SELECT uuid_generate_v5(uuid_ns_url(), 'https://example.com');  -- детерминированный UUID
```

#### pg_stat_statements -- статистика запросов

```sql
CREATE EXTENSION pg_stat_statements;

-- Самые долгие запросы
SELECT query, calls, total_exec_time, mean_exec_time, rows
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Самые частые запросы
SELECT query, calls, total_exec_time
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 10;

-- Сброс статистики
SELECT pg_stat_statements_reset();
```

#### PostGIS -- геопространственные данные

```sql
CREATE EXTENSION postgis;

CREATE TABLE places (
    id       SERIAL PRIMARY KEY,
    name     VARCHAR(100),
    location GEOMETRY(Point, 4326)
);

INSERT INTO places (name, location) VALUES
('Красная площадь', ST_SetSRID(ST_MakePoint(37.6208, 55.7539), 4326)),
('Эрмитаж',        ST_SetSRID(ST_MakePoint(30.3146, 59.9398), 4326));

-- Поиск мест в радиусе 1000 км от точки
SELECT name, ST_Distance(
    location::geography,
    ST_SetSRID(ST_MakePoint(37.6, 55.75), 4326)::geography
) / 1000 AS distance_km
FROM places
WHERE ST_DWithin(
    location::geography,
    ST_SetSRID(ST_MakePoint(37.6, 55.75), 4326)::geography,
    1000000  -- 1000 км в метрах
);
```

#### pg_cron -- планировщик задач

```sql
CREATE EXTENSION pg_cron;

-- Запуск VACUUM каждую ночь в 3:00
SELECT cron.schedule('nightly-vacuum', '0 3 * * *', 'VACUUM ANALYZE orders');

-- Обновление материализованного представления каждый час
SELECT cron.schedule('refresh-mv', '0 * * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_sales');

-- Удаление старых данных каждый день
SELECT cron.schedule('cleanup', '0 4 * * *',
    'DELETE FROM logs WHERE created_at < NOW() - INTERVAL ''90 days''');

-- Просмотр запланированных задач
SELECT * FROM cron.job;

-- Удаление задачи
SELECT cron.unschedule('nightly-vacuum');
```

---

## Роли и права доступа

### CREATE ROLE / CREATE USER

В PostgreSQL **нет отдельного понятия «пользователь»** -- всё управляется через **роли**. `CREATE USER` -- это алиас для `CREATE ROLE ... WITH LOGIN`.

```sql
-- Создание роли (без возможности входа)
CREATE ROLE readonly;

-- Создание пользователя (роль с LOGIN)
CREATE USER app_user WITH PASSWORD 'secure_password';

-- То же самое:
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password';

-- Роль с расширенными правами
CREATE ROLE admin_user WITH
    LOGIN
    PASSWORD 'admin_password'
    CREATEDB
    CREATEROLE
    VALID UNTIL '2026-12-31';

-- Изменение роли
ALTER ROLE app_user SET statement_timeout = '30s';
ALTER ROLE app_user WITH CONNECTION LIMIT 10;

-- Назначение роли другой роли (наследование прав)
GRANT readonly TO app_user;

-- Просмотр ролей
SELECT rolname, rolsuper, rolcreatedb, rolcanlogin
FROM pg_roles
WHERE rolname NOT LIKE 'pg_%';
```

### GRANT / REVOKE

```sql
-- Права на базу данных
GRANT CONNECT ON DATABASE mydb TO app_user;

-- Права на схему
GRANT USAGE ON SCHEMA public TO readonly;

-- Права на таблицу
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO app_user;

-- Права на последовательности (для SERIAL/IDENTITY)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Права на выполнение функций
GRANT EXECUTE ON FUNCTION my_function(INT) TO app_user;

-- Права по умолчанию для будущих таблиц
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO readonly;

-- Отзыв прав
REVOKE INSERT, UPDATE, DELETE ON orders FROM readonly;
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM app_user;

-- Проверка прав
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public'
ORDER BY grantee, table_name;
```

### Row-Level Security (RLS)

RLS позволяет ограничить доступ к **отдельным строкам** таблицы на основе свойств текущего пользователя.

```sql
CREATE TABLE documents (
    id         SERIAL PRIMARY KEY,
    title      VARCHAR(200),
    content    TEXT,
    owner      VARCHAR(50) NOT NULL,
    department VARCHAR(50) NOT NULL
);

INSERT INTO documents (title, content, owner, department) VALUES
('Отчёт Q1', 'Данные за первый квартал', 'ivanov', 'sales'),
('Бюджет',   'Финансовый план',          'petrov', 'finance'),
('Стратегия', 'План развития',           'ivanov', 'sales');

-- Включение RLS для таблицы
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свои документы
CREATE POLICY user_documents ON documents
    FOR ALL
    USING (owner = current_user);

-- Политика: менеджер видит документы своего отдела
CREATE POLICY department_documents ON documents
    FOR SELECT
    USING (department = current_setting('app.department'));

-- Установка переменной приложения (в начале сессии)
SET app.department = 'sales';

-- Политика с разными правилами для SELECT и INSERT
CREATE POLICY select_policy ON documents
    FOR SELECT
    USING (owner = current_user OR department = current_setting('app.department'));

CREATE POLICY insert_policy ON documents
    FOR INSERT
    WITH CHECK (owner = current_user);  -- можно вставлять только от своего имени

-- BYPASSRLS: суперпользователь и владелец таблицы обходят RLS по умолчанию.
-- Чтобы владелец тоже подчинялся RLS:
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

-- Просмотр политик
SELECT * FROM pg_policies WHERE tablename = 'documents';
```

---

## Схемы (Schemas)

### CREATE SCHEMA

Схема -- это пространство имён внутри базы данных. Позволяет организовать объекты (таблицы, функции, типы) в логические группы.

```sql
-- Создание схемы
CREATE SCHEMA sales;
CREATE SCHEMA hr;
CREATE SCHEMA analytics;

-- Создание схемы с владельцем
CREATE SCHEMA sales AUTHORIZATION sales_manager;

-- Создание таблицы в схеме
CREATE TABLE sales.orders (
    id      SERIAL PRIMARY KEY,
    amount  NUMERIC(10, 2)
);

CREATE TABLE hr.employees (
    id      SERIAL PRIMARY KEY,
    name    VARCHAR(100)
);

-- Обращение к объектам через полное имя
SELECT * FROM sales.orders;
SELECT * FROM hr.employees;
```

### search_path

`search_path` определяет порядок поиска схем при обращении к объектам без указания схемы.

```sql
-- Просмотр текущего search_path
SHOW search_path;
-- "$user", public

-- Порядок поиска:
-- 1. Схема с именем текущего пользователя (если существует)
-- 2. public

-- Изменение search_path для текущей сессии
SET search_path TO sales, public;

-- Теперь можно обращаться без префикса:
SELECT * FROM orders;  -- найдёт sales.orders

-- Изменение search_path для роли (постоянно)
ALTER ROLE app_user SET search_path TO sales, analytics, public;

-- Изменение search_path для базы данных
ALTER DATABASE mydb SET search_path TO public, sales;
```

### Схема public

По умолчанию все объекты создаются в схеме `public`. В PostgreSQL 15+ по умолчанию **только владелец базы данных** может создавать объекты в `public`.

```sql
-- Просмотр объектов в схемах
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY schemaname, tablename;

-- Удаление схемы (пустой)
DROP SCHEMA sales;

-- Удаление схемы со всеми объектами
DROP SCHEMA sales CASCADE;

-- Права на схему
GRANT USAGE ON SCHEMA sales TO readonly;
GRANT CREATE ON SCHEMA sales TO app_user;
```

---

## Партиционирование таблиц

Партиционирование (секционирование) -- разделение большой таблицы на меньшие физические части (партиции), при этом логически она остаётся единой таблицей.

### Когда использовать

- Таблица содержит **миллионы/миллиарды строк**.
- Запросы часто фильтруют по определённому столбцу (дата, регион, статус).
- Нужно эффективно удалять старые данные (`DROP` партиции вместо `DELETE`).
- Необходимо распределить I/O по разным табличным пространствам.

### Декларативное партиционирование (PostgreSQL 10+)

#### PARTITION BY RANGE

Наиболее распространённый тип -- разбиение по диапазону значений (обычно по дате).

```sql
-- Создание партиционированной таблицы
CREATE TABLE logs (
    id          BIGSERIAL,
    created_at  TIMESTAMP NOT NULL,
    level       VARCHAR(10) NOT NULL,
    message     TEXT,
    PRIMARY KEY (id, created_at)  -- ключ партиционирования должен быть в PK
) PARTITION BY RANGE (created_at);

-- Создание партиций
CREATE TABLE logs_2025_q1 PARTITION OF logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-04-01');

CREATE TABLE logs_2025_q2 PARTITION OF logs
    FOR VALUES FROM ('2025-04-01') TO ('2025-07-01');

CREATE TABLE logs_2025_q3 PARTITION OF logs
    FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');

CREATE TABLE logs_2025_q4 PARTITION OF logs
    FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');

CREATE TABLE logs_2026_q1 PARTITION OF logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');

-- Партиция по умолчанию (для данных, не попадающих ни в одну партицию)
CREATE TABLE logs_default PARTITION OF logs DEFAULT;

-- Вставка данных -- PostgreSQL автоматически направляет в нужную партицию
INSERT INTO logs (created_at, level, message)
VALUES ('2025-03-15', 'ERROR', 'Connection failed');
-- Попадёт в logs_2025_q1

-- Запрос с фильтром -- PostgreSQL сканирует только нужные партиции (partition pruning)
EXPLAIN ANALYZE
SELECT * FROM logs WHERE created_at >= '2025-04-01' AND created_at < '2025-07-01';
-- Scan only on logs_2025_q2

-- Удаление старых данных -- мгновенно, без DELETE
DROP TABLE logs_2025_q1;
-- Или отсоединение:
ALTER TABLE logs DETACH PARTITION logs_2025_q1;
```

#### PARTITION BY LIST

Разбиение по конкретным значениям.

```sql
CREATE TABLE orders (
    id         SERIAL,
    region     VARCHAR(20) NOT NULL,
    amount     NUMERIC(12, 2),
    order_date DATE,
    PRIMARY KEY (id, region)
) PARTITION BY LIST (region);

CREATE TABLE orders_moscow PARTITION OF orders
    FOR VALUES IN ('moscow');

CREATE TABLE orders_spb PARTITION OF orders
    FOR VALUES IN ('spb');

CREATE TABLE orders_other PARTITION OF orders
    FOR VALUES IN ('novosibirsk', 'kazan', 'ekaterinburg');

CREATE TABLE orders_default PARTITION OF orders DEFAULT;
```

#### PARTITION BY HASH

Равномерное распределение данных по заданному количеству партиций.

```sql
CREATE TABLE sessions (
    id          UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id     INT NOT NULL,
    data        JSONB,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) PARTITION BY HASH (id);

-- Создание 4 партиций
CREATE TABLE sessions_p0 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE sessions_p1 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE sessions_p2 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE sessions_p3 PARTITION OF sessions FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

### Многоуровневое партиционирование

```sql
-- Партиционирование по году, затем по региону
CREATE TABLE sales (
    id          BIGSERIAL,
    sale_date   DATE NOT NULL,
    region      VARCHAR(20) NOT NULL,
    amount      NUMERIC(12, 2),
    PRIMARY KEY (id, sale_date, region)
) PARTITION BY RANGE (sale_date);

-- Партиция на 2025 год, далее по региону
CREATE TABLE sales_2025 PARTITION OF sales
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01')
    PARTITION BY LIST (region);

CREATE TABLE sales_2025_moscow PARTITION OF sales_2025
    FOR VALUES IN ('moscow');

CREATE TABLE sales_2025_spb PARTITION OF sales_2025
    FOR VALUES IN ('spb');

CREATE TABLE sales_2025_other PARTITION OF sales_2025 DEFAULT;
```

### Индексы на партиционированных таблицах

```sql
-- Индекс на родительской таблице автоматически создаётся на всех партициях
CREATE INDEX idx_logs_created_at ON logs (created_at);
CREATE INDEX idx_logs_level ON logs (level);

-- Проверка partition pruning
SET enable_partition_pruning = on;  -- включено по умолчанию

EXPLAIN (COSTS OFF)
SELECT * FROM logs
WHERE created_at >= '2025-07-01' AND created_at < '2025-10-01'
AND level = 'ERROR';
-- Показывает сканирование только logs_2025_q3
```

### Управление партициями

```sql
-- Присоединение существующей таблицы как партиции
CREATE TABLE logs_2026_q2 (LIKE logs INCLUDING ALL);
ALTER TABLE logs ATTACH PARTITION logs_2026_q2
    FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');

-- Отсоединение партиции (таблица остаётся, но больше не часть партиционированной)
ALTER TABLE logs DETACH PARTITION logs_2025_q1;

-- Отсоединение конкурентно (PostgreSQL 14+, без блокировки)
ALTER TABLE logs DETACH PARTITION logs_2025_q2 CONCURRENTLY;

-- Просмотр партиций
SELECT
    parent.relname AS parent,
    child.relname AS partition,
    pg_get_expr(child.relpartbound, child.oid) AS bounds
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'logs'
ORDER BY child.relname;
```
