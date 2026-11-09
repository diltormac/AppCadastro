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
} from "./ui.js";
import { setTouchStartX, setTouchEndX, exibirFaturamento } from "./state.js";
import { toast } from "./utils.js";
import { criarDropdownCustom } from "./views/dropdownCustom.js";
import { obterCatalogoServicos } from "./catalogoStore.js";

/* ---------- DETECÇÃO DE ELECTRON ---------- */
if (navigator.userAgent.includes("Electron")) {
  document.body.classList.add("is-electron");
}

/* ---------- NAVEGAÇÃO ---------- */
function mudarView(view) {
  estado.view = view;
  document
    .querySelectorAll(".sidebar-link[data-view]")
    .forEach((el) => el.classList.remove("active"));
  const activeLink = document.querySelector(
    `.sidebar-link[data-view="${view}"]`,
  );
  if (activeLink) activeLink.classList.add("active");

  document.getElementById("viewDashboard").classList.add("hidden");
  document.getElementById("viewOS").classList.add("hidden");
  document.getElementById("viewFotos").classList.add("hidden");

  if (view === "dashboard") {
    document.getElementById("viewDashboard").classList.remove("hidden");
    document.getElementById("pageTitle").textContent = "Dashboard";
    document.getElementById("pageSubtitle").textContent =
      "Visão geral das ordens de serviço";
  } else if (view === "os") {
    document.getElementById("viewOS").classList.remove("hidden");
    document.getElementById("pageTitle").textContent = "Todas as OS";
    document.getElementById("pageSubtitle").textContent =
      "Gerencie as ordens de serviço";
  } else if (view === "fotos") {
    document.getElementById("viewFotos").classList.remove("hidden");
    document.getElementById("pageTitle").textContent = "Galeria de Fotos";
    document.getElementById("pageSubtitle").textContent =
      "Todas as imagens enviadas";
  }

  fecharSidebar();
}

/* ---------- EXPÕE FUNÇÕES USADAS EM onclick DO HTML ---------- */
Object.assign(window, {
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
  carregarDados,
  carregarMaisOS,
  carregarMaisGaleria,
  mudarView,
});

Object.assign(window, {
  abrirRelatorioOS: (id) => {
    import("./state.js").then(({ listaOS }) => {
      const os = listaOS.find((o) => o.id === id);
      if (os) {
        abrirRelatorio(os);
      } else {
        import("./utils.js").then(({ toast }) => {
          toast("OS não encontrada.", "error");
        });
      }
    });
  },
});

/* ---------- EVENTOS ---------- */
document.querySelectorAll(".sidebar-link[data-view]").forEach((el) => {
  el.addEventListener("click", () => mudarView(el.dataset.view));
});

document.querySelectorAll(".sidebar-link[data-filter]").forEach((el) => {
  el.addEventListener("click", () => {
    estado.filtroStatus = el.dataset.filter;
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    const match = document.querySelector(
      `.filter-btn[data-status="${el.dataset.filter}"]`,
    );
    if (match) match.classList.add("active");
    mudarView("os");
    recarregarListaOS();
  });
});

document.querySelectorAll(".filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".filter-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    estado.filtroStatus = btn.dataset.status;
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

// 1. Inicializa o Calendário Customizado (Flatpickr)
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

// 2. Substitui o <select> nativo por um dropdown customizado
async function popularFiltroServicos() {
  if (!containerFiltroServico) return;

  try {
    const catalogo = await obterCatalogoServicos();

    const options = [
      { value: "all", text: "Todos os Serviços" },
      ...catalogo.map((s) => ({ value: s.nome, text: s.nome })),
    ];

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

// 3. Botão de limpar filtros (ajustado para Flatpickr e Dropdown custom)
if (btnLimparDatas) {
  btnLimparDatas.addEventListener("click", () => {
    estado.dataInicial = "";
    estado.dataFinal = "";
    estado.filtroServico = "all";

    if (inputDataInicial && inputDataInicial._flatpickr)
      inputDataInicial._flatpickr.clear();
    if (inputDataFinal && inputDataFinal._flatpickr)
      inputDataFinal._flatpickr.clear();

    const selectCustom = document.getElementById("filtroServicoSelect");
    if (selectCustom) selectCustom.value = "all";

    recarregarListaOS();
  });
}

/* ---------- MODAL DE DETALHES E OUTROS EVENTOS ---------- */
document.getElementById("modalDetalhes").addEventListener("click", (e) => {
  if (e.target.id === "modalDetalhes") fecharModal();
});

document.getElementById("lightbox").addEventListener(
  "touchstart",
  (e) => {
    setTouchStartX(e.changedTouches[0].screenX);
  },
  { passive: true },
);

document.getElementById("lightbox").addEventListener(
  "touchend",
  (e) => {
    setTouchEndX(e.changedTouches[0].screenX);
    import("./state.js").then(({ galeriaLightbox, touchStartX, touchEndX }) => {
      if (galeriaLightbox.length > 1) {
        const limite = 50;
        if (touchEndX < touchStartX - limite) navegarLightbox(1);
        if (touchEndX > touchStartX + limite) navegarLightbox(-1);
      }
    });
  },
  { passive: true },
);

window.addEventListener("resize", () => {
  if (window.innerWidth >= 1024) fecharSidebar();
});

/* Teclado: Esc fecha a camada de cima; setas navegam no lightbox. */
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

/* Card de faturamento acionável pelo teclado (Enter ou Espaço). */
const cardFaturamento = document.getElementById("cardFaturamento");
cardFaturamento?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    alternarFaturamento();
  }
});

/* Fotos que não carregam (apagadas do armazenamento ou sem internet). */
document.addEventListener(
  "error",
  (e) => {
    const alvo = e.target;
    if (!(alvo instanceof HTMLImageElement)) return;
    if (alvo.classList.contains("os-foto")) tratarFotoQuebrada(alvo);
    if (alvo.id === "lightboxImg" && alvo.getAttribute("src")) {
      toast(
        "Esta foto não pôde ser carregada. Ela pode ter sido apagada.",
        "error",
      );
    }
  },
  true,
);

/* Rede caiu / voltou enquanto o app está aberto. */
window.addEventListener("offline", () => {
  toast(
    "Sem conexão com a internet. As alterações não serão salvas até a rede voltar.",
    "error",
  );
});
window.addEventListener("online", () => {
  toast("Conexão restabelecida. Atualizando…");
  carregarDados();
});

/* Faturamento liberado volta a ficar oculto no horário marcado. */
if (exibirFaturamento) {
  agendarBloqueioFaturamento(
    Number(sessionStorage.getItem("@osfacil_faturamento")),
  );
}

/* ---- ESCUTA O EVENTO DO COMPARTILHAMENTO (Substitui o prompt nativo) ---- */
window.addEventListener("osfacil_toast", (e) => {
  toast(e.detail.mensagem, e.detail.tipo);
});

atualizarTudo(); // mostra "Carregando…" enquanto a consulta não volta
carregarDados();
