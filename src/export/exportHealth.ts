import { doorOrientation, getAllStructure, pointInRoom, roomBounds } from '../editor/geometry';
import type { CanvasPoint, Door, Placement, Project, Room, WallSide } from '../editor/types';

export interface ExportHealth {
  counts: {
    rooms: number;
    corridors: number;
    doors: number;
    placements: number;
    enemySpawns: number;
    lights: number;
    blockingProps: number;
  };
  playerSpawnPresent: boolean;
  warnings: string[];
  errors: string[];
}

export const getStructure = (project: Project) =>
  getAllStructure(project).slice().sort((a, b) => a.id.localeCompare(b.id));

export const findContainingRoom = (project: Project, point: CanvasPoint) =>
  getStructure(project).find((room) => pointInRoom(room, point));

export const resolvePlacementRoomId = (project: Project, placement: Placement) => {
  const point = { x: placement.x, z: placement.z };
  const containing = findContainingRoom(project, point);
  if (containing) return containing.id;
  return getStructure(project).some((room) => room.id === placement.roomId) ? placement.roomId : undefined;
};

export const nearestWallAttachment = (room: Room, point: CanvasPoint) => {
  const bounds = roomBounds(room);
  const distances = [
    { wallSide: 'west' as const, distance: Math.abs(point.x - bounds.minX), distanceAlongWall: point.z - bounds.minZ },
    { wallSide: 'east' as const, distance: Math.abs(bounds.maxX - point.x), distanceAlongWall: point.z - bounds.minZ },
    { wallSide: 'north' as const, distance: Math.abs(point.z - bounds.minZ), distanceAlongWall: point.x - bounds.minX },
    { wallSide: 'south' as const, distance: Math.abs(bounds.maxZ - point.z), distanceAlongWall: point.x - bounds.minX },
  ];
  return distances.sort((a, b) => a.distance - b.distance)[0];
};

const isLight = (placement: Placement) => placement.kind === 'torch' || placement.kind === 'wallSconce' || placement.kind === 'brazier';
const isBlockingProp = (placement: Placement) => placement.tags.includes('blocking');

const hasDuplicates = (ids: string[]) => ids.length !== new Set(ids).size;

const isOverlapping = (a: Room, b: Room) => {
  const ab = roomBounds(a);
  const bb = roomBounds(b);
  const overlapsX = ab.minX < bb.maxX && ab.maxX > bb.minX;
  const overlapsZ = ab.minZ < bb.maxZ && ab.maxZ > bb.minZ;
  return overlapsX && overlapsZ;
};

const isNear = (a: number, b: number) => Math.abs(a - b) <= 0.05;

const doorWallSideFromPosition = (room: Room, door: Door): WallSide | undefined => {
  const bounds = roomBounds(room);
  if (isNear(door.z, bounds.minZ) && door.x >= bounds.minX && door.x <= bounds.maxX) return 'north';
  if (isNear(door.z, bounds.maxZ) && door.x >= bounds.minX && door.x <= bounds.maxX) return 'south';
  if (isNear(door.x, bounds.minX) && door.z >= bounds.minZ && door.z <= bounds.maxZ) return 'west';
  if (isNear(door.x, bounds.maxX) && door.z >= bounds.minZ && door.z <= bounds.maxZ) return 'east';
  return undefined;
};

const doorWidthFitsWall = (room: Room, door: Door) => {
  const wallSide = door.wallSide ?? doorWallSideFromPosition(room, door);
  if (!wallSide) return true;
  const wallLength = wallSide === 'north' || wallSide === 'south' ? room.width : room.depth;
  return door.width <= Math.max(0.5, wallLength - 0.5);
};

const generatedJsLooksValid = (generatedJs?: string) => {
  if (!generatedJs) return true;
  if (!generatedJs.includes('export const') || !generatedJs.includes('Object.freeze(')) return false;
  const stack: string[] = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  for (const char of generatedJs) {
    if (char === '(' || char === '[' || char === '{') stack.push(char);
    if (char === ')' || char === ']' || char === '}') {
      if (stack.pop() !== pairs[char]) return false;
    }
  }
  return stack.length === 0;
};

export const getExportHealth = (project: Project, generatedJs?: string): ExportHealth => {
  const structure = getStructure(project);
  const playerSpawns = project.placements.filter((placement) => placement.kind === 'playerSpawn');
  const enemySpawns = project.placements.filter((placement) => placement.kind === 'enemySpawn');
  const lights = project.placements.filter(isLight);
  const blockingProps = project.placements.filter(isBlockingProp);
  const warnings: string[] = [];
  const errors: string[] = [];

  if (project.rooms.length === 0) errors.push('No rooms authored. Add at least one room rectangle before exporting to DSB.');
  if (playerSpawns.length === 0) errors.push('No player spawn placed. DSB needs one player spawn for reliable entry.');
  if (playerSpawns.some((placement) => !findContainingRoom(project, { x: placement.x, z: placement.z }))) {
    errors.push('Player spawn is outside all room/corridor rectangles.');
  }

  const ids = [
    ...structure.map((item) => item.id),
    ...project.doors.map((item) => item.id),
    ...project.placements.map((item) => item.id),
    ...blockingProps.map((item) => `${item.id}-blocker`),
  ];
  if (hasDuplicates(ids)) errors.push('Duplicate IDs detected across structure, doors, placements, or generated blockers.');
  if (!generatedJsLooksValid(generatedJs)) errors.push('Malformed generated JS detected. The export did not pass basic module/object checks.');

  if (project.doors.length === 0 || project.corridors.length === 0) {
    warnings.push('No doors/connectors authored. This is valid for a one-room smoke test, but navigation links will be sparse.');
  }
  if (!project.placements.some((placement) => placement.kind === 'returnExit')) {
    warnings.push('No return exit placed. DSB can load smoke tests without exits, but field wiring will be incomplete.');
  }
  enemySpawns
    .filter((placement) => !findContainingRoom(project, { x: placement.x, z: placement.z }))
    .forEach((placement) => warnings.push(`${placement.id} enemy spawn is outside all room/corridor rectangles.`));
  lights
    .filter((placement) => placement.kind === 'torch' || placement.kind === 'wallSconce')
    .forEach((placement) => {
      const roomId = resolvePlacementRoomId(project, placement);
      const room = structure.find((item) => item.id === roomId);
      if (!room) {
        warnings.push(`${placement.id} wall-mounted light has no containing room.`);
        return;
      }
      const attachment = nearestWallAttachment(room, { x: placement.x, z: placement.z });
      if (attachment.distance > 1.25) warnings.push(`${placement.id} wall-mounted light is not near a room wall.`);
    });
  blockingProps
    .filter((placement) => !placement.dimensions.width || !placement.dimensions.depth)
    .forEach((placement) => warnings.push(`${placement.id} blocking prop cannot generate a useful blocker without dimensions.`));
  project.placements
    .filter((placement) => placement.kind !== 'enemySpawn' && !findContainingRoom(project, { x: placement.x, z: placement.z }))
    .forEach((placement) => warnings.push(`${placement.id} ${placement.kind} placement is outside all room/corridor rectangles.`));

  project.doors.forEach((door) => {
    const fromRoom = structure.find((room) => room.id === door.fromRoom);
    const toRoom = structure.find((room) => room.id === door.toRoom);
    const wallSide = door.wallSide ?? (fromRoom ? doorWallSideFromPosition(fromRoom, door) : undefined);

    if (door.snapped !== true) warnings.push(`${door.id} door is not snapped to a wall.`);
    if (!door.toRoom || !toRoom) warnings.push(`${door.id} door has no second room or connector.`);
    if (door.fromRoom && door.toRoom && door.fromRoom === door.toRoom) warnings.push(`${door.id} door connects ${door.fromRoom} to itself.`);
    if (!wallSide) warnings.push(`${door.id} door wall side cannot be resolved.`);
    if (fromRoom && !doorWallSideFromPosition(fromRoom, door)) warnings.push(`${door.id} door is inside ${fromRoom.id} interior instead of on its wall.`);
    if (fromRoom && !doorWidthFitsWall(fromRoom, door)) warnings.push(`${door.id} door width is too large for the ${door.wallSide ?? 'resolved'} wall segment.`);
    if (door.orientation && wallSide) {
      const expectedOrientation = doorOrientation({ ...door, wallSide });
      if (door.orientation !== expectedOrientation) warnings.push(`${door.id} door orientation does not match its ${wallSide} wall.`);
    }
  });

  for (let index = 0; index < project.doors.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < project.doors.length; otherIndex += 1) {
      const a = project.doors[index];
      const b = project.doors[otherIndex];
      if (!a || !b) continue;
      const sameWall = (a.primaryRoomId ?? a.fromRoom) === (b.primaryRoomId ?? b.fromRoom) && a.wallSide === b.wallSide;
      const overlapDistance = Math.hypot(a.x - b.x, a.z - b.z);
      if (sameWall && overlapDistance < Math.max(a.width, b.width)) warnings.push(`${a.id} overlaps ${b.id} on the same wall.`);
    }
  }

  for (let index = 0; index < project.rooms.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < project.rooms.length; otherIndex += 1) {
      const a = project.rooms[index];
      const b = project.rooms[otherIndex];
      if (a && b && isOverlapping(a, b)) warnings.push(`${a.id} overlaps ${b.id}; verify this is intentional.`);
    }
  }

  return {
    counts: {
      rooms: project.rooms.length,
      corridors: project.corridors.length,
      doors: project.doors.length,
      placements: project.placements.length,
      enemySpawns: enemySpawns.length,
      lights: lights.length,
      blockingProps: blockingProps.length,
    },
    playerSpawnPresent: playerSpawns.length > 0,
    warnings,
    errors,
  };
};

export const formatHealthSummary = (health: ExportHealth) => [
  `Rooms: ${health.counts.rooms}`,
  `Corridors: ${health.counts.corridors}`,
  `Doors: ${health.counts.doors}`,
  `Placements: ${health.counts.placements}`,
  `Player spawn: ${health.playerSpawnPresent ? 'present' : 'missing'}`,
  `Enemy spawns: ${health.counts.enemySpawns}`,
  `Lights: ${health.counts.lights}`,
  `Blocking props: ${health.counts.blockingProps}`,
  `Warnings: ${health.warnings.length}`,
  `Errors: ${health.errors.length}`,
];
