Это область видимости, которая охватывает весь код, за пределами функций и блоков. Все переменные и функции, объявленные в глобальной области видимости, доступны везде в вашем коде.
```js
let globalVar = "I am global";  
function showGlobal() {  
	console.log(globalVar); // "I am global" 
}
showGlobal();
console.log(globalVar); // "I am global"`
```
