import Tonic from '@socketsupply/tonic/index.esm.js'
import { createPicker } from 'picmo'
import './emoji-input.css'

const container = document.querySelector('.pickerContainer')
const textArea = document.getElementById('markdown-area')

const picker = createPicker({
  rootElement: container
})
picker.addEventListener('emoji:select', event => {
  textArea.value = addEmoji(textArea.value, event.emoji)
  textArea.dispatchEvent(new Event('change'))
  textArea.focus()
})

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

Tonic.add(class EmojiInput extends Tonic {
  async click (e) {
    if (e.target.accessKey === 'emoji-button') {
      addClearBtn()
      await openPicker()
    }
  }

  render () {
    return this.html('<div><button class="emoji-button" id="emoji-button" accessKey="emoji-button">🙂</button></div>')
  }
})

function addEmoji (text, emoji) {
  const dataState = document.getElementById('view-editor').getAttribute('data-state')
  if (dataState === 'signed') {
    return text
  } else {
    return text + emoji
  }
}

async function openPicker () {
  picker.reset()
  textArea.focus()
  const btn = document.querySelector('.emoji-button')

  btn.classList.toggle('emoji-btn-closed')
  container.classList.toggle('emoji-closed')
  btn.classList.toggle('emoji-btn-animation')
  textArea.classList.toggle('md-area-small')

  if (container.classList.contains('emoji-show')) { await sleep(100) }
  container.classList.toggle('emoji-show')
  btn.classList.toggle('emoji-btn-closed')
}

function addClearBtn () {
  const btnExists = document.getElementById('clearRecentBtn') !== null
  if (!btnExists) {
    const el = document.querySelector('.categoryName')
    const newEl = document.createElement('span')
    newEl.innerText = 'clear recent'
    newEl.id = 'clearRecentBtn'

    newEl.addEventListener('click', () => {
      picker.clearRecents()
      const recentEmojis = document.querySelector('.recentEmojis')
      recentEmojis.setAttribute('data-empty', true)
      Array.from(recentEmojis.children[0].children)
        .forEach(element => element.remove())
      picker.reset()
      console.info('cleared recent Emoji-data')
    })
    el.appendChild(newEl)
  }
}
