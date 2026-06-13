import { roomBounds } from '../editor/geometry';
import type { Door, Placement, Project, Room } from '../editor/types';

const indent = (value: string, spaces = 2) =>
  value
    .split('\n')
    .map((line) => `${' '.repeat(spaces)}${line}`)
    .join('\n');

const stableObject = (value: unknown): string => {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[\n${value.map((item) => indent(stableObject(item), 2)).join(',\n')}\n]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined);
    if (entries.length === 0) return '{}';
    return `{\n${entries
      .map(([key, item]) => `${' '.repeat(2)}${JSON.stringify(key)}: ${stableObject(item)}`)
      .join(',\n')}\n}`;
  }

  return JSON.stringify(value);
};

const unquoteKeys = (value: string) => value.replace(/"([A-Za-z_$][\w$]*)":/g, '$1:');

const roomToExport = (room: Room) => {
  const bounds = roomBounds(room);
  return {
    id: room.id,
    label: room.label,
    type: room.type,
    minX: bounds.minX,
    maxX: bounds.maxX,
    minZ: bounds.minZ,
    maxZ: bounds.maxZ,
    floorTexture: './assets/textures/floor_worn_stone_01.png',
    wallTexture: './assets/textures/wall_black_stone_01.png',
    ceilingTexture: './assets/textures/ceiling_dark_stone_01.png',
    tags: room.type === 'corridor' ? Array.from(new Set([...room.tags, 'connector'])) : room.tags,
    encounterWeight: room.encounterWeight,
    safeForSpawn: room.safeForSpawn,
    userData: room.userData,
  };
};

const navWaypointForDoor = (door: Door) => ({
  id: `${door.id}-nav`,
  x: door.x,
  z: door.z,
});

const wallGapForDoor = (door: Door) => ({
  roomIds: [door.fromRoom, door.toRoom],
  center: { x: door.x, z: door.z },
  width: door.width,
});

const placementBounds = (placement: Placement) => ({
  minX: Number((placement.x - placement.dimensions.width / 2).toFixed(2)),
  maxX: Number((placement.x + placement.dimensions.width / 2).toFixed(2)),
  minZ: Number((placement.z - placement.dimensions.depth / 2).toFixed(2)),
  maxZ: Number((placement.z + placement.dimensions.depth / 2).toFixed(2)),
});

export const exportDsbDefinition = (project: Project) => {
  const structure = [...project.rooms, ...project.corridors].sort((a, b) => a.id.localeCompare(b.id));
  const rooms = structure.map(roomToExport);

  const doors = project.doors
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((door) => ({
      id: door.id,
      fromRoom: door.fromRoom,
      toRoom: door.toRoom,
      position: { x: door.x, z: door.z },
      width: door.width,
      kind: door.kind,
      navWaypoint: navWaypointForDoor(door),
      wallGaps: [wallGapForDoor(door)],
      tags: Array.from(new Set([...door.tags, 'doorway'])),
      userData: door.userData,
    }));

  const props = project.placements
    .filter((placement) => ['chest', 'statue', 'note'].includes(placement.kind))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((placement) => ({
      id: placement.id,
      kind: placement.kind,
      roomId: placement.roomId,
      position: { x: placement.x, y: placement.y, z: placement.z },
      rotationY: placement.rotationY,
      dimensions: placement.dimensions,
      blockerId: placement.tags.includes('blocking') ? `${placement.id}-blocker` : undefined,
      userData: {
        ...placement.userData,
        nonBlocking: !placement.tags.includes('blocking'),
      },
    }));

  const blockers = project.placements
    .filter((placement) => placement.tags.includes('blocking'))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((placement) => ({
      id: `${placement.id}-blocker`,
      roomId: placement.roomId,
      ...placementBounds(placement),
      height: placement.dimensions.height ?? 1,
      tags: ['prop-blocker'],
    }));

  const torchFixtures = project.placements
    .filter((placement) => ['torch', 'wallSconce', 'brazier'].includes(placement.kind) && placement.roomId)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((placement) => ({
      id: placement.id,
      kind: placement.kind,
      roomId: placement.roomId,
      position: { x: placement.x, y: placement.y, z: placement.z },
      rotationY: placement.rotationY,
      tags: placement.tags,
    }));

  const spawns = project.placements
    .filter((placement) => placement.kind === 'enemySpawn' || placement.kind === 'playerSpawn')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((placement) => ({
      id: placement.id,
      kind: placement.kind === 'enemySpawn' ? 'enemy' : 'player',
      roomId: placement.roomId,
      position: { x: placement.x, y: placement.y, z: placement.z },
      tags: placement.tags,
      userData: placement.userData,
    }));

  const exits = project.placements
    .filter((placement) => placement.kind === 'returnExit')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((placement) => ({
      id: placement.id,
      roomId: placement.roomId,
      position: { x: placement.x, y: placement.y, z: placement.z },
      triggerRect: placementBounds(placement),
      destinationSpawnId: 'field-return-spawn',
      promptText: 'Return to field',
      userData: placement.userData,
    }));

  const notes = project.placements
    .filter((placement) => placement.kind === 'note')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((placement) => ({
      id: placement.id,
      roomId: placement.roomId,
      position: { x: placement.x, z: placement.z },
      note: placement.userData.note ?? 'Note marker',
    }));

  const definitionName = `${project.id.replace(/[^a-zA-Z0-9]+(.)/g, (_, char: string) => char.toUpperCase())}Definition`;
  const definition = {
    id: project.id,
    displayName: project.displayName,
    type: project.locationType,
    tags: ['interior', 'dungeon', 'compiled-runtime', 'ddplus-export'],
    notes: 'Generated by Dungeon Drawer Plus v1.',
    fog: { color: 0x242018, near: 12, far: 58 },
    lighting: { background: 0x100f0d },
    textures: {
      wall: './assets/textures/wall_black_stone_01.png',
      floor: './assets/textures/floor_worn_stone_01.png',
      ceiling: './assets/textures/ceiling_dark_stone_01.png',
      gate: './assets/textures/metal_gate_rusted_01.png',
      exterior: './assets/textures/outdoor/field_dead_grass_01.png',
    },
    defaultFloorY: 0,
    defaultCeilingY: 3.2,
    collision: { playerRadius: 0.5 },
    geometry: { wallThickness: 0.35, floorThickness: 0.18, ceilingThickness: 0.18 },
    integrity: {
      roomEdgePolicy: 'sealedUnlessDeclaredOpening',
      leakSampleStep: 1,
    },
    rooms,
    doors,
    blockers,
    props,
    torchFixtures,
    spawns,
    exits,
    interactions: [],
    userData: {
      ddplus: {
        grid: project.grid,
        footprint: project.metadata.footprint,
        notes,
      },
    },
  };

  return `export const ${definitionName} = Object.freeze(${unquoteKeys(stableObject(definition))});\n`;
};
