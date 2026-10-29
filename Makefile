PY ?= python

.PHONY: test smoke

test:
	$(PY) -m pytest -m "not live"

smoke:
	$(PY) -m cellproof.cli smoke
