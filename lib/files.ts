export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_DAY_FILE_BYTES = 50 * 1024 * 1024;
export function fileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.ceil(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
