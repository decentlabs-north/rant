<script>
  import Modal from './Modal.svelte'
  export let identity
let spk = identity.pk
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
      SPK {identity.pk.toString('hex')}
      SSK {identity.sk.slice(0, 32).toString('hex')}
      <!-- BPK {identity.box.pub.toString('hex')}
      BSK {identity.box.sec.toString('hex')}-->
    </pre>
	</Modal>
{/if}
</div>
