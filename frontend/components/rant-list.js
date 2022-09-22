import Tonic from '@socketsupply/tonic/index.esm.js'
import { get } from 'piconuro'
import { isRantID, isDraftID } from '../../blockend/k.js'
import {
  createNew,
  kernel,
  setMode,
  navigate
} from '../api.js'
Tonic.add(class RantList extends Tonic {
  async click (ev) {
    const el = Tonic.match(ev.target, 'rant')
    if (!el) return

    let id
    // Handle create
    if (el.dataset.id === 'new') return createNew()
    else {
      id = isDraftID(el.dataset.id)
        ? el.dataset.id
        : Buffer.from(el.dataset.id, 'base64')
    }

    // Handle delete
    if (Tonic.match(ev.target, '.trash')) {
      console.info('deleteRant', id)
      await kernel.deleteRant(id)
      // TODO: refresh view?
      return
    }

    // Handle show
    await kernel.checkout(id)
    const r = get(kernel.$rant())
    if (r.state === 'draft') { // continue editing
      navigate(`e/${r.id}`)
      setMode(true)
    } else if (r.state === 'signed') {
      const pickle = await kernel.pickle(id)
      navigate(`r/${pickle}`)
    }
  }

  render () {
    // console.log('Rants list:', this.props)
    const { n: rants } = this.props
    const allowNew = this.dataset.create === 'true'
    let newRant = ''
    if (allowNew) {
      newRant = this.html`
        <rant data-id="new" class="row xcenter">
          <icon>🥚</icon>
          <h4>New Note</h4>
        </rant>
      `
    }
    if (!Array.isArray(rants) && !allowNew) {
      return this.html`<p class="text-center"><code>No rants</code></p>`
    }
    return this.html`
      ${newRant}
      ${(rants || []).map(rant => {
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
})
