import { Menu, MoreVertical, Redo2, Undo2 } from 'lucide-react';
import type { Project } from '../editor/types';

interface TopBarProps {
  project: Project;
}

export default function TopBar({ project }: TopBarProps) {
  return (
    <header className="top-bar">
      <button className="icon-button" aria-label="Menu">
        <Menu size={26} />
      </button>
      <div className="brand-mark" aria-hidden="true">
        <span>DD</span>
      </div>
      <div className="brand-copy">
        <strong>Dungeon Drawer</strong>
        <span>Dread Stone Black</span>
      </div>
      <div className="top-actions">
        <button className="icon-button" aria-label="Undo">
          <Undo2 size={24} />
        </button>
        <button className="icon-button" aria-label="Redo">
          <Redo2 size={24} />
        </button>
      </div>
      <div className="level-readout">
        <strong>{project.name}</strong>
        <span>
          {project.grid.width} x {project.grid.height}
        </span>
      </div>
      <button className="icon-button" aria-label="More">
        <MoreVertical size={24} />
      </button>
    </header>
  );
}
