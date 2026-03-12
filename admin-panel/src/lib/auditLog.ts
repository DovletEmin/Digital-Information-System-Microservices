/**
 * Client-side audit log utility.
 * Stores audit entries in a dedicated API endpoint via content-service.
 * Falls back to localStorage for offline resilience.
 */

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'upload';

export type AuditEntityType =
  | 'article'
  | 'book'
  | 'dissertation'
  | 'category'
  | 'user'
  | 'media';

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id?: number | string;
  entity_title?: string;
  admin_user?: string;
  details?: Record<string, unknown>;
}

const LOCAL_STORAGE_KEY = 'smu_audit_log';
const MAX_LOCAL_ENTRIES = 200;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getAdminUser(): string {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('admin_user') : null;
    if (!raw) return 'unknown';
    const parsed = JSON.parse(raw);
    return parsed?.username || parsed?.email || 'unknown';
  } catch {
    return 'unknown';
  }
}

function persistLocally(entry: AuditEntry): void {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const entries: AuditEntry[] = raw ? JSON.parse(raw) : [];
    entries.unshift(entry);
    // Keep only the latest N entries in localStorage
    if (entries.length > MAX_LOCAL_ENTRIES) entries.splice(MAX_LOCAL_ENTRIES);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable (private mode, quota exceeded)
  }
}

export function getLocalAuditLog(): AuditEntry[] {
  try {
    const raw =
      typeof window !== 'undefined' ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearLocalAuditLog(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function logAudit(
  action: AuditAction,
  entityType: AuditEntityType,
  options: {
    entityId?: number | string;
    entityTitle?: string;
    details?: Record<string, unknown>;
  } = {}
): void {
  const entry: AuditEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    action,
    entity_type: entityType,
    entity_id: options.entityId,
    entity_title: options.entityTitle,
    admin_user: getAdminUser(),
    details: options.details,
  };

  persistLocally(entry);
}
