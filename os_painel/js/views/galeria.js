import {
  galeriaFotos,
  galeriaCarregamento,
  galeriaMensagemErro,
  temMaisGaleria,
  carregandoMaisGaleria,
} from "../state.js";
import { esc, urlSegura, numeroExibicao } from "../utils.js";
import { estadoHTML, estadoCarregando } from "./estados.js";

function botaoCarregarMaisGaleria() {
  if (!temMaisGaleria) return "";
  const rotulo = carregandoMaisGaleria
    ? '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Carregando…'
    : '<i class="fa-solid fa-plus" aria-hidden="true"></i> Carregar mais';
  return `
    <div class="flex justify-center py-4 col-span-full">
      <button type="button" onclick="carregarMaisGaleria()" ${carregandoMaisGaleria ? "disabled" : ""} class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-sm disabled:opacity-60 disabled:cursor-not-allowed">
        ${rotulo}
      </button>
    </div>`;
}

export function renderGaleria() {
  const todasFotos = galeriaFotos;
  const n = todasFotos.length;
  document.getElementById("fotosCount").textContent =
    n === 1 ? "1 foto" : `${n} fotos`;
  const grid = document.getElementById("galeriaGrid");
  const empty = document.getElementById("galeriaEmpty");

  if (!n) {
    grid.innerHTML = "";
    if (galeriaCarregamento === "erro") {
      empty.innerHTML = estadoHTML({
        icone: "fa-triangle-exclamation",
        titulo: "Não foi possível carregar as fotos",
        texto: esc(galeriaMensagemErro),
        erro: true,
      });
    } else if (galeriaCarregamento === "carregando") {
      empty.innerHTML = estadoCarregando("Carregando fotos…");
    } else {
      empty.innerHTML = estadoHTML({
        icone: "fa-images",
        titulo: "Nenhuma foto cadastrada",
        texto: "As fotos anexadas às OS aparecem aqui.",
      });
    }
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  // Renderiza o HTML com o data-index e data-os-id
  grid.innerHTML =
    todasFotos
      .map(
        ({ os, url, index }) => `
    <div class="galeria-card relative group cursor-pointer overflow-hidden rounded-[10px]" data-os-id="${os.id}" data-foto-index="${index}">
      <img src="${urlSegura(url)}" alt="Foto ${index + 1} da OS ${esc(numeroExibicao(os))} — ${esc(os.nome)}" loading="lazy" decoding="async" class="os-foto photo-thumb w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-110">
      
      <button type="button" class="btn-lupa absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10" title="Ver foto em tela cheia" aria-label="Ver foto ${index + 1} em tela cheia">
        <i class="fa-solid fa-search-plus text-[11px]" aria-hidden="true"></i>
      </button>
      
      <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-[10px] opacity-0 group-hover:opacity-100 transition pointer-events-none">
        <p class="text-[10px] font-bold text-white truncate">${esc(os.nome) || "Sem nome"}</p>
        <p class="text-[9px] text-white/70 truncate">${esc(numeroExibicao(os))} (${index + 1}/${os.fotos_urls.length})</p>
      </div>
    </div>
  `,
      )
      .join("") + botaoCarregarMaisGaleria();

  // Adiciona a inteligência de clique via JS (evita conflito de funções no HTML)
  grid.querySelectorAll(".galeria-card").forEach((card) => {
    const osId = card.getAttribute("data-os-id");
    const fotoIndex = parseInt(card.getAttribute("data-foto-index"));
    const fotoData = todasFotos.find(
      (f) => String(f.os.id) === String(osId) && f.index === fotoIndex,
    );

    // 1. Clicou na imagem para editar a OS
    // 1. Clicou na imagem para editar a OS
    card.addEventListener("click", (e) => {
      if (e.target.closest(".btn-lupa")) return;

      if (fotoData && fotoData.os) {
        // Como a função abrirDetalhes agora é async e busca os dados, só chamamos ela
        window.abrirDetalhes(fotoData.os);
      }
    });
    // 2. Clicou na lupa para ver a foto em tela cheia
    const btnLupa = card.querySelector(".btn-lupa");
    if (btnLupa) {
      btnLupa.addEventListener("click", (e) => {
        e.stopPropagation();
        window.abrirLightboxPorOS(fotoData.os.id, fotoIndex);
      });
    }
  });
}
