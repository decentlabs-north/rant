import Tonic from '@socketsupply/tonic/index.esm.js'
import { gate, combine, mute, get } from 'piconuro'
import { kernel, setMode, $mode } from '../api.js'
import Kernel, { isRantID, isEqualID, btok } from '../../blockend/kernel.js'
import { processText, THEMES } from '../../blockend/picocard.js'
import Modem56 from '../../../picostack/modem56.js'
import dayjs from '../day.js'

const TOPIC = 'GLOBAL_RANT_WARNING'
/* Spin up a temporary kernel to avoid pollute local notebook */
// TODO: Move subkernel into main-kernel/blockend
class DualCoreTM extends Kernel {
  async onquery (...args) {
    const tmpFeeds = await super.onquery(...args)
    const localFeeds = await kernel.onquery(...args)
    // TODO: don't share privately published/shared notes
    // localFeeds.filter(rant.topic|rant.image|!rant.private)
    return [...tmpFeeds, ...localFeeds]
  }
}

export class DiscoverPage extends Tonic {
  constructor () {
    super()
    this.modem = new Modem56()
    this.db = kernel.db.sublevel('TMP', {
      keyEncoding: 'buffer',
      valueEncoding: 'buffer'
    })
    this.dcore = new DualCoreTM(this.db)
    this.isSwarming = false
  }

  connected () {
    // Filter rants that exist in local notebook.
    const $rants = mute(
      combine(this.dcore.$rants(), kernel.$rants()),
      ([remote, local]) => remote.filter(r =>
        !local.find(l => isEqualID(r, l))
      )
    )
    const $state = gate(
      combine({
        rants: $rants,
        peers: mute(this.dcore.$connections(), c => c.length)
      })
    )
    this.unsub = $state(state => {
      this.reRender(prev => ({ ...prev, ...state }))
    })
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
      const id = Buffer.from(el.dataset.id, 'base64')
      this.dcore.checkout(id)
      window.____(get(this.dcore.$rant())) // look away
      if (!this._____m) {
        this._____m = $mode(editMode => {
          console.log('Current Mode', editMode)
          if (editMode) window.____(0) // look away
        })
      }
      setMode(false)
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
      await this.db.clear()
      await this.dcore.boot()
      this.modem.join(TOPIC, (...a) => this.dcore.spawnWire(...a))
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
