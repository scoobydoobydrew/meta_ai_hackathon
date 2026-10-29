"""Phenotype readout for the Gupta et al. 2023 network.

Node states of a fixed point, from the Figure 2 legend and Section 3.2 of the paper:

  proliferation  DNA_damage OFF
  arrest         p53_A, p21, Wip1 ON
  senescence     mTORC1, mTORC2, p53_A, p21 ON
  autophagy      ULK1_Beclin1, p53_K, BAX, Caspase ON
  apoptosis      p53_K, BAX, Caspase ON, ULK1_Beclin1 OFF

The paper contradicts itself on PUMA: the Figure 2 legend lists it for apoptosis and autophagy, Section 3.2 does not.
We follow Section 3.2 (no PUMA), because the paper's own claim that TUG1 knockdown or miR-221 overexpression gives
"only apoptosis" cannot hold otherwise: PUMA = p53_K & !miR221 is forced OFF whenever miR-221 is ON. The four damaged
wild-type fixed points are classified the same either way (PUMA is ON in both of them). This is a choice, not a fact.

The arrest and senescence patterns overlap (senescence is arrest plus active mTORC1/2), so senescence is tested first.
A state matching none of them is reported as None, never forced into a class.
"""
from __future__ import annotations

PHENOTYPES = ("proliferation", "arrest", "senescence", "autophagy", "apoptosis")


def classify(state: dict[str, int]) -> str | None:
    on = {node for node, value in state.items() if value}
    if "DNA_damage" not in on:
        return "proliferation"
    if {"p53_K", "BAX", "Caspase"} <= on:
        return "autophagy" if "ULK1_Beclin1" in on else "apoptosis"
    if {"p53_A", "p21"} <= on:
        if {"mTORC1", "mTORC2"} <= on:
            return "senescence"
        return "arrest" if "Wip1" in on else None
    return None
