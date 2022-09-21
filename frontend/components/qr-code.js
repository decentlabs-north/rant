import Tonic from '@socketsupply/tonic/index.esm.js'
import QR from 'qrcode-generator'

export class QrCode extends Tonic {
  render () {
    let data = this.props.n || ''
    const level = this.props.level || 'L'
    const margin = this.props.margin || 15
    const size = this.props.size || 4
    if (!data) {
      return this.html`<!--qr-code data empty-->`
    }
    if (Buffer.isBuffer(data)) data = data.toString('base64')
    const qr = new QR(0, level)
    qr.addData(data, 'Byte')
    qr.make()
    const svg = qr.createSvgTag(size, margin)
    return this.html`
      ${this.html([svg])}
    `
  }
}
Tonic.add(QrCode)
