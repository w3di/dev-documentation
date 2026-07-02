# Часть 11. Возврат функции из функции

## Код-gotcha

```js
function createFunction() {
  function multiplyBy2(num) { return num * 2; }
  return multiplyBy2;
}
const generatedFunc = createFunction();
const result = generatedFunc(3); // 6
```

- Эта возможность (функция возвращает функцию) есть в JavaScript, но недоступна во многих других языках — отсюда «подвох» (**gotcha**), требующий точности.

## Разбор выполнения

1. В global memory сохраняется `createFunction` (как текст кода). На call stack — `global`.
2. Объявляется `generatedFunc` (uninitialized) — нужно выполнить `createFunction()` (по `()`); создаётся execution context, добавляется на call stack.
3. Внутри local memory объявляется `multiplyBy2` (сохраняется определение, не выполняется).
4. `return multiplyBy2` — возвращается **значение метки**: само определение функции (код `num => num * 2`), без имени. Внутренние метки забываются.
5. Вызов `createFunction()` evaluates в это возвращённое определение; оно присваивается `generatedFunc`. Контекст `createFunction` pop-ается, всё внутри забывается.
6. `generatedFunc(3)`: создаётся execution context. Параметр (`num`, найденный в определении) ← `3`; возвращается `6` в `result`.

## Ключевая идея: связи с createFunction нет

- Кажется, что при вызове `generatedFunc` есть «связь обратно» к `createFunction`. Это иллюзия.
- `generatedFunc` — это **результат однократного запуска** `createFunction`, а именно сохранённое определение функции (FKA — formerly known as — `multiplyBy2`). Больше `generatedFunc` ничего не знает о `createFunction`.
- Человек при чтении кода вынужден «прыгать» вверх по странице (`generatedFunc` → output of `createFunction` → внутрь `createFunction`), и это создаёт ложное ощущение связи. JavaScript так не делает: `createFunction` отработал один раз, был снят со стека.
- Строка `generatedFunc = createFunction()` — это «сделай работу один раз», а **не** «всякий раз, встретив `generatedFunc`, запускай `createFunction`».
- Понимание того, что этой связи нет, — ключ к пониманию closure под капотом. [Тема продолжается.]

## Зачем так делать

- Зачем оборачивать функцию в другую функцию только чтобы вернуть её? Ответ — в механизме closure. [Тема продолжается в следующих частях.]

## Главное

- В JavaScript функцию можно вернуть из функции (недоступно во многих языках).
- `return multiplyBy2` отдаёт само определение функции (значение), теряя имя.
- `generatedFunc` — лишь результат однократного запуска `createFunction`; постоянной связи с ней нет.
- Запуск `generatedFunc(3)` — это запуск функции, «рождённой» как `multiplyBy2`, без обращения к `createFunction`.
