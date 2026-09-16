// Palette of harmonious, premium colors for teams
export const TEAM_PALETTE = [
  '#2563eb', // Blue
  '#7c3aed', // Purple
  '#059669', // Emerald
  '#dc2626', // Red
  '#d97706', // Amber
  '#0891b2', // Cyan
  '#4f46e5', // Indigo
  '#ea580c', // Orange
  '#0d9488', // Teal
  '#db2777', // Pink
  '#475569', // Slate
  '#65a30d', // Lime
];

/**
 * Deterministically generates or picks a color for a team based on its id or name.
 * Produces consistent, vibrant display colors across pages and sessions.
 */
export function getTeamColor(teamIdentifier?: string | null): string {
  if (!teamIdentifier) {
    return TEAM_PALETTE[0];
  }
  let hash = 0;
  for (let i = 0; i < teamIdentifier.length; i++) {
    hash = (hash << 5) - hash + teamIdentifier.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % TEAM_PALETTE.length;
  return TEAM_PALETTE[index];
}
