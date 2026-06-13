import { roomBounds } from '../editor/geometry';
import type { Door, Placement, Project, Room } from '../editor/types';
import { findContainingRoom, nearestWallAttachment, resolvePlacementRoomId } from './exportHealth';

const defaultFloorY = 0;
const defaultCeilingY = 3.2;

const textureProfiles = Object.freeze({
  wall: {
    path: './assets/textures/wall_black_stone_01.png',
    repeat: [4.5, 1.4],
    color: 0x807a72,
    roughness: 0.97,
    metalness: 0,
    emissive: 0x15100c,
    emissiveIntensity: 0.12,
  },
  floor: {
    path: './assets/textures/floor_worn_stone_01.png',
    repeat: [4, 4],
    color: 0x8d8477,
    roughness: 0.98,
    metalness: 0,
    emissive: 0x17110c,
    emissiveIntensity: 0.14,
  },
  ceiling: {
    path: './assets/textures/ceiling_dark_stone_01.png',
    repeat: [4, 4],
    color: 0x6d6861,
    roughness: 0.98,
    metalness: 0,
    emissive: 0x11100f,
    emissiveIntensity: 0.1,
  },
  gate: {
    path: './assets/textures/metal_gate_rusted_01.png',
    repeat: [1, 1.5],
    color: 0x9c8066,
    roughness: 0.8,
    metalness: 0.35,
    emissive: 0x1a0f09,
    emissiveIntensity: 0.16,
  },
  propStone: {
    path: './assets/textures/wall_black_stone_01.png',
    repeat: [1.5, 1],
    color: 0x746c5e,
    roughness: 0.97,
    metalness: 0,
    emissive: 0x100b08,
    emissiveIntensity: 0.1,
  },
  offeringStone: {
    path: './assets/textures/wall_black_stone_01.png',
    repeat: [1.2, 0.9],
    color: 0x5d5245,
    roughness: 0.98,
    metalness: 0,
    emissive: 0x130b07,
    emissiveIntensity: 0.1,
  },
  fieldGrass: {
    path: './assets/textures/outdoor/field_dead_grass_01.png',
    repeat: [8, 5],
    color: 0x242716,
    roughness: 0.98,
    metalness: 0,
    emissive: 0x030703,
    emissiveIntensity: 0.12,
  },
});

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

const toDefinitionName = (id: string) => {
  const pascal = id
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('');
  return `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}Definition`;
};

const roomToExport = (room: Room) => {
  const bounds = roomBounds(room);
  const tags = room.type === 'corridor' ? Array.from(new Set([...room.tags, 'connector'])) : room.tags;
  return {
    id: room.id,
    label: room.label,
    minX: bounds.minX,
    maxX: bounds.maxX,
    minZ: bounds.minZ,
    maxZ: bounds.maxZ,
    floorY: defaultFloorY,
    ceilingY: defaultCeilingY,
    floorTexture: { texture: room.floorTexture === 'grassFloor' ? 'fieldGrass' : 'floor' },
    wallTexture: 'wall',
    ceilingTexture: 'ceiling',
    tags,
    encounterWeight: room.encounterWeight,
    safeForSpawn: room.safeForSpawn,
    wallGeometry: room.type === 'corridor' ? false : true,
    userData: {
      ...room.userData,
      ddplusType: room.type,
    },
  };
};

const wallGap = (roomId: string, x: number, z: number, width: number) => ({
  roomId,
  position: { x, y: defaultFloorY, z },
  width,
});

const navWaypointForDoor = (door: Door) => ({
  x: door.x,
  y: defaultFloorY,
  z: door.z,
});

const wallGapsForDoor = (door: Door) => [
  wallGap(door.fromRoom, door.x, door.z, door.width),
  door.toRoom ? wallGap(door.toRoom, door.x, door.z, door.width) : undefined,
].filter(Boolean);

const placementBounds = (placement: Placement) => ({
  minX: Number((placement.x - placement.dimensions.width / 2).toFixed(2)),
  maxX: Number((placement.x + placement.dimensions.width / 2).toFixed(2)),
  minZ: Number((placement.z - placement.dimensions.depth / 2).toFixed(2)),
  maxZ: Number((placement.z + placement.dimensions.depth / 2).toFixed(2)),
});

const propMaterialForKind = (kind: Placement['kind']) => {
  if (kind === 'statue') return 'offeringStone';
  if (kind === 'chest') return 'gate';
  return 'propStone';
};

const isPropPlacement = (placement: Placement) => placement.kind === 'chest' || placement.kind === 'statue' || placement.kind === 'note';
const isLightPlacement = (placement: Placement) => placement.kind === 'torch' || placement.kind === 'wallSconce' || placement.kind === 'brazier';
const isWallLight = (placement: Placement) => placement.kind === 'torch' || placement.kind === 'wallSconce';

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
      position: { x: door.x, y: defaultFloorY, z: door.z },
      width: door.width,
      kind: door.kind,
      navWaypoint: navWaypointForDoor(door),
      wallGaps: wallGapsForDoor(door),
      tags: Array.from(new Set([...door.tags, 'doorway'])),
      userData: {
        ...door.userData,
        ddplus: {
          orientation: door.orientation,
          wallSide: door.wallSide,
          primaryRoomId: door.primaryRoomId ?? door.fromRoom,
          secondaryRoomId: door.secondaryRoomId ?? door.toRoom,
          snapped: door.snapped,
          snapDistance: door.snapDistance,
        },
      },
    }));

  const blockingPlacements = project.placements
    .filter((placement) => placement.tags.includes('blocking'))
    .sort((a, b) => a.id.localeCompare(b.id));

  const blockers = blockingPlacements.map((placement) => ({
    id: `${placement.id}-blocker`,
    type: placement.kind,
    ...placementBounds(placement),
    height: placement.dimensions.height ?? 1,
    blocksPlayer: true,
    blocksEnemies: true,
    blocksLineOfMovement: true,
    tags: ['solid', 'ddplus-generated'],
    userData: {
      sourcePlacementId: placement.id,
      roomId: resolvePlacementRoomId(project, placement),
    },
  }));

  const props = project.placements
    .filter(isPropPlacement)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((placement) => {
      const collisionRef = placement.tags.includes('blocking') ? `${placement.id}-blocker` : null;
      return {
        id: placement.id,
        kind: placement.kind,
        roomId: resolvePlacementRoomId(project, placement),
        position: { x: placement.x, y: placement.y, z: placement.z },
        rotation: { x: 0, y: placement.rotationY, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        dimensions: placement.dimensions,
        collisionRef,
        material: propMaterialForKind(placement.kind),
        tags: ['compiled-prop', collisionRef ? 'solid' : 'nonBlockingDecor'],
        userData: {
          ...placement.userData,
          blockingMode: collisionRef ? 'solid' : 'nonBlockingDecor',
          collisionPurpose: collisionRef ? 'visible DDplus prop' : 'decorative non-blocking geometry',
        },
      };
    });

  const torchFixtures = project.placements
    .filter(isWallLight)
    .sort((a, b) => a.id.localeCompare(b.id))
    .flatMap((placement) => {
      const roomId = resolvePlacementRoomId(project, placement);
      const room = structure.find((item) => item.id === roomId);
      if (!room) return [];
      const attachment = nearestWallAttachment(room, { x: placement.x, z: placement.z });
      return [
        {
          id: placement.id,
          kind: 'torch',
          roomId,
          wallSide: attachment.wallSide,
          distanceAlongWall: Number(Math.max(0, attachment.distanceAlongWall).toFixed(2)),
          height: placement.y || 1.65,
          insetFromCorner: 1.25,
          offsetFromWall: 0.16,
          profile: placement.kind === 'wallSconce' ? 'weakTorch' : 'dungeonTorch',
          visualKind: 'procedural-sconce',
          flameKind: 'procedural-warm-flame',
          debug: { note: `DDplus ${placement.kind} wall-mounted light` },
        },
      ];
    });

  const lights = project.placements
    .filter((placement) => isLightPlacement(placement) && !isWallLight(placement))
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((placement) => ({
      id: placement.id,
      kind: 'point',
      color: 0xd78a3a,
      intensity: placement.kind === 'brazier' ? 1.05 : 0.75,
      distance: placement.kind === 'brazier' ? 9 : 6,
      decay: 1.5,
      position: { x: placement.x, y: placement.y || 1.2, z: placement.z },
      roomId: resolvePlacementRoomId(project, placement),
      tags: ['ddplus-light', placement.kind],
    }));

  const spawns = project.placements
    .filter((placement) => placement.kind === 'enemySpawn' || placement.kind === 'playerSpawn')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((placement) => {
      const resolvedRoomId = findContainingRoom(project, { x: placement.x, z: placement.z })?.id ?? resolvePlacementRoomId(project, placement);
      return {
        id: placement.id,
        kind: placement.kind === 'enemySpawn' ? 'enemy' : 'player',
        species: placement.kind === 'enemySpawn' ? placement.userData.species ?? 'sheep_demon' : undefined,
        faction: placement.kind === 'enemySpawn' ? placement.userData.faction ?? 'none' : undefined,
        roomId: resolvedRoomId,
        position: {
          x: placement.x,
          y: placement.kind === 'playerSpawn' ? 1.55 : 0,
          z: placement.z,
        },
        yaw: placement.rotationY,
        allowedForInitialWave: placement.kind === 'enemySpawn' ? true : undefined,
        allowedForRespawn: placement.kind === 'enemySpawn' ? true : undefined,
        tags: placement.tags,
        userData: placement.userData,
      };
    });

  const exits = project.placements
    .filter((placement) => placement.kind === 'returnExit')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((placement) => ({
      id: placement.id,
      fromLocation: project.id,
      toLocation: 'reliquary-field',
      roomId: resolvePlacementRoomId(project, placement),
      position: { x: placement.x, y: 1.2, z: placement.z },
      triggerRect: placementBounds(placement),
      destinationSpawnId: 'field_return_spawn',
      promptText: 'Tap INTERACT to return to Reliquary Field.',
      tags: ['field-return', 'ddplus-export'],
      userData: placement.userData,
    }));

  const notes = project.placements
    .filter((placement) => placement.kind === 'note')
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((placement) => ({
      id: placement.id,
      roomId: resolvePlacementRoomId(project, placement),
      position: { x: placement.x, z: placement.z },
      note: placement.userData.note ?? 'Note marker',
    }));

  const definition = {
    id: project.id,
    displayName: project.displayName,
    type: project.locationType,
    tags: ['interior', 'dungeon', 'compiled-runtime', 'ddplus-export'],
    notes: 'Generated by Dungeon Drawer Plus v1. Verify registry wiring and any field entrance/exit links in Dread Stone Black.',
    fog: { color: 0x242018, near: 12, far: 58 },
    lighting: { background: 0x100f0d },
    textures: textureProfiles,
    defaultFloorY,
    defaultCeilingY,
    collision: { playerRadius: 0.5 },
    geometry: { wallThickness: 0.35, floorThickness: 0.18, ceilingThickness: 0.18 },
    integrity: {
      roomEdgePolicy: 'sealedUnlessDeclaredOpening',
      leakSampleStep: 1,
      collisionTruth: {
        visibleStructuralPropsRequireCollisionOrNonBlockingMetadata: true,
      },
    },
    rooms,
    doors,
    blockers,
    props,
    torchFixtures,
    lights,
    spawns,
    exits,
    interactions: [],
    userData: {
      ddplus: {
        version: project.metadata.version,
        grid: project.grid,
        footprint: project.metadata.footprint,
        notes,
        exportContract: 'DDplus DSB v1 rectangle-authoring contract',
      },
    },
  };

  return `export const ${toDefinitionName(project.id)} = Object.freeze(${unquoteKeys(stableObject(definition))});\n`;
};
