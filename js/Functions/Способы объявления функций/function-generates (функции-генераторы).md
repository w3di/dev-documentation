Функции-генераторы позволяют управлять выполнением функции, используя ключевое слово `yield`. Они создаются с использованием синтаксиса `function*`.

```js
function* generatorFunction() {
  yield 1;
  yield 2;
  yield 3;
}

const gen = generatorFunction();
console.log(gen.next().value); // 1
console.log(gen.next().value); // 2
console.log(gen.next().value); // 3

```