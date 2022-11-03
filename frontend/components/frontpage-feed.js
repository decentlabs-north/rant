import Tonic from '@socketsupply/tonic/index.esm.js'
import { publicKernel as pub } from '../api.js'
import { gate, combine, mute, nfo } from 'piconuro'
import { isRantID, btok } from '../../blockend/kernel.js'
import { processText, THEMES } from '../../blockend/picocard.js'
import Modem56 from 'picostack/modem56.js'
import dayjs from '../day.js'

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

class RantCard extends Tonic {
  render () {
    const rant = this.props.rant
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
          <small>${dayjs(rant.date).fromNow()}</small>
          <b role="button" class="btn-round">💩+4</b>
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
