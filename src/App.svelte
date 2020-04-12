<script>
// props
export let uid
export let rant
export let state
export let theme
export let stats
// imports
import { derived } from 'svelte/store'
import marked from 'marked'
import Purify from 'dompurify'
// code
const pickle = derived(stats, s => s.pickle || '')
const mdHtml = derived(rant, md => marked(Purify.sanitize(md)))
const themes = [
  'cyborg',
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
  <!-- controls -->
  <nav>
    <div><!-- left -->
      <!-- Todo: uid component -->
      <code><small>{uid.sig.pub.toString('hex')}</small></code>
    </div>

    <div><!-- middle -->
      <button on:click={toggleState} class="">{$state ? 'Preview' : 'Editor'}</button>
    </div>

    <div><!-- right -->
      {#if $state}
        Bytes: {$stats.size} / 1024 ({$stats.compressionRatio})
        Theme:
        <select bind:value={$theme}>
          {#each themes as t}
            <option value={t.id}>
            {t.name}
            </option>
          {/each}
        </select>
      {:else}
        <button style="background-color: #c678dd">Encrypt</button>
        <button style="background-color: #fe8019">Socmed</button>
        <button style="background-color: #fb4934">Clipboard</button>
      {/if}
    </div>
  </nav>

  <!-- editor -->
  {#if $state}
    <section id="editor">
      <textarea bind:value={$rant}></textarea>
    </section>
  {/if}

  <!-- content -->
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
