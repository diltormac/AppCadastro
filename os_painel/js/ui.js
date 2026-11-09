import { copiarCampo } from "./utils.js";
import { salvarEdicoes, excluirOS } from "./api.js";
import {
  obterCatalogoServicos,
  salvarCatalogoServicos,
} from "./catalogoStore.js";
import { renderDashboard } from "./views/dashboard.js";
import { renderOS } from "./views/listaOS.js";
import { renderGaleria } from "./views/galeria.js";
import { lightboxAberto, fecharLightbox } from "./views/lightbox.js";
import { fecharModal } from "./views/modalEditarOS.js";

// Reexporta funções usadas em atributos onclick do HTML
export { copiarCampo, salvarEdicoes, excluirOS };
export { obterCatalogoServicos, salvarCatalogoServicos };

// Reexports das views (mantém o main.js inalterado)
export * from "./views/dashboard.js";
export * from "./views/listaOS.js";
export * from "./views/galeria.js";
export * from "./views/lightbox.js";
export * from "./views/sidebar.js";
export * from "./views/faturamento.js";
export * from "./views/helpers.js";
export * from "./views/estados.js";
export * from "./views/modalCatalogo.js";
export * from "./views/modalAdicionarItem.js";
export * from "./views/modalEditarOS.js";

/* ---------- RENDER ---------- */
export function atualizarTudo() {
  renderDashboard();
  renderOS();
  renderGaleria();
}

/* ---------- TECLADO ----------
   Esc fecha a camada mais acima (diálogo > lightbox > modal de edição). */
export function fecharCamadaSuperior() {
  const camadas = document.querySelectorAll(".camada-modal");
  if (camadas.length) {
    const topo = camadas[camadas.length - 1];
    if (typeof topo.fecharCamada === "function") topo.fecharCamada();
    else topo.remove();
    return true;
  }
  if (lightboxAberto()) {
    fecharLightbox();
    return true;
  }
  if (document.getElementById("modalDetalhes").classList.contains("show")) {
    fecharModal();
    return true;
  }
  return false;
}
