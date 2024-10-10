Замыкание (closure) — это функция, которая сохраняет доступ к переменным своего лексического окружения после завершения выполнения внешней функции.

#### Основы

1. **Создание Замыкания:**
    
    - Функция внутри другой функции имеет доступ к переменным внешней функции.
    
```js
function outer() {
    let outerVar = 'I am outer';
    function inner() {
        console.log(outerVar); // 'I am outer'
    }
    return inner;
}
const closure = outer();
closure(); // 'I am outer'
```
        
    
2. **Сохранение Состояния:**
    
    - Замыкания сохраняют состояние переменных, доступных внутри функции.

```js
function makeCounter() {
    let count = 0;
    return function() {
        count += 1;
        return count;
    };
}
const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
```
        

#### Применения

1. **Инкапсуляция:**
    
    - Замыкания могут скрывать данные и методы от глобальной области видимости.
        
```js
function createSecret(secret) {
    return function() {
        return secret;
    };
}
const mySecret = createSecret('Top Secret');
console.log(mySecret()); // 'Top Secret'
```
        
2. **Модули:**
    
    - Замыкания позволяют создавать модули с приватными переменными и методами.
        
```js
const CounterModule = (function() {
    let count = 0;
    return {
        increment: function() {
            count += 1;
            return count;
        },
        getCount: function() {
            return count;
        }
    };
})();
console.log(CounterModule.increment()); // 1
console.log(CounterModule.getCount()); // 1    
```
        
3. **Асинхронное Программирование:**
    
    - Замыкания сохраняют контекст при выполнении асинхронных операций.
        
```js
function fetchData(url) {
    setTimeout(() => {
        console.log(`Data from ${url}`);
    }, 1000);
}

function fetchWithContext(url) {
    return function() {
        fetchData(url);
    };
}
const fetchGoogle = fetchWithContext('https://google.com');
fetchGoogle(); // 'Data from https://google.com' через 1 секунду
```
        

#### Важные Моменты

1. **Проблемы с Памятью:**
    - Замыкания могут вызывать утечки памяти, если они удерживают ссылки на ненужные объекты.