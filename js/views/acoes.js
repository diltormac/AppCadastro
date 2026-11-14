import { listaOS } from "../state.js";
import { urlSegura, numeroExibicao, formatarMoeda, toast } from "../utils.js";
import { lightboxAberto, fecharLightbox } from "./lightbox.js";
import { fecharModal } from "./modalEditarOS.js";

export function definirAtualizando(ativo) {
  const btn = document.getElementById("btnAtualizar");
  if (!btn) return;
  btn.disabled = ativo;
  btn.setAttribute("aria-busy", ativo ? "true" : "false");
  const icone = btn.querySelector("i");
  if (icone) icone.classList.toggle("fa-spin", ativo);
}

export function enviarWhatsApp(osId) {
  const os = listaOS.find((o) => o.id === osId);
  if (!os) {
    toast("Esta OS não existe mais. Atualize a lista.", "error");
    return;
  }

  // Limpa o telefone e garante o DDI 55.
  const digitos = String(os.telefone || "").replace(/\D/g, "");
  if (digitos.length < 10) {
    toast("Telefone inválido ou ausente nesta OS.", "error");
    return;
  }
  const numero =
    digitos.length >= 12 && digitos.startsWith("55")
      ? digitos
      : `55${digitos}`;

  // Monta a mensagem com os dados da OS.
  const linhas = [
    `Olá${os.nome ? `, ${os.nome}` : ""}!`,
    "",
    `OS: ${numeroExibicao(os)}`,
  ];
  const servicos = Array.isArray(os.itens_servicos) && os.itens_servicos.length
    ? os.itens_servicos.map((i) => i.servico).filter(Boolean).join(", ")
    : os.servico;
  if (servicos) linhas.push(`Serviços: ${servicos}`);
  linhas.push(`Valor: ${formatarMoeda(os.valor)}`);
  if (os.observacao) linhas.push(`Observação: ${os.observacao}`);
  const mensagem = linhas.join("\n");

  // Baixa a primeira foto via <a download> — funciona no Electron sem
  // depender de permissões de clipboard.
  const fotoUrl = (os.fotos_urls || []).find((u) => urlSegura(u));
  if (fotoUrl) {
    try {
      const a = document.createElement("a");
      a.href = fotoUrl;
      a.download = `OS-${numeroExibicao(os)}.jpg`;
      a.rel = "noopener";
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.warn("Não foi possível baixar a foto da OS.", e);
    }
  }

  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
  window.open(url, "_blank");

  if (fotoUrl) {
    toast("WhatsApp aberto! A foto foi baixada, basta anexar no chat.");
  } else {
    toast("WhatsApp aberto!");
  }
}

/* ---------- TECLADO ----------
   Esc fecha a camada mais acima (diálogo > lightbox > modal de edição). */
export function fecharCamadaSuperior() {
  const camadas = document.querySelectorAll(".camada-modal");
  if (camadas.length) {
    const topo = camadas[camadas.length - 1];
    if (typeof topo.fecharCamada === "function") topo.fecharCamada();
    else topo.remove();
    return true;
  }
  if (lightboxAberto()) {
    fecharLightbox();
    return true;
  }
  if (document.getElementById("modalDetalhes").classList.contains("show")) {
    fecharModal();
    return true;
  }
  return false;
}

/* Foto que não carrega (apagada ou sem internet) vira um aviso discreto. */
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
