/**
 * types/ide.ts
 * Shared type definitions for the IDE editor components.
 */

export interface OpenTab {
  path: string;
  name: string;
  content: string;
  isDirty: boolean;
  apiFileId?: string;
  dbFileId?: string;
}
