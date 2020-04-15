const Feed = require('picofeed')
const { RantMessage } = require('./messages')
const { compress, decompress } = require('lzutf8')
const { compressToUint8Array, decompressFromUint8Array } = require('lz-string')


module.exports = class Picocard extends Feed {
  constructor () {
    super({ contentEncoding: RantMessage })
  }
  get key () {
    for (const { key } of this.blocks()) return key
  }
  get theme () { return this._card.theme }
  get date () { return this._card.date }
  get text () {
    const decompressors = [
      i => i.toString('utf8'),
      decompress,
      decompressFromUint8Array
    ]
    const card = this._card
    return decompressors[card.compression](card.text)
  }
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

  _pack (props, sk) {
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
      date: new Date().getTime(),
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
    const winrar = [ ...candidates ].sort((a, b) => a.length > b.length)[0]
    // And leave a note of what type of compression was used.
    card.compression = candidates.indexOf(winrar)
    card.text = Buffer.from(winrar)
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
