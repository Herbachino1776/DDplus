import { getAllStructure, pointInRoom, roomBounds } from '../editor/geometry';
import type { CanvasPoint, Placement, Project, Room } from '../editor/types';

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
