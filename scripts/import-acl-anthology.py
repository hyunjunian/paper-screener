#!/usr/bin/env python3
"""Import the reviewed historical main-volume selection from ACL Anthology."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
REVISION = 'fea0d77e817370d7e09417470426f2a929001b8b'
DATASETS = json.loads((ROOT / 'scripts/acl-main-volumes.json').read_text())


def text(element):
    return ' '.join(''.join(element.itertext()).split()) if element is not None else ''


def load_dataset(dataset, revision, cache, source_directory=None):
    conference = dataset['conference']
    records, sources, volumes, seen, excluded = [], [], [], set(), []
    for source in dataset['sources']:
        collection = source['collection']
        url = f'https://raw.githubusercontent.com/acl-org/acl-anthology/{revision}/data/xml/{collection}.xml'
        path = cache / revision / f'{collection}.xml'
        if not path.exists():
            path.parent.mkdir(parents=True, exist_ok=True)
            if source_directory:
                shutil.copyfile(source_directory / 'data/xml' / f'{collection}.xml', path)
            else:
                with urlopen(Request(url, headers={'User-Agent': 'paper-screener-data-import'}), timeout=60) as response:
                    raw = response.read()
                ET.fromstring(raw)
                path.write_bytes(raw)
        raw = path.read_bytes()
        root = ET.fromstring(raw)
        assert root.get('id') == collection
        by_id = {v.get('id'): v for v in root.findall('volume')}
        sources.append({'url': url, 'sha256': hashlib.sha256(raw).hexdigest()})
        for vid in source['volumes']:
            volumes.append(f'{collection}-{vid}')
            for paper in by_id[vid].findall('paper'):
                number = paper.attrib['id']
                title = text(paper.find('title'))
                if number == '0' or not title or (not paper.findall('author') and re.search(r'^(preface|foreword|proceedings|author index|table of contents|international conference.*index)', title, re.I)):
                    excluded.append(f'{collection}-{vid}.{number}')
                    continue
                if collection[0].isdigit():
                    paper_id = f'{collection}-{vid}.{number}'
                elif collection.startswith('W') or collection == 'C69':
                    paper_id = f'{collection}-{int(vid):02d}{int(number):02d}'
                else:
                    paper_id = f'{collection}-{vid}{int(number):0{4-len(vid)}d}'
                # The 1969 archive contains both preprints and repeated abstracts.
                identity = (title.casefold(), tuple(text(a) for a in paper.findall('author')))
                if collection == 'C69' and identity in seen:
                    excluded.append(paper_id)
                    continue
                seen.add(identity)
                records.append({'id': paper_id, 'title': title, 'abstract': text(paper.find('abstract'))})
    assert records and len({p['id'] for p in records}) == len(records), conference
    data = '[\n' + ',\n'.join(json.dumps(p, ensure_ascii=False) for p in records) + '\n]\n'
    assert json.loads(data) == records
    metadata = {
        'conference': conference, 'papers': len(records),
        'with_abstract': sum(bool(p['abstract']) for p in records),
        'with_reviews': 0, 'volumes': volumes,
        'source_url': sources[0]['url'], 'sources': sources,
        'excluded_front_matter_or_duplicate_ids': excluded,
        'data_sha256': hashlib.sha256(data.encode()).hexdigest(),
    }
    return conference, data, metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', default=REVISION)
    parser.add_argument('--cache', type=Path, default=ROOT.parent / 'work/conference-import')
    parser.add_argument('--source-directory', type=Path, help='Optional checkout of acl-org/acl-anthology at --revision')
    args = parser.parse_args()
    if not re.fullmatch('[0-9a-f]{40}', args.revision):
        parser.error('--revision must be a full upstream commit SHA')
    if args.source_directory:
        import subprocess
        actual = subprocess.check_output(['git', '-C', str(args.source_directory), 'rev-parse', 'HEAD'], text=True).strip()
        if actual != args.revision:
            parser.error('Source checkout revision does not match --revision')
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(lambda dataset: load_dataset(dataset, args.revision, args.cache, args.source_directory), DATASETS))
    for conference, data, metadata in results:
        (ROOT / f'public/conferences/{conference}.json').write_text(data, encoding='utf-8')
        print(f"{conference}: {metadata['papers']} papers, {metadata['with_abstract']} abstracts")
    (ROOT / 'src/anthology-conferences.json').write_text(json.dumps([c for c, _, _ in results], indent=2) + '\n')
    manifest = {
        'source': 'https://github.com/acl-org/acl-anthology', 'revision': args.revision,
        'imported_at': datetime.now(timezone.utc).isoformat(),
        'scope': 'Published primary research and long/short/poster volumes in the reviewed historical volume selection; no Findings, workshops, demos, tutorials, student or industry tracks.',
        'coverage_notes': [
            'Archive coverage is not a claim that every historical meeting has archived proceedings. ACL research proceedings in this source start in 1979.',
            'COLING 1971 and 1976 are absent from this source snapshot.',
            'The mixed ACL 2003 and ACL 2007 demo/student/poster companion volumes are excluded because paper-level track labels are unavailable.',
            'Joint meetings appear under each participating conference, including ACL-COLING and ACL-EACL. Counts across conferences are not unique-publication counts.',
            'Review scores are not published in the Anthology metadata; missing abstracts and reviews remain absent.',
        ],
        'datasets': [m for _, _, m in results],
    }
    (ROOT / 'public/conference-sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
