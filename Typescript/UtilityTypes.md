1. Что делает утилитный тип Awaited<Type>?
	1. Извлекает внутренний тип из Promise/Thenable, рекурсивно раскрывая промисы.
	2. Пример: type A = Awaited<Promise<number>>; // number
	3. Пример 2: type B = Awaited<Promise<Promise<string>>>; // string
2. Что делает утилитный тип Partial<Type>?
	1. Делает все свойства типа опциональными.
	2. Пример: type A = Partial<{ a: number; b: string }>; // { a?: number; b?: string }
3. Что делает утилитный тип Required<Type>?
	1. Делает все свойства типа обязательными.
	2. Пример: type A = Required<{ a?: number; b?: string }>; // { a: number; b: string }
4. Что делает утилитный тип Readonly<Type>?
	1. Делает все свойства типа только для чтения (запрещает присваивания).
	2. Пример: type A = Readonly<{ a: number }>; // { readonly a: number }
5. Что делает утилитный тип Record<Keys, Type>?
	1. Создаёт тип объекта с ключами из объединения Keys и значениями типа Type.
	2. Пример: type A = Record<'id' | 'name', string>; // { id: string; name: string }
	3. Пример 2: type B = Record<number, boolean>; // { [x: number]: boolean }
6. Что делает утилитный тип Pick<Type, Keys>?
	1. Формирует тип с подмножеством свойств Type, перечисленных в Keys.
	2. Пример: type A = Pick<{ a: number; b: string }, 'a'>; // { a: number }
7. Что делает утилитный тип Omit<Type, Keys>?
	1. Формирует тип из Type, исключая свойства, перечисленные в Keys.
	2. Пример: type A = Omit<{ a: number; b: string }, 'b'>; // { a: number }
8. Что делает утилитный тип Exclude<UnionType, ExcludedMembers>?
	1. Убирает из объединения UnionType все члены, совместимые с ExcludedMembers.
	2. Пример: type A = Exclude<'a' | 'b' | 1, string>; // 1
	3. Пример 2: type B = Exclude<string | number, number>; // string
9. Что делает утилитный тип Extract<Type, Union>?
	1. Оставляет в Type только члены, совместимые с Union (пересечение).
	2. Пример: type A = Extract<'a' | 'b' | 1, string>; // 'a' | 'b'
	3. Пример 2: type B = Extract<string | number, number | boolean>; // number
10. Что делает утилитный тип NonNullable<Type>?
	1. Исключает значения null и undefined из Type.
	2. Пример: type A = NonNullable<string | null | undefined>; // string
11. Что делает утилитный тип Parameters<Type>?
	1. Возвращает кортеж типов параметров функции Type.
	2. Пример: type Fn = (x: number, y: string) => void; type A = Parameters<Fn>; // [number, string]
	3. Пример 2: type A2 = Parameters<typeof Math.max>; // number[]
12. Что делает утилитный тип ConstructorParameters<Type>?
	1. Возвращает кортеж типов параметров конструктора у типа-конструктора.
	2. Пример: type C = new (x: number) => {}; type A = ConstructorParameters<C>; // [number]
	3. Пример 2: class K { constructor(a: number, b: string) {} } type B = ConstructorParameters<typeof K>; // [number, string]
13. Что делает утилитный тип ReturnType<Type>?
	1. Извлекает тип возвращаемого значения функции Type.
	2. Пример: type Fn = () => Promise<string>; type A = ReturnType<Fn>; // Promise<string>
	3. Пример 2: type B = ReturnType<() => { id: number }>; // { id: number }
14. Что делает утилитный тип InstanceType<Type>?
	1. Возвращает тип экземпляра, создаваемого конструктором Type.
	2. Пример: type C = new () => Date; type A = InstanceType<C>; // Date
	3. Пример 2: class K {} type B = InstanceType<typeof K>; // K
15. Что делает утилитный тип NoInfer<Type>?
	1. Предотвращает вывод (инференс) Type из контекста, фиксируя переданный тип.
	2. Пример: declare function f<T>(x: T, y: NoInfer<T>): T; f('a', 'b'); // ok; f('a', 1); // ошибка типов
16. Что делает утилитный тип ThisParameterType<Type>?
	1. Извлекает тип параметра this у функции Type.
	2. Пример: function fn(this: { id: number }) {} type A = ThisParameterType<typeof fn>; // { id: number }
	3. Пример 2: type B = ThisParameterType<(this: HTMLDivElement, x: number) => void>; // HTMLDivElement
17. Что делает утилитный тип OmitThisParameter<Type>?
	1. Удаляет параметр this из сигнатуры функции Type.
	2. Пример: function fn(this: Date, x: number): void {} type A = OmitThisParameter<typeof fn>; // (x: number) => void
	3. Пример 2: type B = OmitThisParameter<(this: HTMLElement, e: MouseEvent) => void>; // (e: MouseEvent) => void
18. Что делает утилитный тип ThisType<Type>?
	1. Служит маркером контекстного типа this в объектных литералах (работает с lib ThisType).
	2. Пример: const obj: ThisType<{ id: number }> & { getId(): number } = { getId() { return this.id; } }; // this: { id: number }
	3. Пример 2: const m: ThisType<{ count: number }> & { inc(): void } = { inc() { this.count++; } }; // this: { count: number }
19. Что делает утилитный тип Uppercase<StringType>?
	1. Преобразует все символы строки в верхний регистр.
	2. Пример: type A = Uppercase<'ab'>; // 'AB'
20. Что делает утилитный тип Lowercase<StringType>?
	1. Преобразует все символы строки в нижний регистр.
	2. Пример: type A = Lowercase<'AbC'>; // 'abc'
21. Что делает утилитный тип Capitalize<StringType>?
	1. Делает первый символ строки заглавным.
	2. Пример: type A = Capitalize<'hello'>; // 'Hello'
22. Что делает утилитный тип Uncapitalize<StringType>?
	1. Делает первый символ строки строчным.
	2. Пример: type A = Uncapitalize<'Hello'>; // 'hello'