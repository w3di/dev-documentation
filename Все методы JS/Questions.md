Стандартизованные и актуальные методы JavaScript. Ниже — раздел для `String` без устаревших/нестандартных API. Если нужно, продолжу для `Array`, `Object`, `Number`, `Map`, `Set`, `Promise`, `Date` и др.

### String

- **Статические методы**:
  - `String.fromCharCode()`
  - `String.fromCodePoint()`
  - `String.raw()`

- **Свойства экземпляра**:
  - `length`

- **Методы экземпляра (актуальные)**:
  - `at()`
  - `charAt()`
  - `charCodeAt()`
  - `codePointAt()`
  - `concat()`
  - `endsWith()`
  - `includes()`
  - `indexOf()`
  - `isWellFormed()`
  - `lastIndexOf()`
  - `localeCompare()`
  - `match()`
  - `matchAll()`
  - `normalize()`
  - `padEnd()`
  - `padStart()`
  - `repeat()`
  - `replace()`
  - `replaceAll()`
  - `search()`
  - `slice()`
  - `split()`
  - `startsWith()`
  - `substring()`
  - `toLocaleLowerCase()`
  - `toLocaleUpperCase()`
  - `toLowerCase()`
  - `toString()`
  - `toUpperCase()`
  - `toWellFormed()`
  - `trim()`
  - `trimEnd()`
  - `trimStart()`
  - `valueOf()`
  - `[Symbol.iterator]()`


### Array

- **Статические методы**:
  - `Array.from()`
  - `Array.isArray()`
  - `Array.of()`

- **Свойства экземпляра**:
  - `length`

- **Методы экземпляра (актуальные)**:
  - `at()`
  - `concat()`
  - `copyWithin()`
  - `entries()`
  - `every()`
  - `fill()`
  - `filter()`
  - `find()`
  - `findIndex()`
  - `findLast()`
  - `findLastIndex()`
  - `flat()`
  - `flatMap()`
  - `forEach()`
  - `includes()`
  - `indexOf()`
  - `join()`
  - `keys()`
  - `lastIndexOf()`
  - `map()`
  - `pop()`
  - `push()`
  - `reduce()`
  - `reduceRight()`
  - `reverse()`
  - `shift()`
  - `slice()`
  - `some()`
  - `sort()`
  - `splice()`
  - `toLocaleString()`
  - `toReversed()`
  - `toSorted()`
  - `toSpliced()`
  - `toString()`
  - `unshift()`
  - `values()`
  - `with()`



### Object

- **Статические методы**:
  - `Object.assign()`
  - `Object.create()`
  - `Object.defineProperties()`
  - `Object.defineProperty()`
  - `Object.entries()`
  - `Object.freeze()`
  - `Object.fromEntries()`
  - `Object.getOwnPropertyDescriptor()`
  - `Object.getOwnPropertyDescriptors()`
  - `Object.getOwnPropertyNames()`
  - `Object.getOwnPropertySymbols()`
  - `Object.getPrototypeOf()`
  - `Object.hasOwn()`
  - `Object.is()`
  - `Object.isExtensible()`
  - `Object.isFrozen()`
  - `Object.isSealed()`
  - `Object.keys()`
  - `Object.preventExtensions()`
  - `Object.seal()`
  - `Object.setPrototypeOf()`
  - `Object.values()`

- **Свойства экземпляра**:
  - `constructor`

- **Методы экземпляра (актуальные)**:
  - `hasOwnProperty()`
  - `isPrototypeOf()`
  - `propertyIsEnumerable()`
  - `toLocaleString()`
  - `toString()`
  - `valueOf()`



### Number

- **Статические свойства** (часто полезны):
  - `Number.EPSILON`, `Number.MAX_SAFE_INTEGER`, `Number.MIN_SAFE_INTEGER`, `Number.MAX_VALUE`, `Number.MIN_VALUE`, `Number.NEGATIVE_INFINITY`, `Number.POSITIVE_INFINITY`, `Number.NaN`

- **Статические методы**:
  - `Number.isFinite()`
  - `Number.isInteger()`
  - `Number.isNaN()`
  - `Number.isSafeInteger()`
  - `Number.parseFloat()`
  - `Number.parseInt()`

- **Методы экземпляра (актуальные)**:
  - `toExponential()`
  - `toFixed()`
  - `toLocaleString()`
  - `toPrecision()`
  - `toString()`
  - `valueOf()`

### Boolean

- **Методы экземпляра (актуальные)**:
  - `toLocaleString()`
  - `toString()`
  - `valueOf()`

### Function

- **Статические свойства**:
  - `length`, `name`, `prototype`

- **Методы экземпляра (актуальные)**:
  - `apply()`
  - `bind()`
  - `call()`
  - `toString()`



### Date

- **Статические методы**:
  - `Date.now()`
  - `Date.parse()`
  - `Date.UTC()`

- **Методы экземпляра (актуальные)**:
  - Получение: `getDate()`, `getDay()`, `getFullYear()`, `getHours()`, `getMilliseconds()`, `getMinutes()`, `getMonth()`, `getSeconds()`, `getTime()`, `getTimezoneOffset()`, `getUTCDate()`, `getUTCDay()`, `getUTCFullYear()`, `getUTCHours()`, `getUTCMilliseconds()`, `getUTCMinutes()`, `getUTCMonth()`, `getUTCSeconds()`
  - Установка: `setDate()`, `setFullYear()`, `setHours()`, `setMilliseconds()`, `setMinutes()`, `setMonth()`, `setSeconds()`, `setTime()`, `setUTCDate()`, `setUTCFullYear()`, `setUTCHours()`, `setUTCMilliseconds()`, `setUTCMinutes()`, `setUTCMonth()`, `setUTCSeconds()`
  - Форматирование: `toDateString()`, `toISOString()`, `toJSON()`, `toLocaleDateString()`, `toLocaleString()`, `toLocaleTimeString()`, `toString()`, `toTimeString()`, `toUTCString()`
  - Прочее: `valueOf()`

### RegExp

- **Свойства экземпляра (только чтение)**:
  - `flags`, `dotAll`, `global`, `hasIndices`, `ignoreCase`, `multiline`, `sticky`, `unicode`, `source`

- **Методы экземпляра (актуальные)**:
  - `exec()`
  - `test()`
  - `toString()`

