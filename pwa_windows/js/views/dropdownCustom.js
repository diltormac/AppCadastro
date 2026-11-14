// js/views/dropdownCustom.js
import { esc } from "../utils.js";

/**
 * Cria um dropdown customizado no lugar de um <select> nativo.
 * Mantém a API compatível: .value, .options, .selectedIndex,
 * dispatchEvent("change"), addEventListener("change"), .focus().
 *
 * @param {object} opts
 * @param {string} opts.id
 * @param {string} [opts.name]
 * @param {Array<{value:string,text:string}>} opts.options
 * @param {string} [opts.value]
 * @param {string} [opts.placeholder]
 * @param {string} [opts.className]
 * @param {(val:string)=>void} [opts.onChange]
 * @returns {HTMLElement}
 */
export function criarDropdownCustom({
  id,
  name,
  options = [],
  value = "",
  placeholder = "Selecione…",
  className = "",
  onChange,
} = {}) {
  const wrapper = document.createElement("div");
  wrapper.id = id;
  wrapper.dataset.name = name || id;
  wrapper.className = `relative ${className}`;
  wrapper.innerHTML = `
    <input type="hidden" name="${esc(name || id)}" />
    <button type="button" data-role="btn"
      class="w-full border border-slate-300 rounded-lg px-3 py-2 flex justify-between items-center bg-white text-sm text-slate-800 hover:border-indigo-400 transition-colors focus:outline-none focus:border-indigo-500"
      aria-haspopup="listbox" aria-expanded="false">
      <span data-role="texto" class="truncate font-medium">${esc(placeholder)}</span>
      <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 ml-2 flex-shrink-0" aria-hidden="true"></i>
    </button>
    <div data-role="lista"
      class="hidden absolute z-50 mt-1 w-full bg-white border border-slate-200 shadow-lg rounded-lg max-h-60 overflow-y-auto"
      role="listbox"></div>
  `;

  const hidden = wrapper.querySelector('input[type="hidden"]');
  const btn = wrapper.querySelector('[data-role="btn"]');
  const texto = wrapper.querySelector('[data-role="texto"]');
  const lista = wrapper.querySelector('[data-role="lista"]');

  let _options = [...options];
  let _value = String(value ?? "");

  const fechar = () => {
    lista.classList.add("hidden");
    btn.setAttribute("aria-expanded", "false");
  };
  const abrir = () => {
    lista.classList.remove("hidden");
    btn.setAttribute("aria-expanded", "true");
  };

  const opcaoHTML = (opt, idx) => {
    const sel = String(opt.value) === _value;
    return `
      <button type="button" data-idx="${idx}" data-value="${esc(opt.value)}"
        role="option" aria-selected="${sel}"
        class="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors ${sel ? "bg-indigo-50 text-indigo-700 font-bold" : "hover:bg-slate-100 text-slate-800"}">
        <span class="truncate">${esc(opt.text)}</span>
        ${sel ? '<i class="fa-solid fa-check text-[10px]" aria-hidden="true"></i>' : ""}
      </button>`;
  };

  const renderTexto = () => {
    const opt = _options.find((o) => String(o.value) === _value);
    texto.textContent = opt ? opt.text : placeholder;
    hidden.value = _value;
  };

  const renderLista = () => {
    lista.innerHTML = _options.map(opcaoHTML).join("");
    renderTexto();
  };

  const emitirChange = () => {
    wrapper.dispatchEvent(new Event("change", { bubbles: true }));
    if (typeof onChange === "function") onChange(_value);
  };

  // ===== eventos =====
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (lista.classList.contains("hidden")) abrir();
    else fechar();
  });

  lista.addEventListener("click", (e) => {
    const op = e.target.closest("[data-value]");
    if (!op) return;
    _value = op.dataset.value;
    hidden.value = _value;
    renderLista();
    fechar();
    emitirChange();
  });

  const fora = (e) => {
    if (!wrapper.contains(e.target)) fechar();
  };
  document.addEventListener("click", fora);

  // Remove o listener quando o elemento sair do DOM (evita leak).
  const observer = new MutationObserver(() => {
    if (!document.body.contains(wrapper)) {
      document.removeEventListener("click", fora);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ===== API compatível com <select> =====
  Object.defineProperty(wrapper, "value", {
    get: () => _value,
    set: (v) => {
      const novo = String(v ?? "");
      if (novo === _value) return;
      _value = novo;
      renderLista();
    },
  });

  Object.defineProperty(wrapper, "selectedIndex", {
    get: () => _options.findIndex((o) => String(o.value) === _value),
    set: (i) => {
      if (_options[i]) wrapper.value = _options[i].value;
    },
  });

  Object.defineProperty(wrapper, "options", {
    get: () => _options.map((o) => ({ text: o.text, value: o.value })),
    set: (arr) => {
      _options = [...arr];
      renderLista();
    },
  });

  wrapper.focus = () => btn.focus();

  renderLista();
  return wrapper;
}
