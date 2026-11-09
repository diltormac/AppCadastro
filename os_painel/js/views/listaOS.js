import { listaOS, estado, temMaisOS, carregandoMaisOS } from "../state.js";
import {
  esc,
  iniciais,
  numeroExibicao,
  formatarMoeda,
  badge,
} from "../utils.js";
import { imgFoto } from "./helpers.js";
import {
  estadoHTML,
  estadoCarregando,
  estadoErro,
  semDadosPorCarregamento,
} from "./estados.js";

function definirEstadoListaOS(html) {
  const empty = document.getElementById("emptyState");
  empty.innerHTML = html;
  empty.classList.remove("hidden");
  document.getElementById("tableBody").innerHTML = "";
  document.getElementById("mobileList").innerHTML = "";
  document.getElementById("desktopOSWrapper").style.display = "none";
  document.getElementById("mobileOSWrapper").style.display = "none";
}

function botaoCarregarMais() {
  if (!temMaisOS) return "";
  const rotulo = carregandoMaisOS
    ? '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Carregando…'
    : '<i class="fa-solid fa-plus" aria-hidden="true"></i> Carregar mais';
  return `
    <div class="flex justify-center py-4">
      <button type="button" onclick="carregarMaisOS()" ${carregandoMaisOS ? "disabled" : ""} class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
        ${rotulo}
      </button>
    </div>`;
}

export function renderOS() {
  if (semDadosPorCarregamento()) {
    definirEstadoListaOS(
      estado.carregamento === "erro"
        ? estadoErro()
        : estadoCarregando("Carregando ordens de serviço…"),
    );
    return;
  }

  const osFiltradas = listaOS;

  if (!osFiltradas.length) {
    const filtrando =
      estado.busca.trim() ||
      estado.filtroStatus !== "all" ||
      estado.dataInicial ||
      estado.dataFinal;
    definirEstadoListaOS(
      filtrando
        ? estadoHTML({
            icone: "fa-magnifying-glass",
            titulo: estado.busca.trim()
              ? `Nenhuma OS encontrada para “${esc(estado.busca.trim())}”`
              : "Nenhuma OS com este status",
            texto: "Confira a digitação ou mude o filtro de status.",
          })
        : estadoHTML({
            icone: "fa-inbox",
            titulo: "Nenhuma OS cadastrada ainda",
            texto: "As ordens aparecem aqui assim que forem registradas.",
          }),
    );
    return;
  }

  document.getElementById("emptyState").classList.add("hidden");
  document.getElementById("desktopOSWrapper").style.display = "";
  document.getElementById("mobileOSWrapper").style.display = "";
  const btnMaisDesktop = document.getElementById("carregarMaisDesktop");
  const btnMaisMobile = document.getElementById("carregarMaisMobile");
  if (btnMaisDesktop) btnMaisDesktop.innerHTML = botaoCarregarMais();
  if (btnMaisMobile) btnMaisMobile.innerHTML = botaoCarregarMais();

  // Tabela desktop
  document.getElementById("tableBody").innerHTML = osFiltradas
    .map((o) => {
      const foto = o.fotos_urls.length
        ? `<div class="w-7 h-7 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">${imgFoto(
            o.fotos_urls[0],
            "w-full h-full object-cover",
            o.id,
            0,
          )}</div>`
        : "";
      return `
      <tr class="table-row align-top hover:bg-slate-50 transition-colors">
        <td class="px-3 py-3 whitespace-nowrap"><span class="text-xs font-bold text-indigo-600">${esc(numeroExibicao(o))}</span></td>
        
        <td class="px-3 py-3">
          <div class="flex items-start gap-2 min-w-[150px]">
            ${
              foto ||
              `<div class="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0 mt-0.5" aria-hidden="true">${iniciais(o.nome)}</div>`
            }
            <span class="text-sm font-semibold text-slate-800 break-words leading-tight tracking-tight" title="${esc(o.nome)}">${esc(o.nome) || '<span class="text-slate-400 italic font-medium">Sem nome</span>'}</span>
          </div>
        </td>
        
        <td class="px-3 py-3 text-xs text-slate-600 whitespace-nowrap tracking-tight">${esc(o.telefone) || "-"}</td>
        
        <td class="px-3 py-3 text-xs text-slate-700 font-medium break-words leading-relaxed min-w-[200px] max-w-[280px]">
          ${esc(o.servico) || "-"}${o.quantidade ? ` <span class="text-slate-400 font-normal">(${esc(o.quantidade)})</span>` : ""}
        </td>
        
        <td class="px-3 py-3 text-xs text-slate-700 font-bold whitespace-nowrap">${esc(o.placa) || "-"}</td>
        
        <td class="px-3 py-3 text-xs text-slate-700 font-medium break-words max-w-[100px]">${esc(o.cor) || "-"}</td>
        
        <td class="px-3 py-3 text-xs text-slate-500 font-medium whitespace-nowrap tracking-tight" title="${esc(o.aparelho)}">${esc(o.aparelho) || "-"}</td>
        
        <td class="px-3 py-3 text-xs font-bold text-emerald-600 text-right whitespace-nowrap tabular-nums tracking-tight">${formatarMoeda(o.valor)}</td>
        
        <td class="px-3 py-3 text-center whitespace-nowrap">${badge(o.status)}</td>
        
        <td class="px-3 py-3 text-right whitespace-nowrap">
          <button onclick="abrirDetalhes(${o.id})" class="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-600 inline-flex items-center justify-center transition" title="Ver / Editar" aria-label="Editar OS de ${esc(o.nome) || "cliente sem nome"}">
            <i class="fa-solid fa-pen-to-square text-sm" aria-hidden="true"></i>
          </button>
        </td>
      </tr>
    `;
    })
    .join("");

  // Cards mobile
  document.getElementById("mobileList").innerHTML = osFiltradas
    .map((o) => {
      const foto = o.fotos_urls.length
        ? `<div class="w-10 h-10 rounded-full overflow-hidden border border-slate-200 flex-shrink-0">${imgFoto(
            o.fotos_urls[0],
            "w-full h-full object-cover",
            o.id,
            0,
          )}</div>`
        : "";
      return `
      <div class="bg-white border border-slate-200 rounded-2xl p-4 active:bg-slate-50 transition cursor-pointer" onclick="abrirDetalhes(${o.id})">
        <div class="flex items-start justify-between gap-3 mb-3">
          <div class="flex items-center gap-2.5 min-w-0 flex-1">
            ${
              foto ||
              `<div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0" aria-hidden="true">${iniciais(o.nome)}</div>`
            }
            <div class="min-w-0">
              <p class="text-sm font-bold text-slate-800 truncate">${esc(o.nome) || '<span class="text-slate-400 italic font-medium">Sem nome</span>'}</p>
              <p class="text-[11px] text-slate-500 truncate">${esc(o.telefone) || "-"}</p>
            </div>
          </div>
          <span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md flex-shrink-0">${esc(numeroExibicao(o))}</span>
        </div>

        <div class="flex flex-wrap gap-2 mb-3">
          <div class="bg-slate-50 rounded-lg px-2.5 py-1.5 flex-1 min-w-[120px]">
            <p class="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Serviço</p>
            <p class="text-[11px] font-medium text-slate-700 leading-tight">${esc(o.servico) || "-"}${o.quantidade ? ` (Qtd: ${esc(o.quantidade)})` : ""}</p>
          </div>
          ${
            o.placa
              ? `
          <div class="bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 flex-1 min-w-[120px]">
            <p class="text-[9px] uppercase text-emerald-600 font-bold tracking-wider">Placa</p>
            <p class="text-[11px] font-bold text-emerald-700 truncate">${esc(o.placa)}</p>
          </div>`
              : ""
          }
          ${
            o.cor
              ? `
          <div class="bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5 flex-1 min-w-[120px]">
            <p class="text-[9px] uppercase text-indigo-400 font-bold tracking-wider">Cor</p>
            <p class="text-[11px] font-semibold text-indigo-700 truncate">${esc(o.cor)}</p>
          </div>`
              : ""
          }
          <div class="bg-slate-50 rounded-lg px-2.5 py-1.5 flex-1 min-w-[120px]">
            <p class="text-[9px] uppercase text-slate-400 font-bold tracking-wider">Aparelho Origem</p>
            <p class="text-[11px] font-medium text-slate-700 truncate" title="${esc(o.aparelho) || "-"}"><i class="fa-solid fa-mobile-screen text-[9px] mr-1 text-slate-400" aria-hidden="true"></i>${esc(o.aparelho) || "-"}</p>
          </div>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-slate-100">
          ${badge(o.status)}
          <p class="text-sm font-bold text-emerald-600 tabular-nums">${formatarMoeda(o.valor)}</p>
        </div>
      </div>
    `;
    })
    .join("");
}
