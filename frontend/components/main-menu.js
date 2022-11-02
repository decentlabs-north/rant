import Tonic from '@socketsupply/tonic/index.esm.js'
import { navigate } from '../router.js'

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
        <button data-route="/" data-toltip="Home"><ico>🏠</ico></button>
        <button data-route="home" data-toltip="Drafts"><ico>📑</ico></button>
        <button data-route="saved" data-toltip="Saved"><ico>🌟</ico></button>
        <button data-route="settings" data-toltip="Settings"><ico>⚙️</ico></button>
      </nav>
    `
  }
})
