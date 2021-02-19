/*
 * @Description:
 * @Version:
 * @Autor: qinjunyi
 * @Date: 2021-02-19 11:15:23
 * @LastEditors: qinjunyi
 * @LastEditTime: 2021-02-19 18:30:08
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
MyPromise.prototype.then = function (onFulfilled, onRejected) {
  let self = this
  let returnPromise = new MyPromise((resolve, reject) => {
    if (self.status === status.PENDING) {
      self.onResolvedCallbacks.push(() => {
        try {
          let success = onFulfilled(self.value)
          self.resolvePromise(returnPromise, success, resolve, reject)
        } catch (err) {
          reject(err)
        }
      })
      self.onRejectedCallbacks.push(() => {
        try {
          let failed = onRejected(self.reason)
          self.resolvePromise(returnPromise, failed, resolve, reject)
        } catch (err) {
          reject(err)
        }
      })
    }
    if (self.status === status.FULFILLED) {
      try {
        let success = onFulfilled(self.value)
        self.resolvePromise(returnPromise, success, resolve, reject)
      } catch (err) {
        reject(err)
      }
    }
    if (self.status === status.REJECTED) {
      try {
        let failed = onRejected(self.reason)
        self.resolvePromise(returnPromise, failed, resolve, reject)
      } catch (err) {
        reject(err)
      }
    }
  })
  return returnPromise
}
MyPromise.prototype.resolvePromise = function (
  promiseObj,
  result,
  resolve,
  reject
) {
  let self = this
  let called = false
  if (promiseObj === result) return reject(new TypeError('循环引用'))
  if (
    result !== null &&
    (Object.prototype.toString.call(result) === '[object Object]' ||
      Object.prototype.toString.call(result) === '[object Function]')
  ) {
    let then = result.then
    if (typeof then === 'function') {
      then.call(
        result,
        (val) => {
          if (called) return
          called = true
          self.resolvePromise(promiseObj, val, resolve, reject)
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
export default MyPromise
