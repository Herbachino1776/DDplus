import { BoxSelect, Download, Layers3, PenLine, Shield } from 'lucide-react';
import type { EditorMode } from '../editor/types';

const modes: { id: EditorMode; label: string; Icon: typeof BoxSelect }[] = [
  { id: 'shape', label: 'Shape', Icon: BoxSelect },
  { id: 'draw', label: 'Draw', Icon: PenLine },
  { id: 'place', label: 'Place', Icon: Shield },
  { id: 'layers', label: 'Layers', Icon: Layers3 },
  { id: 'export', label: 'Export', Icon: Download },
];

interface ModeBarProps {
  mode: EditorMode;
  onChange: (mode: EditorMode) => void;
}

export default function ModeBar({ mode, onChange }: ModeBarProps) {
  return (
    <nav className="mode-bar" aria-label="Editor modes">
      {modes.map(({ id, label, Icon }) => (
        <button key={id} className={mode === id ? 'mode-button active' : 'mode-button'} onClick={() => onChange(id)}>
          <Icon size={26} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
