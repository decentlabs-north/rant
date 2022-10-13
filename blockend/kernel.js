/*
 * 1k Rant - Kernel
 * @author Tony Ivanov
 * @license AGPLv3
 */
import { SimpleKernel } from 'picostack'
import { get } from 'piconuro'
import { inspect as dumpDot } from 'picorepo/dot.js'
import {
  decode,
  extractTitle,
  extractIcon,
  extractExcerpt,
  bq
} from './picocard.js'
import {
  TYPE_RANT,
  btok
} from './util.js'

// Import Slices
import Notebook from './slices/notebook.js'

// Import Modules
import ModuleCfg from './mod/cfg.js'
import ModuleDrafts from './mod/draft.js'

// import { encrypt } from '../frontend/encryption.js'
export {
  isDraftID,
  isRantID,
  isEqualID,
  btok
} from './util.js'

export default class Kernel extends SimpleKernel {
  constructor (db) {
    super(db)
    this.repo.allowDetached = true // enable multiple chains per author

    // Register slices
    this.store.register(Notebook('rants', () => this.pk))

    // Include Kernel modules
    Object.assign(this, ModuleCfg())
    Object.assign(this, ModuleDrafts(db, this.config.bind(this)))
  }

  async boot () {
    await super.boot()
    // TODO: kernel.$drafts() is a hack, clean it up.
    await this.drafts() // lists and sets $drafts writable
  }

  // TODO: message encryption should be done
  // on card.pack/card.unpack (once) to safely decrypt/encrypt
  async encryptMessage (secret) {
    const encrypted = await encrypt(get(this._draft).text, secret)
    console.info('encrypted: ', encrypted)
    this._w.setText(encrypted)
    this._w.setEncrypted(true)
  }

  async _inc (key) {
    // Most likely races
    const b = await this.repo.readReg(`inc|${key}`)
    const i = (b ? JSON.parse(b) : -1) + 1
    await this.repo.writeReg(`inc|${key}`, JSON.stringify(i))
    return i
  }

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

  // TODO: picostack/SimpleKernel - When detached mode is active this
  // should be default behaviour
  async onquery () {
    const feeds = []
    const res = await this.repo.listFeeds()
    for (const { value: chainId } of res) {
      if (!Buffer.isBuffer(chainId)) {
        console.error('ChainId borked', chainId)
        continue
      }
      const feed = await this.repo.resolveFeed(chainId)
      feeds.push(feed)
    }
    return feeds
  }
}
