import { SimpleKernel, Feed } from 'picostack'
import { init, mute, write, combine, get, gate } from 'piconuro'
import { pack, unpack, extractTitle, extractIcon, extractExcerpt } from './picocard.js'

export const TYPE_RANT = 0

export default class Kernel extends SimpleKernel {
  constructor (db) {
    super(db)
    this.repo.allowDetached = true
    this.store.register(Notebook())
    this._drafts = db.sublevel('drafts', { keyEncoding: 'utf8', valueEncoding: 'buffer' })
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
    this._draft = combine({ id: this._current, text, theme, encryption, date })
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
          Buffer.isBuffer(current) ? rants[btok(current)] : draft
      ),
      this._mapRant.bind(this)
    )
  }

  async drafts () {
    const iter = this._drafts.iterator()
    const drafts = []
    for await (const [id, value] of iter) {
      const draft = unpack(value)
      drafts.push(this._mapRant({ id, ...draft }))
    }
    return drafts
  }

  $rants () {
    return mute(
      s => this.store.on('rants', s),
      rants => Object.values(rants).map(r => this._mapRant(r))
    )
  }

  async _saveDraft () {
    if (!this.isEditing) throw new Error('NoDraftEdited')
    const draft = get(this._draft)
    const content = pack(draft)
    await this._drafts.put(draft.id, content)
  }

  async checkout (rantId) {
    const prev = get(this._current)
    if (isDraftID(prev)) {
      await this._saveDraft()
    }

    if (rantId === null) {
      rantId = 'draft:' + await this._inc('draft')
      this._setDraft()
    } else if (isDraftID(rantId)) {
      const b = await this._drafts.get(rantId)
      if (!b) throw new Error('DraftNotFound')
      this._setDraft(unpack(b))
    } else if (!this.store.state.rants[btok(rantId)]) throw new Error('UnknownRant')
    this._setCurrent(rantId)
    return prev
  }

  _mapRant (rant) {
    if (!rant) throw new Error('NoRant')
    // console.log('_mapRant()', rant)
    const c = get(this._current)
    const isCurrent = (isDraftID(c) && c === rant.id) ||
      (Buffer.isBuffer(c) && Buffer.isBuffer(rant.id) && c.equals(rant.id))
    const isDraft = !rant.rev
    let size = rant.size
    if (isDraft) size = rant.text ? pack(rant).length : 0
    // console.log('DBG id:', rant.id, 'current:', isCurrent, 'draft:', isDraft, 'size:', size)

    const state = isDraft ? 'draft' : 'signed'

    return {
      ...rant,
      state,
      selected: isCurrent,
      size,
      title: extractTitle(rant.text),
      excerpt: extractExcerpt(rant.text),
      icon: extractIcon(rant.text),
      decrypted: true
    }
  }

  get isEditing () {
    const current = get(this._current)
    return isDraftID(current)
  }

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
    if (current && Buffer.isBuffer(current)) {
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
    await this._drafts.del(current)
    // this.rpc.shareBlocks(branch.slice(-1)) if Public
    return id
  }

  async pickle (id) {
    if (!id && this.isEditing) throw new Error('Provide Id or set current to published rant')
    if (!id) id = get(this._current)
    const rants = get(s => this.store.on('rants', s))
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
    return hash
  }

  async _inc (key) {
    // Most likely races
    const b = await this.repo.readReg(`inc|${key}`)
    const i = (b ? JSON.parse(b) : -1) + 1
    await this.repo.writeReg(`inc|${key}`, JSON.stringify(i))
    return i
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

function Notebook (name = 'rants') {
  return {
    name,
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

export function btok (buffer) { return buffer.toString('hex') }
export function isDraftID (id) {
  return typeof id === 'string' && id.startsWith('draft:')
}
