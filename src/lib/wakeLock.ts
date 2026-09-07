/** Keep one reading session awake; permission denial never interrupts scrolling. */
export function keepScreenAwake(
  wakeLock: WakeLock | undefined,
  page: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>,
): () => void {
  let stopped = false;
  let pending = false;
  let sentinel: WakeLockSentinel | undefined;

  const release = () => {
    const current = sentinel;
    sentinel = undefined;
    void current?.release().catch(() => {});
  };
  const acquire = async () => {
    if (!wakeLock || stopped || pending || sentinel || page.visibilityState !== 'visible') return;
    pending = true;
    try {
      const lock = await wakeLock.request('screen');
      if (stopped || page.visibilityState !== 'visible') {
        await lock.release();
      } else {
        sentinel = lock;
        lock.addEventListener('release', () => { if (sentinel === lock) sentinel = undefined; });
      }
    } catch { /* Unsupported or denied by the browser. */ }
    finally { pending = false; }
  };
  const onVisibility = () => {
    if (page.visibilityState === 'visible') void acquire();
    else release();
  };
  page.addEventListener('visibilitychange', onVisibility);
  void acquire();
  return () => {
    stopped = true;
    page.removeEventListener('visibilitychange', onVisibility);
    release();
  };
}
