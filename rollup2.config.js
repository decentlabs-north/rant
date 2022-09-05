import commonjs from '@rollup/plugin-commonjs'
import polyfills from 'rollup-plugin-node-polyfills'
import resolve from '@rollup/plugin-node-resolve'
import livereload from 'rollup-plugin-livereload'
import { terser } from 'rollup-plugin-terser'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import css from 'rollup-plugin-css-only'
import crass from 'crass'
import replace from '@rollup/plugin-replace'

const version = JSON.parse(require('fs').readFileSync('./package.json')).version
const commit = require('child_process')
  .execSync('git rev-parse HEAD')
  ?.toString('utf8').trim()

const production = !process.env.ROLLUP_WATCH
export default {
  input: 'app.js',
  output: {
    sourcemap: true, // !production, costs about ~2MB
    format: 'es',
    name: 'rant',
    file: 'pub/build/bundle.js'
  },
  plugins: [
    css({ output: 'bundle.css', sourceMap: false }),
    replace({
      preventAssignment: true,
      __ENV__: production ? 'production' : 'dev',
      __VERSION__: version,
      __COMMIT__: commit
    }),
    resolve({
      browser: true,
      dedupe: ['sodium-universal'],
      preferBuiltins: false
    }),
    commonjs(),
    polyfills({ sourceMap: true, include: ['buffer'] }),
    !production && serve(),
    !production && livereload('pub/'),
    production && terser(),
    production && petrify()
  ],
  watch: {
    clearScreen: false
  }
}

function serve () {
  const port = process.env.PORT || 3000
  let server
  function toExit () {
    if (server) server.kill(0)
  }
  return {
    writeBundle () {
      if (server) return
      server = require('child_process').spawn('npm',
        [
          'run', 'start', '--', '--dev', '--host 0.0.0.0', `--port ${port}`
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
