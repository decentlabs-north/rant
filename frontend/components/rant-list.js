import Tonic from '@socketsupply/tonic/index.esm.js'
import { get } from 'piconuro'
import { isRantID, isDraftID } from '../../blockend/kernel.js'
import dayjs from '../day.js'
import {
  createNewDraft,
  kernel,
  setMode
} from '../api.js'
import { navigate } from '../router.js'
import { promptUntilCorrect } from './message-preview.js'

Tonic.add(class RantList extends Tonic {
  async click (ev) {
    const el = Tonic.match(ev.target, 'rant')
    if (!el) return

    let id
    // Handle create
    if (el.dataset.id === 'new') return createNewDraft()
    else {
      id = isDraftID(el.dataset.id)
        ? el.dataset.id
        : Buffer.from(el.dataset.id, 'base64')
    }

    // Handle delete
    if (Tonic.match(ev.target, '.trash')) {
      if (ev.target.dataset.encrypted === 'true') { // if the rant is encrypted, prompt PIN before continue
        await kernel.checkout(id)
        const secret = await promptUntilCorrect(null, 0)
        if (secret && secret !== 'EVENT:CLOSE') {
          console.info('deleteRant', id)
          await kernel.deleteRant(id)
        }
      } else {
        console.info('deleteRant', id)
        await kernel.deleteRant(id)
      }
      // TODO: refresh view?
      await kernel.checkout(null)
      return
    }

    // Handle show
    await kernel.checkout(id)
    const r = get(kernel.$rant())
    if (r.state === 'draft') { // continue editing
      navigate(`edit/${r.id}`)
      setMode(true)
    } else if (r.state === 'signed') {
      const pickle = await kernel.pickle(id)
      navigate(`show/${pickle}`)
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
        const sampl = rant.encryption && !rant.decrypted
          ? '[Locked] 🔐'
          : `${rant.excerpt}...`
        return this.html`
          <rant class="row xcenter space-between"
            data-id="${id}"
            data-state="${rant.state}">
            <div class="row xcenter">
              <icon>${rant.icon}</icon>
              <div class="col xstart">
                <h6>${rant.title}</h6>
                <small>${dayjs(rant.date).fromNow()}</small>
                <div class="sampl">${sampl}</div>
              </div>
            </div>
            <b role="button" class="btn-round trash" data-encrypted=${(!!rant.encryption).toString()}></b>
          </rant>
        `
      })}
    `
  }
})
