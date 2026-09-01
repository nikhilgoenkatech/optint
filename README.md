# Calibrate

Recurring problem pattern intelligence for Dynatrace — built on AppEngine and Grail.

Calibrate identifies which operational problems keep coming back, quantifies their cost, and tells the right person what to do next. It surfaces patterns across three personas (Executive, SRE, Developer) and two objectives (Cost Impact, Alert Optimization), replacing alert-volume dashboards with a prioritised, signal-backed action list.

## What It Does

- Detects recurring Davis problem patterns from Grail problem history
- Scores each pattern for cost impact and alert optimization potential
- Places patterns in an Act-First Map (Act Now / Plan & Fund / Quick Win / Deprioritize)
- Generates investigation context and remediation guidance via Davis Copilot
- Exports findings to PDF per persona

## Quick Start

### Prerequisites
- Node.js v18+
- Dynatrace tenant with AppEngine and Grail enabled
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

## Personas

| Persona | View | Focus |
|---|---|---|
| Executive | Act-First Map | Business cost, open risk, recoverable spend |
| SRE | Reliability Risk Matrix | Recurring failures, MTTR, blast radius |
| Developer | Developer Heat Map | Service-level patterns, root cause, traces |

Update `src/persona/PersonaResolver.ts` → `GROUP_PERSONA_MAP` to match your tenant's IAM group names.

## Objectives

| Objective | What it ranks | Typical output |
|---|---|---|
| Cost Impact | Patterns driving operational cost, customer impact, engineering toil | Act Now list for the next sprint |
| Alert Optimization | Repeated alerts that are candidates for tuning, routing, or suppression | Noise reduction backlog |

## Quadrant Map

The Act-First Map places each pattern at the intersection of cost impact (vertical) and actionability (horizontal):

| | Low actionability | High actionability |
|---|---|---|
| **High impact** | Plan & Fund | Act Now |
| **Low impact** | Deprioritize | Quick Win |

Actionability is driven by RCA availability, evidence quality, and ownership clarity — not recurrence alone. A pattern with broad blast radius but no root cause sits at Plan & Fund until investigation establishes a clear fix target.

For a visual walkthrough of how patterns move between quadrants as signals change, see [`docs/pattern-placement-guide.md`](docs/pattern-placement-guide.md) and the animated demo at [`docs/media/Pattern-example.gif`](docs/media/Pattern-example.gif).

## File Structure

```text
ui/
├── index.html          AppEngine HTML shell and styles
├── main.tsx            AppEngine bootstrap
├── main.css            App-level CSS
└── app.js              Main UI, DQL loader, personas, Copilot, remediation

src/
├── models/index.ts                     Shared TypeScript interfaces
├── queries/dqlQueries.ts               DQL query templates and scoring utilities
├── services/
│   ├── dynatraceService.ts             Live-service adapter
│   └── mockDataService.ts              Mock-service adapter (demo mode)
├── analytics/index.ts                  Pattern detection, MTTR, recommendations
├── cost/CostModel.ts                   Revenue, engineering, and recurring waste model
├── persona/
│   ├── PersonaResolver.ts              IAM group → persona mapping
│   ├── PersonaFilterEngine.ts          Per-persona filtering and column config
│   └── PersonaPromptBuilder.ts         Davis Copilot prompt templates per persona
└── ai/
    └── AISummarizationService.ts       Davis Copilot adapter and mock fallback

docs/
├── pattern-placement-guide.md          How patterns are placed and why they move
├── pattern-priority-readme.md          Example dataset and priority explanation
└── media/
    ├── Pattern-example.gif             Animated pattern movement demo (embed anywhere)
    └── Pattern-example.mp4             Video version for screen share or decks
```

