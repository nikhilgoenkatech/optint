# OpInt - Operational Intelligence

Pattern intelligence, remediation analytics, and team progress tracking for Dynatrace.

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

## Runtime Entry Points

The deployed AppEngine app is built from `ui/index.html` and bootstrapped by `ui/main.tsx`, which imports `ui/app.js`. The current UI is a vanilla TypeScript/JavaScript app; there is no React runtime layer.

Live problem data is loaded directly in `ui/app.js` via `queryExecutionClient.queryExecute`. The in-memory mock data in that same file is used as the immediate demo/fallback dataset while live DQL results load.

## File Structure

```text
ui/
|-- index.html                       AppEngine HTML shell and styles
|-- main.tsx                         AppEngine bootstrap import
|-- main.css                         App-level CSS import
`-- app.js                           Main UI, DQL loader, personas, AI, remediation

src/
|-- models/index.ts                  Shared TypeScript interfaces
|-- queries/dqlQueries.ts            DQL query templates and scoring utilities
|-- services/
|   |-- dynatraceService.ts          Typed live-service adapter scaffold
|   `-- mockDataService.ts           Typed mock-service adapter
|-- analytics/index.ts               Pattern detection, MTTR, recommendations
|-- cost/CostModel.ts                Revenue, engineering, and recurring waste
|-- persona/
|   |-- PersonaResolver.ts           IAM group to persona mapping
|   |-- PersonaFilterEngine.ts       Per-persona data filtering and columns
|   `-- PersonaPromptBuilder.ts      Davis CoPilot prompt templates per persona
`-- ai/
    `-- AISummarizationService.ts    Davis CoPilot adapter and mock fallback
```

## Personas

| Persona | IAM Group | Sees |
|---|---|---|
| Executive | dt-group-executives | Business impact, cost, strategic view |
| Developer | dt-group-developers | Service errors, root cause, traces |
| SRE | dt-group-sre | Everything: all signals, noise, SLO |

Update `src/persona/PersonaResolver.ts` -> `GROUP_PERSONA_MAP` to match your tenant's group names.

## Key Integrations

- **Davis CoPilot**: enable on the tenant, then wire the adapter or use the existing UI call path.
- **ServiceNow**: enable the Dynatrace integration so ticket refs appear on problems.
- **Weekly snapshots**: write via Dynatrace Workflow every Monday and store as Business Events.
