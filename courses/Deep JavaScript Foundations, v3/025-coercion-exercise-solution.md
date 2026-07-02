# Решение упражнения: валидаторы с coercion

## `isValidName(name)`

Проверки: тип — строка; есть не-whitespace содержимое; его длина `>= 3`.

```js
function isValidName(name) {
    if (typeof name == "string" &&
        name.trim().length >= 3
    ) {
        return true;
    }
    return false;
}
```

- `typeof name == "string"` — используется **double equals**, т.к. `typeof` всегда возвращает непустую строку → corner cases исключены, можно `==`.
- `name.trim()` срезает whitespace с обеих сторон; затем проверяется `.length >= 3`.
- Условие можно упростить до `return (выражение)` без `if` — здесь `if/return true/false` оставлен для наглядности.

## `hoursAttended(attended, length)`

Шаги:

1. Если `attended` — непустая строка, привести к числу:

```js
if (typeof attended == "string" && attended.trim() != "") {
    attended = Number(attended);
}
```

- Проверка `trim() != ""` нужна, чтобы пустая/whitespace-строка **не** превратилась в `0` (это не то же, что введённый пользователем `0`) — важный corner case.
- `Number(attended)` — явное приведение. Здесь допустимо **переприсваивание переменной с новым типом**, т.к. тип меняется осознанно и с целью (в отличие от позиции сторонников static typing).

2. То же самое продублировать для `length`.

3. Проверить, что оба — числа (вход мог быть `null`/`undefined`, который не попал в clause выше и остался не-числом):

```js
if (typeof attended == "number" && typeof length == "number" &&
    attended >= 0 && length >= 0 &&
    Number.isInteger(attended) && Number.isInteger(length) &&
    attended <= length
) {
    return true;
}
return false;
```

- `typeof ... == "number"` для обоих — иначе bail out (`return false`). Передача `null` проваливает валидацию.
- `>= 0` — не отрицательные.
- `Number.isInteger(x)` (из MDN) — проверка на целое число (нет дробной части), отсекает `3.14`, `9.1`.
- `attended <= length` — финальное условие; на этом этапе мы уже знаем, что имеем well-formed числа (без `NaN`/`Infinity`), поэтому сравнение безопасно.

## Идея решения

- Сузив «поверхность» возможных типов (только string/number), мы свели проверку к прямому набору условий и убрали corner cases (массив с числом и т.п.).
- Реализаций множество (вместо `.length`/`trim` можно regular expression), но цель — работать с примитивами и coercion, не сваливаясь в corner cases.

## Главное

- `isValidName`: `typeof == "string"` + `name.trim().length >= 3`.
- `hoursAttended`: строки-аргументы приводятся `Number()` (с защитой от пустой строки → 0), затем проверки `typeof == "number"`, `>= 0`, `Number.isInteger`, `attended <= length`.
- Переприсваивание переменной новым типом оправдано при осознанной смене типа.
- Сужение допустимых типов устраняет большинство corner cases.
