# Function Expressions vs Function Declarations

## Два способа задать функцию

```js
function teacher() { /* ... */ }            // 1  function declaration

var myTeacher = function anotherTeacher() { // 3  function expression
    console.log(anotherTeacher);            // 4
};

console.log(anotherTeacher);                // 9  ReferenceError
```

## Function declaration (строка 1)

- **function declaration** — слово `function` стоит первым в выражении.
- Идентификатор (`teacher`) добавляется как шарик в **enclosing scope** (окружающий) → красный шарик в глобальном scope.

## Function expression (строка 3)

- **function expression** — функция не является declaration (присвоена переменной, стоит после оператора/скобок и т.п.).
- `myTeacher` → красный шарик (объявление переменной в глобальном scope).
- Сама функция создаёт синий scope.
- **Ключевое отличие:** имя функции-выражения (`anotherTeacher`) становится шариком НЕ во внешнем scope, а в **собственном scope функции** → синий шарик.

## Следствия

- На строке 4 можно обращаться к `anotherTeacher` — синий шарик существует внутри функции.
- На строке 9 (глобальный scope) `anotherTeacher` нет → ReferenceError.
- Дополнительный нюанс: имя function expression в своём scope **read-only** (только для чтения) — нельзя переприсвоить `anotherTeacher` внутри функции.

## Анонимные vs именованные

- **anonymous function expression** — function expression без имени (наиболее частый случай).
- **named function expression** — function expression с именем.
- Лектор делает категоричное утверждение (100%, без исключений): следует всегда предпочитать **named function expression** анонимному.

## Главное

- Function declaration кладёт своё имя-шарик в окружающий scope; function expression — в свой собственный scope.
- Имя function expression доступно только внутри самой функции и является read-only; снаружи — ReferenceError.
- Всегда предпочитайте named function expression анонимному.
