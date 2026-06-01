// ============================================================
// PERSONA RESOLVER
// In production: reads Dynatrace IAM groups via usersClient
// ============================================================
// import { usersClient } from '@dynatrace-sdk/client-users';

export type PersonaType = 'executive' | 'developer' | 'sre';

// Dynatrace IAM group → persona mapping
// Configure these to match your tenant's group naming conventions
const GROUP_PERSONA_MAP: Record<string, PersonaType> = {
  'dt-group-executives':        'executive',
  'dt-group-vp':                'executive',
  'dt-group-cto':               'executive',
  'dt-group-developers':        'developer',
  'dt-group-engineers':         'developer',
  'dt-group-frontend':          'developer',
  'dt-group-backend':           'developer',
  'dt-group-sre':               'sre',
  'dt-group-platform':          'sre',
  'dt-group-devops':            'sre',
  'dt-group-admin':             'sre',
};

export async function resolvePersona(): Promise<PersonaType> {
  // Production implementation:
  // const me = await usersClient().getMe();
  // const groups = me.groups ?? [];
  // for (const group of groups) {
  //   const persona = GROUP_PERSONA_MAP[group.name];
  //   if (persona) return persona;
  // }
  // return 'developer'; // safe default

  // Demo: return from localStorage or default
  const stored = localStorage.getItem('opint-persona') as PersonaType;
  return stored ?? 'executive';
}

export function setPersonaOverride(persona: PersonaType) {
  localStorage.setItem('opint-persona', persona);
}
