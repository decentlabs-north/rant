import Tonic from '@socketsupply/tonic/index.esm.js'
import { getStyleSheet } from '../injector.js'
import { write, next } from 'piconuro'
import { nEl } from '../surgeon.js'

const [$secret, setSecret] = write(null)
Tonic.add(class KeypadDialog extends Tonic {
  constructor () {
    super()
    this.state.styles = getStyleSheet('keypad-dialog')
    this.attachShadow({ mode: 'open' }) // <-- Shadow DOM
  }

  async click (e) {
    let keyPad
    let keyPadVal
    if (this.props.post === 'false') {
      keyPad = this.shadowRoot.getElementById('KeyPadDisplayUnlock')
      keyPadVal = this.shadowRoot.getElementById('KeyPadDisplayUnlock').value
    } else {
      keyPad = this.shadowRoot.getElementById('KeyPadDisplay')
      keyPadVal = this.shadowRoot.getElementById('KeyPadDisplay').value
    }
    switch (e.composedPath()[0].accessKey) { // TODO: add mode switch that allows usage of the same "<keypad-dialog>" for multiple purposes
      case 'keyBtn':
        keyPad.value = keyPadVal + e.composedPath()[0].value
        break
      case 'lockBtn':
        await pushSecret(keyPadVal)
        nEl('edit-keypad-dlg').open = false
        keyPad.value = ''
        break
      case 'BackspaceBtn':
        keyPad.value = RemoveLastChar(keyPadVal)
        break
      case 'closeBtn':
        if (nEl('edit-keypad-dlg').open) nEl('edit-keypad-dlg').open = false
        else if (nEl('edit-keypad-dlg2').open) nEl('edit-keypad-dlg2').open = false
        keyPad.value = ''
        setSecret('EVENT:CLOSE')
        break
      /* Unlock KeyPad */
      case 'keyBtnUnlock':
        keyPad.value = keyPadVal + e.composedPath()[0].value
        if (keyPad.placeholder !== '') keyPad.placeholder = ''
        break
      case 'UnlockBtn':
        setSecret(keyPadVal)
        keyPad.value = ''
        break
      case 'BackspaceBtnUnlock':
        keyPad.value = RemoveLastChar(keyPadVal)
        break
    }
  }

  render () {
    const b = this.props.post === 'false'
    const KeypadClass = {
      ...(b ? { display: 'KeyPadDisplayUnlock' } : { display: 'KeyPadDisplay' }),
      ...(b ? { backspace: 'BackspaceBtnUnlock' } : { backspace: 'BackspaceBtn' }),
      ...(b ? { number: 'keyBtnUnlock' } : { number: 'keyBtn' }),
      ...(b ? { lock: 'UnlockBtn' } : { lock: 'lockBtn' }),
      ...(b ? { lockID: 'unlock-button' } : { lockID: 'lock-button' }),
      ...(b ? { lockText: 'Unlock' } : { lockText: 'Lock' }),
      ...(b ? { close: 'close-unlock' } : { close: 'close-lock' })
    }
    const buttonArr = []
    for (let i = 1; i < 10; i++) { buttonArr.push(this.html(`<button value='${i}' accessKey='${KeypadClass.number}' class='num-button'>${i}</button>`)) }
    const rowArr = []
    for (let i = 0; i < 3; i++) {
      const s = i < 1 ? 0 : i * 3 // Super Advanced Mathematics :)
      const e = i < 1 ? 3 : i * 3 + 3 // TODO: simplify the button factory
      rowArr.push(this.html(`<div class='row'>${buttonArr.slice(s, e).join('')}</div>`))
    }
    return this.html`
      <div class='keypad'>
        <div class='row'>
          <input id='${KeypadClass.display}' type='password' data-value='1' disabled/>
          <button accessKey="${KeypadClass.backspace}" class='backspace-button'>⌫</button>
        </div>
        ${rowArr}
        <div class='row'>
          <button accessKey='${KeypadClass.lock}' class='lock-button' id='${KeypadClass.lockID}'>${KeypadClass.lockText}</button>
        </div>
        <button accessKey='closeBtn' class='close-btn ${KeypadClass.close}'>Close</button>
      </div>
    `
  }

  /**
   * See ***[`injector.js`](../injector.js)***
   * for more details on how the stylesheet gets injected.
   * @returns injected stylesheet
   */
  stylesheet () {
    return this.state.styles
  }
})

function RemoveLastChar (value) {
  value = value.slice(0, -1)
  return value
}
/**
 * Sets secret
 * @param {*} secret user provided secret
 */
async function pushSecret (secret) {
  setSecret(secret)
}

/**
 * Used to display keypad-dialog
 * @param {*} mode lock/unlock mode
 * @returns secret
 */
export async function promptPIN (mode) { // TODO: clean this up it looks terrible (but it works)
  if (mode) {
    nEl('edit-keypad-dlg2').open = true
    const secret = await next($secret)
    nEl('edit-keypad-dlg2').open = false
    setSecret(null)
    return secret
  } else {
    nEl('edit-keypad-dlg').open = true
    const secret = await next($secret)
    if (secret === 'EVENT:CLOSE') {
      return false
    }
    nEl('edit-keypad-dlg').open = false
    setSecret(null)
    return secret
  }
}
