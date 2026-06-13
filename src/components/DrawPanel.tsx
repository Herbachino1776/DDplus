import { Eraser, Grid2X2, PenLine, Trash2, Waves } from 'lucide-react';
import type { DrawTool, EditorState, Room } from '../editor/types';

interface DrawPanelProps {
  editor: EditorState;
  selectedShape?: Room;
  onEditorChange: (patch: Partial<EditorState>) => void;
  onShapeUpdate: (id: string, patch: Partial<Room>) => void;
  onShapeDelete: (id: string) => void;
}

const drawTools: { id: DrawTool; label: string; Icon: typeof Grid2X2 }[] = [
  { id: 'room', label: 'Room Brush', Icon: Grid2X2 },
  { id: 'corridor', label: 'Corridor', Icon: PenLine },
  { id: 'erase', label: 'Erase', Icon: Eraser },
  { id: 'fill', label: 'Fill', Icon: Waves },
];

const numericValue = (value: string, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export default function DrawPanel({ editor, selectedShape, onEditorChange, onShapeUpdate, onShapeDelete }: DrawPanelProps) {
  return (
    <div className="panel draw-panel">
      <div className="panel-title">Draw Tool</div>
      <div className="asset-row compact">
        {drawTools.map(({ id, label, Icon }) => (
          <button key={id} className={editor.drawTool === id ? 'asset-card active' : 'asset-card'} onClick={() => onEditorChange({ drawTool: id })}>
            <Icon size={24} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="brush-row">
        <span>Brush</span>
        {[1, 2, 3, 4, 5].map((size) => (
          <button key={size} className={editor.brushSize === size ? 'chip active' : 'chip'} onClick={() => onEditorChange({ brushSize: size })}>
            {size}
          </button>
        ))}
      </div>
      {selectedShape ? (
        <div className="inspector">
          <div className="inspector-title">
            <strong>{selectedShape.id}</strong>
            <button className="danger-button" onClick={() => onShapeDelete(selectedShape.id)} aria-label="Delete selected shape">
              <Trash2 size={16} />
            </button>
          </div>
          <div className="field-grid mini">
            <label>
              <span>Label</span>
              <input value={selectedShape.label} onChange={(event) => onShapeUpdate(selectedShape.id, { label: event.target.value })} />
            </label>
            <label>
              <span>Type</span>
              <select value={selectedShape.type} onChange={(event) => onShapeUpdate(selectedShape.id, { type: event.target.value as Room['type'] })}>
                <option value="room">Room</option>
                <option value="corridor">Corridor</option>
              </select>
            </label>
            <label>
              <span>X</span>
              <input type="number" value={selectedShape.x} onChange={(event) => onShapeUpdate(selectedShape.id, { x: numericValue(event.target.value, selectedShape.x) })} />
            </label>
            <label>
              <span>Z</span>
              <input type="number" value={selectedShape.z} onChange={(event) => onShapeUpdate(selectedShape.id, { z: numericValue(event.target.value, selectedShape.z) })} />
            </label>
            <label>
              <span>Width</span>
              <input type="number" min={1} value={selectedShape.width} onChange={(event) => onShapeUpdate(selectedShape.id, { width: numericValue(event.target.value, selectedShape.width) })} />
            </label>
            <label>
              <span>Depth</span>
              <input type="number" min={1} value={selectedShape.depth} onChange={(event) => onShapeUpdate(selectedShape.id, { depth: numericValue(event.target.value, selectedShape.depth) })} />
            </label>
          </div>
        </div>
      ) : (
        <div className="empty-state">Tap a room to edit it, or drag on the grid to author a new rectangle.</div>
      )}
    </div>
  );
}
