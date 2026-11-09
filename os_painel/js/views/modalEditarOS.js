import { listaOS, itensRascunho, setItensRascunho } from "../state.js";
import {
  esc,
  urlSegura,
  numeroExibicao,
  ehConsertoOuSolda,
  formatarData,
  formatarMoeda,
  lerValor,
  toast,
  confirmarAcao,
} from "../utils.js";
import { fecharCamadaPorId } from "./helpers.js";
import { compartilharTexto } from "../compartilhamento.js";
import { criarDropdownCustom } from "./dropdownCustom.js";
import { supabaseClient } from "../config.js";
import { abrirRelatorio } from "./relatorio.js";

let fotografiaFormulario = "";

export function formatarValorCampo(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  });
}

export function recalcularValorDoRascunho() {
  const total = itensRascunho.reduce(
    (acc, i) => acc + (Number(i.valor) || 0),
    0,
  );
  const campo = document.getElementById("editValor");
  if (campo) campo.value = formatarValorCampo(total);
}

function itemHTML(item, idx) {
  return `
    <div class="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
      
      <!-- Nome do Serviço -->
      <div class="flex-1 min-w-0 pr-2">
        <span class="font-bold text-slate-800 truncate block" title="${esc(item.servico) || "Serviço sem nome"}">
          ${esc(item.servico) || "Serviço sem nome"}
        </span>
        ${item.cor ? `<span class="text-[10px] text-indigo-600 font-medium truncate block mt-0.5">Cor: ${esc(item.cor)}</span>` : ""}
        ${item.placa ? `<span class="text-[10px] text-emerald-600 font-medium truncate block mt-0.5">Placa: ${esc(item.placa)}</span>` : ""}
      </div>
      
      <!-- Quantidade -->
      <div class="w-8 text-center text-slate-500 font-semibold flex-shrink-0">
        ${esc(item.quantidade ?? 1)}
      </div>
      
      <!-- Valor -->
      <div class="w-20 text-right font-bold text-emerald-600 tabular-nums flex-shrink-0">
        ${formatarMoeda(item.valor)}
      </div>
      
      <!-- Botões de Ação -->
      <div class="flex items-center justify-center gap-1 flex-shrink-0 w-[56px]">
        <button type="button" onclick="modalEditarItem(${idx})" class="text-indigo-600 hover:text-indigo-800 p-1 transition-colors" title="Editar item" aria-label="Editar quantidade e valor de ${esc(item.servico)}">
          <i class="fa-solid fa-pen text-[12px]" aria-hidden="true"></i>
        </button>
        <button type="button" onclick="modalRemoverItem(0, ${idx})" class="text-red-500 hover:text-red-700 p-1 transition-colors" title="Excluir este item" aria-label="Excluir ${esc(item.servico)}">
          <i class="fa-solid fa-trash-can text-[12px]" aria-hidden="true"></i>
        </button>
      </div>
      
    </div>`;
}

export function atualizarHTMLItensModal() {
  const container = document.getElementById("modalItensContainer");
  if (!container) return;

  if (!itensRascunho.length) {
    container.innerHTML = `<p class="text-xs text-slate-500 italic">Nenhum item detalhado.</p>`;
    return;
  }

  const cabecalho = `
    <div class="flex items-center justify-between gap-2 px-2.5 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
      <span class="flex-1">Serviço</span>
      <span class="w-8 text-center">Qtd</span>
      <span class="w-20 text-right">Valor</span>
      <span class="w-[56px] text-center">Ação</span>
    </div>`;

  container.innerHTML = cabecalho + itensRascunho.map(itemHTML).join("");
}

/* =========================================================
   REMOVER ITEM (COM CONFIRMAÇÃO)
   ========================================================= */
export async function modalRemoverItem(_osId, index) {
  const item = itensRascunho[index];
  if (!item) return;

  const continuar = await confirmarAcao({
    titulo: "Remover Serviço",
    mensagem: `Tem certeza que deseja remover o serviço "${esc(item.servico) || "Sem nome"}"?`,
    textoBotao: "Sim, Remover",
    icone: "fa-trash-can",
    cor: "red",
  });

  if (!continuar) return;

  setItensRascunho(itensRascunho.filter((_, i) => i !== index));
  recalcularValorDoRascunho();
  atualizarHTMLItensModal();
  toast("Serviço removido da lista.");
}

/* =========================================================
   EDITAR ITEM (QUANTIDADE E VALOR JUNTOS COM CÁLCULO AUTO)
   ========================================================= */
export function modalEditarItem(index) {
  fecharCamadaPorId("modalEditarItem");
  const item = itensRascunho[index];
  if (!item) {
    toast("Este item não existe mais. Reabra a OS.", "error");
    return;
  }

  const divEditar = document.createElement("div");
  divEditar.id = "modalEditarItem";
  divEditar.className =
    "camada-modal fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4";
  divEditar.innerHTML = `
    <form class="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4" role="dialog" aria-modal="true" aria-labelledby="tituloEditarItem" novalidate>
      <h3 id="tituloEditarItem" class="font-bold text-slate-800 text-base flex items-center justify-between">
        <span><i class="fa-solid fa-pen mr-2 text-indigo-600" aria-hidden="true"></i>Editar Serviço</span>
        <button type="button" data-acao="fechar" class="text-slate-400 hover:text-slate-600 w-8 h-8 inline-flex items-center justify-center rounded-lg" aria-label="Fechar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </h3>

      <p class="text-xs text-slate-500 truncate" title="${esc(item.servico) || "Serviço sem nome"}">${esc(item.servico) || "Serviço sem nome"}</p>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="editQtdItem" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Quantidade</label>
          <input type="number" id="editQtdItem" class="edit-input text-xs font-bold" value="${esc(item.quantidade ?? 1)}" min="1" max="999" step="1" />
        </div>
        <div>
          <label for="editValorItem" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Valor Total (R$)</label>
          <input type="text" inputmode="decimal" id="editValorItem" class="edit-input text-xs font-bold text-emerald-600" value="${esc(formatarValorCampo(item.valor))}" />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" data-acao="cancelar" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition">Cancelar</button>
        <button type="submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm">Salvar Alterações</button>
      </div>
    </form>
  `;
  document.body.appendChild(divEditar);

  const form = divEditar.querySelector("form");
  const inputQtd = divEditar.querySelector("#editQtdItem");
  const inputValor = divEditar.querySelector("#editValorItem");
  const fechar = () => divEditar.remove();
  divEditar.fecharCamada = fechar;

  // Variável para guardar o valor de 1 unidade e calcular automaticamente
  let valorUnitarioBase =
    (Number(item.valor) || 0) / (Number(item.quantidade) || 1);
  let ignorarMascara = false;

  const atualizarCampoValor = (valorTotal) => {
    ignorarMascara = true;
    inputValor.value = formatarValorCampo(valorTotal);
    ignorarMascara = false;
  };

  inputQtd.addEventListener("input", () => {
    const qtd = parseInt(inputQtd.value, 10);
    if (!isNaN(qtd) && qtd > 0) {
      atualizarCampoValor(valorUnitarioBase * qtd);
    }
  });

  inputValor.addEventListener("input", (e) => {
    if (ignorarMascara) return;

    let v = e.target.value.replace(/\D/g, "");
    v = (v / 100).toFixed(2) + "";
    v = v.replace(".", ",");
    v = v.replace(/(\d)(\d{3})(\d{3}),/g, "$1.$2.$3,");
    v = v.replace(/(\d)(\d{3}),/g, "$1.$2,");
    e.target.value = v;

    const qtd = parseInt(inputQtd.value, 10) || 1;
    const total = lerValor(v) || 0;
    valorUnitarioBase = total / qtd;
  });

  divEditar.addEventListener("click", (e) => {
    if (e.target === divEditar) fechar();
  });
  divEditar.querySelector('[data-acao="fechar"]').onclick = fechar;
  divEditar.querySelector('[data-acao="cancelar"]').onclick = fechar;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const novaQtd = parseInt(inputQtd.value, 10);
    if (!Number.isInteger(novaQtd) || novaQtd < 1 || novaQtd > 999) {
      toast("Quantidade inválida. Use um número inteiro de 1 a 999.", "error");
      inputQtd.focus();
      return;
    }

    const novoValor = lerValor(inputValor.value);
    if (novoValor === null || novoValor < 0) {
      toast("Valor inválido. Use apenas números, ex: 80,00.", "error");
      inputValor.focus();
      return;
    }

    const atualizado = itensRascunho.map((i, idx) =>
      idx === index ? { ...i, quantidade: novaQtd, valor: novoValor } : i,
    );
    setItensRascunho(atualizado);
    recalcularValorDoRascunho();
    atualizarHTMLItensModal();
    fechar();
    toast("Serviço atualizado!");
  });

  inputQtd.focus();
  inputQtd.select();
}

function lerFormulario() {
  const ids = [
    "editNumeroOS",
    "editStatus",
    "editNome",
    "editTelefone",
    "editCor",
    "editPlaca", // <-- ADICIONADO AQUI
    "editValor",
    "editObservacao",
  ];
  return JSON.stringify({
    campos: ids.map((id) => document.getElementById(id)?.value ?? ""),
    itens: itensRascunho,
  });
}

function formularioAlterado() {
  return (
    document.getElementById("modalDetalhes").classList.contains("show") &&
    fotografiaFormulario !== "" &&
    lerFormulario() !== fotografiaFormulario
  );
}

export async function abrirDetalhes(idOuObjeto) {
  let os = null;
  if (typeof idOuObjeto === "object" && idOuObjeto !== null) {
    os = idOuObjeto;
  } else {
    os = listaOS.find((o) => o.id === idOuObjeto);
  }

  if (!os) {
    toast("Esta OS não existe mais. Atualize a lista.", "error");
    return;
  }

  const id = os.id;

  if (!os.itens_servicos || !os.telefone) {
    toast("Carregando dados da OS...");
    try {
      const { data, error } = await supabaseClient
        .from("ordens_servico")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (data) os = data;
    } catch (err) {
      console.error("Erro ao buscar OS completa:", err);
      toast(
        "Erro ao carregar os detalhes completos. Tente novamente.",
        "error",
      );
      return;
    }
  }

  setItensRascunho(
    (Array.isArray(os.itens_servicos) ? os.itens_servicos : []).map((i) => ({
      ...i,
    })),
  );

  document.getElementById("modalTitle").textContent =
    `Editar OS ${numeroExibicao(os)}`;

  const aparelhoDiscreto = os.aparelho
    ? `<span class="ml-2 bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded border border-slate-200"><i class="fa-solid fa-mobile-screen mr-1" aria-hidden="true"></i>${esc(os.aparelho)}</span>`
    : "";
  document.getElementById("modalSubtitle").innerHTML =
    `Criada em ${formatarData(os.created_at)} ${aparelhoDiscreto}`;

  const conserto = ehConsertoOuSolda(os);
  const numeroOSExibido = conserto
    ? os.numero_os_conserto || os.numero_os || ""
    : os.numero_os || "";

  const fotosValidas = (os.fotos_urls || [])
    .map((url, idx) => ({ url, idx }))
    .filter(({ url }) => urlSegura(url));
  const fotosHTML = fotosValidas.length
    ? `<div class="grid grid-cols-2 sm:grid-cols-4 gap-2">${fotosValidas
        .map(
          ({ url, idx }) =>
            `<button type="button" class="block overflow-hidden rounded-[10px]" onclick="abrirLightboxPorOS(${os.id}, ${idx})" aria-label="Ampliar foto ${idx + 1}"><img src="${urlSegura(url)}" alt="Foto ${idx + 1} da OS" loading="lazy" decoding="async" class="os-foto photo-thumb cursor-pointer transition-transform duration-300 hover:scale-125"></button>`,
        )
        .join("")}</div>`
    : `<p class="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-lg text-center">Nenhuma foto cadastrada nesta OS.</p>`;

  document.getElementById("modalBody").innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div>
        <label for="editNumeroOS" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
          ${conserto ? "Número da OS (Conserto/Solda)" : "Número da OS"}
        </label>
        <div class="relative flex items-center">
          <input type="text" id="editNumeroOS" maxlength="30" value="${esc(numeroOSExibido)}" class="edit-input font-bold text-indigo-600 pr-10" placeholder="Ex: OS-1024" />
          <button type="button" onclick="copiarCampo('editNumeroOS')" class="absolute right-2 text-slate-400 hover:text-indigo-600 p-1" title="Copiar Número da OS" aria-label="Copiar número da OS">
            <i class="fa-solid fa-copy text-sm" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <div>
        <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Status</label>
        <div id="editStatus"></div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div>
        <label for="editNome" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nome do Cliente</label>
        <div class="relative flex items-center">
          <input type="text" id="editNome" maxlength="120" value="${esc(os.nome)}" class="edit-input pr-10" />
          <button type="button" onclick="copiarCampo('editNome')" class="absolute right-2 text-slate-400 hover:text-indigo-600 p-1" title="Copiar Nome" aria-label="Copiar nome">
            <i class="fa-solid fa-copy text-sm" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <div>
        <label for="editTelefone" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Telefone</label>
        <div class="relative flex items-center">
          <input type="tel" id="editTelefone" maxlength="30" value="${esc(os.telefone)}" class="edit-input pr-10" />
          <button type="button" onclick="copiarCampo('editTelefone')" class="absolute right-2 text-slate-400 hover:text-indigo-600 p-1" title="Copiar Telefone" aria-label="Copiar telefone">
            <i class="fa-solid fa-copy text-sm" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- CAMPOS DE COR E PLACA -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div>
        <label for="editCor" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Cor</label>
        <input type="text" id="editCor" maxlength="50" value="${esc(os.cor || "")}" class="edit-input" />
      </div>
      
      <!-- NOVO CAMPO DE PLACA -->
      <div>
        <label for="editPlaca" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Placa</label>
        <div class="relative flex items-center">
          <input type="text" id="editPlaca" maxlength="8" value="${esc(os.placa || "")}" class="edit-input pr-10" placeholder="Ex: ABC1D23" />
          <button type="button" onclick="copiarCampo('editPlaca')" class="absolute right-2 text-slate-400 hover:text-indigo-600 p-1" title="Copiar Placa" aria-label="Copiar placa">
            <i class="fa-solid fa-copy text-sm" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>

    <div>
      <div class="flex items-center justify-between mb-2">
        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Serviços Realizados (Itens)</p>
        <button type="button" onclick="modalAdicionarItem(${os.id})" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded text-xs font-bold transition flex items-center gap-1">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Adicionar Serviço
        </button>
      </div>
      <div id="modalItensContainer" class="space-y-2 max-h-40 overflow-y-auto mb-2"></div>
    </div>

    <div>
      <label for="editValor" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Valor Total (R$)</label>
      <input type="text" inputmode="decimal" id="editValor" value="${esc(formatarValorCampo(os.valor ?? 0))}" class="edit-input font-bold text-emerald-600 tabular-nums" />
    </div>

    <div>
      <div class="flex items-center justify-between mb-1">
        <label for="editObservacao" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Descrição / Observação</label>
        <button type="button" onclick="copiarCampo('editObservacao')" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1">
          <i class="fa-solid fa-copy" aria-hidden="true"></i> Copiar Observação
        </button>
      </div>
      <textarea id="editObservacao" maxlength="2000" class="edit-input h-24 resize-none">${esc(os.observacao)}</textarea>
    </div>

    <div>
      <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Fotos Anexadas</p>
      ${fotosHTML}
    </div>

    <!-- BOTÕES DE AÇÃO CORRIGIDOS (SEM DUPLICAÇÃO) -->
    <div class="pt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2">
      <button type="button" id="btnExcluirOS" onclick="excluirOS(${os.id})" class="w-full sm:w-auto px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
        <i class="fa-solid fa-trash" aria-hidden="true"></i> Excluir
      </button>
      
      <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <!-- NOVO BOTÃO DE RELATÓRIO -->
        <button type="button" onclick="window.abrirRelatorioOS(${os.id})" class="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 shadow-md">
          <i class="fa-solid fa-file-invoice" aria-hidden="true"></i> Relatório
        </button>

        <button type="button" id="btnCompartilharOS" onclick="compartilharOS(${os.id})" class="esconder-no-electron w-full sm:w-auto px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed">
          <i class="fa-solid fa-share-nodes" aria-hidden="true"></i> Compartilhar
        </button>
        <button type="button" id="btnSalvarOS" onclick="salvarEdicoes(${os.id})" class="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed">
          <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i> Salvar Alterações
        </button>
      </div>
    </div>
  `;

  atualizarHTMLItensModal();
  document.getElementById("modalDetalhes").classList.add("show");

  const editStatusContainer = document.getElementById("editStatus");
  if (editStatusContainer) {
    const statusDropdown = criarDropdownCustom({
      id: "editStatus",
      name: "status",
      value: os.status || "Pendente",
      options: [
        { value: "Pendente", text: "Pendente" },
        { value: "Em andamento", text: "Em andamento" },
        { value: "Concluído", text: "Concluído" },
        { value: "Cancelado", text: "Cancelado" },
      ],
      className: "w-full",
    });
    editStatusContainer.replaceWith(statusDropdown);
  }

  fotografiaFormulario = lerFormulario();

  document.getElementById("editStatus").focus();
}

export async function fecharModal({ forcar = false } = {}) {
  if (!forcar && formularioAlterado()) {
    const continuar = await confirmarAcao({
      titulo: "Descartar alterações?",
      mensagem: "Há alterações não salvas nesta OS. Deseja fechar e descartar?",
      textoBotao: "Sim, Descartar",
      icone: "fa-triangle-exclamation",
      cor: "red",
    });
    if (!continuar) return;
  }
  document.getElementById("modalDetalhes").classList.remove("show");
  fecharCamadaPorId("modalSeletorServico");
  setItensRascunho([]);
  fotografiaFormulario = "";
}

export async function compartilharOS(osId) {
  const os = listaOS.find((o) => o.id === osId);
  if (!os) {
    toast("Esta OS não existe mais. Atualize a lista.", "error");
    return;
  }

  const linhas = [];

  // 1. Cliente
  if (os.nome) linhas.push(`Cliente: ${os.nome}`);

  // 2. Placa (embaixo do nome do cliente, como você pediu)
  if (os.placa) linhas.push(`Placa: ${os.placa}`);

  // 3. Cor (se houver)
  if (os.cor) linhas.push(`Cor: ${os.cor}`);

  // 4. Observações (Limpando a placa e cor do texto para não duplicar)
  if (os.observacao) {
    let obsLimpa = os.observacao;

    // Remove a placa e cor do texto da observação (se existirem)
    // Ex: Remove " | PLACA: ABC1234 | COR: PRETO"
    obsLimpa = obsLimpa.replace(/\s*\|\s*PLACA:[^|]*/g, "");
    obsLimpa = obsLimpa.replace(/\s*\|\s*COR:[^|]*/g, "");

    // Remove espaços extras que possam ter sobrado
    obsLimpa = obsLimpa.trim();

    if (obsLimpa) linhas.push(`\nObservações: ${obsLimpa}`);
  }

  const texto = linhas.join("\n");
  const titulo = `OS ${numeroExibicao(os)}`;

  const fotoUrl = (os.fotos_urls || []).find((u) => urlSegura(u)) || "";

  const resultado = await compartilharTexto({ titulo, texto, fotoUrl });

  if (resultado.status === "copiado") {
    toast("Texto da OS copiado. Cole no app desejado.");
  } else if (resultado.status === "erro") {
    toast("Não foi possível compartilhar a OS.", "error");
  }
}
