const ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";
function encode(value) {
  let result = "", bits = 0, buffer = 0;
  for (const byte of new TextEncoder().encode(value)) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) result += ALPHABET[(buffer << (5 - bits)) & 31];
  return result;
}

/** Build DNS-safe records using the redirect service's existing syntax. */
export function buildRedirect(
  { source, destination, fqdn, status = "302", preserve = false, utm = {} },
) {
  const fail = (message) => {
    throw new Error(message);
  };
  const domain = source.trim().toLowerCase().replace(/\.$/, "");
  const validDomain = (value) =>
    value.length <= 253 &&
    value.split(".").every((label) =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)
    );
  if (!validDomain(domain) || !domain.includes(".")) {
    fail("Informe um domínio de origem válido, sem https:// ou caminho.");
  }
  let url;
  try {
    url = new URL(destination.trim());
  } catch {
    fail(
      "Informe uma URL de destino completa, começando com https:// ou http://.",
    );
  }
  if (
    !["https:", "http:"].includes(url.protocol) || url.username ||
    url.password || !validDomain(url.hostname)
  ) fail("Use uma URL HTTP ou HTTPS válida, sem usuário ou senha.");
  if (url.hostname.toLowerCase() === domain) {
    fail("Origem e destino precisam ser diferentes para evitar um loop.");
  }
  if (url.hash) {
    fail(
      "Remova o fragmento (#) da URL; este formato DNS não suporta âncoras.",
    );
  }
  if (!["301", "302", "307", "308"].includes(String(status))) {
    fail("Selecione um código de redirecionamento válido.");
  }
  for (const key of ["source", "medium", "campaign", "term", "content"]) {
    if (utm[key]?.trim()) url.searchParams.set(`utm_${key}`, utm[key].trim());
  }
  const labels = [url.hostname];
  // Split paths before encoding so case, Unicode and long paths survive DNS.
  if (url.pathname !== "/") {
    for (let i = 0; i < url.pathname.length; i += 30) {
      labels.push(`opts-path-${encode(url.pathname.slice(i, i + 30))}`);
    }
  }
  // Each query component is decoded independently by the existing server.
  if (url.search) {
    for (const pair of url.search.slice(1).split("&")) {
      labels.push(`opts-query-${encode(pair)}`);
    }
  }
  if (url.protocol === "https:") labels.push("opts-https");
  if (url.port) labels.push(`opts-port-${url.port}`);
  if (String(status) !== "301") labels.push(`opts-statuscode-${status}`);
  if (preserve) labels.push("opts-uri");
  labels.push(fqdn);
  const cname = labels.join(".");
  if (cname.split(".").some((label) => label.length > 63)) {
    fail(
      "Um parâmetro excedeu o limite de 63 caracteres por rótulo DNS. Encurte os valores UTM ou os parâmetros da URL.",
    );
  }
  if (cname.length > 253) {
    fail(
      `O CNAME tem ${cname.length} caracteres; o DNS permite até 253. Encurte a URL ou os valores UTM.`,
    );
  }
  return {
    source: domain,
    url: url.href,
    cname: `${cname}.`,
    status: Number(status),
    preserve,
  };
}
