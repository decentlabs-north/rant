import Tonic from '@socketsupply/tonic/index.esm.js'
let deferredPrompt = null

export default class InstallButton extends Tonic {
  constructor () {
    super()
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later.
      deferredPrompt = e
      this.reRender(p => p)
    })
  }

  click (ev) {
    if (Tonic.match(ev.target, 'button.cancel')) {
      deferredPrompt = null
      this.reRender(p => p)
    }

    if (Tonic.match(ev.target, 'button.install')) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          window.alert('Thank you, you are awesome! No joke.')
        }
        deferredPrompt = null
        this.reRender(p => p)
      })
    }
  }

  render () {
    if (!deferredPrompt) return

    return this.html`
      <dialog open>
        <article>
          <header>Add to Homescreen</header>
          <p>
            This app was designed to be stuked to your homescreen.<br/>
            Install it to get better display realestate.</br>
            Quick When-In-Panic access.<br/>
            Create incentive to port kernel to background workers.<br/>
            No, no notifcations. They're scheduled for future releases when
            the kernel is ported and will fire when you pass an
            attractive individual in your area.
            </br>
          </p>

          <p>
            What are you waiting for?<br/>
            Press <strong>install</strong> now!
          </p>
          <footer class="row space-between">
            <button class="hgap cancel">Nope!</button>
            <button class="hgap install">Install</button>
          </footer>
        </article>
      </dialog>
    `
  }

  static stylesheet () {
    return `
      button.cancel { --primary: red; }
    `
  }
}

Tonic.add(InstallButton)
