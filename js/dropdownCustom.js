// js/dropdownCustom.js
export function criarDropdownCustom({
  id,
  name,
  options = [],
  value = "",
  placeholder = "Selecione…",
  className = "",
  tema = "light",
  onChange,
} = {}) {
  const escLocal = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  const wrapper = document.createElement("div");
  wrapper.id = id;
  wrapper.dataset.name = name || id;
  wrapper.className = `relative ${className}`;

  const btnClasses =
    tema === "dark"
      ? "w-full h-11 px-3 bg-slate-800 text-white text-sm rounded-lg border border-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors flex justify-between items-center text-left"
      : "w-full border border-slate-300 rounded-lg px-3 py-2 flex justify-between items-center bg-white text-sm text-slate-800 hover:border-indigo-400 transition-colors focus:outline-none focus:border-indigo-500";

  const listaClasses =
    tema === "dark"
      ? "hidden fixed z-[9999] mt-1 bg-slate-800 border border-slate-700 shadow-xl rounded-lg max-h-60 overflow-y-auto text-white custom-dropdown-list"
      : "hidden fixed z-[9999] mt-1 bg-white border border-slate-200 shadow-lg rounded-lg max-h-60 overflow-y-auto custom-dropdown-list";

  wrapper.innerHTML = `
    <input type="hidden" name="${escLocal(name || id)}" />
    <button type="button" data-role="btn" class="${btnClasses}"
      aria-haspopup="listbox" aria-expanded="false">
      <span data-role="texto" class="truncate">${escLocal(placeholder)}</span>
      <i class="fa-solid fa-chevron-down text-[10px] text-slate-400 ml-2 flex-shrink-0" aria-hidden="true"></i>
    </button>
  `;

  const hidden = wrapper.querySelector('input[type="hidden"]');
  const btn = wrapper.querySelector('[data-role="btn"]');
  const texto = wrapper.querySelector('[data-role="texto"]');

  const lista = document.createElement("div");
  lista.setAttribute("data-role", "lista");
  lista.className = listaClasses;
  lista.setAttribute("role", "listbox");
  document.body.appendChild(lista);

  let _options = [...options];
  let _value = String(value ?? "");

  // 1. Definição da função posicionar
  const posicionar = () => {
    if (lista.classList.contains("hidden")) return;
    const rect = btn.getBoundingClientRect();
    lista.style.width = `${rect.width}px`;
    lista.style.left = `${rect.left}px`;

    const alturaMaxima = 240;
    const espacoAbaixo = window.innerHeight - rect.bottom;
    const espacoAcima = rect.top;

    if (espacoAbaixo < alturaMaxima && espacoAcima > alturaMaxima) {
      lista.style.top = "auto";
      lista.style.bottom = `${window.innerHeight - rect.top + 4}px`;
    } else {
      lista.style.top = `${rect.bottom + 4}px`;
      lista.style.bottom = "auto";
    }
  };

  // 2. Definição da função abrir (A CORREÇÃO ESTÁ AQUI)
  const abrir = () => {
    // Tira o hidden imediatamente para o navegador saber que existe
    lista.classList.remove("hidden");
    btn.setAttribute("aria-expanded", "true");

    // Calcula a posição imediatamente
    posicionar();

    // Recalcula depois de 50ms caso o modal ainda esteja crescendo (animação)
    setTimeout(posicionar, 50);

    window.addEventListener("scroll", posicionar, true);
    window.addEventListener("resize", posicionar);
  };

  // 3. Definição da função fechar
  const fechar = () => {
    lista.classList.add("hidden");
    btn.setAttribute("aria-expanded", "false");
    window.removeEventListener("scroll", posicionar, true);
    window.removeEventListener("resize", posicionar);
  };

  const opcaoHTML = (opt, idx) => {
    const sel = String(opt.value) === _value;
    const clsSel =
      tema === "dark"
        ? "bg-indigo-600/30 text-white font-bold"
        : "bg-indigo-50 text-indigo-700 font-bold";
    const clsNormal =
      tema === "dark"
        ? "text-slate-200 hover:bg-slate-700"
        : "text-slate-800 hover:bg-slate-100";

    const direita = `
      <div class="flex items-center gap-2 ml-auto flex-shrink-0">
        ${opt.extra ? `<span class="font-bold text-emerald-500 tabular-nums">${escLocal(opt.extra)}</span>` : ""}
        ${sel ? '<i class="fa-solid fa-check text-[10px]" aria-hidden="true"></i>' : ""}
      </div>
    `;

    return `
      <button type="button" data-idx="${idx}" data-value="${escLocal(opt.value)}"
        role="option" aria-selected="${sel}"
        class="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left text-xs transition-colors ${sel ? clsSel : clsNormal}">
        <span class="truncate">${escLocal(opt.text)}</span>
        ${direita}
      </button>`;
  };

  const renderTexto = () => {
    const opt = _options.find((o) => String(o.value) === _value);
    if (opt) {
      texto.innerHTML = `${escLocal(opt.text)} ${opt.extra ? `<span class="text-emerald-500 ml-1">${escLocal(opt.extra)}</span>` : ""}`;
    } else {
      texto.textContent = placeholder;
    }
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

  // Evento de clique no botão (para abrir/fechar)
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (lista.classList.contains("hidden")) {
      abrir();
    } else {
      fechar();
    }
  });

  // Previne bugs de toque no celular
  btn.addEventListener(
    "touchstart",
    (e) => {
      e.stopPropagation();
    },
    { passive: false },
  );

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
    if (!wrapper.contains(e.target) && !lista.contains(e.target)) fechar();
  };
  document.addEventListener("click", fora);

  const observer = new MutationObserver(() => {
    if (!document.body.contains(wrapper)) {
      document.removeEventListener("click", fora);
      window.removeEventListener("scroll", posicionar, true);
      window.removeEventListener("resize", posicionar);
      lista.remove();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  Object.defineProperty(wrapper, "value", {
    get: () => _value,
    set: (v) => {
      const novo = String(v ?? "");
      if (novo === _value) return;
      _value = novo;
      renderLista();
    },
  });

  wrapper.focus = () => btn.focus();
  wrapper.fechar = fechar;
  renderLista();
  return wrapper;
}
