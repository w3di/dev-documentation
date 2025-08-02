
Логическое преобразование в JavaScript преобразует значение в логическое значение (`true` или `false`). Это преобразование может быть выполнено явным образом с помощью функций или неявно в условиях. 

## Явное логическое преобразование 

1. **Функция `Boolean()`**
   
```js
console.log(Boolean(0)); // false
console.log(Boolean('non-empty')); // true
console.log(Boolean(null)); // false 
console.log(Boolean({})); // true
console.log(Boolean([])); // true
``` 

2. **Двойное отрицание (`!!`)
   
```js
console.log(!!0); // false
console.log(!!'text'); // true 
console.log(!!null); // false
console.log(!!{}); // true 
console.log(!![]); // true
```

## Неявное логическое преобразование

Логическое преобразование также происходит автоматически в условиях, где требуется булев тип. Это часто встречается в условных операторах, таких как `if`, `while`, и в логических операциях.

### Значения, приводимые к `false` (falsy values):

- `0`
    
- `null`
    
- `undefined`
    
- `NaN`
    
- `""` 

### В остальных случаях всегда true