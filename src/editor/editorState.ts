import type { EditorState } from './types';

export const defaultEditorState: EditorState = {
  mode: 'place',
  leftTool: 'select',
  drawTool: 'room',
  brushSize: 1,
  placeCategory: 'all',
  placeTool: 'torch',
};
