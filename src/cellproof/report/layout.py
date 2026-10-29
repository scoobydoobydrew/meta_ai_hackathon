"""Where each node sits on the report's network drawing, which module it belongs to, and which nodes define each fate.

The positions are drawn by hand on a 1000 x 760 canvas so that the modules read as a decision flowing downward:
damage in, sensing and checkpoint kinases, then three working modules (p53, cell cycle, survival signalling), the
apoptosis machinery, and the four fates. The fate definitions are the ones in network/phenotypes.py.
"""
from __future__ import annotations

WIDTH, HEIGHT = 1000, 760

GROUPS = {
    "input": "Input",
    "sensing": "Sensing and checkpoint kinases",
    "p53": "p53 module",
    "cycle": "Cell cycle",
    "survival": "Survival signalling",
    "death": "Apoptosis machinery",
}

NODES = {
    "DNA_damage": ("input", 500, 46),
    "ATR": ("sensing", 215, 150),
    "ATM_pH2AX": ("sensing", 395, 150),
    "DNA_PK": ("sensing", 575, 150),
    "AMPK_MAPK": ("sensing", 765, 150),
    "CHK1": ("sensing", 215, 242),
    "CHK2": ("sensing", 395, 242),
    "Mdm2": ("p53", 85, 340),
    "p53": ("p53", 235, 340),
    "hTERT": ("p53", 150, 425),
    "Wip1": ("p53", 70, 505),
    "p53_A": ("p53", 195, 505),
    "p53_K": ("p53", 315, 470),
    "Sirt1": ("p53", 85, 595),
    "p53_INP1": ("p53", 250, 590),
    "Cdc25": ("cycle", 415, 345),
    "Wee1": ("cycle", 530, 345),
    "Cdc2_CycB": ("cycle", 645, 345),
    "RB": ("cycle", 440, 440),
    "E2F1": ("cycle", 555, 440),
    "Myc": ("cycle", 665, 440),
    "p21": ("cycle", 540, 530),
    "PTEN": ("survival", 745, 325),
    "AKT": ("survival", 855, 325),
    "TUG1": ("survival", 940, 405),
    "miR221": ("survival", 820, 405),
    "mTORC1": ("survival", 760, 490),
    "mTORC2": ("survival", 885, 490),
    "ULK1_Beclin1": ("survival", 820, 575),
    "WWP1": ("survival", 700, 575),
    "BCL2": ("death", 390, 650),
    "PUMA": ("death", 480, 650),
    "BAX": ("death", 570, 650),
    "Caspase": ("death", 660, 650),
}

# Fate readout nodes sit on the bottom row; the nodes that define each fate (network/phenotypes.py) link to them.
FATES = {
    "arrest": ("Arrest", 200, 725, ["p53_A", "p21", "Wip1"]),
    "senescence": ("Senescence", 400, 725, ["mTORC1", "mTORC2", "p53_A", "p21"]),
    "autophagy": ("Autophagy", 600, 725, ["ULK1_Beclin1", "p53_K", "BAX", "Caspase"]),
    "apoptosis": ("Apoptosis", 800, 725, ["p53_K", "BAX", "Caspase"]),
}

# Module outlines: (group, x, y, width, height).
HALOS = [
    ("sensing", 150, 108, 700, 178),
    ("p53", 30, 292, 340, 342),
    ("cycle", 380, 300, 304, 262),
    ("survival", 694, 290, 296, 316),
    ("death", 350, 614, 340, 62),
]

NEW_NODES = ["ATR", "CHK1", "CHK2", "DNA_PK"]
NODE_ORDER = list(NODES)
