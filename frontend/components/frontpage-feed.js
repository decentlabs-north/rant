import Tonic from '@socketsupply/tonic/index.esm.js'
import { publicKernel as pub, kernel as prev } from '../api.js'
import { gate, combine, mute } from 'piconuro'
import { isRantID, btok } from '../../blockend/kernel.js'
import { processText, THEMES } from '../../blockend/picocard.js'
import Modem56 from 'picostack/modem56.js'
import { nEl } from '../surgeon.js'
import { createAlert } from './alert.js'

const TOPIC = 'GLOBAL_RANT_WARNING'

Tonic.add(class FrontpageFeed extends Tonic {
  constructor () {
    super()
    this.modem = new Modem56()
    this.isSwarming = true
    this.modem.join(TOPIC, (...a) => pub.spawnWire(...a))
    console.log('second kernel booted, topic joined', TOPIC)
    this.reRender(p => p)
    // this.attachShadow({ mode: 'open' }) // <-- Shadow DOM | i leave this here since we might need it when we configure html sanitize for Marked
  }

  connected () {
    this.ready = this.dataset.ready === 'true'

    // Filter rants that exist in local notebook.
    const $rants = pub.$rants()
    const $state = gate(
      combine({
        rants: $rants,
        peers: mute(pub.$connections(), c => c.length)
      })
    )
    this.unsub = $state(state => {
      this.reRender(prev => ({ ...prev, ...state }))
    })
  }

  disconnected () { this.unsub() }

  render () {
    const unSortedRants = this.props.rants || []
    const peers = this.props.peers || 0
    this.classList.add('pad')

    const listRants = () => {
      if (!unSortedRants.length) {
        return this.html`
          <h5 aria-busy="true">Searching for peers...</h5>
        `
      }
      // sort the rants. Display long lived at top.
      const rants = unSortedRants.sort((a, b) => b.expiresAt - a.expiresAt)
      return rants.map(rant => {
        return this.html`
          <rant-card rant=${rant}></rant-card>
        `
      })
    }

    return this.html`
    <div style="text-align: center;">
      <h1 style="font-size: 6rem; margin-bottom:0.25rem;">1k</h1>
      <p>Real Times News Network</p>
    </div>
    <div>
      Peers: ${peers + ''}
    </div>
      ${listRants()}
    `
  }

  static stylesheet () {
    return `
      discover-page { display: block; }
    `
  }
})

/**
 * converts expire date to a readble format
 * @param {Number} ms
 * @returns readable time format
 */
const convertToReadableLifeSpan = (ms) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = ((ms % 60000) / 1000).toFixed(0)
  return minutes + ':' + (seconds < 10 ? '0' : '') + seconds
}

/**
 * Updates the lifetime of rant
 * @param {Element} el
 * @param {Number} expiresAt
 */
const timeTick = (el, expiresAt) => {
  el.innerText = convertToReadableLifeSpan(expiresAt - Date.now())
}

class RantCard extends Tonic {
  async click (ev) {
    const el = Tonic.match(ev.target, 'b[data-id]')
    if (el) {
      const rantId = el.dataset.id
      try {
        await pub.bump(rantId)
      } catch (e) {
        // console.error(e) <-- uncomment this is debugging filter
        e.message = e.toString().split('Error: InvalidBlock: ')[1]
        switch (e.message) {
          case 'TooSoonToBump':
            el.setAttribute('disabled', 'true')
            setTimeout(() => el.removeAttribute('disabled'), 2000)
            createAlert(nEl(`frontpage-alert-${rantId}`), 'danger', 'Rant was recently bumped. Try again in a couple of seconds!', true)
            break
          case 'BumpLimitReached':
            createAlert(nEl(`frontpage-alert-${rantId}`), 'danger', 'Bump Limit Reached', true)
            break
          case 'TimeManipulation':
            createAlert(nEl(`frontpage-alert-${rantId}`), 'danger', 'Time Manipulation Detected!', true)
            break
          case 'TooLate':
            createAlert(nEl(`frontpage-alert-${rantId}`), 'danger', 'Rant already expired 😢', true)
            break
          case 'AlreadyBumped':
            createAlert(nEl(`frontpage-alert-${rantId}`), 'danger', 'You have alerady bumped this rant!', true)
            break
          default:
            break
        }
      }
    }
  }

  /**
   * After render adds interval to update the rant lifetime
   */
  connected () {
    const rant = this.props.rant
    const id = btok(rant.id)
    const lifeSpanEl = nEl(`lifespan-${id}`)
    setInterval(() => timeTick(lifeSpanEl, rant.expiresAt), 1000)

    // console.log(rant.bumpedBy[0].equals(prev.pk))
  }

  render () {
    const rant = this.props.rant
    const key = pub.pk

    const lifeTime = convertToReadableLifeSpan(rant.expiresAt - Date.now())

    if (!isRantID(rant?.id)) return this.html`<error>Invalid rant</error>`

    const id = btok(rant.id)
    const text = this.html([processText(rant.text)])

    const hasBumped = rant.bumpedBy.some((bumper) => bumper.equals(key))
    const isOwnRant = rant.author.equals(prev.pk)

    const dopeButton = (rant.bumpCount < 10 && !hasBumped)
      ? isOwnRant ? this.html`<small>Your Rant</small>` : this.html`<b role="button" class="btn-round" data-id="${id}"><span>💩</span></b> <span class="btn-dope-text">+5min</span>`
      : hasBumped
        ? this.html`<small>You bumped this</small>`
        : this.html`<small>bump limit reached</small>`

    return this.html`
    <div id="frontpage-alert-${id}"></div>
      <article class="rant" data-id="${id}" data-theme="${THEMES[rant.theme]}">
        <div class="contents">
          ${text}
        </div>
        <footer class="row space-between">
          <!-- picoshit rebirth -->
          <small id="lifespan-${id}">${lifeTime}</small>
          <div class="btn-dope-container">${dopeButton}</div>
        </foot>
      </article>
    `
  }

  static stylesheet () {
    return `
      article.rant .contents {
        max-height: 400px;
        overflow: hidden;
      }
    `
  }
}
Tonic.add(RantCard)
