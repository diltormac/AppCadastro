
import Dexie from "https://cdn.jsdelivr.net/npm/dexie@4.0.0/dist/modern/dexie.mjs";

export const db = new Dexie("OSFacilDB");

// Define as tabelas e seus índices (os campos que usamos para pesquisar e ordenar)
db.version(1).stores({
  ordens_servico: "id, status, created_at, nome, servico_finalizado, servico",
  resumo_dashboard: "id", // Guarda o último resumo (Total, Pendentes, etc)
  sync_queue: "++id, osId, tipo" // Fila de coisas para enviar ao servidor quando voltar online
});
