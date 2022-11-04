/**
 * mod/inspect.js
 *
 * Dumps all blocks into a nice graphviz/dot graph
 */
import { inspect as dumpDot } from 'picorepo/dot.js'
import {
  unpack,
  extractTitle,
  extractIcon,
  extractExcerpt,
  bq
} from '../picocard.js'
import {
  TYPE_RANT,
  btok
} from '../util.js'
import { SimpleKernel } from 'picostack'
const { decodeBlock } = SimpleKernel

export default function InspectModule () {
  return {
    async inspect () {
      // console.info('Inspecting Repo...')
      const dot = await dumpDot(this.repo, {
        blockLabel (block, { link }) {
          const author = btok(block.key, 3)
          const data = decodeBlock(block.body)
          // default text, short-sig + author
          const str = bq`
            [${btok(block.sig, 3)}]
            ${data.seq}:${author}
          `

          // If not a rant then return only block-type as description.
          if (data.type !== TYPE_RANT) {
            return bq`
              ${str}
              ${data.type}
            `
          }

          // otherwise unpack rant and present cool stats.
          const rant = unpack(data)
          return bq`
          ${str}
          ${extractIcon(rant.text)}
          ${extractTitle(rant.text)}
          ${extractExcerpt(rant.text, 12)}
          🎨${rant.theme} 🔒${rant.encryption} 🗜️${rant.compression}
        `
        }
      })
      // console.info('$ xdot rant.dot')
      // console.info(dot)
      return dot
    }
  }
}
