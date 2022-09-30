import Tonic from '@socketsupply/tonic/index.esm.js'
import './keypad-dialog.css'
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

    switch (e.target.accessKey) {
      case 'keyBtn':
        KeyPad.value = KeyPadVal + e.target.value
        break
      case 'lockBtn':
        await psuhSecret(KeyPadVal)
        nEl('edit-keypad-dlg').open = false
        break
      case 'BackspaceBtn':
        KeyPad.value = RemoveLastChar(KeyPadVal)
        break
      case 'closeBtn':
        nEl('edit-keypad-dlg').open = false
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

  /**
   * TODO: dedupe to avoid messy looking code
   */
  render () {
    const b = this.props.post === 'false'
    const KeypadClass = {
      ...(b ? { display: 'KeyPadDisplayUnlock' } : { display: 'KeyPadDisplay' }),
      ...(b ? { backspace: 'BackspaceBtnUnlock' } : { backspace: 'BackspaceBtn' }),
      ...(b ? { number: 'keyBtnUnlock' } : { number: 'keyBtn' }),
      ...(b ? { lock: 'UnlockBtn' } : { lock: 'lockBtn' }),
      ...(b ? { lockID: 'unlock-button' } : { lockID: 'lock-button' }),
      ...(b ? { lockText: 'Unlock' } : { lockText: 'Lock' })
    }
    return this.html`
      <div class='keypad'>
        <div class='row'>
          <input id='${KeypadClass.display}' type='password' disabled/>
          <button accessKey="${KeypadClass.backspace}" class='backspace-button'>⌫</button>
        </div>
        <div class='row'>
          <button value='1' accessKey='${KeypadClass.number}' class='num-button'>1</button>
          <button value='2' accessKey='${KeypadClass.number}' class='num-button'>2</button>
          <button value='3' accessKey='${KeypadClass.number}' class='num-button'>3</button>
        </div>
        <div class='row'>
          <button value='4' accessKey='${KeypadClass.number}' class='num-button'>4</button>
          <button value='5' accessKey='${KeypadClass.number}' class='num-button'>5</button>
          <button value='6' accessKey='${KeypadClass.number}' class='num-button'>6</button>
        </div>
        <div class='row'>
          <button value='7' accessKey='${KeypadClass.number}' class='num-button'>7</button>
          <button value='8' accessKey='${KeypadClass.number}' class='num-button'>8</button>
          <button value='9' accessKey='${KeypadClass.number}' class='num-button'>9</button>
        </div>
        <div class='row'>
          <button accessKey='${KeypadClass.lock}' class='lock-button' id='${KeypadClass.lockID}'>${KeypadClass.lockText}</button>
        </div>
      </div>
    `
  }
})

function RemoveLastChar (value) {
  value = value.slice(0, -1)
  return value
}

async function psuhSecret (secret) {
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
