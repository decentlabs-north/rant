/*
 * 1k Rant - Private Kernel
 * @author Tony Ivanov
 * @license AGPLv3
 */
import { SimpleKernel } from 'picostack'
import { get } from 'piconuro'

// Import Slices
import Notebook from './slices/notebook.js'

// Import Modules
import ModuleCfg from './mod/cfg.js'
import ModuleDrafts from './mod/draft.js'
import ModuleInspect from './mod/inspect.js'

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
    Object.assign(this, ModuleInspect())
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

  // TODO: picostack/SimpleKernel - When detached mode is active this
  // should be default behaviour
  async onquery (params = {}) {
    const rants = get(this.$rants())
      .filter(r => !params.onlyPublic || r.public)
    const feeds = []
    for (const r of rants) {
      const feed = await this.repo.resolveFeed(r.id)
      feeds.push(feed)
    }
  }
}
