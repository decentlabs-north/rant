import { SimpleKernel, Feed } from 'picostack'
import { init, mute, write, combine, get, gate } from 'piconuro'
import { pack, unpack, extractTitle } from './picocard.js'

export const TYPE_RANT = 0

export default class Kernel extends SimpleKernel {
  _draft = null

  constructor (db) {
    super(db)
    this.repo.allowDetached = true
    this.store.register(Notebook())
    const c = write()
    this._current = c[0]
    this._setCurrent = c[1]
  }

  $rant () {
    if (!get(this._current) && !this._draft) return init() // nothing shown, nothing editing.
    if (this.isEditing) return mute(this._draft, this._mapRant.bind(this))
    const n = combine(this._current, s => this.store.on('rants', s))
    return mute(
      mute(n, ([current, rants]) => current && rants[btok(current)]),
      this._mapRant.bind(this)
    )
  }

  $rants () {
    return mute(
      s => this.store.on('rants', s),
      rants => Object.values(rants).map(r => this._mapRant(r))
    )
  }

  async checkout (rantId) {
    if (rantId === null) return this._makeDraft()
    if (!this.store.state.rants[btok(rantId)]) throw new Error('UnknownRant')
    this._setCurrent(rantId)
  }

  _mapRant (rant) {
    if (!rant) return
    // console.log('_mapRant()', rant)
    const c = get(this._current)
    const isCurrent = c && rant.id && c.equals(rant.id)
    let size = rant.size
    if (this.isEditing && isCurrent) {
      size = pack(rant).length
    }
    const state = isCurrent
      ? this.isEditing ? 'draft' : 'signed'
      : rant.id ? 'signed' : 'draft'
    return {
      ...rant,
      state,
      selected: isCurrent,
      size,
      title: extractTitle(rant.text),
      decrypted: true
    }
  }

  get isEditing () { return !!this._draft }

  async setText (txt) {
    if (!this.isEditing) throw new Error('EditMode not active')
    this._writers.setText(txt)
    // this._dbncSaveDraft() // to plain registry
  }

  async setTheme (theme) {
    if (!this.isEditing) throw new Error('EditMode not active')
    this._writers.setTheme(theme)
    // this._dbncSaveDraft() // to plain registry
  }

  async commit () { // TODO: use this.createBlock()
    if (!this.isEditing) throw new Error('EditMode not active')
    this._checkReady()
    let branch = new Feed()
    const current = get(this._current)
    if (current) {
      branch = await this.repo.resolveFeed(current)
      // TODO: this.repo.rollback(current) // evict old if exists
    }
    const rant = {
      type: TYPE_RANT,
      ...get(this._draft),
      date: Date.now(),
      page: await this._inc('page') // TODO: repo.inc('key') ?
    }
    const data = pack(rant)
    branch.append(data, this._secret)
    const id = branch.last.sig

    const modified = await this.dispatch(branch, true)
    if (!modified.length) throw new Error('commit() failed: rejected by store')

    delete this._draft
    delete this._writers
    this._setCurrent(id)
    // this.rpc.shareBlocks(branch.slice(-1)) if Public
    return id
  }

  $url () {
    const n = combine(this._current, s => this.store.on('rants', s))
    return gate(
      mute(n, async ([id, rants]) => {
        if (!id) return
        const rant = rants[btok(id)]
        const block = (
          await this.repo.readBlock(rant?.rev) ||
          await this.repo.readBlock(id)
        )
        const p = Feed.from(block).pickle()
        const title = rant.title
        const hash = title
          ? `${encodeURIComponent(title.replace(/ +/g, '_'))}-${p}`
          : p
        return `/#${hash}`
      })
    )
  }

  async _inc (key) {
    return 0
  }

  _makeDraft (rant = {}) {
    const [text, setText] = write(rant.text || '')
    const [theme, setTheme] = write(rant.theme || 0)
    // const [secret, setSecret] = write(rant.secret)
    this._draft = combine({
      text,
      theme,
      encryption: init(0),
      date: init(Date.now())
    })
    this._writers = { setText, setTheme }
  }

  async import (url) { // Imports pickles
    const f = Feed.from(url)
    await this.dispatch(f, true)
    const id = f.first.sig
    this._setCurrent(id)
    return id
  }
}

function Notebook () {
  return {
    name: 'rants',
    initialValue: {},
    filter ({ block }) {
      const rant = unpack(block.body)
      const { type } = rant
      if (type !== TYPE_RANT) return 'UnknownBlock'
      if (block.buffer.length > 1024) return 'RantTooBig'

      return false
    },

    reducer ({ state, block, CHAIN, KEY }) {
      const rant = unpack(block.body)
      state[btok(CHAIN)] = {
        ...rant,
        id: CHAIN,
        author: KEY,
        rev: block.sig,
        size: block.body.length
      }
      return { ...state }
    }
  }
}

function btok (buffer) { return buffer.toString('hex') }
