import { useEffect, useMemo, useState } from 'react';
import BottomDrawer from './components/BottomDrawer';
import DungeonCanvas from './components/DungeonCanvas';
import LeftToolRail from './components/LeftToolRail';
import ModeBar from './components/ModeBar';
import TopBar from './components/TopBar';
import { createDefaultProject } from './editor/defaultProject';
import { defaultEditorState } from './editor/editorState';
import { findDoorRooms, findNearestRoom, isDoorKind, normalizeRect } from './editor/geometry';
import { nextCorridorId, nextDoorId, nextPlacementId, nextRoomId } from './editor/ids';
import type { CanvasPoint, Door, DrawTool, EditorMode, EditorState, LayerKey, Placement, Project, Room } from './editor/types';

const STORAGE_KEY = 'ddplus.project.v1';

const loadProject = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Project) : createDefaultProject();
  } catch {
    return createDefaultProject();
  }
};

const makeRoom = (project: Project, drawTool: Extract<DrawTool, 'room' | 'corridor'>, start: CanvasPoint, end: CanvasPoint): Room => {
  const rect = normalizeRect(start, end);
  const isCorridor = drawTool === 'corridor';
  const id = isCorridor ? nextCorridorId(project.corridors) : nextRoomId(project.rooms);
  return {
    id,
    label: isCorridor ? `Connector ${id}` : `Room ${id}`,
    ...rect,
    type: isCorridor ? 'corridor' : 'room',
    tags: isCorridor ? ['connector'] : [],
    floorTexture: 'floor_worn_stone_01',
    encounterWeight: isCorridor ? 0 : 1,
    safeForSpawn: !isCorridor,
    userData: {},
  };
};

const placementDefaults: Record<Placement['kind'], Pick<Placement, 'category' | 'dimensions' | 'tags' | 'y' | 'rotationY' | 'userData'>> = {
  torch: { category: 'light', dimensions: { width: 0.35, depth: 0.35, height: 1.8 }, tags: ['wall-mounted'], y: 1.5, rotationY: 0, userData: {} },
  wallSconce: { category: 'light', dimensions: { width: 0.4, depth: 0.25, height: 1.6 }, tags: ['wall-mounted'], y: 1.5, rotationY: 0, userData: {} },
  brazier: { category: 'light', dimensions: { width: 0.7, depth: 0.7, height: 0.9 }, tags: ['free-light'], y: 0, rotationY: 0, userData: {} },
  chest: { category: 'objects', dimensions: { width: 1.2, depth: 0.8, height: 0.8 }, tags: ['blocking'], y: 0, rotationY: 0, userData: {} },
  statue: { category: 'decor', dimensions: { width: 1, depth: 1, height: 2 }, tags: ['blocking'], y: 0, rotationY: 0, userData: {} },
  enemySpawn: { category: 'enemies', dimensions: { width: 1, depth: 1 }, tags: ['enemy'], y: 0, rotationY: 0, userData: {} },
  playerSpawn: { category: 'stairs', dimensions: { width: 1, depth: 1 }, tags: ['start'], y: 0, rotationY: 0, userData: {} },
  returnExit: { category: 'stairs', dimensions: { width: 2, depth: 2 }, tags: ['exit'], y: 0, rotationY: 0, userData: {} },
  note: { category: 'decor', dimensions: { width: 1, depth: 1 }, tags: ['note'], y: 0, rotationY: 0, userData: { note: 'Designer note' } },
  stairs: { category: 'stairs', dimensions: { width: 2, depth: 3 }, tags: ['stairs'], y: 0, rotationY: 0, userData: {} },
};

const idPrefixByKind: Record<Placement['kind'], string> = {
  torch: 'L',
  wallSconce: 'L',
  brazier: 'L',
  chest: 'O',
  statue: 'O',
  enemySpawn: 'E',
  playerSpawn: 'P',
  returnExit: 'X',
  note: 'N',
  stairs: 'S',
};

export default function App() {
  const [project, setProject] = useState<Project>(loadProject);
  const [editor, setEditor] = useState<EditorState>(defaultEditorState);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setSaved(false);
    const timer = window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
      setSaved(true);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [project]);

  const selectedShape = useMemo(
    () => [...project.rooms, ...project.corridors].find((shape) => shape.id === editor.selectedShapeId),
    [project.rooms, project.corridors, editor.selectedShapeId],
  );

  const setMode = (mode: EditorMode) => {
    setEditor((current) => ({ ...current, mode }));
  };

  const createShape = (start: CanvasPoint, end: CanvasPoint) => {
    if (project.layers.structure.locked || (editor.drawTool !== 'room' && editor.drawTool !== 'corridor')) return;
    const shape = makeRoom(project, editor.drawTool, start, end);
    setProject((current) =>
      shape.type === 'corridor'
        ? { ...current, corridors: [...current.corridors, shape] }
        : { ...current, rooms: [...current.rooms, shape] },
    );
    setEditor((current) => ({ ...current, selectedShapeId: shape.id }));
  };

  const deleteShape = (id: string) => {
    setProject((current) => ({
      ...current,
      rooms: current.rooms.filter((room) => room.id !== id),
      corridors: current.corridors.filter((corridor) => corridor.id !== id),
      doors: current.doors.filter((door) => door.fromRoom !== id && door.toRoom !== id),
      placements: current.placements.filter((placement) => placement.roomId !== id),
    }));
    setEditor((current) => ({ ...current, selectedShapeId: undefined }));
  };

  const updateShape = (id: string, patch: Partial<Room>) => {
    setProject((current) => {
      const shape = [...current.rooms, ...current.corridors].find((item) => item.id === id);
      if (!shape) return current;
      const updated = { ...shape, ...patch };

      if (patch.type && patch.type !== shape.type) {
        const target = { ...updated, tags: patch.type === 'corridor' ? Array.from(new Set([...updated.tags, 'connector'])) : updated.tags.filter((tag) => tag !== 'connector') };
        return {
          ...current,
          rooms: patch.type === 'room' ? [...current.rooms.filter((item) => item.id !== id), target] : current.rooms.filter((item) => item.id !== id),
          corridors: patch.type === 'corridor' ? [...current.corridors.filter((item) => item.id !== id), target] : current.corridors.filter((item) => item.id !== id),
        };
      }

      return {
        ...current,
        rooms: current.rooms.map((room) => (room.id === id ? updated : room)),
        corridors: current.corridors.map((corridor) => (corridor.id === id ? updated : corridor)),
      };
    });
  };

  const placeAt = (point: CanvasPoint) => {
    if (isDoorKind(editor.placeTool)) {
      if (project.layers.doors.locked) return;
      const rooms = findDoorRooms(project, point);
      if (rooms.length < 2) return;
      const [fromRoom, toRoom] = rooms;
      if (!fromRoom || !toRoom) return;
      const door: Door = {
        id: nextDoorId(project.doors),
        fromRoom: fromRoom.id,
        toRoom: toRoom.id,
        x: point.x,
        z: point.z,
        width: editor.placeTool === 'doubleDoor' ? 2 : 1,
        kind: editor.placeTool,
        tags: editor.placeTool === 'lockedDoor' ? ['doorway', 'locked'] : editor.placeTool === 'secretDoor' ? ['doorway', 'secret'] : ['doorway'],
        userData: {},
      };
      setProject((current) => ({ ...current, doors: [...current.doors, door] }));
      return;
    }

    const kind = editor.placeTool as Placement['kind'];
    const defaults = placementDefaults[kind];
    const room = findNearestRoom(project, point);
    const placement: Placement = {
      id: nextPlacementId(project.placements, idPrefixByKind[kind]),
      kind,
      roomId: room?.id,
      x: point.x,
      z: point.z,
      ...defaults,
    };
    setProject((current) => ({ ...current, placements: [...current.placements, placement] }));
    setEditor((current) => ({ ...current, selectedPlacementId: placement.id }));
  };

  const toggleLayer = (layer: LayerKey, field: 'visible' | 'locked') => {
    setProject((current) => ({
      ...current,
      layers: {
        ...current.layers,
        [layer]: {
          ...current.layers[layer],
          [field]: !current.layers[layer][field],
        },
      },
    }));
  };

  return (
    <main className="app-shell">
      <div className="phone-frame">
        <TopBar project={project} />
        <section className="canvas-stage">
          <DungeonCanvas
            project={project}
            editor={editor}
            selectedShapeId={editor.selectedShapeId}
            onSelectShape={(id) => setEditor((current) => ({ ...current, selectedShapeId: id, selectedPlacementId: undefined }))}
            onCreateShape={createShape}
            onDeleteShape={deleteShape}
            onPlace={placeAt}
          />
          <LeftToolRail editor={editor} onChange={(patch) => setEditor((current) => ({ ...current, ...patch }))} />
        </section>
        <ModeBar mode={editor.mode} onChange={setMode} />
        <BottomDrawer
          project={project}
          editor={editor}
          selectedShape={selectedShape}
          saved={saved}
          onEditorChange={(patch) => setEditor((current) => ({ ...current, ...patch }))}
          onProjectChange={setProject}
          onShapeUpdate={updateShape}
          onShapeDelete={deleteShape}
          onLayerToggle={toggleLayer}
        />
      </div>
    </main>
  );
}
