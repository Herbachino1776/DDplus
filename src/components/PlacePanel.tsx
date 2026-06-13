import { Archive, DoorClosed, Flame, Footprints, Grid2X2, KeyRound, ScrollText, Skull, Sparkles, Trash2, UserRound } from 'lucide-react';
import type { Door, EditorState, PlaceCategory, Placement } from '../editor/types';

interface PlacePanelProps {
  editor: EditorState;
  selectedPlacement?: Placement;
  selectedDoor?: Door;
  onEditorChange: (patch: Partial<EditorState>) => void;
  onPlacementUpdate: (id: string, patch: Partial<Placement>) => void;
  onPlacementDelete: (id: string) => void;
  onDoorUpdate: (id: string, patch: Partial<Door>) => void;
  onDoorDelete: (id: string) => void;
}

const categories: { id: PlaceCategory; label: string; Icon: typeof Grid2X2 }[] = [
  { id: 'all', label: 'All', Icon: Grid2X2 },
  { id: 'doors', label: 'Doors', Icon: DoorClosed },
  { id: 'light', label: 'Light', Icon: Flame },
  { id: 'enemies', label: 'Enemies', Icon: Skull },
  { id: 'stairs', label: 'Stairs', Icon: Footprints },
  { id: 'objects', label: 'Objects', Icon: Archive },
  { id: 'decor', label: 'Decor', Icon: Sparkles },
];

const tools: { id: Door['kind'] | Placement['kind']; label: string; category: PlaceCategory; Icon: typeof DoorClosed }[] = [
  { id: 'door', label: 'Door', category: 'doors', Icon: DoorClosed },
  { id: 'doubleDoor', label: 'Double Door', category: 'doors', Icon: DoorClosed },
  { id: 'secretDoor', label: 'Secret Door', category: 'doors', Icon: DoorClosed },
  { id: 'lockedDoor', label: 'Locked Door', category: 'doors', Icon: KeyRound },
  { id: 'torch', label: 'Torch', category: 'light', Icon: Flame },
  { id: 'wallSconce', label: 'Wall Sconce', category: 'light', Icon: Flame },
  { id: 'brazier', label: 'Brazier', category: 'light', Icon: Flame },
  { id: 'chest', label: 'Chest', category: 'objects', Icon: Archive },
  { id: 'statue', label: 'Statue', category: 'decor', Icon: Sparkles },
  { id: 'enemySpawn', label: 'Enemy Spawn', category: 'enemies', Icon: Skull },
  { id: 'playerSpawn', label: 'Player Spawn', category: 'stairs', Icon: UserRound },
  { id: 'returnExit', label: 'Return Exit', category: 'stairs', Icon: Footprints },
  { id: 'note', label: 'Note Marker', category: 'decor', Icon: ScrollText },
];

const numericValue = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function PlacePanel({
  editor,
  selectedPlacement,
  selectedDoor,
  onEditorChange,
  onPlacementUpdate,
  onPlacementDelete,
  onDoorUpdate,
  onDoorDelete,
}: PlacePanelProps) {
  const visibleTools = tools.filter((tool) => editor.placeCategory === 'all' || tool.category === editor.placeCategory);

  return (
    <div className="panel place-panel">
      <div className="panel-title">Place Tool</div>
      <div className="category-row">
        {categories.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={editor.placeCategory === id ? 'category-button active' : 'category-button'}
            onClick={() => onEditorChange({ placeCategory: id })}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="asset-row">
        {visibleTools.map(({ id, label, Icon }) => (
          <button key={id} className={editor.placeTool === id ? 'asset-card active' : 'asset-card'} onClick={() => onEditorChange({ placeTool: id })}>
            <Icon size={30} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {selectedDoor && (
        <div className="inspector">
          <div className="inspector-title">
            <strong>{selectedDoor.id}</strong>
            <button className="danger-button" onClick={() => onDoorDelete(selectedDoor.id)} aria-label="Delete selected door">
              <Trash2 size={16} />
            </button>
          </div>
          <div className="field-grid mini">
            <label>
              <span>Kind</span>
              <input value={selectedDoor.kind} readOnly />
            </label>
            <label>
              <span>Wall</span>
              <input value={selectedDoor.wallSide ?? 'unresolved'} readOnly />
            </label>
            <label>
              <span>Orient</span>
              <input value={selectedDoor.orientation ?? 'unknown'} readOnly />
            </label>
            <label>
              <span>From</span>
              <input value={selectedDoor.fromRoom} readOnly />
            </label>
            <label>
              <span>To</span>
              <input value={selectedDoor.toRoom || 'none'} readOnly />
            </label>
            <label>
              <span>Width</span>
              <input type="number" min={0.5} step={0.5} value={selectedDoor.width} onChange={(event) => onDoorUpdate(selectedDoor.id, { width: numericValue(event.target.value, selectedDoor.width) })} />
            </label>
          </div>
          {!selectedDoor.toRoom && <div className="empty-state warning-text">Door is one-sided; export health will warn until a second room or connector is adjacent.</div>}
        </div>
      )}
      {selectedPlacement && (
        <div className="inspector">
          <div className="inspector-title">
            <strong>{selectedPlacement.id}</strong>
            <button className="danger-button" onClick={() => onPlacementDelete(selectedPlacement.id)} aria-label="Delete selected placement">
              <Trash2 size={16} />
            </button>
          </div>
          <div className="field-grid mini">
            <label>
              <span>Kind</span>
              <input value={selectedPlacement.kind} readOnly />
            </label>
            <label>
              <span>Room</span>
              <input value={selectedPlacement.roomId ?? 'outside'} readOnly />
            </label>
            <label>
              <span>Yaw</span>
              <input type="number" value={selectedPlacement.rotationY} onChange={(event) => onPlacementUpdate(selectedPlacement.id, { rotationY: numericValue(event.target.value, selectedPlacement.rotationY) })} />
            </label>
            <label>
              <span>X</span>
              <input type="number" value={selectedPlacement.x} onChange={(event) => onPlacementUpdate(selectedPlacement.id, { x: numericValue(event.target.value, selectedPlacement.x) })} />
            </label>
            <label>
              <span>Z</span>
              <input type="number" value={selectedPlacement.z} onChange={(event) => onPlacementUpdate(selectedPlacement.id, { z: numericValue(event.target.value, selectedPlacement.z) })} />
            </label>
            <label>
              <span>Y</span>
              <input type="number" step={0.1} value={selectedPlacement.y} onChange={(event) => onPlacementUpdate(selectedPlacement.id, { y: numericValue(event.target.value, selectedPlacement.y) })} />
            </label>
          </div>
          {!selectedPlacement.roomId && <div className="empty-state warning-text">Placement is outside authored rooms; export health will warn.</div>}
        </div>
      )}
    </div>
  );
}
