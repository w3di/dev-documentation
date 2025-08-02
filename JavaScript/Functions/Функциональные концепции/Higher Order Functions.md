 Функции высшего порядка - это функции, которые могут выполнять следующие действия:

1. **Принимать функции в качестве аргументов**.
 ```js
const compose = (f, g) => x => f(g(x));

const add1 = x => x + 1;
const multiplyBy2 = x => x * 2;

const add1ThenMultiplyBy2 = compose(multiplyBy2, add1);
console.log(add1ThenMultiplyBy2(5)); // 12

```

```js
const numbers = [1, 2, 3];

const doubled = numbers.map(x => x * 2);
const sum = numbers.reduce((acc, x) => acc + x, 0);
const even = numbers.filter(x => x % 2 === 0);

console.log(doubled); // [2, 4, 6]
console.log(sum); // 6
console.log(even); // [2]
```


2. **Возвращать функции как результат**.
```js
function multiplier(factor) {
    return function(x) {
        return x * factor;
    };
}
const double = multiplier(2);
console.log(double(5)); // 10

```

```js
function greet(greeting) {
    return function(name) {
        return `${greeting}, ${name}!`;
    };
}

const sayHello = greet('Hello');
console.log(sayHello('Alice')); // "Hello, Alice!"

const sayGoodbye = greet('Goodbye');
console.log(sayGoodbye('Bob')); // "Goodbye, Bob!"

```
