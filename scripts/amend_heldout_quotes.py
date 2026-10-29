"""Amendment 1 to the held-out draft (2026-10-29): every claim gets a verbatim quote found by code in the source paper.

Why: the draft was written from page summaries made by a fetch tool. Re-reading the full texts through the Europe PMC and
E-utilities APIs showed that some summaries were wrong. This script rewrites the item file with a `quote` on each claim,
drops what the texts do not support, and adds one item from a fixed search. It never looks at any network or any score.

Changes, each with its reason (also in docs/heldout_protocol.md):
  H07 c1   narrowed to the heterozygous line, which is all the quoted sentence supports
  H08      the caveat "U87 is relatively refractory" is not in the text and is removed; the text says the two lines were
           "similarly radiosensitized"
  H13 c0,c1  the paper concludes that G2 abrogation by the CHK1 inhibitor is "essentially identical" in H1299 and A549, so the
           second claim ("unchanged in A549 at 4 h") compared different time points; both are now partial reductions
  H14      dropped: no full text is served for the source, and its three claims were not scoreable anyway
  H15      added: Myc deletion and irradiation, from the fixed search described in the protocol
"""
from __future__ import annotations

import json
from pathlib import Path

from cellproof.eval.sources import fetch_text, passage

PATH = Path("data/heldout/gupta2023_heldout.json")
doc = json.loads(PATH.read_text(encoding="utf-8"))

STARTS = {
    ("H01", 0): "Cells expressing full-length mutant p53 with LOH",
    ("H02", 0): "Figure 3 summarises the results",
    ("H02", 1): "As shown in Figure 3, flow cytometry did not detect any increase in the sub-G1",
    ("H03", 0): "Following treatment with 5 Gy γ-irradiation, the average apoptotic percentages",
    ("H04", 0): "Following treatment with irradiation, G1/S cell cycle arrest occurred in the p53+/+ cells",
    ("H05", 0): "Clonogenic survival analyses indicated that nanomolar concentrations of MK-1775",
    ("H05", 1): "Tumor cells with wild-type p53 and cells of normal tissue origin were not similarly radiosensitized",
    ("H06", 0): "Consistent with its ability to radiosensitize, MK-1775 abrogated the radiation-induced G2 block",
    ("H06", 1): "Consistent with its ability to radiosensitize, MK-1775 abrogated the radiation-induced G2 block",
    ("H07", 0): "Nutlin-3 radiosensitises p53 wild-type laryngeal squamous cell carcinoma cells",
    ("H07", 1): "Not only does retention of one wild-type copy in the presence of a mutant p53 allele",
    ("H08", 0): "Furthermore, U1242 and U87 cells were similarly radiosensitized",
    ("H08", 1): "Furthermore, U1242 and U87 cells were similarly radiosensitized",
    ("H09", 0): "VE-821 alone had negligible effects on cell cycle distribution",
    ("H09", 1): "VE-821 alone had negligible effects on cell cycle distribution",
    ("H10", 0): "One possibility is that the loss of p53 renders the cells less likely to undergo apoptosis",
    ("H11", 0): "Defective p53 consistently conferred greater chemo- and radiosensitisation",
    ("H11", 1): "In the unmatched breast cancer cell lines, gemcitabine sensitisation was greater",
    ("H12", 0): "Clonogenic survival analyses indicated that MK-8776 radiosensitized p53-defective tumor cells",
    ("H12", 1): "Clonogenic survival analyses indicated that MK-8776 radiosensitized p53-defective tumor cells",
    ("H13", 0): "In the 8-h samples (Figure 2B), there was evidence that MK-8776 accelerated unirradiated cells",
    ("H13", 1): "In follow-up experiments using asynchronously growing cells, we did observe some abrogation of the G2 block",
    ("H15", 0): "Remarkably, c-Myc deletion completely abrogated the immediate wave of apoptosis",
}

doc["items"] = [item for item in doc["items"] if item["id"] != "H14"]
doc["sources"].pop("niazi2014")
doc["sources"]["phesse2014"] = {
    "cite": "Phesse TJ et al. Cell Death Differ 2014, pages 956-966", "doi": "10.1038/cdd.2014.15", "pmcid": "PMC4013513",
    "license": "CC BY (Europe PMC)",
}
by_id = {item["id"]: item for item in doc["items"]}

h07 = by_id["H07"]["claims"][1]
h07["in"] = "heterozygous line (one wild-type copy and a mutant allele)"
h07["statement"] = "Retaining one wild-type copy does not make cells more radiosensitive to pre-treatment with Nutlin-3."
h08 = by_id["H08"]["claims"]
h08[0]["statement"] = "Radiosensitised by KU-60019; the paper says the two lines were similarly radiosensitised."
h08[1]["statement"] = "Radiosensitised by KU-60019; the paper says the two lines were similarly radiosensitised."
for claim in h08:
    claim["in"] = claim["in"].split(",")[0]
h13 = by_id["H13"]
h13["claims"] = [
    {"readout": "g2_arrest", "polarity": "decreased", "magnitude": "partial", "vs": "IR alone", "in": "H1299 at 8 h",
     "statement": "The radiation-induced G2 block was significantly reversed in the mitotic trap."},
    {"readout": "g2_arrest", "polarity": "decreased", "magnitude": "partial", "vs": "IR alone",
     "in": "asynchronous H1299 and A549 cultures, later than 4 h",
     "statement": "Some abrogation of the G2 block, essentially identical in the p53-defective and the p53 wild-type line."},
]
h13["context"] += " The paper concludes that abrogation by MK-8776 occurs to a similar extent in both lines."
doc["items"].append({
    "id": "H15", "source": "phesse2014", "locator": "Abstract; Figure 1",
    "context": "mouse intestinal crypts, conditional c-Myc deletion (AhCre Myc fl/fl) versus wild type, 14 Gy gamma irradiation, apoptosis 6 h later",
    "stimulus": "IR",
    "perturbation": {"nodes": {"Myc": 0}, "approximation": "conditional gene deletion treated as loss of function; mouse tissue, not a cell line"},
    "claims": [{
        "readout": "apoptosis", "polarity": "decreased", "magnitude": "complete", "vs": "wild-type intestine, same dose",
        "statement": "The immediate wave of apoptosis after ionizing irradiation was completely abrogated (the figure shows a significant, not total, reduction; 'completely' is the authors' wording).",
    }],
})

missing = []
for item in doc["items"]:
    text = fetch_text(doc["sources"][item["source"]]["pmcid"])
    for index, claim in enumerate(item["claims"]):
        quote = passage(text, STARTS[(item["id"], index)])
        if quote is None:
            missing.append((item["id"], index))
        claim["quote"] = quote
if missing:
    raise SystemExit(f"no unique quote found for {missing}")

doc["status"] = (
    "DRAFT, not frozen. Amendment 1 (2026-10-29): every claim carries a verbatim quote that the code found in the source "
    "paper's full text; see scripts/amend_heldout_quotes.py. No network has been scored on any item. A human has not yet "
    "checked that each quote supports its claim (D4)."
)
PATH.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
for item in doc["items"]:
    for index, claim in enumerate(item["claims"]):
        print(item["id"], index, claim["polarity"], claim.get("magnitude", ""), "|", claim["quote"][:150])
