/*
 * @Description:
 * @Version:
 * @Autor: qinjunyi
 * @Date: 2021-02-19 11:15:23
 * @LastEditors: qinjunyi
 * @LastEditTime: 2021-02-23 10:10:03
 */
import { status } from './src/constants/index.js'

function MyPromise(executor) {
  let self = this
  self.status = status.PENDING
  self.value = null
  self.reason = null
  self.onResolvedCallbacks = []
  self.onRejectedCallbacks = []

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
  function reject(reason) {
    if (self.status === status.PENDING) {
      self.status = status.REJECTED
      self.reason = reason
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
function resolvePromise(promiseObj, result, resolve, reject) {
  let called = false
  if (promiseObj === result) return reject(new TypeError('循环引用'))
  if (result instanceof MyPromise) {
    // 对应标准2.3.2节
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
    return
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

MyPromise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected)
}

MyPromise.prototype.finally = function (fn) {
  return this.then(
    (val) => {
      fn()
      return val
    },
    (err) => {
      fn()
      throw err
    }
  )
}

MyPromise.prototype.all = function (promiseArr) {
  let len = promiseArr.length
  let result = []
  return new MyPromise((resolve, reject) => {
    promiseArr.forEach((promise, index) => {
      promise.then((val) => {
        result[index] = val
        if (result.length === len) {
          resolve(result)
        }
      }, reject)
    })
  })
}
MyPromise.prototype.race = function (promiseArr) {
  return new MyPromise((resolve, reject) => {
    promiseArr.forEach((promise) => {
      promise.then((val) => {
        resolve(val)
      }, reject)
    })
  })
}
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

MyPromise.prototype.done = function () {
  return this.catch((reason) => {
    throw reason
  })
}

MyPromise.prototype.resolve = function (val) {
  let promiseTmp = new MyPromise((resolve, reject) => {
    resolvePromise(promiseTmp, val, resolve, reject)
  })
  return promiseTmp
}

MyPromise.prototype.reject = function (reason) {
  return new MyPromise((resolve, reject) => {
    reject(reason)
  })
}
MyPromise.prototype.stop = function () {
  return new MyPromise(() => {})
}
MyPromise.prototype.deferred = function () {
  var dfd = {}
  dfd.myPromise = new MyPromise((resolve, reject) => {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}
export default MyPromise
