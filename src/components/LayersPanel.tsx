import { Eye, EyeOff, Lock, Unlock } from 'lucide-react';
import type { LayerKey, Project } from '../editor/types';

interface LayersPanelProps {
  project: Project;
  saved: boolean;
  onLayerToggle: (layer: LayerKey, field: 'visible' | 'locked') => void;
}

const layerLabels: { id: LayerKey; label: string }[] = [
  { id: 'structure', label: 'Structure' },
  { id: 'doors', label: 'Doors' },
  { id: 'lighting', label: 'Lighting' },
  { id: 'enemies', label: 'Enemies' },
  { id: 'objects', label: 'Objects' },
  { id: 'notes', label: 'Notes' },
];

export default function LayersPanel({ project, saved, onLayerToggle }: LayersPanelProps) {
  const counts: Record<LayerKey, number> = {
    structure: project.rooms.length + project.corridors.length,
    doors: project.doors.length,
    lighting: project.placements.filter((item) => item.category === 'light').length,
    enemies: project.placements.filter((item) => item.category === 'enemies').length,
    objects: project.placements.filter((item) => item.category === 'objects' || item.category === 'decor' || item.category === 'stairs').length,
    notes: project.placements.filter((item) => item.kind === 'note').length,
  };

  return (
    <div className="panel layers-panel">
      <div className="panel-title">Layers</div>
      <div className="layers-list">
        {layerLabels.map(({ id, label }) => (
          <div key={id} className="layer-row">
            <strong>{label}</strong>
            <span>{counts[id]}</span>
            <button onClick={() => onLayerToggle(id, 'visible')} aria-label={`${label} visibility`}>
              {project.layers[id].visible ? <Eye size={17} /> : <EyeOff size={17} />}
            </button>
            <button onClick={() => onLayerToggle(id, 'locked')} aria-label={`${label} lock`}>
              {project.layers[id].locked ? <Lock size={17} /> : <Unlock size={17} />}
            </button>
          </div>
        ))}
      </div>
      <div className="blueprint-summary">
        <span>Grid {project.grid.width} x {project.grid.height}</span>
        <span>Rooms {project.rooms.length}</span>
        <span>Corridors {project.corridors.length}</span>
        <span>Doors {project.doors.length}</span>
        <span>Torches {counts.lighting}</span>
        <span>Spawns {project.placements.filter((item) => item.kind === 'enemySpawn').length}</span>
        <span>Props {project.placements.filter((item) => item.category === 'objects').length}</span>
        <span>Notes {counts.notes}</span>
      </div>
      <div className={saved ? 'save-indicator saved' : 'save-indicator'}>{saved ? 'All Changes Saved' : 'Saving...'}</div>
    </div>
  );
}
