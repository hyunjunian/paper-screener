# Paper Screener

Search titles and abstracts from published main-conference research papers. Links retain the arXiv → OpenReview → Google search priority.

## Available historical coverage

| Conference | Available year range | Editions | Papers | With review scores |
| --- | --- | ---: | ---: | ---: |
| IJCNLP-AACL | 2020–2025 | 4 | 568 | 0 |
| ACL | 1979–2026 | 48 | 14,004 | 0 |
| COLING / LREC-COLING | 1965–2025 | 28 | 8,091 | 0 |
| CVPR | 2013–2026 | 14 | 22,506 | 0 |
| EACL | 1983–2026 | 19 | 2,422 | 0 |
| EMNLP | 1996–2025 | 30 | 10,388 | 0 |
| ICLR | 2013–2026 | 14 | 16,905 | 16,233 |
| ICML | 2010–2026 | 17 | 21,106 | 9,545 |
| NAACL | 2000–2025 | 18 | 4,320 | 0 |
| NeurIPS | 1987–2025 | 39 | 29,481 | 17,623 |

The active catalog contains **231 conference-year datasets, 129,791 conference-paper records and 43,401 papers with review scores**. Year ranges contain non-annual events and archive gaps; they are not a claim of complete coverage of every historical meeting. Joint NLP meetings can appear under both participating conferences, so the total is not a unique-publication count.

The user-facing [coverage page](public/coverage.html) and [coverage metadata](public/data-coverage.json) list exact years, abstract/review availability and unresolved gaps. In particular, ICML before 2010 and CVPR before 2013 are not imported; ACL's source archive begins in 1979; COLING 1971/1976 and two mixed ACL companion volumes remain unavailable or ambiguous. Unavailable metadata is left blank.

## Main-track selection and reviews

Historical NLP papers come from a pinned [official ACL Anthology snapshot](https://github.com/acl-org/acl-anthology) and the explicitly reviewed volume selection in `scripts/acl-main-volumes.json`. Primary research, long/short papers and identified main poster volumes are included. Findings, demos, tutorials, student/industry tracks, workshops and front matter are excluded. The [Anthology manifest](public/conference-sources.json) records source URLs, volume IDs, checksums and exclusions.

Recent ICLR, ICML and NeurIPS records are reconciled against accepted-paper snapshots in [AI Conference Paper Lists](https://github.com/chang-xinhai/AI-Conference-Paper-Lists), which identifies the underlying official proceedings/OpenReview sources. NeurIPS Datasets and Benchmarks and ICML Position tracks are excluded where identified. Older ICLR status labels and scores come from [Paper Copilot](https://github.com/papercopilot/paperlists); ICLR 2015–2016 and ICML 2010–2012 use archived oral/poster/proceedings bibliographies from [huntercmd/ccf](https://github.com/huntercmd/ccf). These bibliography snapshots do not provide missing abstracts or reviews. The [ML manifest](public/core-conference-sources.json) documents each input snapshot and exact exclusion counts.

Overall ratings or recommendations are averaged on the original conference/year scale. Scores are not normalized across venues or years. Hover over a score to see the reviewer count, score field and source. Confidence and correctness are never substituted for an overall score. Existing OpenReview-linked aggregates are retained only for a matching forum ID or a unique exact normalized title within the same conference year. Those pre-existing aggregates were not re-fetched from the live API. Missing reviews display `-`, while an actual reviewed zero score displays `0.0`.

## Reproducing imports

Use Python 3.10 or later and checkouts at the pinned revisions named in each script. Cached sources live in `../work/`, outside the checkout. JSON preserves punctuation that the legacy CSV comma escape cannot represent unambiguously.

```sh
python3 scripts/import-acl-anthology.py --source-directory ../work/historical-conferences/acl-anthology
python3 scripts/import-core-conferences.py --archives ../work/historical-conferences
python3 scripts/update-conference-catalog.py
npm test
npm run build
```

The catalog prefers a reconciled JSON dataset over an older CSV of the same conference/year. Historical CSV files remain available as source snapshots but are not fetched by the app when superseded. Loading is bounded to four simultaneous requests, with selected conferences and recent years first. Dataset failures are isolated and reported in the UI.
