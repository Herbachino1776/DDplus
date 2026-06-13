# Dread Stone Black Location Definition Contract

DDplus v1 exports a Dread Stone Black compiled-runtime location definition module. The target shape is based on the current public DSB definitions in `src/game/locations/`, especially Black Grass Temple, Field Keeper House, South Reliquary Crypt, and Reliquary Field.

## Module Shape

A generated file should export one frozen ES module constant:

```js
export const level1Definition = Object.freeze({
  id: 'level-1',
  displayName: 'Level 1',
  type: 'temple',
  tags: ['interior', 'dungeon', 'compiled-runtime', 'ddplus-export'],
  textures: textureProfiles,
  rooms: [],
  doors: [],
  blockers: [],
  props: [],
  torchFixtures: [],
  lights: [],
  spawns: [],
  exits: [],
  interactions: [],
});
```

The registry integration happens in DSB, not in DDplus. Generated files are intended to be placed under `src/game/locations/generated/`, imported in `src/game/locations/locationRegistry.js`, and added to `locationDefinitions`.

## Required Top-Level Fields

DDplus emits:

- `id`, `displayName`, and `type`
- `tags`, including `compiled-runtime` and `ddplus-export`
- `fog` and `lighting`
- `textures` as keyed texture profiles
- `defaultFloorY` and `defaultCeilingY`
- `collision.playerRadius`
- `geometry.wallThickness`, `floorThickness`, and `ceilingThickness`
- `integrity.roomEdgePolicy: 'sealedUnlessDeclaredOpening'`
- arrays for `rooms`, `doors`, `blockers`, `props`, `torchFixtures`, `lights`, `spawns`, `exits`, and `interactions`

## Texture Profiles

DSB definitions use texture profile keys, not raw texture paths on each room. DDplus exports profiles such as:

- `wall`
- `floor`
- `ceiling`
- `gate`
- `propStone`
- `offeringStone`
- `fieldGrass`

Each profile may include `path`, `repeat`, `color`, `roughness`, `metalness`, `emissive`, and `emissiveIntensity`.

## Rooms

Rooms are rectangular walkable regions:

```js
{
  id: 'R01',
  label: 'Main Room',
  minX: 0,
  maxX: 12,
  minZ: 0,
  maxZ: 10,
  floorY: 0,
  ceilingY: 3.2,
  floorTexture: { texture: 'floor' },
  wallTexture: 'wall',
  ceilingTexture: 'ceiling',
  tags: [],
  encounterWeight: 1,
  safeForSpawn: true,
  wallGeometry: true,
  userData: {}
}
```

## Corridors And Connectors

DDplus v1 keeps corridors as room-like rectangles. They are exported in `rooms` with:

- `tags` containing `connector`
- `safeForSpawn: false`
- `wallGeometry: false`
- stable IDs such as `C01`, `C02`, or authored connector-like IDs

This matches DSB definitions where connector geometry can be declared as room rectangles tagged `connector`.

## Doors And Wall Gaps

Doors are connector records:

```js
{
  id: 'D01',
  fromRoom: 'R01',
  toRoom: 'R02',
  position: { x: 8, y: 0, z: 10 },
  width: 2,
  navWaypoint: { x: 8, y: 0, z: 10 },
  wallGaps: [
    { roomId: 'R01', position: { x: 8, y: 0, z: 10 }, width: 2 },
    { roomId: 'R02', position: { x: 8, y: 0, z: 10 }, width: 2 }
  ],
  tags: ['doorway']
}
```

The DSB compiler treats `wallGaps` as declared openings in sealed room edges. DDplus v1 generates simple paired gaps. Hand-authored DSB maps may include extra connector-room wall gaps for multi-step connectors.

## Props And Blockers

Blocking props must have a matching blocker. The prop points to the blocker by `collisionRef`:

```js
{
  id: 'O01',
  kind: 'chest',
  roomId: 'R01',
  position: { x: 5, y: 0, z: 5 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
  dimensions: { width: 1.2, height: 0.8, depth: 0.8 },
  collisionRef: 'O01-blocker',
  material: 'gate',
  tags: ['compiled-prop', 'solid']
}
```

The blocker uses rectangle bounds:

```js
{
  id: 'O01-blocker',
  type: 'chest',
  minX: 4.4,
  maxX: 5.6,
  minZ: 4.6,
  maxZ: 5.4,
  height: 0.8,
  blocksPlayer: true,
  blocksEnemies: true,
  blocksLineOfMovement: true,
  tags: ['solid', 'ddplus-generated']
}
```

Non-blocking props use `collisionRef: null` and include `nonBlockingDecor` metadata/tags.

## CollisionRef Rules

- Use `collisionRef`, not `blockerId`.
- Every non-null `collisionRef` should match exactly one `blockers[].id`.
- Visible structural props should either have collision or explicit non-blocking metadata.
- Blockers should remain deterministic and derived from placement IDs.

## Torch Fixtures

Wall-mounted torches and sconces export as DSB `torchFixtures`:

```js
{
  id: 'L01',
  kind: 'torch',
  roomId: 'R01',
  wallSide: 'north',
  distanceAlongWall: 4,
  height: 1.65,
  insetFromCorner: 1.25,
  offsetFromWall: 0.16,
  profile: 'dungeonTorch',
  visualKind: 'procedural-sconce',
  flameKind: 'procedural-warm-flame'
}
```

DDplus computes the nearest wall from placement position. If a wall-mounted light is not near a wall, export health warns but still exports a best-effort fixture when the room can be resolved.

Free-standing braziers export as `lights` rather than wall fixtures.

## Spawns

Player spawns use DSB's current standing height:

```js
{ id: 'P01', kind: 'player', position: { x: 5, y: 1.55, z: 5 }, yaw: 0, roomId: 'R01' }
```

Enemy spawns export with `kind: 'enemy'`, `species`, `faction`, `position.y: 0`, `roomId`, and respawn flags. DDplus resolves `roomId` from the containing room when possible.

## Exits

Return exits export with a trigger rectangle and field wiring placeholders:

```js
{
  id: 'X01',
  fromLocation: 'level-1',
  toLocation: 'reliquary-field',
  triggerRect: { minX: 4, maxX: 6, minZ: 9, maxZ: 11 },
  position: { x: 5, y: 1.2, z: 10 },
  destinationSpawnId: 'field_return_spawn',
  promptText: 'Tap INTERACT to return to Reliquary Field.'
}
```

The destination spawn and registry wiring must be reviewed in DSB after export.

## Validation Expectations

Run these in DSB after installing a generated file:

```bash
npm run validate:dungeons
npm run build
```

Expected issues to fix are schema, import, registry, or path problems. Do not redesign the exported map during validation. A one-room smoke test with no doors or exits may be intentional.

## Export Health

DDplus reports:

- rooms, corridors, doors, and placements
- player spawn present/missing
- enemy spawn count
- light count
- blocking prop count
- warnings
- errors

Blocking export errors:

- no rooms
- no player spawn
- player spawn outside all rooms
- duplicate IDs
- malformed generated JS

Warnings:

- no doors/connectors
- no exits
- enemy spawn outside a room
- wall-mounted light not near a wall
- blocking prop missing useful dimensions
- likely accidental overlapping rooms

## Known V1 Limitations

- DDplus v1 authors rectangles only; it does not export arbitrary polygon rooms.
- Door wall gaps are simple paired gaps and may need hand-tuning for complex connector chains.
- It does not generate DSB encounter zones or full navigation graphs yet.
- It does not wire field entrances automatically.
- It treats free-standing lights differently from wall-mounted torch fixtures.
- It aims for deterministic, validation-friendly definitions rather than full DSB runtime parity.
