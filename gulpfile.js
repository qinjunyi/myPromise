/*
 * @Description:
 * @Version:
 * @Autor: qinjunyi
 * @Date: 2021-02-24 10:29:12
 * @LastEditors: qinjunyi
 * @LastEditTime: 2021-02-24 16:46:32
 */
const gulp = require('gulp')
const rollup = require('rollup')
const clean = require('gulp-rimraf')
const { babel } = require('@rollup/plugin-babel')
const { terser } = require('rollup-plugin-terser')
/********************javascript*************************/
gulp.task('build', async function () {
  const bundle = await rollup.rollup({
    input: 'index.js',
    plugins: [
      babel({
        exclude: 'node_modules/**', // 防止打包node_modules下的文件
        babelHelpers: 'runtime' // 使plugin-transform-runtime生效
      }),
      terser()
    ],
    onwarn({ loc, frame, message }) {
      if (loc) {
        console.warn(`${loc.file} (${loc.line}:${loc.column}) ${message}`)
        if (frame) console.warn(frame)
      } else {
        console.warn(message)
      }
    }
  })
  await bundle.write({
    file: './dist/main.js',
    format: 'umd',
    name: 'MyPromise',
    sourcemap: true
  })
})
/********************clean*************************/
gulp.task('clean', function () {
  return gulp.src(['dist'], { read: false, allowEmpty: true }).pipe(clean())
})
gulp.task('default', gulp.series('clean', 'build'))
