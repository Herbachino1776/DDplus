import { Menu, MoreVertical, Redo2, Undo2 } from 'lucide-react';
import { useState } from 'react';
import type { Project } from '../editor/types';

interface TopBarProps {
  project: Project;
  onAction: (action: 'smoke' | 'mini' | 'clear' | 'export') => void;
}

export default function TopBar({ project, onAction }: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const runAction = (action: 'smoke' | 'mini' | 'clear' | 'export') => {
    onAction(action);
    setMenuOpen(false);
  };

  return (
    <header className="top-bar">
      <button className="icon-button" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
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
        <button className="icon-button disabled" aria-label="Undo coming soon" aria-disabled="true" title="Undo coming soon.">
          <Undo2 size={24} />
        </button>
        <button className="icon-button disabled" aria-label="Redo coming soon" aria-disabled="true" title="Redo coming soon.">
          <Redo2 size={24} />
        </button>
      </div>
      <div className="level-readout">
        <strong>{project.name}</strong>
        <span>
          {project.grid.width} x {project.grid.height}
        </span>
      </div>
      <button className="icon-button" aria-label="More actions" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
        <MoreVertical size={24} />
      </button>
      {menuOpen && (
        <div className="top-menu">
          <button onClick={() => runAction('smoke')}>Reset to Smoke Test Chamber</button>
          <button onClick={() => runAction('mini')}>Load Mini Temple sample</button>
          <button onClick={() => runAction('clear')}>Clear Project</button>
          <button onClick={() => runAction('export')}>Export</button>
        </div>
      )}
    </header>
  );
}
