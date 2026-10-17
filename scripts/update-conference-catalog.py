#!/usr/bin/env python3
"""Index available main-paper datasets and publish their honest coverage."""
import csv
from datetime import datetime, timezone
import html
import json
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parents[1]
catalog = {}
for path in sorted((ROOT/'public/conferences').glob('*.csv')):
    papers = list(csv.DictReader(path.open()))
    catalog[path.stem] = {'format':'csv', 'papers':len(papers), 'with_abstract':sum(bool(p['abstract']) for p in papers), 'with_reviews':sum(int(p['rating_count'] or '0')>0 for p in papers)}
for path in sorted((ROOT/'public/conferences').glob('*.json')):
    papers = json.loads(path.read_text())
    catalog[path.stem] = {'format':'json', 'papers':len(papers), 'with_abstract':sum(bool(p['abstract']) for p in papers), 'with_reviews':sum(p.get('ratingCount',0)>0 for p in papers)}
(ROOT/'src/conference-catalog.json').write_text(json.dumps(catalog,indent=2)+'\n')
families=defaultdict(lambda:{'years':[], 'papers':0,'with_abstract':0,'with_reviews':0})
for conference,data in catalog.items():
    family=conference[:-4]
    if family=='lreccoling':family='coling'
    entry=families[family];entry['years'].append(int(conference[-4:]))
    for key in ['papers','with_abstract','with_reviews']:entry[key]+=data[key]
for entry in families.values():entry['years'].sort()
notes=[
    'This is available-archive coverage, not a claim that every paper from every historical meeting has been recovered.',
    'ACL published research proceedings in the Anthology archive begin in 1979; earlier ACL meetings are not covered.',
    'COLING 1971 and 1976 are absent from this source snapshot. LREC-COLING 2024 is included with COLING in this table.',
    'ACL 2003 and 2007 mixed demo/student/poster companion volumes are excluded because reliable paper-level track labels are unavailable.',
    'ICML before 2010 and CVPR before 2013 are not imported: proceedings/DBLP bulk access is unavailable in this environment.',
    'ICLR 2015–2016 are archived oral/poster bibliographies, without abstracts or reviews. Early ICLR status labels are historical archive labels.',
    'Joint NLP meetings appear under each participating conference. Summed counts are conference-paper records, not unique publications.',
    'NeurIPS separate Datasets and Benchmarks and ICML Position tracks are excluded from the reconciled 2020–2026 datasets where identified.',
    'Scores are arithmetic means of overall rating or recommendation on the original conference/year scale; different scales are not normalized or directly comparable.',
    'Public OpenReview score archives are supplemented by existing OpenReview-linked aggregates matched by forum ID or unique exact title. Existing aggregates were not re-fetched from the live API.',
    'No confidence, correctness or generated scores are substituted. Unavailable abstracts and scores remain blank.',
]
coverage={'updated_at':datetime.now(timezone.utc).isoformat(),'datasets':len(catalog),'families':dict(families),'notes':notes,
          'sources':['conference-sources.json','core-conference-sources.json']}
(ROOT/'public/data-coverage.json').write_text(json.dumps(coverage,indent=2)+'\n')
labels={'nips':'NeurIPS','aacl':'IJCNLP-AACL','coling':'COLING / LREC-COLING'}
rows=''.join(f'<tr><td>{html.escape(labels.get(name,name.upper()))}</td><td>{d["years"][0]}–{d["years"][-1]} ({len(d["years"])} editions)</td><td>{d["papers"]:,}</td><td>{d["with_abstract"]:,}</td><td>{d["with_reviews"]:,}</td></tr>' for name,d in sorted(families.items()))
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Paper Screener — Data coverage</title><style>body{max-width:1000px;margin:40px auto;padding:0 20px;font:16px/1.6 system-ui;color:#292524}table{border-collapse:collapse;width:100%;font-size:14px}td,th{text-align:left;border-bottom:1px solid #ddd;padding:10px}a{color:#92400e}.table{overflow:auto}</style><body><a href="./">← Paper Screener</a><h1>Data coverage &amp; review scores</h1><p>Published main research papers from available archives. Only the years listed in the coverage metadata are included; ranges below contain non-annual meetings and archival gaps.</p><div class="table"><table><thead><tr><th>Conference</th><th>Available years</th><th>Papers</th><th>Abstracts</th><th>Review scores</th></tr></thead><tbody>'''+rows+'''</tbody></table></div><h2>Scope and limitations</h2><ul>'''+''.join('<li>'+html.escape(n)+'</li>' for n in notes)+'''</ul><p><a href="data-coverage.json">Exact years and counts</a> · <a href="conference-sources.json">ACL Anthology sources</a> · <a href="core-conference-sources.json">ML paper and review sources</a></p></body></html>'''
(ROOT/'public/coverage.html').write_text(page)
print('Datasets:',len(catalog),'Papers:',sum(d['papers'] for d in catalog.values()),'With reviews:',sum(d['with_reviews'] for d in catalog.values()))
