# Migration Progress — Calibrate Strato App

> Live app: `https://ykd61701.sprint.apps.dynatracelabs.com/ui/apps/my.dynatrace.opint.strato`  
> Production app: `https://ykd61701.sprint.apps.dynatracelabs.com/ui/apps/my.dynatrace.opint`  
> Branch: `strato-migration` in `strato-optint/optint`

---

## Phase Status

| Phase | Owner | Status | Notes |
|-------|-------|--------|-------|
| 0 — Contracts & fixtures | Codex | ✅ Done | `src/types/views.ts`, `src/fixtures/`, `src/lib/pattern-adapter.ts`, `src/lib/persona-view-models.ts` |
| 1 — Scaffold | Claude | ✅ Done | React 18, Strato deps, `src/index.tsx`, `ui/main.tsx` wired |
| 2 — App shell & navigation | Claude | ✅ Done | `AppHeader`, `Tabs` (3 persona tabs), view shells with fixture data |
| 3 — Token foundation | Claude | 🔜 Next | CSS token mapping only — see details below |
| 4 — Atomic components | Claude | ⬜ Queued | After Phase 3 |
| 5 — Pattern table | Claude + Codex | ⬜ Queued | Strato DataTable, Codex wires data |
| 6 — KPI cards | Claude + Codex | ⬜ Queued | |
| 7 — Visualisations | Claude + Codex | ⬜ Queued | Custom SVG wrappers |
| 8 — Panels & popovers | Claude + Codex | ⬜ Queued | Persistent right panel for Assist |
| 9 — Persona layouts | Claude + Codex | ⬜ Queued | Full Executive / SRE / Developer views |

---

## Lessons Learnt — Strato Bootstrap Requirements

These are **not in the Strato docs** but are required for the app to run:

1. `ui/main.tsx` is the Vite bundle entry — dt-app bundles through this file. Import `src/index` from here.
2. `ui/strato-index.html` must provide `<div id="root">` — dt-app does not inject a mount point.
3. **`IntlProvider`** from `react-intl` must wrap the entire tree — Strato components throw without it.
4. No `ThemeProvider` needed — Strato handles theming via CSS tokens automatically.
5. `dt-app --config` flag does not exist — use separate directories instead.

Correct bootstrap (`src/index.tsx`):
```tsx
import { IntlProvider } from 'react-intl';
// ...
<IntlProvider locale="en" defaultLocale="en">
  <App />
</IntlProvider>
```

---

## Phase 3 — Token Foundation (Claude next)

**Scope:** Wire Strato CSS tokens. Do NOT migrate all CSS from `ui/index.html` — only lay the token foundation for new components.

Create `src/styles/tokens.css`:

```css
/* Map legacy custom vars to Strato tokens for new components */
:root {
  --bg-1: var(--dt-color-background-base);
  --bg-2: var(--dt-color-background-container);
  --text-primary: var(--dt-color-text-primary);
  --text-muted: var(--dt-color-text-secondary);
  --accent: var(--dt-color-interactive-default);
  --border: var(--dt-color-border-neutral);
  --success: var(--dt-color-status-success);
  --warning: var(--dt-color-status-warning);
  --danger: var(--dt-color-status-critical);
}
```

Import in `src/index.tsx`. All new components use Strato tokens directly — no custom vars.

**Codex action for Phase 3:** None — pure CSS, no data wiring needed.

---

## Phase 4 — Atomic Components (Claude next, after Phase 3)

Replace custom-built primitives with Strato equivalents. No logic changes.

**Confirmed Strato API (verified from node_modules):**

| Component | Import path | Key props |
|-----------|-------------|-----------|
| `Button` | `@dynatrace/strato-components/buttons` | `variant="accent"\|"default"` |
| `Badge` | `@dynatrace/strato-components/content` | `color`, `emphasis` |
| `Tooltip` | `@dynatrace/strato-components/content` | `text` |
| `ProgressCircle` | `@dynatrace/strato-components/content` | `size` |
| `SegmentedControl` | `@dynatrace/strato-components/forms` | `value`, `onChange` |
| `Toggle` | `@dynatrace/strato-components/forms` | `checked`, `onChange` |
| `IconButton` | `@dynatrace/strato-components/buttons` | `icon` |

**Before starting Phase 4:** verify each import path compiles — re-run `npx tsc --noEmit` after adding each component.

**Codex action for Phase 4:** Review Badge color/variant mapping against `DisplayLevel` and `TrendDirection` types in `src/types/views.ts` — confirm they match before Claude implements.

---

## Phase 5 — Pattern Table (joint, after Phase 4)

**Claude builds:** Strato `DataTable` shell consuming `PatternRow[]` from `src/fixtures/patterns.sample.ts`.  
**Codex wires:** real `PatternRow[]` from `pattern-adapter.ts` output.

Strato DataTable import path (to verify): `@dynatrace/strato-components/tables`

Column config Claude will publish:
```ts
// src/components/table/patternColumns.tsx
// Codex reviews before Claude implements
export const patternColumns = [
  { id: 'name',      header: 'Pattern',        accessor: 'name' },
  { id: 'cost',      header: 'Cost',           accessor: 'costFormatted' },
  { id: 'recur',     header: 'Recurrences',    accessor: 'recurrenceCount' },
  { id: 'blast',     header: 'Blast radius',   accessor: 'blastRadius' },
  { id: 'severity',  header: 'Severity',       accessor: 'severity',  cell: SeverityBadge },
  { id: 'trend',     header: 'Trend',          accessor: 'trend',     cell: TrendIndicator },
  { id: 'evidence',  header: 'Evidence',       accessor: 'evidenceQuality', cell: EvidenceBadge },
  { id: 'actions',   header: '',               cell: ActionMenu },
];
```

---

## Strato API Reference (verified against 3.8.0)

```ts
// Navigation
import { AppHeader } from '@dynatrace/strato-components/layouts';
import { Tabs, Tab } from '@dynatrace/strato-components/navigation';

// Tabs controlled API:
<Tabs selectedIndex={n} onChange={(i) => setN(i)}>
  <Tab title="Label">...panel content...</Tab>
</Tabs>

// AppHeader subcomponents: .Logo, .Navigation, .NavigationItem, .ActionItems,
//                           .ActionItemGroup, .ActionButton, .AppIcon, .Menus
// NOTE: .AppName does NOT exist — use .Logo for app name display
```

---

## Current File Structure (`src/`)

```
src/
  index.tsx                    ← React root, IntlProvider, createRoot
  components/
    App.tsx                    ← AppHeader + Tabs, persona state
    views/
      ExecutiveView.tsx        ← shell, fixture data, viewModel prop ready
      SREView.tsx              ← shell, fixture data, viewModel prop ready
      DeveloperView.tsx        ← shell, fixture data, viewModel prop ready
  types/
    views.ts                   ← PatternRow, PatternDetail, KPI types (Codex-authored)
  fixtures/
    patterns.sample.ts         ← real-data fixtures (Codex-authored)
  lib/
    pattern-adapter.ts         ← Pattern → PatternRow (Codex-authored)
    persona-view-models.ts     ← per-persona view models (Codex-authored)
  models/                      ← frozen domain types
  queries/                     ← frozen DQL queries
  analytics/, ai/, cost/, persona/, services/  ← frozen business logic
```
