import {
  esc,
  formatarMoeda,
  lerValor,
  normalizar,
  toast,
  confirmarAcao,
} from "../utils.js";
import {
  obterCatalogoServicos,
  salvarCatalogoServicos,
} from "../catalogoStore.js";
import { fecharCamadaPorId } from "./helpers.js";
import { atualizarOpcoesSeletorServico } from "./modalAdicionarItem.js";
import { formatarValorCampo } from "./modalEditarOS.js";

export async function modalGerenciarCatalogo() {
  fecharCamadaPorId("modalGerenciarServicos");
  const catalogo = await obterCatalogoServicos();
  const listaHtml = catalogo
    .map(
      (s, idx) => `
    <div class="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs">
      <div class="min-w-0">
        <span class="font-bold text-slate-800 break-words">${esc(s.nome)}</span>
        <span class="text-emerald-600 font-semibold ml-2 whitespace-nowrap tabular-nums">${formatarMoeda(s.valor)}</span>
      </div>
      <div class="flex items-center gap-1 flex-shrink-0">
        <button type="button" onclick="modalEditarServicoCatalogo(${idx})" class="text-indigo-600 hover:text-indigo-800 p-1" title="Editar" aria-label="Editar ${esc(s.nome)}">
          <i class="fa-solid fa-pen" aria-hidden="true"></i>
        </button>
        <button type="button" onclick="removerServicoCatalogo(${idx})" class="text-red-500 hover:text-red-700 p-1" title="Excluir" aria-label="Excluir ${esc(s.nome)} da lista">
          <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `,
    )
    .join("");

  const divGerenciar = document.createElement("div");
  divGerenciar.id = "modalGerenciarServicos";
  divGerenciar.className =
    "camada-modal fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4";
  divGerenciar.innerHTML = `
    <div class="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4" role="dialog" aria-modal="true" aria-labelledby="tituloGerenciar">
      <h3 class="font-bold text-slate-800 text-base flex items-center justify-between">
        <span id="tituloGerenciar"><i class="fa-solid fa-tags mr-2 text-indigo-600" aria-hidden="true"></i>Gerenciar Serviços (Offline)</span>
        <button type="button" data-acao="fechar" class="text-slate-400 hover:text-slate-600 w-8 h-8 inline-flex items-center justify-center rounded-lg" aria-label="Fechar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </h3>

      <form id="formNovoServico" class="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-2" novalidate>
        <p class="text-[11px] font-bold text-indigo-900 uppercase">Adicionar Novo Serviço ao Catálogo</p>
        <input type="text" id="novoCatNome" maxlength="60" class="edit-input text-xs" placeholder="Nome do Serviço (Ex: POLIMENTO)" aria-label="Nome do serviço" />
        <div class="flex gap-2">
          <input type="text" inputmode="decimal" id="novoCatValor" class="edit-input text-xs font-bold text-emerald-600" placeholder="Valor Padrão (R$)" aria-label="Valor padrão em reais" />
          <button type="submit" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition whitespace-nowrap">Cadastrar</button>
        </div>
      </form>

      <div>
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Serviços Cadastrados</p>
        <div class="space-y-2 max-h-48 overflow-y-auto">
          ${listaHtml || '<p class="text-xs text-slate-500 italic">Nenhum serviço cadastrado. Adicione o primeiro acima.</p>'}
        </div>
      </div>
    </div>
  `;
  const fechar = () => {
    divGerenciar.remove();
    atualizarOpcoesSeletorServico();
  };
  divGerenciar.fecharCamada = fechar;
  divGerenciar.addEventListener("click", (e) => {
    if (e.target === divGerenciar) fechar();
  });
  divGerenciar.querySelector('[data-acao="fechar"]').onclick = fechar;
  divGerenciar
    .querySelector("#formNovoServico")
    .addEventListener("submit", (e) => {
      e.preventDefault();
      adicionarServicoCatalogo();
    });
  document.body.appendChild(divGerenciar);
  divGerenciar.querySelector("#novoCatNome").focus();
}

export async function adicionarServicoCatalogo() {
  const inputNome = document.getElementById("novoCatNome");
  const inputValor = document.getElementById("novoCatValor");
  const nome = (inputNome.value || "").trim().toUpperCase();
  const valorDigitado = inputValor.value.trim();
  const valor = valorDigitado ? lerValor(valorDigitado) : 0;

  if (!nome) {
    toast("Digite o nome do serviço.", "error");
    inputNome.focus();
    return;
  }
  if (valor === null || valor < 0) {
    toast("Valor inválido. Use apenas números, ex: 80,00.", "error");
    inputValor.focus();
    return;
  }

  const catalogo = await obterCatalogoServicos();
  if (catalogo.some((s) => normalizar(s.nome) === normalizar(nome))) {
    toast(`“${nome}” já está na lista.`, "error");
    inputNome.select();
    return;
  }
  catalogo.push({ nome, valor });
  if (!(await salvarCatalogoServicos(catalogo))) return;

  toast("Serviço adicionado ao catálogo!");
  await modalGerenciarCatalogo();
}

export async function modalEditarServicoCatalogo(index) {
  fecharCamadaPorId("modalEditarServico");
  const catalogo = await obterCatalogoServicos();
  const item = catalogo[index];
  if (!item) {
    toast("Este serviço não existe mais. Reabra a lista.", "error");
    return;
  }

  const divEditar = document.createElement("div");
  divEditar.id = "modalEditarServico";
  divEditar.className =
    "camada-modal fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4";
  divEditar.innerHTML = `
    <form class="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4" role="dialog" aria-modal="true" aria-labelledby="tituloEditarServico" novalidate>
      <h3 id="tituloEditarServico" class="font-bold text-slate-800 text-base flex items-center justify-between">
        <span><i class="fa-solid fa-pen mr-2 text-indigo-600" aria-hidden="true"></i>Editar Serviço</span>
        <button type="button" data-acao="fechar" class="text-slate-400 hover:text-slate-600 w-8 h-8 inline-flex items-center justify-center rounded-lg" aria-label="Fechar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </h3>

      <div>
        <label for="editCatNome" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Nome do Serviço</label>
        <input type="text" id="editCatNome" maxlength="60" class="edit-input text-xs" value="${esc(item.nome)}" />
      </div>

      <div>
        <label for="editCatValor" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Valor (R$)</label>
        <input type="text" inputmode="decimal" id="editCatValor" class="edit-input text-xs font-bold text-emerald-600" value="${esc(formatarValorCampo(item.valor))}" />
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" data-acao="cancelar" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition">Cancelar</button>
        <button type="submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm">Salvar Alterações</button>
      </div>
    </form>
  `;
  document.body.appendChild(divEditar);

  const form = divEditar.querySelector("form");
  const inputNome = divEditar.querySelector("#editCatNome");
  const inputValor = divEditar.querySelector("#editCatValor");
  const fechar = () => divEditar.remove();
  divEditar.fecharCamada = fechar;

  divEditar.addEventListener("click", (e) => {
    if (e.target === divEditar) fechar();
  });
  divEditar.querySelector('[data-acao="fechar"]').onclick = fechar;
  divEditar.querySelector('[data-acao="cancelar"]').onclick = fechar;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = (inputNome.value || "").trim().toUpperCase();
    const valorDigitado = inputValor.value.trim();
    const valor = valorDigitado ? lerValor(valorDigitado) : 0;

    if (!nome) {
      toast("Digite o nome do serviço.", "error");
      inputNome.focus();
      return;
    }
    if (valor === null || valor < 0) {
      toast("Valor inválido. Use apenas números, ex: 80,00.", "error");
      inputValor.focus();
      return;
    }

    const atual = await obterCatalogoServicos();
    if (
      atual.some(
        (s, i) => i !== index && normalizar(s.nome) === normalizar(nome),
      )
    ) {
      toast(`“${nome}” já está na lista.`, "error");
      inputNome.select();
      return;
    }

    atual[index] = { nome, valor };
    if (!(await salvarCatalogoServicos(atual))) return;

    fechar();
    await modalGerenciarCatalogo();
    toast("Serviço atualizado!");
  });

  inputNome.focus();
  inputNome.select();
}

export async function removerServicoCatalogo(index) {
  const catalogo = await obterCatalogoServicos();
  const item = catalogo[index];
  if (!item) return;

  const continuar = await confirmarAcao({
    titulo: "Remover Serviço",
    mensagem: `Remover “${item.nome}” da lista de serviços?`,
    textoBotao: "Sim, Remover",
    icone: "fa-trash-can",
    cor: "red",
  });

  if (!continuar) return;

  catalogo.splice(index, 1);
  if (!(await salvarCatalogoServicos(catalogo))) return;

  toast("Serviço removido do catálogo!");
  await modalGerenciarCatalogo();
}
