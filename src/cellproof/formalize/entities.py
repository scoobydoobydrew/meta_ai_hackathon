"""Names in extracted claims -> nodes of the network.

A name resolves in this order, and the first hit wins:
  1. a node of the base network, through the HGNC symbols assigned to it below plus their HGNC aliases
     (https://www.genenames.org, CC0) and a few hand-written aliases for complexes, families and stimuli;
  2. a name that is ambiguous on purpose (listed in AMBIGUOUS with the reason): not mapped;
  3. a gene found uniquely in HGNC by symbol, alias or previous symbol: a candidate NEW node;
  4. nothing: unmapped.

The symbol assigned to each node is a nomenclature choice that follows the "official names" column of Supplementary
Table S2 of the base paper (docs/entities.md prints both side by side for checking). Merging several genes into one node
(ATM and H2AX; the Cdc25 family) follows the base network, not biology: Table S2 names Cdc25 "Cell division cycle 25c",
so only CDC25C is mapped to it and CDC25A and CDC25B are left as unmapped genes.
"""
from __future__ import annotations

import json
import os
import re
import time
import urllib.parse
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path

HGNC = "https://rest.genenames.org/fetch"
CACHE = Path(__file__).resolve().parents[3] / "data" / "ontology" / "hgnc_cache.json"

# base node -> HGNC approved symbols
NODE_GENES: dict[str, tuple[str, ...]] = {
    "ATM_pH2AX": ("ATM", "H2AX"),
    "AMPK_MAPK": ("PRKAA1", "PRKAA2"),
    "Mdm2": ("MDM2",),
    "p53": ("TP53",),
    "p53_INP1": ("TP53INP1",),
    "p21": ("CDKN1A",),
    "Wip1": ("PPM1D",),
    "RB": ("RB1",),
    "Myc": ("MYC",),
    "WWP1": ("WWP1",),
    "hTERT": ("TERT",),
    "E2F1": ("E2F1",),
    "Cdc25": ("CDC25C",),
    "Sirt1": ("SIRT1",),
    "Cdc2_CycB": ("CDK1", "CCNB1"),
    "Wee1": ("WEE1",),
    "TUG1": ("TUG1",),
    "miR221": ("MIR221",),
    "PTEN": ("PTEN",),
    "AKT": ("AKT1",),
    "mTORC1": ("RPTOR",),
    "mTORC2": ("RICTOR",),
    "ULK1_Beclin1": ("ULK1", "BECN1"),
    "BCL2": ("BCL2",),
    "PUMA": ("BBC3",),
    "BAX": ("BAX",),
    "Caspase": ("CASP3", "CASP7"),
}

# Names that HGNC does not carry (complexes, families, stimuli). Each is a choice, listed so that it can be argued with.
MANUAL_ALIASES: dict[str, tuple[str, ...]] = {
    "DNA_damage": (
        "DNA damage", "DNA double-strand breaks", "DNA double strand breaks", "double-strand breaks", "DSB", "DSBs",
        "ionizing radiation", "IR", "ionising radiation", "gamma irradiation", "gamma-irradiation", "X-ray", "X-rays",
        "radiation", "DNA lesions", "genotoxic stress",
    ),
    "ATM_pH2AX": ("gamma-H2AX", "γH2AX", "pH2AX", "phospho-H2AX", "ATM/pH2AX"),
    "AMPK_MAPK": ("AMPK", "MAPK", "AMPK/MAPK", "AMPKalpha"),
    "Cdc25": ("CDC25",),
    "Cdc2_CycB": ("Cdc2", "Cdc2/cyclin B", "Cdc2-cyclin B", "CDK1/cyclin B", "CDK1/cyclin B1", "cyclin B", "cyclin B/CDK1"),
    "mTORC1": ("mTORC1", "TORC1"),
    "mTORC2": ("mTORC2", "TORC2"),
    "Caspase": ("caspase", "caspases", "caspase-3", "caspase-7", "executioner caspases"),
    "miR221": ("miR-221", "microRNA-221", "miR221"),
    "AKT": ("AKT", "Akt", "PKB", "protein kinase B"),
}

# DNA damage as the paper's input: DNA damage itself, double-strand breaks, ionizing radiation. UV, replication stress and
# single-stranded DNA are different signals (they mainly drive ATR) and are not mapped to the input.
DNA_DAMAGE = re.compile(
    r"(dna damage|\bdsbs?\b|double[- ]stran(ded|d) (dna )?breaks?|ionizing radiation|ionising radiation|\bir\b|"
    r"gamma[- ]irradiation|γ[- ]irradiation|x[- ]rays?)",
    re.IGNORECASE,
)
NOT_DNA_DAMAGE = re.compile(r"(replication|\buv|ssdna|single[- ]stran|aphidicolin|hydroxyurea|\bhu\b)", re.IGNORECASE)

# Where HGNC alone gets it wrong or is silent: jargon that HGNC lists as an alias of a different gene, and spellings it does
# not carry. (name key -> HGNC symbol, or a node id when the value is a base node.)
OVERRIDES: dict[str, str] = {
    "nbs1": "NBN",  # HGNC lists NBS1 as an alias of NLRP2; in DNA repair papers it is nibrin
    "rpa32": "RPA2",
    "trf2": "TERF2",
    "p53bp1": "TP53BP1",
}
OVERRIDE_BASE_NODES = {"prb": "RB", "p21cip1waf1sdi1": "p21", "p21waf1cip1": "p21"}

# Not mapped, on purpose.
AMBIGUOUS: dict[str, str] = {
    "ros": "reactive oxygen species, not a gene (HGNC lists ROS as an alias of ROS1)",
    "dream": "a multi-protein complex (HGNC lists DREAM as an alias of KCNIP3)",
    "mtor": "mTORC1 and mTORC2 are separate nodes and the claim does not say which complex",
    "cdc25a": "the base node Cdc25 is CDC25C (Table S2); CDC25A is a different gene",
    "cdc25b": "the base node Cdc25 is CDC25C (Table S2); CDC25B is a different gene",
    "cdks": "a family",
    "cdk": "a family",
    "atm/atr": "two kinases",
    "chk1/chk2": "two kinases",
    "p38": "a MAPK family member not named in Table S2",
    "erk": "a MAPK family member not named in Table S2",
    "jnk": "a MAPK family member not named in Table S2",
}

# Short ids for the new nodes the held-out items use; any other gene keeps its HGNC symbol.
NEW_NODE_IDS = {"CHEK1": "CHK1", "CHEK2": "CHK2", "PRKDC": "DNA_PK"}
NEW_ALIASES = {"dna-pk": "PRKDC", "dnapk": "PRKDC", "chk1": "CHEK1", "chk2": "CHEK2"}  # when HGNC has no exact alias


def key(name: str) -> str:
    """Case, spaces, hyphens, slashes and brackets folded: "p21 Cip1/Waf1" and "P21CIP1-WAF1" share one key."""
    return re.sub(r"[^0-9a-zα-ω]", "", name.lower().replace("γ", "gamma"))


def _http_json(field: str, term: str) -> list[dict]:
    url = f"{HGNC}/{field}/{urllib.parse.quote(term, safe='')}"
    request = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "cellproof-hackathon/0.1"})
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.load(response)["response"]["docs"]
    except urllib.error.HTTPError as error:
        if 400 <= error.code < 500:  # a term HGNC cannot parse, such as one with a slash: no gene
            return []
        raise


class Hgnc:
    """HGNC lookups with an on-disk cache (data/ontology/hgnc_cache.json). Offline mode never calls the network."""

    def __init__(self, path: Path = CACHE, fetch: Callable[[str, str], list[dict]] = _http_json, pause: float = 0.12):
        self.path, self.fetch, self.pause = path, fetch, pause
        self.cache: dict[str, list[dict]] = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
        self.dirty = False

    def _query(self, field: str, term: str) -> list[dict]:
        cache_key = f"{field}:{term}"
        if cache_key not in self.cache:
            if os.environ.get("CELLPROOF_OFFLINE") == "1":
                return []
            self.cache[cache_key] = [
                {k: d.get(k) for k in ("symbol", "name", "hgnc_id", "alias_symbol", "prev_symbol", "alias_name")}
                for d in self.fetch(field, term)
            ]
            self.dirty = True
            time.sleep(self.pause)
        return self.cache[cache_key]

    def symbol(self, symbol: str) -> dict | None:
        docs = self._query("symbol", symbol)
        return docs[0] if docs else None

    def find(self, name: str) -> list[dict]:
        """Genes whose symbol, alias or previous symbol is `name`. The name is tried as written, in upper case and
        without hyphens or spaces; an approved symbol under any spelling beats an alias."""
        compact = name.replace("-", "").replace(" ", "")
        spellings = list(dict.fromkeys((name, name.upper(), compact, compact.upper())))
        for field in ("symbol", "alias_symbol", "prev_symbol"):
            for term in spellings:
                docs = self._query(field, term)
                if docs:
                    return docs
        return []

    def save(self) -> None:
        if self.dirty:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.path.write_text(json.dumps(self.cache, indent=1, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
            self.dirty = False


@dataclass(frozen=True)
class Grounding:
    kind: str  # base | new | ambiguous | unmapped
    node: str | None  # node id for base and new
    detail: str = ""


class Grounder:
    def __init__(self, hgnc: Hgnc | None = None):
        self.hgnc = hgnc or Hgnc()
        self.index: dict[str, str] = {}
        for node in [*NODE_GENES, *MANUAL_ALIASES]:
            self.index[key(node)] = node
        for node, aliases in MANUAL_ALIASES.items():
            for alias in aliases:
                self.index[key(alias)] = node
        for node, symbols in NODE_GENES.items():
            for symbol in symbols:
                doc = self.hgnc.symbol(symbol)
                if doc is None:
                    raise LookupError(f"HGNC has no gene {symbol} (node {node})")
                for term in [symbol, doc["name"], *(doc.get("alias_symbol") or []), *(doc.get("prev_symbol") or [])]:
                    self.index.setdefault(key(term), node)
        self.cache: dict[str, Grounding] = {}

    def ground(self, name: str) -> Grounding:
        if name not in self.cache:
            self.cache[name] = self._ground(name)
        return self.cache[name]

    def _ground(self, name: str) -> Grounding:
        folded = key(name)
        if folded in self.index:
            return Grounding("base", self.index[folded])
        if folded in OVERRIDE_BASE_NODES:
            return Grounding("base", OVERRIDE_BASE_NODES[folded], "override")
        if DNA_DAMAGE.search(name):
            if NOT_DNA_DAMAGE.search(name):
                return Grounding("ambiguous", None, "mixes DNA damage with replication stress or UV")
            return Grounding("base", "DNA_damage", "stimulus pattern")
        if folded in {key(a) for a in AMBIGUOUS}:
            return Grounding("ambiguous", None, next(r for a, r in AMBIGUOUS.items() if key(a) == folded))
        symbol = OVERRIDES.get(folded) or NEW_ALIASES.get(name.lower().replace(" ", ""))
        docs = [self.hgnc.symbol(symbol)] if symbol else self.hgnc.find(name)
        docs = [d for d in docs if d]
        if len(docs) == 1:
            gene = docs[0]["symbol"]
            if any(gene in symbols for symbols in NODE_GENES.values()):
                node = next(n for n, symbols in NODE_GENES.items() if gene in symbols)
                return Grounding("base", node, f"HGNC {gene}")
            return Grounding("new", NEW_NODE_IDS.get(gene, re.sub(r"\W", "_", gene)), f"HGNC {gene}")
        if len(docs) > 1:
            return Grounding("ambiguous", None, "HGNC: " + ", ".join(d["symbol"] for d in docs))
        return Grounding("unmapped", None)
