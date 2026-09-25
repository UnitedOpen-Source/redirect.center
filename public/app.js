import { buildRedirect } from "./builder.js";
import { initLanguage, locale, t } from "./i18n.js";
const $ = (id) => document.getElementById(id);
const form = $("redirect-form");
let result = null;
let toastTimer;
let savedRedirects = [];
let selectedSource = "";
try {
  const saved = JSON.parse(localStorage.getItem("desvio-redirects") || "[]");
  if (Array.isArray(saved)) {
    savedRedirects = saved.filter((item) =>
      typeof item?.source === "string" && typeof item?.url === "string"
    );
  }
  selectedSource = localStorage.getItem("desvio-selected-source") ||
    savedRedirects[0]?.source || "";
} catch { /* The builder still works when local storage is unavailable. */ }

function renderSavedRedirects() {
  $("saved-redirects").hidden = savedRedirects.length === 0;
  $("saved-domains").replaceChildren(...savedRedirects.map((item) => {
    const option = document.createElement("option");
    option.value = item.source;
    return option;
  }));
  $("saved-redirect-list").replaceChildren(...savedRedirects.map((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "saved-redirect";
    button.classList.toggle("selected", item.source === selectedSource);
    const title = document.createElement("strong");
    title.textContent = item.source;
    const url = document.createElement("span");
    url.textContent = item.url;
    const action = document.createElement("small");
    action.textContent = t("Ver acessos →");
    button.append(title, url, action);
    button.addEventListener("click", () => selectSource(item.source));
    return button;
  }));
}
function selectSource(source) {
  const domain = source.trim().toLowerCase().replace(/\.$/, "");
  if (
    domain.length > 253 || !domain.includes(".") ||
    !domain.split(".").every((label) =>
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)
    )
  ) {
    toast("Informe um domínio de origem válido, sem https:// ou caminho.");
    return;
  }
  selectedSource = domain;
  try {
    localStorage.setItem("desvio-selected-source", domain);
  } catch { /* In-memory selection is enough. */ }
  syncSource();
  refreshAnalytics();
}
function syncSource() {
  document.querySelectorAll("[data-analytics-domain]").forEach((input) => {
    input.value = selectedSource;
  });
  document.querySelectorAll("[data-selected-source]").forEach((label) => {
    label.textContent = selectedSource
      ? t("Exibindo acessos de {source}", { source: selectedSource })
      : t("Selecione um redirecionamento para ver seus acessos.");
  });
  renderSavedRedirects();
}
for (const filter of document.querySelectorAll("[data-analytics-form]")) {
  filter.addEventListener("submit", (event) => {
    event.preventDefault();
    selectSource(filter.querySelector("input").value);
  });
}
$("view-result-analytics").addEventListener("click", () => {
  if (result) selectSource(result.source);
});

function readForm() {
  return {
    source: $("source").value,
    destination: $("destination").value,
    fqdn: document.body.dataset.fqdn,
    status: $("status").value,
    preserve: $("preserve").checked,
    utm: Object.fromEntries(
      ["source", "medium", "campaign", "content", "term"].map((
        key,
      ) => [key, $(`utm-${key}`).value]),
    ),
  };
}

function updatePreview(reset = true) {
  const data = readForm();
  $("preview-source").textContent = data.source.trim() || t("seudominio.com");
  $("preview-destination").textContent = data.destination.trim() ||
    t("Seu próximo destino");
  $("preview-status").textContent = $("status").selectedOptions[0].textContent;
  try {
    $("preview-destination").textContent = buildRedirect(data).url;
  } catch { /* The form shows validation on submit. */ }
  if (reset) {
    result = null;
    $("result").hidden = true;
    $("form-error").hidden = true;
  }
}
form.addEventListener("input", updatePreview);
form.addEventListener("change", updatePreview);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    result = buildRedirect(readForm());
    savedRedirects = [
      { source: result.source, url: result.url },
      ...savedRedirects.filter((item) => item.source !== result.source),
    ];
    try {
      localStorage.setItem("desvio-redirects", JSON.stringify(savedRedirects));
    } catch {
      toast(
        "Configuração gerada. O navegador não permitiu salvar a lista local.",
      );
    }
    selectSource(result.source);
    $("form-error").hidden = true;
    $("record-source").textContent = result.source;
    $("record-name").textContent = `redirect.${result.source}`;
    $("record-cname").textContent = result.cname;
    $("final-url").textContent = result.url;
    $("local-warning").hidden =
      !(["localhost", "127.0.0.1"].includes(document.body.dataset.fqdn) ||
        document.body.dataset.entryIp === "127.0.0.1");
    $("result").hidden = false;
    $("result-heading").focus({ preventScroll: true });
    $("result").scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
  } catch (error) {
    result = null;
    $("result").hidden = true;
    $("form-error").dataset.message = error.message;
    $("form-error").textContent = t(error.message);
    $("form-error").hidden = false;
  }
});

function toast(message) {
  clearTimeout(toastTimer);
  $("toast").textContent = t(message);
  $("toast").hidden = false;
  toastTimer = setTimeout(() => {
    $("toast").hidden = true;
  }, 3500);
}
async function copy(value) {
  try {
    await navigator.clipboard.writeText(value);
    toast("Copiado! Pronto para o próximo passo.");
  } catch {
    toast("Não foi possível copiar. Selecione o texto e copie manualmente.");
  }
}
$("copy-dns").addEventListener("click", () => {
  if (result) {
    copy(
      `${result.source}.\t300\tIN\tA\t${document.body.dataset.entryIp}\nredirect.${result.source}.\t300\tIN\tCNAME\t${result.cname}`,
    );
  }
});
$("copy-url").addEventListener("click", () => {
  if (result) copy(result.url);
});

const titles = {
  overview: "Visão geral",
  builder: "Criar redirecionamento",
  analytics: "Analytics",
  docs: "Como funciona",
  report: "Denunciar URL",
};
function navigate() {
  const route = location.hash.slice(1) ||
    (location.pathname === "/report" ? "report" : "overview");
  const page = Object.hasOwn(titles, route) ? route : "overview";
  for (const section of document.querySelectorAll(".view-section")) {
    section.hidden = page === "overview"
      ? !["overview", "builder"].includes(section.id)
      : section.id !== page;
  }
  $("overview-note").hidden = !["overview", "builder"].includes(page);
  $("page-title").textContent = t(titles[page]);
  document.querySelectorAll("[data-page]").forEach((link) => {
    const active = link.dataset.page === page;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
  if (page === "builder") $("source").focus({ preventScroll: true });
  if (page === "analytics") refreshAnalytics();
}
window.addEventListener("hashchange", navigate);

const numberFormat = {
  format: (value) => new Intl.NumberFormat(locale()).format(value),
};
let analyticsRequest = 0;
let analyticsController;
async function refreshAnalytics() {
  const request = ++analyticsRequest;
  analyticsController?.abort();
  analyticsController = new AbortController();
  document.querySelectorAll("[data-metric]").forEach((element) => {
    element.textContent = "—";
  });
  document.querySelectorAll("[data-spark]").forEach((element) =>
    element.replaceChildren()
  );
  $("analytics-chart").replaceChildren();
  if (!selectedSource) {
    $("analytics-empty").textContent = t(
      "Selecione um redirecionamento para ver seus acessos.",
    );
    $("refresh-analytics").disabled = true;
    return;
  }
  $("analytics-empty").textContent = t("Carregando dados do serviço…");
  $("refresh-analytics").disabled = true;
  try {
    const response = await fetch(
      `/api/analytics?domain=${encodeURIComponent(selectedSource)}`,
      { cache: "no-store", signal: analyticsController.signal },
    );
    if (!response.ok) throw new Error("Analytics indisponível");
    const data = await response.json();
    if (request !== analyticsRequest) return;
    const days = data.days.map((day) => ({
      ...day,
      redirect: day.redirect || 0,
      permanent: (day.status_301 || 0) + (day.status_308 || 0),
      temporary: (day.status_302 || 0) + (day.status_307 || 0),
    }));
    for (const metric of ["redirect", "permanent", "temporary"]) {
      const total = days.reduce((sum, day) => sum + day[metric], 0);
      document.querySelectorAll(`[data-metric="${metric}"]`).forEach(
        (element) => {
          element.textContent = numberFormat.format(total);
        },
      );
      const max = Math.max(1, ...days.map((day) => day[metric]));
      const spark = document.querySelector(`[data-spark="${metric}"]`);
      spark.replaceChildren(...days.map((day) => {
        const bar = document.createElement("span");
        bar.style.height = `${Math.max(2, day[metric] / max * 37)}px`;
        return bar;
      }));
    }
    const max = Math.max(1, ...days.map((day) => day.redirect));
    $("analytics-chart").replaceChildren(...days.map((day) => {
      const column = document.createElement("div");
      column.className = "chart-column";
      const count = document.createElement("strong");
      count.textContent = numberFormat.format(day.redirect);
      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.height = `${Math.max(2, day.redirect / max * 160)}px`;
      const label = document.createElement("small");
      label.textContent = `${day.date.slice(8)}/${day.date.slice(5, 7)}`;
      column.setAttribute(
        "aria-label",
        t("{date}: {count} redirecionamentos", {
          date: label.textContent,
          count: count.textContent,
        }),
      );
      column.append(count, bar, label);
      return column;
    }));
    $("analytics-empty").textContent = t(
      days.some((day) => day.redirect)
        ? "Acessos deste redirecionamento. Incluem acessos automatizados; não representam visitantes únicos."
        : "Nenhum redirecionamento registrado neste período. Os primeiros acessos aparecerão aqui.",
    );
    $("analytics-updated").textContent = t(
      "Atualizado às {time}. Dados persistidos nesta instância.",
      { time: new Date(data.updatedAt).toLocaleTimeString(locale()) },
    );
    $("service-status").textContent = t("Serviço disponível");
  } catch {
    if (request !== analyticsRequest) return;
    $("service-status").textContent = t("Analytics indisponível");
    document.querySelectorAll("[data-metric]").forEach((element) => {
      element.textContent = "—";
    });
    document.querySelectorAll("[data-spark]").forEach((element) =>
      element.replaceChildren()
    );
    $("analytics-chart").replaceChildren();
    $("analytics-empty").textContent = t(
      "Não foi possível carregar os dados. Tente atualizar novamente.",
    );
    $("analytics-updated").textContent = t(
      "A atualização falhou. Verifique sua conexão.",
    );
  } finally {
    if (request === analyticsRequest) $("refresh-analytics").disabled = false;
  }
}
$("refresh-analytics").addEventListener("click", refreshAnalytics);
const reportMessages = {
  invalid_url: "Informe uma URL HTTP ou HTTPS válida, sem usuário ou senha.",
  invalid_reason: "Selecione um motivo válido para a denúncia.",
  invalid_details: "Os detalhes devem ter até 2.000 caracteres.",
  rate_limited: "Limite de denúncias atingido. Tente novamente em uma hora.",
  body_too_large: "A denúncia excede o tamanho permitido. Reduza os detalhes.",
};
let reportSending = false;
$("report-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (reportSending) return;
  $("report-error").hidden = true;
  $("report-success").hidden = true;
  const payload = {
    url: $("report-url").value.trim(),
    reason: $("report-reason").value,
    details: $("report-details").value.trim(),
  };
  try {
    const url = new URL(payload.url);
    if (
      !["http:", "https:"].includes(url.protocol) || url.username ||
      url.password
    ) throw new Error();
  } catch {
    $("report-error").dataset.message = reportMessages.invalid_url;
    $("report-error").textContent = t(reportMessages.invalid_url);
    $("report-error").hidden = false;
    $("report-url").focus();
    return;
  }
  reportSending = true;
  $("submit-report").disabled = true;
  try {
    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        reportMessages[data.error] ||
          "Não foi possível enviar a denúncia. Tente novamente.",
      );
    }
    $("report-id").textContent = data.id;
    $("report-success").hidden = false;
    $("report-form").reset();
    $("report-success-heading").focus({ preventScroll: true });
    $("report-success").scrollIntoView({ block: "nearest" });
  } catch (error) {
    const message = Object.values(reportMessages).includes(error.message)
      ? error.message
      : "Não foi possível enviar a denúncia. Tente novamente.";
    $("report-error").dataset.message = message;
    $("report-error").textContent = t(message);
    $("report-error").hidden = false;
  } finally {
    reportSending = false;
    $("submit-report").disabled = false;
  }
});
$("copy-report").addEventListener(
  "click",
  () => copy($("report-id").textContent),
);
initLanguage(() => {
  updatePreview(false);
  if ($("form-error").dataset.message) {
    $("form-error").textContent = t($("form-error").dataset.message);
  }
  const page = location.hash.slice(1) ||
    (location.pathname === "/report" ? "report" : "overview");
  $("page-title").textContent = t(titles[page] || titles.overview);
  if ($("report-error").dataset.message) {
    $("report-error").textContent = t($("report-error").dataset.message);
  }
  syncSource();
  refreshAnalytics();
});
navigate();
fetch("/healthz").then((response) => {
  if (response.ok) $("service-status").textContent = t("Serviço disponível");
}).catch(() => {
  $("service-status").textContent = t("Analytics indisponível");
});
