import pytest

from cellproof.meta_client import CacheMiss, complete


class _Resp:
    output_text = "ok"
    usage = None


class _Responses:
    def __init__(self):
        self.calls = []

    def create(self, **kwargs):
        self.calls.append(kwargs)
        return _Resp()


class FakeClient:
    def __init__(self):
        self.responses = _Responses()


def test_second_identical_call_is_served_from_cache(tmp_path):
    client = FakeClient()
    first = complete("hi", client=client, cache_dir=tmp_path)
    second = complete("hi", client=client, cache_dir=tmp_path)
    assert (first.from_cache, second.from_cache) == (False, True)
    assert second.text == "ok"
    assert len(client.responses.calls) == 1


def test_model_and_params_are_part_of_the_cache_key(tmp_path):
    client = FakeClient()
    complete("hi", client=client, cache_dir=tmp_path)
    complete("hi", model="other-model", client=client, cache_dir=tmp_path)
    complete("hi", client=client, cache_dir=tmp_path, temperature=0)
    assert len(client.responses.calls) == 3


def test_params_reach_the_api_unchanged(tmp_path):
    client = FakeClient()
    complete("hi", client=client, cache_dir=tmp_path, temperature=0)
    assert client.responses.calls[0] == {"model": "muse-spark-1.3", "input": "hi", "temperature": 0}


def test_a_long_prompt_is_not_stored_in_the_cache_file_but_is_still_keyed(tmp_path):
    import json

    client = FakeClient()
    long_prompt = "paper text " * 5000
    complete(long_prompt, client=client, cache_dir=tmp_path)
    (file,) = tmp_path.glob("*.json")
    request = json.loads(file.read_text(encoding="utf-8"))["request"]
    assert request["input"]["stored"] is False and request["input"]["chars"] > 20_000
    assert long_prompt not in file.read_text(encoding="utf-8")
    assert complete(long_prompt, client=client, cache_dir=tmp_path).from_cache
    assert len(client.responses.calls) == 1


def test_offline_miss_raises_without_calling_the_api(tmp_path, monkeypatch):
    monkeypatch.setenv("CELLPROOF_OFFLINE", "1")
    client = FakeClient()
    with pytest.raises(CacheMiss):
        complete("hi", client=client, cache_dir=tmp_path)
    assert client.responses.calls == []


def test_offline_hit_still_works(tmp_path, monkeypatch):
    client = FakeClient()
    complete("hi", client=client, cache_dir=tmp_path)
    monkeypatch.setenv("CELLPROOF_OFFLINE", "1")
    res = complete("hi", client=client, cache_dir=tmp_path)
    assert res.from_cache and res.text == "ok"
