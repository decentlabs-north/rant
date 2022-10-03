import esbuild from 'esbuild'
import plugin from 'node-stdlib-browser/helpers/esbuild/plugin'
import stdLibBrowser from 'node-stdlib-browser'
import { writeFileSync } from 'node:fs'

/* TODO: Choose some tradeoff for live reload & css-injection
 * https://github.com/evanw/esbuild/issues/802
 */

const production = process.env.NODE_ENV === 'production' ||
  !process.argv.find(i => /^--?w(atch)?$/.test(i))

const config = {
  entryPoints: ['frontend/main.js'],
  outfile: 'pub/build/bundle.js',
  format: 'esm',
  platform: 'browser',
  bundle: true,
  minify: production,
  keepNames: production, // Tonic relies on function.prototype.name
  sourcemap: !production, // Want to false, it's huge ~9MB
  metafile: true,
  inject: ['./node_modules/node-stdlib-browser/helpers/esbuild/shim.js'],
  define: {
    global: 'global',
    process: 'process',
    Buffer: 'Buffer'
  },
  plugins: [plugin(stdLibBrowser)]
}

async function build () {
  if (production) {
    // Build
    const result = await esbuild.build(config)

    // print full analysis
    /*
    const text = await esbuild.analyzeMetafile(result.metafile, { verbose: false })
    console.log(text)
    writeFileSync(
      'pub/build/meta.json',
      JSON.stringify(result.metafile)
    )
    */

    // print summary
    console.log('=== Build Summary ===\n')
    const { outputs } = result.metafile
    for (const k in outputs) {
      console.log(`${k} ${outputs[k].bytes}B`)
    }
    console.log('\n')
  } else {
    // Run Dev-server
    const port = 3000
    const server = await esbuild.serve({
      servedir: 'pub/',
      port,
      onRequest: ({ method, path, status, timeInMS }) =>
        console.info(`[${status}] ${method} ${path} - ${timeInMS}ms`)
    }, config)
    console.log('Dev-server started port:', port)
    const beforeQuit = async () => await server.stop()
    process.on('SIGTERM', beforeQuit)
    process.on('exit', beforeQuit)
  }
}
build()
