![[promises.png.png]]

**`Promise`** в JavaScript — это объект, представляющий асинхронную операцию, которая может завершиться успехом или провалом. Основное предназначение Promises — это обработка асинхронных операций (таких как HTTP-запросы, таймеры, работа с файлами и т.д.) более удобным и последовательным способом, чем с помощью вложенных обратных вызовов (callback).

#### Основные состояния Promise:

1. **Pending (ожидание)** — начальное состояние. Promise находится в этом состоянии до тех пор, пока не завершится асинхронная операция.
2. **Fulfilled (выполнено успешно)** — операция завершилась успешно, и Promise возвращает результат.
3. **Rejected (отклонено)** — операция завершилась неудачно, и Promise возвращает ошибку.

#### Создание Promise

Promise создается с помощью конструктора `Promise`, который принимает один аргумент — функцию (называемую **executor**). Эта функция, в свою очередь, принимает два аргумента: `resolve` и `reject`, которые вызываются для изменения состояния Promise на `fulfilled` или `rejected`.

Пример:

```js
const myPromise = new Promise((resolve, reject) => {
  const success = true;
  
  if (success) {
    resolve('Операция успешно завершена!');
  } else {
    reject('Ошибка выполнения операции.');
  }
});
```

#### Обработка результатов

Для обработки успешного выполнения Promise используется метод `.then()`, а для обработки ошибок — метод `.catch()`. Оба метода возвращают новый Promise, что позволяет создавать **цепочки вызовов**.

Пример успешной и неудачной обработки:

```js
myPromise
  .then((result) => {
    console.log(result); // "Операция успешно завершена!"
  })
  .catch((error) => {
    console.log(error);  // "Ошибка выполнения операции."
  });
```

#### Методы и особенности работы с Promises

1. **`.then()`**  
    Этот метод используется для обработки успешного выполнения Promise. Он принимает два аргумента: функцию для обработки результата и опционально функцию для обработки ошибки.
    
 ```js
myPromise.then((result) => {
  console.log(result);
}, (error) => {
  console.error(error);
});
```
    
В большинстве случаев вместо второго аргумента используется `.catch()` для обработки ошибок.
    
2. **`.catch()`**  
    Этот метод обрабатывает ошибки, возникшие при выполнении Promise.
    
```js
myPromise.catch((error) => {
  console.error('Возникла ошибка:', error);
});
```
    
3. **`.finally()`**  
    Метод `.finally()` вызывается в любом случае, вне зависимости от того, был ли Promise выполнен успешно или завершился с ошибкой.
```js
myPromise.finally(() => {
  console.log('Операция завершена.');
});
```
    
4. **Цепочки Promises**  
    Основная сила Promises заключается в том, что их можно связывать в цепочки. Это позволяет последовательно выполнять асинхронные операции. Каждый `.then()` возвращает новый Promise.
    
```js
myPromise
  .then((result) => {
    console.log(result);
    return new Promise((resolve) => setTimeout(() => resolve('Следующая операция выполнена!'), 1000));
  })
  .then((nextResult) => {
    console.log(nextResult); // "Следующая операция выполнена!"
  })
  .catch((error) => {
    console.error('Ошибка:', error);
  });
```
    

#### Статические методы Promise

1. **`Promise.resolve(value)`**  
    Возвращает Promise, который сразу же выполняется с переданным значением.
    
```js
Promise.resolve('Успех').then((value) => {
  console.log(value); // "Успех"
});
```
    
2. **`Promise.reject(error)`**  
    Возвращает Promise, который сразу же отклоняется с переданной ошибкой.
    
```js
Promise.reject('Ошибка').catch((error) => {
  console.log(error); // "Ошибка"
});
```
    
3. **`Promise.all(promises)`**  
    Ожидает завершения всех переданных в массиве Promise. Возвращает новый Promise, который выполняется, когда все Promises завершены. Если хоть один из Promises отклоняется, возвращаемый Promise будет отклонён.
    
```js
const p1 = Promise.resolve(3);
const p2 = new Promise((resolve) => setTimeout(resolve, 1000, 'foo'));
const p3 = 42;

Promise.all([p1, p2, p3]).then((values) => {
  console.log(values); // [3, "foo", 42]
});
```
    
4. **`Promise.race(promises)`**  
    Возвращает Promise, который завершится первым — успешным или с ошибкой, вне зависимости от того, что завершится раньше среди переданных Promises.
    
```js
const p1 = new Promise((resolve) => setTimeout(resolve, 500, 'Первый'));
const p2 = new Promise((resolve) => setTimeout(resolve, 100, 'Второй'));

Promise.race([p1, p2]).then((value) => {
  console.log(value); // "Второй"
});
```
    
5. **`Promise.allSettled(promises)`**  
    Возвращает Promise, который выполняется, когда все Promises завершены (как успешно, так и с ошибкой), возвращая массив объектов с результатами каждой операции.
    
```js
const p1 = Promise.resolve('Успех');
const p2 = Promise.reject('Ошибка');

Promise.allSettled([p1, p2]).then((results) => {
  console.log(results);
  // [{ status: "fulfilled", value: "Успех" }, { status: "rejected", reason: "Ошибка" }]
});
```
    
6. **`Promise.any(promises)`**  
    Возвращает Promise, который выполнится, когда любой из переданных Promises выполнится успешно. Если все Promises будут отклонены, вернёт ошибку.
    
```js
const p1 = Promise.reject('Ошибка 1');
const p2 = Promise.reject('Ошибка 2');
const p3 = Promise.resolve('Успех');

Promise.any([p1, p2, p3]).then((value) => {
  console.log(value); // "Успех"
});
```
