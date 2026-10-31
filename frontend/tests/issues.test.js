import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apexApi, headerFromRow, issueLabel, planSave } from '../lib/apexApi';
import { apexConfig } from '../lib/apexConfig';
import { clearFormaToken } from '../lib/forma';
import { emptyIssue } from '../services/tagModel';

const PROJECT = '6c9ae883-f20c-475b-a0a7-2b22e9f31baf';
const ISSUE5 = 'b88fd317-b8aa-4cc3-a09d-8b61d64a3b39';
const json = (b, status = 200) => new Response(JSON.stringify(b), { status });
const now = () => Date.now() / 1000;

beforeEach(() => {
  globalThis.localStorage = { getItem: () => JSON.stringify('tok'), setItem() {}, removeItem() {} };
  apexConfig.emachine.writesEnabled = true;
  clearFormaToken();
  apexApi.issues.clear();
});
afterEach(() => vi.restoreAllMocks());

/** fetch mock routed by URL; returns the recorded calls. */
function mock(routes) {
  const calls = [];
  globalThis.fetch = vi.fn(async (url, init) => {
    calls.push({ url: String(url), init });
    for (const [match, reply] of routes) if (String(url).includes(match)) return reply(String(url), init);
    throw new Error('unrouted ' + url);
  });
  return calls;
}
const token = () => json({ access_token: 't', expires_at: now() + 3600 });
const sqlOf = (url) => atob(decodeURIComponent(new URL(url, 'http://x').searchParams.get('query')).replace(/=+$/, '') + '==='.slice(0, (4 - (decodeURIComponent(new URL(url, 'http://x').searchParams.get('query')).replace(/=+$/, '').length % 4)) % 4));

it('lists the job\'s open and in-progress Forma issues as "number : description" (the captured requests)', async () => {
  const calls = mock([
    ['token.test', token],
    ['/projects?', () => json({ results: [{ id: PROJECT }] })],
    ['/issues?', () => json({ pagination: { totalResults: 2 }, results: [
      { id: 'a', displayId: 2, title: 'Delay', description: 'Can’t close JC due to plumbers' },
      { id: ISSUE5, displayId: 5, title: 'Punch List', description: 'Room has been completely dropped and punched' },
    ] })],
  ]);
  const { projectId, options } = await apexApi.issues.options('A2155');
  expect(projectId).toBe(PROJECT);
  expect(options.map((o) => o.label)).toEqual(['2 : Can’t close JC due to plumbers', '5 : Room has been completely dropped and punched']);
  expect(options[1]).toMatchObject({ issueId: ISSUE5, displayId: 5, title: 'Punch List' });
  expect(calls.find((c) => c.url.includes('/projects?')).url).toContain('filter[jobNumber]=A2155');
  const issues = calls.find((c) => c.url.includes('/issues?')).url;
  expect(issues).toContain(`/construction/issues/v1/projects/${PROJECT}/issues?`);
  expect(issues).toContain('filter[status]=open,in_progress');
  expect(issues).toContain('limit=200');
  expect(issueLabel(5, 'x')).toBe('5 : x');
});

it('reads every page when there are more issues than one page holds', async () => {
  let n = 0;
  mock([
    ['token.test', token],
    ['/projects?', () => json({ results: [{ id: PROJECT }] })],
    ['/issues?', (url) => {
      const offset = Number(new URL(url).searchParams.get('offset'));
      const page = Array.from({ length: offset === 0 ? 200 : 57 }, (_, i) => ({ id: `i${++n}`, displayId: n, description: 'd' }));
      return json({ pagination: { totalResults: 257 }, results: page });
    }],
  ]);
  const { options } = await apexApi.issues.options('A2155');
  expect(options).toHaveLength(257);
});

it('shares one request between callers and survives a caller giving up (no abort leaks into the cache)', async () => {
  const calls = mock([
    ['token.test', token],
    ['/projects?', () => json({ results: [{ id: PROJECT }] })],
    ['/issues?', () => json({ pagination: { totalResults: 1 }, results: [{ id: 'a', displayId: 1, description: 'd' }] })],
  ]);
  const first = apexApi.issues.options('A2155', AbortSignal.abort()); // a caller that is already cancelled
  const second = apexApi.issues.options('A2155');
  expect((await second).options).toHaveLength(1);
  expect((await first).options).toHaveLength(1);
  await apexApi.issues.options('A2155');
  expect(calls.filter((c) => c.url.includes('/issues?'))).toHaveLength(1);
});

it('a job without a Forma project has no issues (and is not an error)', async () => {
  mock([['token.test', token], ['/projects?', () => json({ results: [] })]]);
  expect(await apexApi.issues.options('ZZ9')).toEqual({ projectId: null, options: [] });
});

it('reads a tag\'s saved issue rows with the captured query', async () => {
  const calls = mock([['model_query', () => json({ data: { records: [{ Id: '10000000', tag_id: '10000099', issue_id: ISSUE5 }, { Id: '10000001', tag_id: '10000099', issue_id: '' }] } })]]);
  const rows = await apexApi.tags.issueRows('10000099');
  expect(rows).toEqual([{ id: '10000000', issueId: ISSUE5 }]);
  // the captured query is base64 of exactly this SQL
  expect(atob('c2VsZWN0ICogZnJvbSB0YWdfaXNzdWVzIHdoZXJlIHRhZ19pZCA9ICcxMDAwMDA5OSc')).toBe("select * from tag_issues where tag_id = '10000099'");
  expect(sqlOf(calls[0].url)).toBe("select * from tag_issues where tag_id = '10000099'");
});

it('labels saved issues from the list, or by asking Forma for ones that are no longer open', async () => {
  mock([
    ['token.test', token],
    [`/issues/closed-1`, () => json({ id: 'closed-1', displayId: 9, title: 'Old', description: 'Finished work', status: 'closed' })],
    [`/issues/gone`, () => json({}, 404)],
  ]);
  const facts = { projectId: PROJECT, options: [{ issueId: ISSUE5, displayId: 5, title: 'T', label: '5 : Room has been completely dropped and punched' }] };
  const lines = await apexApi.issues.describe([{ id: '1', issueId: ISSUE5 }, { id: '2', issueId: 'closed-1' }, { id: '3', issueId: 'gone' }], facts);
  expect(lines.map((l) => l.label)).toEqual(['5 : Room has been completely dropped and punched', '9 : Finished work', 'Issue gone…']);
  expect(lines.map((l) => l.id)).toEqual(['1', '2', '3']);
});

it('saving sends one tag_issues insert per newly picked issue, and nothing for unchanged ones', () => {
  const saved = { ...headerFromRow({ Id: 10000099, tag_number: 'A2155-1', status: 'Draft', JobNo: 'A2155' }), issuesLoaded: true, issues: [{ key: 'k1', id: '10000000', issueId: ISSUE5, label: '5 : x' }] };
  const picked = { ...emptyIssue(), issueId: 'new-guid', label: '15 : y' };
  const reqs = planSave({ ...saved, issues: [...saved.issues, picked] }, saved);
  expect(reqs).toHaveLength(1);
  expect(reqs[0].url).toBe('/datamodel/api/tag_issues');
  expect(Object.fromEntries(new URLSearchParams(reqs[0].body))).toEqual({ tag_id: '10000099', issue_id: 'new-guid' });
  expect(planSave(saved, saved)).toEqual([]);
});

it('deletes a saved issue with the same delete statement style as cost lines (tag_issues by Id)', async () => {
  const calls = mock([['model_query', () => json({})]]);
  await apexApi.tags.deleteLine('issues', '10000000');
  expect(sqlOf(calls[0].url)).toBe("delete from tag_issues where Id='10000000'");
});
