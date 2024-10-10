`async` и `await` — это ключевые слова в JavaScript, которые упрощают работу с асинхронным кодом, делая его более читабельным и управляемым. Они позволяют писать асинхронный код, который выглядит как синхронный, избавляясь от необходимости в использовании цепочек `Promise` с `.then()` и `.catch()`.

### Что такое `async`?

`async` — это ключевое слово, которое используется перед функцией для того, чтобы объявить её асинхронной. Асинхронные функции автоматически возвращают промис (Promise). Даже если внутри функции возвращается не промис, JavaScript неявно обернёт возвращаемое значение в промис.
```js
async function example() {
  return "Hello";
}

example().then(result => console.log(result)); // "Hello"
```

Здесь функция `example` возвращает строку "Hello", но поскольку функция объявлена с `async`, она фактически возвращает промис, который разрешается этим значением.

### Что такое `await`?

`await` используется только внутри асинхронных функций (тех, которые объявлены с `async`). Оно заставляет JavaScript дождаться выполнения промиса и возвращает его разрешённое значение. Это позволяет писать асинхронный код так, как если бы он был синхронным.

```js
async function fetchData() {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
  const data = await response.json();
  console.log(data);
}

fetchData();
```

Здесь `await` перед вызовом `fetch` приостанавливает выполнение функции до тех пор, пока `fetch` не вернёт результат. Это позволяет избежать вложенных `.then()` и улучшает читаемость кода.

### Основные характеристики `async` и `await`

1. **Асинхронные функции возвращают промис:** Любая функция, объявленная с `async`, всегда возвращает промис. Если внутри функции возвращается простое значение, оно автоматически оборачивается в промис.
    
```js
async function example() {
  return "Hello!";
}

example().then(result => console.log(result)); // "Hello!"
```
    
2. **`await` останавливает выполнение функции:** Когда используется `await`, выполнение функции приостанавливается до тех пор, пока промис не будет разрешён. Это упрощает последовательное выполнение асинхронных операций.
    
```js
async function getData() {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
  const data = await response.json();
  console.log(data);
}

getData();
```
    
3. **Обработка ошибок с помощью `try/catch`:** Вместо использования `.catch()` для обработки ошибок, возникающих в цепочке промисов, можно использовать блоки `try/catch`.
    
```js
async function fetchWithErrorHandling() {
  try {
    const response = await fetch('https://jsonplaceholder.typicode.com/invalid-url');
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.log('Error:', error.message);
  }
}

fetchWithErrorHandling();
```
    
4. **Последовательное выполнение асинхронных операций:** Когда несколько асинхронных операций зависят друг от друга, их можно выполнять последовательно, используя несколько `await`.
    
```js
async function sequentialFetch() {
  const response1 = await fetch('https://jsonplaceholder.typicode.com/posts/1');
  const data1 = await response1.json();
  console.log(data1);

  const response2 = await fetch('https://jsonplaceholder.typicode.com/posts/2');
  const data2 = await response2.json();
  console.log(data2);
}

sequentialFetch();
```
    Это позволяет выполнять запросы один за другим, дожидаясь завершения каждого предыдущего.
    
5. **Параллельное выполнение асинхронных операций:** Если нужно выполнить несколько независимых асинхронных операций параллельно, можно использовать `Promise.all()` вместе с `await`.
    
```js
async function parallelFetch() {
  const [response1, response2] = await Promise.all([
    fetch('https://jsonplaceholder.typicode.com/posts/1'),
    fetch('https://jsonplaceholder.typicode.com/posts/2')
  ]);

  const data1 = await response1.json();
  const data2 = await response2.json();

  console.log(data1, data2);
}

parallelFetch();
```
    Здесь два запроса выполняются одновременно, а не последовательно, что экономит время.
    

### Важные моменты:

- **Асинхронные функции всегда возвращают промис:** Даже если функция ничего не возвращает, она возвращает промис, который разрешается со значением `undefined`.
    
- **`await` можно использовать только внутри `async` функций.** В противном случае, JavaScript выдаст ошибку.
    
- **Асинхронность и параллелизм:** Важно понимать, что `await` останавливает выполнение только той функции, в которой оно используется. Это не блокирует выполнение других частей программы.
