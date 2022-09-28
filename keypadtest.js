import test from 'tape'
import { MemoryLevel } from 'memory-level'
import Kernel from './blockend/kernel.js'
// import Kernel from './blockend/k.js'
import { pack, unpack, extractTitle, extractExcerpt, extractIcon } from './blockend/picocard.js'
import { get, until } from 'piconuro'

function makeDB () {
  return new MemoryLevel('rant.lvl', { keyEncoding: 'buffer', valueEncoding: 'buffer' })
}
