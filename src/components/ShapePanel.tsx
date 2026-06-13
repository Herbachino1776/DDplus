import { Box, Castle, Cross, Hexagon, RectangleHorizontal } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';
import type { Project } from '../editor/types';

interface ShapePanelProps {
  project: Project;
  onProjectChange: Dispatch<SetStateAction<Project>>;
}

const footprints = [
  { id: 'rectangle', label: 'Rectangle', Icon: RectangleHorizontal },
  { id: 'temple', label: 'Temple', Icon: Castle },
  { id: 'cross', label: 'Cross', Icon: Cross },
  { id: 'cave', label: 'Cave', Icon: Hexagon },
  { id: 'custom', label: 'Custom', Icon: Box },
] as const;

export default function ShapePanel({ project, onProjectChange }: ShapePanelProps) {
  return (
    <div className="panel shape-panel">
      <div className="panel-title">Shape Tool</div>
      <div className="field-grid">
        <label>
          <span>Project</span>
          <input
            value={project.name}
            onChange={(event) => onProjectChange((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <label>
          <span>Location ID</span>
          <input
            value={project.id}
            onChange={(event) => onProjectChange((current) => ({ ...current, id: event.target.value }))}
          />
        </label>
        <label>
          <span>Display Name</span>
          <input
            value={project.displayName}
            onChange={(event) => onProjectChange((current) => ({ ...current, displayName: event.target.value }))}
          />
        </label>
        <label>
          <span>Type</span>
          <select
            value={project.locationType}
            onChange={(event) => onProjectChange((current) => ({ ...current, locationType: event.target.value as Project['locationType'] }))}
          >
            <option value="dungeon">Dungeon</option>
            <option value="crypt">Crypt</option>
            <option value="temple">Temple</option>
            <option value="house">House</option>
          </select>
        </label>
        <label>
          <span>Width</span>
          <input
            type="number"
            min={12}
            max={80}
            value={project.grid.width}
            onChange={(event) =>
              onProjectChange((current) => ({ ...current, grid: { ...current.grid, width: Number(event.target.value) } }))
            }
          />
        </label>
        <label>
          <span>Height</span>
          <input
            type="number"
            min={12}
            max={80}
            value={project.grid.height}
            onChange={(event) =>
              onProjectChange((current) => ({ ...current, grid: { ...current.grid, height: Number(event.target.value) } }))
            }
          />
        </label>
        <label>
          <span>Cell Size</span>
          <input
            type="number"
            min={0.25}
            step={0.25}
            value={project.grid.cellSize}
            onChange={(event) =>
              onProjectChange((current) => ({ ...current, grid: { ...current.grid, cellSize: Number(event.target.value) } }))
            }
          />
        </label>
        <label>
          <span>Theme</span>
          <input value={project.metadata.themePreset} readOnly />
        </label>
      </div>

      <div className="asset-row compact">
        {footprints.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={project.metadata.footprint === id ? 'asset-card active' : 'asset-card'}
            onClick={() => onProjectChange((current) => ({ ...current, metadata: { ...current.metadata, footprint: id } }))}
          >
            <Icon size={24} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="toggle-row">
        <button
          className={project.metadata.snap ? 'pill-toggle active' : 'pill-toggle'}
          onClick={() => onProjectChange((current) => ({ ...current, metadata: { ...current.metadata, snap: !current.metadata.snap } }))}
        >
          Snap {project.metadata.snap ? 'ON' : 'OFF'}
        </button>
        <span>{project.metadata.zoom}% zoom</span>
      </div>
    </div>
  );
}
