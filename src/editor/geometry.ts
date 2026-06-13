import type { CanvasPoint, Door, DoorOrientation, Placement, Project, Room, WallSide } from './types';

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

export const findContainingRoom = (project: Project, point: CanvasPoint) =>
  getAllStructure(project).find((room) => pointInRoom(room, point));

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

const orientationForWall = (wallSide: WallSide): DoorOrientation => (wallSide === 'north' || wallSide === 'south' ? 'horizontal' : 'vertical');

const wallCandidatesForRoom = (room: Room, point: CanvasPoint) => {
  const bounds = roomBounds(room);
  const northX = clamp(point.x, bounds.minX, bounds.maxX);
  const southX = clamp(point.x, bounds.minX, bounds.maxX);
  const westZ = clamp(point.z, bounds.minZ, bounds.maxZ);
  const eastZ = clamp(point.z, bounds.minZ, bounds.maxZ);

  return [
    { room, wallSide: 'north' as const, x: northX, z: bounds.minZ, distance: Math.hypot(point.x - northX, point.z - bounds.minZ), wallLength: room.width },
    { room, wallSide: 'south' as const, x: southX, z: bounds.maxZ, distance: Math.hypot(point.x - southX, point.z - bounds.maxZ), wallLength: room.width },
    { room, wallSide: 'west' as const, x: bounds.minX, z: westZ, distance: Math.hypot(point.x - bounds.minX, point.z - westZ), wallLength: room.depth },
    { room, wallSide: 'east' as const, x: bounds.maxX, z: eastZ, distance: Math.hypot(point.x - bounds.maxX, point.z - eastZ), wallLength: room.depth },
  ];
};

const pointAcrossWall = (point: CanvasPoint, wallSide: WallSide) => {
  const offset = 0.65;
  if (wallSide === 'north') return { x: point.x, z: point.z - offset };
  if (wallSide === 'south') return { x: point.x, z: point.z + offset };
  if (wallSide === 'west') return { x: point.x - offset, z: point.z };
  return { x: point.x + offset, z: point.z };
};

export const oppositeWallSide = (wallSide: WallSide): WallSide => {
  if (wallSide === 'north') return 'south';
  if (wallSide === 'south') return 'north';
  if (wallSide === 'west') return 'east';
  return 'west';
};

export const findDoorSnap = (project: Project, point: CanvasPoint, maxSnapDistance = 2.5) => {
  const candidates = getAllStructure(project)
    .flatMap((room) => wallCandidatesForRoom(room, point))
    .sort((a, b) => a.distance - b.distance);
  const best = candidates[0];
  if (!best) return undefined;

  const snappedPoint = { x: Number(best.x.toFixed(2)), z: Number(best.z.toFixed(2)) };
  const across = pointAcrossWall(snappedPoint, best.wallSide);
  const secondaryRoom = getAllStructure(project)
    .filter((room) => room.id !== best.room.id)
    .find((room) => pointInRoom(room, across));

  return {
    x: snappedPoint.x,
    z: snappedPoint.z,
    wallSide: best.wallSide,
    orientation: orientationForWall(best.wallSide),
    primaryRoom: best.room,
    secondaryRoom,
    snapped: best.distance <= maxSnapDistance,
    snapDistance: Number(best.distance.toFixed(2)),
    wallLength: best.wallLength,
  };
};

export const doorOrientation = (door: Door) => door.orientation ?? (door.wallSide ? orientationForWall(door.wallSide) : 'horizontal');

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
