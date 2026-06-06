export function extractOscCwd(data: string): string | null {
  const match = data.match(/\u001b]7;file:\/\/[^/]*(\/[^\u0007\u001b]*)/);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}
