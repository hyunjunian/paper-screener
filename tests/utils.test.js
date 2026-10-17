import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { getConferenceLabel, getPaperLabel, getPaperLink, parseConferenceCsv, parseConferenceJson } from '../src/utils.js';

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
