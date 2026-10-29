import json

import pytest

from cellproof.extract.claims import PROMPT, Claim, extract_paper, is_grounded, names_an_outcome
from cellproof.meta_client import cost_usd

PAPER = (
    "TITLE: Checkpoint signalling\n## Results\n"
    "ATR phosphorylates CHK1 on Ser345 after replication stress, and so activates it.\n"
    "CHK1 inhibits CDC25A–dependent progression into mitosis."
)


def claim(quote, source="ATR", target="CHK1", **extra):
    return Claim(
        source=source, target=target, effect="activates", context="in vitro", evidence_quote=quote, location="Results", **extra
    )


@pytest.mark.parametrize(
    "quote, expected",
    [
        ("ATR phosphorylates CHK1 on Ser345 after replication stress", True),
        ("atr  phosphorylates\nchk1 on ser345", True),  # case and whitespace folded
        ("CHK1 inhibits CDC25A-dependent progression", True),  # an en dash in the paper, a hyphen in the quote
        ("ATR inhibits everything", False),  # not in the paper
        ("ATR", False),  # too short to be evidence
    ],
)
def test_grounding(quote, expected):
    assert is_grounded(claim(quote), PAPER) is expected


@pytest.mark.parametrize(
    "source, target, expected",
    [
        ("p53", "MDM2", False),
        ("ATM", "apoptosis", True),
        ("VE-821", "radiosensitivity", True),
        ("ATR inhibition", "clonogenic survival", True),
        ("apoptosis-inducing factor", "p53", False),
        ("autophagy-related gene 5", "p62", False),
        ("tumor suppressor p53", "p21", False),
        ("p21", "G2 arrest", True),
    ],
)
def test_outcome_level_names(source, target, expected):
    assert names_an_outcome(claim("x" * 20, source=source, target=target)) is expected


def test_the_prompt_asks_for_mechanisms_and_contains_nothing_from_the_held_out_set():
    assert "Do NOT extract outcomes" in PROMPT
    for token in ("VE-821", "MK-1775", "MK-8776", "NU7026", "KU-60019", "nutlin", "HCT116", "H1299", "A549", "U2OS"):
        assert token.lower() not in PROMPT.lower(), token


class _Resp:
    def __init__(self, text):
        self.output_text = text
        self.usage = None


class _Responses:
    def __init__(self, text):
        self.text, self.calls = text, []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return _Resp(self.text)


class FakeClient:
    def __init__(self, text):
        self.responses = _Responses(text)


def test_extract_paper_sorts_claims_into_grounded_ungrounded_and_outcome_level(tmp_path):
    claims = [
        claim("ATR phosphorylates CHK1 on Ser345 after replication stress").model_dump(),
        claim("ATR is the master regulator of everything in the cell").model_dump(),  # not in the paper
        claim("CHK1 inhibits CDC25A-dependent progression", source="CHK1", target="radiosensitivity").model_dump(),
    ]
    client = FakeClient(json.dumps({"claims": claims}))
    result = extract_paper("PMC1", PAPER, client=client, cache_dir=tmp_path)
    assert result.counts == {"proposed": 3, "grounded": 1, "ungrounded": 1, "outcome_level": 1}
    sent = client.responses.calls[0]
    assert sent["text"]["format"]["strict"] is True and sent["reasoning"] == {"effort": "low"}
    assert "PMC1" in sent["input"] and PAPER in sent["input"]


def test_cost_from_usage():
    usage = {"input_tokens": 1_000_000, "output_tokens": 100_000, "input_tokens_details": {"cached_tokens": 0}}
    assert cost_usd(usage, "muse-spark-1.3") == pytest.approx(1.25 + 0.425)
    assert cost_usd(usage, "muse-wonder-1.0") == pytest.approx(4.0 + 2.0)
    assert cost_usd(None, "muse-spark-1.3") == 0.0
