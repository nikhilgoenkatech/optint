# Strato Phase 0 Notes

Created from `safe-workspace-rebuild` on branch `strato-migration`.

## Baseline

- Baseline tag: `pre-strato-workspace-baseline`
- Production branch remains: `safe-workspace-rebuild`
- Production app config remains: `app.config.json`
- Preview config added: `app.strato.config.json`

## Package Verification

Confirmed through `npm view` on 2026-07-02:

- `@dynatrace/strato-components`: `3.8.0`
- `@dynatrace/strato-design-tokens`: `1.5.1`
- `@dynatrace/strato-icons`: `2.3.1`

`@dynatrace/strato-components` exports component groups including:

- root package
- `buttons`
- `content`
- `core`
- `filters`
- `forms`
- `layouts`
- `navigation`
- `overlays`
- `tables`
- `typography`

## Deployment Caveat

The installed `dt-app build --help` output does not list a `--config` option.

That means the revised two-app deployment idea is still valid, but the exact command:

```powershell
dt-app build --config app.strato.config.json
dt-app deploy --config app.strato.config.json
```

is not confirmed for the installed CLI. Before deploying the preview app, choose one of these strategies:

1. Confirm another supported `dt-app` option for alternate config files.
2. Use a temporary config-copy wrapper that swaps `app.strato.config.json` into `app.config.json` only inside the Strato branch.
3. Use a separate preview app directory.

Do not modify the production `app.config.json` on `safe-workspace-rebuild`.

## Contract Artifacts

Added:

- `src/types/views.ts`
- `src/lib/pattern-adapter.ts`
- `src/lib/persona-view-models.ts`
- `src/fixtures/patterns.sample.ts`

Claude can use `src/fixtures/patterns.sample.ts` for shell rendering while Codex wires runtime data through the adapter layer.

## Fixture Scenarios

The fixture file includes:

- normal mixed operational patterns
- empty pattern list
- mixed categories: `AVAILABILITY`, `CUSTOM_ALERT`, `ERROR`
- low-evidence pattern rows

These are intended to catch UI regressions before the Strato shell is wired to live DQL.
