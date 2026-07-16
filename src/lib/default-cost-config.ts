import { ExtendedCostConfig } from '../models';

export const DEFAULT_EXTENDED_COST_CONFIG: ExtendedCostConfig = {
  affectedUserCostPerHr:  4.8,
  fallbackEntityCost:     0,
  engineeringHourlyRate:  150,
  defaultResponders:      3,
  recoveryRatePct:        35,
  severityMultipliers: {
    AVAILABILITY:        1.0,
    ERROR:               0.7,
    PERFORMANCE:         0.3,
    RESOURCE_CONTENTION: 0.15,
    CUSTOM_ALERT:        0.05,
  },
};

