import Tonic from '@socketsupply/tonic/index.esm.js'
import { publicKernel as pub } from '../api.js'
import { gate, combine, mute, nfo } from 'piconuro'
import { isRantID, btok } from '../../blockend/kernel.js'
import { processText, THEMES } from '../../blockend/picocard.js'
import Modem56 from 'picostack/modem56.js'
import { nEl } from '../surgeon.js'

const TOPIC = 'GLOBAL_RANT_WARNING'

/**
 * frontpage is working as intended!
 * TODO: clean up and remove all unused stuff. also remove discover-page since we dont need it anymore.
 *
 */
Tonic.add(class FrontpageFeed extends Tonic {
  constructor () {
    super()
    this.modem = new Modem56()
    this.isSwarming = true

    this.modem.join(TOPIC, (...a) => pub.spawnWire(...a))
    console.log('second kernel booted, topic joined', TOPIC)
    this.reRender(p => p)
    // this.attachShadow({ mode: 'open' }) // <-- Shadow DOM
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
    this.unsub = nfo($state(state => {
      this.reRender(prev => ({ ...prev, ...state }))
    }))
  }

  disconnected () { this.unsub() }

  change (ev) {
    if (Tonic.match(ev.target, '#toggle-swarm')) {
      this.toggleSwarm(ev.target.checked)
    }
  }

  async click (ev) {
    const el = Tonic.match(ev.target, 'rant[data-id]')
    if (el) {
      // const id = Buffer.from(el.dataset.id, 'base64')
    }
  }

  render () {
    const rants = this.props.rants || []
    const peers = this.props.peers || 0
    this.classList.add('pad')

    const listRants = () => {
      if (!rants.length) {
        return this.html`
          <h5 aria-busy="true">Searching for peers...</h5>
        `
      }
      return rants.map(rant => {
        return this.html`
          <rant-card rant=${rant}></rant-card>
        `
      })
    }

    return this.html`
    <div style="text-align: center;">
      <h1 style="font-size: 6rem; margin-bottom:0.25rem;">1k</h1>
      <p>Tin Foil Twitter</p>
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
      await pub.bump(rantId)
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
  }

  render () {
    const rant = this.props.rant

    const lifeTime = convertToReadableLifeSpan(rant.expiresAt - Date.now())

    if (!isRantID(rant?.id)) return this.html`<error>Invalid rant</error>`

    const id = btok(rant.id)
    const text = this.html([processText(rant.text)])
    return this.html`
      <article class="rant" data-id="${id}" data-theme="${THEMES[rant.theme]}">
        <div class="contents">
          ${text}
        </div>
        <footer class="row space-between">
          <!-- picoshit rebirth -->
          <small id="lifespan-${id}">${lifeTime}</small>
          <b role="button" class="btn-round" data-id="${id}">💩+4</b>
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
