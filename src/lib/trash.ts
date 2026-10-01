export const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

export function trashExpiresAt(deletedAt: string): number {
  return Date.parse(deletedAt) + TRASH_RETENTION_MS;
}

export function trashTimeLabel(deletedAt: string, now = Date.now()): string {
  const remaining = trashExpiresAt(deletedAt) - now;
  if (!Number.isFinite(remaining) || remaining <= 0) return "已满七日，等待永久清理";
  if (remaining < 60 * 60 * 1000) return "不足一小时可恢复";
  if (remaining < 24 * 60 * 60 * 1000) return `剩余约 ${Math.ceil(remaining / (60 * 60 * 1000))} 小时可恢复`;
  return `剩余约 ${Math.ceil(remaining / (24 * 60 * 60 * 1000))} 天可恢复`;
}
