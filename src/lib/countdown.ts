export function startCountdown(onTick: (seconds: number) => void, onDone: () => void): () => void {
  const deadline = Date.now() + 3000;
  onTick(3);
  const timer = setInterval(() => {
    const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    onTick(seconds);
    if (seconds === 0) {
      clearInterval(timer);
      onDone();
    }
  }, 100);
  return () => clearInterval(timer);
}
