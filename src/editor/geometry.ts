import type { CanvasPoint, Door, Placement, Project, Room } from './types';

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const normalizeRect = (start: CanvasPoint, end: CanvasPoint) => {
  const x = Math.min(start.x, end.x);
  const z = Math.min(start.z, end.z);
  return {
    x,
    z,
    width: Math.max(1, Math.abs(end.x - start.x) + 1),
    depth: Math.max(1, Math.abs(end.z - start.z) + 1),
  };
};

export const roomBounds = (room: Room) => ({
  minX: room.x,
  maxX: room.x + room.width,
  minZ: room.z,
  maxZ: room.z + room.depth,
});

export const centerOfRoom = (room: Room) => ({
  x: room.x + room.width / 2,
  z: room.z + room.depth / 2,
});

export const pointInRoom = (room: Room, point: CanvasPoint) => {
  const bounds = roomBounds(room);
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.z >= bounds.minZ && point.z <= bounds.maxZ;
};

export const getAllStructure = (project: Project) => [...project.rooms, ...project.corridors];

export const findRoomAtPoint = (project: Project, point: CanvasPoint) =>
  getAllStructure(project)
    .slice()
    .reverse()
    .find((room) => pointInRoom(room, point));

export const findNearestRoom = (project: Project, point: CanvasPoint) => {
  const rooms = getAllStructure(project);
  return rooms
    .map((room) => {
      const center = centerOfRoom(room);
      return { room, distance: Math.hypot(center.x - point.x, center.z - point.z) };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.room;
};

export const findDoorRooms = (project: Project, point: CanvasPoint) => {
  const rooms = getAllStructure(project)
    .map((room) => {
      const center = centerOfRoom(room);
      return { room, distance: Math.hypot(center.x - point.x, center.z - point.z) };
    })
    .sort((a, b) => a.distance - b.distance)
    .map(({ room }) => room);
  return [rooms[0], rooms.find((room) => room.id !== rooms[0]?.id)].filter(Boolean) as [Room, Room] | [Room] | [];
};

export const isDoorKind = (kind: Door['kind'] | Placement['kind']): kind is Door['kind'] =>
  kind === 'door' || kind === 'doubleDoor' || kind === 'lockedDoor' || kind === 'secretDoor';

export const isPlacementVisible = (project: Project, placement: Placement) => {
  if (placement.category === 'light') return project.layers.lighting.visible;
  if (placement.category === 'enemies') return project.layers.enemies.visible;
  if (placement.category === 'objects' || placement.category === 'stairs' || placement.category === 'decor') {
    return project.layers.objects.visible;
  }
  return project.layers.notes.visible;
};
