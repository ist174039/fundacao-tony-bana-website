import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../lib/platform-manual-data.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  fileName: "platform-manual-data.ts",
});
const { manualGuides } = await import("data:text/javascript;base64," + Buffer.from(outputText).toString("base64"));
const roles = new Set(["admin", "operational", "socio"]);

test("user manual contains all operational areas, role information and workflow steps", () => {
  assert.equal(manualGuides.length, 16);
  assert.ok(manualGuides.reduce((n, guide) => n + guide.steps.length, 0) >= 80);
  const ids = new Set();
  for (const guide of manualGuides) {
    assert.ok(!ids.has(guide.id), "Duplicate guide ID: " + guide.id);
    ids.add(guide.id);
    assert.ok(guide.location.startsWith("/platform"), guide.id + ": invalid route");
    assert.ok(guide.title && guide.summary && guide.group);
    assert.ok(guide.roles.length > 0 && guide.roles.every(role => roles.has(role)));
    assert.ok(guide.prerequisites.length >= 2);
    assert.ok(guide.steps.length >= 4, guide.id + ": workflow not detailed enough");
    for (const step of guide.steps) {
      assert.ok(step.title.length >= 5, guide.id + ": title missing");
      assert.ok(step.action.length >= 30, guide.id + ": action too short");
      assert.ok(step.expected.length >= 20, guide.id + ": outcome missing");
      assert.ok(step.ifFail.length >= 20, guide.id + ": failure action missing");
    }
    assert.ok(guide.decision.question && guide.decision.yes && guide.decision.no);
    assert.ok(guide.tip && guide.warning);
  }
  const mandatory = ["acesso", "socio", "pedidos", "financas", "escolas", "alunos", "familias", "doacoes", "entregas", "documentos", "utilizadores", "auditoria", "configuracao", "indicadores", "website", "perfil"];
  assert.deepEqual([...ids].sort(), [...mandatory].sort());
});

test("the member manual does not disclose administrative and children workflows", () => {
  const memberIds = manualGuides.filter(guide => guide.roles.includes("socio")).map(guide => guide.id);
  assert.deepEqual(memberIds.sort(), ["acesso", "perfil", "socio"].sort());
});

test("document/manual activation explicitly requires safety review and does not claim release approval", () => {
  const docs = manualGuides.find(guide => guide.id === "documentos");
  assert.match(docs.warning, /segurança|bucket|Storage/i);
  const activation = manualGuides.find(guide => guide.id === "configuracao");
  assert.match(activation.steps.map(step => step.action).join(" "), /Storage/i);
  assert.match(activation.steps.map(step => step.ifFail).join(" "), /bloqueio|409|exposição/i);
});
