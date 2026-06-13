import { Download, FileCode2, FileJson, ScrollText } from 'lucide-react';
import { downloadTextFile } from '../export/download';
import { exportCodexHandoff } from '../export/exportCodexHandoff';
import { exportDdplusJson } from '../export/exportDdplusJson';
import { exportDsbDefinition } from '../export/exportDsbDefinition';
import type { Project } from '../editor/types';

interface ExportPanelProps {
  project: Project;
}

const slug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'level_1';
const jsSlug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '') || 'level1';

export default function ExportPanel({ project }: ExportPanelProps) {
  return (
    <div className="panel export-panel">
      <div className="panel-title">Export</div>
      <div className="export-grid">
        <button onClick={() => downloadTextFile(`${slug(project.name)}.ddplus.json`, exportDdplusJson(project), 'application/json')}>
          <FileJson size={28} />
          <span>Export DDplus Project JSON</span>
        </button>
        <button onClick={() => downloadTextFile(`${jsSlug(project.name)}.definition.js`, exportDsbDefinition(project), 'text/javascript')}>
          <FileCode2 size={28} />
          <span>Export DSB Location Definition JS</span>
        </button>
        <button onClick={() => downloadTextFile(`${slug(project.name)}.handoff.md`, exportCodexHandoff(project), 'text/markdown')}>
          <ScrollText size={28} />
          <span>Export Codex Handoff Markdown</span>
        </button>
      </div>
      <div className="export-note">
        <Download size={16} />
        <span>Generated files are deterministic for the current project state except the editable project save timestamp.</span>
      </div>
    </div>
  );
}
