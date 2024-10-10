Переменные, объявленные внутри функции, видны только внутри этой функции. Они не доступны за её пределами.

```js
function example() {
   let funcVar = "I am local to this function
   console.log(funcVar); // "I am local to this function" 
}
example();
console.log(funcVar); // ReferenceError: funcVar is not defined`
```