// Estado global compartilhado entre os módulos
export let listaOS = [];
export let estado = {
  view: "dashboard",
  filtroStatus: "all",
  filtroServico: "all",
  filtroFinalizado: "all",
  busca: "",
  ordenacao: "data-desc",
  dataInicial: "",
  dataFinal: "",
  // "carregando" | "ok" | "erro"
  carregamento: "carregando",
  mensagemErro: "",
};

// Paginação da lista de OS (view "Todas as OS")
export const TAMANHO_PAGINA_OS = 20;
export let paginaOS = 0;
export let temMaisOS = false;
export let carregandoMaisOS = false;

// Paginação da galeria
export const TAMANHO_PAGINA_GALERIA = 20;
export let galeriaFotos = [];
export let paginaGaleria = 0;
export let temMaisGaleria = false;
export let carregandoMaisGaleria = false;
export let galeriaCarregamento = "carregando";
export let galeriaMensagemErro = "";

// Dashboard independente da paginação
export let resumoDashboard = null;
export let ultimasOS = [];
export let dashboardCarregamento = "carregando";
export let dashboardMensagemErro = "";

// Guarda o horário em que o faturamento liberado volta a ficar oculto.
export let exibirFaturamento =
  Number(sessionStorage.getItem("@osfacil_faturamento")) > Date.now();

export let galeriaLightbox = [];
export let indexLightboxAtual = 0;
export let touchStartX = 0;
export let touchEndX = 0;

// Cópia de trabalho dos itens da OS aberta no modal. Só vai para a lista
// (e para o faturamento) quando o usuário clica em "Salvar Alterações".
export let itensRascunho = [];

export function setListaOS(novaLista) {
  listaOS = novaLista;
}

export function adicionarListaOS(novos) {
  listaOS = listaOS.concat(novos);
}

export function setPaginaOS(v) {
  paginaOS = v;
}
export function setTemMaisOS(v) {
  temMaisOS = v;
}
export function setCarregandoMaisOS(v) {
  carregandoMaisOS = v;
}

export function setGaleriaFotos(v) {
  galeriaFotos = v;
}
export function adicionarGaleriaFotos(novos) {
  galeriaFotos = galeriaFotos.concat(novos);
}
export function setPaginaGaleria(v) {
  paginaGaleria = v;
}
export function setTemMaisGaleria(v) {
  temMaisGaleria = v;
}
export function setCarregandoMaisGaleria(v) {
  carregandoMaisGaleria = v;
}
export function setGaleriaCarregamento(v) {
  galeriaCarregamento = v;
}
export function setGaleriaMensagemErro(v) {
  galeriaMensagemErro = v;
}

export function setResumoDashboard(v) {
  resumoDashboard = v;
}
export function setUltimasOS(v) {
  ultimasOS = v;
}
export function setDashboardCarregamento(v) {
  dashboardCarregamento = v;
}
export function setDashboardMensagemErro(v) {
  dashboardMensagemErro = v;
}

export function setExibirFaturamento(valor) {
  exibirFaturamento = valor;
}

export function setGaleriaLightbox(novaGaleria) {
  galeriaLightbox = novaGaleria;
}

export function setIndexLightboxAtual(index) {
  indexLightboxAtual = index;
}

export function setTouchStartX(x) {
  touchStartX = x;
}

export function setTouchEndX(x) {
  touchEndX = x;
}

export function setItensRascunho(itens) {
  itensRascunho = itens;
}
