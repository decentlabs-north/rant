import Tonic from '@socketsupply/tonic/index.esm.js'
import { getStyleSheet } from '../injector.js'
import { write, next, get } from 'piconuro'
import { nEl } from '../surgeon.js'
import { decrypt } from '../encryption.js'
import { kernel } from '../api.js'

const [$secret, setSecret] = write('')
const [$text, setText] = write('')
const [$unlockState, setUnlockState] = write(false)
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
        break
      case 'BackspaceBtn':
        keyPad.value = RemoveLastChar(keyPadVal)
        break
      case 'closeBtn':
        if (nEl('edit-keypad-dlg').open) nEl('edit-keypad-dlg').open = false
        else if (nEl('edit-keypad-dlg2').open) nEl('edit-keypad-dlg2').open = false
        keyPad.value = ''
        break
      /* Unlock KeyPad */
      case 'keyBtnUnlock':
        keyPad.value = keyPadVal + e.composedPath()[0].value
        if (keyPad.placeholder !== '') keyPad.placeholder = ''
        break
      case 'UnlockBtn':
        setSecret(keyPadVal)
        await tryUnlock(keyPad)
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
 * Sets secret in {@link kernel} and encrypts the rant text with {@link kernel.encryptMessage|encryptMessage}
 * @param {*} secret user provided secret
 */
async function pushSecret (secret) {
  await kernel.setSecret(secret)
  await kernel.encryptMessage(secret)
}
/**
 * Tries to {@link decrypt} rant text with user provided secret.
 */
async function tryUnlock (keypadDisplay) {
  const secret = get($secret)
  const text = get($text)
  try {
    const unlock = await decrypt(text, secret)
    if (unlock !== '') {
      setUnlockState(true)
      setText(unlock)
    } else {
      keypadDisplay.placeholder = 'Incorrect PIN'
    }
  } catch (e) {
    if (e.message === 'Malformed UTF-8 data') {
      keypadDisplay.placeholder = 'Incorrect PIN?'
      console.info('Actually an error occured. If this happend while entering the correct PIN try reloading the page.')
    }
  }
}
/**
 * Reccursive function that waits for {@link $unlockState} to change.
 * @returns Dectypted rant text | {@link waitForInput}
 */
async function waitForInput (text) {
  const state = await next($unlockState)
  if (state) {
    return get($text)
  } else return waitForInput()
}

/**
 * Used to display keypad-dialog and decrypt rant text on user input.
 * @param {*} text Encrypted rant text
 * @returns Decrypted rant text
 */
export async function promptPIN (text) {
  setText(text)
  nEl('edit-keypad-dlg2').open = true

  const decryptedMessage = await waitForInput(text)

  nEl('edit-keypad-dlg2').open = false
  setUnlockState(false)

  return decryptedMessage
}
