import Tonic from '@socketsupply/tonic/index.esm.js'
import { navigate } from '../api.js'

Tonic.add(class MainMenu extends Tonic {
  click (ev) {
    const el = Tonic.match(ev.target, 'button[data-route]')
    if (!el) return
    const path = el.dataset.route
    navigate(path)
  }

  render () {
    // 📝
    return this.html`
      <nav class="row">
        <button data-route="d" data-toltip="Drafts"><ico>📑</ico></button>
        <button data-route="l" data-toltip="Saved"><ico>🌟</ico></button>
        <button data-route="n" data-toltip="Discover"><ico>🧭</ico></button>
        <button data-route="s" data-toltip="Settings"><ico>⚙️</ico></button>
      </nav>
    `
  }
})
