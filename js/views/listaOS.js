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

  // ==========================================
  // TABELA DESKTOP
  // ==========================================
  document.getElementById("tableBody").innerHTML = osFiltradas
    .map((o) => {
      const foto = o.fotos_urls.length
        ? `<div class="w-8 h-8 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 shadow-sm">${imgFoto(
            o.fotos_urls[0],
            "w-full h-full object-cover",
            o.id,
            0,
          )}</div>`
        : "";

      const isPronto = o.servico_finalizado;

      // Tag PRONTO formatada para ficar ao lado do nome de forma limpa
      const tagPronto = isPronto
        ? `<span class="inline-flex items-center justify-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 whitespace-nowrap w-max mt-1"><i class="fa-solid fa-check-double text-[8px]"></i> PRONTO</span>`
        : "";

      // Lógica de cores da linha (Desktop)
      let rowBgClass = "hover:bg-slate-50";
      let borderLeftClass = "border-l-4 border-transparent";

      if (o.status === "Pendente") {
        rowBgClass = "bg-amber-50/30 hover:bg-amber-50/60";
        borderLeftClass = "border-l-4 border-amber-400";
      } else if (o.status === "Em andamento") {
        rowBgClass = "bg-blue-50/30 hover:bg-blue-50/60";
        borderLeftClass = "border-l-4 border-blue-400";
      } else if (o.status === "Concluído") {
        rowBgClass = "hover:bg-slate-50";
        borderLeftClass = "border-l-4 border-green-400";
      } else if (o.status === "Cancelado") {
        rowBgClass = "bg-red-50/30 hover:bg-red-50/60";
        borderLeftClass = "border-l-4 border-red-400";
      }

      // CORREÇÃO: Prioriza o registro_os, senão o gerado automático, senão o ID.
      const numeroExibir =
        o.registro_os || o.numero_os_conserto || o.numero_os || `#${o.id}`;

      return `
      <!-- Mudança: align-middle para centralizar tudo verticalmente -->
      <tr class="table-row align-middle transition-colors ${rowBgClass} ${isPronto ? "bg-green-50/30" : ""}">
        
        <!-- Nº OS -->
        <td class="px-3 py-4 whitespace-nowrap ${borderLeftClass}">
          <div class="flex flex-col">
            ${
              o.numero_venda
                ? `<span class="text-xs font-bold text-emerald-600" title="Nº da Venda">${esc(o.numero_venda)}</span>
                   <span class="text-[10px] text-slate-400 font-medium" title="Registro / ID">${esc(numeroExibir)}</span>`
                : `<span class="text-xs font-bold text-indigo-600">${esc(numeroExibir)}</span>`
            }
          </div>
        </td>
        
               <!-- Cliente (Nome em cima, PRONTO embaixo) -->
        <td class="px-3 py-3">
          <div class="flex items-center gap-2 min-w-[180px] max-w-[250px]">
            ${
              foto ||
              `<div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 flex-shrink-0" aria-hidden="true">${iniciais(o.nome)}</div>`
            }
            
            <!-- MUDANÇA AQUI: flex-col para empilhar o nome e o balão -->
            <div class="flex flex-col items-start min-w-0">
              <span class="text-sm font-semibold text-slate-800 truncate max-w-full" title="${esc(o.nome)}">${esc(o.nome) || '<span class="text-slate-400 italic font-medium">Sem nome</span>'}</span>
              ${tagPronto}
            </div>
          </div>
        </td>
        
        <!-- Telefone -->
        <td class="px-3 py-4 text-xs text-slate-600 whitespace-nowrap tracking-tight">${esc(o.telefone) || "-"}</td>
        
        <!-- Serviço -->
        <td class="px-3 py-4 text-xs text-slate-700 font-medium break-words leading-relaxed min-w-[180px] max-w-[240px]">
          ${esc(o.servico) || "-"}${o.quantidade ? ` <span class="text-slate-400 font-normal">(${esc(o.quantidade)})</span>` : ""}
        </td>
        
        <!-- Placa -->
        <td class="px-3 py-4 text-xs text-slate-700 font-bold whitespace-nowrap">${esc(o.placa) || "-"}</td>
        
        <!-- Cor (Largura controlada) -->
        <td class="px-3 py-4 text-xs text-slate-700 font-medium break-words min-w-[100px] max-w-[130px] leading-tight">${esc(o.cor) || "-"}</td>
        
        <!-- Origem -->
        <td class="px-3 py-4 text-xs text-slate-500 font-medium whitespace-nowrap tracking-tight" title="${esc(o.aparelho)}">${esc(o.aparelho) || "-"}</td>
        
        <!-- Valor -->
        <td class="px-3 py-4 text-xs font-bold text-emerald-600 text-right whitespace-nowrap tabular-nums tracking-tight">${formatarMoeda(o.valor)}</td>
        
        <!-- Status -->
        <td class="px-3 py-4 text-center whitespace-nowrap">${badge(o.status)}</td>
        
        <!-- Ações -->
        <td class="px-3 py-4 text-right whitespace-nowrap">
          <button onclick="abrirDetalhes(${o.id})" class="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-600 inline-flex items-center justify-center transition" title="Ver / Editar" aria-label="Editar OS de ${esc(o.nome) || "cliente sem nome"}">
            <i class="fa-solid fa-pen-to-square text-sm" aria-hidden="true"></i>
          </button>
        </td>
      </tr>
    `;
    })
    .join("");

  // ==========================================
  // CARDS MOBILE
  // ==========================================
  document.getElementById("mobileList").innerHTML = osFiltradas
    .map((o) => {
      const foto = o.fotos_urls.length
        ? `<div class="w-10 h-10 rounded-full overflow-hidden border border-slate-200 flex-shrink-0 shadow-sm">${imgFoto(
            o.fotos_urls[0],
            "w-full h-full object-cover",
            o.id,
            0,
          )}</div>`
        : "";

      const isPronto = o.servico_finalizado;

      // Lógica de cores do card (Mobile)
      let corCard = "border-slate-200 shadow-sm";
      if (isPronto) {
        corCard = "border-green-400 shadow-green-100";
      } else if (o.status === "Pendente") {
        corCard = "border-amber-300 shadow-amber-50";
      } else if (o.status === "Em andamento") {
        corCard = "border-blue-300 shadow-blue-50";
      } else if (o.status === "Cancelado") {
        corCard = "border-red-300 shadow-red-50";
      }

      // CORREÇÃO: Prioriza o registro_os, senão o gerado automático, senão o ID.
      const numeroExibir =
        o.registro_os || o.numero_os_conserto || o.numero_os || `#${o.id}`;

      return `
      <div class="bg-white border ${corCard} rounded-2xl p-4 active:bg-slate-50 transition cursor-pointer shadow-sm relative overflow-hidden" onclick="abrirDetalhes(${o.id})">
        
        ${isPronto ? `<div class="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg"><i class="fa-solid fa-check-double mr-1"></i>PRONTO</div>` : ""}

        <div class="flex items-start justify-between gap-3 mb-3 mt-1">
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
          
          <div class="flex flex-col items-end flex-shrink-0 pr-6">
            ${
              o.numero_venda
                ? `<span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md" title="Nº da Venda">Venda: ${esc(o.numero_venda)}</span>
                   <span class="text-[9px] text-slate-400 font-medium mt-0.5" title="Registro / ID">${esc(numeroExibir)}</span>`
                : `<span class="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">${esc(numeroExibir)}</span>`
            }
          </div>
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
