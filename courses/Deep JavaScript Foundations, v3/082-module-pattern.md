# Module pattern

Module pattern опирается на цепочку: lexical scope → closure → module. Без closure module pattern невозможен.

## Чем module НЕ является: namespace pattern

```js
var workshop = {
    teacher: "Kyle",
    ask(question) {
        console.log(this.teacher, question);
    }
};
```

- Это **namespace pattern**: набор функций и данных просто собран как свойства одного объекта.
- Это идиома (не синтаксическая фича языка), долго была распространённым способом группировки.
- **Это не module.** В нём всё **public**, нет сокрытия данных.

## Что делает module модулем: encapsulation

- **Encapsulation** (инкапсуляция) = сокрытие данных и поведения (data hiding / information hiding), контроль над видимостью.
- В module есть **public API** (публичное) и **private** (недоступное снаружи). Даже простое деление public/private — это уже инкапсуляция.
- Module = собрать поведение и данные + спрятать ненужное + открыть минимальный API.

## Классический (revealing) module pattern

Кодифицирован Doug Crockford около 2001 года. Реализует инкапсуляцию через **closure**.

```js
var workshop = (function Module(){
    var teacher = "Kyle";
    var publicAPI = {
        ask(question) {
            console.log(teacher, question);
        }
    };
    return publicAPI;
})();

workshop.ask("Is this a module?");
// workshop.teacher — недоступно (private)
```

Два компонента:

1. **Внешняя обёртывающая функция** — здесь **IIFE**. Запуск module как IIFE делает его, по сути, **singleton**: выполняется один раз. «Завершается» лишь условно — closure не даёт scope исчезнуть.
2. **Внутренняя функция** (`ask`), **closed over** переменную `teacher`. Объект `publicAPI` снаружи держит ссылку на эту функцию, поэтому внутренний scope не garbage collected — state сохраняется.

- `workshop.ask` доступно, `workshop.teacher` скрыто.
- Приватных функций может быть сотни — снаружи недоступны, но closure-функции могут к ним обращаться.

## Module хранит изменяющееся state

- **Важно:** closure здесь замыкается на переменные, **меняющие state со временем** — это и есть назначение module.
- Если у «модуля» нет изменяющегося state — это не module, а переинженеренный namespace.
- Действует **principle of least exposure** (least privilege): всё скрыто, открыт лишь минимально необходимый public API.

## Factory function

Module-singleton (через IIFE) — не единственный вариант. Обычная функция, вызываемая многократно, создаёт **новый instance** module при каждом вызове — это **factory function**.

```js
function WorkshopModule(){
    var teacher = "Kyle";
    var publicAPI = {
        ask(question) {
            console.log(teacher, question);
        }
    };
    return publicAPI;
}

var workshop = WorkshopModule();   // отдельный instance
```

- Каждый вызов даёт отдельный instance со своим state; instances не смешиваются.

## Значимость

- Module pattern — самый распространённый и, возможно, важнейший паттерн организации кода. Около 80–90% всего JavaScript использовал тот или иной механизм module pattern.
- Это **синтаксический хак / идиома**, а не первоклассная языковая поддержка модулей.

## Главное

- Namespace pattern лишь группирует данные/функции; module добавляет **encapsulation** (сокрытие, public/private).
- Классический module pattern реализует инкапсуляцию через **closure** над изменяющимся state.
- Module через IIFE = singleton; через factory function = много независимых instances со своим state.
- Принцип: открывать минимально необходимый public API (least exposure).
