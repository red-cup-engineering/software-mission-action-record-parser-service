const aliases = {
  read_file: "read",
  list_dir: "list_files",
  edit_file: "edit",
  create_file: "create",
  run_test: "test",
  apply_patch: "edit",
};
const actionNames = [
  "list_files", "list_dir", "search", "read", "read_file", "edit", "edit_file",
  "create", "create_file", "test", "run_test", "finish",
];
const defaultReason = "provider selected this next tool move";

function normalizedAction(name) {
  return Object.hasOwn(aliases, name) ? aliases[name] : name;
}

export function parseSoftwareMissionActionRecord(record) {
  if (typeof record?.text !== "string") return null;
  const candidates = [...record.text.matchAll(/```(?:json)?\s*([\s\S]*?)```/giu)].map(match => match[1]);
  candidates.push(record.text.trim());
  for (const candidate of candidates) {
    let value;
    try {
      value = JSON.parse(candidate);
    } catch {
      continue;
    }
    if (value === null || typeof value !== "object" || Array.isArray(value)) continue;
    const parsed = jsonAction(value);
    if (parsed) return parsed;
  }
  return markdownAction(record.text);
}

function jsonAction(value) {
  const reason = value.reason || defaultReason;
  for (const field of ["action", "command"]) {
    if (typeof value[field] !== "string") continue;
    const args = field === "action" && value.args && typeof value.args === "object"
      ? value.args
      : Object.fromEntries(Object.entries(value).filter(([key]) => key !== field && key !== "reason"));
    return { action: normalizedAction(value[field]), args, reason };
  }
  for (const name of actionNames) {
    if (!Object.hasOwn(value, name)) continue;
    const args = value[name] && typeof value[name] === "object" ? value[name] : {};
    return { action: normalizedAction(name), args, reason };
  }
  if (typeof value.path !== "string") return null;
  if (value.blocks !== undefined) return { action: "edit", args: value, reason: "provider supplied a source edit" };
  if (value.content !== undefined) return { action: "create", args: value, reason: "provider supplied a source creation" };
  return { action: "read", args: value, reason: "provider selected a source path to inspect" };
}

export function actionBlocks(action) {
  if (action?.action !== "edit") return null;
  const blocks = action.args?.blocks;
  return Array.isArray(blocks) ? blocks : blocks && typeof blocks === "object" ? [blocks] : null;
}

function markdownAction(source) {
  const tool = source.match(/(?:^|\n)\s*TOOL\s*:\s*([a-z_]+)\s*(?:\n|$)/iu)?.[1]?.toLowerCase();
  if (!tool) return null;
  const action = normalizedAction(tool);
  const path = source.match(/(?:^|\n)\s*PATH\s*:\s*([^\n]+)\s*(?:\n|$)/iu)?.[1]?.trim();
  const query = source.match(/(?:^|\n)\s*QUERY\s*:\s*([^\n]+)\s*(?:\n|$)/iu)?.[1]?.trim();
  const fenced = label => source.match(new RegExp(
    "(?:^|\\n)\\s*" + label + "\\s*:\\s*\\n\\s*```(?:[^\\n]*)\\n([\\s\\S]*?)\\n```", "iu",
  ))?.[1];

  if (action === "create" && path) {
    const content = fenced("CONTENT");
    return typeof content === "string"
      ? { action, args: { path, content }, reason: "provider proposed a source creation in natural text" }
      : null;
  }
  if (action === "edit" && path) {
    const search = fenced("SEARCH");
    const replace = fenced("REPLACE");
    return typeof search === "string" && typeof replace === "string"
      ? { action, args: { path, blocks: [{ search, replace }] }, reason: "provider proposed a source edit in natural text" }
      : null;
  }
  if (action === "read" || action === "list_files") {
    return { action, args: path ? { path } : {}, reason: "provider proposed an observation in natural text" };
  }
  if (action === "search" && query) {
    return { action, args: { query, ...(path ? { path } : {}) }, reason: "provider proposed a search in natural text" };
  }
  const reason = "provider proposed a control transition in natural text";
  if (action === "test") return { action, args: {}, reason };
  if (action === "finish") {
    const begin = "---BEGIN WORK PRODUCT---";
    const from = source.lastIndexOf(begin);
    const to = source.lastIndexOf("---END WORK PRODUCT---");
    const summary = from >= 0 && to > from ? source.slice(from + begin.length, to).trim() : "";
    return { action, args: summary ? { summary } : {}, reason };
  }
  return null;
}
