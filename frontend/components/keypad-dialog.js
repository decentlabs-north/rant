import Tonic from '@socketsupply/tonic/index.esm.js'
import './keypad-dialog.css'
import { write, next, get } from 'piconuro'
import { nEl, nClick } from '../surgeon.js'
import { encrypt, decrypt } from '../encryption.js'

const [$secret, setSecret] = write('')
Tonic.add(class KeypadDialog extends Tonic {
  click (e) {
    const KeyPad = document.getElementById('KeyPadDisplay')
    const KeyPadVal = document.getElementById('KeyPadDisplay').value
    const KeyPadUnlock = document.getElementById('KeyPadDisplayUnlock')
    const KeyPadUnlockVal = document.getElementById('KeyPadDisplayUnlock').value
    // if number button is pressed
    if (e.target.accessKey === 'keyBtn') {
      KeyPad.value = KeyPadVal + e.target.value
      // if lock button is pressed
    } else if (e.target.accessKey === 'lockBtn') {
      // console.log(KeyPadVal)
      // if backspace button is pressed
    } else if (e.target.accessKey === 'BackspaceBtn') {
      const NewVal = RemoveLastChar(KeyPadVal)
      KeyPad.value = NewVal
    }
    // if number button is pressed
    if (e.target.accessKey === 'keyBtnUnlock') {
      KeyPadUnlock.value = KeyPadUnlockVal + e.target.value
      if (KeyPadUnlock.placeholder !== '') KeyPadUnlock.placeholder = ''
      // if lock button is pressed
    } else if (e.target.accessKey === 'UnlockBtn') {
      // console.log(KeyPadVal)
      // if backspace button is pressed
      setSecret(KeyPadUnlockVal)
    } else if (e.target.accessKey === 'BackspaceBtnUnlock') {
      const NewVal = RemoveLastChar(KeyPadUnlockVal)
      KeyPadUnlock.value = NewVal
    }
  }

  render () {
    if (this.props.post === 'false') {
      return this.html`
      <div class='keypad'>
        <div class='row'>
          <input id='KeyPadDisplayUnlock' type='password' disabled/>
          <button accessKey="BackspaceBtnUnlock" class='backspace-button'>⌫</button>
        </div>
        <div class='row'>
          <button value='1' accessKey='keyBtnUnlock' class='num-button'>1</button>
          <button value='2' accessKey='keyBtnUnlock' class='num-button'>2</button>
          <button value='3' accessKey='keyBtnUnlock' class='num-button'>3</button>
        </div>
        <div class='row'>
          <button value='4' accessKey='keyBtnUnlock' class='num-button'>4</button>
          <button value='5' accessKey='keyBtnUnlock' class='num-button'>5</button>
          <button value='6' accessKey='keyBtnUnlock' class='num-button'>6</button>
        </div>
        <div class='row'>
          <button value='7' accessKey='keyBtnUnlock' class='num-button'>7</button>
          <button value='8' accessKey='keyBtnUnlock' class='num-button'>8</button>
          <button value='9' accessKey='keyBtnUnlock' class='num-button'>9</button>
        </div>
        <div class='row'>
          <button accessKey='UnlockBtn' class='lock-button' id='unlock-button'>Unlock</button>
        </div>
      </div>
    `
    } else {
      return this.html`
      <div class='keypad'>
        <div class='row'>
          <input id='KeyPadDisplay' type='password' disabled/>
          <button accessKey="BackspaceBtn" class='backspace-button'>⌫</button>
        </div>
        <div class='row'>
          <button value='1' accessKey='keyBtn' class='num-button'>1</button>
          <button value='2' accessKey='keyBtn' class='num-button'>2</button>
          <button value='3' accessKey='keyBtn' class='num-button'>3</button>
        </div>
        <div class='row'>
          <button value='4' accessKey='keyBtn' class='num-button'>4</button>
          <button value='5' accessKey='keyBtn' class='num-button'>5</button>
          <button value='6' accessKey='keyBtn' class='num-button'>6</button>
        </div>
        <div class='row'>
          <button value='7' accessKey='keyBtn' class='num-button'>7</button>
          <button value='8' accessKey='keyBtn' class='num-button'>8</button>
          <button value='9' accessKey='keyBtn' class='num-button'>9</button>
        </div>
        <div class='row'>
          <button accessKey='lockBtn' class='lock-button' id='lock-button'>Lock</button>
        </div>
      </div>
    `
    }
  }
})

// Function to remove the last char in string
function RemoveLastChar (value) {
  value = value.slice(0, -1)
  return value
}

export async function Keypad () {
  console.log('KeyPad Triggered')
}

// async function promptPINold (Incorrect) {
//   const [$secret, setSecret] = write('')
//   document.getElementById('KeyPadDisplayUnlock').placeholder = ''

//   if (Incorrect) {
//     document.getElementById('KeyPadDisplayUnlock').value = ''
//     document.getElementById('KeyPadDisplayUnlock').placeholder = 'Incorrect PIN'
//   }

//   nEl('edit-keypad-dlg2').open = true
//   nClick('unlock-button', async () => {
//     const value = document.getElementById('KeyPadDisplayUnlock').value
//     setSecret(value)
//     document.getElementById('KeyPadDisplayUnlock').value = ''
//     nEl('edit-keypad-dlg2').open = false
//   })
//   const returnValue = await next($secret)
//   console.log('[keypad-dialog] returnValue:', returnValue)
//   return returnValue
// }

function showKeypad () {
  nEl('edit-keypad-dlg2').open = true
}
function hideKeypad () {
  document.getElementById('KeyPadDisplayUnlock').placeholder = ''
  document.getElementById('KeyPadDisplayUnlock').value = ''
  nEl('edit-keypad-dlg2').open = false
}

async function tryDecrypt (message, secret) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(decrypt(message, secret) !== '')
    }, 1000)
  })

  // const unlocked = (await decrypt(message, secret) !== '')
  // return unlocked
}

async function waitForInput (text) {
  const x = await next($secret)
  const unlock = await decrypt(text, x)
  console.log('UNLOCK: ', unlock)
  if (unlock !== '') { return x } else {
    waitForInput(text)
  }
}

export async function promptPIN (text) {
  showKeypad()
  // const [$secret, setSecret] = write('')
  // nClick('unlock-button', async () => {
  //   const value = document.getElementById('KeyPadDisplayUnlock').value
  //   setSecret(value)
  //   document.getElementById('KeyPadDisplayUnlock').value = ''
  // })

  const PIN = await waitForInput(text)

  hideKeypad()

  return PIN

  // while (true) {
  //   const x = get($secret)
  //   // const unlocked = (await decrypt(text, x) !== '')
  //   console.log('trying to unlock')
  //   console.log('text: ', text)
  //   console.log('secret: ', get($secret))
  //   const decryptTimeout = new Date().setSeconds(new Date().getSeconds() + 20)
  //   const unlocked = (await decrypt(text, get($secret), decryptTimeout) !== '')
  //   console.log('unlocked?', unlocked)
  //   if (unlocked) {
  //     hideKeypad()
  //     return x
  //   } else {
  //     console.error('incorrect PIN')
  //     document.getElementById('KeyPadDisplayUnlock').value = ''
  //     document.getElementById('KeyPadDisplayUnlock').placeholder = 'Incorrect PIN'
  //     await next($secret)
  //   }
  // }
}
