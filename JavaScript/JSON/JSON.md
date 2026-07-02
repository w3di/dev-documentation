# JSON в JavaScript

## Оглавление

- [JSON.stringify()](#jsonstringify)
- [JSON.parse()](#jsonparse)
- [Ограничения JSON](#ограничения-json)
- [structuredClone() vs JSON](#structuredclone-vs-json)
- [Performance](#performance)

---

## `JSON.stringify()`

### Базовое использование

`JSON.stringify()` сериализует значение JavaScript в JSON-строку. Сигнатура:

```js
JSON.stringify(value, replacer?, space?)
```

```js
const user = { name: "Alice", age: 30, active: true };
JSON.stringify(user);
// '{"name":"Alice","age":30,"active":true}'
```

### Replacer — function

Функция-replacer вызывается для **каждого** свойства (включая корневой объект). Позволяет трансформировать или фильтровать значения:

```js
const data = {
  name: "Alice",
  password: "secret123",
  age: 30,
  role: "admin",
};

const result = JSON.stringify(data, (key, value) => {
  // key === "" для корневого объекта
  if (key === "") return value;

  // Фильтрация — возврат undefined удаляет свойство
  if (key === "password") return undefined;

  // Трансформация
  if (typeof value === "string") return value.toUpperCase();

  return value;
});

console.log(result);
// '{"name":"ALICE","age":30,"role":"ADMIN"}'
```

Важно: replacer вызывается **рекурсивно** для вложенных объектов. Параметр `key` — это ключ в **родительском** объекте:

```js
const nested = {
  user: {
    name: "Alice",
    address: {
      city: "Moscow",
    },
  },
};

JSON.stringify(nested, (key, value) => {
  console.log(`key: "${key}", value:`, value);
  return value;
});
// key: "", value: { user: { name: "Alice", address: { city: "Moscow" } } }
// key: "user", value: { name: "Alice", address: { city: "Moscow" } }
// key: "name", value: "Alice"
// key: "address", value: { city: "Moscow" }
// key: "city", value: "Moscow"
```

### Replacer — array

Массив строк указывает, какие свойства **включить** (whitelist):

```js
const user = { name: "Alice", age: 30, password: "secret", role: "admin" };

JSON.stringify(user, ["name", "role"]);
// '{"name":"Alice","role":"admin"}'
```

Массив-replacer работает **только для объектов**, не для массивов. Вложенные объекты фильтруются по тому же списку ключей:

```js
const data = { user: { name: "Alice", password: "secret" }, id: 1 };
JSON.stringify(data, ["user", "name", "id"]);
// '{"user":{"name":"Alice"},"id":1}'
// password отфильтрован, хотя он во вложенном объекте
```

### Space — форматирование

Третий аргумент управляет отступами для читаемого вывода:

```js
const obj = { a: 1, b: { c: 2 } };

// Число — количество пробелов (макс. 10)
JSON.stringify(obj, null, 2);
// {
//   "a": 1,
//   "b": {
//     "c": 2
//   }
// }

// Строка — кастомный отступ
JSON.stringify(obj, null, "\t");
// {
// 	"a": 1,
// 	"b": {
// 		"c": 2
// 	}
// }
```

### Метод `toJSON()`

Если объект имеет метод `toJSON()`, `JSON.stringify` вызывает его и сериализует **возвращённое** значение вместо самого объекта:

```js
class User {
  constructor(name, password) {
    this.name = name;
    this.password = password;
  }

  toJSON() {
    // Исключаем пароль из сериализации
    return { name: this.name };
  }
}

const user = new User("Alice", "secret");
JSON.stringify(user);
// '{"name":"Alice"}'
```

Встроенный пример — `Date`:

```js
const date = new Date("2025-01-15T10:30:00Z");
JSON.stringify(date);
// '"2025-01-15T10:30:00.000Z"' — Date.prototype.toJSON() возвращает ISO string
```

`toJSON()` вызывается **до** replacer:

```js
const obj = {
  data: {
    toJSON() { return 42; }
  }
};

JSON.stringify(obj, (key, value) => {
  if (key === "data") console.log(value); // 42, не оригинальный объект
  return value;
});
```

### Обработка специальных значений

```js
// undefined, functions, symbols — УДАЛЯЮТСЯ из объектов
JSON.stringify({ a: undefined, b: function() {}, c: Symbol("s"), d: 1 });
// '{"d":1}'

// В массивах — заменяются на null
JSON.stringify([undefined, function() {}, Symbol("s"), 1]);
// '[null,null,null,1]'

// Как самостоятельные значения — возвращают undefined
JSON.stringify(undefined);      // undefined (не строка!)
JSON.stringify(function() {}); // undefined
JSON.stringify(Symbol("s"));  // undefined

// NaN и Infinity → null
JSON.stringify({ a: NaN, b: Infinity, c: -Infinity });
// '{"a":null,"b":null,"c":null}'
```

### Circular Reference — TypeError

```js
const obj = { name: "Alice" };
obj.self = obj; // циклическая ссылка

JSON.stringify(obj);
// TypeError: Converting circular structure to JSON
```

Решение — кастомный replacer с отслеживанием посещённых объектов:

```js
function safeStringify(obj, space) {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  }, space);
}

const circular = { a: 1 };
circular.self = circular;
console.log(safeStringify(circular, 2));
// {
//   "a": 1,
//   "self": "[Circular]"
// }
```

### BigInt — TypeError

```js
JSON.stringify({ value: 42n });
// TypeError: Do not know how to serialize a BigInt

// Решение через toJSON
BigInt.prototype.toJSON = function () {
  return this.toString();
};

JSON.stringify({ value: 42n });
// '{"value":"42"}'
```

Или через replacer:

```js
JSON.stringify({ value: 42n }, (key, value) =>
  typeof value === "bigint" ? value.toString() : value
);
// '{"value":"42"}'
```

---

## `JSON.parse()`

### Базовое использование

```js
const json = '{"name":"Alice","age":30}';
const obj = JSON.parse(json);
console.log(obj.name); // "Alice"
```

### Reviver Function

Функция-reviver вызывается для каждого свойства (снизу вверх — сначала вложенные, потом родительские). Позволяет трансформировать значения при десериализации:

```js
const json = '{"name":"Alice","createdAt":"2025-01-15T10:30:00.000Z"}';

const obj = JSON.parse(json, (key, value) => {
  // Восстановление Date из ISO-строки
  if (key === "createdAt") return new Date(value);
  return value;
});

console.log(obj.createdAt instanceof Date); // true
console.log(obj.createdAt.getFullYear());   // 2025
```

Автоматическое восстановление всех Date-строк по паттерну:

```js
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

function dateReviver(key, value) {
  if (typeof value === "string" && ISO_DATE_REGEX.test(value)) {
    return new Date(value);
  }
  return value;
}

const data = JSON.parse(
  '{"event":"meeting","start":"2025-06-15T09:00:00Z","end":"2025-06-15T10:00:00Z"}',
  dateReviver
);
// data.start и data.end — объекты Date
```

### Десериализация BigInt

```js
const json = '{"id":"9007199254740993","name":"Large ID"}';

const obj = JSON.parse(json, (key, value) => {
  // Восстановление BigInt для числовых строк, превышающих Number.MAX_SAFE_INTEGER
  if (key === "id" && typeof value === "string" && /^\d+$/.test(value)) {
    const num = Number(value);
    if (num > Number.MAX_SAFE_INTEGER) return BigInt(value);
  }
  return value;
});

console.log(obj.id);         // 9007199254740993n
console.log(typeof obj.id);  // "bigint"
```

### Удаление свойств через reviver

Возврат `undefined` из reviver удаляет свойство:

```js
const json = '{"name":"Alice","__internal":true,"meta":{"debug":true,"version":1}}';

const clean = JSON.parse(json, (key, value) => {
  if (key.startsWith("__") || key === "debug") return undefined;
  return value;
});

console.log(clean); // { name: "Alice", meta: { version: 1 } }
```

---

## Ограничения JSON

### Типы, не поддерживаемые JSON

| Тип / значение | Поведение `JSON.stringify()` |
|----------------|------------------------------|
| `undefined` | Удаляется из объектов, `null` в массивах |
| `function` | Удаляется из объектов, `null` в массивах |
| `Symbol` | Удаляется из объектов, `null` в массивах |
| `NaN` | `null` |
| `Infinity` / `-Infinity` | `null` |
| `BigInt` | `TypeError` |
| `Date` | ISO string (через `toJSON`) |
| `RegExp` | `{}` (пустой объект!) |
| `Map` / `Set` | `{}` (пустой объект!) |
| `Error` | `{}` (только `message` если enumerable) |
| `Circular ref` | `TypeError` |

```js
// RegExp теряет паттерн и флаги
JSON.stringify({ re: /abc/gi });
// '{"re":{}}'

// Map и Set полностью теряются
JSON.stringify({ map: new Map([["a", 1]]), set: new Set([1, 2]) });
// '{"map":{},"set":{}}'

// Кастомная сериализация Map/Set
function mapReplacer(key, value) {
  if (value instanceof Map) {
    return { __type: "Map", entries: [...value] };
  }
  if (value instanceof Set) {
    return { __type: "Set", values: [...value] };
  }
  return value;
}

function mapReviver(key, value) {
  if (value?.__type === "Map") return new Map(value.entries);
  if (value?.__type === "Set") return new Set(value.values);
  return value;
}

const data = { users: new Map([["alice", 1], ["bob", 2]]) };
const json = JSON.stringify(data, mapReplacer);
const restored = JSON.parse(json, mapReviver);
console.log(restored.users instanceof Map); // true
console.log(restored.users.get("alice"));   // 1
```

### Потеря прототипов

`JSON.parse` всегда создаёт plain objects — прототипная цепочка теряется:

```js
class User {
  constructor(name) { this.name = name; }
  greet() { return `Hi, ${this.name}`; }
}

const user = new User("Alice");
const clone = JSON.parse(JSON.stringify(user));

console.log(clone.name);     // "Alice"
console.log(clone.greet);    // undefined — метод потерян
console.log(clone instanceof User); // false
```

### Symbol-keyed свойства игнорируются

```js
const sym = Symbol("id");
const obj = { [sym]: 42, name: "Alice" };
JSON.stringify(obj);
// '{"name":"Alice"}' — Symbol-ключ полностью проигнорирован
```

---

## `structuredClone()` vs JSON

`structuredClone()` (доступен с 2022 во всех основных средах) использует **Structured Clone Algorithm** — тот же алгоритм, что применяется при передаче данных в `postMessage`, `IndexedDB` и `Cache API`.

### Сравнительная таблица

| Возможность | `JSON.parse(JSON.stringify())` | `structuredClone()` |
|-------------|-------------------------------|---------------------|
| Plain objects / arrays | Да | Да |
| `Date` | Строка (теряется) | Да (сохраняется) |
| `RegExp` | `{}` (теряется) | Да |
| `Map` / `Set` | `{}` (теряется) | Да |
| `ArrayBuffer` / `TypedArray` | Нет | Да |
| `Blob` / `File` | Нет | Да |
| `ImageData` | Нет | Да |
| Circular references | TypeError | Да (обрабатываются) |
| `undefined` | Удаляется | Сохраняется |
| `NaN` / `Infinity` | `null` | Сохраняется |
| Functions | Удаляются | **DataCloneError** |
| DOM nodes | Нет | **DataCloneError** |
| Prototype chain | Теряется | Теряется |
| Symbol properties | Игнорируются | Игнорируются |
| `Error` objects | `{}` | Да (message, name, cause) |

### Примеры

```js
// Date — сохраняется
const original = { date: new Date("2025-01-15"), regex: /abc/gi };

const jsonClone = JSON.parse(JSON.stringify(original));
console.log(jsonClone.date instanceof Date);   // false — это строка
console.log(jsonClone.regex instanceof RegExp); // false — это {}

const structClone = structuredClone(original);
console.log(structClone.date instanceof Date);   // true
console.log(structClone.regex instanceof RegExp); // true
console.log(structClone.regex.flags);             // "gi"
```

```js
// Circular references — обрабатываются
const obj = { name: "Alice" };
obj.self = obj;

// JSON.parse(JSON.stringify(obj)); // TypeError
const clone = structuredClone(obj); // OK
console.log(clone.self === clone);  // true — циклическая ссылка восстановлена
```

```js
// Map и Set
const data = {
  users: new Map([["alice", { role: "admin" }]]),
  tags: new Set(["js", "ts"]),
};

const clone = structuredClone(data);
console.log(clone.users instanceof Map);       // true
console.log(clone.users.get("alice").role);    // "admin"
console.log(clone.tags instanceof Set);         // true
console.log(clone.tags.has("js"));              // true
```

```js
// Transferable objects — перемещение без копирования
const buffer = new ArrayBuffer(1024 * 1024); // 1MB

const clone = structuredClone(buffer, { transfer: [buffer] });
console.log(buffer.byteLength);       // 0 — оригинал «опустошён»
console.log(clone.byteLength);        // 1048576 — данные перемещены
```

### Когда что использовать

- **`JSON.stringify`/`parse`** — когда нужна **строковая сериализация** (сохранение в `localStorage`, передача через HTTP, логирование).
- **`structuredClone`** — когда нужно **глубокое клонирование** объекта в памяти с сохранением типов.

```js
// Типичный паттерн — клонирование state в Redux/Zustand
const newState = structuredClone(oldState); // Безопаснее, чем JSON round-trip

// Сериализация для API
const payload = JSON.stringify(data, replacer);
```

---

## Performance

### `JSON.parse()` быстрее object literal для больших объектов

V8 имеет оптимизацию: парсинг JSON-строки может быть **быстрее**, чем парсинг эквивалентного JavaScript object literal. Причина — JSON грамматика значительно проще, чем грамматика JS, и V8 использует специализированный быстрый парсер:

```js
// Медленнее — V8 должен парсить как JavaScript (сложная грамматика)
const data = { name: "Alice", age: 30, items: [1, 2, 3, 4, 5] };

// Быстрее для БОЛЬШИХ объектов — V8 использует быстрый JSON-парсер
const data = JSON.parse('{"name":"Alice","age":30,"items":[1,2,3,4,5]}');
```

Это известная оптимизация, описанная в V8 blog. Webpack и другие бандлеры могут трансформировать большие object literals в `JSON.parse()` вызовы (`json-parse-webpack-plugin`).

Порог, при котором `JSON.parse` становится быстрее — примерно **10 KB** и более. Для маленьких объектов разница незначительна или может быть в пользу литерала.

### Стоимость `JSON.stringify()`

```js
// Бенчмарк: stringify масштабируется линейно с размером объекта
const small = { a: 1 };
const medium = Object.fromEntries(
  Array.from({ length: 100 }, (_, i) => [`key${i}`, `value${i}`])
);
const large = Object.fromEntries(
  Array.from({ length: 10000 }, (_, i) => [`key${i}`, `value${i}`])
);

// small:  ~0.001ms
// medium: ~0.05ms
// large:  ~5ms
// Replacer function добавляет ~20-30% overhead
```

### Streaming JSON Parsing

Стандартный `JSON.parse()` требует **всю строку** целиком в памяти. Для обработки гигабайтных JSON-файлов используют streaming-парсеры:

```js
// Node.js — streaming через JSONStream или stream-json
import { parser } from "stream-json";
import { streamArray } from "stream-json/streamers/StreamArray";
import { createReadStream } from "fs";
import { pipeline } from "stream/promises";

// Обработка 10GB JSON файла без загрузки в память
await pipeline(
  createReadStream("huge-array.json"),
  parser(),
  streamArray(),
  async function* (source) {
    for await (const { value } of source) {
      // Обработка каждого элемента массива по одному
      yield processItem(value);
    }
  }
);
```

```js
// Fetch API + NDJSON (Newline-Delimited JSON) — streaming из сети
async function streamNDJSON(url) {
  const response = await fetch(url);
  const reader = response.body
    .pipeThrough(new TextDecoderStream())
    .getReader();

  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop(); // неполная строка остаётся в буфере

    for (const line of lines) {
      if (line.trim()) {
        const obj = JSON.parse(line);
        processItem(obj);
      }
    }
  }
}
```

### `JSON.stringify` vs `structuredClone` — производительность

```js
// Для простых объектов JSON round-trip часто БЫСТРЕЕ structuredClone
// (structuredClone имеет overhead на обработку специальных типов)

const simple = { a: 1, b: "hello", c: [1, 2, 3] };

// ~0.002ms — JSON.parse(JSON.stringify(simple))
// ~0.005ms — structuredClone(simple)

// Для объектов со специальными типами structuredClone значительно быстрее,
// так как не нужна сериализация в строку
const complex = { date: new Date(), map: new Map([[1, 2]]), set: new Set([1]) };

// JSON вообще не справится корректно
// structuredClone: ~0.01ms
```

### Оптимизация: кэширование сериализованных значений

```js
// Для hot paths — кэшируйте JSON-строку, если объект не меняется
class ConfigCache {
  #config;
  #serialized = null;

  set(config) {
    this.#config = config;
    this.#serialized = null; // Инвалидация
  }

  toJSON() {
    if (this.#serialized === null) {
      this.#serialized = JSON.stringify(this.#config);
    }
    return this.#serialized;
  }
}
```

### JSON5 и другие альтернативы

Стандартный JSON строг в синтаксисе. Альтернативы, снимающие ограничения:

```js
// JSON5 — расширение JSON (trailing commas, comments, unquoted keys)
// Не встроен в язык — нужна библиотека
import JSON5 from "json5";

const config = JSON5.parse(`{
  // Комментарий!
  name: 'Alice',       // Ключ без кавычек, одинарные кавычки
  age: 30,             // Trailing comma
  hex: 0xFF,           // Hex-числа
  infinity: Infinity,  // Infinity поддерживается
}`);
```
