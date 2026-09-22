// Operator-only local command; no reports are exposed through HTTP.
await Deno.stat(".data/analytics.sqlite");
const kv = await Deno.openKv(".data/analytics.sqlite");
try {
  for await (const report of kv.list({ prefix: ["report"] })) {
    console.log(JSON.stringify(report.value));
  }
} finally {
  kv.close();
}
