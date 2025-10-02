Вопрос-ответ по актуальным (не устаревшим/не нестандартным) методам встроенных объектов JavaScript.

1. Что за статические методы существуют у String?
	1. `String.fromCharCode()`, `String.fromCodePoint()`, `String.raw()`.
2. Какие свойства экземпляра есть у String?
	1. `length`.
3. Какие актуальные методы экземпляра у String вы используете?
	1. `at()`, `charAt()`, `charCodeAt()`, `codePointAt()`, `concat()`, `endsWith()`, `includes()`, `indexOf()`, `isWellFormed()`, `lastIndexOf()`, `localeCompare()`, `match()`, `matchAll()`, `normalize()`, `padEnd()`, `padStart()`, `repeat()`, `replace()`, `replaceAll()`, `search()`, `slice()`, `split()`, `startsWith()`, `substring()`, `toLocaleLowerCase()`, `toLocaleUpperCase()`, `toLowerCase()`, `toString()`, `toUpperCase()`, `toWellFormed()`, `trim()`, `trimEnd()`, `trimStart()`, `valueOf()`, `[Symbol.iterator]()`.

4. Какие статические методы есть у Array?
	1. `Array.from()`, `Array.isArray()`, `Array.of()`.
5. Какие свойства экземпляра есть у Array?
	1. `length`.
6. Какие актуальные методы экземпляра у Array?
	1. `at()`, `concat()`, `copyWithin()`, `entries()`, `every()`, `fill()`, `filter()`, `find()`, `findIndex()`, `findLast()`, `findLastIndex()`, `flat()`, `flatMap()`, `forEach()`, `includes()`, `indexOf()`, `join()`, `keys()`, `lastIndexOf()`, `map()`, `pop()`, `push()`, `reduce()`, `reduceRight()`, `reverse()`, `shift()`, `slice()`, `some()`, `sort()`, `splice()`, `toLocaleString()`, `toReversed()`, `toSorted()`, `toSpliced()`, `toString()`, `unshift()`, `values()`, `with()`.

7. Какие статические методы предоставляет Object?
	1. `Object.assign()`, `Object.create()`, `Object.defineProperties()`, `Object.defineProperty()`, `Object.entries()`, `Object.freeze()`, `Object.fromEntries()`, `Object.getOwnPropertyDescriptor()`, `Object.getOwnPropertyDescriptors()`, `Object.getOwnPropertyNames()`, `Object.getOwnPropertySymbols()`, `Object.getPrototypeOf()`, `Object.hasOwn()`, `Object.is()`, `Object.isExtensible()`, `Object.isFrozen()`, `Object.isSealed()`, `Object.keys()`, `Object.preventExtensions()`, `Object.seal()`, `Object.setPrototypeOf()`, `Object.values()`.
8. Какие свойства и методы экземпляра есть у Object?
	1. Свойство: `constructor`.
	2. Методы: `hasOwnProperty()`, `isPrototypeOf()`, `propertyIsEnumerable()`, `toLocaleString()`, `toString()`, `valueOf()`.

9. Какие полезные статические свойства есть у Number?
	1. `Number.EPSILON`, `Number.MAX_SAFE_INTEGER`, `Number.MIN_SAFE_INTEGER`, `Number.MAX_VALUE`, `Number.MIN_VALUE`, `Number.NEGATIVE_INFINITY`, `Number.POSITIVE_INFINITY`, `Number.NaN`.
10. Какие статические методы есть у Number?
	1. `Number.isFinite()`, `Number.isInteger()`, `Number.isNaN()`, `Number.isSafeInteger()`, `Number.parseFloat()`, `Number.parseInt()`.
11. Какие методы экземпляра есть у Number?
	1. `toExponential()`, `toFixed()`, `toLocaleString()`, `toPrecision()`, `toString()`, `valueOf()`.

12. Какие методы экземпляра есть у Boolean?
	1. `toLocaleString()`, `toString()`, `valueOf()`.

13. Какие свойства и методы у Function?
	1. Свойства: `length`, `name`, `prototype`.
	2. Методы: `apply()`, `bind()`, `call()`, `toString()`.

14. Какие статические методы доступны у Date?
	1. `Date.now()`, `Date.parse()`, `Date.UTC()`.
15. Какие методы экземпляра у Date стоит знать?
	1. Получение: `getDate()`, `getDay()`, `getFullYear()`, `getHours()`, `getMilliseconds()`, `getMinutes()`, `getMonth()`, `getSeconds()`, `getTime()`, `getTimezoneOffset()`, `getUTCDate()`, `getUTCDay()`, `getUTCFullYear()`, `getUTCHours()`, `getUTCMilliseconds()`, `getUTCMinutes()`, `getUTCMonth()`, `getUTCSeconds()`.
	2. Установка: `setDate()`, `setFullYear()`, `setHours()`, `setMilliseconds()`, `setMinutes()`, `setMonth()`, `setSeconds()`, `setTime()`, `setUTCDate()`, `setUTCFullYear()`, `setUTCHours()`, `setUTCMilliseconds()`, `setUTCMinutes()`, `setUTCMonth()`, `setUTCSeconds()`.
	3. Форматирование: `toDateString()`, `toISOString()`, `toJSON()`, `toLocaleDateString()`, `toLocaleString()`, `toLocaleTimeString()`, `toString()`, `toTimeString()`, `toUTCString()`.
	4. Прочее: `valueOf()`.

16. Какие свойства экземпляра есть у RegExp?
	1. `flags`, `dotAll`, `global`, `hasIndices`, `ignoreCase`, `multiline`, `sticky`, `unicode`, `source`.
17. Какие методы экземпляра есть у RegExp?
	1. `exec()`, `test()`, `toString()`.

