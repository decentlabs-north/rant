// const path = require('path')
import esbuild from 'esbuild'
import plugin from 'node-stdlib-browser/helpers/esbuild/plugin'
import stdLibBrowser from 'node-stdlib-browser'
import builtin from 'builtin-modules'
import { writeFileSync } from 'node:fs'

const production = process.env.NODE_ENV === 'production' ||
  !process.argv.find(i => /^--?w(atch)?$/.test(i))

const config = {
  entryPoints: ['frontend/main.js'],
  outfile: 'pub/build/bundle.js',
  // outdir: 'pub/build/',

  format: 'esm',
  platform: 'browser',
  target: 'esnext',
  bundle: true,
  treeShaking: false,
  minify: production,
  sourcemap: production,
  // keepNames: true, // required by Tonic
  metafile: true,
  // inject: [require.resolve('node-stdlib-browser/helpers/esbuild/shim')],
  inject: ['./node_modules/node-stdlib-browser/helpers/esbuild/shim.js'],
  define: {
    global: 'global',
    process: 'process',
    Buffer: 'Buffer'
  },
  plugins: [
    plugin(stdLibBrowser),
    blankPlug()
  ]
}

async function build () {
  if (production) {
    const result = await esbuild.build(config)
    const text = await esbuild.analyzeMetafile(result.metafile)
    console.log(text)
    writeFileSync(
      'pub/build/meta.json',
      JSON.stringify(result.metafile)
    )
  } else {
    const port = 3000
    const server = await esbuild.serve({
      servedir: 'pub/',
      port,
      onRequest: ({ method, path, status, timeInMS }) =>
        console.info(`[${status}] ${method} ${path} - ${timeInMS}`)
    }, config)
    console.log('Dev-server started port:', port)
    const toExit = async () => await server.stop()
    process.on('SIGTERM', toExit)
    process.on('exit', toExit)
  }
}
build()

function blankPlug () {
  const builtinList = builtin.reduce((prev, val, index) => (index > 0 ? `${prev}|${val}` : val)) +
      '|module_error'
  const builtinRegexp = new RegExp(`^(${builtinList})\\/?(.+)?`)
  return {
    name: 'blankimport',
    setup (build) {
      build.onResolve({ filter: builtinRegexp }, (args) => ({
        path: args.path,
        namespace: 'blankimport'
      }))
      build.onLoad({ filter: builtinRegexp, namespace: 'blankimport' }, async (args) => {
        const path = args.path.replace(/\/$/, '')
        const stub = Object.keys(await import(path)).reduce((p, c) => ({ ...p, [c]: '' }), {})
        /**
         * Operation steps:
         * - Import the module server side so you're 100% sure it will resolve
         *    NOTE: A module won't get completely imported twice unless its
         *    import url changes, so the import is cached.
         * - get the keys of the import. This will get the name of every
         *   named export present in the built-in
         * - Reduce the string array into an object with the initializer {},
         *   each string is added as the key of the object with an empty string
         *   so named imports will work but will just import a blank object.
         * - Finally stringify the object and let esbuild handle the rest for you
         */
        const contents = JSON.stringify(stub)
        return {
          contents,
          loader: 'json'
        }
      })
    }
  }
}
