import Tonic from '@socketsupply/tonic/index.esm.js'
import { processText, unpackFeed } from '../../blockend/picocard.js'
import { kernel, setMode } from '../api.js'
import { navigate } from '../router.js'
import { nEl } from '../surgeon.js'
import { get } from 'piconuro'
import { promptPIN } from './keypad-dialog.js'

const CHEATSHEET = unpackFeed('PIC0.K0.GFZu8O6IJ1_4DVdAZHQr32fJx8afn6MUbyyXz987iLAB0.3Dq-Z9Oa8L6SiTU6LWCssrPRyPN_RPXC40XzrwQf2dHdWTWGyUpwzvFoMYzZ3_DTtXlvgl1EI+1Z+pGPCJcFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOw3gAHoWIAoXTFA44jIENoZWF0U2hlZXQKCiMjIE1hY3JvcwoKfCBleHByZXNzaW9uIHwgbmFtZXwgc3RhdHVzfAp8LcQBxgbIBy0tOnwKfGAh8J+TtyAhYHwgQmlnIEVtb2ppIFBpY3R1cmVzfCBkb25lxCZ7a2V5fWB8IEF1dGhvciBQdWJsaWMta2V5fCB0b2RvxSN0OmVwb2NoXHxmb3JtYXTEL0NvdW50ZG93bssnZzp1NjIycmQ4bXdwfWAgfCBFbWJlZCBHZW9oYXNofCBwbGFubmVkIMQtfn54b3I6cHdcfHJlZGFjdGVkfn7EM0lucGxhY2UgZW5jcnlwdOYA88s65AEZQmFzaWNzCiMjIyBUeXBvZ3JhcGh5CnzqASZ8cmVzdWx05gEexQQKfGAqKmJvbGQqKsRmICAgyA_EG19pdGFsaWNzX2B8IMkMxBl+flN0cmlrZSBUaHJvdWdo5gCk0hZ8CnwgQmFja3RpY2tzLcViYGNvZGVg5gCyIyBIZWFkaW5ncwpgYGBtYXJr5AE6CskXIDHkANfIDTLMMiAzxA7KDzTFD8oQNcYQyhE2xGPGdUxpc3TlAScjIyBVbm9yZGVyZWTtAIItIHN3aW1txDh3ZWFyCi0gcGFzc3BvcnTEG3VuZ2xhc3Nl5QC2xVMjIyBP00cxLiBNb25rZXkKMskKMy4gQmFuYW5hxT3EOlRhYmxlcwrNOnwgYWxpZ24gcmlnaHQgyA5sZWbKDWNlbnRlcuQCNegC3sQBOnw6yw7NDeUC_uQB4yAgyVjFUsYBxRttaWRkbGXFD8ksxAEwIHwgQ2HIK8YsygHNLEFCIHwgQUxQSEEgQkVUQcgseMks6AD4TGlua3MgJmFtcDsgSW1hZ_ABBFvEISB0ZXh0XShodHRwczovL2hvc3QudGxkKQohW2FsdCBpxDjXJC_FHS5wbmcpxXRfVE9ETzogYmxvY2sgcmVtb3RlxkBzIGZyb20gdW50cnVzdGVkIGHlA_RzLl_mAjBCxDJxdW90Ze0AoD4gVGhlIHRyZWUgd2FzIHRhbGxlciB0aGFuIGFueXRo5AI+c2hlCj4gaGFkIGV2ZXIgc2VlbiBiZWZvcmUuCj4KPiAtVGhleSBzYWlkIGl0xShixCN0aGVyZSBhIHdoaWxlLuoCukNvZGXmAI9zCuQBTcQZxAggIGNvbnN0IHggPSA0MssTb2xlLmxvZyh4KcgwoXoBoXgAoWwAoWTLQngxnEIYkAChcwo')
const PITCH = unpackFeed('PIC0.K0.xQLjkWClGDyYFYam0PBJa1I0UFpKa7AhS_TNdBO0wWMB0.MGnJgexXLCNKXt-r3TddbRsP6Vvy6LdeGcF8SK_f1ou7N2_fGnEEwjrdZLQ4TiG4smbEV7CS4m6DTlBkTJk0CQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEu3gAHoWIAoXTFAQwxACCECMDWYFCwFQBYEsDOJ0gIYgC4oB2AniAGYCuANlaQPoDCVA9hQCZkBOApt3SADlmebgAdsbAHSwAknhAB3ZpygYAxswC2oqtxG0QzMmSpFuAGhyE2ilDRBok2HiELDuGAG4pcARQBKGmwWIACq_gAyVjaivJwAtABM8bHcnA4KzprSsMCgESiaKHiwIAB8IADyhNwgANJ2zCAAQsQi8MjYeADkGAB+iQAMg4rKbBh4TUjcVKIgxKzkzGoUGMyEik7yWIWiynjYhHg5ADy4SDxkALwARMDcAPQ1CjcgnMy6twBGFHiThK81FRsGg0N8WGooDcyghOKRiicHtgyvAwIAeDcAwvtwIAAoXoCoXgAoWwAoWTLQngx2M+2QAChcwI')

Tonic.add(class MessagePreview extends Tonic {
  async click (e) {
    if (!e.target.matches('button.create')) return
    console.log('Button clicked')
    const [id] = await kernel.checkout(null)
    setMode(true)
    navigate(`edit/${id}`)
  }

  preprocess (text = '') {
    const rant = this.props
    // rant provided for macros such as Date&Key
    return processText(text, rant)
  }

  async render () {
    // console.log('MP', this.props)
    const { pickle, state, encrypted } = this.props?.n || {}
    let secret
    if (encrypted) {
      secret = await promptUntilCorrect()
    }
    const rant = get(kernel.$rant(secret))

    /** a little hacky but it works for now */
    nEl('markdown-area').value = rant.message // TODO: Alter the rendering process so that message-preview is rendered before the editor if possible

    if (pickle) console.log('We have a pickle!', pickle)
    if (rant.message === '' && state !== 'draft') {
      return this.html`<code>Empty Casette</code>`
    }
    if (this.props.id === 'pitch-render') {
      nEl('render-ctrls')?.reRender({ state: 'pitch' })
      // TODO: fix SEO for pitch.
      return this.html`
        ${this.html([this.preprocess(PITCH.text)])}
      `
    }

    nEl('render-ctrls')?.reRender({ state, rant: this.props.n })
    const md = this.preprocess(rant.message || CHEATSHEET.text)
    return this.html([md])
  }
})

/**
 * Recursive pin code prompt, it might need some tinkering
 * TODO: break after certain amount of failed tries
 */
const promptUntilCorrect = async (s) => {
  if (s) {
    const rant = get(kernel.$rant(s))
    if (!rant.message) {
      const secret = await promptPIN(true)
      return await promptUntilCorrect(secret)
    } else {
      return s
    }
  } else {
    const secret = await promptPIN(true)
    return await promptUntilCorrect(secret)
  }
}
