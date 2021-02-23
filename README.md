<!--
 * @Description:
 * @Version:
 * @Autor: qinjunyi
 * @Date: 2021-02-19 11:18:58
 * @LastEditors: qinjunyi
 * @LastEditTime: 2021-02-23 14:39:14
-->

## 基于 A+规范的 Promise 实现

### 前言

JavaScript 作为单线程编程语言，在异步流程控制方面有其独特的解决方案，且更新换代的速度也是非常快，从最原始的回调函数，到 Promise、Generator 以及目前实际开发中常用的 async/await 语法糖，不管是易用性还是代码可读性都有了很大的提升。本文旨在参考[Promise/A+规范](https://promisesaplus.com/)（手动撸一个 Promise 前建议先浏览规范）实现一个基本满足规范要求的 Promise。什么是 Promise？建议参考阮一峰老师的[es6 入门](https://es6.ruanyifeng.com/#docs/promise)

---

### 骨架

Promise 构造函数接受一个可执行函数的参数，此函数有两个形参 resolve 和 reject，所接受的实参类型都是 Function。resolve 用来处理 Promise 正常返回时的值，reject 用来处理各类异常值，其定义以及实现是在 Promise 构造函数中，实例化过程中这个可执行函数会被执行。要注意的是，该函数执行要放在 try/catch 中以便异常捕获。

```js
function MyPromise(executor) {
  function resolve() {}
  function reject() {}
  try {
    executor(resolve, reject)
  } catch (err) {
    reject(err)
  }
}
```

---

### 状态控制

Promise 对象内部有三个状态 pending,fulfilled,rejected,通俗地说依次就是正在进行中，成功，失败。规范约定了初始状态为 pending，只有 Promise 保存的异步操作的结果才能决定内部的最终状态，其他任何操作都不能改变该状态，且该状态一经改变就不会再变了。状态改变只有两种可能：从 pending 变为 fulfilled 和从 pending 变为 rejected。因此可声明三个常量来存储这三种状态。

```js
// ./src/constants/status.constants.js
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'

//./index.js
function MyPromise(executor) {
  this.status = status.PENDING
  function resolve() {
    if (self.status === status.PENDING) {
      this.status = status.FULFILLED
    }
  }
  function reject() {
    if (self.status === status.PENDING) {
      this.status = status.REJECTED
    }
  }
  try {
    executor(resolve, reject)
  } catch (err) {
    reject(err)
  }
}
```

---

### 异步结果处理

当异步操作完成，过程成功或失败时需要有变量来存储结果，因此可以声明 value 来存储成功值，reason 来存储失败时的原因

```js
function MyPromise(executor) {
  let self = this
  self.status = status.PENDING
  self.value = null
  self.reason = null
  function resolve(value) {
    if (self.status === status.PENDING) {
      self.value = value
      self.status = status.FULFILLED
    }
  }
  function reject(reason) {
    if (self.status === status.PENDING) {
      self.reason = reason
      self.status = status.REJECTED
    }
  }
  try {
    executor(resolve, reject)
  } catch (err) {
    reject(err)
  }
}
```

---

### .then()方法

规范约定了 Promise 有一个.then()方法,该方法有两个形参 onFulfilled，onRejected，二者都是 Function 类型。前者是在状态变为 fulfilled 时触发，接受存储成功结束异步操作结果的 value 作为参数，后者是在状态变为 rejected 时触发，接受异步操作有抛异常结果的 reason 作为参数。以此为据，实现一个基础版的 then 方法

```js
MyPromise.prototype.then = function (onFulfilled, onRejected) {
  let self = this
  if (self.status === status.FULFILLED) {
    onFulfilled(self.value)
  }
  if (self.status === status.REJECTED) {
    onRejected(self.reason)
  }
}
```

基础版 then 方法，其实只处理了同步改变状态的场景，若内部状态处于 pending，结束异步操作是在下一个 loop，那么在执行 then 时 self.value 或 self.reason 为 null，且 onFulfilled 和 onRejected 都没有触发时机。因此可利用订阅发布的思想,声明 onResolvedCallbacks 和 onRejectedCallbacks 两个数组来进一步完善 then 和 Promise 的构造函数

```js
function MyPromise(executor) {
  let self = this
  self.status = status.PENDING
  self.value = null
  self.reason = null
  self.onResolvedCallbacks = []
  self.onRejectedCallbacks = []
  function resolve(value) {
    if (self.status === status.PENDING) {
      self.value = value
      self.status = status.FULFILLED
      //状态改变代表异步操作结束，执行对应数组中订阅的回调函数
      self.onResolvedCallbacks.forEach((onResolvedCallback) => {
        onResolvedCallback()
      })
    }
  }
  function reject(reason) {
    if (self.status === status.PENDING) {
      self.reason = reason
      self.status = status.REJECTED
      //同resolve
      self.onRejectedCallbacks.forEach((onRejectedCallback) => {
        onRejectedCallback()
      })
    }
  }
  try {
    executor(resolve, reject)
  } catch (err) {
    reject(err)
  }
}

MyPromise.prototype.then = function (onFulfilled, onRejected) {
  let self = this
  //未结束异步操作时先订阅
  if (self.status === status.PENDING) {
    self.onFulfilledCallbacks.push(() => {
      onFulfilled(self.value)
    })
    self.onRejectedCallbacks.push(() => {
      onRejected(self.reason)
    })
  }
  if (self.status === status.FULFILLED) {
    onFulfilled(self.value)
  }
  if (self.status === status.REJECTED) {
    onRejected(self.reason)
  }
}
```

规范 2.2.7 小节描述 then 需要返回一个 promise，且对 onFulfilled 和 onRejected 对返回结果处理上也有要求。为了更加语义化，返回的 promise 命名为 returnPromise，onFulfilled 和 onRejected 的返回结果分别赋值给 success 和 failed 变量。规范要求 onFulfilled 和 onRejected 正常执行时返回的值要交给一个`Promise Resolution Procedure(Promise决议程序) [[Resolve]](promise2, x)`处理（先不关心这个决议程序具体实现，暂且声明其为 resolvePromise），若有抛出异常 e 则 returnPromise 被 rejected，且以 e 作为 reason。

```js
MyPromise.prototype.then = function (onFulfilled, onRejected) {
  let self = this
  let returnPromise = new MyPromise((resolve, reject) => {
    //未结束异步操作时先订阅
    if (self.status === status.PENDING) {
      self.onFulfilledCallbacks.push(() => {
        try {
          let success = onFulfilled(self.value)
          resolvePromise(returnPromise, success, resolve, reject)
        } catch (err) {
          reject(err)
        }
      })
      self.onRejectedCallbacks.push(() => {
        try {
          let failed = onRejected(self.reason)
          resolvePromise(returnPromise, failed, resolve, reject)
        } catch (err) {
          reject(err)
        }
      })
    }
    if (self.status === status.FULFILLED) {
      try {
        let success = onFulfilled(self.value)
        resolvePromise(returnPromise, success, resolve, reject)
      } catch (err) {
        reject(err)
      }
    }
    if (self.status === status.REJECTED) {
      try {
        let failed = onRejected(self.reason)
        resolvePromise(returnPromise, failed, resolve, reject)
      } catch (err) {
        reject(err)
      }
    }
  })
  return returnPromise
}
```

---

### Promise Resolution Procedure(Promise 决议程序)

规范 2.3 针对 resolvePromise 进行了详细的描述，贴上该小节的一个中文版

```text
Promise Resolution Procedure 是以一个promise和一个value为输入的抽象操作，我们将其表示为[[Resolve]](promise, x)。如果 x 是一个 thenable 且行为有几分像promise时，Promise Resolution Procedure 会试图让 promise 变为与 x 相同的状态。否则，promise 会被决议程序以 x 为值 fulfilled。

这种处理 thenable 的方式可以使不同的promise实现之间可以互操作，只要这些实现对外暴露了遵循 Promises/A+规范 的 then 方法即可。这种方式也使得遵循 Promises/A+规范 的实现可以“同化”那些没有遵循 Promises/A+规范 但具备合理的 then 方法的promise实现。

执行 [[Resolve]](promise, x) 需运行以下步骤：

2.3.1. 如果 promise 和 x 指向同一个对象，则 reject promise 并且以 TypeError 作为 reason。

2.3.2. 如果 x 是一个promise，则采用 x 的状态 [详情见3.4]:

    2.3.2.1. 如果 x 处于 pending 状态，则 promise 必须保持 pending 状态直到 x 被 fulfilled 或 rejected。

    2.3.2.2. 当 x 变为或已处于 fulfilled 时，用相同的 value 来 fulfill promise。

    2.3.2.3. 当 x 变为或已处于 rejected 时，用相同的 reason 来 reject promise。

2.3.3. 如果 x 是一个对象或函数，

    2.3.3.1. 令 then 指向 x.then。[详情见3.5]

    2.3.3.2. 如果访问 x.then 属性导致抛出异常 e，则以 e 为 reason 来 reject promise。

    2.3.3.3. 如果 then 是一个函数，则调用它，并且以 x 作为 this，以 resolvePromise 作为第一个参数，以 rejectPromise 作为第二个参数，且：

        2.3.3.3.1. 如果或当 resolvePromise 以一个值 y 被调用了，则执行 [[Resolve]](promise, y)。

        2.3.3.3.2. 如果或当 rejectPromise 以一个值 r 被调用了，则以 r 来 reject promise。

        2.3.3.3.3. 如果 resolvePromise 和 rejectPromise 都被调用了，或者某个已被被多次调用了，则首次发生的调用生效，其余所有调用都被忽略。

        2.3.3.3.4. 如果调用 then 抛出异常 e：

            2.3.3.3.4.1 如果 resolvePromise 或 rejectPromise 已经被调用过了，则忽略这个异常。

            2.3.3.3.4.2 否则，以 e 来 reject promise。

    2.3.3.4. 如果 then 不是函数，则以 x 来 fulfill promise。

2.3.4. 如果 x 既不是对象也不是函数，则以 x 来 fulfill promise。

如果一个promise被一个 thenable 决议，且此 thenable 在一个循环的thenable链中，[[Resolve]](promise, thenable) 的递归特性会导致 [[Resolve]](promise, thenable) 再次被调用，根据上面的算法，这会导致无限递归。因此我们鼓励(但不强制要求)promise实现时能检测无限递归，并在出现无限递归时以一个 TypeError 来 reject promise。
```

对照该小节的要求实现 resolvePromise

```js
function resolvePromise(promiseObj, result, resolve, reject) {
  //对应2.3.3.3.3小节，做一个防御防止多次改变内部状态
  let called = false
  if (promiseObj === result) return reject(new TypeError('循环引用'))
  if (result instanceof MyPromise) {
    // 如果result的状态还没有确定，那么它是有可能被一个thenable决定最终状态和值的
    // 所以这里需要做一下处理，而不能一概的以为它会被一个“正常”的值resolve
    if (result.status === status.PENDING) {
      result.then((val) => {
        resolvePromise(promiseObj, val, resolve, reject)
      }, reject)
    } else {
      // 但如果这个Promise的状态已经确定了，那么它肯定有一个“正常”的值，而不是一个thenable，所以这里直接取它的状态
      result.then(resolve, reject)
    }
  } else if (
    Object.prototype.toString.call(result) === '[object Object]' ||
    Object.prototype.toString.call(result) === '[object Function]'
  ) {
    let then = result.then
    if (typeof then === 'function') {
      then.call(
        result,
        (val) => {
          if (called) return
          called = true
          // 对应2.3.3.3.1正常结束异步操作后resolve的val有可能还是promise或者是具有then方法等，再次resolvePromise，直到该值为基本类型或者非thenable
          resolvePromise(promiseObj, val, resolve, reject)
        },
        (reason) => {
          if (called) return
          called = true
          reject(reason)
        }
      )
    } else {
      if (called) return
      called = true
      resolve(result)
    }
  } else {
    resolve(result)
  }
}
```

---

### .then()保持异步执行

规范 3.1 中有提到 then 需要保持异步执行，且属于 js 执行机制 event loop 中的为微任务（micro-task），本文中为了方便直接用宏任务 setTimeout 代替实现

```js
MyPromise.prototype.then = function (onFulfilled, onRejected) {
  let self = this
  onFulfilled =
    typeof onFulfilled === 'function' ? onFulfilled : (value) => value
  onRejected =
    typeof onRejected === 'function'
      ? onRejected
      : (reason) => {
          throw reason
        }
  let returnPromise = new MyPromise((resolve, reject) => {
    if (self.status === status.PENDING) {
      self.onResolvedCallbacks.push(() => {
        setTimeout(() => {
          try {
            let success = onFulfilled(self.value)
            resolvePromise(returnPromise, success, resolve, reject)
          } catch (err) {
            reject(err)
          }
        }, 0)
      })
      self.onRejectedCallbacks.push(() => {
        setTimeout(() => {
          try {
            let failed = onRejected(self.reason)
            resolvePromise(returnPromise, failed, resolve, reject)
          } catch (err) {
            reject(err)
          }
        }, 0)
      })
    }
    if (self.status === status.FULFILLED) {
      setTimeout(() => {
        try {
          let success = onFulfilled(self.value)
          resolvePromise(returnPromise, success, resolve, reject)
        } catch (err) {
          reject(err)
        }
      }, 0)
    }
    if (self.status === status.REJECTED) {
      setTimeout(() => {
        try {
          let failed = onRejected(self.reason)
          resolvePromise(returnPromise, failed, resolve, reject)
        } catch (err) {
          reject(err)
        }
      }, 0)
    }
  })
  return returnPromise
}
```

---

### 完善

#### 构造函数中的 resolve

一个实例 resolve 时接受的 value 参数若也是 Promise 那么本实例的内部状态改变会受 value 是否已经改变内部状态的影响，因此应该交给 then 处理

```js
//MyPromise
...
function resolve(value) {
    if (value instanceof MyPromise) {
      value.then(resolve, reject)
    }
    if (self.status === status.PENDING) {
      self.status = status.FULFILLED
      self.value = value
      self.onResolvedCallbacks.forEach((onResolvedCallback) => {
        onResolvedCallback()
      })
    }
  }
...
```

#### onFulfilled 和 onRejected 默认值处理

在实际应用中，会有如下情况

```js
new Promise((resolve) => resolve('ok'))
  .then()
  .catch()
  .then(function (val) {
    console.log(val)
  })
```

即 then 不传 onFulfilled 和 onRejected，但发现打印的日志仍能显示`ok`，可见 onFulfilled 和 onRejected 是有默认值的，这其实也是 Promise 值穿透的特性。上述代码等同于

```js
new Promise((resolve) => resolve('ok'))
  .then(function (val) {
    return val
  })
  .catch(function (reason) {
    throw reason
  })
  .then(function (val) {
    console.log(val)
  })
```

完善 then 方法,给 onFulfilled 和 onRejected 赋默认值

```js
MyPromise.prototype.then = function (onFulfilled, onRejected) {
...
    onFulfilled =
        typeof onFulfilled === 'function' ? onFulfilled : (value) => value
    onRejected =
        typeof onRejected === 'function'
        ? onRejected
        : (reason) => {
            throw reason
            }
...
}
```

---

### 原型上的方法

原生 Promise 原型上还有很多方法，此处简单介绍几种

#### catch

在 then 以及 resolvePromise 所有处理异步操作结果的同步代码都写在了 try/catch 中，若有抛出异常都会被 returnPromise 的 reject 捕获，因此 catch 其实就是一个特殊的 then，通过这个特殊的 then 的 onRejected 捕获 reject 的错误或前面 Promise 的 onRejected 默认值 throw 的 reason

```js
MyPromise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected)
}
```

#### cancelable

实际开发中会有需求取消一个 Promise 的执行，可以借助一个辅助函数以及 Promise.race()来实现。外部可能通过执行 helper.cancel()提前改变状态以此“取消”promiseObj 的执行

```js
MyPromise.prototype.cancelable = function (promiseObj, helper) {
  return MyPromise.race([
    promiseObj,
    new MyPromise((resolve, reject) => {
      helper.cancel = () => {
        reject(new TypeError('promise cancel'))
      }
    })
  ])
}
```

#### stop

cancelable 是间接取消某个 Promise 执行，那如何取消一个 Promise 链式调用？出发点是只要返回一个永远处于 pending 状态的 Promise 就不会继续向下执行 then 或 catch 了，也就做到了停止链式调用

```js
MyPromise.prototype.stop = function () {
  return new MyPromise(() => {})
}
```

但也有缺点，所有链式调用的回调函数无法被垃圾回收了，造成内存资源浪费

#### done

then 方法中的 onFulfilled 是在 try/catch 中执行的，错误会被 catch 到，但是若后续没有 then 或 catch 了，这个错误无法被捕获，就没有任何异常，换种说法即`Promise 有可能会吃掉错误`。  
实现 done 方法作为 Promise 链式调用的最后一步，用来向全局抛出没有被 Promise 内部捕获的错误，并且不再返回一个 Promise，来处理错误被吃掉的问题

```js
MyPromise.prototype.done = function () {
  return this.catch((reason) => {
    throw reason
  })
}
```

至此，一个基本符合规范的 Promise 已经实现，原型上还有一些常用的方法，例如 all、race、resolve、reject 等，在此不一一列出，可参考[实现源码](https://github.com/qinjunyi/myPromise/blob/master/index.js)

---

### 参考规范

[Promise/A+规范](https://promisesaplus.com/)
