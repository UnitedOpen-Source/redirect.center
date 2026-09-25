import { Hono } from "hono";
import { errorHandler } from "../middleware/error-handler.ts";
import { HttpError, resolveDnsAndRedirect } from "../services/redirect.ts";
import type { RedirectResponse } from "../types/redirect-response.ts";
import type { AnalyticsService } from "../services/analytics.ts";
import type { GuardianService } from "../services/guardian.ts";

export function createRedirectRoutes(deps: {
  guardian: Pick<GuardianService, "isDenied">;
  analytics: Pick<AnalyticsService, "record">;
  resolve?: (host: string, url: string) => Promise<RedirectResponse>;
}) {
  const app = new Hono();
  app.onError(errorHandler);
  const resolve = deps.resolve || resolveDnsAndRedirect;

  app.get("/robots.txt", (c) => {
    c.header("Cache-Control", "public, max-age=86400");
    return c.text("User-agent: *\nDisallow: /\n");
  });

  app.all("*", async (c) => {
    const host = (c.req.header("host") || "").split(":")[0].toLowerCase();
    if (!host) throw new HttpError(400, "Bad Request");
    if (!c.req.header("user-agent")) throw new HttpError(403, "Forbidden");
    if (deps.guardian.isDenied(host)) throw new HttpError(403, "Forbidden");

    const redirect = await resolve(
      host,
      c.req.url.replace(/^https?:\/\/[^/]+/, ""),
    );
    if (deps.guardian.isDenied(redirect.fqdn)) {
      throw new HttpError(403, "Forbidden");
    }
    if (redirect.fqdn === host) {
      throw new HttpError(508, `Loop detected: ${host} redirects to itself`);
    }

    let safeLocation: string;
    try {
      safeLocation = new URL(redirect.url).href;
    } catch {
      safeLocation = encodeURI(redirect.url);
    }
    deps.analytics.record(host, redirect.status).catch((error) =>
      console.error("[analytics]", error)
    );
    return new Response(" ", {
      status: redirect.status,
      headers: {
        "Location": safeLocation,
        "Cache-Control": "public, max-age=15",
      },
    });
  });
  return app;
}
