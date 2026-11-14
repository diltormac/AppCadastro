// Usa o Dexie que já foi carregado globalmente pelo index.html
const db = new window.Dexie("OSFacilDB");

// Define as tabelas e seus índices
db.version(1).stores({
  ordens_servico: "id, status, created_at, nome, servico_finalizado, servico",
  resumo_dashboard: "id",
  sync_queue: "++id, osId, tipo"
});

export { db };
