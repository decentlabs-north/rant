/**
 * mod/inspect.js
 *
 * Dumps all blocks into a nice graphviz/dot graph
 */
import { inspect as dumpDot } from 'picorepo/dot.js'
import {
  decode,
  extractTitle,
  extractIcon,
  extractExcerpt,
  bq
} from '../picocard.js'
import {
  TYPE_RANT,
  btok
} from '../util.js'

export default function InspectModule () {
  return {
    async inspect () {
      // console.info('Inspecting Repo...')
      const dot = await dumpDot(this.repo, {
        blockLabel (block, { link }) {
          const author = btok(block.key, 3)
          const data = decode(block.body)
          const str = bq`
            [${btok(block.sig, 3)}]
            ${data.seq}:${author}
          `
          if (data.type !== TYPE_RANT) {
            return bq`
            ${str}
            UnknownBlock
          `
          }
          return bq`
          ${str}
          ${extractIcon(data.text)}
          ${extractTitle(data.text)}
          ${extractExcerpt(data.text, 12)}
          🎨${data.theme} 🔒${data.encryption} 🗜️${data.compression}
        `
        }
      })
      // console.info('$ xdot rant.dot')
      console.info(dot)
      return dot
    }
  }
}
