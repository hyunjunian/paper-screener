import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { getConferenceLabel, getPaperLabel, getPaperLink, parseConferenceCsv, parseConferenceJson } from '../src/utils.js';
import { loadConferenceData, loadConferenceBatches } from '../src/data-loader.js';

const header = 'id,open_review,arxiv,title,abstract,rating_sum,rating_count';

test('accepts blank abstracts, blank lines, CRLF and comma escapes', () => {
  const papers = parseConferenceCsv(`\uFEFF${header}\r\n1,,,A## B,,0,0\r\n\r\n2,,,Other,Abstract## text,9,2\r\n`, 'cvpr2026');
  assert.equal(papers.length, 2);
  assert.equal(papers[0].title, 'A, B');
  assert.equal(papers[0].abstract, '');
  assert.equal(papers[0].rating, 0);
  assert.equal(papers[1].abstract, 'Abstract, text');
  assert.equal(papers[1].rating, 4.5);
});

test('rejects HTML error responses and incomplete rows before rendering', () => {
  assert.throws(() => parseConferenceCsv('<html>Not found</html>', 'cvpr2026'), /Invalid CSV header/);
  assert.throws(() => parseConferenceCsv(`${header}\n1,,,Title`, 'cvpr2026'), /Invalid paper row/);
  assert.throws(() => parseConferenceCsv(`${header}\n1,,,Title,Abstract,0,0,unexpected`, 'cvpr2026'), /Invalid paper row/);
});

test('parses every shipped conference and all CVPR 2026 abstracts', () => {
  for (const filename of fs.readdirSync(new URL('../public/conferences/', import.meta.url))) {
    if (!filename.endsWith('.csv')) continue;
    const papers = parseConferenceCsv(fs.readFileSync(new URL(`../public/conferences/${filename}`, import.meta.url), 'utf8'), filename.slice(0, -4));
    assert.ok(papers.length > 0, filename);
    if (filename === 'cvpr2026.csv') {
      assert.equal(papers.length, 4042);
      assert.ok(papers.every(paper => paper.abstract.trim()));
    }
  }
});

test('preserves Anthology punctuation, math, blank abstracts and unique paper IDs', () => {
  const papers = parseConferenceJson([
    { id: '2025.acl-long.1', title: 'C#, C++ and ## tags', abstract: 'Compare $a,b$ with $c$.' },
    { id: '2025.acl-short.1', title: 'C#, C++ and ## tags', abstract: '' },
  ], 'acl2025');
  assert.equal(papers[0].title, 'C#, C++ and ## tags');
  assert.equal(papers[0].abstract, 'Compare $a,b$ with $c$.');
  assert.notEqual(papers[0].id, papers[1].id);
  assert.equal(papers[1].abstract, '');
  assert.equal(papers[0].rating, 0);
  assert.equal(getPaperLabel(papers[0].arxiv, papers[0].openReview), 'Google');
  assert.equal(getPaperLink('', '', papers[0].title), `https://www.google.com/search?q=${encodeURIComponent(papers[0].title)}`);
  assert.equal(getConferenceLabel('lreccoling2024'), 'LREC-COLING 2024');
  assert.equal(getConferenceLabel('aacl2025'), 'IJCNLP-AACL 2025');
});

test('rejects invalid Anthology responses and duplicate IDs before rendering', () => {
  for (const data of [null, {}, [], [null], [{ id: '1', title: 'Paper' }]]) {
    assert.throws(() => parseConferenceJson(data, 'acl2025'), /Invalid paper/);
  }
  const paper = { id: '1', title: 'Paper', abstract: '' };
  assert.throws(() => parseConferenceJson([paper, paper], 'acl2025'), /Invalid paper record/);
});

test('registers every imported dataset and verifies its provenance and coverage', () => {
  const registry = JSON.parse(fs.readFileSync(new URL('../src/anthology-conferences.json', import.meta.url), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(new URL('../public/conference-sources.json', import.meta.url), 'utf8'));
  assert.deepEqual(registry, manifest.datasets.map(dataset => dataset.conference));
  assert.equal(new Set(registry).size, registry.length);
  for (const dataset of manifest.datasets) {
    const data = fs.readFileSync(new URL(`../public/conferences/${dataset.conference}.json`, import.meta.url), 'utf8');
    assert.equal(createHash('sha256').update(data).digest('hex'), dataset.data_sha256);
    const papers = parseConferenceJson(JSON.parse(data), dataset.conference);
    assert.equal(papers.length, dataset.papers);
    assert.equal(papers.filter(paper => paper.abstract).length, dataset.with_abstract);
    assert.ok(papers.every(paper => paper.rating === 0));
    assert.ok(dataset.source_url.includes(`/acl-org/acl-anthology/${manifest.revision}/data/xml/`));
  }
});

test('preserves overall review means, zero scores, forum links and missing scores', () => {
  const papers = parseConferenceJson([
    { id: 'a', title: 'Rated', abstract: '', openReview: 'abc', ratingSum: 21, ratingCount: 3, ratingField: 'recommendation', ratingSource: 'Public archive' },
    { id: 'b', title: 'Zero', abstract: '', ratingSum: 0, ratingCount: 2 },
    { id: 'c', title: 'Missing', abstract: '', confidence: 9 },
  ], 'iclr2023');
  assert.equal(papers[0].rating, 7);
  assert.equal(papers[0].ratingCount, 3);
  assert.equal(papers[0].ratingField, 'recommendation');
  assert.equal(getPaperLink('', papers[0].openReview, papers[0].title), 'https://openreview.net/forum?id=abc');
  assert.equal(papers[1].rating, 0);
  assert.equal(papers[1].ratingCount, 2);
  assert.equal(papers[2].ratingCount, 0);
  assert.throws(() => parseConferenceJson([{ id: 'bad', title: 'Bad', abstract: '', ratingCount: -1 }], 'iclr2023'), /Invalid paper review/);
});

test('validates every active historical dataset and its visible coverage counts', () => {
  const catalog = JSON.parse(fs.readFileSync(new URL('../src/conference-catalog.json', import.meta.url), 'utf8'));
  assert.ok(Object.keys(catalog).length >= 230);
  for (const [conference, entry] of Object.entries(catalog)) {
    const data = fs.readFileSync(new URL(`../public/conferences/${conference}.${entry.format}`, import.meta.url), 'utf8');
    const papers = entry.format === 'json' ? parseConferenceJson(JSON.parse(data), conference) : parseConferenceCsv(data, conference);
    assert.equal(papers.length, entry.papers, conference);
    assert.equal(papers.filter(paper => paper.abstract).length, entry.with_abstract, conference);
    assert.equal(papers.filter(paper => paper.ratingCount > 0).length, entry.with_reviews, conference);
    assert.ok(papers.every(paper => Number.isFinite(paper.rating)), conference);
  }
  for (const conference of ['acl1979', 'emnlp1996', 'naacl2000', 'eacl1983', 'coling1965', 'aacl2020', 'iclr2015', 'iclr2016', 'icml2010']) {
    assert.ok(catalog[conference], conference);
  }
  const manifest = JSON.parse(fs.readFileSync(new URL('../public/core-conference-sources.json', import.meta.url), 'utf8'));
  for (const dataset of manifest.datasets) {
    const data = fs.readFileSync(new URL(`../public/conferences/${dataset.conference}.json`, import.meta.url), 'utf8');
    assert.equal(createHash('sha256').update(data).digest('hex'), dataset.data_sha256);
  }
  assert.equal(catalog.iclr2022.with_reviews, 1094);
  assert.equal(catalog.iclr2023.with_reviews, 1573);
});

test('reports HTTP and malformed-data failures without losing other conferences', async () => {
  await assert.rejects(loadConferenceData('acl2025', 'json', '/paper-screener/', async url => {
    assert.equal(url, '/paper-screener/conferences/acl2025.json');
    return { ok: false, status: 404 };
  }), /HTTP 404/);
  await assert.rejects(loadConferenceData('acl2025', 'json', '/', async () => ({ ok: true, json: async () => ({ error: 'bad response' }) })), /Invalid paper data/);
  const loaded = [], failed = [];
  let active = 0, maxActive = 0;
  await loadConferenceBatches(Array.from({ length: 9 }, (_, i) => i), async i => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise(setImmediate);
    active--;
    if (i === 2) throw new Error('Network failure');
    return [i];
  }, batch => loaded.push(...batch), conference => failed.push(conference));
  assert.deepEqual(failed, [2]);
  assert.deepEqual(loaded, [0, 1, 3, 4, 5, 6, 7, 8]);
  assert.ok(maxActive <= 4);
});
