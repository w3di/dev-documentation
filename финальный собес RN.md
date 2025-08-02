
### блок вопросов по js:
задачка на контекст, функции и call bind apply
```js
const obj = {
  name: "Colin",
  prop: {
    name: "Rox",
    getname: function () {
      return this.name;
    },
    arrow: () => this.name,
    iife: function () {
      (function () {
        console.log(this.name);
      })();
    },
    arrowInsideFunction: function () {
      return () => console.log(this.name);
    },
  },
};

console.log(obj.prop.getname()); //
const test = obj.prop.getname;
console.log(test); //
console.log(test.call(obj.prop)); //
console.log(test.apply(obj)); //
console.log(test.bind(obj)()); //
console.log(test.bind(obj).bind(obj.prop)()); // ?
console.log(obj.prop.arrow()); //
obj.prop.iife(); //
obj.prop.arrowInsideFunction()(); //
```

задачка на промисы и var let const и зоны видимости, и промисы
```js
async function run() {
  for (var i = 1; i <= 3; i++) {
    new Promise((res, rej) => {
      console.log(i);
      setTimeout(() => {
        console.log(i);
        res();
      }, 400);
    });
  }
  console.log("Done");
}

run()
  .then(
    () => {
      console.log("then1");
    },
    () => {
      console.log("then2");
    }
  )
  .catch(() => {
    {
      console.log("catch");
    }
  })
  .finally(() => {
    console.log("finally");
  });
```

знания метода массива
```js
[1, 2, 3].map(console.log);
const a = [1, 2, 3].map(console.log);
console.log(a);
```

### Блок вопросов по React Native:
1. Что такое React Native и как он работает?
	1. ios/android
2. Как ты стилизуешь компоненты? в чем преемущество StyleSheet.create()?
	1. не знает плюс styleshtt
3. Какие способы обработки нажатий (touch events) существуют в React Native, и как правильно их использовать?
	1. ++
### Блок вопросов по Expo: 
не знает expo
1. Что такое Expo и как он помогает в разработке приложений на React Native?
2. Чем отличаются `Expo Go` и `Dev Build` в контексте работы с Expo?
3. Какие ограничения накладывает использование приложения `Expo Go` при разработке приложений с использованием React Native?
4. Что такое нативные модули (native modules) в React Native и в каких случаях их необходимо использовать?
5. Как можно сохранять данные между сеансами (например, на устройстве) в приложении, разработанном на React Native?
	1. async storage
	2. secure staroge
	3. sql
6. Что такое `expo-router`, как он работает и какие преимущества он предоставляет при разработке приложений с использованием Expo?

### live-coding для проверки знаний react hooks и react native

Реализовать React Native компонент, /позволяющий пользователю по нажатию на кнопку добавлять случайную машину из списка доступных в свой личный "гараж".
https://codesandbox.io/p/sandbox/happy-sound-dnzck5?file=%2Fsrc%2FApp.js%3A37%2C57