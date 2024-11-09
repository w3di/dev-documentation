`useContext` в React позволяет компоненту напрямую получать значения контекста, созданного через `createContext`, без передачи пропсов через все уровни дерева компонентов.

## Основные моменты использования `useContext`

1. **Создание контекста**
```jsx
import { createContext, useContext } from 'react'; 
const ThemeContext = createContext(null);
```

2. **Получение значения**:
```jsx
function MyComponent() {
	const theme = useContext(ThemeContext);
}
```

3. **Провайдер контекста**:  
```jsx
function MyApp() {
  return (
    <ThemeContext.Provider value="dark">
      <MyComponent />
    </ThemeContext.Provider>
  );
}

```

4. **Автообновление компонентов**:
	Компоненты, использующие `useContext`, обновляются при изменении значения контекста. React ищет ближайший провайдер выше по дереву компонентов и использует его значение.

## Важные моменты и ограничения

- **Обновление компонентов**: Все дочерние компоненты, использующие контекст, перерисовываются при изменении его значения.
- **Поиск провайдера**: `useContext` находит ближайший провайдер выше по дереву.
- **Сравнение объектов**: Используйте один и тот же объект контекста для передачи и чтения, чтобы избежать ошибок.
## Переопределение контекста для части дерева

Вы можете переопределить контекст для части дерева, обернув эту часть в провайдер с другим значением:

```jsx
<ThemeContext.Provider value="dark"> 
	... 
	<ThemeContext.Provider value="light"> 
		<Footer />
	</ThemeContext.Provider> 
	...
</ThemeContext.Provider>
```

Вы можете вложить и переопределять провайдеры столько раз, сколько вам нужно.


## Оптимизация с помощью useCallback и useMemo
```jsx
function MyApp() {
	const [currentUser, setCurrentUser] = useState(null);
	function login(response) {
		storeCredentials(response.credentials); 
		setCurrentUser(response.user);
	}   
	return (
		<AuthContext.Provider value={{ currentUser, login }}>
			<Page />    
		</AuthContext.Provider>
	);
}
```

Когда вы передаете объект через контекст, например, в случае с `AuthContext`, при каждом рендере создается новый объект. Это приводит к повторным рендерам всех компонентов, использующих этот контекст, даже если данные не изменились. Чтобы избежать этого и улучшить производительность, можно использовать хуки `useCallback` и `useMemo`.

Чтобы избежать ненужных повторных рендеров, можно использовать хуки `useCallback` и `useMemo`. Вот как это сделать:

```jsx
import { useState, useCallback, useMemo } from 'react';

function MyApp() {
  const [currentUser, setCurrentUser] = useState(null);

  const login = useCallback((response) => {
    storeCredentials(response.credentials); 
    setCurrentUser(response.user);
  }, []);

  const contextValue = useMemo(() => ({
    currentUser,
    login
  }), [currentUser, login]);

  return (
    <AuthContext.Provider value={contextValue}>
      <Page />
    </AuthContext.Provider>
  );
}
```

### Объяснение оптимизации

1. **`useCallback`**: Меморизирует функцию `login`, предотвращая её пересоздание при каждом рендере. Функция будет пересоздана только при изменении зависимостей (в данном случае их нет).
    
2. **`useMemo`**: Меморизирует объект `contextValue`. Объект пересоздается только при изменении `currentUser` или `login`. Это предотвращает лишние рендеры компонентов, использующих этот контекст, если данные не изменились.