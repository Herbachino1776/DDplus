import type { Door, Placement, Room } from './types';

const nextNumber = (items: { id: string }[], prefix: string) => {
  const max = items.reduce((value, item) => {
    const match = item.id.match(new RegExp(`^${prefix}(\\d+)$`));
    return match ? Math.max(value, Number(match[1])) : value;
  }, 0);
  return max + 1;
};

export const formatId = (prefix: string, value: number) => `${prefix}${String(value).padStart(2, '0')}`;

export const nextRoomId = (rooms: Room[]) => formatId('R', nextNumber(rooms, 'R'));
export const nextCorridorId = (corridors: Room[]) => formatId('C', nextNumber(corridors, 'C'));
export const nextDoorId = (doors: Door[]) => formatId('D', nextNumber(doors, 'D'));
export const nextPlacementId = (placements: Placement[], prefix = 'P') => formatId(prefix, nextNumber(placements, prefix));
