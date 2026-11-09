export function abrirSidebar() {
  document.getElementById("sidebar").classList.remove("-translate-x-full");
  document.getElementById("sidebarOverlay").classList.remove("hidden");
}

export function fecharSidebar() {
  document.getElementById("sidebar").classList.add("-translate-x-full");
  document.getElementById("sidebarOverlay").classList.add("hidden");
}

export function definirAtualizando(ativo) {
  const btn = document.getElementById("btnAtualizar");
  if (!btn) return;
  btn.disabled = ativo;
  btn.setAttribute("aria-busy", ativo ? "true" : "false");
  const icone = btn.querySelector("i");
  if (icone) icone.classList.toggle("fa-spin", ativo);
}
