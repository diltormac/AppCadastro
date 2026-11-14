import { listaOS, estado } from "../state.js";
import { esc } from "../utils.js";

export function estadoHTML({ icone, titulo, texto, erro = false, acao = "" }) {
  return `
    <div class="px-5 py-14 text-center" ${erro ? 'role="alert"' : ""}>
      <div class="w-14 h-14 rounded-full ${erro ? "bg-red-50" : "bg-slate-100"} flex items-center justify-center mx-auto mb-3">
        <i class="fa-solid ${icone} text-xl ${erro ? "text-red-500" : "text-slate-400"}" aria-hidden="true"></i>
      </div>
      <p class="text-sm font-semibold text-slate-700">${titulo}</p>
      ${texto ? `<p class="text-xs text-slate-500 mt-1 max-w-sm mx-auto">${texto}</p>` : ""}
      ${acao}
    </div>`;
}

export const botaoTentarDeNovo = `
  <button type="button" onclick="carregarDados()" class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition">
    <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Tentar de novo
  </button>`;

export function estadoCarregando(texto) {
  return estadoHTML({ icone: "fa-spinner fa-spin", titulo: texto });
}

export function estadoErro() {
  return estadoHTML({
    icone: "fa-triangle-exclamation",
    titulo: "Não foi possível carregar as ordens",
    texto: esc(estado.mensagemErro),
    erro: true,
    acao: botaoTentarDeNovo,
  });
}

export function semDadosPorCarregamento() {
  return !listaOS.length && estado.carregamento !== "ok";
}
