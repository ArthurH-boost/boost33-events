/**
 * Two letters from a name or an email, for the places a photo would go.
 *
 * Shared by the hub and settings because the two draw avatars at different sizes
 * against different backgrounds but must never disagree about the letters — one
 * screen saying SM and the next saying SO for the same person reads as a bug in
 * whichever one you look at second.
 */
export function initials(value: string): string {
  const words = value.split("@")[0]!.trim().split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}
