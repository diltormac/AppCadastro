import { SENHA_FATURAMENTO } from "../config.js";
import { exibirFaturamento, setExibirFaturamento } from "../state.js";
import { toast } from "../utils.js";
import { renderDashboard } from "./dashboard.js";

const CHAVE_FATURAMENTO = "@osfacil_faturamento";
const FATURAMENTO_MINUTOS = 5;

let timerFaturamento = null;

function bloquearFaturamento() {
  clearTimeout(timerFaturamento);
  setExibirFaturamento(false);
  sessionStorage.removeItem(CHAVE_FATURAMENTO);
  renderDashboard();
}

function liberarFaturamento() {
  const expira = Date.now() + FATURAMENTO_MINUTOS * 60 * 1000;
  setExibirFaturamento(true);
  sessionStorage.setItem(CHAVE_FATURAMENTO, String(expira));
  agendarBloqueioFaturamento(expira);
  renderDashboard();
}

export function agendarBloqueioFaturamento(expira) {
  clearTimeout(timerFaturamento);
  const restante = expira - Date.now();
  if (restante <= 0) return bloquearFaturamento();
  timerFaturamento = setTimeout(bloquearFaturamento, restante);
}

export function alternarFaturamento() {
  if (exibirFaturamento) {
    bloquearFaturamento();
    return;
  }
  abrirDialogoSenha();
}

function abrirDialogoSenha() {
  if (document.getElementById("dialogoSenha")) return;

  const div = document.createElement("div");
  div.id = "dialogoSenha";
  div.className =
    "camada-modal fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4";
  div.innerHTML = `
    <form class="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4" role="dialog" aria-modal="true" aria-labelledby="dialogoSenhaTitulo" novalidate>
      <div>
        <h3 id="dialogoSenhaTitulo" class="font-bold text-slate-800 text-base flex items-center gap-2">
          <i class="fa-solid fa-lock text-emerald-600" aria-hidden="true"></i>Ver faturamento
        </h3>
        <p class="text-xs text-slate-500 mt-1">Fica visível por ${FATURAMENTO_MINUTOS} minutos e depois volta a ficar oculto.</p>
      </div>
      <div>
        <label for="inputSenhaFaturamento" class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Senha</label>
        <input type="password" id="inputSenhaFaturamento" class="edit-input" autocomplete="off" aria-describedby="erroSenhaFaturamento" />
        <p id="erroSenhaFaturamento" class="text-xs font-semibold text-red-600 mt-1.5 hidden" role="alert"></p>
      </div>
      <div class="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" data-acao="cancelar" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition">Cancelar</button>
        <button type="submit" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm">Liberar</button>
      </div>
    </form>
  `;
  document.body.appendChild(div);

  const form = div.querySelector("form");
  const input = div.querySelector("#inputSenhaFaturamento");
  const erro = div.querySelector("#erroSenhaFaturamento");
  const fechar = () => div.remove();

  div.addEventListener("click", (e) => {
    if (e.target === div) fechar();
  });
  div.querySelector('[data-acao="cancelar"]').onclick = fechar;
  div.fecharCamada = fechar;
  input.addEventListener("input", () => {
    erro.classList.add("hidden");
    input.classList.remove("is-invalid");
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!input.value) {
      erro.textContent = "Digite a senha.";
      erro.classList.remove("hidden");
      input.classList.add("is-invalid");
      input.focus();
      return;
    }
    if (input.value === SENHA_FATURAMENTO) {
      fechar();
      liberarFaturamento();
      toast(`Faturamento liberado por ${FATURAMENTO_MINUTOS} minutos.`);
    } else {
      erro.textContent = "Senha incorreta. Tente de novo.";
      erro.classList.remove("hidden");
      input.classList.add("is-invalid");
      input.select();
    }
  });

  input.focus();
}
