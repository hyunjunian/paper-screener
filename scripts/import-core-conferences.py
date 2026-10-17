#!/usr/bin/env python3
"""Reconcile accepted main papers with archived reviews and legacy proceedings."""
import argparse
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
import hashlib
import html
import json
from pathlib import Path
import re
import subprocess
import unicodedata
from urllib.parse import urlparse, parse_qs
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOTS = {
    'official-mirror': ('chang-xinhai/AI-Conference-Paper-Lists', '02b3239aacb526b4abedd12dda8a98a121b02ba6'),
    'paperlists': ('papercopilot/paperlists', '9fcfd1234879a8e5630b5116dde411ec143dd763'),
    'dblp-mirror': ('huntercmd/ccf', 'b9e024e8ee160f5290245936aab391e02e20b082'),
}
LEGACY_REVISION = '24655fe3cb99c6570cc723050346d9c2b7eb768d'


def norm(title):
    return ' '.join(unicodedata.normalize('NFKC', title).casefold().split()).rstrip('.')


def plain(value):
    return ' '.join(html.unescape(re.sub('<[^>]*>', '', value)).split())


def forum_id(url):
    p = urlparse(url or '')
    return parse_qs(p.query).get('id', [''])[0] if p.hostname == 'openreview.net' else ''


def legacy_rows(conference, cache):
    source = ROOT / f'public/conferences/{conference}.csv'
    if not source.exists():
        source = cache / 'legacy' / f'{conference}.csv'
        if not source.exists():
            source.parent.mkdir(parents=True, exist_ok=True)
            url = f'https://raw.githubusercontent.com/hyunjunian/paper-screener/{LEGACY_REVISION}/public/conferences/{conference}.csv'
            try:
                with urlopen(url, timeout=30) as r: source.write_bytes(r.read())
            except Exception:
                if conference in ['iclr2015', 'iclr2016', 'icml2010', 'icml2011', 'icml2012']: return []
                raise
    return [{**r, 'title': r['title'].replace('##', ','), 'abstract': r['abstract'].replace('##', ',')} for r in csv.DictReader(source.open())]


def legacy_html(path, conference):
    value = path.read_text()
    value = value[value.index('</nav>') + len('</nav>'):]
    current, rows = '', []
    chunks = re.split(r'(<h[23][^>]*>.*?</h[23]>)', value, flags=re.S)
    for i, chunk in enumerate(chunks):
        if chunk.startswith('<h2'):
            current = plain(chunk)
        if not chunk.startswith('<h3'): continue
        if conference.startswith('iclr') and not re.search('Oral Presentations|Poster Presentations', current, re.I): continue
        title = re.sub(r'^\d+\.\s*', '', plain(chunk)).rstrip('.')
        body = chunks[i+1] if i+1 < len(chunks) else ''
        links = re.findall(r'href="([^"]+)"', body)
        arxiv = next((urlparse(u).path.removeprefix('/abs/') for u in links if 'arxiv.org/abs/' in u), '')
        rows.append({'id': f'{conference}:{i}', 'title': title, 'abstract': '', 'arxiv': arxiv})
    unique = {}
    for row in rows: unique.setdefault(row.get('arxiv') or norm(row['title']), row)
    return list(unique.values())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archives', type=Path, default=ROOT.parent / 'work/historical-conferences')
    args = parser.parse_args()
    for directory, (_, revision) in SNAPSHOTS.items():
        actual = subprocess.check_output(['git', '-C', str(args.archives / directory), 'rev-parse', 'HEAD'], text=True).strip()
        assert actual == revision, directory
    datasets = []
    archive = args.archives / 'official-mirror/data/normalized'
    sources = []
    for family in ['iclr', 'icml', 'nips']:
        sources += [(p.stem, p, 'normalized') for p in sorted((archive / family).glob('*.json'))]
    sources += [(f'iclr{y}', args.archives / f'paperlists/iclr/iclr{y}.json', 'copilot') for y in [2013,2014,2017,2018,2019]]
    sources += [(f'iclr{y}', args.archives / f'dblp-mirror/CCF/ICLR_{y}.html', 'html') for y in [2015,2016]]
    sources += [(f'icml{y}', args.archives / f'dblp-mirror/CCF/ICML_DBLP_{y}.html', 'html') for y in [2010,2011,2012]]
    outputs = []
    for conference, path, kind in sources:
        raw = path.read_bytes()
        source_urls, omitted = [], Counter()
        if kind == 'normalized':
            source = json.loads(raw); records = source['records']; source_urls = [source['source_url']]
        elif kind == 'copilot': records = json.loads(raw)
        else: records = legacy_html(path, conference)
        archive_path = args.archives / f'paperlists/{conference[:-4]}/{conference}.json'
        review_archive = {}
        if archive_path.exists() and not archive_path.read_bytes().startswith(b'version https://git-lfs'):
            review_archive = {r['id']: r for r in json.loads(archive_path.read_text())}
        prior = legacy_rows(conference, args.archives)
        by_forum = {r['open_review']: r for r in prior if r['open_review']}
        by_title = defaultdict(list)
        for row in prior: by_title[norm(row['title'])].append(row)
        papers, seen = [], set()
        for record in records:
            if kind == 'copilot' and (record.get('track') != 'main' or record.get('status') not in ['Oral','Poster','Spotlight','Accept']):
                omitted[record.get('status','unknown')] += 1; continue
            if kind == 'normalized':
                if record.get('status') != 'accepted': omitted['not accepted'] += 1; continue
                if conference.startswith('nips') and re.search('Datasets|Benchmarks', record.get('source',{}).get('url','')):
                    omitted['Datasets and Benchmarks'] += 1; continue
                if conference.startswith('icml') and record['title'].lower().startswith('position:'):
                    omitted['Position paper'] += 1; continue
            title = record['title'].strip()
            review = forum_id(record.get('paper_url') or record.get('site'))
            match = by_forum.get(review) if review else None
            candidates = by_title.get(norm(title), [])
            if match is None and len(candidates) == 1: match = candidates[0]
            if not review and match: review = match['open_review']
            arxiv = record.get('arxiv','')
            if record.get('arxiv_url'):
                arxiv = urlparse(record['arxiv_url']).path.removeprefix('/abs/')
            if not arxiv and match: arxiv = match['arxiv']
            identity = review or record['id']
            if identity in seen: omitted['duplicate'] += 1; continue
            seen.add(identity)
            abstract = record.get('abstract') or (match['abstract'] if match else '')
            paper = {'id': identity, 'title': title, 'abstract': abstract, 'openReview': review, 'arxiv': arxiv}
            archived_review = review_archive.get(review, {})
            score_field = next((f for f in ['rating', 'recommendation'] if archived_review.get(f)), None)
            if score_field:
                scores = [float(v) for v in archived_review[score_field].split(';')]
                assert all(0 <= score <= 10 for score in scores)
                paper.update(ratingSum=sum(scores), ratingCount=len(scores), ratingField=score_field,
                             ratingSource='OpenReview via Paper Copilot archive')
            elif match and int(match['rating_count'] or '0') > 0:
                paper.update(ratingSum=float(match['rating_sum']), ratingCount=int(match['rating_count']),
                             ratingField='overall rating', ratingSource='Existing OpenReview-linked dataset')
            papers.append(paper)
        assert papers and len({p['id'] for p in papers}) == len(papers), conference
        data = '[\n' + ',\n'.join(json.dumps(p, ensure_ascii=False) for p in papers) + '\n]\n'
        repo_key = {'normalized':'official-mirror','copilot':'paperlists','html':'dblp-mirror'}[kind]
        repo, revision = SNAPSHOTS[repo_key]
        relative = path.relative_to(args.archives / repo_key)
        metadata = {
            'conference': conference, 'papers': len(papers),
            'with_abstract': sum(bool(p['abstract']) for p in papers),
            'with_reviews': sum(p.get('ratingCount',0)>0 for p in papers),
            'source_url': f'https://github.com/{repo}/blob/{revision}/{relative}',
            'upstream_urls': source_urls, 'source_sha256': hashlib.sha256(raw).hexdigest(),
            'data_sha256': hashlib.sha256(data.encode()).hexdigest(), 'excluded': dict(omitted),
            'public_review_archive': f'https://github.com/papercopilot/paperlists/blob/{SNAPSHOTS["paperlists"][1]}/{conference[:-4]}/{conference}.json' if review_archive else None,
            'public_review_archive_sha256': hashlib.sha256(archive_path.read_bytes()).hexdigest() if review_archive else None,
            'review_join': 'OpenReview forum ID, then unique normalized exact title within the same conference year; no fuzzy matching.',
            'review_source_url': f'https://github.com/hyunjunian/paper-screener/blob/{LEGACY_REVISION}/public/conferences/{conference}.csv' if prior else None,
        }
        outputs.append((conference, data, metadata))
    for conference, data, metadata in outputs:
        (ROOT / f'public/conferences/{conference}.json').write_text(data)
        print(conference,metadata['papers'],'papers,',metadata['with_reviews'],'reviewed; excluded:',metadata['excluded'])
    (ROOT/'src/core-conferences.json').write_text(json.dumps([c for c,_,_ in outputs], indent=2)+'\n')
    manifest = {
        'imported_at':datetime.now(timezone.utc).isoformat(),
        'scope':'Accepted main conference papers. Workshops, rejected/withdrawn submissions, separate NeurIPS Datasets and Benchmarks and ICML Position tracks excluded where identified in source.',
        'review_notes':[
            'Scores are means on the original conference/year scale, not normalized across conferences.',
            'Existing OpenReview-linked review aggregates are preserved for exact matched accepted papers. They were not re-fetched from the live OpenReview API in this import.',
            'Paper Copilot ICLR 2017–2019 ratings and ICLR 2022–2023 / ICML 2025 recommendations provide individual public reviewer scores. Confidence and correctness are never used as overall scores.',
        ],
        'coverage_notes':[
            'ICML before 2010 and CVPR before 2013 are not yet imported: live proceedings and DBLP bulk access are unavailable in this environment.',
            'ICLR 2015 and 2016 use archived conference oral/poster bibliographies with arXiv IDs; their abstracts and reviews are unavailable in the source.',
            'ICLR 2013/2014 historical acceptance labels rely on Paper Copilot archive labels.',
        ],
        'datasets':[m for _,_,m in outputs],
    }
    (ROOT/'public/core-conference-sources.json').write_text(json.dumps(manifest, ensure_ascii=False,indent=2)+'\n')

if __name__=='__main__': main()
