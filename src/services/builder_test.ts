import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildRedirect } from "../../public/builder.js";
import { getRedirectResponse } from "./redirect.ts";
import { config } from "../config.ts";

config.fqdn = "redirect.center";
const base = {
  source: "go.example.com",
  destination: "https://example.org",
  fqdn: config.fqdn,
};

Deno.test("generator: UTM campaign survives DNS lowercasing and redirect parsing", () => {
  const result = buildRedirect({
    ...base,
    utm: { source: "ig", medium: "bio", campaign: "Spring" },
  });
  const response = getRedirectResponse(result.cname.toLowerCase(), "/");
  assertEquals(response.url, result.url);
  assertEquals(response.status, 302);
  assertEquals(
    new URL(response.url).searchParams.get("utm_campaign"),
    "Spring",
  );
});

Deno.test("generator: mixed case path, Unicode, custom port and trailing slash roundtrip", () => {
  const result = buildRedirect({
    ...base,
    destination: "https://example.org:8443/Case/ação/",
    status: "307",
  });
  const response = getRedirectResponse(result.cname.toLowerCase(), "/");
  assertEquals(new URL(response.url).href, result.url);
  assertEquals(response.status, 307);
});

Deno.test("generator: replaces existing UTM and preserves unrelated query", () => {
  const result = buildRedirect({
    ...base,
    destination: "https://example.org/?x=1&utm_source=old",
    utm: { source: "new" },
  });
  const url = new URL(getRedirectResponse(result.cname, "/").url);
  assertEquals(url.searchParams.getAll("utm_source"), ["new"]);
  assertEquals(url.searchParams.get("x"), "1");
});

Deno.test("generator: preserves incoming path and query when selected", () => {
  const result = buildRedirect({ ...base, preserve: true });
  assertEquals(
    getRedirectResponse(result.cname, "/article?utm_source=email").url,
    "https://example.org/article?utm_source=email",
  );
});

Deno.test("generator: all supported status codes roundtrip", () => {
  for (const status of ["301", "302", "307", "308"]) {
    const result = buildRedirect({ ...base, status });
    assertEquals(getRedirectResponse(result.cname, "/").status, Number(status));
  }
});

Deno.test("generator: rejects unsafe or unrepresentable destinations", () => {
  for (
    const destination of [
      "javascript:alert(1)",
      "ftp://example.org",
      "https://user:pass@example.org",
      "https://example.org/#anchor",
      "https://go.example.com",
      "bad-url",
    ]
  ) {
    assertThrows(() => buildRedirect({ ...base, destination }));
  }
  assertThrows(() => buildRedirect({ ...base, source: "https://example.com" }));
});

Deno.test("generator: rejects oversized DNS label and total name", () => {
  assertThrows(
    () => buildRedirect({ ...base, utm: { campaign: "a".repeat(40) } }),
    Error,
    "63",
  );
  assertThrows(
    () =>
      buildRedirect({
        ...base,
        destination: `https://example.org/${"a".repeat(160)}`,
      }),
    Error,
    "253",
  );
});
