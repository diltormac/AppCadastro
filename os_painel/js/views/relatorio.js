// js/views/relatorio.js
import { numeroExibicao, formatarData, formatarMoeda, esc } from "../utils.js";
import { compartilharTexto } from "../compartilhamento.js";
import { toast } from "../utils.js";

/* ---------- FUNÇÕES AUXILIARES ---------- */

// Transforma a imagem em Base64 para o Electron/APK não bloquear a leitura
async function converterImagemParaBase64(url) {
  try {
    const resposta = await fetch(url);
    const blob = await resposta.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn("Não foi possível carregar a logo para Base64.", e);
    return null;
  }
}

function baixarBlob(blob, nome) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/* ---------- MODAL DO RELATÓRIO ---------- */

export async function abrirRelatorio(os) {
  if (document.getElementById("modalRelatorio")) return;

  // 1. Tenta converter a logo local para Base64 para funcionar no Electron/APK
  let logoBase64 = await converterImagemParaBase64("./assets/logo.png");

  const div = document.createElement("div");
  div.id = "modalRelatorio";
  div.className =
    "camada-modal fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-2 sm:p-4 overflow-y-auto";

  let obsLimpa = os.observacao || "";
  obsLimpa = obsLimpa.replace(/\s*\|\s*PLACA:[^|]*/g, "");
  obsLimpa = obsLimpa.replace(/\s*\|\s*COR:[^|]*/g, "");
  obsLimpa = obsLimpa.trim();

  div.innerHTML = `
    <div class="bg-slate-100 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
      
      <!-- Área de Captura (A4) -->
      <div class="flex-1 overflow-y-auto bg-white">
        <div id="relatorioCaptura" class="bg-white mx-auto w-full p-4 sm:p-10 pb-16 sm:pb-10" style="max-width: 210mm; font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0f172a;">
          
          <style>
            @media print {
              tr { page-break-inside: avoid; }
              thead { display: table-header-group; }
            }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
          </style>

          <!-- CABEÇALHO CORPORATIVO -->
          <div class="border-b-2 border-slate-900 pb-3 sm:pb-5 mb-4 sm:mb-6 flex flex-row justify-between items-center gap-2 sm:gap-4">
            <div class="flex items-center gap-2 sm:gap-4 flex-1">
              
              <!-- Logo com fallback Base64 -->
              <img src="${logoBase64 || "./assets/logo.png"}" alt="Logo" crossorigin="anonymous" class="h-10 sm:h-16 w-auto object-contain rounded-lg shadow-sm flex-shrink-0" onerror="this.style.display='none'" />
              
              <div class="border-l border-slate-300 pl-2 sm:pl-4">
                <h1 class="text-xs sm:text-xl font-extrabold uppercase tracking-wider text-slate-900 leading-tight">Clínica da Roda</h1>
                <p class="text-[7px] sm:text-[10px] text-slate-600 uppercase tracking-wider font-bold mt-0.5">Tratamento perfeito para rodas</p>
                <p class="text-[7px] sm:text-[10px] text-slate-600 mt-1 font-semibold">CNPJ: 08.297.622.0001/35</p>
              </div>
            </div>
            
            <div class="text-right bg-slate-50 border border-slate-300 px-2 py-1.5 sm:px-4 sm:py-2.5 rounded-md flex-shrink-0 shadow-sm">
              <p class="text-[8px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ordem de Serviço</p>
              <p class="text-sm sm:text-lg font-extrabold text-slate-900 mt-0.5">Nº ${esc(numeroExibicao(os))}</p>
              <p class="text-[9px] sm:text-[11px] text-slate-600 mt-0.5 font-bold">${formatarData(os.created_at)}</p>
            </div>
          </div>

          <!-- DADOS DO CLIENTE E VEÍCULO -->
          <div class="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
            
            <!-- Card Cliente -->
            <div class="bg-slate-50 p-2 sm:p-3.5 rounded-md border border-slate-300">
              <p class="text-[8px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dados do Cliente</p>
              <p class="text-xs sm:text-sm font-extrabold text-slate-900 leading-tight break-words">${esc(os.nome) || "Não informado"}</p>
              <p class="text-[10px] sm:text-xs text-slate-700 font-semibold mt-1 flex items-center break-all"><i class="fa-solid fa-phone text-slate-500 mr-1 text-[9px] sm:text-[12px]"></i> ${esc(os.telefone) || "Sem contato"}</p>
            </div>
            
            <!-- Card Veículo -->
            <div class="bg-slate-50 p-2 sm:p-3.5 rounded-md border border-slate-300 flex flex-col justify-between">
              <p class="text-[8px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Identificação do Veículo</p>
              <div class="flex gap-2 sm:gap-6 items-center mt-1">
                ${
                  os.placa
                    ? `
                <div>
                  <p class="text-[7px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Placa</p>
                  <span class="inline-block bg-slate-900 text-white text-[10px] sm:text-xs font-extrabold px-1.5 py-0.5 rounded tracking-widest">${esc(os.placa)}</span>
                </div>`
                    : ""
                }
                ${
                  os.cor
                    ? `
                <div>
                  <p class="text-[7px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Cor</p>
                  <p class="text-[10px] sm:text-xs font-extrabold text-slate-900 leading-tight break-words">${esc(os.cor)}</p>
                </div>`
                    : ""
                }
              </div>
            </div>
          </div>

          <!-- TABELA DE ITENS -->
          <table class="w-full text-left text-xs sm:text-sm mb-4 sm:mb-6 border-collapse table-fixed">
            <thead>
              <tr class="bg-slate-900 text-white">
                <th class="py-2 px-1.5 sm:py-3 sm:px-3 font-bold uppercase tracking-wider rounded-tl-md w-[45%]">Serviços</th>
                <th class="py-2 px-1 sm:py-3 sm:px-3 font-bold uppercase tracking-wider text-center w-[15%]">Qtd</th>
                <th class="py-2 px-1.5 sm:py-3 sm:px-3 font-bold uppercase tracking-wider text-right w-[20%]">Unitário</th>
                <th class="py-2 px-1.5 sm:py-3 sm:px-3 font-bold uppercase tracking-wider text-right w-[20%] rounded-tr-md">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 border-b border-slate-300">
              ${(os.itens_servicos || [])
                .map((item, index) => {
                  const qtd = item.quantidade || 1;
                  const valorTotalItem = (item.valor || 0) * qtd;
                  return `
                <tr class="${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}">
                  <td class="py-2.5 px-1.5 sm:py-3 sm:px-3 font-bold text-slate-800 break-words text-[10px] sm:text-sm">${esc(item.servico)}</td>
                  <td class="py-2.5 px-1 sm:py-3 sm:px-3 text-center font-bold text-slate-800 text-[10px] sm:text-sm">${qtd}</td>
                  <td class="py-2.5 px-1.5 sm:py-3 sm:px-3 text-right font-semibold text-slate-700 whitespace-nowrap text-[10px] sm:text-sm">${formatarMoeda(item.valor)}</td>
                  <td class="py-2.5 px-1.5 sm:py-3 sm:px-3 text-right font-extrabold text-slate-900 whitespace-nowrap text-[10px] sm:text-sm">${formatarMoeda(valorTotalItem)}</td>
                </tr>
              `;
                })
                .join("")}
            </tbody>
          </table>

          <!-- TOTALIZADOR -->
          <div class="flex justify-end mb-4 sm:mb-6">
            <div class="bg-slate-900 text-white rounded-md p-2.5 sm:p-4 flex items-center justify-between w-full sm:w-72 shadow-md">
              <span class="font-extrabold text-[10px] sm:text-sm uppercase tracking-wider text-slate-300">Valor Total</span>
              <span class="font-extrabold text-lg sm:text-2xl text-white">${formatarMoeda(os.valor)}</span>
            </div>
          </div>

          <!-- OBSERVAÇÕES -->
          ${
            obsLimpa
              ? `
            <div class="mb-4 sm:mb-8 page-break-inside-avoid">
              <p class="text-[9px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Observações Técnicas</p>
              <div class="text-[10px] sm:text-sm text-slate-800 font-medium bg-slate-50 p-2 sm:p-3 rounded-md border border-slate-300 leading-relaxed break-words">
                ${esc(obsLimpa)}
              </div>
            </div>
          `
              : ""
          }

          <!-- RODAPÉ -->
          <div class="mt-4 sm:mt-8 text-center pb-4">
            <p class="text-[8px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest">Clínica da Roda &bull; Cuidando do que te move</p>
          </div>

        </div>
      </div>

      <!-- BOTÕES DO MODAL -->
      <div class="p-2 sm:p-4 bg-slate-100 border-t border-slate-300 flex gap-2 sm:gap-3 justify-end flex-shrink-0">
        <button type="button" data-acao="fechar" class="px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs sm:text-sm font-bold transition">Fechar</button>
        <button type="button" id="btnCompartilharRelatorio" class="px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 shadow-md">
          <i class="fa-solid fa-file-pdf"></i> <span id="txtBtnRelatorio">Gerar PDF</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(div);

  const fechar = () => div.remove();
  div.addEventListener("click", (e) => {
    if (e.target === div) fechar();
  });
  div.querySelector('[data-acao="fechar"]').onclick = fechar;

  const btn = div.querySelector("#btnCompartilharRelatorio");

  btn.onclick = async (e) => {
    const botao = e.currentTarget;
    const textoOriginal = botao.innerHTML;
    botao.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Gerando PDF...';
    botao.disabled = true;

    try {
      const elemento = document.getElementById("relatorioCaptura");
      const estiloOriginal = elemento.getAttribute("style");
      
      // Força o tamanho A4 para o PDF não sair cortado e evita folhas em branco
      elemento.style.width = "210mm";
      elemento.style.padding = "10mm 15mm"; 
      
      const nomeArquivo = `OS-${numeroExibicao(os).replace(/[^\w-]/g, "_")}.pdf`;

      const opt = {
        margin: 0,
        filename: nomeArquivo,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        pagebreak: { mode: ["css", "legacy"] },
      };

      const pdfBlob = await html2pdf()
        .set(opt)
        .from(elemento)
        .outputPdf("blob");

      // Restaura o estilo original
      if (estiloOriginal) {
        elemento.setAttribute("style", estiloOriginal);
      } else {
        elemento.removeAttribute("style");
      }

      const ehCapacitor = window.Capacitor?.isNativePlatform?.() || false;

      if (ehCapacitor) {
        const arquivo = new File([pdfBlob], nomeArquivo, {
          type: "application/pdf",
        });
        const objectUrl = URL.createObjectURL(arquivo);

        const resultado = await compartilharTexto({
          titulo: `Relatório OS ${numeroExibicao(os)}`,
          texto: `Segue o relatório em PDF da sua OS: ${numeroExibicao(os)}`,
          fotoUrl: objectUrl,
          isPdf: true, 
        });

        URL.revokeObjectURL(objectUrl);

        if (
          resultado.status === "compartilhado" ||
          resultado.status === "cancelado"
        ) {
          fechar();
        } else {
          toast("Compartilhamento cancelado.", "error");
        }
      } else {
        baixarBlob(pdfBlob, nomeArquivo);
        toast("PDF gerado com sucesso!");
        fechar();
      }
    } catch (err) {
      console.error("Erro ao gerar o PDF:", err);
      toast("Não foi possível gerar o PDF.", "error");
    } finally {
      botao.innerHTML = textoOriginal;
      botao.disabled = false;
    }
  };
}