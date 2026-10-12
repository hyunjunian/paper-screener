import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { parseConferenceCsv } from '../src/utils.js';

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
