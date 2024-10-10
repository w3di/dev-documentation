Temporal Dead Zone (TDZ) — это область блока, в которой переменная недоступна до момента ее инициализации.

JavaScript выдаст `ReferenceError`, если попытаться получить доступ к переменной до ее инициализации. 

### TDZ применима к следующим конструкциям:
1. **`let`**
2. **`const`**
3. **`class`**


Example:
```js
{
  // bestFood’s TDZ starts here (at the beginning of this block’s local scope)
  // bestFood’s TDZ continues here
  // bestFood’s TDZ continues here
  // bestFood’s TDZ continues here
  console.log(bestFood); // returns ReferenceError because bestFood’s TDZ continues here
  // bestFood’s TDZ continues here
  // bestFood’s TDZ continues here
  let bestFood = "Vegetable Fried Rice"; // bestFood’s TDZ ends here
  // bestFood’s TDZ does not exist here
  // bestFood’s TDZ does not exist here
  // bestFood’s TDZ does not exist here
}
```