Held-out set status: FROZEN v1 (2026-10-29). Every claim carries a verbatim quote that code found in the source paper's full text (scripts/amend_heldout_quotes.py). No network had been scored on any item when this was frozen. A human has not yet checked that each quote supports its claim (D4): results computed from this set are provisional until then. Any change needs a logged amendment (docs/heldout_protocol.md).

| claim | readout | polarity | how scored | base | naive_min2 | verified_min2 | repaired_min2 | naive_min1 | verified_min1 | repaired_min1 | no-information baseline |
|---|---|---|---|---|---|---|---|---|---|---|---|
| H01.1 | senescence | absent | absolute | correct | correct | correct | correct | correct | correct | correct | WRONG |
| H02.1 | arrest | present | absolute | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG |
| H02.2 | apoptosis | absent | absolute | correct | correct | correct | correct | correct | correct | correct | correct |
| H03.1 | apoptosis | present | absolute | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG | correct |
| H04.1 | g2_arrest | present | absolute | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG | correct |
| H06.1 | g2_arrest | decreased | contrast | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG |
| H06.2 | g2_arrest | unchanged | contrast | correct | correct | correct | correct | correct | correct | correct | correct |
| H09.2 | g2_arrest | decreased | contrast | n/e | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG |
| H10.1 | apoptosis | absent | absolute | n/e | correct | correct | correct | correct | correct | correct | correct |
| H15.1 | apoptosis | decreased | contrast | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG | WRONG |

| network | correct | wrong | not expressible | of scoreable claims |
|---|---|---|---|---|
| base | 3 | 5 | 2 | 10 |
| naive_min2 | 4 | 6 | 0 | 10 |
| verified_min2 | 4 | 6 | 0 | 10 |
| repaired_min2 | 4 | 6 | 0 | 10 |
| naive_min1 | 4 | 6 | 0 | 10 |
| verified_min1 | 4 | 6 | 0 | 10 |
| repaired_min1 | 4 | 6 | 0 | 10 |
| no-information baseline | 5 | 5 | 0 | 10 |
