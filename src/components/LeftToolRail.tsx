import { Crosshair, Hand, MousePointer2, Scan, ZoomIn, ZoomOut } from 'lucide-react';
import type { EditorState, LeftTool } from '../editor/types';

const tools: { id: LeftTool; label: string; Icon: typeof MousePointer2 }[] = [
  { id: 'select', label: 'Select', Icon: MousePointer2 },
  { id: 'marquee', label: 'Marquee', Icon: Scan },
  { id: 'pan', label: 'Pan', Icon: Hand },
  { id: 'zoomIn', label: 'Zoom in', Icon: ZoomIn },
  { id: 'zoomOut', label: 'Zoom out', Icon: ZoomOut },
  { id: 'fit', label: 'Fit', Icon: Crosshair },
];

interface LeftToolRailProps {
  editor: EditorState;
  onChange: (patch: Partial<EditorState>) => void;
}

export default function LeftToolRail({ editor, onChange }: LeftToolRailProps) {
  return (
    <aside className="left-rail" aria-label="Canvas tools">
      {tools.map(({ id, label, Icon }, index) => (
        <button
          key={id}
          className={editor.leftTool === id ? 'rail-button active' : 'rail-button'}
          onClick={() => onChange({ leftTool: id })}
          title={label}
          aria-label={label}
        >
          {index === 3 && <span className="rail-divider" />}
          <Icon size={25} />
        </button>
      ))}
    </aside>
  );
}
