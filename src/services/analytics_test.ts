import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { AnalyticsService, normalizeAnalyticsDomain } from "./analytics.ts";

Deno.test("analytics: concurrent redirects increment atomically and group by UTC date/status", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const analytics = new AnalyticsService(kv);
    const now = new Date("2026-09-19T12:00:00Z");
    await Promise.all(
      Array.from(
        { length: 50 },
        () => analytics.record("go.example.com", 302, now),
      ),
    );
    await analytics.record(
      "go.example.com",
      301,
      new Date("2026-09-18T23:59:59Z"),
    );
    await analytics.record(
      "go.example.com",
      308,
      new Date("2026-09-10T12:00:00Z"),
    );
    const result = await analytics.overview("go.example.com", now);
    assertEquals(result.days.length, 7);
    assertEquals(result.days[6], {
      date: "2026-09-19",
      redirect: 50,
      status_302: 50,
    });
    assertEquals(result.days[5], {
      date: "2026-09-18",
      redirect: 1,
      status_301: 1,
    });
    assertEquals(result.days[0], { date: "2026-09-13" });
    assertEquals(result.timezone, "UTC");
  } finally {
    kv.close();
  }
});

Deno.test("analytics: isolate each redirect, normalize host and exclude invalid statuses", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const analytics = new AnalyticsService(kv);
    const now = new Date("2026-09-19T12:00:00Z");
    await analytics.record("GO.example.com.", 302, now);
    await analytics.record("shop.example.com", 301, now);
    await analytics.record("shop.example.com", 308, now);
    await analytics.record("go.example.com", 404, now);
    const go = await analytics.overview("go.example.com", now);
    const shop = await analytics.overview("shop.example.com", now);
    const empty = await analytics.overview("unknown.example.com", now);
    assertEquals(go.days[6], {
      date: "2026-09-19",
      redirect: 1,
      status_302: 1,
    });
    assertEquals(shop.days[6], {
      date: "2026-09-19",
      redirect: 2,
      status_301: 1,
      status_308: 1,
    });
    assertEquals(empty.days[6], { date: "2026-09-19" });
    assertEquals(go.source, "go.example.com");
    assertEquals(go.scope, "redirect");
    assertEquals(normalizeAnalyticsDomain("https://example.com/path"), null);
  } finally {
    kv.close();
  }
});
