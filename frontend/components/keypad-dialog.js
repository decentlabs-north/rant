import Tonic from '@socketsupply/tonic/index.esm.js'
// import './keypad-dialog.css'
import { write, next, get } from 'piconuro'
import { nEl } from '../surgeon.js'
import { decrypt } from '../encryption.js'
import { kernel } from '../api.js'

const [$secret, setSecret] = write('')
const [$text, setText] = write('')
const [$unlockState, setUnlockState] = write(false)
Tonic.add(class KeypadDialog extends Tonic {
  async click (e) {
    const KeyPad = document.getElementById('KeyPadDisplay')
    const KeyPadVal = document.getElementById('KeyPadDisplay').value
    const KeyPadUnlock = document.getElementById('KeyPadDisplayUnlock')
    const KeyPadUnlockVal = document.getElementById('KeyPadDisplayUnlock').value

    switch (e.target.accessKey) { // TODO: add mode switch that allows usage of the same "<keypad-dialog>" for multiple purposes
      case 'keyBtn':
        KeyPad.value = KeyPadVal + e.target.value
        break
      case 'lockBtn':
        await pushSecret(KeyPadVal)
        nEl('edit-keypad-dlg').open = false
        break
      case 'BackspaceBtn':
        KeyPad.value = RemoveLastChar(KeyPadVal)
        break
      case 'closeBtn':
        if (nEl('edit-keypad-dlg').open) nEl('edit-keypad-dlg').open = false
        else if (nEl('edit-keypad-dlg2').open) nEl('edit-keypad-dlg2').open = false
        break
      /* Unlock KeyPad */
      case 'keyBtnUnlock':
        KeyPadUnlock.value = KeyPadUnlockVal + e.target.value
        if (KeyPadUnlock.placeholder !== '') KeyPadUnlock.placeholder = ''
        break
      case 'UnlockBtn':
        setSecret(KeyPadUnlockVal)
        await tryUnlock()
        document.getElementById('KeyPadDisplayUnlock').value = ''
        break
      case 'BackspaceBtnUnlock':
        KeyPadUnlock.value = RemoveLastChar(KeyPadUnlockVal)
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
          <input id='${KeypadClass.display}' type='password' disabled/>
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

  static stylesheet () {
    return `
      .keypad{
        position: relative;
        display: flex;
        flex-direction: column;
        padding: 1rem;
        width: fit-content;
      }
      .keypad .num-button{
        width: 100%;
        margin: 0.1rem !important;
        border-radius: 0;
      }
      .keypad .lock-button{
        margin: 0.1rem !important;
      }
      .keypad .row{
        justify-content: space-around;
      }
      .keypad .backspace-button{
        width: auto !important;
        margin: auto !important;
        margin-bottom: 1rem !important;
        border-top-left-radius: 0 !important;
        border-bottom-left-radius: 0 !important;
      }
      #KeyPadDisplay{
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
      }
      #KeyPadDisplayUnlock{
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
      }
      #KeyPadDisplayUnlock::placeholder {
        color: #f14646;
        opacity: 1;
      }
      .keypad-article{
        overflow: hidden;
      }
      .unlock-keypad-title{
        display: flex;
        transition: 0.2s;
      }
      .unlock-keypad-title span{
        text-align: center;
        margin: auto;
        font-size: 1.5rem;
      }

      .close-unlock{
        top: -100px;
      }
      .close-lock{
        top: -60px;
      }
      .close-btn{
        position: absolute;
        width: fit-content;
        background-color:rgba(1, 1, 1, 0);
        border: none;
        box-shadow: inset -3px -3px 15px rgba(0, 0, 0, 0.1);
        border-bottom-right-radius: 1.8rem;
        left: -30px;
      }
      .close-btn:hover{
        background-color:#e75e5e;
        box-shadow: 3px 3px 10px rgba(0, 0, 0, 0.3);
      }
      .close-btn:focus{
        box-shadow: none;
      }
    `
  }
})

function RemoveLastChar (value) {
  value = value.slice(0, -1)
  return value
}

async function pushSecret (secret) {
  await kernel.setSecret(secret)
  await kernel.encryptMessage(secret)
}

async function tryUnlock () {
  const secret = get($secret)
  const text = get($text)
  try {
    const unlock = await decrypt(text, secret)
    if (unlock !== '') {
      setUnlockState(true)
      setText(unlock)
    } else {
      document.getElementById('KeyPadDisplayUnlock').placeholder = 'Incorrect PIN'
    }
  } catch (e) {
    if (e.message === 'Malformed UTF-8 data') {
      document.getElementById('KeyPadDisplayUnlock').placeholder = 'Incorrect PIN?'
      console.info('Actually an error occured. If this happend while entering the correct PIN try reloading the page.')
    }
  }
}

async function waitForInput (text) {
  const state = await next($unlockState)
  if (state) {
    return get($text)
  } else return waitForInput()
}

export async function promptPIN (text) {
  setText(text)
  nEl('edit-keypad-dlg2').open = true

  const decryptedMessage = await waitForInput(text)

  document.getElementById('KeyPadDisplayUnlock').placeholder = ''
  document.getElementById('KeyPadDisplayUnlock').value = ''
  nEl('edit-keypad-dlg2').open = false
  setUnlockState(false)

  return decryptedMessage
}
