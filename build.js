import esbuild from 'esbuild'
import plugin from 'node-stdlib-browser/helpers/esbuild/plugin'
import { replace } from 'esbuild-plugin-replace'
import stdLibBrowser from 'node-stdlib-browser'
import { readFileSync, readdirSync } from 'node:fs'
import { execSync } from 'node:child_process'

/**
 *
 * @returns encoded static file content as an object
 */
async function loadStaticFileData () {
  const staticData = await readStaticFiles('static_files/')
  return JSON.stringify(staticData)
}

/* TODO: Choose some tradeoff for live reload & css-injection
 * https://github.com/evanw/esbuild/issues/802
 */

const version = JSON.parse(readFileSync('./package.json')).version
const commit = execSync('git rev-parse HEAD')?.toString('utf8').trim()

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
  plugins: [
    plugin(stdLibBrowser),
    /* esbuild-plugin-replace gave broken output
     * https://github.com/naecoo/esbuild-plugin-replace */
    replace({
      include: /\.js$/, // <-- This little fella here was apparently very important :)
      __ENV__: `${production ? 'production' : 'dev'}`,
      __VERSION__: `${version}`,
      __COMMIT__: `${commit}`,
      __TEST_CSS__: `${await loadStaticFileData()}`
    })
  ]
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
    console.log(`=== Build Summary ===\nv${version}`, commit)
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

/**
 *
 * @param {*} dir The directory to read.
 * @returns An object with base64 encoded file content.
 */
async function readStaticFiles (dir) {
  const staticData = {}
  const filenames = readdirSync(dir)
  filenames.forEach(function (filename) {
    const content = readFileSync(dir + filename)
    staticData[filename] = Buffer.from(content).toString('base64')
  })
  return staticData
}
