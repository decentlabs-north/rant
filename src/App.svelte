<script>
// props
export let uid
export let rant
export let state
export let theme
// imports
import { derived } from 'svelte/store'
import marked from 'marked'
import Purify from 'dompurify'
// code
const mdHtml = derived(rant, md => marked(Purify.sanitize(md)))
const themes = [
  'default',
  'love-letter',
  'happy-birthday',
  'invitation',
  'roundrobin',
  'blackmail'
].map((name, id) => ({ name, id}))
const toggleState = state.update.bind(state, s => s ? 0 : 1)
const mainClass = derived([theme, state], ([t, s]) => `${themes[t].name} ${s ? 'edit' : 'show'}`)
</script>

<main class={$mainClass}>
  <nav>
    <!-- Todo: uid component -->
    <code><small>{uid.sig.pub.toString('hex')}</small>  Bytes: {$rant.length} / 1024 </code>
    Theme:
    <select bind:value={$theme}>
      {#each themes as t}
        <option value={t.id}>
        {t.name}
        </option>
      {/each}
    </select>
    <button on:click={toggleState} class="">{$state ? 'Preview' : 'Edit'}</button>
  </nav>

  {#if $state}
    <section id="editor">
      <textarea bind:value={$rant}></textarea>
    </section>
  {/if}
  <section id="rendered">
    {@html $mdHtml}
  </section>
</main>

<style>
  /*
	main {
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}*/
</style>
