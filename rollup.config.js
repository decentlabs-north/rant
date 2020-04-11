import svelte from 'rollup-plugin-svelte'
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import livereload from 'rollup-plugin-livereload'
import { terser } from 'rollup-plugin-terser'
import { sizeSnapshot } from 'rollup-plugin-size-snapshot'
import builtins from 'rollup-plugin-node-builtins'
import globals from 'rollup-plugin-node-globals'

const production = !process.env.ROLLUP_WATCH

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
      // enable run-time checks when not in production
      dev: !production,
      // we'll extract any component CSS out into
      // a separate file - better for performance
      css: css => {
        css.write('public/build/bundle.css')
      }
    }),

    // If you have external dependencies installed from
    // npm, you'll most likely need these plugins. In
    // some cases you'll need additional configuration -
    // consult the documentation for details:
    // https://github.com/rollup/plugins/tree/master/packages/commonjs
    resolve({
      browser: true,
      dedupe: ['svelte', 'sodium-universal']
    }),
    commonjs(),

    // These should probably be replaced by injecting
    // https://github.com/feross/buffer
    globals(),
    builtins(),


    // In dev mode, call `npm run start` once
    // the bundle has been generated
    !production && serve(),

    // Watch the `public` directory and refresh the
    // browser on changes when not in production
    !production && livereload('public'),

    // bundle size stats
    production && sizeSnapshot(),

    // If we're building for production (npm run build
    // instead of npm run dev), minify
    production && terser(),
    production && petrify('public/index.html', 'docs/index.html')
  ],
  watch: {
    clearScreen: false
  }
}

function serve() {
  let started = false

  return {
    writeBundle() {
      if (!started) {
        started = true

        require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
          stdio: ['ignore', 'inherit', 'inherit'],
          shell: true
        })
      }
    }
  }
}


const { readFileSync, writeFileSync, mkdirSync } = require('fs')
const { dirname } = require('path')
function petrify (input, output) {
  return {
    writeBundle (opts, bundle) {
      let html = readFileSync(input).toString('utf8')

      // inline js
      for (const name in bundle) {
        const artefact = bundle[name]
        // inline js when found.
        const rexp = new RegExp(`<script[^>]+src=[^>]+${artefact.fileName}[^>]+>`)
        if (html.match(rexp)) {
          console.log('Inlining artefact', name)
          html = html.replace(rexp, `<script>window.addEventListener('DOMContentLoaded',ev => { ${artefact.code} })`)
        }
      }

      // fugly inline css
      const cexp = new RegExp(`<link[^>]+href=['"]([^'"]+\.css)['"][^>]*>`)
      let m
      while (m = html.match(cexp)) {
        const file = `public${m[1]}`
        const css = readFileSync(file)
        console.log(`Inlining ${file}`)
        html = html.replace(m[0], `<!-- inline ${file} -->
          <style>${css.toString('utf8')}</style>
        `)
      }
      // write out the destination
      mkdirSync(dirname(output), { recursive: true })
      writeFileSync(output, Buffer.from(html, 'utf8'))
      console.log(output, `written ${html.length >> 10}k`)
    }
  }
}
