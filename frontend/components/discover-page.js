import Tonic from '@socketsupply/tonic/index.esm.js'
import { gate, combine, mute } from 'piconuro'
import { kernel } from '../api.js'
import Kernel, { isRantID, isEqualID } from '../../blockend/k.js'
import dayjs from 'dayjs'
import RelativeTime from 'dayjs/plugin/relativeTime'
dayjs.extend(RelativeTime)
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
    // TODO: fix modem *facepalm*
    this.modem = new window.Modem56()
    this.db = kernel.db.sublevel('TMP', {
      keyEncoding: 'buffer',
      valueEncoding: 'buffer'
    })
    this.dcore = new DualCoreTM(this.db)
    this.isSwarming = false
    window.subK = this.dcore
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
      window.dayjs = dayjs
      return rants.map(rant => {
        let id = rant.id
        if (isRantID(rant.id)) id = id.toString('base64')
        return this.html`
          <rlist>
            <rant class="row xcenter space-between"
              data-id="${id}"
              data-state="${rant.state}">
              <div class="row xcenter">
                <icon>${rant.icon}</icon>
                <div class="col xstart">
                  <h6>${rant.title}</h6>
                  <small>${dayjs(rant.date).fromNow()}</small>
                  <div class="sampl">${rant.excerpt}...</div>
                </div>
              </div>
              <!-- picoshit rebirth -->
              <b role="button" class="btn-round">💩</b>
            </rant>
          </rlist>
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

      <!-- TODO: make rant-list.js reusable to dedupe this css -->
      rlist { display: block; }
      rlist rant icon {
        display: inline-block;
        --size: 1.9em;
        height: var(--size);
        width: var(--size);
        overflow: hidden;
        text-align: center;
        line-height: var(--size);
        vertical-align: middle;
        font-size: calc(var(--size) * 0.8);
        border: 1px solid var(--primary);
        margin-right: var(--block-spacing-horizontal);
      }
      rlist rant .trash {
        background-image: var(--icon-close);
        background-position: center center;
        background-repeat: no-repeat;
      }
      rlist rant h6, rant-list rant h4 { margin: 0; }
      rlist rant .sample {
        display: block;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
      rlist rant {
        border-bottom: 1px solid var(--primary);
        padding-top: var(--block-spacing-horizontal);
        padding-bottom: var(--block-spacing-horizontal);
      }
      rlist rant:last-child { border-bottom: none; }
      rlist rant[data-id=new] h6 { color: var(--primary); }
    `
  }
}
Tonic.add(DiscoverPage)
