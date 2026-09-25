import {
  assertEquals,
  assertRejects,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  readReportBody,
  ReportError,
  ReportService,
  validateReport,
} from "./reports.ts";

Deno.test("reports: validate and normalize URL without fetching it", () => {
  assertEquals(
    validateReport({
      url: " https://EXAMPLE.com/path ",
      reason: "phishing",
      details: " suspicious ",
    }),
    {
      url: "https://example.com/path",
      reason: "phishing",
      details: "suspicious",
    },
  );
  for (
    const url of [
      "javascript:alert(1)",
      "ftp://example.com",
      "https://user:pass@example.com",
      "not-a-url",
    ]
  ) {
    assertThrows(
      () => validateReport({ url, reason: "phishing" }),
      ReportError,
    );
  }
  assertThrows(
    () => validateReport({ url: "https://example.com", reason: "invalid" }),
    ReportError,
  );
  assertThrows(
    () =>
      validateReport({
        url: "https://example.com",
        reason: "malware",
        details: "x".repeat(2001),
      }),
    ReportError,
  );
});

Deno.test("reports: reject malformed and oversized request bodies", async () => {
  await assertRejects(
    () =>
      readReportBody(
        new Request("http://localhost/api/reports", {
          method: "POST",
          body: "{",
        }),
      ),
    ReportError,
    "invalid_body",
  );
  await assertRejects(
    () =>
      readReportBody(
        new Request("http://localhost/api/reports", {
          method: "POST",
          body: "x".repeat(8193),
        }),
      ),
    ReportError,
    "body_too_large",
  );
  assertEquals(
    await readReportBody(
      new Request("http://localhost/api/reports", {
        method: "POST",
        body: '{"reason":"fraud"}',
      }),
    ),
    { reason: "fraud" },
  );
});

Deno.test("reports: save pending report and enforce atomic per-client quota", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const service = new ReportService(kv);
    const input = validateReport({
      url: "https://example.com/test",
      reason: "fraud",
    });
    const now = new Date("2026-09-19T12:00:00Z");
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => service.submit(input, "client-a", now)),
    );
    const successful = results.filter((result) =>
      result.status === "fulfilled"
    );
    assertEquals(successful.length, 5);
    const receipt = (successful[0] as PromiseFulfilledResult<
      Awaited<ReturnType<typeof service.submit>>
    >).value;
    assertEquals(receipt.status, "pending");
    const stored = await kv.get<{ url: string; status: string }>([
      "report",
      receipt.id,
    ]);
    assertEquals(stored.value?.url, "https://example.com/test");
    assertEquals(stored.value?.status, "pending");
    // A different client and a later quota window remain usable.
    assertEquals(
      (await service.submit(input, "client-b", now)).status,
      "pending",
    );
    assertEquals(
      (await service.submit(
        input,
        "client-a",
        new Date("2026-09-19T13:00:00Z"),
      )).status,
      "pending",
    );
  } finally {
    kv.close();
  }
});
