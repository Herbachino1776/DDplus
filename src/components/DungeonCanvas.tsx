import { Flame, Skull, UserRound, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { doorOrientation, findRoomAtPoint, isPlacementVisible, normalizeRect } from '../editor/geometry';
import type { CanvasPoint, EditorState, Placement, Project, Room } from '../editor/types';

interface DungeonCanvasProps {
  project: Project;
  editor: EditorState;
  selectedShapeId?: string;
  selectedPlacementId?: string;
  selectedDoorId?: string;
  onSelectShape: (id?: string) => void;
  onSelectPlacement: (id?: string) => void;
  onSelectDoor: (id?: string) => void;
  onCreateShape: (start: CanvasPoint, end: CanvasPoint) => void;
  onDeleteShape: (id: string) => void;
  onPlace: (point: CanvasPoint) => void;
}

const pointFromEvent = (event: React.PointerEvent<HTMLDivElement>, element: HTMLDivElement, project: Project): CanvasPoint => {
  const rect = element.getBoundingClientRect();
  const x = Math.round(((event.clientX - rect.left) / rect.width) * project.grid.width);
  const z = Math.round(((event.clientY - rect.top) / rect.height) * project.grid.height);
  return {
    x: Math.min(Math.max(x, 0), project.grid.width),
    z: Math.min(Math.max(z, 0), project.grid.height),
  };
};

const markerLabel: Record<Placement['kind'], string> = {
  torch: 'T',
  wallSconce: 'S',
  brazier: 'B',
  chest: 'C',
  statue: 'ST',
  enemySpawn: 'E',
  playerSpawn: 'P',
  returnExit: 'X',
  note: 'N',
  stairs: 'R',
};

const MarkerIcon = ({ kind }: { kind: Placement['kind'] }) => {
  if (kind === 'torch' || kind === 'wallSconce' || kind === 'brazier') return <Flame size={15} />;
  if (kind === 'enemySpawn') return <Skull size={15} />;
  if (kind === 'playerSpawn') return <UserRound size={15} />;
  if (kind === 'returnExit') return <X size={15} />;
  return <span>{markerLabel[kind]}</span>;
};

const shapeStyle = (project: Project, shape: Room) => ({
  left: `${(shape.x / project.grid.width) * 100}%`,
  top: `${(shape.z / project.grid.height) * 100}%`,
  width: `${(shape.width / project.grid.width) * 100}%`,
  height: `${(shape.depth / project.grid.height) * 100}%`,
});

export default function DungeonCanvas({
  project,
  editor,
  selectedShapeId,
  selectedPlacementId,
  selectedDoorId,
  onSelectShape,
  onSelectPlacement,
  onSelectDoor,
  onCreateShape,
  onDeleteShape,
  onPlace,
}: DungeonCanvasProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [startPoint, setStartPoint] = useState<CanvasPoint | null>(null);
  const [hoverPoint, setHoverPoint] = useState<CanvasPoint | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!mapRef.current) return;
    const point = pointFromEvent(event, mapRef.current, project);
    setStartPoint(point);
    setHoverPoint(point);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!mapRef.current || !startPoint) return;
    setHoverPoint(pointFromEvent(event, mapRef.current, project));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!mapRef.current || !startPoint) return;
    const point = pointFromEvent(event, mapRef.current, project);

    if (editor.mode === 'draw') {
      const target = findRoomAtPoint(project, point);
      if (editor.drawTool === 'erase' && target) onDeleteShape(target.id);
      if ((editor.drawTool === 'room' || editor.drawTool === 'corridor') && project.layers.structure.visible) {
        const isTap = startPoint.x === point.x && startPoint.z === point.z;
        if (isTap && editor.brushSize > 1) {
          onCreateShape(point, { x: point.x + editor.brushSize - 1, z: point.z + editor.brushSize - 1 });
        } else if (!isTap) {
          onCreateShape(startPoint, point);
        }
      }
      if (!target && editor.drawTool === 'fill') onCreateShape(point, { x: point.x + editor.brushSize - 1, z: point.z + editor.brushSize - 1 });
    } else if (editor.mode === 'place') {
      onPlace(point);
    } else {
      onSelectShape(findRoomAtPoint(project, point)?.id);
    }

    setStartPoint(null);
    setHoverPoint(null);
  };

  const preview = startPoint && hoverPoint ? normalizeRect(startPoint, hoverPoint) : null;

  return (
    <div className="canvas-wrap">
      <div className="size-badge">{project.grid.width} x {project.grid.height}</div>
      <div className="zoom-badge">{project.metadata.zoom}%</div>
      <div className="snap-badge">Snap: {project.metadata.snap ? 'ON' : 'OFF'}</div>
      <div className={`selection-boundary footprint-${project.metadata.footprint}`} aria-hidden="true" />
      <div
        ref={mapRef}
        className="dungeon-map"
        style={{ transform: `scale(${project.metadata.zoom / 100})` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        role="application"
        aria-label="Dungeon grid canvas"
      >
        {project.layers.structure.visible &&
          [...project.rooms, ...project.corridors].map((shape) => (
            <button
              key={shape.id}
              className={[
                'dungeon-shape',
                shape.type,
                selectedShapeId === shape.id ? 'selected' : '',
              ].join(' ')}
              style={shapeStyle(project, shape)}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                if (editor.mode === 'draw' && editor.drawTool === 'erase') {
                  onDeleteShape(shape.id);
                  return;
                }
                onSelectShape(shape.id);
              }}
              title={shape.label}
            >
              <span>{shape.id}</span>
            </button>
          ))}

        {project.layers.doors.visible &&
          project.doors.map((door) => (
            <button
              key={door.id}
              className={[
                'door-marker',
                door.kind,
                doorOrientation(door),
                selectedDoorId === door.id ? 'selected' : '',
              ].join(' ')}
              style={{ left: `${(door.x / project.grid.width) * 100}%`, top: `${(door.z / project.grid.height) * 100}%` }}
              title={`${door.id}: ${door.wallSide ?? 'unknown wall'} ${door.fromRoom}${door.toRoom ? ` to ${door.toRoom}` : ' one-sided'}`}
              aria-label={`Select ${door.id}`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onSelectDoor(door.id);
              }}
            />
          ))}

        {project.placements.filter((placement) => isPlacementVisible(project, placement)).map((placement) => (
          <button
            key={placement.id}
            className={[
              'placement-marker',
              placement.category,
              selectedPlacementId === placement.id ? 'selected' : '',
              placement.roomId ? '' : 'warning',
            ].join(' ')}
            style={{ left: `${(placement.x / project.grid.width) * 100}%`, top: `${(placement.z / project.grid.height) * 100}%` }}
            title={placement.roomId ? placement.id : `${placement.id}: outside authored rooms`}
            aria-label={`Select ${placement.id}`}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onSelectPlacement(placement.id);
            }}
          >
            <MarkerIcon kind={placement.kind} />
          </button>
        ))}

        {preview && editor.mode === 'draw' && (
          <div
            className="draw-preview"
            style={{
              left: `${(preview.x / project.grid.width) * 100}%`,
              top: `${(preview.z / project.grid.height) * 100}%`,
              width: `${(preview.width / project.grid.width) * 100}%`,
              height: `${(preview.depth / project.grid.height) * 100}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}
