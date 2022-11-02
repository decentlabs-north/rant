import Tonic from '@socketsupply/tonic/index.esm.js'

Tonic.add(class FrontpageFeed extends Tonic {
  // constructor () {
  //   super()
  //   // this.attachShadow({ mode: 'open' }) // <-- Shadow DOM
  // }

  render () {
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
