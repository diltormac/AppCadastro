import {
  listaOS,
  galeriaFotos,
  galeriaLightbox,
  indexLightboxAtual,
  setGaleriaLightbox,
  setIndexLightboxAtual,
} from "../state.js";
import { urlSegura } from "../utils.js";

let trocaLightbox = null;

export function abrirLightboxPorOS(osId, indexInicial = 0) {
  // Tenta achar a OS na lista principal
  let os = listaOS.find((o) => o.id === osId);

  // Se não achar na principal (ex: veio da galeria paginada), busca na lista de fotos da galeria
  if (!os) {
    const fotoGaleria = galeriaFotos.find(
      (f) => String(f.os.id) === String(osId),
    );
    if (fotoGaleria) os = fotoGaleria.os;
  }

  const fotos = (os?.fotos_urls || []).filter((u) => urlSegura(u));
  if (!fotos.length) return;

  setGaleriaLightbox(fotos);
  setIndexLightboxAtual(Math.min(Math.max(indexInicial, 0), fotos.length - 1));

  document.getElementById("lightbox").classList.add("show");
  atualizarLightbox();
}

export function atualizarLightbox() {
  const img = document.getElementById("lightboxImg");
  const prevBtn = document.getElementById("lightboxPrev");
  const nextBtn = document.getElementById("lightboxNext");
  const counter = document.getElementById("lightboxCounter");

  img.style.opacity = 0;

  clearTimeout(trocaLightbox);
  trocaLightbox = setTimeout(() => {
    img.src = galeriaLightbox[indexLightboxAtual] || "";
    img.style.opacity = 1;
  }, 150);

  if (galeriaLightbox.length > 1) {
    prevBtn.classList.remove("hidden");
    nextBtn.classList.remove("hidden");
    counter.classList.remove("hidden");
    counter.textContent = `${indexLightboxAtual + 1} / ${galeriaLightbox.length}`;
  } else {
    prevBtn.classList.add("hidden");
    nextBtn.classList.add("hidden");
    counter.classList.add("hidden");
  }
}

export function navegarLightbox(direcao) {
  if (!galeriaLightbox.length) return;
  let novoIndex = indexLightboxAtual + direcao;
  if (novoIndex >= galeriaLightbox.length) novoIndex = 0;
  if (novoIndex < 0) novoIndex = galeriaLightbox.length - 1;
  setIndexLightboxAtual(novoIndex);
  atualizarLightbox();
}

export function lightboxAberto() {
  return document.getElementById("lightbox").classList.contains("show");
}

export function fecharLightbox(event) {
  if (
    event &&
    event.target.id !== "lightbox" &&
    !event.target.closest(".lightbox-close")
  )
    return;
  const box = document.getElementById("lightbox");
  box.classList.remove("show");
  clearTimeout(trocaLightbox);
  setTimeout(() => {
    document.getElementById("lightboxImg").removeAttribute("src");
    setGaleriaLightbox([]);
  }, 300);
}
