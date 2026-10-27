import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyIssue, planAdditions, reconcile, createGraphQLClient } from '../scripts/sync-github-project.mjs';

test('classifies canonical requirements and cases only', () => {
  assert.deepEqual(classifyIssue('[REQ] FTB-SEC-001 — Data encryption'), { type: 'REQ', key: 'FTB-SEC-001' });
  assert.deepEqual(classifyIssue('[TEST] FTB-TC-069 — Mixed plaintext'), { type: 'TEST', key: 'FTB-TC-069' });
  assert.equal(classifyIssue('[FTB-SEC-001] Duplicate issue'), null);
  assert.equal(classifyIssue('[REQ] not-a-canonical-id'), null);
});

test('deduplicates linked issues and ignores unrelated issues', () => {
  const issues = [
    { id: 'r', title: '[REQ] FTB-SEC-001 — X' },
    { id: 't', title: '[TEST] FTB-TC-001 — X' },
    { id: 'u', title: 'Unrelated' },
  ];
  const p = planAdditions(issues, new Set(['r']));
  assert.equal(p.canonicalCount, 2);
  assert.equal(p.requirements, 1);
  assert.equal(p.tests, 1);
  assert.deepEqual(p.additions.map(x => x.id), ['t']);
});

test('rejects duplicate canonical IDs rather than importing duplicates', () => {
  assert.throws(() => planAdditions([
    { id: 'a', title: '[REQ] FTB-WEB-001 — A' },
    { id: 'b', title: '[REQ] FTB-WEB-001 — B' },
  ], new Set()), /Duplicate canonical ID/);
});

function fakeRequestFactory() {
  const mutations = [];
  const request = async (query, vars) => {
    if (query.includes('addProjectV2ItemById')) {
      mutations.push(vars.content);
      return { addProjectV2ItemById: { item: { id: 'created' } } };
    }
    if (query.includes('projectV2(number:$number){id title}')) {
      return { user: { projectV2: { id: 'P1', title: 'Fundação Tony Bana — Delivery & Quality' } } };
    }
    if (query.includes('items(first:100')) {
      return { user: { projectV2: { items: { nodes: [{ content: { id: 'R1' } }], pageInfo: { hasNextPage: false, endCursor: null } } } } };
    }
    if (query.includes('issues(first:100')) {
      if (!vars.after) return { repository: { issues: { nodes: [
        { id: 'R1', number: 13, title: '[REQ] FTB-SEC-001 — A' },
      ], pageInfo: { hasNextPage: true, endCursor: 'next' } } } };
      return { repository: { issues: { nodes: [
        { id: 'T1', number: 54, title: '[TEST] FTB-TC-001 — A' },
      ], pageInfo: { hasNextPage: false, endCursor: null } } } };
    }
    throw new Error('Unexpected request');
  };
  return { request, mutations };
}

test('dry-run is read-only and paginates GitHub issues', async () => {
  const { request, mutations } = fakeRequestFactory();
  const r = await reconcile({ request, requireBaseline: false });
  assert.equal(r.canonicalCount, 2);
  assert.equal(r.linkedAlready, 1);
  assert.deepEqual(r.additions.map(x => x.id), ['T1']);
  assert.equal(r.added, 0);
  assert.deepEqual(mutations, []);
});

test('apply only adds missing items; future retries are idempotent', async () => {
  const { request, mutations } = fakeRequestFactory();
  const r = await reconcile({ request, requireBaseline: false, apply: true });
  assert.equal(r.added, 1);
  assert.deepEqual(mutations, ['T1']);
});

test('baseline guard prevents incomplete source writes', async () => {
  const { request, mutations } = fakeRequestFactory();
  await assert.rejects(reconcile({ request, apply: true }), /Incomplete source inventory/);
  assert.deepEqual(mutations, []);
});

test('missing credentials fail before any fetch', () => {
  assert.throws(() => createGraphQLClient(''), /Missing FTB_GH_PROJECTS_TOKEN/);
});

test('GraphQL request fails if server returns API errors', async () => {
  const client = createGraphQLClient('synthetic', async () => ({
    ok: true,
    json: async () => ({ errors: [{ message: 'Forbidden' }] }),
  }));
  await assert.rejects(client('{viewer{login}}', {}), /Forbidden/);
});
