import Tonic from '@socketsupply/tonic/index.esm.js'
import mermaid from 'mermaid'

mermaid.initialize({ startOnLoad: false })

Tonic.add(async function MermaidGraph () {
  try {
    const svg = await new Promise(resolve => {
      mermaid.render('aGraph', this.innerText, resolve)
    })
    return this.html([svg])
  } catch (err) {
    return this.html`
      MERMAID SYNTAX ERROR:
      <pre><code>${err.message || err.str}</code></pre>
    `
  }
})
