import svelte from 'rollup-plugin-svelte'
// import inject from '@rollup/plugin-inject'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import polyfills from 'rollup-plugin-node-polyfills'
import livereload from 'rollup-plugin-livereload'
import { terser } from 'rollup-plugin-terser'
import css from 'rollup-plugin-css-only'
import crass from 'crass'
import analyze from 'rollup-plugin-analyzer'

const production = !process.env.ROLLUP_WATCH

// On creating a pipeline for outputting html.
// https://github.com/bdadam/rollup-plugin-html
export default {
  input: 'src/main.js',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'public/build/bundle.js'
  },
  plugins: [
    svelte({
      compilerOptions: { dev: !production }
    }),
    css({ output: 'bundle.css', sourceMap: false }),
    resolve({
      browser: true,
      dedupe: ['svelte', 'sodium-universal'],
      preferBuiltins: false
    }),
    commonjs(),
    polyfills({ sourceMap: true, include: ['buffer'] }),
    !production && serve(),
    !production && livereload('public'),
    production && analyze({ summaryOnly: true }),
    production && terser({ output: { comments: false } }),
    production && petrify('public/index.html', 'docs/index.html')
  ],
  watch: {
    clearScreen: false
  }
}
function serve () {
  let server
  function toExit () {
    if (server) server.kill(0)
  }
  return {
    writeBundle () {
      if (server) return
      server = require('child_process').spawn('npm',
        [
          'run', 'start', '--', '--dev', '--host 0.0.0.0', '--port 5000'
        ],
        {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: true
        })

      process.on('SIGTERM', toExit)
      process.on('exit', toExit)
    }
  }
}

const { readFileSync, writeFileSync, mkdirSync } = require('fs')
const { dirname } = require('path')
function petrify (input, output) {
  return {
    writeBundle (opts, bundle) {
      let html = readFileSync(input).toString('utf8')

      // fugly inline css
      const cexp = /<link[^>]+href=['"]([^'"]+\.css)['"][^>]*>/
      let m
      while ((m = html.match(cexp))) {
        const file = `public${m[1]}`
        const css = crass.parse(readFileSync(file))
          .optimize({ o1: true })
        console.log(`Inlining ${file}`)
        html = html.replace(m[0], `
          <!-- inline ${file} -->
          <style>${css.toString()}</style>
        `)
      }

      // inline js
      for (const name in bundle) {
        const artifact = bundle[name]
        // inline js when found.
        const rexp = new RegExp(`<script[^>]+src=[^>]+${artifact.fileName}[^>]+>`)
        if (html.match(rexp)) {
          console.log('Inlining artifact', name)
          const chunks = html.replace(rexp, '<script>¤¤¤PITA¤¤¤')
            .split('¤¤¤PITA¤¤¤')
          const code = "window.addEventListener('DOMContentLoaded',ev => {\n" +
                        artifact.code + '\n})'
          html = chunks[0] + code + chunks[1]
        }
      }
      // write out the destination
      mkdirSync(dirname(output), { recursive: true })
      writeFileSync(output, Buffer.from(html, 'utf8'))
      console.log(output, `written ${html.length >> 10}k`)
    }
  }
}
