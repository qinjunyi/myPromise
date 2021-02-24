!(function (t, n) {
  'object' == typeof exports && 'undefined' != typeof module
    ? (module.exports = n())
    : 'function' == typeof define && define.amd
    ? define(n)
    : ((t =
        'undefined' != typeof globalThis
          ? globalThis
          : t || self).MyPromise = n())
})(this, function () {
  'use strict'
  var t = 'pending',
    n = 'fulfilled',
    e = 'rejected'
  function o(c) {
    var r = this
    function u(n) {
      r.status === t &&
        ((r.status = e),
        (r.reason = n),
        r.onRejectedCallbacks.forEach(function (t) {
          t()
        }))
    }
    ;(r.status = t),
      (r.value = null),
      (r.reason = null),
      (r.onResolvedCallbacks = []),
      (r.onRejectedCallbacks = [])
    try {
      c(function e(c) {
        c instanceof o && c.then(e, u),
          r.status === t &&
            ((r.status = n),
            (r.value = c),
            r.onResolvedCallbacks.forEach(function (t) {
              t()
            }))
      }, u)
    } catch (t) {
      u(t)
    }
  }
  function c(n, e, r, u) {
    var i = !1
    if (n === e) return u(new TypeError('循环引用'))
    if (e instanceof o)
      e.status === t
        ? e.then(function (t) {
            c(n, t, r, u)
          }, u)
        : e.then(r, u)
    else if (
      '[object Object]' === Object.prototype.toString.call(e) ||
      '[object Function]' === Object.prototype.toString.call(e)
    ) {
      var f = e.then
      if ('function' == typeof f)
        f.call(
          e,
          function (t) {
            i || ((i = !0), c(n, t, r, u))
          },
          function (t) {
            i || ((i = !0), u(t))
          }
        )
      else {
        if (i) return
        ;(i = !0), r(e)
      }
    } else r(e)
  }
  return (
    (o.prototype.then = function (r, u) {
      var i = this
      ;(r =
        'function' == typeof r
          ? r
          : function (t) {
              return t
            }),
        (u =
          'function' == typeof u
            ? u
            : function (t) {
                throw t
              })
      var f = new o(function (o, a) {
        i.status === t &&
          (i.onResolvedCallbacks.push(function () {
            setTimeout(function () {
              try {
                var t = r(i.value)
                c(f, t, o, a)
              } catch (t) {
                a(t)
              }
            }, 0)
          }),
          i.onRejectedCallbacks.push(function () {
            setTimeout(function () {
              try {
                var t = u(i.reason)
                c(f, t, o, a)
              } catch (t) {
                a(t)
              }
            }, 0)
          })),
          i.status === n &&
            setTimeout(function () {
              try {
                var t = r(i.value)
                c(f, t, o, a)
              } catch (t) {
                a(t)
              }
            }, 0),
          i.status === e &&
            setTimeout(function () {
              try {
                var t = u(i.reason)
                c(f, t, o, a)
              } catch (t) {
                a(t)
              }
            }, 0)
      })
      return f
    }),
    (o.prototype.catch = function (t) {
      return this.then(null, t)
    }),
    (o.prototype.finally = function (t) {
      return this.then(
        function (n) {
          return t(), n
        },
        function (n) {
          throw (t(), n)
        }
      )
    }),
    (o.prototype.all = function (t) {
      var n = t.length,
        e = []
      return new o(function (o, c) {
        t.forEach(function (t, r) {
          t.then(function (t) {
            ;(e[r] = t), e.length === n && o(e)
          }, c)
        })
      })
    }),
    (o.prototype.race = function (t) {
      return new o(function (n, e) {
        t.forEach(function (t) {
          t.then(function (t) {
            n(t)
          }, e)
        })
      })
    }),
    (o.prototype.cancelable = function (t, n) {
      return o.race([
        t,
        new o(function (t, e) {
          n.cancel = function () {
            e(new TypeError('promise cancel'))
          }
        })
      ])
    }),
    (o.prototype.done = function () {
      return this.catch(function (t) {
        throw t
      })
    }),
    (o.prototype.resolve = function (t) {
      var n = new o(function (e, o) {
        c(n, t, e, o)
      })
      return n
    }),
    (o.prototype.reject = function (t) {
      return new o(function (n, e) {
        e(t)
      })
    }),
    (o.prototype.stop = function () {
      return new o(function () {})
    }),
    (o.prototype.deferred = function () {
      var t = {}
      return (
        (t.myPromise = new o(function (n, e) {
          ;(t.resolve = n), (t.reject = e)
        })),
        t
      )
    }),
    o
  )
})
//# sourceMappingURL=main.js.map
