import {
  exibirFaturamento,
  resumoDashboard,
  ultimasOS,
  dashboardCarregamento,
  dashboardMensagemErro,
  listaOS,
} from "../state.js";
import {
  esc,
  badge,
  formatarData,
  formatarMoeda,
  numeroExibicao,
} from "../utils.js";
import { imgFoto } from "./helpers.js";
import { estadoHTML, estadoCarregando } from "./estados.js";

export function renderDashboard() {
  const carregado = dashboardCarregamento === "ok" && resumoDashboard;
  const traco = "–";

  document.getElementById("statTotal").textContent = carregado
    ? resumoDashboard.total
    : traco;
  document.getElementById("statPendente").textContent = carregado
    ? resumoDashboard.pendente
    : traco;
  document.getElementById("statAndamento").textContent = carregado
    ? resumoDashboard.andamento
    : traco;

  document.getElementById("statProntas").textContent = carregado
    ? resumoDashboard.prontas || 0
    : traco;

  const faturamentoTotal = carregado
    ? Number(resumoDashboard.faturamento) || 0
    : 0;
  const elFaturamento = document.getElementById("statFaturamento");
  const elIcone = document.getElementById("iconeCadeado");
  const cardFaturamento = document.getElementById("cardFaturamento");

  if (exibirFaturamento && carregado) {
    const texto = formatarMoeda(faturamentoTotal);
    elFaturamento.textContent = texto;
    elFaturamento.title = texto;
    elFaturamento.classList.toggle("valor-longo", texto.length > 13);
    elIcone.className = "fa-solid fa-eye text-xs";
    cardFaturamento?.setAttribute(
      "aria-label",
      `Faturamento ${texto}. Ocultar`,
    );
  } else {
    elFaturamento.textContent = exibirFaturamento ? traco : "••••••";
    elFaturamento.title = "";
    elFaturamento.classList.remove("valor-longo");
    elIcone.className = "fa-solid fa-eye-slash text-xs";
    cardFaturamento?.setAttribute(
      "aria-label",
      "Faturamento oculto. Digite a senha para ver",
    );
  }

  document.getElementById("badgeTotal").textContent = carregado
    ? resumoDashboard.total
    : 0;
  document.getElementById("badgePendente").textContent = carregado
    ? resumoDashboard.pendente
    : 0;
  document.getElementById("badgeAndamento").textContent = carregado
    ? resumoDashboard.andamento
    : 0;
  document.getElementById("badgeConcluido").textContent = carregado
    ? resumoDashboard.concluido
    : 0;

  const container = document.getElementById("recentList");

  if (dashboardCarregamento === "erro") {
    container.innerHTML = estadoHTML({
      icone: "fa-triangle-exclamation",
      titulo: "Não foi possível carregar o resumo",
      texto: esc(dashboardMensagemErro),
      erro: true,
    });
    return;
  }
  if (dashboardCarregamento === "carregando" && !ultimasOS.length) {
    container.innerHTML = estadoCarregando("Carregando ordens de serviço…");
    return;
  }

  const recentes = ultimasOS;
  if (!recentes.length) {
    container.innerHTML = estadoHTML({
      icone: "fa-clipboard-list",
      titulo: "Nenhuma OS cadastrada ainda",
      texto: "As ordens aparecem aqui assim que forem registradas.",
    });
    return;
  }

  container.innerHTML = recentes
    .map((o) => {
      let iconColor = "text-amber-500 bg-amber-50";
      if (o.status === "Em andamento") iconColor = "text-blue-500 bg-blue-50";
      if (o.status === "Concluído") iconColor = "text-green-500 bg-green-50";
      if (o.status === "Cancelado") iconColor = "text-red-500 bg-red-50";

      const isPronto = o.servico_finalizado;

      const foto = o.fotos_urls.length
        ? `<div class="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 shadow-sm flex-shrink-0">${imgFoto(
            o.fotos_urls[0],
            "w-full h-full object-cover",
            o.id,
            0,
          )}</div>`
        : "";

      return `
      <div class="flex flex-col lg:flex-row lg:items-center justify-between px-4 lg:px-6 py-5 hover:bg-slate-50 hover:shadow-md transition-shadow cursor-pointer border-b border-slate-100 last:border-0 group ${isPronto ? "bg-green-50/30" : ""}" onclick="abrirDetalhes(${o.id})">
        <div class="flex items-start lg:items-center gap-3 lg:gap-4 min-w-0">
          ${
            foto ||
            `<div class="w-12 h-12 rounded-xl ${iconColor} flex items-center justify-center flex-shrink-0 border border-white shadow-sm mt-1 lg:mt-0">
                <i class="fa-solid fa-clipboard text-lg" aria-hidden="true"></i>
               </div>`
          }

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap min-w-0">
              <p class="text-base lg:text-lg font-extrabold text-slate-800 truncate max-w-full" title="${esc(o.nome)}">${esc(o.nome) || '<span class="text-slate-400 italic font-medium">Sem nome</span>'}</p>
              <span class="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-md">${esc(numeroExibicao(o))}</span>
              ${isPronto ? `<span class="text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-300 whitespace-nowrap"><i class="fa-solid fa-check-double text-[8px] mr-1"></i>PRONTO</span>` : ""}
            </div>
            <div class="flex items-center gap-1.5 mt-1.5 flex-wrap">
              ${
                o.servico
                  ? `<span class="text-[10px] lg:text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[160px]" title="${esc(o.servico)}">
                <i class="fa-solid fa-wrench text-slate-400 mr-1" aria-hidden="true"></i>${esc(o.servico)}
              </span>`
                  : ""
              }
              ${o.cor ? `<span class="text-[10px] lg:text-[11px] font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 truncate max-w-[140px]"><i class="fa-solid fa-palette mr-1" aria-hidden="true"></i>${esc(o.cor)}</span>` : ""}
              ${
                o.quantidade
                  ? `<span class="text-[10px] lg:text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                <i class="fa-solid fa-hashtag text-slate-400 mr-1" aria-hidden="true"></i>${esc(o.quantidade)}
              </span>`
                  : ""
              }
              <span class="text-base font-bold text-emerald-600 tabular-nums">
                ${formatarMoeda(o.valor)}
              </span>
            </div>
            ${
              o.observacao
                ? `
              <p class="text-[10px] lg:text-[11px] text-slate-500 mt-1.5 line-clamp-1 italic w-full break-words">
                <i class="fa-solid fa-comment-dots mr-1 text-slate-400" aria-hidden="true"></i>${esc(o.observacao)}
              </p>
            `
                : ""
            }
          </div>
        </div>
        <div class="flex items-center gap-3 lg:gap-6 mt-3 lg:mt-0 flex-shrink-0 justify-between pl-14 lg:pl-0">
          
          <div class="flex flex-col lg:items-end">
            ${badge(o.status)}
            <div class="flex items-center gap-2 mt-1 flex-wrap lg:justify-end">
              <p class="text-[10px] lg:text-[11px] text-slate-400 font-medium">
                <i class="fa-regular fa-calendar mr-1" aria-hidden="true"></i>${formatarData(o.created_at)}
              </p>
              ${o.aparelho ? `<span class="text-[9px] lg:text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[140px]" title="Aparelho de origem: ${esc(o.aparelho)}"><i class="fa-solid fa-mobile-screen text-[8px] mr-1" aria-hidden="true"></i>${esc(o.aparelho)}</span>` : ""}
            </div>
          </div>
          <div class="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-200 transition flex-shrink-0">
            <i class="fa-solid fa-chevron-right text-xs" aria-hidden="true"></i>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}
