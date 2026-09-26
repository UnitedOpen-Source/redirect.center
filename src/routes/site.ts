import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import type { AppConfig } from "../config.ts";
import type { AnalyticsService } from "../services/analytics.ts";
import {
  readReportBody,
  ReportError,
  validateReport,
} from "../services/reports.ts";
import type { ReportService } from "../services/reports.ts";
import { dnsCacheSize, dnsInflightSize } from "../helpers/dns.ts";
import { errorHandler } from "../middleware/error-handler.ts";

export const pageRoutes = {
  "/": { key: "overview", title: "Visão geral" },
  "/redirects/new": { key: "builder", title: "Criar redirecionamento" },
  "/analytics": { key: "analytics", title: "Analytics" },
  "/docs": { key: "docs", title: "Como funciona" },
  "/report": { key: "report", title: "Denunciar URL" },
} as const;
export type PagePath = keyof typeof pageRoutes;
export interface RenderedPage {
  html: string;
  gzip: Uint8Array<ArrayBuffer>;
}

export function createSiteRoutes(deps: {
  config: AppConfig;
  pages: Record<PagePath, RenderedPage>;
  analytics: Pick<AnalyticsService, "overview">;
  reports: Pick<ReportService, "submit">;
}) {
  const app = new Hono();
  app.onError(errorHandler);

  for (const path of Object.keys(pageRoutes) as PagePath[]) {
    app.get(path, (c) => {
      if (!c.req.header("user-agent")) {
        return c.json({ statusCode: 403, message: "Forbidden" }, 403);
      }
      const acceptsGzip = c.req.header("accept-encoding")?.includes("gzip") ??
        false;
      return new Response(
        acceptsGzip ? deps.pages[path].gzip : deps.pages[path].html,
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": deps.config.fqdn === "localhost"
              ? "no-store"
              : "public, max-age=300",
            "Vary": "Accept-Encoding",
            ...(acceptsGzip ? { "Content-Encoding": "gzip" } : {}),
          },
        },
      );
    });
  }

  app.use("/public/*", serveStatic({ root: "./" }));

  app.get("/api/analytics", async (c) => {
    c.header("Cache-Control", "no-store");
    const domain = c.req.query("domain") || "";
    try {
      return c.json(await deps.analytics.overview(domain));
    } catch (error) {
      if (error instanceof Error && error.message === "Invalid source domain") {
        return c.json({ error: "A valid source domain is required" }, 400);
      }
      throw error;
    }
  });

  app.post("/api/reports", async (c) => {
    c.header("Cache-Control", "no-store");
    if (
      !/^application\/json(?:\s*;|$)/i.test(c.req.header("content-type") || "")
    ) {
      return c.json({ error: "unsupported_content_type" }, 415);
    }
    try {
      const input = validateReport(await readReportBody(c.req.raw));
      const client = ((c.env as Record<string, unknown>)?.remoteAddr as
        | Deno.NetAddr
        | undefined)?.hostname || "unknown";
      return c.json(await deps.reports.submit(input, client), 201);
    } catch (error) {
      if (error instanceof ReportError) {
        if (error.status === 429) c.header("Retry-After", "3600");
        return c.json({ error: error.code }, error.status);
      }
      throw error;
    }
  });

  app.get("/healthz", (c) => {
    const mem = Deno.memoryUsage();
    return c.json({
      uptime: Math.floor(performance.now() / 1000),
      memory: {
        rss: `${(mem.rss / 1024 / 1024).toFixed(1)}MB`,
        heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB`,
        heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB`,
        external: `${(mem.external / 1024 / 1024).toFixed(1)}MB`,
      },
      dnsCache: dnsCacheSize(),
      dnsInflight: dnsInflightSize(),
    });
  });

  app.all("*", (c) => c.json({ statusCode: 404, message: "Not Found" }, 404));
  return app;
}
