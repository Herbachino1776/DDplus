export type EditorMode = 'shape' | 'draw' | 'place' | 'layers' | 'export';
export type LeftTool = 'select' | 'marquee' | 'pan' | 'zoomIn' | 'zoomOut' | 'fit';
export type DrawTool = 'room' | 'corridor' | 'erase' | 'fill';
export type PlaceCategory = 'all' | 'doors' | 'light' | 'enemies' | 'stairs' | 'objects' | 'decor';
export type LocationType = 'dungeon' | 'crypt' | 'temple' | 'house';
export type LayerKey = 'structure' | 'doors' | 'lighting' | 'enemies' | 'objects' | 'notes';
export type DoorOrientation = 'horizontal' | 'vertical';
export type WallSide = 'north' | 'south' | 'east' | 'west';

export interface GridDefinition {
  width: number;
  height: number;
  cellSize: number;
}

export interface Room {
  id: string;
  label: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  type: 'room' | 'corridor';
  tags: string[];
  floorTexture: string;
  encounterWeight: number;
  safeForSpawn: boolean;
  userData: Record<string, unknown>;
}

export interface Door {
  id: string;
  fromRoom: string;
  toRoom: string;
  x: number;
  z: number;
  width: number;
  kind: 'door' | 'doubleDoor' | 'lockedDoor' | 'secretDoor';
  orientation?: DoorOrientation;
  wallSide?: WallSide;
  primaryRoomId?: string;
  secondaryRoomId?: string;
  snapped?: boolean;
  snapDistance?: number;
  tags: string[];
  userData: Record<string, unknown>;
}

export interface Placement {
  id: string;
  kind:
    | 'torch'
    | 'wallSconce'
    | 'brazier'
    | 'chest'
    | 'statue'
    | 'enemySpawn'
    | 'playerSpawn'
    | 'returnExit'
    | 'note'
    | 'stairs';
  roomId?: string;
  x: number;
  z: number;
  y: number;
  rotationY: number;
  category: Exclude<PlaceCategory, 'all'>;
  dimensions: { width: number; depth: number; height?: number };
  tags: string[];
  userData: Record<string, unknown>;
}

export interface LayerState {
  visible: boolean;
  locked: boolean;
}

export interface Project {
  id: string;
  name: string;
  displayName: string;
  locationType: LocationType;
  grid: GridDefinition;
  theme: 'dread_stone_black';
  rooms: Room[];
  corridors: Room[];
  doors: Door[];
  placements: Placement[];
  layers: Record<LayerKey, LayerState>;
  notes: string[];
  metadata: {
    version: string;
    themePreset: 'dread_stone_black';
    snap: boolean;
    zoom: number;
    footprint: 'rectangle' | 'temple' | 'cross' | 'cave' | 'custom';
    savedAt?: string;
  };
}

export interface EditorState {
  mode: EditorMode;
  leftTool: LeftTool;
  drawTool: DrawTool;
  brushSize: number;
  placeCategory: PlaceCategory;
  placeTool: Door['kind'] | Placement['kind'];
  selectedShapeId?: string;
  selectedPlacementId?: string;
  selectedDoorId?: string;
}

export interface CanvasPoint {
  x: number;
  z: number;
}
