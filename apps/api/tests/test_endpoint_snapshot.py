"""The snapshot hashes JSON. --ordered keeps the key order the response used."""

from __future__ import annotations

import importlib.util
import pathlib

_SCRIPT = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "endpoint_snapshot.py"


def _load():
    spec = importlib.util.spec_from_file_location("endpoint_snapshot", _SCRIPT)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_default_sorts_keys_and_drops_volatile_timestamps():
    snap = _load()
    body = b'{"z":1,"generated_at":"t","a":{"y":1,"computed_at":"c","x":2}}'
    assert snap._canonical(body) == b'{"a": {"x": 2, "y": 1}, "z": 1}'


def test_ordered_keeps_served_key_order_and_still_drops_timestamps():
    snap = _load()
    body = b'{"z":1,"generated_at":"t","a":{"y":1,"computed_at":"c","x":2}}'
    assert snap._canonical(body, ordered=True) == b'{"z": 1, "a": {"y": 1, "x": 2}}'
    assert snap._digest(body) != snap._digest(body, ordered=True)


def test_ordered_ndjson_keeps_each_line():
    snap = _load()
    body = b'{"b":1,"a":2}\n{"d":3,"cached_at":"t","c":4}\n'
    assert snap._canonical(body) == b'{"a": 2, "b": 1}\n{"c": 4, "d": 3}'
    assert snap._canonical(body, ordered=True) == b'{"b": 1, "a": 2}\n{"d": 3, "c": 4}'


def test_non_json_is_hashed_as_served_either_way():
    snap = _load()
    raw = b"not-json"
    assert snap._canonical(raw) == raw
    assert snap._canonical(raw, ordered=True) == raw
