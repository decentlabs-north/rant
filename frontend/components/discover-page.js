import Tonic from '@socketsupply/tonic/index.esm.js'
import { gate } from 'piconuro'
import { kernel } from '../api.js'
import Kernel, { isRantID } from '../../blockend/k.js'
const TOPIC = 'GLOBAL_RANT_WARNING'

/* Spin up a temporary kernel to not pollute local notebook */
class DualCoreTM extends Kernel {
  async onquery (...args) {
    const tmpFeeds = await super.onquery(...args)
    const localFeeds = await kernel.onquery(...args)
    console.log('Query Response', tmpFeeds, localFeeds)
    return [...tmpFeeds, ...localFeeds]
  }
}

export class DiscoverPage extends Tonic {
  constructor () {
    super()
    this.modem = new window.Modem56()
    this.db = kernel.db.sublevel('TMP')
    this.dcore = new DualCoreTM(this.db)
    this.isSwarming = false
  }

  connected () {
    this.unsub = gate(this.dcore.$rants())(rants => {
      this.reRender(prev => ({ ...prev, rants: rants }))
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
    this.classList.add('pad')
    return this.html`
      <h3>Discover</h3>

      <label for="toggle-swarm">
        <input type="checkbox" role="switch"
          name="toggle-swarm" id="toggle-swarm"
          ${this.isSwarming ? 'checked' : ''}/>
        Swarm
      </label>

      ${rants.map(rant => {
        let id = rant.id
        if (isRantID(rant.id)) id = id.toString('base64')
        return this.html`
          <rant class="row xcenter space-between"
            data-id="${id}"
            data-state="${rant.state}">
            <div class="row xcenter">
              <icon>${rant.icon}</icon>
              <div class="col xstart">
                <h6>${rant.title}</h6>
                <small>${new Date(rant.date).toLocaleString()}</small>
                <div class="sampl">${rant.excerpt}...</div>
              </div>
            </div>
            <b role="button" class="btn-round trash"></b>
          </rant>
        `
      })}
    `
  }

  async toggleSwarm (on) {
    if (on) {
      await this.db.clear()
      await this.dcore.boot()
      this.modem.join(TOPIC, (...a) =>  this.dcore.spawnWire(...a))
      console.log('second kernel booted, topic joined', TOPIC)
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
