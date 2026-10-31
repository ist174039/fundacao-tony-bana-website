import { test, expect } from "@playwright/test";

test("manual de utilizador exige sessão válida no browser", async ({ page }) => {
  await page.goto("/platform/manual", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/platform\/login(?:\?|$)/, { timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Entrar na plataforma" })).toBeVisible();
});

const modules = [
  ["Sócios", "/api/area/socios"],
  ["Quotas", "/api/area/quotas"],
  ["Financeiro", "/api/area/transactions"],
  ["Pedidos", "/api/area/intentions"],
  ["Perfil", "/api/area/profile"],
  ["Utilizadores", "/api/area/users"],
  ["Perfis ABAC", "/api/area/users/access-scopes"],
  ["Auditoria", "/api/area/config/audit"],
  ["Escolas", "/api/area/schools"],
  ["Alunos", "/api/area/students"],
  ["Famílias", "/api/area/families"],
  ["Doações materiais", "/api/area/material-receptions"],
  ["Entregas", "/api/area/material-deliveries"],
  ["Stock", "/api/area/material-deliveries/stock"],
  ["Equipas documentais", "/api/area/document-teams"],
  ["Pastas", "/api/area/document-folders"],
  ["Documentos", "/api/area/documents"],
  ["Impacto social", "/api/area/social-impact"],
  ["Configuração", "/api/area/config/modules"],
  ["Acessos por módulo", "/api/area/workspace-access"],
  ["Sessão", "/api/area/session"],
];

test("matriz de módulos: APIs privadas não entregam informação a visitantes anónimos", async ({ request }) => {
  const errors = [];
  for (const [label, endpoint] of modules) {
    const response = await request.get(endpoint, { failOnStatusCode: false });
    const status = response.status();
    if (![401, 403, 404, 405, 503].includes(status)) {
      errors.push(`${label} (${endpoint}) devolveu HTTP ${status}`);
    }
    if (status === 200) errors.push(`${label} expôs HTTP 200 anonimamente`);
  }
  expect(errors).toEqual([]);
});

test("mutação de configuração e perfis não aceita pedidos anónimos", async ({ request }) => {
  const attempts = [
    { method: "PUT", path: "/api/area/config/modules", data: { moduleId: "students", enabled: true, expectedRevision: 0 } },
    { method: "POST", path: "/api/area/families", data: { representante: "E2E Teste", comunidade: "Demo" } },
    { method: "POST", path: "/api/area/quotas", data: { socioId: "demo", periodo: "2026-10", vencimento: "2026-11-01", valor: 100 } },
    { method: "POST", path: "/api/area/transactions", data: { tipo: "doacao", valor: 100, data: "2026-10-31", metodo: "dinheiro" } },
    { method: "POST", path: "/api/area/document-folders", data: { teamId: "demo", name: "Teste" } },
  ];
  for (const { method, path, data } of attempts) {
    const response = await request.fetch(path, { method, data, failOnStatusCode: false });
    expect([401, 403, 404, 405, 503], method + " " + path).toContain(response.status());
  }
});
