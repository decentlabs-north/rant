<script>
  import Modal from './Modal.svelte'
  export let identity
/* // Hashicons cost us 27k of minified data or about 7k compressed.
   // I like the but not the cubes, maybe fork it or talk to the author.

import { onMount } from 'svelte'
import hashicon from 'hashicon'
onMount(() => {
  const ico = hashicon(spk, 22)
  container.appendChild(ico)
})
let container
 */

let spk = identity.sig.pub
let showModal = false
</script>
<div >
  <!-- navbar content -->
  <span class="identity uline purp" on:click="{() => showModal = true}">
  <!--<div bind:this={container}></div>-->
  👤<code>{spk.toString('hex').substr(0, 12)}</code>
  </span>

  <!-- what's show when expanded -->
{#if showModal}
	<Modal on:close="{() => showModal = false}">
    <h2 slot="header" style="text-align: center">
      Mysterious Stranger
    </h2>
    <pre>
SPK {identity.sig.pub.toString('hex')}
SSK {identity.sig.sec.slice(0, 32).toString('hex')}
BPK {identity.box.pub.toString('hex')}
BSK {identity.box.sec.toString('hex')}
    </pre>
	</Modal>
{/if}
</div>
