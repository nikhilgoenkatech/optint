import { DynatraceProblem } from '../models';

export type DeveloperScopeType = 'all' | 'service' | 'team' | 'owner' | 'namespace' | 'application' | 'environment';

export interface DeveloperScopeOption {
  id: string;
  type: DeveloperScopeType;
  label: string;
  rawValue: string;
  count: number;
  source: 'tag' | 'entity' | 'derived';
}

function addScope(map: Map<string, DeveloperScopeOption>, type: DeveloperScopeType, rawValue: string, source: DeveloperScopeOption['source'], problemId: string) {
  const value = rawValue.trim();
  if (!value || /^[A-Z_]+$/.test(value) && ['SERVICE', 'HOST', 'APPLICATION', 'PROCESS_GROUP'].includes(value)) return;
  if (/^[a-f0-9-]{16,}$/i.test(value)) return;
  const id = `${type}|${value}`;
  const existing = map.get(id);
  if (existing) {
    existing.count += 1;
    return;
  }
  const labelPrefix: Record<DeveloperScopeType, string> = {
    all: 'All Developer Scope',
    service: 'Service',
    team: 'Team',
    owner: 'Owner',
    namespace: 'Namespace',
    application: 'Application',
    environment: 'Environment',
  };
  map.set(id, { id, type, label: `${labelPrefix[type]}: ${value}`, rawValue: value, count: 1, source });
  void problemId;
}

function parseTag(tag: string): { type: DeveloperScopeType; value: string } | null {
  const [rawKey, ...rest] = tag.split(/[:=]/);
  const key = rawKey.trim().toLowerCase();
  const value = rest.join(':').trim();
  if (!value) return null;
  if (key.includes('team')) return { type: 'team', value };
  if (key.includes('owner')) return { type: 'owner', value };
  if (key.includes('namespace')) return { type: 'namespace', value };
  if (key.includes('application') || key === 'app') return { type: 'application', value };
  if (key.includes('environment') || key === 'env' || key === 'stage') return { type: 'environment', value };
  if (key.includes('service')) return { type: 'service', value };
  return null;
}

export function buildDeveloperScopeTaxonomy(problems: DynatraceProblem[]): DeveloperScopeOption[] {
  const map = new Map<string, DeveloperScopeOption>();
  problems.forEach(problem => {
    problem.impactedEntities.forEach(entity => {
      if (entity.type === 'SERVICE' || entity.type === 'APPLICATION') {
        addScope(map, entity.type === 'APPLICATION' ? 'application' : 'service', entity.name, 'entity', problem.problemId);
      }
      entity.tags?.forEach(tag => {
        const parsed = parseTag(tag);
        if (parsed) addScope(map, parsed.type, parsed.value, 'tag', problem.problemId);
      });
    });
    if (problem.rootCauseEntity?.name) addScope(map, 'service', problem.rootCauseEntity.name, 'entity', problem.problemId);
    problem.tags.forEach(tag => {
      const parsed = parseTag(tag);
      if (parsed) addScope(map, parsed.type, parsed.value, 'tag', problem.problemId);
    });
  });

  const priority: DeveloperScopeType[] = ['service', 'team', 'owner', 'namespace', 'application', 'environment'];
  return [...map.values()]
    .filter(option => option.count > 0)
    .sort((a, b) => priority.indexOf(a.type) - priority.indexOf(b.type) || b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 80);
}

export function applyDeveloperScopeFilter(problems: DynatraceProblem[], selectedScope?: DeveloperScopeOption | null): DynatraceProblem[] {
  if (!selectedScope || selectedScope.type === 'all') return problems;
  const value = selectedScope.rawValue.toLowerCase();
  return problems.filter(problem => {
    const entityMatch = problem.impactedEntities.some(entity => entity.name.toLowerCase() === value || entity.entityId.toLowerCase() === value)
      || problem.rootCauseEntity?.name.toLowerCase() === value
      || problem.rootCauseEntity?.entityId.toLowerCase() === value;
    if (entityMatch) return true;
    const tagValues = [
      ...problem.tags,
      ...problem.impactedEntities.flatMap(entity => entity.tags || []),
    ].map(tag => tag.toLowerCase());
    return tagValues.some(tag => tag.includes(value));
  });
}
