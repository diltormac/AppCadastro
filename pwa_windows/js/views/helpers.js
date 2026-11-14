import { esc, urlSegura } from "../utils.js";

export function fecharCamadaPorId(id) {
  document.getElementById(id)?.remove();
}

export function imgFoto(url, classes, osId, index, titulo = "Ver foto") {
  const src = urlSegura(url);
  if (!src) return "";
  return `<img src="${src}" alt="${esc(titulo)}" loading="lazy" decoding="async" class="os-foto cursor-pointer transition-transform duration-300 hover:scale-125 ${classes}" onclick="event.stopPropagation(); abrirLightboxPorOS(${osId}, ${index})" title="${esc(titulo)}" />`;
}

export function tratarFotoQuebrada(img) {
  if (img.dataset.quebrada) return;
  img.dataset.quebrada = "1";
  const aviso = document.createElement("span");
  aviso.className = `foto-indisponivel ${img.className.replace(/\bos-foto\b|\bphoto-thumb\b|hover:\S+|cursor-pointer/g, "")}`;
  if (img.classList.contains("photo-thumb")) aviso.classList.add("photo-thumb");
  aviso.title = "Foto indisponível";
  aviso.setAttribute("role", "img");
  aviso.setAttribute("aria-label", "Foto indisponível");
  aviso.innerHTML = `<i class="fa-solid fa-image" aria-hidden="true"></i>`;
  img.replaceWith(aviso);
}
