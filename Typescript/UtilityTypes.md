1. Что делает утилитный тип `Awaited<Type>`?
	- Извлекает внутренний тип из `Promise`/`Thenable`, рекурсивно раскрывая промисы.
	
	```typescript
	type A = Awaited<Promise<number>>; // number
	type B = Awaited<Promise<Promise<string>>>; // string
	```

2. Что делает утилитный тип `Partial<Type>`?
	- Делает все свойства типа опциональными.
	
	```typescript
	type A = Partial<{ a: number; b: string }>; // { a?: number; b?: string }
	```

3. Что делает утилитный тип `Required<Type>`?
	- Делает все свойства типа обязательными.
	
	```typescript
	type A = Required<{ a?: number; b?: string }>; // { a: number; b: string }
	```

4. Что делает утилитный тип `Readonly<Type>`?
	- Делает все свойства типа только для чтения (запрещает присваивания).
	
	```typescript
	type A = Readonly<{ a: number }>; // { readonly a: number }
	```

5. Что делает утилитный тип `Record<Keys, Type>`?
	- Создаёт тип объекта с ключами из объединения `Keys` и значениями типа `Type`.
	
	```typescript
	type A = Record<'id' | 'name', string>; // { id: string; name: string }
	type B = Record<number, boolean>; // { [x: number]: boolean }
	```

6. Что делает утилитный тип `Pick<Type, Keys>`?
	- Формирует тип с подмножеством свойств `Type`, перечисленных в `Keys`.
	
	```typescript
	type A = Pick<{ a: number; b: string }, 'a'>; // { a: number }
	```

7. Что делает утилитный тип `Omit<Type, Keys>`?
	- Формирует тип из `Type`, исключая свойства, перечисленные в `Keys`.
	
	```typescript
	type A = Omit<{ a: number; b: string }, 'b'>; // { a: number }
	```

8. Что делает утилитный тип `Exclude<UnionType, ExcludedMembers>`?
	- Убирает из объединения `UnionType` все члены, совместимые с `ExcludedMembers`.
	
	```typescript
	type A = Exclude<'a' | 'b' | 1, string>; // 1
	type B = Exclude<string | number, number>; // string
	```

9. Что делает утилитный тип `Extract<Type, Union>`?
	- Оставляет в `Type` только члены, совместимые с `Union` (пересечение).
	
	```typescript
	type A = Extract<'a' | 'b' | 1, string>; // 'a' | 'b'
	type B = Extract<string | number, number | boolean>; // number
	```

10. Что делает утилитный тип `NonNullable<Type>`?
	- Исключает значения `null` и `undefined` из `Type`.
	
	```typescript
	type A = NonNullable<string | null | undefined>; // string
	```

11. Что делает утилитный тип `Parameters<Type>`?
	- Возвращает кортеж типов параметров функции `Type`.
	
	```typescript
	type Fn = (x: number, y: string) => void;
	type A = Parameters<Fn>; // [number, string]
	type A2 = Parameters<typeof Math.max>; // number[]
	```

12. Что делает утилитный тип `ConstructorParameters<Type>`?
	- Возвращает кортеж типов параметров конструктора у типа-конструктора.
	
	```typescript
	type C = new (x: number) => {};
	type A = ConstructorParameters<C>; // [number]
	
	class K { constructor(a: number, b: string) {} }
	type B = ConstructorParameters<typeof K>; // [number, string]
	```

13. Что делает утилитный тип `ReturnType<Type>`?
	- Извлекает тип возвращаемого значения функции `Type`.
	
	```typescript
	type Fn = () => Promise<string>;
	type A = ReturnType<Fn>; // Promise<string>
	type B = ReturnType<() => { id: number }>; // { id: number }
	```

14. Что делает утилитный тип `InstanceType<Type>`?
	- Возвращает тип экземпляра, создаваемого конструктором `Type`.
	
	```typescript
	type C = new () => Date;
	type A = InstanceType<C>; // Date
	
	class K {}
	type B = InstanceType<typeof K>; // K
	```

15. Что делает утилитный тип `NoInfer<Type>`?
	- Предотвращает вывод (инференс) `Type` из контекста, фиксируя переданный тип.
	
	```typescript
	declare function f<T>(x: T, y: NoInfer<T>): T;
	f('a', 'b'); // ok
	f('a', 1); // ошибка типов
	```

16. Что делает утилитный тип `ThisParameterType<Type>`?
	- Извлекает тип параметра `this` у функции `Type`.
	
	```typescript
	function fn(this: { id: number }) {}
	type A = ThisParameterType<typeof fn>; // { id: number }
	type B = ThisParameterType<(this: HTMLDivElement, x: number) => void>; // HTMLDivElement
	```

17. Что делает утилитный тип `OmitThisParameter<Type>`?
	- Удаляет параметр `this` из сигнатуры функции `Type`.
	
	```typescript
	function fn(this: Date, x: number): void {}
	type A = OmitThisParameter<typeof fn>; // (x: number) => void
	type B = OmitThisParameter<(this: HTMLElement, e: MouseEvent) => void>; // (e: MouseEvent) => void
	```

18. Что делает утилитный тип `ThisType<Type>`?
	- Служит маркером контекстного типа `this` в объектных литералах (работает с lib ThisType).
	
	```typescript
	const obj: ThisType<{ id: number }> & { getId(): number } = {
		getId() { return this.id; } // this: { id: number }
	};
	
	const m: ThisType<{ count: number }> & { inc(): void } = {
		inc() { this.count++; } // this: { count: number }
	};
	```

19. Что делает утилитный тип `Uppercase<StringType>`?
	- Преобразует все символы строки в верхний регистр.
	
	```typescript
	type A = Uppercase<'ab'>; // 'AB'
	```

20. Что делает утилитный тип `Lowercase<StringType>`?
	- Преобразует все символы строки в нижний регистр.
	
	```typescript
	type A = Lowercase<'AbC'>; // 'abc'
	```

21. Что делает утилитный тип `Capitalize<StringType>`?
	- Делает первый символ строки заглавным.
	
	```typescript
	type A = Capitalize<'hello'>; // 'Hello'
	```

22. Что делает утилитный тип `Uncapitalize<StringType>`?
	- Делает первый символ строки строчным.
	
	```typescript
	type A = Uncapitalize<'Hello'>; // 'hello'
	```