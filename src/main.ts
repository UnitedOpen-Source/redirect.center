import vento from "ventojs";
import { config } from "./config.ts";
import { guardian } from "./services/guardian.ts";
import { AnalyticsService } from "./services/analytics.ts";
import { ReportService } from "./services/reports.ts";
import { dnsCacheSize, dnsInflightSize } from "./helpers/dns.ts";
import {
  createSiteRoutes,
  type PagePath,
  pageRoutes,
  type RenderedPage,
} from "./routes/site.ts";
import { createRedirectRoutes } from "./routes/redirect.ts";
import { createHostRouter } from "./routes/router.ts";

await Deno.mkdir(".data", { recursive: true });
const kv = await Deno.openKv(".data/analytics.sqlite");
const analytics = new AnalyticsService(kv);
const reports = new ReportService(kv);

// Render each public route once. The route gets its own canonical URL and title.
const pages = await (async () => {
  const env = vento({
    includes: new URL("../views", import.meta.url).pathname,
    autoescape: true,
  });
  const template = await env.load("index.vto");
  const result = {} as Record<PagePath, RenderedPage>;
  for (const path of Object.keys(pageRoutes) as PagePath[]) {
    const { key, title } = pageRoutes[path];
    const html = (await template({
      app: config,
      pageKey: key,
      pageTitle: title,
      canonicalPath: path,
      hidden: {
        overview: key === "overview" || key === "builder" ? "" : "hidden",
        analytics: key === "analytics" ? "" : "hidden",
        docs: key === "docs" ? "" : "hidden",
        report: key === "report" ? "" : "hidden",
        overviewNote: key === "overview" || key === "builder" ? "" : "hidden",
      },
    })).content;
    const htmlBytes = new TextEncoder().encode(html);
    const compressed = await new Response(
      new Blob([htmlBytes]).stream().pipeThrough(new CompressionStream("gzip")),
    ).arrayBuffer();
    result[path] = { html, gzip: new Uint8Array(compressed) };
  }
  return result;
})();

const site = createSiteRoutes({ config, pages, analytics, reports });
const redirects = createRedirectRoutes({ guardian, analytics });
const app = createHostRouter(config.fqdn, site, redirects);

// Periodic health log — helps correlate CPU spikes in CloudWatch with memory/cache state
// Memory watchdog — graceful restart when RSS exceeds limit (Deno native memory leak workaround)
// See: https://github.com/denoland/deno/issues/28307
const RSS_LIMIT = Number(Deno.env.get("RSS_LIMIT_MB") || "384") * 1024 * 1024;

setInterval(() => {
  const mem = Deno.memoryUsage();
  console.log(
    `[health] rss=${(mem.rss / 1024 / 1024).toFixed(1)}MB heap=${
      (mem.heapUsed / 1024 / 1024).toFixed(1)
    }/${(mem.heapTotal / 1024 / 1024).toFixed(1)}MB external=${
      (mem.external / 1024 / 1024).toFixed(1)
    }MB dnsCache=${dnsCacheSize()} dnsInflight=${dnsInflightSize()}`,
  );

  if (mem.rss > RSS_LIMIT) {
    console.warn(
      `[watchdog] RSS ${(mem.rss / 1024 / 1024).toFixed(0)}MB exceeded limit ${
        (RSS_LIMIT / 1024 / 1024).toFixed(0)
      }MB, restarting...`,
    );
    Deno.exit(0);
  }
}, 60_000);

// Start server
Deno.serve(
  {
    port: config.listenPort,
    hostname: config.listenIp,
    onListen({ hostname, port }) {
      console.log(`[server] Server is listening on ${hostname}:${port}`);
    },
    onError(error) {
      console.error(`[server] ${error}`);
      return new Response("Internal Server Error", { status: 500 });
    },
  },
  app.fetch,
);
