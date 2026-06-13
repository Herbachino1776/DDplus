import { Crosshair, Hand, MousePointer2, Scan, ZoomIn, ZoomOut } from 'lucide-react';
import type { EditorState, LeftTool } from '../editor/types';

const tools: { id: LeftTool; label: string; Icon: typeof MousePointer2; disabled?: boolean; status?: string }[] = [
  { id: 'select', label: 'Select', Icon: MousePointer2 },
  { id: 'marquee', label: 'Marquee', Icon: Scan, disabled: true, status: 'Marquee selection coming soon.' },
  { id: 'pan', label: 'Pan', Icon: Hand, disabled: true, status: 'Pan coming soon.' },
  { id: 'zoomIn', label: 'Zoom in', Icon: ZoomIn },
  { id: 'zoomOut', label: 'Zoom out', Icon: ZoomOut },
  { id: 'fit', label: 'Fit', Icon: Crosshair },
];

interface LeftToolRailProps {
  editor: EditorState;
  onTool: (tool: LeftTool) => void;
}

export default function LeftToolRail({ editor, onTool }: LeftToolRailProps) {
  return (
    <aside className="left-rail" aria-label="Canvas tools">
      {tools.map(({ id, label, Icon, disabled, status }, index) => (
        <button
          key={id}
          className={[editor.leftTool === id && !disabled ? 'rail-button active' : 'rail-button', disabled ? 'disabled' : ''].join(' ')}
          onClick={() => {
            if (!disabled) onTool(id);
          }}
          title={status ?? label}
          aria-label={label}
          aria-disabled={disabled}
        >
          {index === 3 && <span className="rail-divider" />}
          <Icon size={25} />
        </button>
      ))}
    </aside>
  );
}
