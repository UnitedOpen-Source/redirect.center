import {
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { AnalyticsService } from "../services/analytics.ts";
import { ReportService } from "../services/reports.ts";
import type { RedirectResponse } from "../types/redirect-response.ts";
import { createHostRouter } from "./router.ts";
import { createRedirectRoutes } from "./redirect.ts";
import {
  createSiteRoutes,
  type PagePath,
  pageRoutes,
  type RenderedPage,
} from "./site.ts";

Deno.test("service pages and APIs belong only to the service host", async () => {
  const kv = await Deno.openKv(":memory:");
  try {
    const analytics = new AnalyticsService(kv);
    const reports = new ReportService(kv);
    const pages = {} as Record<PagePath, RenderedPage>;
    for (const [path, { title }] of Object.entries(pageRoutes)) {
      pages[path as PagePath] = {
        html: `<title>${title}</title>`,
        gzip: new Uint8Array(),
      };
    }
    const config = {
      fqdn: "localhost",
      entryIp: "127.0.0.1",
      listenPort: 3000,
      listenIp: "127.0.0.1",
      environment: "test",
      projectName: "Desvio",
      loggerLevel: "error",
    };
    const seen: Array<{ host: string; path: string }> = [];
    const site = createSiteRoutes({ config, pages, analytics, reports });
    const redirects = createRedirectRoutes({
      guardian: { isDenied: () => false },
      analytics,
      resolve: async (host, path) => {
        seen.push({ host, path });
        return {
          fqdn: "target.example",
          url: "https://target.example/",
          status: 302,
        } as RedirectResponse;
      },
    });
    const app = createHostRouter("localhost", site, redirects);
    const request = (host: string, path: string) =>
      app.fetch(
        new Request(`http://localhost${path}`, {
          headers: { host, "user-agent": "route-test" },
        }),
      );

    for (const [path, { title }] of Object.entries(pageRoutes)) {
      const response = await request("localhost:3000", path);
      assertEquals(response.status, 200);
      assertStringIncludes(await response.text(), title);
    }
    assertEquals((await request("localhost", "/missing")).status, 404);
    assertEquals((await request("localhost", "/healthz")).status, 200);
    assertEquals(
      (await request("localhost", "/api/analytics?domain=go.example.com"))
        .status,
      200,
    );
    assertEquals((await request("localhost", "/api/analytics")).status, 400);

    for (
      const path of [
        "/",
        "/analytics",
        "/docs",
        "/report",
        "/api/analytics?domain=go.example.com",
        "/public/style.css",
      ]
    ) {
      const response = await request("go.example.com", path);
      assertEquals(response.status, 302);
      assertEquals(response.headers.get("location"), "https://target.example/");
    }
    assertEquals(seen, [
      { host: "go.example.com", path: "/" },
      { host: "go.example.com", path: "/analytics" },
      { host: "go.example.com", path: "/docs" },
      { host: "go.example.com", path: "/report" },
      { host: "go.example.com", path: "/api/analytics?domain=go.example.com" },
      { host: "go.example.com", path: "/public/style.css" },
    ]);
  } finally {
    kv.close();
  }
});
