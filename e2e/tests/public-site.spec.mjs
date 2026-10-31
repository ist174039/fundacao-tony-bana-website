import { test, expect } from "@playwright/test";

test("website público apresenta a missão e navegação principal", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Oportunidades que");
  await expect(page.getByRole("link", { name: /Conheça o nosso trabalho/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Fundação Tony Bana — início/i })).toBeVisible();
});

test("navegação para os pilares funciona em desktop e mobile", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: /Conheça o nosso trabalho/i }).click();
  await expect(page).toHaveURL(/#pilares$/);
  await expect(page.locator("#pilares")).toBeVisible();
});

test("menu móvel abre e fecha sem ocultar o conteúdo", async ({ page, isMobile }) => {
  test.skip(!isMobile, "A navegação móvel aplica-se apenas ao projeto mobile.");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const open = page.getByRole("button", { name: "Abrir menu" });
  await expect(open).toBeVisible();
  await open.click();
  await expect(page.getByRole("button", { name: "Fechar menu" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Navegação móvel" })).toBeVisible();
  await page.getByRole("button", { name: "Fechar menu" }).click();
  await expect(page.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "false");
});

test("layout da homepage não apresenta overflow horizontal", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(2);
});

test("login apresenta campos obrigatórios e não autentica formulário vazio", async ({ page }) => {
  await page.goto("/platform/login", { waitUntil: "domcontentloaded" });
  const email = page.getByRole("textbox", { name: "Email" });
  const password = page.locator("#platform-password");
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await expect(page.getByRole("button", { name: "Entrar na plataforma" })).toBeVisible();
  expect(await email.evaluate((element) => element.required)).toBe(true);
  expect(await password.evaluate((element) => element.required)).toBe(true);
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await expect(page).toHaveURL(/\/platform\/login$/);
});

test("área protegida redireciona visitantes anónimos para login", async ({ page }) => {
  await page.goto("/platform/area", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/platform\/login(?:\?|$)/, { timeout: 15_000 });
});
