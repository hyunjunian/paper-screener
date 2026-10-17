#!/usr/bin/env python3
"""Import main-conference papers from the official ACL Anthology XML repository."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
REVISION = "fea0d77e817370d7e09417470426f2a929001b8b"
DATASETS = [
    (f"acl{year}", f"{year}.acl", ("long", "short"))
    for year in (2023, 2024, 2025, 2026)
] + [
    (f"emnlp{year}", f"{year}.emnlp", ("main",))
    for year in (2023, 2024, 2025)
] + [
    (f"naacl{year}", f"{year}.naacl", ("long", "short"))
    for year in (2024, 2025)
] + [
    ("eacl2023", "2023.eacl", ("main",)),
    ("eacl2024", "2024.eacl", ("long", "short")),
    ("eacl2026", "2026.eacl", ("long", "short")),
    ("lreccoling2024", "2024.lrec", ("main",)),
    ("coling2025", "2025.coling", ("main",)),
    ("aacl2023", "2023.ijcnlp", ("main", "short")),
    ("aacl2025", "2025.ijcnlp", ("long", "short")),
]


def text(element):
    return " ".join("".join(element.itertext()).split()) if element is not None else ""


def load_dataset(dataset, revision, cache):
    conference, collection, volume_ids = dataset
    source_url = (
        f"https://raw.githubusercontent.com/acl-org/acl-anthology/{revision}"
        f"/data/xml/{collection}.xml"
    )
    source_path = cache / revision / f"{collection}.xml"
    if not source_path.exists():
        request = Request(source_url, headers={"User-Agent": "paper-screener-data-import"})
        with urlopen(request, timeout=60) as response:
            raw = response.read()
        ET.fromstring(raw)
        source_path.parent.mkdir(parents=True, exist_ok=True)
        source_path.write_bytes(raw)
    raw = source_path.read_bytes()
    root = ET.fromstring(raw)
    assert root.get("id") == collection, collection
    volumes = {volume.get("id"): volume for volume in root.findall("volume")}
    records = []
    ids = set()
    for volume_id in volume_ids:
        volume = volumes[volume_id]
        for paper in volume.findall("paper"):
            # Paper 0 is the proceedings/front matter, not a research paper.
            if paper.get("id") == "0":
                continue
            paper_id = f"{collection}-{volume_id}.{paper.attrib['id']}"
            title = text(paper.find("title"))
            abstract = text(paper.find("abstract"))
            if not title or paper_id in ids:
                raise ValueError(f"Missing title or duplicate paper: {paper_id}")
            ids.add(paper_id)
            # Anthology author OpenReview IDs are author profiles, not paper IDs.
            # No paper scores/arXiv IDs are inferred from prose or profile links.
            records.append({"id": paper_id, "title": title, "abstract": abstract})
    if not records:
        raise ValueError(f"No research papers in {collection}")
    data = "[\n" + ",\n".join(json.dumps(paper, ensure_ascii=False) for paper in records) + "\n]\n"
    assert json.loads(data) == records
    metadata = {
        "conference": conference,
        "papers": len(records),
        "with_abstract": sum(bool(record["abstract"]) for record in records),
        "volumes": [f"{collection}-{volume_id}" for volume_id in volume_ids],
        "source_url": source_url,
        "source_sha256": hashlib.sha256(raw).hexdigest(),
        "data_sha256": hashlib.sha256(data.encode()).hexdigest(),
    }
    return conference, data, metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--revision", default=REVISION, help="Full upstream commit SHA")
    parser.add_argument("--cache", type=Path, default=ROOT.parent / "work" / "conference-import")
    args = parser.parse_args()
    if not re.fullmatch(r"[0-9a-f]{40}", args.revision):
        parser.error("--revision must be a full commit SHA for reproducible imports")
    with ThreadPoolExecutor(max_workers=4) as pool:
        results = list(pool.map(
            lambda dataset: load_dataset(dataset, args.revision, args.cache), DATASETS
        ))
    # Fetch and validate every source before changing any shipped data.
    for conference, data, metadata in results:
        (ROOT / "public" / "conferences" / f"{conference}.json").write_text(data, encoding="utf-8")
        print(f"{conference}: {metadata['papers']} papers, {metadata['with_abstract']} abstracts")
    (ROOT / "src" / "anthology-conferences.json").write_text(
        json.dumps([conference for conference, _, _ in results], indent=2) + "\n", encoding="utf-8"
    )
    manifest = {
        "source": "https://github.com/acl-org/acl-anthology",
        "revision": args.revision,
        "imported_at": datetime.now(timezone.utc).isoformat(),
        "scope": "Main-conference long/short/main research papers; no Findings, workshops, demos, tutorials, industry, student tracks, or front matter.",
        "datasets": [metadata for _, _, metadata in results],
    }
    (ROOT / "public" / "conference-sources.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


if __name__ == "__main__":
    main()
