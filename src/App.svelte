<script lang="ts">
  import { onMount } from 'svelte';
  import { DEFAULT_SCRIPT } from './lib/defaultScript';

  const KEYS = {
    text: 'teleprompter-text',
    speed: 'teleprompter-speed',
    font: 'teleprompter-font',
    width: 'teleprompter-width',
    lineHeight: 'teleprompter-line-height',
    theme: 'teleprompter-theme'
  };
  type Theme = 'system' | 'light' | 'dark';
  let reader: HTMLDivElement;
  let text = DEFAULT_SCRIPT;
  let draft = DEFAULT_SCRIPT;
  let speed = 1;
  let fontSize = 46;
  let readerWidth = 980;
  let lineHeight = 1.5;
  let playing = false;
  let controlsHidden = false;
  let settingsOpen = false;
  let moreOpen = false;
  let theme: Theme = 'system';
  let editing = false;
  let progress = 0;
  let hideTimer: number | undefined;
  let fullscreenSupported = false;

  const paragraphs = () => text.split(/\n\s*\n/).filter(Boolean);
  const isCue = (value: string) => /^\[.*\]$/.test(value.trim());
  const formatParts = (value: string) => value.split(/(\*\*.*?\*\*)/g).filter(Boolean);
  const isStrong = (value: string) => value.startsWith('**') && value.endsWith('**');

  onMount(() => {
    const savedText = readStorage(KEYS.text);
    text = savedText ?? DEFAULT_SCRIPT;
    draft = text;
    speed = Number(readStorage(KEYS.speed)) || 1;
    fontSize = Number(readStorage(KEYS.font)) || 46;
    readerWidth = Number(readStorage(KEYS.width)) || 980;
    lineHeight = Number(readStorage(KEYS.lineHeight)) || 1.5;
    theme = (readStorage(KEYS.theme) as Theme | null) || 'system';
    fullscreenSupported = document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === 'function';
    document.documentElement.dataset.theme = theme;

    let frame = 0;
    let previous = 0;
    let carry = 0;
    const tick = (now: number) => {
      if (playing && reader) {
        if (previous) {
          carry += ((now - previous) / 1000) * (10 + speed * 14);
          const pixels = Math.floor(carry);
          if (pixels) { reader.scrollTop += pixels; carry -= pixels; }
          updateProgress();
          if (reader.scrollTop + reader.clientHeight >= reader.scrollHeight - 2) { playing = false; showControls(); }
        }
        previous = now;
      } else { previous = 0; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { editing = false; closePopovers(); return; }
      if (editing) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
      if (event.code === 'Space') { event.preventDefault(); togglePlayback(); }
      else if (event.key.toLowerCase() === 'h') controlsHidden = !controlsHidden;
      else if (event.key.toLowerCase() === 'f') toggleFullscreen();
      else if (event.key === 'Home') { event.preventDefault(); reset(); }
      else if (event.key === 'ArrowDown') { event.preventDefault(); move(innerHeight * .18); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); move(-innerHeight * .18); }
    };
    const revealControls = () => showControlsTemporarily();
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointermove', revealControls);
    document.addEventListener('touchstart', revealControls, { passive: true });
    requestAnimationFrame(updateProgress);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(hideTimer);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointermove', revealControls);
      document.removeEventListener('touchstart', revealControls);
    };
  });

  function updateProgress() {
    if (!reader) return;
    const distance = Math.max(0, reader.scrollHeight - reader.clientHeight);
    progress = distance ? Math.min(1, Math.max(0, reader.scrollTop / distance)) : 0;
  }
  function readStorage(key: string) {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  function writeStorage(key: string, value: string) {
    try { localStorage.setItem(key, value); } catch { /* The app still works without persistence. */ }
  }
  function showControls() {
    controlsHidden = false;
    window.clearTimeout(hideTimer);
  }
  function showControlsTemporarily() {
    showControls();
    if (playing && !editing && !settingsOpen && !moreOpen) {
      hideTimer = window.setTimeout(() => controlsHidden = true, 3000);
    }
  }
  function togglePlayback() {
    playing = !playing;
    closePopovers();
    if (playing) showControlsTemporarily(); else showControls();
  }

  function changeSpeed(delta: number) {
    speed = Math.min(3, Math.max(.25, Math.round((speed + delta) * 4) / 4));
    writeStorage(KEYS.speed, String(speed));
    updateProgress();
  }
  function changeFont(delta: number) {
    fontSize = Math.min(76, Math.max(28, fontSize + delta));
    writeStorage(KEYS.font, String(fontSize));
  }
  function changeReaderWidth(value: number) {
    readerWidth = value;
    writeStorage(KEYS.width, String(value));
  }
  function changeLineHeight(value: number) {
    lineHeight = value;
    writeStorage(KEYS.lineHeight, String(value));
  }
  function resetReadingSettings() {
    fontSize = 46;
    writeStorage(KEYS.font, String(fontSize));
    changeReaderWidth(980);
    changeLineHeight(1.5);
  }
  function changeTheme(value: Theme) {
    theme = value;
    document.documentElement.dataset.theme = value;
    writeStorage(KEYS.theme, value);
  }
  function closePopovers() {
    settingsOpen = false;
    moreOpen = false;
  }
  function toggleSettings() {
    settingsOpen = !settingsOpen;
    moreOpen = false;
  }
  function toggleMore() {
    moreOpen = !moreOpen;
    settingsOpen = false;
  }
  function move(amount: number) {
    playing = false;
    showControls();
    reader.scrollBy({ top: amount, behavior: 'smooth' });
  }
  function reset() {
    playing = false;
    showControls();
    reader.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function openEditor() {
    playing = false;
    closePopovers();
    draft = text;
    editing = true;
  }
  function updateDraft(value: string) {
    draft = value;
    text = value;
    writeStorage(KEYS.text, value);
  }
  async function toggleFullscreen() {
    if (!fullscreenSupported) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { /* The browser can reject fullscreen despite reporting support. */ }
  }
</script>

<svelte:head><title>Teleprompter — Presenta con naturalidad</title></svelte:head>

<main class:controls-hidden={controlsHidden}>
  <div class="reader" bind:this={reader} role="region" aria-label="Texto del teleprompter" onscroll={updateProgress} onwheel={() => { playing = false; showControls(); }} ontouchstart={() => playing = false}>
    <article class="script" style:font-size={`${fontSize}px`} style:max-width={`${readerWidth}px`} style:line-height={lineHeight}>
      {#each paragraphs() as paragraph}
        <p class:cue={isCue(paragraph)}>
          {#each formatParts(paragraph) as part}
            {#if isStrong(part)}<strong>{part.slice(2, -2)}</strong>{:else}{part}{/if}
          {/each}
        </p>
      {/each}
    </article>
  </div>
  <div class="shade top" aria-hidden="true"></div>
  <div class="shade bottom" aria-hidden="true"></div>
  <div class="hint">Espacio: reproducir/pausar · ↑↓: navegar · H: ocultar · F: pantalla completa</div>
  <output class="completion" aria-live="off">{Math.round(progress * 100)}% completado</output>

  {#if settingsOpen || moreOpen}
    <button class="popover-dismiss" aria-label="Cerrar menú" onclick={closePopovers}></button>
  {/if}

  {#if settingsOpen}
    <section id="reading-settings" class="popover settings" aria-label="Ajustes de lectura">
      <header><strong>Ajustes de lectura</strong><button class="popover-close" aria-label="Cerrar ajustes" onclick={closePopovers}>✕</button></header>
      <label>
        <span><span>Tamaño del texto</span><output>{fontSize} px</output></span>
        <input type="range" min="28" max="76" step="2" value={fontSize} oninput={(event) => { fontSize = Number(event.currentTarget.value); writeStorage(KEYS.font, String(fontSize)); }} />
      </label>
      <label>
        <span><span>Ancho del texto</span><output>{readerWidth} px</output></span>
        <input type="range" min="480" max="1280" step="20" value={readerWidth} oninput={(event) => changeReaderWidth(Number(event.currentTarget.value))} />
      </label>
      <label>
        <span><span>Espaciado de líneas</span><output>{lineHeight.toFixed(2)}×</output></span>
        <input type="range" min="1.25" max="1.9" step="0.05" value={lineHeight} oninput={(event) => changeLineHeight(Number(event.currentTarget.value))} />
      </label>
      <fieldset>
        <legend>Tema</legend>
        <div class="segmented">
          {#each [['system', 'Sistema'], ['light', 'Claro'], ['dark', 'Oscuro']] as option}
            <button class:active={theme === option[0]} aria-pressed={theme === option[0]} onclick={() => changeTheme(option[0] as Theme)}>{option[1]}</button>
          {/each}
        </div>
      </fieldset>
      <button class="reset-settings" onclick={resetReadingSettings}>Restablecer</button>
    </section>
  {/if}

  {#if moreOpen}
    <section id="more-options" class="popover more-options" aria-label="Más opciones">
      <button onclick={openEditor}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/></svg><span>Editar texto</span></button>
      <button onclick={() => { reset(); closePopovers(); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v6h6"/><path d="M5.5 16a8 8 0 1 0 .3-8.3L4 10"/></svg><span>Volver al inicio</span></button>
      <button onclick={() => { controlsHidden = true; closePopovers(); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 8.5 4 9.5 6.2M6.2 6.2a13.3 13.3 0 0 0-3.7 4 4 4 0 0 0 0 3.6C3.5 16 7 20 12 20a10.7 10.7 0 0 0 4-.8"/></svg><span>Ocultar controles</span></button>
    </section>
  {/if}

  <nav class="toolbar" aria-label="Controles del teleprompter">
    <div class="group play-group"><button class="btn primary" class:active={playing} aria-label={playing ? 'Pausar desplazamiento' : 'Iniciar desplazamiento'} aria-pressed={playing} onclick={togglePlayback}>{#if playing}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5v14M15 5v14" /></svg>{:else}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z" /></svg>{/if}<span class="play-label">{playing ? 'Pausa' : 'Iniciar'}</span></button></div>
    <div class="group"><button class="btn" aria-label="Más lento" onclick={() => changeSpeed(-.25)}>−</button><span class="value">{speed}×</span><button class="btn" aria-label="Más rápido" onclick={() => changeSpeed(.25)}>+</button></div>
    <div class="group font-controls"><button class="btn text-size" aria-label="Reducir tamaño del texto" onclick={() => changeFont(-2)}>A−</button><span class="value font-value">{fontSize}</span><button class="btn text-size" aria-label="Aumentar tamaño del texto" onclick={() => changeFont(2)}>A+</button></div>
    <div class="group actions"><button class="btn icon-action" class:active={settingsOpen} aria-label="Ajustes de lectura" title="Ajustes de lectura" aria-expanded={settingsOpen} aria-controls="reading-settings" onclick={toggleSettings}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h5M15 6h5M4 12h9M19 12h1M4 18h2M12 18h8"/><circle cx="12" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="9" cy="18" r="2"/></svg></button>{#if fullscreenSupported}<button class="btn icon-action fullscreen-action" aria-label="Pantalla completa" title="Pantalla completa (F)" onclick={toggleFullscreen}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg></button>{/if}<button class="btn icon-action more-action" class:active={moreOpen} aria-label="Más opciones" title="Más opciones" aria-expanded={moreOpen} aria-controls="more-options" onclick={toggleMore}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg></button></div>
  </nav>
  <button class="show-controls" aria-label="Mostrar controles" onclick={() => controlsHidden = false}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5"/></svg></button>

  {#if editing}
    <div class="modal" role="dialog" aria-modal="true" aria-label="Editar discurso">
      <section class="editor">
        <header><h2>Editar discurso</h2><button class="btn" aria-label="Cerrar" onclick={() => editing = false}>✕</button></header>
        <textarea value={draft} oninput={(event) => updateDraft(event.currentTarget.value)} spellcheck="true" aria-label="Texto del discurso"></textarea>
        <footer><span class="autosave">Guardado automáticamente en este navegador</span><button class="btn save" onclick={() => editing = false}>Listo</button></footer>
      </section>
    </div>
  {/if}
</main>
