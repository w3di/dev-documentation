- `Awaited<Type>` — извлекает тип из Promise
- `Partial<Type>` — делает все свойства типа опциональными
- `Required<Type>` — делает все свойства типа обязательными
- `Readonly<Type>` — делает все свойства типа только для чтения
- `Record<Keys, Type>` — создает тип с указанными ключами и значениями
- `Pick<Type, Keys>` — выбирает указанные свойства из типа
- `Omit<Type, Keys>` — исключает указанные свойства из типа
- `Exclude<UnionType, ExcludedMembers>` — исключает типы из объединения
- `Extract<Type, Union>` — извлекает типы из объединения
- `NonNullable<Type>` — исключает `null` и `undefined` из типа
- `Parameters<Type>` — извлекает типы параметров функции
- `ConstructorParameters<Type>` — извлекает типы параметров конструктора
- `ReturnType<Type>` — извлекает тип возвращаемого значения функции
- `InstanceType<Type>` — извлекает тип экземпляра класса
- `NoInfer<Type>` — блокирует вывод типа
- `ThisParameterType<Type>` — извлекает тип параметра `this` функции
- `OmitThisParameter<Type>` — удаляет параметр `this` из типа функции
- `ThisType<Type>` — маркер для контекстного типа `this`

Также есть встроенные типы для манипуляции строками:

- `Uppercase<StringType>`
- `Lowercase<StringType>`
- `Capitalize<StringType>`
- `Uncapitalize<StringType>`







