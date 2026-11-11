# software-mission-action-record-parser-service

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

Parses a model's raw text output into a normalized action record: `{ action, args, reason }`.

Models that drive an agentic coding loop don't always emit their next move in
the same shape. This package accepts a few common formats and normalizes them
to one shape the rest of the pipeline can rely on.

## Install

This is a workspace package (`@red-cup-engineering/software-mission-action-record-parser-service`).
It has no runtime dependencies.

## Usage

```js
import { parseSoftwareMissionActionRecord, actionBlocks } from "@red-cup-engineering/software-mission-action-record-parser-service";

parseSoftwareMissionActionRecord({
  text: '{"action": "edit_file", "args": {"path": "src/index.js", "blocks": []}}',
});
// => { action: "edit", args: { path: "src/index.js", blocks: [] }, reason: "provider selected this next tool move" }
```

`record.text` can contain:

- A JSON object, either bare or inside a fenced ```` ```json ```` block. The
  object may name the action via an `action` field, a `command` field, or by
  using a known action name (`read`, `edit`, `create`, `search`, `list_files`,
  `test`, `finish`, ...) as a top-level key. A bare `{ path, ... }` object is
  inferred as `edit` (has `blocks`), `create` (has `content`), or `read`
  (neither).
- A plain-text block in the form:

  ````text
  TOOL: edit
  PATH: src/index.js
  SEARCH:
  ```
  old code
  ```
  REPLACE:
  ```
  new code
  ```
  ````

Action names that vary by model (`read_file`, `list_dir`, `edit_file`,
`create_file`, `run_test`, `apply_patch`) are normalized to the common
form (`read`, `list_files`, `edit`, `create`, `test`, `edit`).

`parseSoftwareMissionActionRecord` returns `null` when no action can be
recovered from the text.

`actionBlocks(action)` returns an edit action's `blocks` as an array (wrapping
a single block object if needed), or `null` if the action isn't an edit or
carries no blocks.

## API

### `parseSoftwareMissionActionRecord(record)`

- `record.text` (`string`) — the model's raw output.
- Returns `{ action, args, reason }` or `null`.

### `actionBlocks(action)`

- `action` — a parsed action record.
- Returns an array of `{ search, replace }` blocks, or `null`.

## Validation

Run `npm test` to check JSON and Markdown actions, aliases, edit blocks,
and incomplete input through the package export.
