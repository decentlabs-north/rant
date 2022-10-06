/**
 * mod/draft.js
 *
 * Usage:
 * ======
 *
 * # Create new draft:
 * await k.checkout(null) // => 'draft:5'
 *
 * # Resume editing existing draft:
 * await k.checkout('draft:2')
 *
 * # Edit draft via setters:
 *
 * k.setText('string') // The contents.
 * k.setTheme(number) // 0..5 (see picocard.js)
 * k.setDate(number) // Date.now()
 * k.setEncryption(0) // Mode: 0 plain, 1: secretbox (PIN), 2: boxseal (PM)
 * k.setSecret(Buffer) // PIN | BoxSecretKey
 *
 */
import Feed from 'picofeed'
import { mute, write, memo, combine, get } from 'piconuro'
import {
  TYPE_RANT,
  btok,
  isRantID,
  isDraftID,
  isEqualID
} from '../util.js'
import {
  encode, // Object -> Compressed&Encrypted Object
  decode, // Compressed & Encrypted Object -> Object
  pack, // Object -> Buffer
  extractTitle,
  extractExcerpt,
  extractIcon
} from '../picocard.js'

/**
 * Drafts Module that provides the user a persistable
 * scratchpad that can be turned into a Rant by signing it.
 * @param db {LevelDB} Instance of leveldb.
 * @param config {Function} the cfg-module export
 */
export default function DraftsModule (db, config) {
  // Create a sublevel for draft storage
  db = db.sublevel('drafts', {
    keyEncoding: 'utf8', valueEncoding: 'buffer'
  })

  // set up current ptr for checkout
  const [$current, setCurrent] = write()

  // set up writable draft
  const [$text, setText] = write('')
  const [$theme, setTheme] = config('lastUsedTheme', 0)
  const [$date, setDate] = write(Date.now())
  // Encryption-scheme
  const [$encryption, setEncryption] = config('lastUsedEncryption', 0)
  // Encryption-secret
  const [$secret, setSecret] = write()

  /** Trying to create a global state hook to make the entire render process awaitable */
  /** Sounds super scary O_o */
  const [$encrypted, setEncrypted] = write(false)

  // combine all outputs into a single object
  const $draft = memo(
    combine({
      id: $current,
      text: $text,
      theme: $theme,
      encryption: $encryption,
      date: $date,
      encrypted: $encrypted
    })
  )

  const [$drafts, setDrafts] = write([])

  // Hydrate setters from object.
  function setDraft (rant = {}) {
    setText(rant.text || '')
    setTheme(rant.theme || get($theme))
    setEncryption(rant.encryption || get($encryption))
    setDate(rant.date || Date.now())
    // setSecret(???) // don't know what to do.
  }

  const reloadDrafts = async () => {
    const iter = db.iterator()
    const drafts = []
    for await (const [id, value] of iter) {
      const draft = decode(value)
      drafts.push(_mapRant({ id, ...draft }))
    }
    drafts.sort((a, b) => b.date - a.date)
    setDrafts(drafts) // Fugly hack
    return drafts
  }

  let saveTimerId = null

  // this._nDrafts = $drafts
  return {
    get $current () { return $current },
    get $draft () { return $draft },
    get isEditing () {
      return isDraftID(get($current))
    },
    get drafts () { return reloadDrafts },

    // TODO: convert to getter (maybe)
    $drafts () { return $drafts },

    // TODO: convert to getter (maybe)
    // TODO: move to `mod/rants.js`
    $rant () {
      const $n = combine(
        $current,
        $draft,
        s => this.store.on('rants', s)
      )
      return mute(
        mute(
          $n,
          ([current, draft, rants]) =>
            isRantID(current) ? rants[btok(current)] : draft
        ),
        r => _mapRant(r)
      )
    },

    // TODO: move to `mod/rants.js`
    $rants () {
      return mute(
        s => this.store.on('rants', s),
        rants => Object.values(rants)
          .filter(r => !r.entombed)
          .map(r => _mapRant(r))
          .sort((a, b) => b.date - a.date)
      )
    },

    async setText (txt) {
      if (!this.isEditing) throw new Error('EditMode not active')
      setText(txt)
      this._saveDraft(true) // to plain registry
    },

    async setTheme (theme) {
      if (!this.isEditing) throw new Error('EditMode not active')
      setTheme(theme)
      await this._saveDraft()
    },

    async setEncryption (encryption) {
      if (!this.isEditing) throw new Error('EditMode not active')
      // TODO: assert encryption type Integer(0..2)
      setEncryption(encryption)
      await this._saveDraft()
    },

    async setSecret (secret) {
      if (!this.isEditing) throw new Error('EditMode not active')
      setSecret(secret)
      await this._saveDraft()
    },

    async commit () {
      if (!this.isEditing) throw new Error('EditMode not active')
      this._checkReady()
      const branch = new Feed()
      const current = get($current)
      const rant = {
        ...get($draft),
        date: Date.now(),
        page: await this._inc('page') // TODO: repo.inc('key') ?
      }
      // Prepack / apply text encryption & compression
      const data = pack(rant, get($secret))
      await this.createBlock(branch, TYPE_RANT, data)

      const id = branch.last.sig
      await this.checkout(id)
      await this.deleteRant(current) // Delete the draft:0
      await reloadDrafts()
      return id
    },

    // TODO: move to mod/rant.js
    async pickle (id) {
      if (!id && this.isEditing) throw new Error('Provide Id or set current to published rant')
      if (!id) id = get(this._current)
      if (!isRantID(id)) throw new Error('InvalidRantId')

      const rants = get(s => this.store.on('rants', s))
      const rant = rants[btok(id)]
      if (!rant) throw new Error('RantNotFound')
      const block = (
        // TODO: where is docs/spec for .rev(ision)?
        await this.repo.readBlock(rant?.rev) ||
        await this.repo.readBlock(id)
      )
      const p = Feed.from(block).pickle()
      const title = rant.title
      const hash = title
        ? `${encodeURIComponent(title.replace(/ +/g, '_'))}-${p}`
        : p
      return hash
    },

    async saveDraft (defer = false) {
      if (!this.isEditing) throw new Error('EditMode not active')
      if (defer) return this._saveLater()
      if (saveTimerId) {
        clearTimeout(saveTimerId)
        saveTimerId = null
      }
      if (!get($draft).text?.length) return // Don't save empty drafts

      setDate(Date.now()) // bump date
      const draft = get($draft) // fetch neuron value
      const secret = get($secret)
      const content = encode(draft, secret) // Compress+Encrypt => Buffer
      await db.put(draft.id, content)
      await reloadDrafts()
    },

    _saveLater () {
      const delay = 3000 // Saves every 3s after edit
      // Clear previous timer to debounce multiple calls
      if (saveTimerId) clearTimeout(saveTimerId)
      saveTimerId = setTimeout(() => {
        saveTimerId = null
        this._saveDraft()
          .then(() => console.info('Draft Autosaved'))
          .catch(err => console.error('AutoSaveFailed:', err))
      }, delay)
    },

    /**
     * Modifies $rant neuron to point to selected id
     * This was in a latenight hack inspired by git and
     * TODO: in hindsight git checkout could've been a tad more consistent.
     *
     * @param next {string|Buffer|null} DraftId|RantId or null to create new draft.
     * @param fork {boolean} When true, creates a draft from given RantId
     * @return {array} returns an array with 2 elements: [currentId, previousId]
     */
    async checkout (next, fork = false) {
      if (!isDraftID(next) && !isRantID(next) && next !== null) throw new Error('Expected checkout(string|Buffer|null)')
      if (fork && !isRantID(next)) throw new Error('ForkOnlyWorksOnRans')
      const prev = get($current)

      // Already checked out
      if (!fork && isEqualID(next, prev)) return [prev, prev]

      if (isDraftID(prev)) await this._saveDraft()

      if (next === null) { // Create new Draft
        next = 'draft:' + await this._inc('draft')
        setDraft() // empty sheet
      } else if (isDraftID(next)) { // Checkout existing draft
        const b = await this.db.get(next)
        if (!b) throw new Error('DraftNotFound')
        const secret = get($secret)
        setDraft(decode(b, secret))
      } else {
        const rants = get(s => this.store.on('rants', s))
        const r = rants[btok(next)]
        if (!r) throw new Error('UnknownRant')
        if (fork) {
          next = 'draft:' + await this._inc('draft')
          setDraft(r) // Copy rant details
        }
      }
      setCurrent(next)
      return [next, prev]
    }
  }

  /**
   * High-level formatter, decorates a rant object with
   * title, icon, size and other calculated props.
   *
   * @param rant {Object}
   * @return {Rant}
   */
  function _mapRant (rant) {
    if (!rant) throw new Error('NoRant')
    // console.log('_mapRant()', rant)
    const c = get($current)
    const isCurrent = isEqualID(c, rant.id)
    const isDraft = !rant.rev
    let size = rant.size
    if (isDraft) size = rant.text ? encode(rant).length : 0
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
      // TODO: Only true if encryption is plain or correct secret applied
      decrypted: true
    }
  }
}
