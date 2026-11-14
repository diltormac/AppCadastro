import { supabaseClient } from "./config.js";
import { db } from "./db.js"; // IMPORTANDO O DEXIE
import {
  listaOS,
  setListaOS,
  adicionarListaOS,
  estado,
  itensRascunho,
  setItensRascunho,
  TAMANHO_PAGINA_OS,
  paginaOS,
  setPaginaOS,
  setTemMaisOS,
  setCarregandoMaisOS,
  TAMANHO_PAGINA_GALERIA,
  galeriaFotos,
  setGaleriaFotos,
  adicionarGaleriaFotos,
  paginaGaleria,
  setPaginaGaleria,
  setTemMaisGaleria,
  setCarregandoMaisGaleria,
  setGaleriaCarregamento,
  setGaleriaMensagemErro,
  setResumoDashboard,
  setUltimasOS,
  setDashboardCarregamento,
  setDashboardMensagemErro,
} from "./state.js";
import {
  toast,
  lerValor,
  mensagemErro,
  sinalTempoLimite,
  normalizar,
  confirmarAcao,
} from "./utils.js";


let carregando = false;

function normalizarOS(item) {
  return {
    ...item,
    status: item.status || "Pendente",
    nome: item.nome || "",
    telefone: item.telefone || "",
    documento: item.documento || "",
    registro_os: item.registro_os || "",
    numero_venda: item.numero_venda || "",
    numero_os: item.numero_os || "",
    numero_os_conserto: item.numero_os_conserto || "",
    observacao_manual: item.observacao_manual || "",
    servico: item.servico || "",
    cor: item.cor || "",
    placa: item.placa || "",
    forma_pagamento: item.forma_pagamento || "",
    desconto: Number(item.desconto) || 0,
    servico_finalizado: item.servico_finalizado || false,
    fotos_urls: Array.isArray(item.fotos_urls) ? item.fotos_urls.filter(Boolean) : [],
    itens_servicos: Array.isArray(item.itens_servicos) ? item.itens_servicos : [],
  };
}

function montarConsultaOS({ comRange = true, limite = TAMANHO_PAGINA_OS, offset = 0 } = {}) {
  let consulta = supabaseClient.from("ordens_servico").select("*");

  if (estado.filtroStatus && estado.filtroStatus !== "all") consulta = consulta.eq("status", estado.filtroStatus);
  if (estado.filtroServico && estado.filtroServico !== "all") consulta = consulta.ilike("servico", `%${estado.filtroServico}%`);

  if (estado.filtroFinalizado === "prontas") {
    consulta = consulta.eq("servico_finalizado", true);
    consulta = consulta.neq("status", "Concluído");
  }

  const termo = estado.busca.trim();
  if (termo) {
    const q = normalizar(termo);
    const qDigitos = q.replace(/\D/g, "");
    const isNumero = /^\d+$/.test(qDigitos);
    const partes = [];
    const textoSeguro = q.replace(/[%,()]/g, "").trim();

    if (textoSeguro) partes.push(`busca_normalizada.ilike.%${textoSeguro}%`);
    if (qDigitos.length >= 3) partes.push(`telefone.ilike.%${qDigitos}%`);
    if (textoSeguro) partes.push(`placa.ilike.%${textoSeguro}%`);
    if (isNumero) partes.push(`id.eq.${qDigitos}`);
    if (textoSeguro) {
      partes.push(`numero_venda.ilike.%${textoSeguro}%`);
      partes.push(`registro_os.ilike.%${textoSeguro}%`);
    }

    if (partes.length > 0) consulta = consulta.or(partes.join(","));
  }

  if (estado.dataInicial) consulta = consulta.gte("created_at", `${estado.dataInicial}T00:00:00`);
  if (estado.dataFinal) consulta = consulta.lte("created_at", `${estado.dataFinal}T23:59:59`);

  switch (estado.ordenacao) {
    case "data-asc": consulta = consulta.order("created_at", { ascending: true }); break;
    case "nome-asc": consulta = consulta.order("nome", { ascending: true }); break;
    case "nome-desc": consulta = consulta.order("nome", { ascending: false }); break;
    case "data-desc":
    default: consulta = consulta.order("created_at", { ascending: false }); break;
  }

  if (comRange) consulta = consulta.range(offset, offset + limite - 1);
  return consulta;
}

async function executarConsulta(consulta) {
  const sinal = sinalTempoLimite();
  return sinal ? consulta.abortSignal(sinal) : consulta;
}

function filtrarLocalmente(listaOriginal) {
  let filtrada = [...listaOriginal];
  
  if (estado.filtroStatus && estado.filtroStatus !== "all") {
    filtrada = filtrada.filter(o => o.status === estado.filtroStatus);
  }
  if (estado.filtroFinalizado === "prontas") {
    filtrada = filtrada.filter(o => o.servico_finalizado === true && o.status !== "Concluído");
  }
  if (estado.filtroServico && estado.filtroServico !== "all") {
    const servicoBusca = normalizar(estado.filtroServico);
    filtrada = filtrada.filter(o => normalizar(o.servico).includes(servicoBusca));
  }

  const termo = estado.busca.trim();
  if (termo) {
    const q = normalizar(termo);
    const qDigitos = q.replace(/\D/g, "");
    const isNumero = /^\d+$/.test(qDigitos);
    const textoSeguro = q.replace(/[%,()]/g, "").trim();

    filtrada = filtrada.filter(o => {
      const buscaNorm = normalizar(o.nome || "");
      const tel = (o.telefone || "").replace(/\D/g, "");
      const placa = normalizar(o.placa);
      const numVenda = normalizar(o.numero_venda);
      const regOs = normalizar(o.registro_os);
      const id = String(o.id);

      let match = false;
      if (textoSeguro && buscaNorm.includes(textoSeguro)) match = true;
      if (qDigitos.length >= 3 && tel.includes(qDigitos)) match = true;
      if (textoSeguro && placa.includes(textoSeguro)) match = true;
      if (isNumero && id === qDigitos) match = true;
      if (textoSeguro && numVenda.includes(textoSeguro)) match = true;
      if (textoSeguro && regOs.includes(textoSeguro)) match = true;

      return match;
    });
  }

  if (estado.dataInicial) {
    const dtInc = new Date(`${estado.dataInicial}T00:00:00`).getTime();
    filtrada = filtrada.filter(o => new Date(o.created_at).getTime() >= dtInc);
  }
  if (estado.dataFinal) {
    const dtFim = new Date(`${estado.dataFinal}T23:59:59`).getTime();
    filtrada = filtrada.filter(o => new Date(o.created_at).getTime() <= dtFim);
  }

  switch (estado.ordenacao) {
    case "data-asc": filtrada.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
    case "nome-asc": filtrada.sort((a, b) => (a.nome || "").localeCompare(b.nome || "")); break;
    case "nome-desc": filtrada.sort((a, b) => (b.nome || "").localeCompare(a.nome || "")); break;
    case "data-desc":
    default: filtrada.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
  }

  return filtrada;
}

export async function carregarDados() {
  if (carregando) return;
  carregando = true;
  const { atualizarTudo, definirAtualizando } = await import("./ui.js");
  definirAtualizando(true);
  
  try {
    if (!supabaseClient) throw new Error("Failed to fetch");
    setPaginaOS(0);
    const { data, error } = await executarConsulta(montarConsultaOS({ offset: 0 }));
    if (error) throw error;
    
    const norm = (data || []).map(normalizarOS);
    setListaOS(norm);
    setTemMaisOS((data || []).length === TAMANHO_PAGINA_OS);
    estado.carregamento = "ok";
    estado.mensagemErro = "";

    await db.ordens_servico.clear();
    await db.ordens_servico.bulkPut(norm);

  } catch (error) {
    console.warn("Erro online, buscando no Dexie...", error);
    const locais = await db.ordens_servico.toArray();
    if (locais.length > 0) {
      setListaOS(filtrarLocalmente(locais));
      setTemMaisOS(false); 
      estado.carregamento = "ok";
      estado.mensagemErro = "";
    } else {
      estado.carregamento = "erro";
      estado.mensagemErro = mensagemErro(error, "carregar as ordens de serviço");
      if (listaOS.length) toast(estado.mensagemErro, "error");
    }
  } finally {
    carregando = false;
    definirAtualizando(false);
    atualizarTudo();
  }
  
  carregarResumoDashboard();
  carregarUltimasOS();
  carregarGaleria();
}

export async function recarregarListaOS() {
  return carregarDados();
}

export async function carregarMaisOS() {
  if (carregando || !supabaseClient) return;
  if (!navigator.onLine) {
    toast("Você está offline. Não é possível carregar mais OS.", "error");
    return;
  }
  carregando = true;
  setCarregandoMaisOS(true);
  const { renderOS } = await import("./ui.js");
  renderOS();
  try {
    const proximaPagina = paginaOS + 1;
    const offset = proximaPagina * TAMANHO_PAGINA_OS;
    const { data, error } = await executarConsulta(montarConsultaOS({ offset }));
    if (error) throw error;
    
    const novos = (data || []).map(normalizarOS);
    adicionarListaOS(novos);
    setPaginaOS(proximaPagina);
    setTemMaisOS(novos.length === TAMANHO_PAGINA_OS);

    await db.ordens_servico.bulkPut(novos);

  } catch (error) {
    console.error(error);
    toast(mensagemErro(error, "carregar mais ordens"), "error");
  } finally {
    carregando = false;
    setCarregandoMaisOS(false);
    renderOS();
  }
}

export async function carregarResumoDashboard() {
  if (!supabaseClient) return;
  setDashboardCarregamento("carregando");
  
  try {
    const { data, error } = await executarConsulta(supabaseClient.rpc("resumo_os"));
    if (error) throw error;

    let resumo = data || {};
    const { count: totalProntas, error: errorProntas } = await executarConsulta(
      supabaseClient.from("ordens_servico").select("*", { count: "exact", head: true }).eq("servico_finalizado", true).not("status", "eq", "Concluído")
    );

    if (!errorProntas) resumo.prontas = totalProntas || 0;

    setResumoDashboard(resumo);
    setDashboardCarregamento("ok");
    setDashboardMensagemErro("");

    await db.resumo_dashboard.put({ id: 1, ...resumo });

  } catch (error) {
    console.warn("Erro no resumo online. Tentando Dexie...", error);
    const cache = await db.resumo_dashboard.get(1);
    if (cache) {
      setResumoDashboard(cache);
      setDashboardCarregamento("ok");
      setDashboardMensagemErro("");
    } else {
      setDashboardCarregamento("erro");
      setDashboardMensagemErro(mensagemErro(error, "carregar o resumo do dashboard"));
    }
  } finally {
    const { renderDashboard } = await import("./ui.js");
    renderDashboard();
  }
}

export async function carregarUltimasOS() {
  if (!supabaseClient) return;
  try {
    const { data, error } = await executarConsulta(
      supabaseClient.from("ordens_servico").select("*").order("created_at", { ascending: false }).limit(10)
    );
    if (error) throw error;
    
    const ultimas = (data || []).map(normalizarOS);
    setUltimasOS(ultimas);

    await db.ordens_servico.bulkPut(ultimas);

  } catch (error) {
    console.warn("Erro nas últimas OS online. Tentando Dexie...", error);
    
    // AQUI ESTÁ A CORREÇÃO DO ERRO:
    const locais = await db.ordens_servico.toArray();
    locais.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    setUltimasOS(locais.slice(0, 10));
  } finally {
    const { renderDashboard } = await import("./ui.js");
    renderDashboard();
  }
}

export async function carregarGaleria() {
  if (!supabaseClient) return;
  setGaleriaCarregamento("carregando");
  try {
    const { data, error } = await executarConsulta(
      supabaseClient.from("ordens_servico").select("id, nome, registro_os, numero_venda, servico, fotos_urls, created_at")
        .not("fotos_urls", "is", null).order("created_at", { ascending: false }).range(0, TAMANHO_PAGINA_GALERIA - 1)
    );
    if (error) throw error;
    const fotos = [];
    (data || []).forEach((o) => {
      (o.fotos_urls || []).forEach((url, index) => {
        if (url) fotos.push({ os: normalizarOS(o), url, index });
      });
    });
    setGaleriaFotos(fotos);
    setPaginaGaleria(0);
    setTemMaisGaleria((data || []).length === TAMANHO_PAGINA_GALERIA);
    setGaleriaCarregamento("ok");
    setGaleriaMensagemErro("");
  } catch (error) {
    console.error(error);
    setGaleriaCarregamento("erro");
    setGaleriaMensagemErro(mensagemErro(error, "carregar a galeria"));
  } finally {
    const { renderGaleria } = await import("./ui.js");
    renderGaleria();
  }
}

export async function carregarMaisGaleria() {
  if (!supabaseClient) return;
  if (!navigator.onLine) return; 
  setCarregandoMaisGaleria(true);
  const { renderGaleria } = await import("./ui.js");
  renderGaleria();
  try {
    const proximaPagina = paginaGaleria + 1;
    const offset = proximaPagina * TAMANHO_PAGINA_GALERIA;
    const { data, error } = await executarConsulta(
      supabaseClient.from("ordens_servico").select("id, nome, registro_os, numero_venda, servico, fotos_urls, created_at")
        .not("fotos_urls", "is", null).order("created_at", { ascending: false }).range(offset, offset + TAMANHO_PAGINA_GALERIA - 1)
    );
    if (error) throw error;
    const fotos = [];
    (data || []).forEach((o) => {
      (o.fotos_urls || []).forEach((url, index) => {
        if (url) fotos.push({ os: normalizarOS(o), url, index });
      });
    });
    adicionarGaleriaFotos(fotos);
    setPaginaGaleria(proximaPagina);
    setTemMaisGaleria((data || []).length === TAMANHO_PAGINA_GALERIA);
  } catch (error) {
    console.error(error);
    toast(mensagemErro(error, "carregar mais fotos"), "error");
  } finally {
    setCarregandoMaisGaleria(false);
    renderGaleria();
  }
}

function travarBotao(id, textoOcupado) {
  const btn = document.getElementById(id);
  if (!btn) return () => {};
  if (btn.disabled) return null;
  const original = btn.innerHTML;
  btn.disabled = true;
  btn.setAttribute("aria-busy", "true");
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${textoOcupado}`;
  return () => {
    btn.disabled = false;
    btn.removeAttribute("aria-busy");
    btn.innerHTML = original;
  };
}

function marcarCampoInvalido(id, mensagem) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add("is-invalid");
    el.setAttribute("aria-invalid", "true");
    el.focus();
    el.addEventListener("input", () => {
      el.classList.remove("is-invalid");
      el.removeAttribute("aria-invalid");
    }, { once: true });
  }
  toast(mensagem, "error");
}

export async function salvarEdicoes(id) {
  const osAtual = listaOS.find((o) => o.id === id);
  if (!osAtual) {
    toast("Esta OS não existe mais. Atualize a lista.", "error");
    return;
  }

  const inputRegistroVal = (document.getElementById("editRegistroOS")?.value || "").trim().toUpperCase();
  const inputVendaVal = (document.getElementById("editNumeroVenda")?.value || "").trim().toUpperCase();
  const nome = document.getElementById("editNome").value.trim().toUpperCase();
  const telefone = document.getElementById("editTelefone").value.trim();
  const documento = (document.getElementById("editDocumento")?.value || "").trim();
  const cor = (document.getElementById("editCor")?.value || "").trim().toUpperCase();
  const placa = (document.getElementById("editPlaca")?.value || "").trim().toUpperCase();
  const novoValor = lerValor(document.getElementById("editValor").value);
  const novoDesconto = lerValor(document.getElementById("editDesconto")?.value) || 0;
  const formaPagamento = document.getElementById("editFormaPagamento")?.value || "";
  const textoServicosResumo = document.getElementById("editObservacaoServicos")?.value || "";
  const textoAutomático = textoServicosResumo.trim();
  let textoUsuario = document.getElementById("editObservacao").value.trim().toUpperCase();

  if (textoUsuario === osAtual.observacao || textoUsuario === textoAutomático) textoUsuario = "";

  if (novoValor === null) return marcarCampoInvalido("editValor", "Valor total inválido.");
  if (novoValor < 0) return marcarCampoInvalido("editValor", "O valor não pode ser negativo.");

  const itensAtualizados = itensRascunho.map((item) => {
    const nomeItem = String(item.servico || "").toUpperCase();
    let novoItem = { ...item };
    if (nomeItem.includes("REFORMA")) novoItem.cor = cor; else novoItem.cor = "";
    if (nomeItem.includes("ALINHAMENTO") || nomeItem.includes("CAMBER") || nomeItem.includes("CASTER")) novoItem.placa = placa;
    else novoItem.placa = null;
    return novoItem;
  });

  let servicoResumo = "";
  let quantidadeResumo = 0;
  if (itensAtualizados.length > 0) {
    const nomesUnicos = [...new Set(itensAtualizados.map((i) => String(i.servico).toUpperCase()))];
    servicoResumo = nomesUnicos.join("/");
    quantidadeResumo = itensAtualizados.reduce((acc, i) => acc + (Number(i.quantidade) || 0), 0);
  }

  let statusFinal = osAtual.status || "Pendente";
  if (statusFinal !== "Cancelado") {
    if (inputVendaVal) statusFinal = "Concluído";
    else if (inputRegistroVal) statusFinal = "Em andamento";
    else statusFinal = "Pendente";
  }

  const dadosAtualizacao = {
    status: statusFinal,
    nome, telefone,
    documento: documento || null,
    cor, placa: placa || null,
    valor: novoValor,
    desconto: novoDesconto,
    observacao: textoAutomático,
    observacao_manual: textoUsuario,
    itens_servicos: itensAtualizados,
    servico: servicoResumo,
    quantidade: quantidadeResumo,
    registro_os: inputRegistroVal || null,
    numero_venda: inputVendaVal || null,
    forma_pagamento: formaPagamento || null,
  };

  const destravar = travarBotao("btnSalvarOS", "Salvando…");
  if (!destravar) return;
  const btnExcluir = document.getElementById("btnExcluirOS");
  if (btnExcluir) btnExcluir.disabled = true;

  try {
    if (!supabaseClient || !navigator.onLine) throw new Error("Offline");
    
    const consulta = supabaseClient.from("ordens_servico").update(dadosAtualizacao).eq("id", id);
    const sinal = sinalTempoLimite();
    const { error } = await (sinal ? consulta.abortSignal(sinal) : consulta);
    if (error) throw error;

    Object.assign(osAtual, dadosAtualizacao);
    setItensRascunho(itensAtualizados);
    
    await db.ordens_servico.update(id, dadosAtualizacao);

    toast("OS atualizada com sucesso!");
    const { fecharModal } = await import("./ui.js");
    fecharModal({ forcar: true });
    carregarResumoDashboard();
    carregarUltimasOS();
    recarregarListaOS();
    
  } catch (error) {
    console.warn(error);
    if (!navigator.onLine || /fetch|network/i.test(String(error))) {
      Object.assign(osAtual, dadosAtualizacao);
      setItensRascunho(itensAtualizados);
      
      await db.ordens_servico.update(id, dadosAtualizacao);
      await db.sync_queue.add({ osId: id, tipo: "UPDATE", dados: dadosAtualizacao });
      
      toast("Você está offline. As alterações foram salvas e serão sincronizadas quando a internet voltar.", "success");
      const { fecharModal } = await import("./ui.js");
      fecharModal({ forcar: true });
      recarregarListaOS();
      return;
    }
    
    toast(mensagemErro(error, "salvar as alterações"), "error");
    destravar();
    if (btnExcluir) btnExcluir.disabled = false;
  }
}

export async function marcarServicoFinalizado(id, status) {
  try {
    if (!supabaseClient) throw new Error("Failed to fetch");
    const { error } = await supabaseClient.from("ordens_servico").update({ servico_finalizado: status }).eq("id", id);
    if (error) throw error;

    const os = listaOS.find((o) => o.id === id);
    if (os) os.servico_finalizado = status;

    toast(status ? "Serviço marcado como PRONTO!" : "Serviço reaberto!");
    recarregarListaOS();
    carregarUltimasOS();
  } catch (error) {
    console.error(error);
    toast("Erro ao atualizar o status do serviço.", "error");
  }
}

export async function excluirOS(id) {
  const os = listaOS.find((o) => o.id === id);
  if (!os) return;
  
  if (!navigator.onLine) {
    toast("Você precisa de internet para excluir uma OS.", "error");
    return;
  }

  const qtdFotos = os.fotos_urls?.length || 0;
  const aviso = qtdFotos > 0 ? `Excluir a OS de ${os.nome || "cliente sem nome"}? As ${qtdFotos} foto(s) também serão apagadas.` : `Excluir a OS de ${os.nome || "cliente sem nome"}?`;

  const continuar = await confirmarAcao({
    titulo: "Excluir Ordem de Serviço",
    mensagem: aviso,
    textoBotao: "Sim, Excluir",
    icone: "fa-trash-can",
    cor: "red",
  });
  if (!continuar) return;

  const destravar = travarBotao("btnExcluirOS", "Excluindo…");
  if (!destravar) return;

  try {
    if (!supabaseClient) throw new Error("Failed to fetch");
    const consulta = supabaseClient.from("ordens_servico").delete().eq("id", id);
    const sinal = sinalTempoLimite();
    const { error } = await (sinal ? consulta.abortSignal(sinal) : consulta);
    if (error) throw error;

    if (qtdFotos > 0) {
      try {
        const arquivos = os.fotos_urls.map((url) => String(url).split("/").pop().split("?")[0]);
        await supabaseClient.storage.from("fotos-ordens").remove(arquivos);
      } catch (e) {}
    }
    
    setListaOS(listaOS.filter((o) => o.id !== id));
    await db.ordens_servico.delete(id);
    
    toast("OS excluída com sucesso!");
    const { fecharModal } = await import("./ui.js");
    fecharModal({ forcar: true });
    carregarResumoDashboard();
    carregarUltimasOS();
    carregarGaleria();
  } catch (error) {
    console.error(error);
    toast(mensagemErro(error, "excluir a OS"), "error");
    destravar();
  }
}

if (supabaseClient) {
  let canalRealtime = null;

  const conectarRealtime = () => {
    if (canalRealtime) return;
    canalRealtime = supabaseClient.channel("public:ordens_servico").on(
      "postgres_changes",
      { event: "*", schema: "public", table: "ordens_servico" },
      (payload) => {
        console.log("Realtime: Mudança detectada.", payload);
        const modalAberto = document.getElementById("modalDetalhes")?.classList.contains("show");
        if (!modalAberto) carregarDados();
      }
    ).subscribe();
  };

  const desconectarRealtime = () => {
    if (!canalRealtime) return;
    try { supabaseClient.removeChannel(canalRealtime); } catch (_) {}
    canalRealtime = null;
  };

  if (navigator.onLine) conectarRealtime();
  window.addEventListener("online", conectarRealtime);
  window.addEventListener("offline", desconectarRealtime);
}
