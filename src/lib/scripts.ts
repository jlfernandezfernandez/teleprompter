export type Script = { id: string; name: string; text: string };
export type ScriptLibrary = { activeId: string; scripts: Script[] };

export function parseLibrary(raw: string | null, legacy: string): ScriptLibrary {
  try {
    const parsed = JSON.parse(raw ?? 'null');
    if (Array.isArray(parsed?.scripts) && parsed.scripts.length > 0
      && parsed.scripts.every((script: Script) => script && typeof script.id === 'string'
        && typeof script.name === 'string' && typeof script.text === 'string')
      && new Set(parsed.scripts.map((script: Script) => script.id)).size === parsed.scripts.length) {
      return {
        activeId: parsed.scripts.some((script: Script) => script.id === parsed.activeId)
          ? parsed.activeId : parsed.scripts[0].id,
        scripts: parsed.scripts,
      };
    }
  } catch { /* Keep the legacy speech when the library cannot be read. */ }
  return { activeId: 'legacy', scripts: [{ id: 'legacy', name: 'Mi discurso', text: legacy }] };
}
