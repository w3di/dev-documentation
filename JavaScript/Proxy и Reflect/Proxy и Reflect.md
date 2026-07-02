# Proxy и Reflect

## Оглавление

- [Proxy](#proxy)
- [Revocable Proxy](#revocable-proxy)
- [Reflect API](#reflect-api)
- [Практические паттерны](#практические-паттерны)
- [Proxy и производительность](#proxy-и-производительность)
- [Meta-programming с Symbol](#meta-programming-с-symbol)

---

## Proxy

`Proxy` --- объект-обёртка, перехватывающий фундаментальные операции над целевым объектом. Каждая перехватываемая операция называется **trap**.

```js
const proxy = new Proxy(target, handler);
// target --- оригинальный объект
// handler --- объект с trap-функциями
```

### Все 13 traps

#### 1. `get(target, property, receiver)`

Перехватывает чтение свойства: `proxy.prop`, `proxy[expr]`, `Reflect.get()`.

```js
const handler = {
  get(target, prop, receiver) {
    console.log(`Reading ${String(prop)}`);
    return Reflect.get(target, prop, receiver);
  }
};
```

#### 2. `set(target, property, value, receiver)`

Перехватывает запись: `proxy.prop = val`. Должен вернуть `true` при успехе (в strict mode `false` бросит `TypeError`).

```js
const handler = {
  set(target, prop, value, receiver) {
    if (typeof value !== 'number') throw new TypeError(`${prop} must be a number`);
    return Reflect.set(target, prop, value, receiver);
  }
};
```

#### 3. `has(target, property)`

Перехватывает оператор `in`: `prop in proxy`.

```js
const handler = {
  has(target, prop) {
    if (prop.startsWith('_')) return false; // Скрываем приватные свойства
    return Reflect.has(target, prop);
  }
};
```

#### 4. `deleteProperty(target, property)`

Перехватывает `delete proxy.prop`.

```js
const handler = {
  deleteProperty(target, prop) {
    if (prop === 'id') throw new Error('Cannot delete id');
    return Reflect.deleteProperty(target, prop);
  }
};
```

#### 5. `ownKeys(target)`

Перехватывает `Object.keys()`, `Object.getOwnPropertyNames()`, `Object.getOwnPropertySymbols()`, `Reflect.ownKeys()`.

```js
const handler = {
  ownKeys(target) {
    return Reflect.ownKeys(target).filter(key =>
      typeof key !== 'string' || !key.startsWith('_')
    );
  }
};
```

#### 6. `getOwnPropertyDescriptor(target, property)`

Перехватывает `Object.getOwnPropertyDescriptor()`. **Важно**: если `ownKeys` возвращает свойство, этот trap должен вернуть для него дескриптор (иначе `Object.keys()` его не включит).

```js
const handler = {
  getOwnPropertyDescriptor(target, prop) {
    const desc = Reflect.getOwnPropertyDescriptor(target, prop);
    if (desc) desc.configurable = true; // Делаем все свойства configurable
    return desc;
  }
};
```

#### 7. `defineProperty(target, property, descriptor)`

Перехватывает `Object.defineProperty()`.

```js
const handler = {
  defineProperty(target, prop, descriptor) {
    if (prop.startsWith('_')) throw new Error('Cannot define private properties from outside');
    return Reflect.defineProperty(target, prop, descriptor);
  }
};
```

#### 8. `getPrototypeOf(target)`

Перехватывает `Object.getPrototypeOf()`, `__proto__`, `instanceof`.

#### 9. `setPrototypeOf(target, prototype)`

Перехватывает `Object.setPrototypeOf()`. Можно запретить изменение прототипа.

#### 10. `isExtensible(target)`

Перехватывает `Object.isExtensible()`.

#### 11. `preventExtensions(target)`

Перехватывает `Object.preventExtensions()`.

#### 12. `apply(target, thisArg, argumentsList)`

Перехватывает вызов функции: `proxy()`, `proxy.call()`, `proxy.apply()`. **Только для функций-target.**

```js
function sum(a, b) { return a + b; }

const proxy = new Proxy(sum, {
  apply(target, thisArg, args) {
    console.log(`Called with: ${args}`);
    const result = Reflect.apply(target, thisArg, args);
    console.log(`Result: ${result}`);
    return result;
  }
});

proxy(1, 2); // Called with: 1,2 -> Result: 3 -> 3
```

#### 13. `construct(target, argumentsList, newTarget)`

Перехватывает `new proxy()`. **Только для функций-конструкторов.**

```js
class User {
  constructor(name) { this.name = name; }
}

const ProxyUser = new Proxy(User, {
  construct(target, args, newTarget) {
    console.log(`Creating instance with: ${args}`);
    const instance = Reflect.construct(target, args, newTarget);
    instance.createdAt = Date.now();
    return instance;
  }
});

const u = new ProxyUser('Alice'); // Creating instance with: Alice
u.createdAt; // timestamp
```

### Invariants (инварианты)

Proxy не может нарушить определённые **инварианты** спецификации. Это защита целостности:

1. **`get`** --- если свойство target non-configurable + non-writable, trap должен вернуть то же значение.
2. **`set`** --- если свойство non-configurable + non-writable, trap не может изменить значение. Если свойство non-configurable + без setter, trap не может установить значение.
3. **`has`** --- не может скрыть non-configurable свойство или свойство non-extensible объекта.
4. **`ownKeys`** --- должен включать все non-configurable свойства target.
5. **`getOwnPropertyDescriptor`** --- не может сообщить что non-configurable свойство не существует.
6. **`deleteProperty`** --- не может удалить non-configurable свойство.
7. **`preventExtensions`** --- может вернуть `true` только если `Object.isExtensible(target)` уже `false`.

```js
const target = {};
Object.defineProperty(target, 'locked', {
  value: 42,
  writable: false,
  configurable: false
});

const proxy = new Proxy(target, {
  get(target, prop) {
    if (prop === 'locked') return 100; // НАРУШЕНИЕ инварианта!
    return target[prop];
  }
});

proxy.locked; // TypeError: 'get' on proxy: property 'locked' is a read-only
              // and non-configurable data property on the proxy target
              // but the proxy did not return its actual value
```

---

## Revocable Proxy

`Proxy.revocable()` создаёт proxy, который можно **отключить** --- после отзыва любая операция над proxy бросает `TypeError`:

```js
const { proxy, revoke } = Proxy.revocable({ data: 'secret' }, {
  get(target, prop) {
    return Reflect.get(target, prop);
  }
});

proxy.data; // 'secret'

revoke();

proxy.data; // TypeError: Cannot perform 'get' on a proxy that has been revoked
```

### Use cases

**Temporary access** --- предоставление временного доступа к объекту:

```js
function grantTemporaryAccess(resource, ttlMs) {
  const { proxy, revoke } = Proxy.revocable(resource, {});
  setTimeout(revoke, ttlMs);
  return proxy;
}

const tempAccess = grantTemporaryAccess(database, 5000);
tempAccess.query('SELECT ...'); // OK в первые 5 секунд
// После 5 секунд --- TypeError
```

**Capability-based security** --- выдать proxy вместо реального объекта, отозвать при необходимости:

```js
class AccessManager {
  #grants = new Map();

  grant(user, resource) {
    const { proxy, revoke } = Proxy.revocable(resource, {
      set() { throw new Error('Read-only access'); },
      deleteProperty() { throw new Error('Read-only access'); }
    });
    this.#grants.set(user, revoke);
    return proxy;
  }

  revokeAccess(user) {
    this.#grants.get(user)?.();
    this.#grants.delete(user);
  }
}
```

---

## Reflect API

`Reflect` --- встроенный объект с методами, зеркалящими все 13 proxy traps. Это **не конструктор** (нельзя `new Reflect()`).

### Зачем Reflect

1. **Единообразный API** --- все мета-операции в одном месте
2. **Возвращает `boolean` вместо throw** --- `Reflect.defineProperty()` возвращает `false` при неудаче (вместо `TypeError` от `Object.defineProperty()`)
3. **Forward default behavior** в proxy traps --- вместо ручного `target[prop]`

### Основные методы

```js
// Reflect.get --- с корректной обработкой receiver
Reflect.get(target, 'prop');
Reflect.get(target, 'prop', customReceiver); // receiver для getter

// Reflect.set --- возвращает boolean
const success = Reflect.set(target, 'prop', value);

// Reflect.has --- аналог 'in' оператора
Reflect.has(target, 'prop'); // true/false

// Reflect.deleteProperty --- аналог delete
Reflect.deleteProperty(target, 'prop'); // true/false

// Reflect.ownKeys --- ВСЕ собственные ключи (string + symbol)
Reflect.ownKeys(obj); // Объединяет getOwnPropertyNames + getOwnPropertySymbols

// Reflect.apply --- вызов функции с явным this
Reflect.apply(Math.max, null, [1, 2, 3]); // 3

// Reflect.construct --- аналог new, но с контролем newTarget
Reflect.construct(Date, [], MyDateSubclass);

// Reflect.defineProperty --- не бросает, возвращает boolean
const ok = Reflect.defineProperty(obj, 'prop', { value: 42 });
```

### Reflect внутри trap --- forward default behavior

Без `Reflect` внутри trap нужно вручную воспроизводить default behavior, что чревато ошибками (особенно с getter/setter/receiver):

```js
// БЕЗ Reflect --- некорректная обработка getter с наследованием
const handler = {
  get(target, prop, receiver) {
    console.log(`get ${String(prop)}`);
    return target[prop]; // ПРОБЛЕМА: если prop --- getter, this будет target, не receiver
  }
};

// С Reflect --- корректно
const handler = {
  get(target, prop, receiver) {
    console.log(`get ${String(prop)}`);
    return Reflect.get(target, prop, receiver); // Правильный receiver для getter
  }
};
```

Пример, демонстрирующий разницу:

```js
const parent = new Proxy({
  get name() { return this._name; },
  _name: 'parent'
}, {
  get(target, prop, receiver) {
    return Reflect.get(target, prop, receiver); // receiver === child
  }
});

const child = Object.create(parent);
child._name = 'child';

child.name; // 'child' --- корректно, потому что getter вызван с this === child (receiver)
```

---

## Практические паттерны

### Validation Proxy

```js
function createValidated(schema) {
  return new Proxy({}, {
    set(target, prop, value) {
      const validator = schema[prop];
      if (!validator) throw new Error(`Unknown property: ${prop}`);
      if (!validator(value)) throw new TypeError(`Invalid value for ${prop}: ${value}`);
      return Reflect.set(target, prop, value);
    }
  });
}

const user = createValidated({
  name: v => typeof v === 'string' && v.length > 0,
  age: v => Number.isInteger(v) && v >= 0 && v <= 150,
  email: v => typeof v === 'string' && v.includes('@'),
});

user.name = 'Alice';   // OK
user.age = 25;          // OK
user.age = -1;          // TypeError: Invalid value for age: -1
user.unknown = 'x';     // Error: Unknown property: unknown
```

### Logging / Tracing Proxy

```js
function createTracer(target, label = 'Object') {
  return new Proxy(target, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return new Proxy(value, {
          apply(fn, thisArg, args) {
            console.log(`${label}.${String(prop)}(${args.map(a => JSON.stringify(a)).join(', ')})`);
            const result = Reflect.apply(fn, thisArg, args);
            console.log(`  -> ${JSON.stringify(result)}`);
            return result;
          }
        });
      }
      console.log(`${label}.${String(prop)} -> ${JSON.stringify(value)}`);
      return value;
    },
    set(target, prop, value, receiver) {
      console.log(`${label}.${String(prop)} = ${JSON.stringify(value)}`);
      return Reflect.set(target, prop, value, receiver);
    }
  });
}

const tracedArray = createTracer([1, 2, 3], 'arr');
tracedArray.push(4); // arr.push(4) -> 4
tracedArray.length;  // arr.length -> 4
```

### Reactive System (принцип Vue 3)

Vue 3 использует `Proxy` для reactivity вместо `Object.defineProperty()` (Vue 2). Упрощённая реализация:

```js
let activeEffect = null;
const targetMap = new WeakMap(); // target -> Map<key, Set<effect>>

function reactive(target) {
  return new Proxy(target, {
    get(target, prop, receiver) {
      track(target, prop); // Регистрируем зависимость
      const value = Reflect.get(target, prop, receiver);
      // Рекурсивно оборачиваем вложенные объекты (lazy)
      if (typeof value === 'object' && value !== null) {
        return reactive(value);
      }
      return value;
    },
    set(target, prop, value, receiver) {
      const oldValue = target[prop];
      const result = Reflect.set(target, prop, value, receiver);
      if (oldValue !== value) {
        trigger(target, prop); // Уведомляем подписчиков
      }
      return result;
    },
    deleteProperty(target, prop) {
      const hadKey = prop in target;
      const result = Reflect.deleteProperty(target, prop);
      if (hadKey) trigger(target, prop);
      return result;
    }
  });
}

function track(target, key) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) targetMap.set(target, (depsMap = new Map()));
  let deps = depsMap.get(key);
  if (!deps) depsMap.set(key, (deps = new Set()));
  deps.add(activeEffect);
}

function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const effects = depsMap.get(key);
  effects?.forEach(effect => effect());
}

function watchEffect(fn) {
  activeEffect = fn;
  fn();
  activeEffect = null;
}

// Использование
const state = reactive({ count: 0, nested: { value: 42 } });

watchEffect(() => {
  console.log(`count is: ${state.count}`);
});

state.count++; // Автоматически: "count is: 1"
```

### Negative Array Indexing

```js
function negativeArray(arr) {
  return new Proxy(arr, {
    get(target, prop, receiver) {
      const index = Number(prop);
      if (Number.isInteger(index) && index < 0) {
        return Reflect.get(target, target.length + index, receiver);
      }
      return Reflect.get(target, prop, receiver);
    },
    set(target, prop, value, receiver) {
      const index = Number(prop);
      if (Number.isInteger(index) && index < 0) {
        return Reflect.set(target, target.length + index, value, receiver);
      }
      return Reflect.set(target, prop, value, receiver);
    }
  });
}

const arr = negativeArray([1, 2, 3, 4, 5]);
arr[-1]; // 5
arr[-2]; // 4
arr[-1] = 99;
arr[4];  // 99
```

### Default Values Proxy

```js
function withDefaults(target, defaults) {
  return new Proxy(target, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (value !== undefined) return value;
      return typeof defaults === 'function' ? defaults(prop) : defaults[prop];
    }
  });
}

const config = withDefaults(
  { host: 'localhost' },
  { host: '0.0.0.0', port: 3000, debug: false }
);

config.host;  // 'localhost' --- из target
config.port;  // 3000 --- из defaults
config.debug; // false --- из defaults
```

### Access Control Proxy

```js
function createReadOnly(target) {
  return new Proxy(target, {
    set() { throw new Error('Cannot modify read-only object'); },
    deleteProperty() { throw new Error('Cannot delete from read-only object'); },
    defineProperty() { throw new Error('Cannot define property on read-only object'); },
    setPrototypeOf() { throw new Error('Cannot change prototype of read-only object'); },

    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      // Рекурсивно оборачиваем вложенные объекты
      if (typeof value === 'object' && value !== null) {
        return createReadOnly(value);
      }
      return value;
    }
  });
}

const original = { a: 1, nested: { b: 2 } };
const frozen = createReadOnly(original);

frozen.a;          // 1
frozen.a = 2;      // Error: Cannot modify read-only object
frozen.nested.b;   // 2
frozen.nested.b = 3; // Error --- вложенный объект тоже protected
```

---

## Proxy и производительность

### Overhead

Proxy добавляет **ощутимый overhead** к каждой перехватываемой операции. В hot path это может быть критично:

- **Property access** через proxy ~3-10x медленнее прямого доступа (зависит от движка и trap-логики)
- **V8** оптимизирует прямой доступ через inline caches --- proxy invalidирует эти оптимизации
- Каждый trap-вызов --- это дополнительный вызов функции с аллокацией аргументов

### Когда НЕ использовать Proxy

1. **Hot loops** --- перебор миллионов элементов через proxy-обёрнутый массив
2. **Простая валидация** --- лучше использовать setter-методы или `class` с `#private` fields
3. **Когда хватает `Object.defineProperty()`** --- для перехвата конкретных свойств это быстрее
4. **Глубоко вложенные структуры** --- рекурсивное оборачивание создаёт множество proxy-объектов

### Membrane Pattern

Паттерн, при котором **все объекты**, пересекающие границу, автоматически оборачиваются в proxy. Используется для изоляции (sandboxing):

```js
function createMembrane(target) {
  const proxyCache = new WeakMap();

  function wrap(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (proxyCache.has(obj)) return proxyCache.get(obj);

    const proxy = new Proxy(obj, {
      get(target, prop, receiver) {
        return wrap(Reflect.get(target, prop, receiver)); // Оборачиваем возвращаемое
      },
      set(target, prop, value, receiver) {
        return Reflect.set(target, prop, unwrap(value), receiver); // Разворачиваем входящее
      },
      apply(target, thisArg, args) {
        return wrap(Reflect.apply(target, unwrap(thisArg), args.map(unwrap)));
      }
    });

    proxyCache.set(obj, proxy);
    return proxy;
  }

  function unwrap(obj) {
    // Обратный маппинг proxy -> original
    // В полной реализации --- второй WeakMap
    return obj;
  }

  return wrap(target);
}
```

Membrane гарантирует, что код по ту сторону границы **никогда** не получит прямую ссылку на оригинальный объект --- только proxy. Это основа для **security sandboxing** (Salesforce LWS, Realms proposal).

---

## Meta-programming с Symbol

### `Symbol.toPrimitive`

Контролирует приведение объекта к примитиву. Вызывается при `+obj`, `${obj}`, `obj == 42`:

```js
class Money {
  constructor(amount, currency) {
    this.amount = amount;
    this.currency = currency;
  }

  [Symbol.toPrimitive](hint) {
    switch (hint) {
      case 'number': return this.amount;
      case 'string': return `${this.amount} ${this.currency}`;
      case 'default': return this.amount; // Используется для == и +
    }
  }
}

const price = new Money(42, 'USD');
+price;        // 42
`${price}`;    // '42 USD'
price + 8;     // 50
price == 42;   // true
```

### `Symbol.hasInstance`

Кастомизирует поведение `instanceof`:

```js
class EvenNumber {
  static [Symbol.hasInstance](value) {
    return typeof value === 'number' && value % 2 === 0;
  }
}

4 instanceof EvenNumber;  // true
5 instanceof EvenNumber;  // false
'4' instanceof EvenNumber; // false
```

### `Symbol.species`

Определяет конструктор для создания производных объектов. Используется встроенными методами (`map`, `filter`, `slice`):

```js
class PowerArray extends Array {
  // Методы массива (map, filter, slice) будут возвращать обычный Array
  static get [Symbol.species]() {
    return Array;
  }

  power() {
    return this.map(v => v ** 2);
  }
}

const arr = new PowerArray(1, 2, 3);
const mapped = arr.map(x => x);

mapped instanceof PowerArray; // false --- вернул Array, не PowerArray
mapped instanceof Array;      // true
```

### `Symbol.toStringTag`

Контролирует результат `Object.prototype.toString.call()`:

```js
class MyCollection {
  get [Symbol.toStringTag]() {
    return 'MyCollection';
  }
}

Object.prototype.toString.call(new MyCollection()); // '[object MyCollection]'
```

### `Symbol.isConcatSpreadable`

Контролирует, будет ли объект «разворачиваться» при `Array.prototype.concat()`:

```js
const notSpreadable = [1, 2, 3];
notSpreadable[Symbol.isConcatSpreadable] = false;

[0].concat(notSpreadable); // [0, [1, 2, 3]] --- массив не развёрнут

// Можно сделать array-like объект spreadable
const arrayLike = {
  0: 'a',
  1: 'b',
  length: 2,
  [Symbol.isConcatSpreadable]: true
};

['x'].concat(arrayLike); // ['x', 'a', 'b']
```

### `Symbol.iterator` в контексте meta-programming

Определяет протокол итерации (подробно описан в разделе об итераторах). В контексте Proxy позволяет создавать объекты с полностью кастомным поведением перебора:

```js
const magic = new Proxy({}, {
  get(target, prop) {
    if (prop === Symbol.iterator) {
      return function* () {
        yield 1;
        yield 2;
        yield 3;
      };
    }
    return Reflect.get(target, prop);
  }
});

[...magic]; // [1, 2, 3] --- пустой объект стал iterable через proxy
```

### Комбинирование Proxy и Symbol

```js
// Объект, который ведёт себя как число, строка и iterable одновременно
const swiss = new Proxy({ value: 42 }, {
  get(target, prop) {
    if (prop === Symbol.toPrimitive) {
      return (hint) => hint === 'string' ? `value(${target.value})` : target.value;
    }
    if (prop === Symbol.iterator) {
      return function* () {
        for (let i = 0; i < target.value; i++) yield i;
      };
    }
    if (prop === Symbol.hasInstance) {
      return (v) => typeof v === 'number' && v <= target.value;
    }
    return Reflect.get(target, prop);
  }
});

+swiss;        // 42
`${swiss}`;    // 'value(42)'
[...swiss];    // [0, 1, 2, ... 41]
```
