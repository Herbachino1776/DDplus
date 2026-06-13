import { Archive, DoorClosed, Flame, Footprints, Grid2X2, KeyRound, ScrollText, Skull, Sparkles, UserRound } from 'lucide-react';
import type { Door, EditorState, PlaceCategory, Placement } from '../editor/types';

interface PlacePanelProps {
  editor: EditorState;
  onEditorChange: (patch: Partial<EditorState>) => void;
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

export default function PlacePanel({ editor, onEditorChange }: PlacePanelProps) {
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
    </div>
  );
}
