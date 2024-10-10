
Численное преобразование в JavaScript включает в себя процесс преобразования значений различных типов данных в числовой тип (`Number`). Это может происходить явным образом, с помощью встроенных функций и методов, или неявно, в контексте арифметических операций и других ситуаций.

#### **Явное численное преобразование**

1. **Функция `Number()`**
    
    - Преобразует значение в числовой тип.
    - Если преобразование невозможно, возвращает `NaN` (Not-a-Number).
    
	```javascript
	console.log(Number('42'));      // 42 
	console.log(Number('3.14'));    // 3.14 
	console.log(Number(''));        // 0 
	console.log(Number(true));      // 1
	console.log(Number(false));     // 0 
	console.log(Number(null));      // 0 
	console.log(Number(undefined)); // NaN 
	console.log(Number('abc'));     // NaN
	```
    

2. **Методы преобразования числа**
    
    - **`parseInt()`**: Преобразует строку в целое число, учитывая указанный основание системы счисления.

	```javascript
    console.log(parseInt('42'));        // 42
    console.log(parseInt('42px'));      // 42
    console.log(parseInt('3.14'));      // 3 (игнорирует дробную часть) 
    console.log(parseInt('101', 2));    // 5 (двоичное основание)`    
	```

    - **`parseFloat()`**: Преобразует строку в число с плавающей точкой.

```javascript
    console.log(parseFloat('3.14'));    // 3.14
    console.log(parseFloat('3.14abc')); // 3.14 
    console.log(parseFloat('42'));      // 42`
```

#### **Неявное численное преобразование**

1. **Арифметические операции**
    
	Использование любых арифметических операций кроме сложения (+) на строках приводит к численному преобразованию.

 ```javascript
    console.log('5' - 2);   // 3 
    console.log('5' * 2);   // 10 
    console.log('5' / 2);   // 2.5`
	console.log('5' + 2);   // '52'
	console.log('abc' / 2); // NaN
```


