Модули ES6 позволяют создавать области видимости для переменных и функций, которые доступны только в рамках модуля. Переменные и функции, объявленные в модуле, не видны за его пределами, если они не экспортируются.

```js
// module.js
export const moduleVar = "I am a module variable";

function moduleFunc() {
  console.log(moduleVar);
}

export default moduleFunc;

// main.js
import moduleFunc from './module.js';

moduleFunc(); // "I am a module variable"
console.log(moduleVar); // ReferenceError: moduleVar is not defined

```