import type { Dispatch, SetStateAction } from 'react';
import DrawPanel from './DrawPanel';
import ExportPanel from './ExportPanel';
import LayersPanel from './LayersPanel';
import PlacePanel from './PlacePanel';
import ShapePanel from './ShapePanel';
import type { EditorState, LayerKey, Project, Room } from '../editor/types';

interface BottomDrawerProps {
  project: Project;
  editor: EditorState;
  selectedShape?: Room;
  saved: boolean;
  onEditorChange: (patch: Partial<EditorState>) => void;
  onProjectChange: Dispatch<SetStateAction<Project>>;
  onShapeUpdate: (id: string, patch: Partial<Room>) => void;
  onShapeDelete: (id: string) => void;
  onLayerToggle: (layer: LayerKey, field: 'visible' | 'locked') => void;
}

export default function BottomDrawer({
  project,
  editor,
  selectedShape,
  saved,
  onEditorChange,
  onProjectChange,
  onShapeUpdate,
  onShapeDelete,
  onLayerToggle,
}: BottomDrawerProps) {
  return (
    <section className="bottom-drawer">
      <div className="drawer-notch" />
      {editor.mode === 'shape' && <ShapePanel project={project} onProjectChange={onProjectChange} />}
      {editor.mode === 'draw' && (
        <DrawPanel
          editor={editor}
          selectedShape={selectedShape}
          onEditorChange={onEditorChange}
          onShapeUpdate={onShapeUpdate}
          onShapeDelete={onShapeDelete}
        />
      )}
      {editor.mode === 'place' && <PlacePanel editor={editor} onEditorChange={onEditorChange} />}
      {editor.mode === 'layers' && <LayersPanel project={project} saved={saved} onLayerToggle={onLayerToggle} />}
      {editor.mode === 'export' && <ExportPanel project={project} />}
    </section>
  );
}
