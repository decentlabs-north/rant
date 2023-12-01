import { SimpleKernel, Feed } from 'picostack'
import { memo, mute, write, combine, get } from 'piconuro'
import { inspect as dumpDot } from 'picorepo/dot.js'
import {
  pack,
  unpack,
  extractTitle,
  extractIcon,
  extractExcerpt,
  bq,
  TYPE_RANT,
  TYPE_TOMB
} from './picocard.js'

// Backdoor my own shit.
// SimpleKernel.decodeBlock = unpack
SimpleKernel.encodeBlock = (type, seq, data) => pack({ type, ...data })

export default class Kernel extends SimpleKernel {
  constructor (db) {
    super(db)
    this.repo.allowDetached = true
    // this.store.mutexTimeout = 90000000 // TODO: rewrite mutex => WebLock
    this.store.register(Notebook('rants', () => this.pk))
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
    this._draft = memo(combine({ id: this._current, text, theme, encryption, date }))

    const [$drafts, setDrafts] = write([])
    this._nDrafts = memo($drafts)
    // Stash all inputs
    this._w = { setText, setTheme, setEncryption, setDate, setDrafts }
    this._conf = {}
  }

  $drafts () { return this._nDrafts }

  async boot () {
    await super.boot()
    // TODO: kernel.$drafts() is a hack, clean it up.
    await this.drafts()
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
    this._w.setDrafts(drafts) // Fugly hack
    return drafts.sort((a, b) => b.date - a.date)
  }

  $rants () {
    return mute(
      s => this.store.on('rants', s),
      rants => Object.values(rants)
        .map(r => this._mapRant(r))
        .sort((a, b) => b.date - a.date)
    )
  }

  async saveDraft () {
    if (!this.isEditing) return
    return this._saveDraft()
  }

  async _saveDraft (defer = false) {
    if (defer) return this._saveLater()
    if (this._sTimeout) clearTimeout(this._sTimeout)
    delete this._sTimeout
    if (!this.isEditing) throw new Error('NoDraftEdited')

    if (!get(this._draft).text?.length) return
    else this._w.setDate(Date.now()) // bump date

    const draft = get(this._draft)
    const content = pack(draft)
    await this._drafts.put(draft.id, content)
    await this.drafts() // Reload drafts
  }

  _saveLater () {
    if (this._sTimeout) clearTimeout(this._sTimeout)
    this._sTimeout = setTimeout(() => {
      delete this._sTimeout
      this._saveDraft()
        .then(() => console.info('Draft Autosaved'))
        .catch(err => console.error('AutoSaveFailed:', err))
    }, 3000)
  }

  async checkout (next, fork = false) {
    if (!isDraftID(next) && !Buffer.isBuffer(next) && next !== null) throw new Error('Expected checkout(string|Buffer|null)')
    if (fork && isDraftID(next)) throw new Error('DraftsCannotBeForked')
    const prev = get(this._current)
    // Already checked out
    if (!fork && isEqualID(next, prev)) return [prev, prev]

    if (isDraftID(prev)) {
      await this._saveDraft()
    }

    if (next === null) {
      next = 'draft:' + await this._inc('draft')
      this._setDraft()
    } else if (isDraftID(next)) {
      const b = await this._drafts.get(next)
      if (!b) throw new Error('DraftNotFound')
      this._setDraft(unpack(b))
    } else {
      const rants = get(s => this.store.on('rants', s))
      const r = rants[btok(next)]
      if (!r) throw new Error('UnknownRant')
      if (fork) {
        next = 'draft:' + await this._inc('draft')
        this._setDraft(r)
      }
    }
    this._setCurrent(next)
    return [next, prev]
  }

  get $current () {
    return this._current
  }

  _mapRant (rant) {
    if (!rant) throw new Error('NoRant')
    // console.log('_mapRant()', rant)
    const c = get(this._current)
    const isCurrent = isEqualID(c, rant.id)
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
    this._saveDraft(true) // to plain registry
  }

  async setTheme (theme) {
    if (!this.isEditing) throw new Error('EditMode not active')
    this._w.setTheme(theme)
    await this._saveDraft()
  }

  async commit () { // TODO: use this.createBlock() or support pre-encoded binary payloads
    if (!this.isEditing) throw new Error('EditMode not active')
    this._checkReady()
    let branch = new Feed()
    const current = get(this._current)
    if (current && Buffer.isBuffer(current)) {
      branch = await this.repo.resolveFeed(current)
      // TODO: this.repo.rollback(current) // evict old if parent/draft id exists?
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
    await this.deleteRant(current)
    await this.drafts() // Reload drafts
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
    // TODO: return if f.first.sig === current (already checked out)
    // TODO: skip dispatch if f.first.sig exists in $rants. (already imported)
    await this.dispatch(f, true)
    const id = f.first.sig
    this._setCurrent(id)
    return id
  }

  async deleteRant (id) {
    // Move away from note that's about to be deleted
    const current = get(this._current)
    if (isEqualID(id, current)) await this.checkout(null)

    if (isDraftID(id)) {
      await this._drafts.del(id)
      await this.drafts() // Reload drafts
    } else if (Buffer.isBuffer(id)) {
      const branch = await this.repo.resolveFeed(id)
      if (!branch) throw new Error('RantNotFound')
      return await this.createBlock(branch, TYPE_TOMB, { id })
      // TODO: rollback to free up storage?
      // await this.repo.rollback(id)
    } else throw new Error('DeleteWhat?')
  }

  async inspect () {
    // console.info('Inspecting Repo...')
    const dot = await dumpDot(this.repo, {
      blockLabel (block, { link }) {
        const author = btok(block.key, 3)
        const data = unpack(block.body)
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

  // TODO: consider backport to picostack, pretty nice feature.
  // this is very close to what i might need for picostore/async reducers.
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

  async backup () {
    console.log('Performing backup')
    const drafts = get(this.$drafts()) // <-- the important one IMHO
    const rants = get(this.$rants()).map(r => ({
      ...r,
      // Hex all buffers
      id: btok(r.id),
      author: btok(r.author),
      rev: btok(r.rev)
    }))
    const res = await this.repo.listFeeds()
    const feeds = []
    for (const { key } of res) {
      const f = await this.repo.loadFeed(key)
      feeds.push({
        v0: f.pickle(),
        buf: btok(f.buf.slice(0, f.tail))
      })
    }

    return {
      secret: this._secret,
      drafts,
      rants,
      feeds
    }
  }
}

function Notebook (name = 'rants', resolveLocalKey) {
  // There's no clean solution in pico for injecting local identity ATM.
  let _key = null
  const localKey = () => {
    if (_key) return _key
    if (typeof resolveLocalKey === 'function') {
      _key = resolveLocalKey()
      if (!_key) throw new Error('RacingCondition? falsy localKey')
      return _key
    } else throw new Error('resolveLocalKey expected to be function')
  }
  return {
    name,
    initialValue: {},
    filter ({ block, parentBlock }) {
      const rant = unpack(block.body)
      const { type } = rant
      switch (type) {
        case TYPE_RANT:
          if (block.body.length > 1024) return 'RantTooBig'
          break

        case TYPE_TOMB: {
          // Tombstones can only be placed by author.
          if (!(
            block.key.equals(parentBlock.key) ||
            localKey()?.equals(block.key) // accept own
          )) return 'NotYourRant'

          const pData = unpack(parentBlock.body)
          // Tombstone can only be appended to rants (once).
          if (pData.type !== TYPE_RANT) return 'ExpectedParentToBeRant'
        } break
        default: return 'UnknownBlock'
      }
      return false
    },

    reducer ({ state, block, CHAIN }) {
      const rant = unpack(block.body)
      if (rant.type === TYPE_TOMB) {
        delete state[btok(CHAIN)]
        // TODO: enqueue GC? (30min to propagate tomb)
        return state
      }

      state[btok(CHAIN)] = {
        ...rant,
        id: CHAIN,
        author: block.key,
        rev: block.sig,
        size: block.body.length
      }
      return { ...state }
    }
  }
}

export function btok (b, length = -1) { // 'base64url' not supported in browser :'(
  if (Buffer.isBuffer(b) && length > 0) b = b.slice(0, Math.min(length, b.length))
  return b.toString('hex')
}

export function ktob (s) {
  if (typeof s !== 'string') throw new Error('Expected string')
  return Buffer.from(s, 'hex')
}

// Don't ask, i seem to like footguns.
export function isDraftID (id) {
  return typeof id === 'string' && id.startsWith('draft:')
}

export function isEqualID (a, b) {
  return (isDraftID(a) && a === b) ||
    (
      Buffer.isBuffer(a) &&
      Buffer.isBuffer(b) &&
      a.equals(b)
    )
}
