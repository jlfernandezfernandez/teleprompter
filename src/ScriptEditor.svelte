<script lang="ts">
  import { onMount } from 'svelte';
  import type { Script, ScriptLibrary } from './lib/scripts';

  export let library: ScriptLibrary;
  export let saved: boolean;
  export let onchange: (library: ScriptLibrary) => void;
  export let onclose: () => void;

  let dialog: HTMLDialogElement;
  $: current = library.scripts.find(script => script.id === library.activeId)!;
  onMount(() => { dialog.showModal(); });

  function edit(patch: Partial<Script>) {
    onchange({ ...library, scripts: library.scripts.map(script => script.id === current.id ? { ...script, ...patch } : script) });
  }
  function create() {
    const script = { id: crypto.randomUUID(), name: 'Nuevo guion', text: '' };
    onchange({ activeId: script.id, scripts: [...library.scripts, script] });
  }
  function remove() {
    if (library.scripts.length < 2 || !confirm(`¿Eliminar «${current.name}»? Esta acción no se puede deshacer.`)) return;
    const scripts = library.scripts.filter(script => script.id !== current.id);
    onchange({ activeId: scripts[0].id, scripts });
  }
</script>

<dialog bind:this={dialog} class="script-editor" aria-labelledby="editor-title" oncancel={onclose}>
  <section class="editor">
    <header><h2 id="editor-title">Mis guiones</h2><button class="btn" aria-label="Cerrar" onclick={onclose}>✕</button></header>
    <div class="library-controls">
      <label>Guion
        <select value={library.activeId} onchange={(event) => onchange({ ...library, activeId: event.currentTarget.value })}>
          {#each library.scripts as script}<option value={script.id}>{script.name || 'Sin título'}</option>{/each}
        </select>
      </label>
      <button class="btn" onclick={create}>Nuevo</button>
      <button class="btn" onclick={remove} disabled={library.scripts.length < 2}>Eliminar</button>
      <label class="script-name">Nombre
        <input value={current.name} maxlength="80" oninput={(event) => edit({ name: event.currentTarget.value })} />
      </label>
    </div>
    <textarea value={current.text} oninput={(event) => edit({ text: event.currentTarget.value })} spellcheck="true" aria-label="Texto del discurso"></textarea>
    <footer>
      <span class="autosave" role="status">{saved ? 'Guardado en este navegador' : 'Sin guardar en el navegador. Copia tu texto antes de cerrar la página.'}</span>
      <button class="btn save" onclick={onclose}>Listo</button>
    </footer>
  </section>
</dialog>

<style>
  .script-editor { padding: 0; border: 0; max-width: none; max-height: none; background: transparent; color: var(--text); }
  .script-editor::backdrop { background: var(--modal); backdrop-filter: blur(6px); }
  .library-controls { display: flex; flex-wrap: wrap; align-items: end; gap: 8px; padding: 12px 20px; border-bottom: 1px solid var(--border); }
  label { display: grid; gap: 5px; min-width: 0; flex: 1; font-size: 12px; color: var(--muted); }
  .script-name { flex-basis: 100%; }
  input, select { width: 100%; min-width: 0; padding: 9px; border: 1px solid var(--border); border-radius: 8px; background: var(--surface-solid); color: var(--text); font: inherit; font-size: 14px; }
  select:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  button:disabled { opacity: .4; cursor: default; }
</style>
