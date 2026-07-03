import { Entity } from '../models';

const GENERIC_ENTITY_LABELS = new Set(['SERVICE', 'HOST', 'APPLICATION', 'PROCESS_GROUP', 'CUSTOM_DEVICE', 'SYNTHETIC_TEST']);

export function friendlyEntityFallback(type?: string): string {
  const normalized = String(type || '').toUpperCase();
  if (normalized.includes('HOST')) return 'Unknown Host';
  if (normalized.includes('APPLICATION')) return 'Unknown Application';
  if (normalized.includes('PROCESS')) return 'Unknown Process Group';
  if (normalized.includes('SYNTHETIC')) return 'Unknown Synthetic Monitor';
  return 'Unknown Service';
}

export function normalizeEntityName(value: unknown, type?: string, fallback?: string): string {
  const raw = String(value || '').trim();
  if (!raw || GENERIC_ENTITY_LABELS.has(raw.toUpperCase())) return fallback || friendlyEntityFallback(type);
  if (/^[A-Z_]+-[A-Za-z0-9]/.test(raw)) return fallback || friendlyEntityFallback(type);
  return raw;
}

export function normalizeEntity(entityId: string, name: unknown, type: Entity['type']): Entity {
  return {
    entityId,
    name: normalizeEntityName(name, type),
    type,
  };
}

export function entityTypeFromId(entityId: string): Entity['type'] {
  const prefix = String(entityId || '').split('-')[0]?.toUpperCase();
  if (prefix === 'HOST') return 'HOST';
  if (prefix === 'APPLICATION') return 'APPLICATION';
  if (prefix === 'PROCESS_GROUP') return 'PROCESS_GROUP';
  if (prefix === 'CUSTOM_DEVICE') return 'CUSTOM_DEVICE';
  if (prefix === 'SYNTHETIC_TEST' || prefix === 'SYNTHETIC') return 'SYNTHETIC_TEST';
  if (prefix === 'KUBERNETES_CLUSTER') return 'KUBERNETES_CLUSTER';
  return 'SERVICE';
}
