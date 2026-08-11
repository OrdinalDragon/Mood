export interface Mood {
  id: string;
  emoji: string;
  label: string;
  color: string;
}

export const MOODS: Mood[] = [
  { id: 'alegre',    emoji: '😊', label: 'Alegre',    color: 'yellow' },
  { id: 'triste',    emoji: '😢', label: 'Triste',    color: 'blue' },
  { id: 'enojado',   emoji: '😤', label: 'Enojado',   color: 'red' },
  { id: 'tranquilo', emoji: '😌', label: 'Tranquilo', color: 'green' },
  { id: 'reservado', emoji: '🤫', label: 'Reservado', color: 'purple' },
];

export function getMood(id: string): Mood | undefined {
  return MOODS.find(m => m.id === id);
}
