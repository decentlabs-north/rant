import Tonic from '@socketsupply/tonic/index.esm.js'
import './keypad-dialog.css'

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
