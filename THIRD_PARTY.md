# Third-party dependencies

All are installed from PyPI as declared dependencies (pinned in `pyproject.toml`), none is vendored.
Licenses below were read from each package's installed metadata on 2026-10-29.

| Package | Version | License (from package metadata) | Source | Role |
|---|---|---|---|---|
| openai | 3.41.0 | Apache-2.0 | https://github.com/openai/openai-python | SDK used to call the Meta Model API (OpenAI-compatible) |
| pydantic | 2.14.1 | MIT | https://github.com/pydantic/pydantic | Structured claim and rule schemas |
| typer | 0.27.3 | MIT | https://github.com/fastapi/typer | CLI |
| rich | 15.0.0 | MIT | https://github.com/Textualize/rich | Terminal tables |
| python-dotenv | 1.2.4 | BSD-3-Clause | https://github.com/theskumar/python-dotenv | Loads `.env` |
| clingo | 5.8.2 | MIT | https://github.com/potassco/clingo | ASP solver |
| z3-solver | 5.3.2.0 | MIT | https://github.com/Z3Prover/z3 | SMT solver |
| mpbn | 4.4 | CeCILL | https://github.com/bnediction/mpbn | Most-permissive Boolean network analysis |
| biodivine_aeon | 1.4.2 | MIT | https://pypi.org/project/biodivine-aeon/ | Boolean network symbolic analysis |
| pyboolnet | 3.0.16 | LGPL (trove classifier) | https://github.com/hklarner/pyboolnet | Trap spaces, model checking |
| pytest | 9.2.0 | MIT | https://github.com/pytest-dev/pytest | Tests (dev only) |

## Services

- Meta Model API (`https://api.meta.ai/v1`), Standard model IDs only (never `-contributor`).

## Data and models

- Base Boolean network: TBD (source, license and verified node count to be recorded here once chosen).
- Open-access paper corpus (Europe PMC): TBD.
