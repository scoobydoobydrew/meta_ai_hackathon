import os

import pytest
from dotenv import load_dotenv

from cellproof.meta_client import complete

load_dotenv()


@pytest.mark.live
@pytest.mark.skipif(not os.environ.get("MODEL_API_KEY"), reason="MODEL_API_KEY not set")
def test_meta_api_answers(tmp_path):
    res = complete("Reply with the word: ok", cache_dir=tmp_path)
    assert not res.from_cache
    assert "ok" in res.text.lower()
