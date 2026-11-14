import { listaOS, itensRascunho, setItensRascunho } from "../state.js";
import {
  esc,
  urlSegura,
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
import { fotosOSHTML } from "./modalFotosOS.js";
import { salvarEdicoes, recarregarListaOS } from "../api.js";

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
  const subtotal = itensRascunho.reduce(
    (acc, i) => acc + (Number(i.valor) || 0),
    0,
  );

  const inputDesconto = document.getElementById("editDesconto");
  const desconto = inputDesconto ? lerValor(inputDesconto.value) || 0 : 0;

  const totalFinal = Math.max(0, subtotal - desconto); // Evita valor negativo

  const campoTotal = document.getElementById("editValor");
  if (campoTotal) campoTotal.value = formatarValorCampo(totalFinal);

  // Atualiza o subtotal visual se existir
  const spanSubtotal = document.getElementById("spanSubtotal");
  if (spanSubtotal) spanSubtotal.textContent = formatarMoeda(subtotal);
}

function itemHTML(item, idx) {
  return `
    <div class="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs">
      <div class="flex-1 min-w-0 pr-2">
        <span class="font-bold text-slate-800 truncate block" title="${esc(item.servico) || "Serviço sem nome"}">
          ${esc(item.servico) || "Serviço sem nome"}
        </span>
        ${item.cor ? `<span class="text-[10px] text-indigo-600 font-medium truncate block mt-0.5">Cor: ${esc(item.cor)}</span>` : ""}
        ${item.placa ? `<span class="text-[10px] text-emerald-600 font-medium truncate block mt-0.5">Placa: ${esc(item.placa)}</span>` : ""}
      </div>
      <div class="w-8 text-center text-slate-500 font-semibold flex-shrink-0">
        ${esc(item.quantidade ?? 1)}
      </div>
      <div class="w-20 text-right font-bold text-emerald-600 tabular-nums flex-shrink-0">
        ${formatarMoeda(item.valor)}
      </div>
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

  const campoResumo = document.getElementById("editObservacaoServicos");
  if (campoResumo) {
    const nomes = itensRascunho.map((i) => i.servico).join(" / ");
    const placaInput = document.getElementById("editPlaca")?.value || "";
    const txtPlaca = placaInput.trim()
      ? ` | PLACA: ${placaInput.trim().toUpperCase()}`
      : "";

    campoResumo.value = nomes
      ? `SERVIÇOS: ${nomes}${txtPlaca}`
      : "Nenhum serviço adicionado.";
    campoResumo.style.height = "auto";
    campoResumo.style.height = campoResumo.scrollHeight + "px";
  }

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
      <div>
        <label for="editNomeItem" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Descrição / Nome do Serviço</label>
        <input type="text" id="editNomeItem" maxlength="100" class="edit-input text-xs font-bold" value="${esc(item.servico) || ""}" />
      </div>
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
    </form>`;
  document.body.appendChild(divEditar);

  const form = divEditar.querySelector("form");
  const inputNome = divEditar.querySelector("#editNomeItem");
  const inputQtd = divEditar.querySelector("#editQtdItem");
  const inputValor = divEditar.querySelector("#editValorItem");
  const fechar = () => divEditar.remove();
  divEditar.fecharCamada = fechar;

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
    if (!isNaN(qtd) && qtd > 0) atualizarCampoValor(valorUnitarioBase * qtd);
  });

  inputValor.addEventListener("input", (e) => {
    if (ignorarMascara) return;
    let v = e.target.value.replace(/\D/g, "");
    v = (v / 100).toFixed(2) + "";
    v = v
      .replace(".", ",")
      .replace(/(\d)(\d{3})(\d{3}),/g, "$1.$2.$3,")
      .replace(/(\d)(\d{3}),/g, "$1.$2,");
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
    const novoNome = (inputNome.value || "").trim().toUpperCase();
    if (!novoNome) {
      toast("Digite a descrição do serviço.", "error");
      inputNome.focus();
      return;
    }
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
      idx === index
        ? { ...i, servico: novoNome, quantidade: novaQtd, valor: novoValor }
        : i,
    );
    setItensRascunho(atualizado);
    recalcularValorDoRascunho();
    atualizarHTMLItensModal();
    fechar();
    toast("Serviço atualizado!");
  });

  inputNome.focus();
  inputNome.select();
}

// =========================================================
// MODAL DE GERENCIAR NÚMEROS E STATUS (NOVO FLUXO)
// =========================================================
export function abrirModalGerenciarNumeros(id) {
  fecharCamadaPorId("modalGerenciarNumeros");
  const os = listaOS.find((o) => o.id === id);
  if (!os) return;

  // Pega o número atual, seja do registro, da venda ou gerado automaticamente
  const numeroRegistroAtual =
    os.registro_os || os.numero_os || os.numero_os_conserto || "";

  const div = document.createElement("div");
  div.id = "modalGerenciarNumeros";
  div.className =
    "camada-modal fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4";
  div.innerHTML = `
    <div class="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4" role="dialog" aria-modal="true" aria-labelledby="tituloGerenciarNum">
      <h3 id="tituloGerenciarNum" class="font-bold text-slate-800 text-base flex items-center justify-between">
        <span><i class="fa-solid fa-list-ol mr-2 text-indigo-600" aria-hidden="true"></i>Gerenciar Números</span>
        <button type="button" data-acao="fechar" class="text-slate-400 hover:text-slate-600 w-8 h-8 inline-flex items-center justify-center rounded-lg" aria-label="Fechar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </h3>

      <div>
        <label for="modalRegistro" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nº de Registro (OS)</label>
        <input type="text" id="modalRegistro" maxlength="30" class="edit-input font-bold text-indigo-600" placeholder="0000" value="${esc(numeroRegistroAtual)}" />
      </div>

      <div>
        <label for="modalVenda" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nº da Venda (Finalização)</label>
        <input type="text" id="modalVenda" maxlength="30" class="edit-input font-bold text-emerald-600" placeholder="000000" value="${esc(os.numero_venda || "")}" />
        <p class="text-[9px] text-slate-400 mt-1">Ao preencher a venda, o status será alterado para Concluído ao salvar o formulário.</p>
      </div>

      <div class="flex flex-col gap-2 pt-3 border-t border-slate-100">
        <button type="button" id="btnSalvarNumeros" class="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition shadow-md">
          Confirmar Números
        </button>
        <button type="button" id="btnCancelarOS" class="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition">
          Cancelar esta O.S.
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(div);

  const fechar = () => div.remove();
  div.fecharCamada = fechar;
  div.addEventListener("click", (e) => {
    if (e.target === div) fechar();
  });
  div.querySelector('[data-acao="fechar"]').onclick = fechar;

  const inputReg = div.querySelector("#modalRegistro");
  const inputVen = div.querySelector("#modalVenda");

  div.querySelector("#btnSalvarNumeros").onclick = () => {
    const regVal = (inputReg.value || "").trim().toUpperCase();
    const venVal = (inputVen.value || "").trim().toUpperCase();

    const mainReg = document.getElementById("editRegistroOS");
    if (mainReg) mainReg.value = regVal;
    const mainVen = document.getElementById("editNumeroVenda");
    if (mainVen) mainVen.value = venVal;

    let statusVisual = "Pendente";
    if (venVal) statusVisual = "Concluído";
    else if (regVal) statusVisual = "Em andamento";

    // Atualiza a tag visual de status se ela existir
    const tagStatus = document.querySelector(".statusColorClass");
    if (tagStatus) {
      tagStatus.textContent = statusVisual;
      tagStatus.className =
        "px-3 py-2 border rounded-lg text-sm font-bold shadow-sm inline-block w-full text-center truncate " +
        (statusVisual === "Concluído"
          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
          : statusVisual === "Em andamento"
            ? "text-blue-700 bg-blue-50 border-blue-200"
            : "text-amber-700 bg-amber-50 border-amber-200");
    }

    toast("Números atualizados. Clique em 'Salvar Alterações' para gravar.");
    fechar();
  };

  div.querySelector("#btnCancelarOS").onclick = async () => {
    const continuar = await confirmarAcao({
      titulo: "Cancelar O.S.",
      mensagem: "Tem certeza que deseja CANCELAR esta ordem de serviço?",
      textoBotao: "Sim, Cancelar",
      icone: "fa-ban",
      cor: "red",
    });
    if (!continuar) return;

    try {
      const { error } = await supabaseClient
        .from("ordens_servico")
        .update({ status: "Cancelado" })
        .eq("id", id);

      if (error) throw error;

      Object.assign(os, { status: "Cancelado" });

      toast("O.S. Cancelada com sucesso.");
      fechar();
      recarregarListaOS();
    } catch (err) {
      console.error(err);
      toast("Erro ao cancelar a O.S.", "error");
    }
  };

  inputReg.focus();
}

// =========================================================
// MODAL PRINCIPAL (EDITAR OS)
// =========================================================

function lerFormulario() {
  const ids = [
    "editRegistroOS",
    "editNumeroVenda",
    "editNome",
    "editTelefone",
    "editDocumento",
    "editCor",
    "editPlaca",
    "editValor",
    "editDesconto",
    "editObservacao",
    "editObservacaoServicos",
    "editFormaPagamento",
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
  if (typeof idOuObjeto === "object" && idOuObjeto !== null) os = idOuObjeto;
  else os = listaOS.find((o) => o.id === idOuObjeto);

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
    `Editar OS ${os.registro_os || os.id}`;

  const aparelhoDiscreto = os.aparelho
    ? `<span class="ml-2 bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded border border-slate-200"><i class="fa-solid fa-mobile-screen mr-1" aria-hidden="true"></i>${esc(os.aparelho)}</span>`
    : "";
  document.getElementById("modalSubtitle").innerHTML =
    `Criada em ${formatarData(os.created_at)} ${aparelhoDiscreto}`;

  const isPronto = os.servico_finalizado === true;
  const tickProntoHTML = isPronto
    ? `<span class="absolute right-10 top-1/2 -translate-y-1/2 text-green-500 text-lg" title="Serviço Pronto p/ Retirada"><i class="fa-solid fa-circle-check"></i></span>`
    : "";

  let textoObsAntiga = os.observacao || "";
  let textoManualSalvo = os.observacao_manual || "";
  let textoUsuarioFinal = textoManualSalvo;

  if (!textoUsuarioFinal) {
    if (textoObsAntiga.toUpperCase().includes("SERVIÇOS:")) {
      textoUsuarioFinal = textoObsAntiga
        .replace(/SERVIÇOS:[^\n]*\n?/gi, "")
        .replace(/^\s*-\s*/, "")
        .trim();
    } else {
      textoUsuarioFinal = textoObsAntiga;
    }
  }

  const nomesServicos = (os.itens_servicos || [])
    .map((i) => i.servico)
    .join(" / ");
  const txtPlaca = os.placa ? ` | PLACA: ${os.placa}` : "";
  const textoServicosResumo = nomesServicos
    ? `SERVIÇOS: ${nomesServicos}${txtPlaca}`
    : "Nenhum serviço adicionado.";

  const valorRegistro =
    os.registro_os || os.numero_os || os.numero_os_conserto || "";
  const valorVenda = os.numero_venda || "";

  // Subtotal sem desconto
  const subtotalValor = Number(os.valor) + (Number(os.desconto) || 0);

  let statusColor = "text-amber-700 bg-amber-50 border-amber-200";
  if (os.status === "Concluído")
    statusColor = "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (os.status === "Em andamento")
    statusColor = "text-blue-700 bg-blue-50 border-blue-200";
  if (os.status === "Cancelado")
    statusColor = "text-red-700 bg-red-50 border-red-200";

  document.getElementById("modalBody").innerHTML = `
    <input type="hidden" id="editRegistroOS" value="${esc(valorRegistro)}" />
    <input type="hidden" id="editNumeroVenda" value="${esc(valorVenda)}" />
    
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
      <div class="sm:col-span-2">
        <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Controle de OS e Status</label>
        <button type="button" onclick="window.abrirModalGerenciarNumeros(${os.id})" class="w-full flex items-center justify-between px-3 py-2 border border-slate-300 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-sm font-bold text-indigo-700 transition">
          <span class="flex items-center gap-2">
            <i class="fa-solid fa-list-ol"></i>
            Gerenciar Números (OS e Venda)
          </span>
          <i class="fa-solid fa-chevron-right text-indigo-400 text-xs"></i>
        </button>
      </div>
      
      <div>
        <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Status Atual</label>
        <div class="statusColorClass px-3 py-2 border rounded-lg text-sm font-bold ${statusColor} shadow-sm inline-block w-full text-center truncate">
          ${os.status || "Pendente"}
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <div class="sm:col-span-2">
        <label for="editNome" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nome do Cliente</label>
        <div class="relative flex items-center">
          <input type="text" id="editNome" maxlength="120" value="${esc(os.nome)}" class="edit-input pr-10" />
          <button type="button" onclick="copiarCampo('editNome')" class="absolute right-2 text-slate-400 hover:text-indigo-600 p-1" title="Copiar Nome" aria-label="Copiar nome">
            <i class="fa-solid fa-copy text-sm" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      
      <div>
        <label for="editDocumento" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">CPF / CNPJ</label>
        <div class="relative flex items-center">
          <input type="text" id="editDocumento" maxlength="18" value="${esc(os.documento || "")}" class="edit-input pr-10" placeholder="000.000.000-00" />
          <button type="button" onclick="copiarCampo('editDocumento')" class="absolute right-2 text-slate-400 hover:text-indigo-600 p-1" title="Copiar Documento" aria-label="Copiar documento">
            <i class="fa-solid fa-copy text-sm" aria-hidden="true"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-3">
      <div class="sm:col-span-2">
        <label for="editTelefone" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Telefone</label>
        <div class="relative flex items-center">
          <input type="tel" id="editTelefone" maxlength="30" value="${esc(os.telefone)}" class="edit-input pr-10" />
          <button type="button" onclick="copiarCampo('editTelefone')" class="absolute right-2 text-slate-400 hover:text-indigo-600 p-1" title="Copiar Telefone" aria-label="Copiar telefone">
            <i class="fa-solid fa-copy text-sm" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      
      <div>
        <label for="editCor" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Cor</label>
        <input type="text" id="editCor" maxlength="50" value="${esc(os.cor || "")}" class="edit-input" />
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-3">
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

    <div class="mt-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Serviços Realizados (Itens)</p>
        <button type="button" onclick="modalAdicionarItem(${os.id})" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded text-xs font-bold transition flex items-center gap-1">
          <i class="fa-solid fa-plus" aria-hidden="true"></i> Adicionar Serviço
        </button>
      </div>
      <div id="modalItensContainer" class="space-y-2 max-h-40 overflow-y-auto mb-2"></div>
    </div>

    <!-- BLOCO DE VALORES: SUBTOTAL, DESCONTO E TOTAL -->
    <div class="bg-slate-50 border border-slate-200 p-3 rounded-lg mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <div>
        <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Subtotal (Serviços)</label>
        <div class="w-full px-3 py-2 bg-slate-200 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 tabular-nums">
          <span id="spanSubtotal">${formatarMoeda(subtotalValor)}</span>
        </div>
      </div>
      
      <div>
        <label for="editDesconto" class="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-1 block">Desconto (R$)</label>
        <input type="text" inputmode="decimal" id="editDesconto" value="${esc(formatarValorCampo(os.desconto || 0))}" class="edit-input font-bold text-red-600 tabular-nums" />
      </div>

      <div>
        <label for="editValor" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Valor Total (R$)</label>
        <input type="text" inputmode="decimal" id="editValor" value="${esc(formatarValorCampo(os.valor ?? 0))}" class="edit-input font-bold text-emerald-600 tabular-nums bg-emerald-50 border-emerald-300" readonly />
        <p class="text-[9px] text-slate-400 mt-1">Calculado automaticamente</p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 sm:gap-4 mt-3">
      <div>
        <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Forma de Pagamento</label>
        <div id="editFormaPagamento"></div>
      </div>
    </div>

    <div class="mt-4">
      <div class="flex items-center justify-between mb-1">
        <label class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Descrição / Observação</label>
        <button type="button" onclick="copiarObservacaoCompleta()" class="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1">
          <i class="fa-solid fa-copy" aria-hidden="true"></i> Copiar Observação
        </button>
      </div>
      <div class="w-full rounded-lg border border-slate-300 bg-white flex flex-col p-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
        <textarea id="editObservacaoServicos" readonly tabindex="-1" class="w-full bg-transparent resize-none outline-none text-slate-500 font-medium cursor-default pointer-events-none p-0 m-0 border-none focus:ring-0 overflow-hidden" rows="1">${esc(textoServicosResumo)}</textarea>
        <textarea id="editObservacao" maxlength="2000" class="w-full min-h-[80px] bg-transparent resize-none outline-none text-slate-800 font-medium p-0 m-0 border-none focus:ring-0 mt-2" placeholder="">${esc(textoUsuarioFinal)}</textarea>
      </div>
    </div>

    <div id="modalFotosContainer" class="mt-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fotos Anexadas</p>
      </div>
      ${fotosOSHTML(os)}
    </div>

    <div class="pt-4 mt-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2">
      <button type="button" id="btnExcluirOS" onclick="excluirOS(${os.id})" class="w-full sm:w-auto px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
        <i class="fa-solid fa-trash" aria-hidden="true"></i> Excluir
      </button>
      <div class="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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

  window.abrirModalGerenciarNumeros = abrirModalGerenciarNumeros;

  atualizarHTMLItensModal();
  document.getElementById("modalDetalhes").classList.add("show");

  // Evento do Desconto em tempo real
  const inputDesconto = document.getElementById("editDesconto");
  if (inputDesconto) {
    inputDesconto.addEventListener("input", (e) => {
      let v = e.target.value.replace(/\D/g, "");
      v = (v / 100).toFixed(2) + "";
      v = v
        .replace(".", ",")
        .replace(/(\d)(\d{3})(\d{3}),/g, "$1.$2.$3,")
        .replace(/(\d)(\d{3}),/g, "$1.$2,");
      e.target.value = v;
      recalcularValorDoRascunho();
    });
  }

  window.copiarObservacaoCompleta = function () {
    const textoServicos = document
      .getElementById("editObservacaoServicos")
      .value.trim();
    const textoUsuario = document.getElementById("editObservacao").value.trim();
    const textoFinal =
      textoServicos + (textoUsuario ? `\n\n${textoUsuario}` : "");
    if (!textoFinal) {
      toast("O campo de observação está vazio.", "error");
      return;
    }
    navigator.clipboard
      .writeText(textoFinal)
      .then(() => toast("Observação copiada com sucesso!"))
      .catch(() =>
        toast("Erro ao copiar. Tente selecionar e usar Ctrl+C.", "error"),
      );
  };

  const ajustarAlturaServicos = () => {
    const txt = document.getElementById("editObservacaoServicos");
    if (txt) {
      txt.style.height = "auto";
      txt.style.height = txt.scrollHeight + "px";
    }
  };
  setTimeout(ajustarAlturaServicos, 50);

  const inputPlaca = document.getElementById("editPlaca");
  if (inputPlaca) inputPlaca.addEventListener("input", ajustarAlturaServicos);

  const editFormaPagamentoContainer =
    document.getElementById("editFormaPagamento");
  if (editFormaPagamentoContainer) {
    const pagamentoDropdown = criarDropdownCustom({
      id: "editFormaPagamento",
      name: "forma_pagamento",
      value: os.forma_pagamento || "",
      placeholder: "Selecione...",
      options: [
        { value: "", text: "Não definida" },
        { value: "Dinheiro", text: "Dinheiro" },
        { value: "Débito", text: "Débito" },
        { value: "Crédito", text: "Crédito" },
        { value: "Pix", text: "Pix" },
        { value: "Boleto", text: "Boleto" },
        { value: "Outros", text: "Outros" },
      ],
      className: "w-full",
    });
    editFormaPagamentoContainer.replaceWith(pagamentoDropdown);
  }

  const inputDocumento = document.getElementById("editDocumento");
  if (inputDocumento) {
    inputDocumento.addEventListener("input", (e) => {
      let v = e.target.value.replace(/\D/g, "").slice(0, 14);
      if (v.length <= 11)
        v = v
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
      else
        v = v
          .replace(/^(\d{2})(\d)/, "$1.$2")
          .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
          .replace(/\.(\d{3})(\d)/, ".$1/$2")
          .replace(/(\d{4})(\d)/, "$1-$2");
      e.target.value = v;
    });
  }

  fotografiaFormulario = lerFormulario();
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
  if (os.nome) linhas.push(`Cliente: ${os.nome}`);
  if (os.placa) linhas.push(`Placa: ${os.placa}`);
  if (os.cor) linhas.push(`Cor: ${os.cor}`);
  // Removido o Pagamento conforme solicitado

  const itens = Array.isArray(os.itens_servicos) ? os.itens_servicos : [];
  const nomesItens = itens.map((i) => String(i.servico || "").toUpperCase());
  const temReforma = nomesItens.some((n) => n.includes("REFORMA"));

  const numeroRegistro =
    os.registro_os || os.numero_os_conserto || os.numero_os;

  const numeros = [];
  if (numeroRegistro) {
    if (temReforma) numeros.push(`Reforma: ${numeroRegistro}`);
    else numeros.push(`OS: ${numeroRegistro}`);
  }
  if (os.numero_venda) numeros.push(`Venda: ${os.numero_venda}`);

  if (numeros.length > 0) linhas.push(`Números: ${numeros.join(" | ")}`);

  const obs = os.observacao_manual || os.observacao || "";
  if (obs) {
    let obsLimpa = obs
      .replace(/\s*\|\s*PLACA:[^|]*/g, "")
      .replace(/\s*\|\s*COR:[^|]*/g, "")
      .trim();
    if (obsLimpa) linhas.push(`Observações: ${obsLimpa}`);
  }

  const texto = linhas.join("\n");
  const titulo = `OS ${numeroRegistro || os.id}`;
  const fotoUrl = (os.fotos_urls || []).find((u) => urlSegura(u)) || "";

  const resultado = await compartilharTexto({ titulo, texto, fotoUrl });
  if (resultado.status === "copiado")
    toast("Texto da OS copiado. Cole no app desejado.");
  else if (resultado.status === "erro")
    toast("Não foi possível compartilhar a OS.", "error");
}
