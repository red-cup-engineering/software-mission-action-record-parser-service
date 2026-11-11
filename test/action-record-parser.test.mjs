import assert from "node:assert/strict";
import test from "node:test";
import {
  actionBlocks,
  parseSoftwareMissionActionRecord,
} from "@red-cup-engineering/software-mission-action-record-parser-service";

const parse = text => parseSoftwareMissionActionRecord({ text });

test("normalizes explicit actions and their arguments", () => {
  assert.deepEqual(parse('{"action":"read_file","args":{"path":"src/index.mjs"},"reason":"read source"}'), {
    action: "read",
    args: { path: "src/index.mjs" },
    reason: "read source",
  });
  const command = parse('{"command":"run_test","target":"native"}');
  assert.equal(command.action, "test");
  assert.deepEqual(command.args, { target: "native" });
});

test("skips unrelated fenced JSON before the action record", () => {
  const record = parse('Context:\n```json\n{"note":"unrelated"}\n```\nAction:\n```json\n{"list_dir":{"path":"src"}}\n```');
  assert.equal(record.action, "list_files");
  assert.deepEqual(record.args, { path: "src" });
});

test("uses literal names when an action matches an inherited object property", () => {
  for (const name of ["constructor", "__proto__", "toString"]) {
    const record = parse(JSON.stringify({ action: name }));
    assert.equal(record.action, name);
  }
});

test("normalizes Markdown edit blocks and retains an empty replacement", () => {
  const record = parse('TOOL: apply_patch\nPATH: src/main.mjs\nSEARCH:\n```\nold\n```\nREPLACE:\n```\n\n```');
  assert.equal(record.action, "edit");
  assert.equal(record.args.path, "src/main.mjs");
  assert.deepEqual(actionBlocks(record), [{ search: "old", replace: "" }]);
});

test("infers path actions and wraps a single edit block", () => {
  assert.equal(parse('{"path":"src/main.mjs"}').action, "read");
  assert.equal(parse('{"path":"src/main.mjs","content":""}').action, "create");
  const record = parse('{"path":"src/main.mjs","blocks":{"search":"a","replace":"b"}}');
  assert.deepEqual(actionBlocks(record), [{ search: "a", replace: "b" }]);
});

test("leaves an incomplete action unparsed", () => {
  assert.equal(parse("TOOL: edit\nPATH: src/main.mjs"), null);
  assert.equal(parse("plain prose"), null);
  assert.equal(parseSoftwareMissionActionRecord(null), null);
  assert.equal(actionBlocks({ action: "read" }), null);
});
