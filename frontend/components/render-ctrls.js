import Tonic from '@socketsupply/tonic/index.esm.js'
import { $mode, setMode, navigate, shareDefault } from '../api.js'
import { get } from 'piconuro'

// TODO: convert to vanilla html / will be less code and
// easier to read with CSS.
Tonic.add(class RenderCtrls extends Tonic {
  async click (ev) {
    if (Tonic.match(ev.target, '#btn-toggle')) {
      if (this.props.state === 'pitch') navigate('d')
      setMode(!get($mode))
    }
    if (Tonic.match(ev.target, '.btn-export')) {
      shareDefault()
    }
  }

  render () {
    const { state, rant } = this.props
    if (!state) return
    // console.log(this.props)
    if (state === 'pitch') {
      return this.html`
        <ctrls class="row space-between xcenter">
          <button id="btn-toggle" class="btn-round">1k</button>
        </ctrls>
      `
    }
    const dateStr = new Date(rant.date).toLocaleString()
    const status = state === 'draft'
      ? this.html`
        <sup><code>DRAFT</code></sup>
        <small>saved: ${dateStr}</small>
      `
      : this.html`
        <small>Author: ${rant.author.slice(0, 4).toString('hex')}</small>
        <small>Date: <span id="author-id">${dateStr}</span></small>
        ${/* Experimental implementation of secret */''}
        <small>[Development] Secret: <span id="secret-id">${rant.secret}</span></small>
      `
    return this.html`
      <ctrls class="row space-between xcenter">
        <!-- left -->
        <div class="row xcenter">
          <button id="btn-toggle" class="btn-round">1k</button>
          <div class="col">${status}</div>
        </div>
        <!-- right -->
        ${state === 'draft'
          ? this.html`
            <!-- <b role="button">Publish</b> -->
          `
          : this.html`
          <!--<button class="btn-round"><ico>📤</ico></button>-->
          <b role="button" class="outline secondary btn-export">share</b>
          `
        }
      </ctrls>
    `
  }
})
