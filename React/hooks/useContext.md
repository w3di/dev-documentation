Функция `useContext` в React позволяет компонентам получать доступ к значениям контекста, которые были определены с помощью `createContext`. Это упрощает передачу данных через дерево компонентов, избегая необходимости передавать пропсы на каждом уровне.

## Основные моменты использования `useContext`

1. **Импорт и создание контекста**:javascript
```jsx
import { createContext, useContext } from 'react';
const ThemeContext = createContext(null);
```

    
2. **Использование `useContext`**:  
    Внутри компонента вы можете вызвать `useContext`, чтобы получить текущее значение контекста
```jsx
function MyComponent() {
const theme = useContext(ThemeContext);  // Используйте значение theme в компоненте
}
```

    
3. **Провайдер контекста**:  
    Чтобы передать данные через контекст, оберните ваш компонент или его родительский компонент в провайдер контекста:javascript
    
    `function MyApp() {   return (    <ThemeContext.Provider value="dark">      <Form />    </ThemeContext.Provider>  ); }`
    
4. **Получение значения**:  
    Компоненты, использующие `useContext`, автоматически обновляются при изменении значения контекста. React ищет ближайший провайдер выше по дереву компонентов и использует его значение.

## Важные моменты и ограничения

- **Обновление компонентов**: Если значение контекста изменяется, все дочерние компоненты, которые используют этот контекст, будут автоматически перерисованы.
- **Поиск провайдера**: `useContext` ищет ближайший провайдер выше по дереву, игнорируя провайдеры внутри самого компонента.
- **Сравнение объектов**: Если ваш сборщик модулей создает дубликаты модулей, это может нарушить работу контекста. Используйте один и тот же объект контекста для передачи и чтения значений.

## Пример использования

Вот пример того, как можно использовать `useContext` для передачи темы в кнопки:

javascript

`function Panel({ title, children }) {   const theme = useContext(ThemeContext);  const className = 'panel-' + theme;  return (    <section className={className}>      <h1>{title}</h1>      {children}    </section>  ); } function Button({ children }) {   const theme = useContext(ThemeContext);  const className = 'button-' + theme;  return (    <button className={className}>      {children}    </button>  ); }`

В этом примере кнопки и панель получают тему из `ThemeContext`, что позволяет легко управлять стилями на основе текущей темы приложения.


Если React не может найти провайдеры данного контекста в родительском дереве, значение контекста, возвращаемое функцией `useContext()`, будет равно значению по умолчанию, которое вы указали при создании контекста:

javascript

`const ThemeContext = createContext(null);`

Значение по умолчанию **никогда не изменяется**. Если вы хотите обновить контекст, используйте его вместе с состоянием, как описано выше.Часто вместо `null` можно использовать более значимое значение по умолчанию, например:

javascript

`const ThemeContext = createContext('light');`

Таким образом, если вы случайно отрендерите компонент без соответствующего провайдера, это не приведет к ошибке. Это также помогает вашим компонентам хорошо работать в тестовой среде без необходимости настраивать множество провайдеров в тестах.В приведенном ниже примере кнопка "Переключить тему" всегда будет светлой, потому что она находится вне любого провайдера темы, и значение темы по умолчанию равно 'light'. Попробуйте изменить значение темы по умолчанию на 'dark'.

## Пример кода

javascript

`import { createContext, useContext, useState } from 'react'; const ThemeContext = createContext('light'); export default function MyApp() {   const [theme, setTheme] = useState('light');  return (    <>      <ThemeContext.Provider value={theme}>        <Form />      </ThemeContext.Provider>      <Button onClick={() => {        setTheme(theme === 'dark' ? 'light' : 'dark');      }}>        Toggle theme      </Button>    </>  ) } function Form({ children }) {   return (    <Panel title="Welcome">      <Button>Sign up</Button>      <Button>Log in</Button>    </Panel>  ); } function Panel({ title, children }) {   const theme = useContext(ThemeContext);  const className = 'panel-' + theme;  return (    <section className={className}>      <h1>{title}</h1>      {children}    </section>  ) } function Button({ children, onClick }) {   const theme = useContext(ThemeContext);  const className = 'button-' + theme;  return (    <button className={className} onClick={onClick}>      {children}    </button>  ); }`

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

Share

Rewrite


Оптимизация повторных рендеров при передаче объектов и функций в React может значительно повысить производительность приложения. Рассмотрим, как это реализовать с помощью хуков `useCallback` и `useMemo`.

## Проблема с контекстом

Когда вы передаете объект через контекст, как в следующем примере:

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


Каждый раз, когда `MyApp` перерисовывается (например, при обновлении маршрута), создается новый объект контекста. Это приводит к повторным рендерам всех компонентов, использующих `useContext(AuthContext)`, даже если данные (например, `currentUser`) не изменились. Это не критично для небольших приложений, но может вызвать проблемы с производительностью в более сложных.

## Оптимизация с помощью useCallback и useMemo

Чтобы избежать ненужных повторных рендеров, можно использовать хуки `useCallback` и `useMemo`. Вот как это сделать:

javascript

`import { useCallback, useMemo } from 'react'; function MyApp() {   const [currentUser, setCurrentUser] = useState(null);   const login = useCallback((response) => {    storeCredentials(response.credentials);    setCurrentUser(response.user);  }, []);   const contextValue = useMemo(() => ({    currentUser,    login  }), [currentUser, login]);   return (    <AuthContext.Provider value={contextValue}>      <Page />    </AuthContext.Provider>  ); }`

## Как это работает

- **useCallback**: Этот хук позволяет мемоизировать функцию `login`, чтобы она не пересоздавалась при каждом рендере компонента. Он будет пересоздан только тогда, когда изменятся зависимости (в данном случае их нет).
- **useMemo**: Этот хук мемоизирует объект контекста. Он будет пересоздан только тогда, когда изменится `currentUser` или `login`. Это предотвращает повторные рендеры компонентов, использующих контекст, если данные не изменились.

## Заключение

Использование хуков `useCallback` и `useMemo` помогает оптимизировать производительность React-приложений, снижая количество ненужных повторных рендеров. Эти инструменты особенно полезны в сложных компонентах и больших приложениях, где производительность имеет критическое значение.