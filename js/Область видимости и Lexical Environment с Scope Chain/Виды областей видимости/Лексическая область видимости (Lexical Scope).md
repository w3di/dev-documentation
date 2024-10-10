Это концепция, согласно которой область видимости переменной определяется местом её объявления в исходном коде. В JavaScript это означает, что функции имеют доступ к переменным из своей собственной области видимости и из внешних областей видимости, где они были объявлены.

```js
function outerFunction() {
  let outerVar = "I am from outer function";

  function innerFunction() {
    console.log(outerVar); // "I am from outer function"
  }

  innerFunction();
}

outerFunction();
```