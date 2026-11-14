import { estado } from "./state.js";
import { abrirRelatorio } from "./views/relatorio.js";
import {
  carregarDados,
  recarregarListaOS,
  carregarMaisOS,
  carregarMaisGaleria,
} from "./api.js";
import {
  alternarFaturamento,
  abrirSidebar,
  fecharSidebar,
  abrirLightboxPorOS,
  navegarLightbox,
  fecharLightbox,
  abrirDetalhes,
  fecharModal,
  compartilharOS,
  modalAdicionarItem,
  modalRemoverItem,
  modalEditarItem,
  modalGerenciarCatalogo,
  modalEditarServicoCatalogo,
  adicionarServicoCatalogo,
  removerServicoCatalogo,
  copiarCampo,
  salvarEdicoes,
  excluirOS,
  fecharCamadaSuperior,
  lightboxAberto,
  tratarFotoQuebrada,
  agendarBloqueioFaturamento,
  atualizarTudo,
  adicionarFotosOS,
  excluirFotoOS,
} from "./ui.js";
import { setTouchStartX, setTouchEndX, exibirFaturamento } from "./state.js";
import { toast } from "./utils.js";
import { criarDropdownCustom } from "./views/dropdownCustom.js";
import { obterCatalogoServicos } from "./catalogoStore.js";
import { db } from "./db.js";
import { supabaseClient } from "./config.js";

/* ---------- DETECÇÃO DE ELECTRON ---------- */
if (navigator.userAgent.includes("Electron")) {
  document.body.classList.add("is-electron");
}

/* ---------- NAVEGAÇÃO ---------- */
function mudarView(view) {
  estado.view = view;
  document.querySelectorAll(".sidebar-link[data-view]").forEach((el) => el.classList.remove("active"));
  const activeLink = document.querySelector(`.sidebar-link[data-view="${view}"]`);
  if (activeLink) activeLink.classList.add("active");

  document.getElementById("viewDashboard").classList.add("hidden");
  document.getElementById("viewOS").classList.add("hidden");
  document.getElementById("viewFotos").classList.add("hidden");

  if (view === "dashboard") {
    document.getElementById("viewDashboard").classList.remove("hidden");
    document.getElementById("pageTitle").textContent = "Dashboard";
    document.getElementById("pageSubtitle").textContent = "Visão geral das ordens de serviço";
  } else if (view === "os") {
    document.getElementById("viewOS").classList.remove("hidden");
    document.getElementById("pageTitle").textContent = "Todas as OS";
    document.getElementById("pageSubtitle").textContent = "Gerencie as ordens de serviço";
  } else if (view === "fotos") {
    document.getElementById("viewFotos").classList.remove("hidden");
    document.getElementById("pageTitle").textContent = "Galeria de Fotos";
    document.getElementById("pageSubtitle").textContent = "Todas as imagens enviadas";
  }

  fecharSidebar();
}

/* ---------- FUNÇÃO PARA FILTRAR PELO CLIQUE NOS CARDS ---------- */
window.filtrarPorCard = function (filtro) {
  estado.filtroStatus = "all";
  estado.filtroFinalizado = "all";
  document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));

  if (filtro === "prontas") {
    estado.filtroFinalizado = "prontas";
    const btnTodas = document.querySelector('.filter-btn[data-status="all"]');
    if (btnTodas) btnTodas.classList.add("active");
  } else {
    estado.filtroStatus = filtro;
    const btnMatch = document.querySelector(`.filter-btn[data-status="${filtro}"]`);
    if (btnMatch) btnMatch.classList.add("active");
  }

  mudarView("os");
  recarregarListaOS();
};

/* ---------- EXPÕE FUNÇÕES USADAS EM onclick DO HTML ---------- */
Object.assign(window, {
  alternarFaturamento, abrirSidebar, fecharSidebar, abrirLightboxPorOS, navegarLightbox,
  fecharLightbox, abrirDetalhes, fecharModal, compartilharOS, modalAdicionarItem,
  modalRemoverItem, modalEditarItem, modalGerenciarCatalogo, modalEditarServicoCatalogo,
  adicionarServicoCatalogo, removerServicoCatalogo, copiarCampo, salvarEdicoes, excluirOS,
  carregarDados, carregarMaisOS, carregarMaisGaleria, mudarView, adicionarFotosOS, excluirFotoOS,
});

Object.assign(window, {
  abrirRelatorioOS: (id) => {
    import("./state.js").then(({ listaOS }) => {
      const os = listaOS.find((o) => o.id === id);
      if (os) abrirRelatorio(os);
      else toast("OS não encontrada.", "error");
    });
  },
});

/* ---------- EVENTOS ---------- */
document.querySelectorAll(".sidebar-link[data-view]").forEach((el) => {
  el.addEventListener("click", () => mudarView(el.dataset.view));
});

document.querySelectorAll(".sidebar-link[data-filter]").forEach((el) => {
  el.addEventListener("click", () => {
    const statusFiltro = el.dataset.filter;
    estado.filtroStatus = statusFiltro;
    estado.filtroFinalizado = "all";

    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    const match = document.querySelector(`.filter-btn[data-status="${statusFiltro}"]`);
    if (match) match.classList.add("active");

    mudarView("os");
    recarregarListaOS();
  });
});

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    estado.filtroStatus = btn.dataset.status;
    estado.filtroFinalizado = "all";
    recarregarListaOS();
  });
});

let timeoutBusca = null;
document.getElementById("searchInput").addEventListener("input", (e) => {
  estado.busca = e.target.value;
  if (estado.view !== "os") mudarView("os");
  clearTimeout(timeoutBusca);
  timeoutBusca = setTimeout(() => recarregarListaOS(), 350);
});

/* ===== sortSelect: dropdown customizado ===== */
{
  const container = document.getElementById("sortSelect");
  if (container) {
    const dropdown = criarDropdownCustom({
      id: "sortSelect",
      name: "ordenacao",
      value: estado.ordenacao || "data-desc",
      options: [
        { value: "data-desc", text: "Recentes" },
        { value: "data-asc", text: "Antigas" },
        { value: "nome-asc", text: "A-Z" },
        { value: "nome-desc", text: "Z-A" },
      ],
      className: "w-full",
    });
    container.replaceWith(dropdown);

    dropdown.addEventListener("change", () => {
      estado.ordenacao = dropdown.value;
      recarregarListaOS();
    });
  }
}

/* ===== FILTROS DE DATA E SERVIÇO ===== */
const inputDataInicial = document.getElementById("dataInicial");
const inputDataFinal = document.getElementById("dataFinal");
const containerFiltroServico = document.getElementById("filtroServico");
const btnLimparDatas = document.getElementById("btnLimparDatas");

if (inputDataInicial && inputDataFinal) {
  const configCalendario = {
    locale: "pt",
    dateFormat: "Y-m-d",
    altInput: true,
    altFormat: "d/m/Y",
    allowInput: false,
    disableMobile: true,
    onChange: function (selectedDates, dateStr, instance) {
      if (instance.element.id === "dataInicial") estado.dataInicial = dateStr;
      if (instance.element.id === "dataFinal") estado.dataFinal = dateStr;
      recarregarListaOS();
    },
  };
  flatpickr(inputDataInicial, configCalendario);
  flatpickr(inputDataFinal, configCalendario);
}

async function popularFiltroServicos() {
  if (!containerFiltroServico) return;
  try {
    const catalogo = await obterCatalogoServicos();
    const options = [{ value: "all", text: "Todos os Serviços" }, ...catalogo.map((s) => ({ value: s.nome, text: s.nome }))];
    const dropdownCustom = criarDropdownCustom({
      id: "filtroServicoSelect",
      name: "filtroServico",
      value: estado.filtroServico || "all",
      options: options,
      className: "h-[34px] text-xs",
    });
    containerFiltroServico.replaceWith(dropdownCustom);
    dropdownCustom.addEventListener("change", () => {
      estado.filtroServico = dropdownCustom.value;
      recarregarListaOS();
    });
  } catch (e) {
    console.error("Erro ao carregar serviços para o filtro", e);
  }
}
popularFiltroServicos();

if (btnLimparDatas) {
  btnLimparDatas.addEventListener("click", () => {
    estado.dataInicial = "";
    estado.dataFinal = "";
    estado.filtroServico = "all";
    if (inputDataInicial && inputDataInicial._flatpickr) inputDataInicial._flatpickr.clear();
    if (inputDataFinal && inputDataFinal._flatpickr) inputDataFinal._flatpickr.clear();
    const selectCustom = document.getElementById("filtroServicoSelect");
    if (selectCustom) selectCustom.value = "all";
    recarregarListaOS();
  });
}

/* ---------- MODAL DE DETALHES E OUTROS EVENTOS ---------- */
document.getElementById("modalDetalhes").addEventListener("click", (e) => {
  if (e.target.id === "modalDetalhes") fecharModal();
});

document.getElementById("lightbox").addEventListener("touchstart", (e) => {
  setTouchStartX(e.changedTouches[0].screenX);
}, { passive: true });

document.getElementById("lightbox").addEventListener("touchend", (e) => {
  setTouchEndX(e.changedTouches[0].screenX);
  import("./state.js").then(({ galeriaLightbox, touchStartX, touchEndX }) => {
    if (galeriaLightbox.length > 1) {
      const limite = 50;
      if (touchEndX < touchStartX - limite) navegarLightbox(1);
      if (touchEndX > touchStartX + limite) navegarLightbox(-1);
    }
  });
}, { passive: true });

window.addEventListener("resize", () => {
  if (window.innerWidth >= 1024) fecharSidebar();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (fecharCamadaSuperior()) e.preventDefault();
    return;
  }
  if (lightboxAberto() && !document.querySelector(".camada-modal")) {
    if (e.key === "ArrowRight") navegarLightbox(1);
    if (e.key === "ArrowLeft") navegarLightbox(-1);
  }
});

const cardFaturamento = document.getElementById("cardFaturamento");
cardFaturamento?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    alternarFaturamento();
  }
});

document.addEventListener("error", (e) => {
    const alvo = e.target;
    if (!(alvo instanceof HTMLImageElement)) return;
    if (alvo.classList.contains("os-foto")) tratarFotoQuebrada(alvo);
    if (alvo.id === "lightboxImg" && alvo.getAttribute("src")) {
      toast("Esta foto não pôde ser carregada. Ela pode ter sido apagada.", "error");
    }
  }, true
);

window.addEventListener("offline", () => {
  toast("Sem conexão com a internet. O app está operando no modo offline.", "error");
});

/* =========================================================
   SINCRONIZAÇÃO OFFLINE (DEXIE)
   ========================================================= */
async function sincronizarFilaOffline() {
  if (!navigator.onLine || !supabaseClient) return;

  const pendentes = await db.sync_queue.toArray();
  if (pendentes.length === 0) return;

  console.log(`Sincronizando ${pendentes.length} alterações pendentes...`);
  toast(`Sincronizando ${pendentes.length} alteração(ões) feita(s) offline...`);

  let sucessos = 0;

  for (const item of pendentes) {
    try {
      if (item.tipo === "UPDATE") {
        const { error } = await supabaseClient.from("ordens_servico").update(item.dados).eq("id", item.osId);
        if (error) throw error;
      }
      await db.sync_queue.delete(item.id); // Remove da fila após sucesso
      sucessos++;
    } catch (err) {
      console.error("Falha ao sincronizar item", item, err);
    }
  }

  if (sucessos > 0) {
    toast(`${sucessos} alteração(ões) sincronizada(s) com o servidor!`);
    carregarDados(); // Recarrega os dados frescos do servidor
  }
}

window.addEventListener("online", () => {
  toast("Conexão restabelecida. Sincronizando…");
  sincronizarFilaOffline();
});

if (exibirFaturamento) {
  agendarBloqueioFaturamento(Number(sessionStorage.getItem("@osfacil_faturamento")));
}

window.addEventListener("osfacil_toast", (e) => {
  toast(e.detail.mensagem, e.detail.tipo);
});

atualizarTudo();
carregarDados();
