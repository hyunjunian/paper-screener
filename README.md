# Paper Screener

This is a simple web app to help screen research papers from AI conferences. It allows you to search for keywords in paper titles and abstracts, and load more results as needed.

## ACL Anthology coverage

The site includes the following main-conference research papers from the [official ACL Anthology data](https://github.com/acl-org/acl-anthology). Long and short papers are included where published separately.

| Conference | Years | Papers | With abstracts |
| --- | --- | ---: | ---: |
| ACL | 2023–2026 | 6,010 | 6,008 |
| EMNLP | 2023–2025 | 4,124 | 4,093 |
| NAACL | 2024–2025 | 1,280 | 1,257 |
| EACL | 2023, 2024, 2026 | 948 | 947 |
| LREC-COLING / COLING | 2024–2025 | 2,311 | 2,311 |
| IJCNLP-AACL | 2023, 2025 | 329 | 235 |
| **Total** | **16 conference-year datasets** | **15,002** | **14,851** |

Findings, workshops, demos, tutorials, industry/student tracks and proceedings front matter are excluded. Missing abstracts remain blank. These records do not publish review ratings, so the site displays `-`. Paper links use the existing Google title search fallback.

Imported records use JSON to preserve punctuation such as `C#,` and literal `##`, which cannot be represented unambiguously by the older CSV comma escape. Existing conference CSV files and links are unchanged. The provenance manifest at [public/conference-sources.json](public/conference-sources.json) records source URLs, the upstream commit, selected volumes, coverage and checksums.

To reproduce the import with Python 3.10 or later:

```sh
python3 scripts/import-acl-anthology.py
npm test
npm run build
```

The importer pins the upstream commit and caches XML outside the checkout. To import a newer upstream snapshot, supply `--revision <full-commit-sha>`. It validates all downloads before replacing data and regenerates the conference registry.
