# Map, Set, WeakMap, WeakSet

## Оглавление

- [Map](#map)
- [Set](#set)
- [WeakMap](#weakmap)
- [WeakSet](#weakset)
- [WeakRef и FinalizationRegistry](#weakref-и-finalizationregistry)
- [Performance](#performance)

---

## Map

### Основы

`Map` --- коллекция пар ключ-значение с **O(1)** средней сложностью для `get`, `set`, `has`, `delete`. Главное отличие от `Object` --- **любой тип может быть ключом**: объекты, функции, `NaN`, `Symbol`, примитивы.

```js
const map = new Map();

// Объект как ключ --- невозможно в обычном Object
const userA = { id: 1 };
const userB = { id: 2 };
map.set(userA, 'admin');
map.set(userB, 'viewer');
map.get(userA); // 'admin'

// NaN как ключ --- корректно работает (NaN === NaN в Map)
map.set(NaN, 'not a number');
map.get(NaN); // 'not a number'
```

### SameValueZero для сравнения ключей

`Map` использует алгоритм **SameValueZero** для определения равенства ключей. Он идентичен `===` с двумя исключениями:

- `NaN` считается равным `NaN` (в отличие от `===`)
- `-0` считается равным `+0`

```js
const map = new Map();

map.set(NaN, 1);
map.get(NaN);     // 1 --- работает! (NaN === NaN в === даёт false)

map.set(-0, 'neg');
map.get(+0);      // 'neg' --- -0 и +0 считаются одним ключом
```

### Ordered iteration

`Map` гарантирует порядок итерации --- **порядок вставки**. Это прописано в спецификации, в отличие от объектов (где порядок зависит от типа ключей):

```js
const map = new Map([
  ['c', 3],
  ['a', 1],
  ['b', 2],
]);

for (const [key, value] of map) {
  console.log(key); // 'c', 'a', 'b' --- строго порядок вставки
}

// Полезные методы итерации
map.keys();    // MapIterator { 'c', 'a', 'b' }
map.values();  // MapIterator { 3, 1, 2 }
map.entries(); // MapIterator { ['c', 3], ['a', 1], ['b', 2] }
map.forEach((value, key) => { /* ... */ });
```

### `.size`

В отличие от `Object`, где для подсчёта ключей нужен `Object.keys(obj).length` (O(n)), `Map.size` --- **свойство**, доступное за O(1):

```js
const map = new Map([['a', 1], ['b', 2]]);
map.size; // 2 --- O(1), не метод!
```

### Map vs Object --- когда что

| Критерий | `Map` | `Object` |
|---|---|---|
| Типы ключей | Любые | Только `string` / `Symbol` |
| Порядок | Гарантирован (insertion order) | Частично (integer-like -> string -> symbol) |
| Размер | `map.size` (O(1)) | `Object.keys(o).length` (O(n)) |
| Итерация | Встроенный iterable | Через `Object.keys/values/entries` |
| Прототип | Чистая коллекция | Есть прототипные свойства |
| Serialization | Нет нативного JSON | Нативная JSON поддержка |
| Частые add/delete | Оптимизирован | Медленнее (hidden class invalidation) |
| Деструктуризация | Нет нативной | Встроенная |

**Используйте `Map`**, когда: ключи не строки, коллекция часто меняется, важен размер, ключи определяются в runtime.

**Используйте `Object`**, когда: структура фиксирована (record/struct), нужна JSON-сериализация, работаете с `...spread`/деструктуризацией.

### `Map.groupBy()` (ES2024)

Статический метод для группировки элементов iterable в `Map` по результату callback:

```js
const people = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 25 },
];

const byAge = Map.groupBy(people, person => person.age);
// Map { 25 => [{name: 'Alice', ...}, {name: 'Charlie', ...}], 30 => [{name: 'Bob', ...}] }

byAge.get(25); // [{name: 'Alice', age: 25}, {name: 'Charlie', age: 25}]
```

Преимущество перед `Object.groupBy()` --- ключами группировки могут быть объекты:

```js
const items = [
  { category: { id: 1, name: 'food' }, item: 'apple' },
  { category: { id: 1, name: 'food' }, item: 'banana' },
];

// С Map.groupBy можно группировать по объекту-ключу
const categories = new Map();
// ... или использовать общие ссылки на категории
```

---

## Set

### Основы

`Set` --- коллекция **уникальных** значений. Дубликаты автоматически отбрасываются. Использует **SameValueZero** для проверки уникальности:

```js
const set = new Set([1, 2, 2, 3, 3, 3]);
console.log(set.size); // 3
console.log([...set]); // [1, 2, 3]

// NaN --- уникален (один экземпляр)
const s = new Set([NaN, NaN]);
s.size; // 1

// Объекты --- по ссылке
const obj = {};
const s2 = new Set([obj, obj, {}]);
s2.size; // 2 --- один и тот же obj + другой {} (разные ссылки)
```

### Основные операции

```js
const set = new Set();

set.add(1).add(2).add(3); // Chainable
set.has(2);    // true --- O(1)
set.delete(2); // true
set.size;      // 2
set.clear();   // Очистка
```

### Set operations (ES2025)

Новые методы для теоретико-множественных операций, возвращающие новый `Set`:

```js
const a = new Set([1, 2, 3, 4]);
const b = new Set([3, 4, 5, 6]);

// Объединение
a.union(b);               // Set {1, 2, 3, 4, 5, 6}

// Пересечение
a.intersection(b);        // Set {3, 4}

// Разность (в a, но не в b)
a.difference(b);          // Set {1, 2}

// Симметрическая разность (в a или b, но не в обоих)
a.symmetricDifference(b); // Set {1, 2, 5, 6}

// Проверки подмножеств
const c = new Set([1, 2]);
c.isSubsetOf(a);          // true
a.isSupersetOf(c);        // true

// Проверка непересекаемости
const d = new Set([7, 8]);
a.isDisjointFrom(d);     // true --- нет общих элементов
a.isDisjointFrom(b);     // false --- есть общие {3, 4}
```

**Важно:** эти методы принимают любой iterable, не только `Set`:

```js
const set = new Set([1, 2, 3]);
set.union([3, 4, 5]); // Set {1, 2, 3, 4, 5} --- массив тоже работает
```

### Set vs Array для уникальности

```js
// Классический паттерн дедупликации
const unique = [...new Set(array)];

// Но для сложных объектов Set не поможет (сравнение по ссылке)
const users = [{ id: 1 }, { id: 1 }];
new Set(users).size; // 2 --- не дедуплицирует!

// Для объектов нужен Map
const uniqueUsers = [...new Map(users.map(u => [u.id, u])).values()];
```

| Операция | `Set` | `Array` |
|---|---|---|
| Проверка наличия | O(1) `.has()` | O(n) `.includes()` |
| Добавление уникального | O(1) `.add()` | O(n) (проверка + push) |
| Удаление | O(1) `.delete()` | O(n) `.splice()` |
| Порядок | Insertion order | Index order |
| Индексный доступ | Нет | O(1) `arr[i]` |

---

## WeakMap

### Характеристики

`WeakMap` --- коллекция пар ключ-значение, где **ключи --- только объекты или незарегистрированные символы**. Ключи удерживаются **слабо** (weak reference): если на объект-ключ нет других ссылок, GC может его удалить вместе с записью в `WeakMap`.

```js
const wm = new WeakMap();

let obj = { data: 'important' };
wm.set(obj, 'metadata');
wm.get(obj); // 'metadata'

obj = null; // Единственная ссылка удалена --- GC удалит запись из WeakMap
```

### Ограничения (и почему они существуют)

- **Не итерируем** --- нет `[Symbol.iterator]`, `forEach`, `keys()`, `values()`, `entries()`
- **Нет `.size`**
- **Нет `.clear()`** (удалён из спецификации)

Причина: GC недетерминистичен. Если бы `WeakMap` был итерируемым, результат зависел бы от момента последней сборки мусора --- это нарушило бы детерминизм программы.

### Практика: приватные данные

```js
const _private = new WeakMap();

class Person {
  constructor(name, ssn) {
    this.name = name;
    _private.set(this, { ssn }); // Приватные данные привязаны к экземпляру
  }

  getSSN(authToken) {
    if (!verify(authToken)) throw new Error('Unauthorized');
    return _private.get(this).ssn;
  }
}

const p = new Person('Alice', '123-45-6789');
// _private недоступен извне модуля
// Когда p будет GC'd, приватные данные автоматически удалятся
```

### Практика: кэширование

```js
const cache = new WeakMap();

function computeExpensive(obj) {
  if (cache.has(obj)) return cache.get(obj);

  const result = heavyComputation(obj);
  cache.set(obj, result);
  return result;
}

// Кэш автоматически очищается когда объект больше не используется
// Нет memory leak --- в отличие от Map, где объекты-ключи никогда не будут GC'd
```

### Практика: metadata для DOM-элементов

```js
const elementData = new WeakMap();

function attachData(element, data) {
  elementData.set(element, data);
}

function getData(element) {
  return elementData.get(element);
}

// Когда DOM-элемент удалён из документа и нет других ссылок,
// GC удалит и элемент, и связанные данные из WeakMap.
// jQuery.data() работал по схожему принципу, но без WeakMap вручную.
```

---

## WeakSet

### Характеристики

`WeakSet` --- коллекция объектов (или незарегистрированных символов), удерживаемых слабо. Аналог `WeakMap`, но хранит только значения (без ключей). Те же ограничения: не итерируем, нет `.size`.

### Branding / tagging объектов

Основной use case --- **пометка объектов** без предотвращения их сборки мусором:

```js
const verified = new WeakSet();

class User {
  constructor(name) {
    this.name = name;
  }
}

function verifyUser(user) {
  // Проверка...
  verified.add(user);
}

function performSecureAction(user) {
  if (!verified.has(user)) {
    throw new Error('User not verified');
  }
  // Выполнение
}
```

### Защита от повторной обработки

```js
const processed = new WeakSet();

function processNode(node) {
  if (processed.has(node)) return; // Уже обработан
  processed.add(node);

  // Обработка DOM-узла...
  for (const child of node.children) {
    processNode(child);
  }
}
// Когда узлы удалены из DOM --- записи автоматически освобождаются
```

### Защита от циклических ссылок

```js
function deepClone(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== 'object') return obj;

  if (seen.has(obj)) {
    throw new Error('Circular reference detected');
    // Или: return obj; --- для shallow-копии циклических ссылок
  }

  seen.add(obj);

  const clone = Array.isArray(obj) ? [] : {};
  for (const key of Reflect.ownKeys(obj)) {
    clone[key] = deepClone(obj[key], seen);
  }

  return clone;
}
```

---

## WeakRef и FinalizationRegistry

### WeakRef

`WeakRef` создаёт слабую ссылку на объект. Объект может быть собран GC, даже если на него есть `WeakRef`. Получить объект можно через `.deref()`:

```js
let target = { data: 'heavy payload' };
const ref = new WeakRef(target);

ref.deref(); // { data: 'heavy payload' }

target = null; // Убираем сильную ссылку

// Позже, после GC:
ref.deref(); // undefined --- объект собран
```

### Практика: кэш с WeakRef

```js
class WeakCache {
  #cache = new Map();

  get(key) {
    const ref = this.#cache.get(key);
    if (!ref) return undefined;

    const value = ref.deref();
    if (value === undefined) {
      this.#cache.delete(key); // Cleanup мёртвой ссылки
      return undefined;
    }

    return value;
  }

  set(key, value) {
    this.#cache.set(key, new WeakRef(value));
  }
}

// Ключи --- строки (сильные), значения --- слабые ссылки на объекты.
// Объекты-значения могут быть GC'd, ключи останутся (нужен cleanup).
```

### FinalizationRegistry

`FinalizationRegistry` позволяет зарегистрировать callback, который будет вызван **после** сборки мусором целевого объекта:

```js
const registry = new FinalizationRegistry((heldValue) => {
  console.log(`Объект с id ${heldValue} был собран GC`);
  // Cleanup: закрыть файл, сокет, удалить из кэша и т.д.
});

function createResource(id) {
  const resource = { id, handle: openNativeResource() };
  registry.register(resource, id); // heldValue = id (не resource!)
  return resource;
}
```

### Кэш с автоматическим cleanup

```js
class AutoCleaningCache {
  #cache = new Map();
  #registry = new FinalizationRegistry((key) => {
    // Удаляем запись, только если WeakRef всё ещё мёртв
    const ref = this.#cache.get(key);
    if (ref && ref.deref() === undefined) {
      this.#cache.delete(key);
    }
  });

  get(key) {
    const ref = this.#cache.get(key);
    return ref?.deref();
  }

  set(key, value) {
    const prev = this.#cache.get(key)?.deref();
    if (prev) this.#registry.unregister(prev);

    this.#cache.set(key, new WeakRef(value));
    this.#registry.register(value, key, value); // unregisterToken = value
  }
}
```

### Критические нюансы

1. **Нет гарантий timing** --- callback может быть вызван через секунду или никогда. GC --- implementation detail движка.
2. **Нельзя полагаться на `FinalizationRegistry` для корректности программы** --- только для оптимизации (cleanup кэшей, метрики).
3. **Не используйте `WeakRef.deref()` для принятия решений**, влияющих на observable behavior:

```js
// ANTI-PATTERN: поведение программы зависит от GC
function badExample(ref) {
  const obj = ref.deref();
  if (obj) {
    return obj.value; // Может вернуть значение или undefined в зависимости от GC
  }
  return 'default';
}
```

4. **В пределах одного микротаска** `deref()` стабилен --- объект не будет собран в середине синхронного кода:

```js
const obj = ref.deref();
if (obj) {
  // obj гарантированно жив до конца текущего synchronous execution
  doSomething(obj);
  doMore(obj); // Безопасно --- объект не будет GC'd здесь
}
```

---

## Performance

### Map vs Object --- бенчмарки

**Частые вставки/удаления** --- `Map` значительно быстрее. `Object` при частых добавлениях/удалениях свойств инвалидирует hidden classes (V8 inline caches), что деградирует производительность:

```js
// Map --- стабильная производительность
const map = new Map();
for (let i = 0; i < 1_000_000; i++) {
  map.set(`key${i}`, i);
}
for (let i = 0; i < 1_000_000; i++) {
  map.delete(`key${i}`);
}

// Object --- деградация из-за hidden class transitions
const obj = {};
for (let i = 0; i < 1_000_000; i++) {
  obj[`key${i}`] = i;
}
for (let i = 0; i < 1_000_000; i++) {
  delete obj[`key${i}`]; // delete ещё и деоптимизирует V8
}
```

### Когда Map значительно лучше

1. **Non-string ключи** --- `Object` приводит ключи к строкам, что может вызвать коллизии:

```js
const obj = {};
obj[1] = 'one';
obj['1'] = 'string one';
// obj[1] === 'string one' --- коллизия!

const map = new Map();
map.set(1, 'one');
map.set('1', 'string one');
map.get(1);   // 'one' --- нет коллизии
map.get('1'); // 'string one'
```

2. **Частые add/delete** --- как показано выше
3. **Большое количество записей** --- `Map` оптимизирован для коллекций, `Object` --- для фиксированных структур
4. **Неизвестные ключи в runtime** --- `Object` может конфликтовать с прототипными свойствами:

```js
const obj = {};
obj['toString'] = 'whoops'; // Перезаписали Object.prototype.toString
obj['__proto__'] = 'bad';   // Потенциальная проблема безопасности

const map = new Map();
map.set('toString', 'safe'); // Никаких конфликтов
map.set('__proto__', 'safe');
```

### Memory overhead

`Map` и `Set` имеют больший overhead на запись по сравнению с `Object`/`Array` для малых коллекций. Для коллекций < 100 элементов разница обычно незначима. Для больших коллекций `Map` может быть эффективнее из-за отсутствия hidden class overhead.

| Коллекция | Memory per entry (приблизительно, V8) |
|---|---|
| `Object` property | ~60-80 bytes |
| `Map` entry | ~80-120 bytes |
| `Array` element | ~8-16 bytes (packed) |
| `Set` entry | ~40-60 bytes |

### Рекомендации

- Для **lookup tables** с string-ключами и фиксированной структурой --- `Object` (или `Object.create(null)`)
- Для **динамических коллекций** с частыми мутациями --- `Map`
- Для **дедупликации** --- `Set`
- Для **metadata без memory leaks** --- `WeakMap`
- Для **кэшей, чувствительных к памяти** --- `WeakRef` + `FinalizationRegistry`
