# OpInt — Operational Intelligence

Pattern intelligence, remediation analytics, and team progress tracking for Dynatrace.

---

## Quick Start

### Prerequisites
- Node.js v18+
- Dynatrace tenant with AppEngine enabled
- `npm install -g @dynatrace-sdk/app-toolkit`

### Setup
```bash
# 1. Install dependencies
npm install

# 2. Update tenant URL in app.config.json
#    Replace: "https://your-tenant.apps.dynatrace.com"

# 3. Run locally against your tenant
npm run start

# 4. Deploy to tenant
npm run deploy
```

### Toggle mock ↔ live data
In `src/hooks/index.ts`, change line 12:
```typescript
// Mock data (default — works offline):
import { MockDataService as DataService } from '../services/mockDataService';

// Live data (requires AppEngine runtime):
import { DynatraceService as DataService } from '../services/dynatraceService';
```

---

## File Structure

```
src/
├── models/index.ts                   All TypeScript interfaces
├── queries/dqlQueries.ts             DQL query templates + scoring utilities
├── services/
│   ├── dynatraceService.ts           Real Dynatrace SDK calls (production)
│   └── mockDataService.ts            Mock data (local development)
├── hooks/index.ts                    React hooks — useProblems, useFilters, etc.
├── analytics/index.ts                Pattern detection, MTTR, recommendations
├── cost/CostModel.ts                 Revenue + engineering + recurring waste
├── persona/
│   ├── PersonaResolver.ts            IAM group → persona mapping
│   ├── PersonaFilterEngine.ts        Per-persona data filtering + column config
│   └── PersonaPromptBuilder.ts       Davis CoPilot prompt templates per persona
├── ai/
│   └── AISummarizationService.ts     Davis CoPilot adapter + mock fallback
└── index.html                        Standalone demo (no build needed)
```

---

## Personas

| Persona | IAM Group | Sees |
|---|---|---|
| Executive 👔 | dt-group-executives | Business impact, cost, strategic view |
| Developer 💻 | dt-group-developers | Service errors, root cause, traces |
| SRE 🔧 | dt-group-sre | Everything — all signals, noise, SLO |

Update `src/persona/PersonaResolver.ts` → `GROUP_PERSONA_MAP` to match your tenant's group names.

---

## Key Integrations

- **Davis CoPilot** — Settings → Davis CoPilot → Enable on tenant
- **ServiceNow** — Settings → Integrations → ServiceNow (ticket refs auto-appear on problems)
- **Weekly snapshots** — write via Dynatrace Workflow every Monday, stored as Business Events

See `OpInt-Dynatrace-Setup-Guide.docx` for complete step-by-step instructions.
