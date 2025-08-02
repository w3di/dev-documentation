Строковое преобразование в JavaScript включает в себя процесс преобразования значений различных типов данных в строковый тип (`String`). Это преобразование может происходить явным образом с помощью встроенных функций и методов или неявно, в контексте различных операций и ситуаций.

#### **Явное строковое преобразование**

1. **Функция `String()`** - Преобразует значение в строковый тип.

```javascript
    console.log(String(42));           // '42' 
    console.log(String(true));         // 'true'
    console.log(String(null));         // 'null' 
    console.log(String(undefined));    // 'undefined' 
    console.log(String({}));           // '[object Object]' 
    console.log(String([]));           // ''
```


2. **Методы преобразования строки**

- **Метод `toString()`**: Вызывается у объектов и преобразует их в строку.
```javascript
	console.log((42).toString());      // '42'
    console.log((true).toString());    // 'true'
    console.log([1, 2, 3].toString()); // '1,2,3'
    
```
#### **Неявное строковое преобразование** 

1. **Операции слияния строк**
    
    - При использовании оператора `+` с строками и другими типами данных, JavaScript автоматически преобразует другие значения в строки.
        
```javascript
    console.log('The number is ' + 42);    // 'The number is 42' 
    console.log('Result: ' + true);        // 'Result: true' 
    console.log('Array: ' + [1, 2, 3]);   // 'Array: 1,2,3'`
```
  
2. **Шаблонные строки (Template Literals)**
    
    - При использовании шаблонных строк (внутри `` `${}` ``) значения автоматически преобразуются в строки.
        
```javascript
	let num = 42;
	let str = `The number is ${num}`;  // 'The number is 42'``
```

3. **При интерполяции и конкатенации**
    
    - При интерполяции в шаблонных строках и конкатенации с помощью `+`, значения автоматически приводятся к строкам.
        
        ```javascript
	let value = 123; 
	let result = 'Value is: ' + value;   // 'Value is: 123'
	console.log(result);`
```
        

