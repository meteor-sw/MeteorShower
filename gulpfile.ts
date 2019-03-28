'use strict'

import * as fs from 'fs'
import { spawn } from 'child_process'

import * as gulp from 'gulp'
import * as gutil from 'gulp-util'
import * as plumber from 'gulp-plumber'
import * as mustache from 'gulp-mustache'
import * as rename from 'gulp-rename'
import * as _if from 'gulp-if'
import * as jsonminify from 'gulp-jsonminify'
import * as zip from 'gulp-zip'
import tslint from 'gulp-tslint'

import del from 'del'
import * as runSequence from 'run-sequence'
import * as _ from 'lodash'


// ---------------------------------------------------------------------------

interface PackageJSON {
  version: string;
}
const pkg: PackageJSON = JSON.parse(fs.readFileSync('./package.json').toString('utf-8'))
const isDev = process.argv.includes('watch')


// ----- assets ---------------------------------------------------------------

gulp.task('assets', () =>
  gulp.src('./assets/**/*')
    .pipe(gulp.dest('./dist'))
)

gulp.task('assets-watch', () =>
  gulp.watch('./assets/**/*', gulp.task('assets'))
)


// ----- clean ----------------------------------------------------------------

gulp.task('clean', async () =>
  await del(['dist', '*.zip'])
)


// ----- manifest -------------------------------------------------------------

gulp.task('manifest', () =>
  gulp.src('./src/manifest.json.mustache')
    .pipe(plumber())
    .pipe(mustache({
      version: pkg.version,
    }))
    .pipe(rename({ extname: '' }))
    .pipe(_if(!isDev, jsonminify()))
    .pipe(gulp.dest('./dist'))
)

gulp.task('manifest-watch', () =>
  gulp.watch('./src/manifest.json.mustache', gulp.task('manifest'))
)


// ----- tslint ---------------------------------------------------------------

gulp.task('tslint', () =>
  gulp.src('src/**/*.ts')
    .pipe(plumber())
    .pipe(tslint({ formatter: 'prose' }))
    .pipe(tslint.report({ summarizeFailureOutput: true }))
)


// ----- webpack --------------------------------------------------------------

function runWebpack(opts: string[], cb: (arg: any) => any) {
  const message = 'Run webpack with options `' + opts.join(' ') + '`'
  gutil.log(message)

  const child = spawn('webpack', opts)
  child.stdout.on('data', data => process.stdout.write(data))
  child.stderr.on('data', data => process.stderr.write(data))
  child.on('close', cb)
}


gulp.task('webpack-prod', cb =>
  runWebpack([], cb)
)

gulp.task('webpack-watch', cb =>
  runWebpack(['--watch', '--progress'], cb)
)


// ----- zip ------------------------------------------------------------------

gulp.task('zip.archive', () =>
  gulp.src('dist/**/*')
    .pipe(zip('archive.zip'))
    .pipe(gulp.dest('.'))
)

gulp.task('zip.source', () =>
  gulp.src([
    'assets/**/*',
    'src/**/*',
    'test/**/*',
    '.node-version',
    '.editorconfig',
    '.gitignore',
    '*.js',
    '*.json',
    '*.yml',
    '*.md',
    'yarn.lock',
    'LICENSE',
  ], { base: '.' })
    .pipe(zip('source.zip'))
    .pipe(gulp.dest('.'))
)

gulp.task('zip', gulp.parallel('zip.archive', 'zip.source'))


// ----- for production -------------------------------------------------------

gulp.task('build-prod', gulp.series(
  'clean',
  gulp.parallel(
    'assets',
    'manifest',
    'webpack-prod',
  ),
  'zip',
))

gulp.task('default', gulp.task('build-prod'))


// ----- for development ------------------------------------------------------

gulp.task('build-watch', gulp.series(
  'assets',
  'manifest',
))

gulp.task('watch', gulp.series(
  'clean',
  'build-watch',
  gulp.parallel(
    'assets-watch',
    'manifest-watch',
    'webpack-watch',
  ),
))


// ----- for test -------------------------------------------------------------

gulp.task('test', gulp.series('tslint'))


// vim: se et ts=2 sw=2 sts=2 ft=typescript :
