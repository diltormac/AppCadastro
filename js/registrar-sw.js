/* =========================================================
   REGISTRO DO SERVICE WORKER
   - Só roda no navegador puro (PWA/Web)
   - Nunca roda no Capacitor, Neutralino ou Electron
   ========================================================= */
(function registrarSW() {
  const ehCapacitor = !!window.Capacitor?.isNativePlatform?.();
  const ehNeutralino = typeof window.NL_VERSION !== "undefined";
  const ehElectron = navigator.userAgent.includes("Electron");

  if (ehCapacitor || ehNeutralino || ehElectron) {
    console.log("[PWA] Ambiente nativo detectado — SW não será registrado.");
    return;
  }

  if (!("serviceWorker" in navigator)) {
    console.warn("[PWA] Service Worker não suportado neste navegador.");
    return;
  }

  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register(
        "./service-worker.js",
        {
          scope: "./",
        },
      );
      console.log("[PWA] Service Worker registrado:", reg.scope);

      // Detecta nova versão e avisa o usuário (via toast do próprio painel)
      reg.addEventListener("updatefound", () => {
        const novo = reg.installing;
        if (!novo) return;

        novo.addEventListener("statechange", () => {
          if (
            novo.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            // Há uma nova versão pronta
            if (typeof window.toast === "function") {
              window.toast(
                "Nova versão disponível. Recarregue para atualizar.",
                "success",
              );
            } else {
              console.log("[PWA] Nova versão instalada. Recarregue.");
            }
          }
        });
      });

      // Verifica atualizações a cada 60 min (opcional)
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    } catch (err) {
      console.error("[PWA] Falha ao registrar Service Worker:", err);
    }
  });
})();
