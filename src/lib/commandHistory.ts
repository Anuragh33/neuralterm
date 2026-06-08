const historyMap = new Map<string, string[]>();
const MAX_HISTORY = 500;

export function appendCommand(sessionId: string, command: string): void {
  const trimmed = command.trim();
  if (!trimmed) return;
  const history = historyMap.get(sessionId) ?? [];
  const deduped = history.filter((cmd) => cmd !== trimmed);
  deduped.push(trimmed);
  if (deduped.length > MAX_HISTORY) {
    deduped.splice(0, deduped.length - MAX_HISTORY);
  }
  historyMap.set(sessionId, deduped);
}

export function getHistory(sessionId: string): string[] {
  return [...(historyMap.get(sessionId) ?? [])].reverse();
}
