export async function compartilharTexto({
  titulo = "",
  texto = "",
  fotoUrl = "",
  isPdf = false, // <-- NOVO PARÂMETRO
} = {}) {
  const conteudo = String(texto ?? "");
  const ehNativo = window.Capacitor?.isNativePlatform?.() || false;

  // ==========================================
  // 1. APLICATIVO ANDROID/IOS (Capacitor)
  // ==========================================
  if (ehNativo) {
    try {
      const Share = window.Capacitor?.Plugins?.Share;
      const Filesystem = window.Capacitor?.Plugins?.Filesystem;

      if (!Share || !Filesystem) {
        throw new Error("Plugins do Capacitor não encontrados.");
      }

      let arquivoParaCompartilhar = null;

      if (fotoUrl) {
        try {
          let blob;

          // Se for um Blob (URL.createObjectURL), baixa ele
          if (fotoUrl.startsWith("blob:") || fotoUrl.startsWith("data:")) {
            const resposta = await fetch(fotoUrl);
            blob = await resposta.blob();
          } else {
            // Se for link da internet
            const resposta = await fetch(fotoUrl);
            blob = await resposta.blob();
          }

          // Converte para Base64
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          // Define nome e extensão corretos
          const extensao = isPdf ? "pdf" : "jpg";
          const nomeArquivo = `os-relatorio-${Date.now()}.${extensao}`;

          // Salva no cache do celular
          const resultadoArquivo = await Filesystem.writeFile({
            path: nomeArquivo,
            data: base64Data,
            directory: "CACHE",
          });

          arquivoParaCompartilhar = resultadoArquivo.uri; // Pega o caminho file://
        } catch (err) {
          console.warn("Falha ao salvar o arquivo para compartilhar.", err);
        }
      }

      // Envia o arquivo salvo (ou apenas o texto se falhar)
      await Share.share({
        title: titulo,
        text: conteudo,
        url: arquivoParaCompartilhar || undefined, // Passa o caminho file://
        dialogTitle: "Compartilhar OS",
      });

      return { status: "compartilhado" };
    } catch (e) {
      if (e && e.message && e.message.toLowerCase().includes("cancel")) {
        return { status: "cancelado" };
      }
      console.warn("Compartilhamento nativo falhou.", e);
    }
  }

  // ==========================================
  // 2. NAVEGADOR WEB (Chrome, Edge, Safari)
  // ==========================================
  if (
    !ehNativo &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    let arquivo = null;
    if (fotoUrl) {
      try {
        const resposta = await fetch(fotoUrl, { mode: "cors" });
        const blob = await resposta.blob();
        const ext = isPdf ? "pdf" : "jpg";
        const type = isPdf ? "application/pdf" : blob.type;
        arquivo = new File([blob], `os.${ext}`, { type });
      } catch (err) {
        console.warn(
          "Não foi possível baixar o arquivo para compartilhar na web.",
          err,
        );
      }
    }

    const podeCompartilharArquivo =
      arquivo &&
      typeof navigator.canShare === "function" &&
      navigator.canShare({ files: [arquivo] });

    try {
      if (podeCompartilharArquivo) {
        await navigator.share({
          title: titulo,
          text: conteudo,
          files: [arquivo],
        });
      } else {
        await navigator.share({ title: titulo, text: conteudo });
      }
      return { status: "compartilhado" };
    } catch (e) {
      if (e && e.name === "AbortError") {
        return { status: "cancelado" };
      }
      console.warn("Compartilhamento web falhou; tentando clipboard.", e);
    }
  }

  // ==========================================
  // 3. FALLBACK: ÁREA DE TRANSFERÊNCIA
  // ==========================================
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    try {
      await navigator.clipboard.writeText(conteudo);
      return { status: "copiado" };
    } catch (e) {
      console.warn("Não foi possível copiar para a área de transferência.", e);
    }
  }

  return { status: "erro" };
}
