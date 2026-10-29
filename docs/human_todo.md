# What only the human can do

These cannot be delegated to the assistant, because the assistant would be checking its own work. Each is a reading task, not
a biology exam: the question is always "does this sentence say what the row claims?".

1. **D4: check the held-out claims (23 rows).** Open `data/heldout/gupta2023_heldout.json`. Each claim has a `statement`, a
   `readout`, a `polarity` (present, absent, decreased, ...) and a `quote` copied from the paper. For each, ask whether the
   quote supports the statement and the polarity. If a claim is wrong, do not edit the file: write it down and tell the
   assistant, because a change needs a logged amendment (`docs/heldout_protocol.md`, last section).
   - 10 of the 23 are scored. They are the ones with category `scoreable` or `scoreable_with_new_nodes`; run
     `python -m cellproof.cli score` to see which.
2. **M4: label 50 extracted claims.** Open `data/labels/m4_sample.csv`. Each row is a claim a model extracted from a paper
   (`source`, `effect`, `target`) with the sentence it quoted. In the `label` column write one of: `correct`,
   `wrong_direction`, `wrong_entity`, `not_a_mechanism`, `quote_does_not_support`. This gives the extraction accuracy; until
   it is filled, no accuracy may be quoted anywhere. The sample was drawn with a fixed seed before anyone looked at it.
3. **Before the repository is made public:** run a secret scan (the `.env` file is git-ignored and must stay untracked), read
   `THIRD_PARTY.md`, and check that no full paper text is committed (they live in `data/raw`, which is ignored).
4. **The video:** its first line must say what pre-existed and what was built this week (the brief, rule 9). Record it from
   `make verify` output, which replays cached model outputs and needs no network.
