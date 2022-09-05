import { SimpleKernel, Feed } from 'picostack'
import { init, mute, write, combine, get, gate } from 'piconuro'
import { pack, unpack, extractTitle } from './picocard.js'

export const TYPE_RANT = 0

export default class Kernel extends SimpleKernel {
  constructor (db) {
    super(db)
    this.repo.allowDetached = true
    this.store.register(Notebook())

    // set up current ptr for checkout
    const c = write()
    this._current = c[0]
    this._setCurrent = c[1]

    // set up writable draft
    const [text, setText] = write('')
    const [theme, setTheme] = write(0)
    const [encryption, setEncryption] = write(0)
    const [date, setDate] = write(Date.now())
    // const [secret, setSecret] = write(rant.secret)
    // combine all outputs
    this._draft = combine({ text, theme, encryption, date })
    // Stash all inputs
    this._w = { setText, setTheme, setEncryption, setDate }
    this._conf = {}
  }

  $rant () {
    const n = combine(
      this._current,
      this._draft,
      s => this.store.on('rants', s)
    )
    return mute(
      mute(
        n,
        ([current, draft, rants]) =>
          current ? rants[btok(current)] : draft
      ),
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
    if (rantId === null) {
      this._setDraft()
    } else if (!this.store.state.rants[btok(rantId)]) throw new Error('UnknownRant')
    this._setCurrent(rantId)
  }

  _mapRant (rant) {
    if (!rant) return
    // console.log('_mapRant()', rant)
    const c = get(this._current)
    const isCurrent = c && rant.id && c.equals(rant.id)
    let size = rant.size
    if (this.isEditing) { //  && isCurrent) {
      size = rant.text ? pack(rant).length : 0
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

  get isEditing () { return true }

  async setText (txt) {
    if (!this.isEditing) throw new Error('EditMode not active')
    this._w.setText(txt)
    // this._dbncSaveDraft() // to plain registry
  }

  async setTheme (theme) {
    if (!this.isEditing) throw new Error('EditMode not active')
    this._w.setTheme(theme)
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

    await this.checkout(id)
    // TODO: delete id from draft-store

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

  _setDraft (rant = {}) {
    this._w.setText(rant.text || '')
    this._w.setTheme(rant.theme || 0)
    this._w.setEncryption(rant.encryption || 0)
    this._w.setDate(rant.date || Date.now())
  }

  async import (url) { // Imports pickles
    const f = Feed.from(url)
    await this.dispatch(f, true)
    const id = f.first.sig
    this._setCurrent(id)
    return id
  }

  config (key, defaultValue) {
    if (typeof key !== 'string') throw new Error('Expected key to be string')
    if (!this._conf[key]) {
      const [output, input] = write(defaultValue)
      const setter = async v => {
        input(v)
        await this.repo.writeReg(`cnf|${key}`, JSON.stringify(v))
      }
      this.repo.readReg(`cnf|${key}`).then(v => {
        if (typeof v === 'undefined' && typeof defaultValue !== 'undefined') {
          input(defaultValue)
          return setter(defaultValue)
        } else {
          input(JSON.parse(v))
        }
      })
      this._conf[key] = [output, setter]
    }
    return this._conf[key]
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
      if (block.body.length > 1024) return 'RantTooBig'

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
