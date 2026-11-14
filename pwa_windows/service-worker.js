/* =========================================================
   SERVICE WORKER — OS Fácil PWA
   Estratégias:
   - App shell (HTML/JS/CSS local) → stale-while-revalidate
   - CDNs versionadas → cache-first
   - Supabase REST/RPC → network-first com fallback cache
   - Navegação (HTML) → network-first com fallback cache → offline.html
   ========================================================= */

const VERSAO = "v1";
const CACHE_SHELL = `osfacil-shell-${VERSAO}`;
const CACHE_CDN = `osfacil-cdn-${VERSAO}`;
const CACHE_API = `osfacil-api-${VERSAO}`;
const OFFLINE_URL = "./offline.html";

// Tempo máximo que o SW espera a rede antes de usar cache (ms)
const TIMEOUT_REDE = 5000;

// Arquivos do app shell (relativos ao escopo do SW)
const ASSETS_SHELL = [
  "./",
  "./index.html",
  "./offline.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/registrar-sw.js",
  "./js/main.js",
  "./js/api.js",
  "./js/state.js",
  "./js/ui.js",
  "./js/utils.js",
  "./js/config.js",
  "./js/catalogoStore.js",
  "./js/compartilhamento.js",
  "./js/views/acoes.js",
  "./js/views/dashboard.js",
  "./js/views/dropdownCustom.js",
  "./js/views/estados.js",
  "./js/views/faturamento.js",
  "./js/views/galeria.js",
  "./js/views/helpers.js",
  "./js/views/lightbox.js",
  "./js/views/listaOS.js",
  "./js/views/modalAdicionarItem.js",
  "./js/views/modalCatalogo.js",
  "./js/views/modalEditarOS.js",
  "./js/views/modalFotosOS.js",
  "./js/views/relatorio.js",
  "./js/views/sidebar.js",
  "./assets/logo.png",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png",
];

// CDNs externas (versões fixas → cache-first)
const ASSETS_CDN = [
  "https://cdn.tailwindcss.com/",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/webfonts/fa-solid-900.woff2",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/webfonts/fa-regular-400.woff2",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/webfonts/fa-brands-400.woff2",
  "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css",
  "https://cdn.jsdelivr.net/npm/flatpickr",
  "https://cdn.jsdelivr.net/npm/flatpickr/dist/l10n/pt.js",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",
];

const SUPABASE_HOST = "kiiswukzwwoznkgjyaod.supabase.co";

/* ---------- INSTALL ---------- */
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cacheShell = await caches.open(CACHE_SHELL);
      // addAll falha se 1 arquivo falhar → melhor add individual
      await Promise.all(
        ASSETS_SHELL.map((url) =>
          cacheShell.add(url).catch((err) => {
            console.warn("[SW] Falha ao cachear (shell):", url, err);
          }),
        ),
      );

      const cacheCdn = await caches.open(CACHE_CDN);
      await Promise.all(
        ASSETS_CDN.map((url) =>
          cacheCdn.add(new Request(url, { mode: "cors" })).catch((err) => {
            console.warn("[SW] Falha ao cachear (cdn):", url, err);
          }),
        ),
      );

      // Atualiza imediatamente (não fica em waiting)
      self.skipWaiting();
    })(),
  );
});

/* ---------- ACTIVATE ---------- */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Apaga caches de versões antigas
      const nomes = await caches.keys();
      await Promise.all(
        nomes.filter((n) => !n.endsWith(VERSAO)).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

/* ---------- FETCH ---------- */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Só lidamos com GET (POST/PATCH/DELETE sempre passam direto)
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // 1) API do Supabase → network-first com fallback cache
  if (url.hostname === SUPABASE_HOST && url.pathname.startsWith("/rest/")) {
    event.respondWith(networkFirstComCache(req, CACHE_API, 8000));
    return;
  }

  // 2) Storage do Supabase (fotos) → network-only (não cacheia aqui)
  if (url.hostname === SUPABASE_HOST && url.pathname.startsWith("/storage/")) {
    return;
  }

  // 3) Navegação (HTML) → network-first com fallback cache → offline.html
  if (req.mode === "navigate") {
    event.respondWith(navegacaoNetworkFirst(req));
    return;
  }

  // 4) CDNs externas → cache-first
  if (ASSETS_CDN.some((u) => req.url.startsWith(u.split("?")[0]))) {
    event.respondWith(cacheFirst(req, CACHE_CDN));
    return;
  }

  // 5) Assets locais (mesma origem) → stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(req, CACHE_SHELL));
    return;
  }

  // 6) Qualquer outra coisa → deixa o navegador resolver
});

/* ---------- ESTRATÉGIAS ---------- */

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);

  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  return cached || (await fetchPromise) || new Response("", { status: 504 });
}

async function networkFirstComCache(req, cacheName, timeoutMs) {
  const cache = await caches.open(cacheName);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(req, { signal: controller.signal });
    clearTimeout(timer);

    if (res && res.ok) {
      // Clona e salva
      cache.put(req, res.clone());
      return res;
    }
    // Resposta de erro do servidor → tenta cache
    const cached = await cache.match(req);
    if (cached) return cached;
    return res;
  } catch (err) {
    // Falha de rede/timeout → tenta cache
    const cached = await cache.match(req);
    if (cached) return cached;
    return new Response(
      JSON.stringify({
        error: "offline",
        message: "Sem conexão e sem cache para esta requisição.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

async function navegacaoNetworkFirst(req) {
  const cache = await caches.open(CACHE_SHELL);
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_REDE);
    const res = await fetch(req, { signal: controller.signal });
    clearTimeout(timer);

    if (res && res.ok) {
      cache.put(req, res.clone());
      return res;
    }
    throw new Error("Não OK");
  } catch (err) {
    const cached =
      (await cache.match(req)) || (await cache.match("./index.html"));
    if (cached) return cached;
    const offline = await cache.match(OFFLINE_URL);
    if (offline) return offline;
    return new Response(
      "<h1>Offline</h1><p>Sem conexão e sem cache do app.</p>",
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
    );
  }
}

/* ---------- MENSAGENS DO CLIENTE ---------- */
self.addEventListener("message", (event) => {
  if (!event.data) return;

  // "limpar-cache" — chamado quando o usuário clica em "Atualizar" no painel
  // (opcional, se você quiser forçar atualização)
  if (event.data.type === "LIMPAR_CACHE_API") {
    event.waitUntil(caches.delete(CACHE_API));
  }

  if (event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
