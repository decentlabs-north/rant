const Feed = require('picofeed')
const { compress, decompress } = require('lzutf8')
const { compressToUint8Array, decompressFromUint8Array } = require('lz-string')
const { encrypt, decrypt } = require('cryptology')

module.exports = class Picocard {
  constructor () {
    this.feed = new Feed()
  }

  get key () { return this.feed.first.key }

  get theme () { return this._card.theme }

  get date () { return this._card.date }

  get text () { return this._unpackText({ secret: this.__secret }) }

  get title () {
    const md = this.text
    if (!md && !md.length) return
    // Not sure how robust theese regexes are, feel free to improve.
    const m1 = md.match(/^\s*(.+)\s*\n==+/m)
    if (m1) return m1[1]
    const m2 = this.text.match(/^#+ (.+)\s+$/m)
    if (m2) return m2[1]
  }

  update (props, sk) {
    return this._pack(props, sk)
  }

  get _card () {
    return this.get(0).card
  }

  decrypt (secret) {
    this.__secret = secret
    return this._unpackText({ secret })
  }

  _unpackText (opts = {}) {
    const decompressors = [
      i => i.toString('utf8'),
      decompress,
      decompressFromUint8Array
    ]
    const card = this._card
    switch (card.encryption) {
      case 0: // not encrypted; TODO: maybe always encrypt with 0K for deniability.
        return decompressors[card.compression](card.text)
      case 1: { // secret_box encryption
        if (!opts.secret) throw new Error('ContentEncrypted')
        const plain = decrypt(card.text, opts.secret)
        return decompressors[card.compression](plain)
      }
    }
  }

  _pack (props, sk) {
    const secret = props.secret
    delete props.secret

    const card = {
      // Defaults
      text: '',
      compression: 0,
      encryption: 0,
      // Merge existing
      ...(this.length ? this.get(0).card : {}),
      // Merge new
      ...props,
      // Auto generated ontop
      date: new Date().getTime()
    }

    if (!card.text.length) return
    const text = card.text // Prepack transforms
      .replace(/\r/, '') // Unecessary CRLF
      // .replace(/ {4}/, '\t') // most likely annoy more people than it saves space.

    // Let's waste some memory and cpu
    // and pick the algo that offers the best space efficiency
    // feel free to add more algorithms as long as they aren't too heavy deps.
    const candidates = [
      Buffer.from(text, 'utf8'),
      compress(Buffer.from(text, 'utf8')),
      compressToUint8Array(text)
    ]
    // Overwrite with compressed data
    const winrar = [...candidates].sort((a, b) => a.length > b.length)[0]
    // And leave a note of what type of compression was used.
    card.compression = candidates.indexOf(winrar)
    card.text = Buffer.from(winrar)

    this.__secret = secret // TODO: introduces state, but i'm to lazy to fix title getter.
    if (this.__secret) {
      card.encryption = 1
      card.text = encrypt(card.text, this.__secret)
    }

    this.truncate(0) // evict all previous data.
    this.append({ card }, sk)
    return card.text.length
  }

  static from (source, opts = {}) {
    const card = new Picocard()
    const d = Feed.from(source, opts)
    card.buf = d.buf
    card.tail = d.tail
    card._lastBlockOffset = d._lastBlockOffset
    return card
  }
}
