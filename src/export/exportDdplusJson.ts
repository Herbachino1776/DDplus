import type { Project } from '../editor/types';

export const exportDdplusJson = (project: Project) =>
  JSON.stringify(
    {
      ...project,
      metadata: {
        ...project.metadata,
        savedAt: new Date().toISOString(),
      },
    },
    null,
    2,
  );
