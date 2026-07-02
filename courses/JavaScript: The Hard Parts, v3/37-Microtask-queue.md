# Часть 37. Microtask queue

## Продолжение выполнения синхронного кода
- После настройки фоновой работы и привязки `display` через `then` синхронный поток доходит до вызова `blockFor300ms`.
- Это обычная функция: создаётся новый **execution context** (контекст выполнения), функция кладётся на **call stack**.
- Внутри код выполняется ~300 мс через цикл (множество мелких шагов) — единственный способ заблокировать поток.

## printHello ждёт
- `printHello` (поставленный в **callback queue** на 0 мс) НЕ был допущен на call stack до запуска `blockFor300ms`.
- **event loop** говорит «нет»: есть ещё синхронный глобальный код, а затем на call stack находится `blockFor300ms`.

## Ответ от сервера приходит во время блокировки
- Примерно на 270 мс из TikTok возвращаются данные ответа.
- На практике их нужно распарсить (JSON parsing), чтобы извлечь нужное, не считая заголовков (headers); здесь упрощённо.
- Полученные данные — строка `"cute puppy"` (имя последнего видео).
- В этот момент (всё ещё внутри `blockFor300ms`) `futureData.value` обновляется значением `"cute puppy"`.

## Куда попадает display
- Так как `value` обновлено, функция `display` готова к запуску, но call stack ещё занят `blockFor300ms`.
- Интуитивно кажется, что `display` встанет в callback queue за `printHello` — это неверно.

## Завершение блокировки и порядок выполнения
1. На ~302 мс `blockFor300ms` завершается и снимается (pop) с call stack.
2. Следующая задача — НЕ из очереди: выполняется синхронный `console.log("me first")`, который шёл в глобальном коде. В консоли появляется `me first` (~302 мс).
3. На ~303 мс ожидается, что наконец выполнится `printHello` (ждавший с 0 мс) — но первым на call stack попадает `display` с входом `"cute puppy"`.

## Microtask queue — вторая очередь
- callback queue (также task queue) — лишь одна из двух важных очередей в браузере.
- Вторая — **microtask queue** (очередь микрозадач).
- В microtask queue попадают все функции, отложенные через привязку к **Promise object** (через `.then`/`.catch`). Они никогда не идут в callback queue.
- `display` попала именно в microtask queue в момент обновления данных (~270 мс).

## Приоритет microtask queue
- event loop всегда сначала проверяет microtask queue, и только потом callback queue.
- Когда глобальный код завершился (после `console.log("me first")` на ~303 мс), event loop не пошёл в callback queue, где `printHello` ждал с 0 мс, а взял `display` из microtask queue.
- `display` поставлена на call stack, ей автоматически передан аргумент `"cute puppy"`:
  - JavaScript сам добавил скобки и вставил данные в параметр `data` (мы скобки не писали при передаче в `then`).
  - В локальной памяти `data` = `"cute puppy"`, выполняется `console.log(data)` → на ~303 мс в консоли `cute puppy`.
- После выполнения `display` снимается с call stack и больше нет в microtask queue.

## Наконец printHello
- На ~304 мс event loop проверяет callback queue и берёт `printHello`.
- `printHello` ставится на call stack и выполняется — в консоли `hello` (~304 мс), хотя был запланирован на 0 мс.

## Главное
- В браузере две очереди: callback queue (для callback из `setTimeout` и т.п.) и microtask queue (для функций, отложенных через Promise).
- event loop проверяет каждый раз, завершён ли глобальный код и пуст ли call stack, и СНАЧАЛА обслуживает microtask queue, затем callback queue.
- Поэтому `display` (через `.then`) выполнилась раньше `printHello` (через `setTimeout(…, 0)`), несмотря на то что `printHello` был поставлен в очередь намного раньше.
