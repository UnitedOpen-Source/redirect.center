/** Analytics are scoped to the exact source hostname, which identifies a DNS redirect. */
export function normalizeAnalyticsDomain(value: string): string | null {
  const domain = value.trim().toLowerCase().replace(/\.$/, "");
  if (domain.length > 253 || !domain.includes(".")) return null;
  return domain.split(".").every((label) =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)
    )
    ? domain
    : null;
}

// Store only source hostname and daily counters. No IP, full URL or visitor ID.
export class AnalyticsService {
  constructor(private kv: Deno.Kv) {}

  async record(source: string, status: number, date = new Date()) {
    const domain = normalizeAnalyticsDomain(source);
    if (!domain || ![301, 302, 307, 308].includes(status)) return;
    const day = date.toISOString().slice(0, 10);
    await this.kv.atomic()
      .sum(["redirect-analytics", domain, day, "redirect"], 1n)
      .sum(["redirect-analytics", domain, day, `status_${status}`], 1n)
      .commit();
  }

  async overview(source: string, now = new Date()) {
    const domain = normalizeAnalyticsDomain(source);
    if (!domain) throw new Error("Invalid source domain");
    const days: Array<{ date: string } & Record<string, string | number>> = [];
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() - offset);
      const day = date.toISOString().slice(0, 10);
      const counters: Record<string, number> = {};
      for await (
        const entry of this.kv.list<Deno.KvU64>({
          prefix: ["redirect-analytics", domain, day],
        })
      ) {
        counters[String(entry.key[3])] = Number(entry.value.value);
      }
      days.push({ date: day, ...counters });
    }
    return {
      source: domain,
      days,
      timezone: "UTC",
      scope: "redirect",
      updatedAt: now.toISOString(),
    };
  }
}
