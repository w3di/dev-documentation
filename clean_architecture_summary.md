# Clean Architecture — полный учебный конспект

> Этот конспект не пересказывает книгу — он **учит** Clean Architecture. Здесь есть то, чего нет у дяди Боба: реальный код на JS, связи между концепциями, типичные ошибки, «когда НЕ применять», практические задания и современный контекст.

---

## Карта концепций — как всё связано

Прежде чем нырять в детали, пойми общую картину. Все идеи книги — это ответы на **один вопрос**: как сделать так, чтобы изменение в одном месте не ломало другое?

```
                    ┌──────────────┐
                    │  ЦЕЛЬ: код   │
                    │  легко менять │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────────┐
        │ Внутри   │ │ Между    │ │ На уровне    │
        │ модуля   │ │ модулями │ │ всей системы │
        │          │ │          │ │              │
        │  SOLID   │ │Component │ │    Clean     │
        │          │ │Principles│ │Architecture  │
        └──────────┘ └──────────┘ └──────────────┘
         S,O,L,I,D   REP,CCP,CRP  Dependency Rule
                      ADP,SDP,SAP  Layers, Boundaries
```

**SOLID** — как писать отдельные модули/классы.
**Component Principles** — как группировать модули и управлять связями.
**Clean Architecture** — как организовать всю систему.

Каждый уровень опирается на предыдущий. Без SOLID нет смысла в компонентах. Без компонентов не построить архитектуру.

---

## Часть I. Зачем вообще нужна архитектура?

### Главы 1–2. Две ценности софта

У любой программы есть две ценности:

| | Поведение | Структура |
|---|---|---|
| **Что это** | Программа делает то, что нужно | Программу легко изменить |
| **Кто требует** | Бизнес, пользователи | Разработчики (должны отстаивать) |
| **Характер** | Срочное | Важное |
| **Что если забить** | Баги, но можно починить | Проект умирает медленно |

**Почему структура важнее поведения:**

Представь два проекта:
- **Проект A**: работает идеально, но код — монолитная лапша на 50 000 строк. Добавить фичу = 3 месяца.
- **Проект B**: есть баги, но чистая структура. Добавить фичу = 2 дня. Починить баг = 1 день.

Проект B победит. Проект A умрёт под собственным весом.

**Ловушка «потом приберёмся»:**

```js
// Неделя 1: "Временно, потом перепишем"
function processOrder(order) {
  // 200 строк всего подряд: валидация, расчёт, отправка, логирование
}

// Неделя 10: "Временно" осталось, обросло костылями
function processOrder(order) {
  // 800 строк. Никто не понимает. Все боятся трогать.
  // 47 if-else. 12 try-catch. 3 TODO: refactor
}
```

«Потом» не наступает **никогда**. Единственный способ идти быстро — идти хорошо с самого начала.

> **Практика**: Открой свой текущий проект. Найди самый длинный файл. Сколько «причин для изменения» у него есть? Если больше двух — ты в ловушке.

---

## Часть II. Три парадигмы

### Главы 3–6. Structured, OOP, FP

Каждая парадигма **не даёт** новых возможностей — она **отнимает**:

| Парадигма | Запрещает | Зачем | Что это даёт архитектуре |
|---|---|---|---|
| **Structured** | `goto` | Предсказуемый поток выполнения | Functional Decomposition |
| **OOP** | Прямые указатели на функции | Безопасный polymorphism | **Dependency Inversion** |
| **Functional** | Изменение переменных | Нет проблем с параллелизмом | Безопасность данных |

#### Почему OOP — фундамент архитектуры

Ключевая суперсила OOP — **не** encapsulation и **не** inheritance. Это **polymorphism**, который позволяет инвертировать зависимости.

```js
// БЕЗ polymorphism — жёсткая связь:
const { readFromDatabase } = require('./mysql')  // ← прибит к MySQL
const { sendEmail } = require('./smtp')          // ← прибит к SMTP

function createOrder(data) {
  const order = readFromDatabase(data.id)
  sendEmail(order.customerEmail, 'Заказ создан')
}
// Чтобы протестировать — нужны реальные MySQL и SMTP-сервер!
```

```js
// С polymorphism — зависимость инвертирована:
function createOrder(data, { orderRepo, notifier }) {
  const order = orderRepo.findById(data.id)     // ← interface
  notifier.send(order.customerEmail, 'Заказ создан') // ← interface
}

// В проде:
createOrder(data, { orderRepo: mysqlRepo, notifier: smtpNotifier })

// В тесте:
createOrder(data, { orderRepo: fakeRepo, notifier: fakeNotifier })
// Никаких БД и почтовых серверов!
```

**Что произошло**: `createOrder` больше не зависит от MySQL и SMTP. MySQL и SMTP зависят от **interface**, который определяет `createOrder`. Зависимость **инвертирована**.

```
// Было:    createOrder → MySQL
//          createOrder → SMTP
//
// Стало:   createOrder → <<interface>>
//                              ↑
//                        MySQL, SMTP (plugins)
```

> **Это фундамент всей книги.** Через polymorphism можно развернуть **любую** зависимость и сделать детали (БД, UI, почту) plugins к бизнес-логике.

#### Что взять из Functional Programming

**Immutability** убирает целый класс багов:

```js
// ПЛОХО: mutation → баги в многопоточности и непредсказуемое поведение
function applyDiscount(order) {
  order.total *= 0.9  // изменили оригинал!
  return order
}

const order = { total: 100 }
applyDiscount(order)
console.log(order.total) // 90 — оригинал изменён! Сюрприз для вызывающего кода.
```

```js
// ХОРОШО: новый объект → предсказуемость
function applyDiscount(order) {
  return { ...order, total: order.total * 0.9 }  // новый объект
}

const order = { total: 100 }
const discounted = applyDiscount(order)
console.log(order.total)      // 100 — оригинал не тронут
console.log(discounted.total) // 90
```

**Практический подход**: не нужно делать 100% кода immutable. Выдели изменяемое состояние в отдельный «остров» и защити его. Весь остальной код — pure functions.

**Event Sourcing** — радикальная immutability:
```js
// Вместо хранения текущего баланса:
// { balance: 150 }

// Храним историю событий:
const events = [
  { type: 'deposit',  amount: 200, date: '2026-01-15' },
  { type: 'withdraw', amount: 50,  date: '2026-01-20' },
]

// Баланс вычисляется:
const balance = events.reduce((sum, e) =>
  e.type === 'deposit' ? sum + e.amount : sum - e.amount, 0
) // 150

// Нет UPDATE, нет DELETE — только INSERT и SELECT.
// Git работает именно так.
```

---

## Часть III. SOLID — принципы внутри модуля

### Как SOLID связаны между собой

```
SRP → "разделяй по причинам изменений"
OCP → "расширяй, не изменяя"
LSP → "подтипы не должны ломать контракт"
ISP → "не зависи от лишнего"
DIP → "зависи от абстракций"

SRP говорит ЧТО разделять.
OCP говорит КАК расширять.
LSP говорит КАК наследовать/реализовывать.
ISP говорит от ЧЕГО не зависеть.
DIP говорит В КАКУЮ СТОРОНУ зависеть.
```

---

### SRP — Single Responsibility Principle

> **Модуль должен иметь одну и только одну причину для изменения — одного актора.**

**Это НЕ «функция должна делать одну вещь».** Это про то, **кто** является источником изменений.

```js
// ❌ НАРУШЕНИЕ SRP: три актора — три причины менять один файл

class Employee {
  calculatePay()   { /* логика для БУХГАЛТЕРИИ    — CFO */ }
  reportHours()    { /* логика для HR-ОТДЕЛА       — COO */ }
  save()           { /* логика для АДМИНИСТРАТОРА БД — CTO */ }

  // Общий метод — бомба замедленного действия:
  _regularHours() {
    // Используется и в calculatePay(), и в reportHours()
    // Бухгалтерия просит изменить расчёт → HR-отчёты ломаются
  }
}
```

**Что именно пойдёт не так**: бухгалтерия (CFO) просит изменить `_regularHours()`. Разработчик меняет. `calculatePay()` работает правильно. Но `reportHours()` тоже использовал `_regularHours()` — и HR-отчёты теперь **врут**. Никто не заметит, пока HR не обнаружит расхождение через полгода.

```js
// ✅ РЕШЕНИЕ: разделить по актёрам

// Чистые данные — без логики
class EmployeeData {
  constructor(name, hoursWorked, rate) {
    this.name = name
    this.hoursWorked = hoursWorked
    this.rate = rate
  }
}

// Для бухгалтерии (CFO)
class PayCalculator {
  calculate(employee) {
    return employee.hoursWorked * employee.rate
  }
}

// Для HR (COO)
class HourReporter {
  report(employee) {
    return { name: employee.name, hours: employee.hoursWorked }
  }
}

// Для DBA (CTO)
class EmployeeRepository {
  save(employee) { /* ... */ }
}

// Если нужен единый facade:
class EmployeeFacade {
  constructor(calculator, reporter, repo) {
    this.calculator = calculator
    this.reporter = reporter
    this.repo = repo
  }
  calculatePay(emp) { return this.calculator.calculate(emp) }
  reportHours(emp)  { return this.reporter.report(emp) }
  save(emp)         { return this.repo.save(emp) }
}
```

Теперь изменение для бухгалтерии затрагивает **только** `PayCalculator`. HR-отчёты в безопасности.

**Как распознать нарушение SRP — code smells:**
- Класс/файл > 300 строк
- В описании класса есть слово «и» («управляет заказами **и** отправляет уведомления **и** генерирует отчёты»)
- Изменения от разных людей/команд часто конфликтуют в одном файле
- Метод используется из разных контекстов с разными ожиданиями

**Когда НЕ применять:**
- Маленький проект с одним разработчиком — разделение на 10 файлов создаст лишнюю навигацию без пользы
- Прототип/MVP — сначала пойми предметную область, потом разделяй

> **Задание**: Возьми самый большой класс в своём проекте. Выпиши все его методы. Сгруппируй: какие методы нужны одним и тем же людям? Каждая группа — кандидат на отдельный класс.

---

### OCP — Open/Closed Principle

> **Расширяй поведение, не изменяя существующий код.**

```js
// ❌ НАРУШЕНИЕ OCP: каждый новый формат = изменение существующей функции

function generateReport(data, format) {
  if (format === 'html') {
    return `<h1>${data.title}</h1><p>${data.body}</p>`
  } else if (format === 'json') {
    return JSON.stringify(data)
  } else if (format === 'pdf') {
    // Добавили через месяц — ИЗМЕНИЛИ существующую функцию
    return generatePdf(data)
  } else if (format === 'csv') {
    // Добавили через два месяца — ОПЯТЬ изменили
    return toCsv(data)
  }
  // Каждый новый формат — лезем в эту функцию,
  // рискуя сломать уже работающие форматы
}
```

```js
// ✅ РЕШЕНИЕ: новый формат = новый файл, старый код не трогаем

// Общий контракт
// (в JS нет interfaces, но мы описываем контракт через JSDoc или просто соглашение)
// Каждый formatter должен иметь метод format(data) → string

const htmlFormatter = {
  format: (data) => `<h1>${data.title}</h1><p>${data.body}</p>`
}

const jsonFormatter = {
  format: (data) => JSON.stringify(data)
}

// Через месяц — ДОБАВЛЯЕМ файл, ничего не меняем:
const pdfFormatter = {
  format: (data) => generatePdf(data)
}

// Генератор отчётов ЗАКРЫТ для модификации:
function generateReport(data, formatter) {
  return formatter.format(data)
}

// Использование:
generateReport(data, htmlFormatter)
generateReport(data, pdfFormatter)  // расширение без модификации
```

**Механизм OCP — направление зависимостей:**

Компонент A **защищён** от изменений в B, если B зависит от A.

```
// Что мы хотим защитить больше всего? Бизнес-правила.
// Что меняется чаще всего? UI и детали.
//
// Значит:
//   UI → Бизнес-правила  (UI зависит от бизнес-правил)
//   БД → Бизнес-правила  (БД зависит от бизнес-правил)
//
// Бизнес-правила не знают ни про UI, ни про БД.
// Изменение UI не трогает бизнес-правила. OCP соблюдён.
```

**Когда НЕ применять:**
- Если ты **уверен**, что формат/вариант будет только один — не делай абстракцию заранее. Добавишь, когда появится второй случай (Rule of Three).

---

### LSP — Liskov Substitution Principle

> **Если код работает с типом T, он должен так же работать с любым подтипом S, не зная об этом.**

```js
// ❌ НАРУШЕНИЕ LSP: Квадрат «врёт», что он прямоугольник

class Rectangle {
  constructor(w, h) { this.width = w; this.height = h }
  setWidth(w)  { this.width = w }
  setHeight(h) { this.height = h }
  area()       { return this.width * this.height }
}

class Square extends Rectangle {
  setWidth(w)  { this.width = w; this.height = w }  // сюрприз!
  setHeight(h) { this.width = h; this.height = h }  // сюрприз!
}

// Код, который работает с Rectangle:
function doubleWidth(rect) {
  const oldHeight = rect.height
  rect.setWidth(rect.width * 2)
  // Ожидаем: высота не изменилась
  console.assert(rect.height === oldHeight) // ❌ ЛОМАЕТСЯ для Square!
}
```

**Почему это больно в реальной жизни:**

```js
// ❌ НАРУШЕНИЕ LSP на уровне API:
// Два платёжных gateway с «одинаковым» interface

const stripeGateway = {
  charge(amount, currency) {
    // Возвращает { success: true, transactionId: '...' }
    return { success: true, transactionId: 'txn_123' }
  }
}

const paypalGateway = {
  charge(amount, currency) {
    // Возвращает { ok: true, id: '...' } — ДРУГОЙ формат!
    return { ok: true, id: 'PAY-456' }
  }
}

// Код бизнес-логики:
function processPayment(gateway, amount) {
  const result = gateway.charge(amount, 'USD')
  if (result.success) {          // ← для PayPal это undefined!
    saveTransaction(result.transactionId) // ← для PayPal это undefined!
  }
}
```

```js
// ✅ РЕШЕНИЕ: adapter приводит PayPal к общему контракту

function createPaypalAdapter(paypal) {
  return {
    charge(amount, currency) {
      const result = paypal.charge(amount, currency)
      return {
        success: result.ok,
        transactionId: result.id
      }
    }
  }
}

// Теперь оба gateway — взаимозаменяемы:
processPayment(stripeGateway, 100)
processPayment(createPaypalAdapter(paypalGateway), 100)
```

**Как распознать нарушение LSP:**
- Код проверяет `instanceof` или `typeof` перед вызовом метода
- Есть `if (type === 'special')` внутри общей логики
- Документация говорит: «Работает для всех, кроме...»

---

### ISP — Interface Segregation Principle

> **Не заставляй клиента зависеть от методов, которые он не использует.**

```js
// ❌ НАРУШЕНИЕ ISP: «толстый» модуль, от которого зависят все

// user-service.js — 2000 строк, 30 функций
module.exports = {
  createUser,
  deleteUser,
  updateUser,
  getUserById,
  listUsers,
  authenticateUser,
  resetPassword,
  sendVerificationEmail,
  generateReport,
  exportToCSV,
  importFromCSV,
  // ... ещё 20 функций
}

// Модуль аутентификации импортирует ВЕСЬ user-service ради одной функции:
const userService = require('./user-service')  // ← зависит от ВСЕГО

function login(email, password) {
  return userService.authenticateUser(email, password)
  // Но если кто-то изменит exportToCSV и всё сломается при сборке,
  // модуль аутентификации тоже пострадает — хотя он CSV вообще не использует
}
```

```js
// ✅ РЕШЕНИЕ: тонкие, специализированные модули

// auth.js — только аутентификация
module.exports = { authenticateUser, resetPassword }

// user-crud.js — только CRUD
module.exports = { createUser, getUserById, updateUser, deleteUser }

// user-reports.js — только отчёты
module.exports = { generateReport, exportToCSV, importFromCSV }

// Теперь модуль логина зависит только от auth.js:
const { authenticateUser } = require('./auth')
// Изменение CSV-экспорта его не затронет.
```

**ISP на архитектурном уровне — самое важное:**

Твой сервис зависит от npm-пакета на 50 МБ ради одной функции → обновление пакета (с breaking change в функции, которую ты не используешь) ломает твою сборку. Это нарушение ISP на уровне системы.

---

### DIP — Dependency Inversion Principle

> **High-level модули не должны зависеть от low-level модулей. Оба должны зависеть от абстракций.**

Это **самый важный** принцип для архитектуры. Без него невозможны ни Clean Architecture, ни тестируемость.

```js
// ❌ НАРУШЕНИЕ DIP: бизнес-логика зависит от конкретной БД

const mysql = require('mysql2')

class OrderService {
  async createOrder(orderData) {
    const connection = await mysql.createConnection({ /* ... */ })
    await connection.execute(
      'INSERT INTO orders (customer_id, total) VALUES (?, ?)',
      [orderData.customerId, orderData.total]
    )
    // Бизнес-логика ПРИБИТА к MySQL.
    // Тестировать? Нужен реальный MySQL.
    // Перейти на PostgreSQL? Переписать весь сервис.
  }
}
```

```js
// ✅ РЕШЕНИЕ: бизнес-логика зависит от абстракции

// Бизнес-логика определяет, ЧТО ей нужно (контракт):
class OrderService {
  constructor(orderRepository, notifier) {
    this.orderRepo = orderRepository
    this.notifier = notifier
  }

  async createOrder(orderData) {
    const order = { ...orderData, status: 'created', createdAt: new Date() }

    // Бизнес-правило: заказ от 10000 требует подтверждения
    if (order.total > 10000) {
      order.status = 'pending_approval'
    }

    await this.orderRepo.save(order)
    await this.notifier.send(order.customerId, `Заказ ${order.status}`)

    return order
  }
}

// Реализация для прода:
class MySQLOrderRepository {
  async save(order) { /* INSERT INTO orders ... */ }
}

class EmailNotifier {
  async send(userId, message) { /* nodemailer.sendMail(...) */ }
}

// Реализация для тестов:
class FakeOrderRepository {
  constructor() { this.orders = [] }
  async save(order) { this.orders.push(order) }
}

class FakeNotifier {
  constructor() { this.messages = [] }
  async send(userId, msg) { this.messages.push({ userId, msg }) }
}

// Прод:
const service = new OrderService(new MySQLOrderRepository(), new EmailNotifier())

// Тест — без БД, без почтового сервера, мгновенно:
const fakeRepo = new FakeOrderRepository()
const fakeNotifier = new FakeNotifier()
const service = new OrderService(fakeRepo, fakeNotifier)

await service.createOrder({ customerId: 1, total: 15000 })
assert(fakeRepo.orders[0].status === 'pending_approval')
assert(fakeNotifier.messages[0].msg.includes('pending_approval'))
```

**Что произошло с зависимостями:**
```
// Было:
//   OrderService → MySQL        (high-level → low-level)
//   OrderService → nodemailer   (high-level → low-level)
//
// Стало:
//   OrderService → <<orderRepo interface>>  ← MySQLOrderRepository
//   OrderService → <<notifier interface>>   ← EmailNotifier
//
// OrderService больше не знает о MySQL и nodemailer.
// MySQL и nodemailer стали PLUGINS.
```

**Правило DIP в одном предложении**: бизнес-логика определяет interfaces, детали их реализуют.

---

### Связь SOLID с реальной практикой

| Принцип | Code Smell | Как починить |
|---|---|---|
| **SRP** | Один файл меняется из-за разных фич/команд | Разделить по актёрам |
| **OCP** | `if/else`-цепочка растёт при каждой новой фиче | Polymorphism, Strategy pattern |
| **LSP** | `instanceof`-проверки, «работает для всех кроме...» | Adapters, правильные абстракции |
| **ISP** | Импорт огромного модуля ради одной функции | Разбить на тонкие модули |
| **DIP** | `require('mysql')` внутри бизнес-логики | Dependency Injection |

> **Задание**: Возьми один из своих проектов. Найди хотя бы одно нарушение каждого принципа SOLID. Исправь. Почувствуй разницу.

---

## Часть IV. Component Principles

### Главы 12–13. Что объединять в компонент

**Компонент** = единица deployment. В JS-мире: npm-пакет, или директория с `index.js`, или отдельный микросервис.

Три принципа определяют **что положить внутрь**:

**REP (Reuse/Release Equivalence Principle):**
Классы в компоненте должны **иметь смысл вместе**. Нельзя засунуть `DateFormatter`, `ImageResizer` и `PaymentGateway` в один npm-пакет — они не связаны.

**CCP (Common Closure Principle) — SRP для компонентов:**
Классы, которые **меняются вместе**, живут вместе.

```
// Добавление нового типа платежа затрагивает:
//   - PaymentProcessor (бизнес-логика)
//   - PaymentValidator (валидация)
//   - PaymentDTO (структура данных)
//
// → Эти три файла должны быть в одном компоненте.
//   Одно изменение = один компонент затронут.
```

**CRP (Common Reuse Principle) — ISP для компонентов:**
Не заставляй пользователя зависеть от того, что он не использует.

```
// ❌ ПЛОХО: один пакет `utils` на 50 функций
//    Подключил ради formatDate() — получил зависимость от sharp, nodemailer, puppeteer
//
// ✅ ХОРОШО: отдельные пакеты
//    @mylib/date-utils (только даты, 0 зависимостей)
//    @mylib/image-utils (только картинки, зависит от sharp)
//    @mylib/email-utils (только почта, зависит от nodemailer)
```

**Три принципа тянут в разные стороны:**

На старте проекта → **CCP важнее** (скорость разработки, всё в одном месте).
На зрелом проекте → **CRP важнее** (минимизация зависимостей, переиспользование).

---

### Глава 14. Как организовать связи между компонентами

#### ADP — Acyclic Dependencies Principle

```
// ❌ ЦИКЛ: A → B → C → A
//
// Проблема: чтобы собрать A, нужен B.
//           Чтобы собрать B, нужен C.
//           Чтобы собрать C, нужен A. ← Замкнутый круг!
//
// На практике: изменение в A может неожиданно сломать C
// через цепочку A → B → C → A. Всё связано со всем.
```

**Как разорвать цикл:**

```
// Способ 1: DIP — инвертировать одну зависимость
//
// Было:    C → A
// Стало:   C → <<Interface>> ← A
// Цикл разорван: C зависит от interface, A его реализует

// Способ 2: выделить общий компонент D
//
// Было:    C → A
// Стало:   C → D ← A
// Общий код вынесен в D
```

#### SDP — Stable Dependencies Principle

**Stability** = сколько компонентов зависят от тебя. Чем больше — тем труднее измениться.

```
// Компонент "utils" — от него зависят 20 модулей.
// Stability высокая. Менять его страшно.
//
// Компонент "admin-dashboard" — от него не зависит никто.
// Stability низкая. Можно менять свободно.
//
// ПРАВИЛО: admin-dashboard может зависеть от utils.
//          utils НЕ должен зависеть от admin-dashboard.
//          (иначе нестабильный компонент станет трудно менять)
```

#### SAP — Stable Abstractions Principle

Stable компонент трудно менять. Как его расширять? Через абстракции.

```js
// Stable компонент (от него зависят 20 модулей)
// Если он КОНКРЕТНЫЙ — это "Zone of Pain":
module.exports = {
  calculateTax(amount) { return amount * 0.20 }  // Захардкожено 20%
}
// Изменить ставку = сломать 20 модулей.

// Если он АБСТРАКТНЫЙ — расширяем без изменений:
module.exports = {
  createTaxCalculator(rate) {
    return { calculate: (amount) => amount * rate }
  }
}
// 20 модулей используют разные ставки. Новая ставка = новый вызов, 0 изменений.
```

---

## Часть V. Clean Architecture

### Главы 15–22. Всё вместе

#### Dependency Rule — САМОЕ ВАЖНОЕ ПРАВИЛО КНИГИ

```
┌──────────────────────────────────────────────────────┐
│             Frameworks & Drivers                      │
│   Express, React, PostgreSQL, Redis, nodemailer       │
│  ┌────────────────────────────────────────────────┐  │
│  │           Interface Adapters                    │  │
│  │   Controllers, Presenters, Gateways, Repos     │  │
│  │  ┌──────────────────────────────────────────┐  │  │
│  │  │            Use Cases                     │  │  │
│  │  │   CreateOrder, CancelOrder, GetReport    │  │  │
│  │  │  ┌────────────────────────────────────┐  │  │  │
│  │  │  │           Entities                  │  │  │  │
│  │  │  │   Order, Customer, Product          │  │  │  │
│  │  │  │   (чистые бизнес-правила)           │  │  │  │
│  │  │  └────────────────────────────────────┘  │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘

     Зависимости → → → ТОЛЬКО ВНУТРЬ → → →
```

> **Зависимости в source code направлены ТОЛЬКО ВНУТРЬ.** Внутренние круги ничего не знают о внешних. Entity `Order` не знает, что существует Express. Use Case `CreateOrder` не знает, что данные хранятся в PostgreSQL.

#### Полный пример на JS: интернет-магазин

```
project/
├── entities/           ← Круг 1: чистые бизнес-правила
│   └── Order.js
├── use-cases/          ← Круг 2: прикладная бизнес-логика
│   └── CreateOrder.js
├── adapters/           ← Круг 3: interface adapters
│   ├── OrderController.js
│   └── OrderPresenter.js
├── infrastructure/     ← Круг 4: frameworks и детали
│   ├── PostgresOrderRepo.js
│   ├── StripePayment.js
│   └── ExpressServer.js
└── main.js             ← Entry point: собирает всё вместе
```

**Круг 1 — Entities (не знают НИЧЕГО о внешнем мире):**

```js
// entities/Order.js
// Чистый бизнес-объект. Ни одного require/import внешних пакетов.

class Order {
  constructor({ customerId, items }) {
    this.customerId = customerId
    this.items = items
    this.status = 'new'
    this.createdAt = new Date()
  }

  get total() {
    return this.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  }

  // Бизнес-правило: заказ > 50000 требует одобрения
  needsApproval() {
    return this.total > 50000
  }

  approve() {
    if (this.status !== 'pending_approval')
      throw new Error('Нельзя одобрить заказ в статусе ' + this.status)
    this.status = 'approved'
  }

  markPaid() {
    if (this.status !== 'approved' && this.status !== 'new')
      throw new Error('Нельзя оплатить заказ в статусе ' + this.status)
    this.status = 'paid'
  }
}

module.exports = Order
```

**Круг 2 — Use Cases (знают о Entities, НЕ знают о БД и вебе):**

```js
// use-cases/CreateOrder.js
// Зависит ТОЛЬКО от Entities и абстракций (interfaces).
// Не знает: Express? Koa? CLI? PostgreSQL? MongoDB?

const Order = require('../entities/Order')

class CreateOrder {
  // Зависимости ИНЪЕКТИРУЮТСЯ (DIP)
  constructor({ orderRepo, paymentGateway, notifier }) {
    this.orderRepo = orderRepo        // абстракция
    this.paymentGateway = paymentGateway // абстракция
    this.notifier = notifier            // абстракция
  }

  async execute(input) {
    // 1. Создать entity
    const order = new Order({
      customerId: input.customerId,
      items: input.items
    })

    // 2. Бизнес-правило
    if (order.needsApproval()) {
      order.status = 'pending_approval'
      await this.orderRepo.save(order)
      await this.notifier.send(input.customerId, 'Ваш заказ ожидает одобрения')
      return { order, paymentRequired: false }
    }

    // 3. Оплата
    const payment = await this.paymentGateway.charge(order.total)
    if (!payment.success) {
      throw new Error('Оплата не прошла: ' + payment.error)
    }

    // 4. Сохранение
    order.markPaid()
    await this.orderRepo.save(order)
    await this.notifier.send(input.customerId, `Заказ оплачен. Сумма: ${order.total}`)

    return { order, paymentRequired: true }
  }
}

module.exports = CreateOrder
```

**Круг 3 — Interface Adapters (переводят между внешним миром и бизнес-логикой):**

```js
// adapters/OrderController.js
// Знает о use case, НЕ знает о Express (получает req/res как абстракции)

class OrderController {
  constructor(createOrderUseCase) {
    this.createOrder = createOrderUseCase
  }

  async handleCreateOrder(requestBody) {
    try {
      const result = await this.createOrder.execute({
        customerId: requestBody.customer_id,  // адаптация snake_case → camelCase
        items: requestBody.items.map(i => ({
          productId: i.product_id,
          price: i.price,
          qty: i.quantity
        }))
      })
      return {
        status: 201,
        body: {
          order_id: result.order.id,
          total: result.order.total,
          status: result.order.status
        }
      }
    } catch (err) {
      return { status: 400, body: { error: err.message } }
    }
  }
}

module.exports = OrderController
```

**Круг 4 — Infrastructure (конкретные реализации, «грязные» детали):**

```js
// infrastructure/PostgresOrderRepo.js
const { Pool } = require('pg')

class PostgresOrderRepo {
  constructor(pool) { this.pool = pool }

  async save(order) {
    await this.pool.query(
      'INSERT INTO orders (customer_id, total, status) VALUES ($1, $2, $3)',
      [order.customerId, order.total, order.status]
    )
  }
}

// infrastructure/StripePayment.js
const stripe = require('stripe')

class StripePayment {
  constructor(apiKey) { this.client = stripe(apiKey) }

  async charge(amount) {
    try {
      const intent = await this.client.paymentIntents.create({
        amount: amount * 100, currency: 'rub'
      })
      return { success: true, id: intent.id }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }
}
```

**Entry point — Main (самый «грязный» компонент, знает обо всём):**

```js
// main.js — единственное место, которое знает о ВСЕХ конкретных реализациях

const express = require('express')
const { Pool } = require('pg')
const CreateOrder = require('./use-cases/CreateOrder')
const OrderController = require('./adapters/OrderController')
const PostgresOrderRepo = require('./infrastructure/PostgresOrderRepo')
const StripePayment = require('./infrastructure/StripePayment')
const EmailNotifier = require('./infrastructure/EmailNotifier')

// Сборка зависимостей (Composition Root):
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const orderRepo = new PostgresOrderRepo(pool)
const payment = new StripePayment(process.env.STRIPE_KEY)
const notifier = new EmailNotifier(process.env.SMTP_URL)

const createOrder = new CreateOrder({ orderRepo, paymentGateway: payment, notifier })
const controller = new OrderController(createOrder)

// Express — деталь, подключается снаружи:
const app = express()
app.use(express.json())
app.post('/orders', async (req, res) => {
  const result = await controller.handleCreateOrder(req.body)
  res.status(result.status).json(result.body)
})
app.listen(3000)
```

**Почему это лучше «обычного» Express-приложения:**

| | Обычный Express | Clean Architecture |
|---|---|---|
| Тесты бизнес-логики | Нужен запущенный сервер + БД | `new CreateOrder({ fakeRepo, fakePayment, fakeNotifier })` |
| Заменить PostgreSQL на MongoDB | Переписать всё | Написать `MongoOrderRepo`, поменять одну строку в main.js |
| Заменить Express на Fastify | Переписать всё | Написать новый main.js |
| Заменить Stripe на PayPal | Искать по всему коду | Написать `PayPalPayment`, поменять одну строку |
| Понять бизнес-логику | Читать контроллеры, вылавливая среди middleware | Читать use-cases/ — там только бизнес-логика |

#### Тест для тебя: хорошая ли у тебя архитектура?

```
□ Могу протестировать бизнес-правила без БД, API и UI?
□ Могу заменить БД, не трогая бизнес-логику?
□ Могу заменить веб-фреймворк, не трогая бизнес-логику?
□ Новый разработчик поймёт домен, глядя на структуру папок?
□ Ни один файл в entities/ и use-cases/ не импортирует express, pg, stripe?
```

Если хотя бы на один вопрос ответ «нет» — архитектура протекает.

---

### Глава 23. Humble Objects

Код на границе с «грязным» внешним миром (UI, БД, сеть) трудно тестировать. Решение: сделай его **настолько тупым**, что тестировать нечего.

```js
// ❌ ПЛОХО: View содержит логику — трудно тестировать без браузера

function OrderPage({ order }) {
  const discountedTotal = order.total > 10000
    ? order.total * 0.9     // скидка 10%
    : order.total
  const formattedDate = new Date(order.date).toLocaleDateString('ru-RU')
  const statusColor = order.status === 'paid' ? 'green'
    : order.status === 'pending' ? 'yellow' : 'red'

  return `
    <div style="color: ${statusColor}">
      <h1>Заказ от ${formattedDate}</h1>
      <p>Сумма: ${discountedTotal.toLocaleString('ru-RU')} ₽</p>
    </div>
  `
}
```

```js
// ✅ ХОРОШО: Presenter (тестируемый) + View (humble, тестировать нечего)

// Presenter — чистая логика, тестируется без браузера:
function presentOrder(order) {
  const discountedTotal = order.total > 10000 ? order.total * 0.9 : order.total
  return {
    formattedDate: new Date(order.date).toLocaleDateString('ru-RU'),
    formattedTotal: discountedTotal.toLocaleString('ru-RU') + ' ₽',
    statusColor: order.status === 'paid' ? 'green'
      : order.status === 'pending' ? 'yellow' : 'red'
  }
}

// View — humble, просто подставляет значения:
function OrderPage({ order }) {
  const vm = presentOrder(order)
  return `
    <div style="color: ${vm.statusColor}">
      <h1>Заказ от ${vm.formattedDate}</h1>
      <p>Сумма: ${vm.formattedTotal}</p>
    </div>
  `
}

// Тест presenter — мгновенный, без браузера:
const vm = presentOrder({ total: 15000, date: '2026-03-22', status: 'paid' })
assert(vm.formattedTotal === '13 500 ₽')
assert(vm.statusColor === 'green')
```

**Правило**: на каждой архитектурной границе один объект — «humble» (прост и нетестируем), другой — «умный» (содержит логику и легко тестируется).

---

### Главы 24–28. Boundaries, Services, Tests

#### Partial Boundaries — когда полная архитектура избыточна

**Full boundary** (отдельные пакеты, interfaces, deployment) — дорого. Три «лайт»-варианта:

```js
// 1. Подготовка без разделения:
//    Создай interfaces, но оставь всё в одной папке.
//    Когда понадобится — вынесешь в отдельный пакет.

// 2. Strategy (одномерная граница):
//    Interface только с одной стороны.
function processPayment(gateway, amount) { // gateway — любой объект с charge()
  return gateway.charge(amount)
}

// 3. Facade:
//    Просто функция, скрывающая детали. Без interfaces.
function orderFacade(data) {
  validate(data)
  calculate(data)
  save(data)
}
```

#### Services ≠ Architecture

```
// ЗАБЛУЖДЕНИЕ: "У нас microservices → у нас хорошая архитектура"
//
// РЕАЛЬНОСТЬ: microservice с плохим кодом внутри — это просто
//             плохой код за HTTP-границей. Теперь его ещё и
//             отлаживать сложнее.
//
// Services решают:
//   ✓ Масштабирование (разные машины)
//   ✓ Независимое deployment
//
// Services НЕ решают:
//   ✗ Плохой дизайн
//   ✗ Cross-cutting concerns (добавить поле → менять 5 сервисов)
//   ✗ Отсутствие boundaries внутри сервиса
```

#### Tests — компонент архитектуры

```js
// ❌ ХРУПКИЕ ТЕСТЫ: привязаны к UI → простое изменение кнопки ломает 100 тестов
test('creates order', async () => {
  await page.click('#add-to-cart-button')  // ← кнопку переименовали → тест сломался
  await page.fill('#customer-email', '...')
  await page.click('.checkout-form .submit')
})

// ✅ УСТОЙЧИВЫЕ ТЕСТЫ: тестируют через API бизнес-логики
test('creates order', async () => {
  const createOrder = new CreateOrder({ orderRepo: fakeRepo, ... })
  const result = await createOrder.execute({
    customerId: 1,
    items: [{ productId: 1, price: 100, qty: 2 }]
  })
  assert(result.order.total === 200)
  assert(result.order.status === 'paid')
})
// Переименуй кнопку, перепиши весь UI — этот тест не сломается.
```

---

## Часть VI. Детали — что является «plugin»

### Глава 30. Database — деталь

```js
// Data model (ВАЖНО для архитектуры):
// "Заказ содержит позиции, каждая позиция связана с товаром"
// Это бизнес-знание. Оно в центре.

// Database (ДЕТАЛЬ, plugin):
// "Храним в PostgreSQL / MongoDB / в файле / в памяти"
// Это решение можно менять.

// ❌ АНТИПАТТЕРН: ORM entities гуляют по всей системе
const order = await Order.findByPk(123)  // Sequelize-объект
// Теперь controller, service, и даже шаблоны знают о Sequelize.
// Замена ORM = переписать всё.

// ✅ Чисто: конвертируем на границе
class PostgresOrderRepo {
  async findById(id) {
    const row = await this.pool.query('SELECT * FROM orders WHERE id = $1', [id])
    return new Order({  // ← чистая entity, не знает о PostgreSQL
      id: row.id,
      customerId: row.customer_id,
      items: JSON.parse(row.items)
    })
  }
}
```

### Глава 31. Web — деталь

Web — устройство ввода/вывода. Маятник «всё на сервере ↔ всё на клиенте» качается с 1960-х. Бизнес-логика не должна зависеть от положения маятника.

```js
// Бизнес-логика работает одинаково, неважно откуда вызвана:
const createOrder = new CreateOrder({ orderRepo, paymentGateway, notifier })

// Из Express:
app.post('/orders', async (req, res) => {
  const result = await createOrder.execute(req.body)
  res.json(result)
})

// Из CLI:
const data = JSON.parse(fs.readFileSync(process.argv[2]))
createOrder.execute(data).then(console.log)

// Из теста:
createOrder.execute(testData).then(result => assert(...))

// Из GraphQL, gRPC, WebSocket — бизнес-логика НЕ МЕНЯЕТСЯ.
```

### Глава 32. Frameworks — деталь

```js
// ❌ "Брак" с framework — бизнес-логика пропитана Express:
app.post('/orders', authenticate, validate, async (req, res) => {
  const order = new Order(req.body)          // ← бизнес-логика
  order.total = order.items.reduce(...)      // ← бизнес-логика
  if (order.total > 50000) {                 // ← бизнес-правило
    order.status = 'pending_approval'        // ← бизнес-правило
  }
  await db.query('INSERT INTO ...')          // ← database
  await mailer.send(...)                     // ← почта
  res.status(201).json(order)
})
// Всё в одном месте. Невозможно протестировать без Express, БД, почты.
// Перейти на Fastify = переписать всю бизнес-логику.

// ✅ Framework — тонкая обёртка во внешнем круге:
app.post('/orders', async (req, res) => {
  const result = await controller.handleCreateOrder(req.body)
  res.status(result.status).json(result.body)
})
// Express — 2 строки клея. Бизнес-логика — в use-cases/.
// Переход на Fastify = переписать только эти 2 строки.
```

**Когда «брак» неизбежен**: React/Vue для UI — абстрагироваться от них непрактично. Стандартная библиотека языка. В этих случаях — принимай осознанно, но **не тащи framework в бизнес-логику**.

---

### Глава 34. Организация кода — 4 подхода (автор: Саймон Браун)

```
// 1. BY LAYERS (горизонтально):
src/
  controllers/    OrdersController.js
  services/       OrdersService.js
  repositories/   OrdersRepository.js
// Проблема: не кричит о домене. Что это — магазин? Больница?

// 2. BY FEATURES (вертикально):
src/
  orders/         OrdersController.js, OrdersService.js, OrdersRepository.js
  products/       ProductsController.js, ...
// Лучше: видно домен. Но нет защиты от прямого доступа к repository.

// 3. PORTS AND ADAPTERS (hexagonal):
src/
  domain/         Order.js, OrderService.js
  ports/          OrderRepository.js (interface)
  adapters/
    web/          OrdersController.js
    db/           PostgresOrderRepo.js
// Хорошо: чёткое разделение внутреннего и внешнего.

// 4. BY COMPONENTS (рекомендация Брауна):
src/
  web/            OrdersController.js     ← публичный
  orders/         OrdersComponent.js      ← публичный interface
                  OrdersComponentImpl.js  ← приватный
                  OrdersRepository.js     ← приватный
                  PostgresOrdersRepo.js   ← приватный
// Controller знает только OrdersComponent. Всё остальное — скрыто.
```

**Ключевой вывод Брауна**: если в JS/Java всё `export`/`public` — четыре подхода **неотличимы**. Архитектура живёт только когда **compiler/runtime** её проверяет.

```js
// Практически в JS: используй index.js как «контракт»

// orders/index.js — публичный API компонента:
module.exports = {
  createOrder: require('./CreateOrder'),
  getOrder: require('./GetOrder'),
}
// НЕ экспортируем: OrderRepository, PostgresRepo, внутренние helpers
// Controller импортирует только из orders/index.js
```

---

## Когда НЕ применять Clean Architecture

Дядя Боб этого не говорит, но это **критически важно**:

| Ситуация | Что делать |
|---|---|
| **Прототип / MVP** | Пиши быстро. Выброси и перепиши, когда поймёшь домен |
| **Скрипт на 100 строк** | Один файл. SOLID не нужен |
| **CRUD без бизнес-логики** | Framework (Nest, Rails) справится сам. Не абстрагируй ради абстракции |
| **Команда из 1 человека, проект на 3 месяца** | Лёгкие boundaries. Не нужны interfaces на каждый чих |
| **Проект будет жить 5+ лет и расти** | **ДА, применяй полноценно** |
| **Бизнес-логика сложная и меняется часто** | **ДА, применяй полноценно** |
| **Несколько команд работают параллельно** | **ДА, применяй полноценно** |

**Правило**: стоимость архитектуры должна быть **меньше** стоимости её отсутствия. Для простых проектов Clean Architecture — over-engineering.

---

## Шпаргалка: применяй на практике

### Checklist перед написанием кода

```
1. Кто актёры (источники изменений)?         → Разделяй по актёрам (SRP)
2. Что будет расширяться?                    → Делай точки расширения (OCP)
3. Где бизнес-логика, где детали?             → Бизнес-логика в центр, детали наружу
4. От чего зависит бизнес-логика?            → Только от абстракций (DIP)
5. Можно ли протестировать без БД/UI/сети?   → Если нет, архитектура течёт
```

### Рецепт refactoring существующего проекта

```
Шаг 1: Выдели Entities (чистые бизнес-объекты без imports)
Шаг 2: Выдели Use Cases (бизнес-логика, зависит только от Entities и interfaces)
Шаг 3: Создай interfaces для внешних зависимостей (БД, API, почта)
Шаг 4: Перенеси framework-код в adapters (controllers, repositories)
Шаг 5: Собери всё в main.js (Composition Root)
Шаг 6: Напиши тесты Use Cases с fake реализациями
```

### Самопроверка

| Вопрос | Хорошо | Плохо |
|---|---|---|
| Где живёт SQL? | В `infrastructure/` | В `services/` рядом с бизнес-логикой |
| Кто знает об Express? | Только `main.js` и controllers | Services и entities |
| Как тестируется бизнес-логика? | `new UseCase(fakeRepo)` — мгновенно | Поднять Docker с БД и сервером |
| Что видит новый разработчик? | `orders/`, `products/`, `billing/` | `controllers/`, `models/`, `utils/` |
| Могу заменить БД? | Написать новый Repo, поменять main.js | Искать SQL по всему проекту |

---

## Почему этот конспект лучше книги для обучения

| Книга дяди Боба | Этот конспект |
|---|---|
| Примеры на UML-диаграммах | Реальный код на JS, который можно запустить |
| Принципы объясняются изолированно | Показаны связи между всеми концепциями |
| Нет «когда НЕ применять» | Есть таблица с ситуациями |
| 100 страниц автобиографии | 0 строк воды |
| Нет практических заданий | Задания после каждой секции |
| Нет code smells для распознавания нарушений | Таблица code smells для каждого принципа |
| Нет рецепта refactoring | Пошаговый рецепт перехода |
| Нет полного примера проекта | Полный пример интернет-магазина |
| Нет checklists для самопроверки | Checklists и таблицы самопроверки |
| Абстрактные рассуждения | Конкретные сравнения «было → стало» |

---

## Glossary

### Принципы SOLID

| Термин | Определение |
|---|---|
| **SRP — Single Responsibility Principle** | Модуль должен иметь одну и только одну причину для изменения — одного актора. Не «функция делает одну вещь», а «один источник требований к изменению» |
| **OCP — Open/Closed Principle** | Модуль открыт для расширения, но закрыт для модификации. Новое поведение добавляется новым кодом, а не правкой существующего |
| **LSP — Liskov Substitution Principle** | Подтип должен быть полноценной заменой базового типа — вызывающий код не должен знать, с каким именно подтипом он работает |
| **ISP — Interface Segregation Principle** | Клиент не должен зависеть от методов, которые он не использует. Толстые interfaces разбиваются на тонкие и специализированные |
| **DIP — Dependency Inversion Principle** | High-level модули не зависят от low-level модулей. Оба зависят от абстракций. Бизнес-логика определяет interfaces, детали их реализуют |

### Component Principles

| Термин | Определение |
|---|---|
| **REP — Reuse/Release Equivalence Principle** | Единица переиспользования = единица выпуска. Классы в компоненте должны иметь общий смысл и выпускаться вместе |
| **CCP — Common Closure Principle** | Классы, которые меняются по одной причине и в одно время, живут в одном компоненте. SRP на уровне компонентов |
| **CRP — Common Reuse Principle** | Не заставляй пользователя зависеть от того, что он не использует. ISP на уровне компонентов |
| **ADP — Acyclic Dependencies Principle** | В графе зависимостей между компонентами не должно быть циклов. Циклы разрываются через DIP или выделение общего компонента |
| **SDP — Stable Dependencies Principle** | Компонент должен зависеть только от компонентов, которые стабильнее его. Зависимости направлены в сторону stability |
| **SAP — Stable Abstractions Principle** | Степень абстрактности компонента должна соответствовать его stability. Чем стабильнее — тем абстрактнее |

### Архитектурные слои Clean Architecture

| Термин | Определение |
|---|---|
| **Entities** | Центральный круг. Чистые бизнес-объекты и бизнес-правила, не зависящие ни от чего внешнего. Ни одного import framework, БД или UI |
| **Use Cases** | Прикладная бизнес-логика. Orchestrate Entities для выполнения конкретного сценария. Зависят только от Entities и абстракций |
| **Interface Adapters** | Controllers, Presenters, Gateways. Переводят данные между форматом Use Cases и форматом внешнего мира (web, БД) |
| **Frameworks & Drivers** | Внешний круг. Конкретные технологии: Express, PostgreSQL, Stripe, nodemailer. Подключаются как plugins |
| **Dependency Rule** | Главное правило: зависимости в source code направлены ТОЛЬКО ВНУТРЬ. Внутренние круги ничего не знают о внешних |

### Архитектурные концепции

| Термин | Определение |
|---|---|
| **Clean Architecture** | Архитектурный подход, где бизнес-логика находится в центре и не зависит от деталей (БД, UI, frameworks). Детали — plugins к бизнес-логике |
| **Dependency Injection** | Техника передачи зависимостей в модуль извне (через конструктор, параметры), вместо создания их внутри. Основной механизм реализации DIP |
| **Composition Root** | Единственное место в приложении (обычно `main.js`), которое знает обо всех конкретных реализациях и собирает граф зависимостей |
| **Humble Objects** | Паттерн: код на архитектурной границе делается максимально простым («тупым»), вся логика выносится в тестируемый объект рядом |
| **Partial Boundaries** | Облегчённые варианты архитектурных границ, когда полное разделение избыточно: Strategy, Facade, подготовка interfaces без разделения на пакеты |
| **Ports and Adapters** | (Hexagonal Architecture) Подход, где бизнес-логика определяет ports (interfaces), а внешние системы подключаются через adapters |
| **Boundary** | Граница между архитектурными слоями. Пересечение boundary всегда происходит через абстракцию, а не через конкретную реализацию |

### OOP-концепции

| Термин | Определение |
|---|---|
| **Polymorphism** | Способность вызывающего кода работать с разными реализациями через единый interface. Ключевая суперсила OOP для инверсии зависимостей |
| **Encapsulation** | Сокрытие внутренней реализации модуля за публичным interface. Изменения внутри не затрагивают внешний код |
| **Inheritance** | Механизм создания подтипов, наследующих поведение базового типа. В контексте Clean Architecture важен для LSP |

### Functional Programming

| Термин | Определение |
|---|---|
| **Immutability** | Данные не изменяются после создания — вместо mutation создаётся новый объект. Убирает класс багов, связанных с shared mutable state |
| **Pure Functions** | Функции без side effects: один и тот же вход → всегда один и тот же выход. Предсказуемы, легко тестируются |
| **Event Sourcing** | Паттерн хранения данных: вместо текущего состояния хранится последовательность events. Состояние вычисляется replay events |

### Прочие термины

| Термин | Определение |
|---|---|
| **Code Smell** | Признак в коде, указывающий на вероятное нарушение принципа проектирования. Не баг, но сигнал к refactoring |
| **Refactoring** | Изменение внутренней структуры кода без изменения его внешнего поведения. Цель — улучшить читаемость и maintainability |
| **Strategy Pattern** | Поведенческий паттерн: алгоритм выносится в отдельный объект и передаётся как зависимость. Позволяет менять поведение без изменения вызывающего кода |
| **Facade Pattern** | Структурный паттерн: простой interface к сложной подсистеме. Скрывает детали за одной точкой входа |
| **Adapter Pattern** | Структурный паттерн: оборачивает объект с несовместимым interface, приводя его к ожидаемому контракту |
| **Stability** | В контексте SDP/SAP: мера того, насколько трудно изменить компонент. Чем больше зависимостей входит — тем выше stability |
| **Zone of Pain** | Компонент с высокой stability, но низкой абстрактностью. Трудно менять и при этом конкретный — любое изменение больно бьёт по зависимым |
| **Over-engineering** | Избыточная сложность архитектуры, не оправданная масштабом проекта. Стоимость архитектуры превышает стоимость её отсутствия |
| **Breaking Change** | Изменение в API или interface, которое ломает существующий код, зависящий от предыдущего контракта |
| **Cross-cutting Concerns** | Задачи, затрагивающие несколько слоёв или модулей: logging, authentication, error handling. Не укладываются в один компонент |
| **Deployment** | Процесс доставки кода в рабочую среду. Компонент — единица deployment |
| **Entry Point** | Точка входа приложения (`main.js`). Самый «грязный» модуль — знает обо всех конкретных реализациях и собирает систему |
| **Plugin** | Внешняя реализация, подключаемая к системе через interface. В Clean Architecture БД, UI, frameworks — plugins к бизнес-логике |
| **Middleware** | Промежуточный обработчик в цепочке запрос → ответ (Express, Koa). Часть внешнего круга |
| **MVP (Minimum Viable Product)** | Минимально жизнеспособный продукт. На этапе MVP полноценная архитектура часто избыточна |
