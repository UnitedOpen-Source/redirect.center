export const reportReasons = ["phishing", "malware", "fraud", "other"] as const;
export type ReportReason = typeof reportReasons[number];
export class ReportError extends Error {
  constructor(public status: 400 | 413 | 429, public code: string) {
    super(code);
  }
}
export interface ReportInput {
  url: string;
  reason: ReportReason;
  details: string;
}
export function validateReport(value: unknown): ReportInput {
  if (!value || typeof value !== "object") {
    throw new ReportError(400, "invalid_body");
  }
  const input = value as Record<string, unknown>;
  if (typeof input.url !== "string" || input.url.length > 2048) {
    throw new ReportError(400, "invalid_url");
  }
  let url;
  try {
    url = new URL(input.url.trim());
  } catch {
    throw new ReportError(400, "invalid_url");
  }
  if (
    !["http:", "https:"].includes(url.protocol) || url.username ||
    url.password || !url.hostname
  ) throw new ReportError(400, "invalid_url");
  if (!reportReasons.includes(input.reason as ReportReason)) {
    throw new ReportError(400, "invalid_reason");
  }
  if (input.details !== undefined && typeof input.details !== "string") {
    throw new ReportError(400, "invalid_details");
  }
  const details = (input.details as string | undefined)?.trim() || "";
  if (details.length > 2000) throw new ReportError(400, "invalid_details");
  return { url: url.href, reason: input.reason as ReportReason, details };
}

/** Bounded read also protects requests without Content-Length. Never fetch reported URLs. */
export async function readReportBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") || 0) > 8192) {
    throw new ReportError(413, "body_too_large");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new ReportError(400, "invalid_body");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 8192) {
      await reader.cancel();
      throw new ReportError(413, "body_too_large");
    }
    chunks.push(value);
  }
  try {
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ReportError(400, "invalid_body");
  }
}

export class ReportService {
  constructor(private kv: Deno.Kv) {}
  async submit(input: ReportInput, client: string, now = new Date()) {
    // Key is a digest of the TCP peer address. Proxies share a quota unless handled upstream.
    const bytes = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(client),
    );
    const digest = Array.from(
      new Uint8Array(bytes),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    const key = ["report-rate", digest, Math.floor(now.getTime() / 3_600_000)];
    for (let attempt = 0; attempt < 10; attempt++) {
      const rate = await this.kv.get<number>(key);
      if ((rate.value || 0) >= 5) throw new ReportError(429, "rate_limited");
      const id = crypto.randomUUID();
      const report = {
        id,
        ...input,
        status: "pending",
        createdAt: now.toISOString(),
      };
      const committed = await this.kv.atomic().check(rate)
        .set(key, (rate.value || 0) + 1, { expireIn: 3_600_000 })
        .set(["report", id], report).commit();
      if (committed.ok) {
        return { id, status: "pending", createdAt: report.createdAt };
      }
    }
    throw new ReportError(429, "rate_limited");
  }
}
