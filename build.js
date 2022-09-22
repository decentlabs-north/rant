import esbuild from 'esbuild'
// import plugin from 'node-stdlib-browser/helpers/esbuild/plugin'
// import stdLibBrowser from 'node-stdlib-browser'
import { writeFileSync } from 'node:fs'

const production = process.env.NODE_ENV === 'production' ||
  !process.argv.find(i => /^--?w(atch)?$/.test(i))

// $(npm bin)/esbuild frontend/main.js --platform=browser --format=esm --bundle --servedir=pub/ --serve=3000  --outfile=pub/build/bundle.js

const config = {
  entryPoints: ['frontend/main.js'],
  outfile: 'pub/build/bundle.js',
  format: 'esm',
  platform: 'browser',
  bundle: true,
  minify: production,
  keepNames: production, // required by Tonic
  sourcemap: production,
  // watch: !production,
  metafile: true,
  // target: 'esnext', // Enabled by default
  // treeShaking: true, // Enabled by default when bundle.true
  // inject: [require.resolve('node-stdlib-browser/helpers/esbuild/shim')],
  inject: ['./node_modules/node-stdlib-browser/helpers/esbuild/shim.js'],
  define: {
    global: 'global',
    process: 'process',
    Buffer: 'Buffer'
  },
  plugins: [
    // plugin(stdLibBrowser)
    // blankPlug()
  ]
}

async function build () {
  await buildModem('pub/build/modem.js')
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
        console.info(`[${status}] ${method} ${path} - ${timeInMS}ms`)
    }, config)
    console.log('Dev-server started port:', port)
    const toExit = async () => await server.stop()
    process.on('SIGTERM', toExit)
    process.on('exit', toExit)
  }
}
build()

async function buildModem (output, input = './node_modules/picostack/modem56.web.js') {
  return await esbuild.build({
    entryPoints: [input],
    outfile: output,
    format: 'iife',
    platform: 'browser',
    bundle: true,
    minify: production
  })
}

// Deprecated
/*
// import builtin from 'builtin-modules'
function blankPlug () {
  const builtinList = builtin.reduce((prev, val, index) => (index > 0 ? `${prev}|${val}` : val))
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
        const contents = JSON.stringify(stub)
        return {
          contents,
          loader: 'json'
        }
      })
    }
  }
}
*/
