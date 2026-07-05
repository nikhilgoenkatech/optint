import { SignalPromptRequest, buildSignalPrompt } from './PersonaPromptBuilder';

const evidence: SignalPromptRequest['evidence'] = {
  occurrence_count: 3,
  alert_event_count: 3,
  operational_cost: 675,
  potential_savings: 236,
  affected_users: 0,
  affected_entity_count: 1,
  affected_services: 'CustomerFrontendREST',
  event_category: 'PERFORMANCE',
  scope_tier: 'scoped',
  trend: 'INCREASING',
  avg_duration: '9m',
  recommendation_type: 'ADD_TIME_WINDOW',
  rca_availability: 'Missing',
  root_cause_entity: 'absent',
};

export const promptContractFixtures: SignalPromptRequest[] = [
  { persona: 'executive', objective: 'cost_impact', evidence, kind: 'remediation', patternTitle: 'Response time degradation' },
  { persona: 'executive', objective: 'alert_optimization', evidence, kind: 'recommendation', patternTitle: 'Response time degradation' },
  { persona: 'sre', objective: 'cost_impact', evidence, kind: 'analysis', patternTitle: 'Response time degradation' },
  { persona: 'sre', objective: 'alert_optimization', evidence, kind: 'alert_tuning', patternTitle: 'Response time degradation' },
  { persona: 'developer', objective: 'cost_impact', evidence, kind: 'analysis', patternTitle: 'Response time degradation' },
  { persona: 'developer', objective: 'alert_optimization', evidence, kind: 'alert_tuning', patternTitle: 'Response time degradation' },
];

export const promptContractSamples = promptContractFixtures.map(buildSignalPrompt);
