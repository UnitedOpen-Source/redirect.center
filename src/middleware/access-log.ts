import type { MiddlewareHandler } from "hono";

export const accessLog: MiddlewareHandler = async (c, next) => {
  const ip =
    ((c.env as Record<string, unknown>)?.remoteAddr as Deno.NetAddr | undefined)
      ?.hostname ||
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") || "-";
  const host = c.req.header("host") || "-";
  const method = c.req.method;
  const url = new URL(c.req.url);
  const path = url.pathname + url.search;
  const ua = c.req.header("user-agent") || "-";
  console.log(`[req] ${ip} "${method} ${path}" host=${host} ua="${ua}"`);
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const location = c.res.headers.get("location") || "-";
  console.log(
    `[res] ${ip} "${method} ${path}" host=${host} ${c.res.status} location=${location} ${ms}ms`,
  );
};
