#!/usr/bin/env node
// Reconcile GitHub Issues [REQ]/[TEST] with the existing personal GitHub Project.
// GitHub Issues remain canonical; no Notion writes, no issue status changes.
const ENDPOINT = 'https://api.github.com/graphql';
const ISSUE_PATTERN = /^\[(REQ|TEST)\]\s+(FTB-(?:TC-\d+|[A-Z]+-\d+))\b/;

export function classifyIssue(title = '') {
  const match = ISSUE_PATTERN.exec(title);
  if (!match) return null;
  return { type: match[1], key: match[2] };
}

export function planAdditions(issues, linkedContentIds) {
  const keys = new Set();
  const add = [];
  let requirements = 0;
  let tests = 0;
  for (const issue of issues) {
    const classification = classifyIssue(issue.title);
    if (!classification) continue;
    if (keys.has(classification.key)) {
      throw new Error(`Duplicate canonical ID in open Issues: ${classification.key}`);
    }
    keys.add(classification.key);
    if (classification.type === 'REQ') requirements++;
    if (classification.type === 'TEST') tests++;
    if (!linkedContentIds.has(issue.id)) add.push(issue);
  }
  return { requirements, tests, canonicalCount: keys.size, additions: add };
}

export function createGraphQLClient(token, fetchImpl = fetch) {
  if (!token || typeof token !== 'string' || !token.trim()) {
    throw new Error('Missing FTB_GH_PROJECTS_TOKEN; configure a token with access to the GitHub Project.');
  }
  return async (query, variables) => {
    const response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ftb-project-reconciliation',
      },
      body: JSON.stringify({ query, variables }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.errors?.length) {
      const errors = payload.errors?.map(e => e.message).join('; ') || `HTTP ${response.status}`;
      throw new Error(`GitHub GraphQL request failed: ${errors}`);
    }
    return payload.data;
  };
}

const PROJECT_QUERY = `query($login:String!,$number:Int!){user(login:$login){projectV2(number:$number){id title}}}`;
const ITEMS_QUERY = `query($login:String!,$number:Int!,$after:String){user(login:$login){projectV2(number:$number){items(first:100,after:$after){nodes{content{... on Issue{id}}}pageInfo{hasNextPage endCursor}}}}}`;
const ISSUES_QUERY = `query($owner:String!,$repo:String!,$after:String){repository(owner:$owner,name:$repo){issues(first:100,after:$after,states:OPEN){nodes{id number title url}pageInfo{hasNextPage endCursor}}}}`;
const ADD_MUTATION = `mutation($project:ID!,$content:ID!){addProjectV2ItemById(input:{projectId:$project,contentId:$content}){item{id}}}`;

async function paginate(request, query, variables, extract) {
  const entries = [];
  let after = null;
  do {
    const data = await request(query, { ...variables, after });
    const page = extract(data);
    if (!page?.pageInfo) throw new Error('GitHub returned no accessible project or repository data. Check token scopes.');
    entries.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) break;
    if (!page.pageInfo.endCursor || page.pageInfo.endCursor === after) {
      throw new Error('GitHub returned an invalid pagination cursor.');
    }
    after = page.pageInfo.endCursor;
  } while (true);
  return entries;
}

export async function reconcile({ request, owner = 'ist174039', repository = 'fundacao-tony-bana-website', projectNumber = 2, apply = false, requireBaseline = true, onAdd = () => {} }) {
  const data = await request(PROJECT_QUERY, { login: owner, number: projectNumber });
  const project = data?.user?.projectV2;
  if (!project?.id) throw new Error(`GitHub Project ${owner}/projects/${projectNumber} is inaccessible.`);
  const [items, issues] = await Promise.all([
    paginate(request, ITEMS_QUERY, { login: owner, number: projectNumber }, d => d.user?.projectV2?.items),
    paginate(request, ISSUES_QUERY, { owner, repo: repository }, d => d.repository?.issues),
  ]);
  const linkedIds = new Set(items.map(x => x.content?.id).filter(Boolean));
  const plan = planAdditions(issues, linkedIds);
  if (requireBaseline && (plan.requirements < 46 || plan.tests < 69)) {
    throw new Error(`Incomplete source inventory: ${plan.requirements}/46 requirements, ${plan.tests}/69 tests. Refusing write.`);
  }
  const result = { project: project.title, projectNumber, ...plan, linkedAlready: plan.canonicalCount - plan.additions.length, added: 0, dryRun: !apply };
  if (!apply) return result;
  for (const issue of plan.additions) {
    await request(ADD_MUTATION, { project: project.id, content: issue.id });
    result.added++;
    onAdd(issue);
  }
  return result;
}

function parseArgs(argv) {
  const allowed = new Set(['--apply','--dry-run','--allow-incomplete']);
  for (const arg of argv) if (!allowed.has(arg)) throw new Error(`Unknown argument: ${arg}`);
  if (argv.includes('--apply') && argv.includes('--dry-run')) throw new Error('Choose --apply or --dry-run, not both.');
  return { apply: argv.includes('--apply'), requireBaseline: !argv.includes('--allow-incomplete') };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const request = createGraphQLClient(process.env.FTB_GH_PROJECTS_TOKEN);
    const outcome = await reconcile({ request, ...args });
    console.log(JSON.stringify({ ...outcome, additions: outcome.additions.map(x => `#${x.number}`) }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
