import { test, expect } from "@playwright/test";

const disabledModules = [
  "/api/area/schools",
  "/api/area/students",
  "/api/area/material-receptions",
  "/api/area/material-deliveries",
];

test("APIs administrativas não devolvem dados anónimos", async ({ request }) => {
  for (const endpoint of [
    "/api/area/session",
    "/api/area/workspace-access",
    "/api/area/config/modules",
  ]) {
    const response = await request.get(endpoint);
    expect([401, 403, 503], endpoint).toContain(response.status());
    expect(response.headers()["content-type"], endpoint).toContain("application/json");
  }
});

test("módulos sensíveis desligados respondem 503, sem payload privado", async ({ request }) => {
  for (const endpoint of disabledModules) {
    const response = await request.get(endpoint);
    expect(response.status(), endpoint).toBe(503);
    const json = await response.json();
    expect(json).toHaveProperty("error");
    for (const key of ["escolas", "alunos", "rececoes", "entregas", "documents"]) {
      expect(json, endpoint).not.toHaveProperty(key);
    }
  }
});

test("escritas anónimas são rejeitadas com os módulos desligados", async ({ request }) => {
  // Identificadores sintéticos; não há credenciais, serviço Firebase Admin ou módulos ativos.
  for (const endpoint of [
    "/api/area/schools",
    "/api/area/students",
    "/api/area/material-receptions",
    "/api/area/material-deliveries",
  ]) {
    const response = await request.post(endpoint, {
      data: { codigo: "E2E-NO-WRITE", nome: "Dado sintético não persistível" },
    });
    expect(response.status(), endpoint).toBe(503);
    expect(await response.json()).toHaveProperty("error");
  }
});
