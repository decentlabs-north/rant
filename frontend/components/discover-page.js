import Tonic from '@socketsupply/tonic/index.esm.js'
import { gate, combine, mute, get } from 'piconuro'
import { kernel, publicKernel as pub } from '../api.js'
import { isRantID, isEqualID, btok } from '../../blockend/kernel.js'
import { processText, THEMES } from '../../blockend/picocard.js'
import Modem56 from 'picostack/modem56.js'
import dayjs from '../day.js'

const TOPIC = 'GLOBAL_RANT_WARNING'

export class DiscoverPage extends Tonic {
  constructor () {
    super()
    this.modem = new Modem56()
    this.isSwarming = false
  }

  connected () {
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

    console.log('DISCOVER: ', $rants)
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
      if (this.isSwarming && !rants.length) {
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
      <h3>Discover</h3>
      <p>This page is under construction, peer up at your own risk.</p>
      <label for="toggle-swarm">
        <input type="checkbox" role="switch"
          name="toggle-swarm" id="toggle-swarm"
          ${this.isSwarming ? 'checked' : ''}/>
        Swarm
      </label>

      <div>
        Peers: ${peers + ''}
      </div>
      ${listRants()}
    `
  }

  async toggleSwarm (on) {
    if (on) {
      this.modem.join(TOPIC, (...a) => pub.spawnWire(...a))
      console.log('second kernel booted, topic joined', TOPIC)
      this.reRender(p => p)
    } else {
      this.modem.leave(TOPIC)
    }
    this.isSwarming = on
  }

  static stylesheet () {
    return `
      discover-page { display: block; }
    `
  }
}
Tonic.add(DiscoverPage)

// ------

/**
 * RantCard
 * This is what a rant looks like in a feed.
 * This component is **only** for rants, no drafts.
 * TODO: move to own file if experiment successful.
 */
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
