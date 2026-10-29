PY ?= python

.PHONY: test smoke verify extract

test:
	$(PY) -m pytest -m "not live"

smoke:
	$(PY) -m cellproof.cli smoke

# Re-runs everything from the cached model outputs: no API call, no cost, same numbers. A cache miss is an error.
verify:
	$(PY) -m cellproof.cli verify

# The only target that spends money: calls the Meta Model API for any request not yet in cache/.
extract:
	$(PY) -m cellproof.cli corpus
	$(PY) -m cellproof.cli extract --kind mechanism
	$(PY) -m cellproof.cli extract --kind stimulus
	$(PY) -m cellproof.cli augment
