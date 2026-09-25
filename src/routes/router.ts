import { Hono } from "hono";
import { accessLog } from "../middleware/access-log.ts";
import { errorHandler } from "../middleware/error-handler.ts";

/** Route service pages by the service Host; every other Host is a redirect source. */
export function createHostRouter(fqdn: string, site: Hono, redirects: Hono) {
  const app = new Hono();
  app.onError(errorHandler);
  app.use("*", accessLog);
  app.all("*", (c) => {
    const host = (c.req.header("host") || "").split(":")[0].toLowerCase();
    return (host === fqdn.toLowerCase() ? site : redirects).fetch(
      c.req.raw,
      c.env,
    );
  });
  return app;
}
