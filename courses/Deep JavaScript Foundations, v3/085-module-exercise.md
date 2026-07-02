# Упражнение: module pattern

## Задача

Отрефакторить код, управляющий записями о зачислении на воркшоп (enrollment records), переписав его в виде **классического (revealing) module pattern**. Функциональность не меняется — меняется организация кода. Бонус: после основной версии переписать через ES6 module syntax.

Исходный файл (`.js`): функции внизу, в основном разнесены и hoisted. Нужно отформатировать файл как module.

## Инструкции

1. Определить **module factory function** `defineWorkshop`, которая создаёт и возвращает объект-instance (public API).
2. Открыть в public API **пять методов** и определить их:
   - `addStudent`
   - `enrollStudent`
   - `printCurrentEnrollment`
   - `enrollPaidStudents`
   - `remindUnpaidStudents`
3. Перенести массивы `currentEnrollment` и `studentRecords` внутрь module, но сделать их **пустыми** массивами (не хардкодить данные внутри module).
4. Данные подавать снаружи через вызовы `addStudent` и `enrollStudent` (`push` в массивы), а не присваиванием.
5. Создать instance: `var deepJS = defineWorkshop();`.
6. Многократно вызвать `deepJS.addStudent(...)` и `deepJS.enrollStudent(...)`.
7. Заменить обращения к остальным исполняемым функциям их аналогами из API `deepJS`.

## Смысл

- Преимущество module pattern — **сокрытие деталей**, которые не нужно показывать.
- Снаружи не должно быть известно, что зачисления и записи студентов хранятся в массивах — это **implementation detail**.
- Сокрытие позволяет рефакторить в будущем и защищает от злоупотреблений.

## Главное

- Обернуть функции в module factory function `defineWorkshop`, возвращающую public API из пяти методов.
- Массивы `currentEnrollment` и `studentRecords` спрятать внутри module (пустыми), данные подавать через API.
- Цель — спрятать implementation detail и открыть только необходимое.
