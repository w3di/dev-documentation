Введён в ES6 с помощью `let` и `const`. Переменные, объявленные с помощью `let` или `const` внутри блока кода (например, внутри `{}`), видны только в этом блоке.

```js
if (true) {
  let blockVar = "I am block-scoped";
  console.log(blockVar); // "I am block-scoped"
}

console.log(blockVar); // ReferenceError: blockVar is not defined
```
