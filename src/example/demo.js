/*
 * @Description:
 * @Version:
 * @Autor: qinjunyi
 * @Date: 2021-02-19 15:14:39
 * @LastEditors: qinjunyi
 * @LastEditTime: 2021-02-19 18:01:35
 */
import MyPromise from '../../index.js'

function test() {
  const promiseTmp = new MyPromise((resolve, reject) => {
    setTimeout(function () {
      resolve(2222)
    }, 1000)
  })
  promiseTmp.then((val) => {
    console.log(val)
  })
}
test()
