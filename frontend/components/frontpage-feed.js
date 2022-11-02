import Tonic from '@socketsupply/tonic/index.esm.js'
import { publicKernel as pub } from '../api.js'
import { get, next, write } from 'piconuro'

Tonic.add(class FrontpageFeed extends Tonic {
  // constructor () {
  //   super()
  //   // this.attachShadow({ mode: 'open' }) // <-- Shadow DOM
  // }

  connected () {
    // this.rants = get(pub.$rants())
    // const $ready = this.dataset.ready === 'true'
    // this.ready = this.dataset.ready === 'true'
    // console.log('brefore next: ', this.$readyState)
    // await next(this.$readyState)
    // console.log('after next: ', this.$readyState)
    // if (this.$readyState) { this.reRender() }
  }

  updated () {
    this.ready = this.dataset.ready === 'true'
    const rants = get(pub.$rants())
    console.log('CONNECTED: ', rants)
  }

  render () {
    // if (this.dataset.ready !== 'true') {
    //   return this.html('<p>Loading...</p>')
    // }
    const rants = get(pub.$rants())
    return this.html(/* html */`
    <div>
      <div>
        <h1>1k</h1>
        <ul>
        <li>Rants will be displayed here</li>
        </ul>
      </div>
    </div>
  `)
  }
})
