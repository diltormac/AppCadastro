import { servicosIniciaisPadrao, supabaseClient } from "./config.js";
import { toast } from "./utils.js";

const CHAVE_CATALOGO = "@osfacil_catalogo_servicos";
const TABELA_CATALOGO = "catalogo_servicos";

function catalogoValido(lista) {
  return (
    Array.isArray(lista) &&
    lista.every(
      (s) =>
        s && typeof s.nome === "string" && Number.isFinite(Number(s.valor)),
    )
  );
}

function lerLocalStorage() {
  const salvo = localStorage.getItem(CHAVE_CATALOGO);
  if (!salvo) return null;
  try {
    const lista = JSON.parse(salvo);
    if (catalogoValido(lista)) return lista;
  } catch (e) {
    console.error("Catálogo salvo está corrompido; restaurando o padrão.", e);
  }
  return null;
}

function gravarLocalStorage(lista) {
  try {
    localStorage.setItem(CHAVE_CATALOGO, JSON.stringify(lista));
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function obterCatalogoServicos() {
  // 1) Tenta buscar do Supabase
  if (supabaseClient && navigator.onLine) {
    try {
      const { data, error } = await supabaseClient
        .from(TABELA_CATALOGO)
        .select("id, nome, valor")
        .order("id", { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const lista = data.map((s) => ({
          id: s.id,
          nome: s.nome,
          valor: Number(s.valor),
        }));
        gravarLocalStorage(lista);
        return lista;
      }
    } catch (e) {
      console.error("Falha ao buscar catálogo no Supabase:", e);
    }
  }

  // 2) Fallback: localStorage
  const local = lerLocalStorage();
  if (local) return local;

  // 3) Último recurso: padrão
  const padrao = servicosIniciaisPadrao.map((s) => ({ ...s }));
  gravarLocalStorage(padrao);
  return padrao;
}

export async function salvarCatalogoServicos(catalogo) {
  // Sempre salva localmente primeiro (offline-first)
  const okLocal = gravarLocalStorage(catalogo);

  // Sincroniza com o Supabase (delete-all + insert para manter IDs limpos)
  if (supabaseClient && navigator.onLine) {
    try {
      const { error: delError } = await supabaseClient
        .from(TABELA_CATALOGO)
        .delete()
        .neq("id", 0);

      if (delError) throw delError;

      if (Array.isArray(catalogo) && catalogo.length > 0) {
        const payload = catalogo.map((s) => ({
          nome: s.nome,
          valor: Number(s.valor),
        }));
        const { data, error: insError } = await supabaseClient
          .from(TABELA_CATALOGO)
          .insert(payload)
          .select("id, nome, valor");

        if (insError) throw insError;

        if (Array.isArray(data)) {
          const listaSincronizada = data.map((s) => ({
            id: s.id,
            nome: s.nome,
            valor: Number(s.valor),
          }));
          gravarLocalStorage(listaSincronizada);
        }
      }
    } catch (e) {
      console.error("Falha ao sincronizar catálogo com Supabase:", e);
      toast(
        "Catálogo salvo localmente, mas não foi possível sincronizar com a nuvem.",
        "error",
      );
      return okLocal;
    }
  }

  if (!okLocal) {
    toast(
      "Não foi possível salvar a lista de serviços neste computador.",
      "error",
    );
  }
  return okLocal;
}
