from apexapp.integrations import emachine_mapping as m
from apexapp.models import SignatureMode, parse_tag_ref
from apexapp.rbac import Permission, has_permission
from apexapp.services.validation import signature_problems, submit_problems
from apexapp.utils.fields import label_of, pick
from apexapp.utils.testing import TINY_PNG, sample_tag


def test_pick_is_case_insensitive():
    assert pick({"jobno": "1"}, "JobNo") == "1"
    assert pick({"JobNo": ""}, "JobNo") is None


def test_label_of_falls_back_to_first_text_column():
    assert label_of({"Id": 4, "item_code": "X", "mat_name": "Stud"}) == "X"
    assert label_of({"Id": 4, "Description": "wood door"}) == "wood door"


def test_tag_header_mapping():
    h = m.tag_header({"Id": "12", "tag_number": "D1", "status": "", "IsPremium": "1", "tag_date": "2026-05-29T00:00:00Z", "labor_count": "2"})
    assert h["external_id"] == 12 and h["status"] == "Draft" and h["is_premium"] is True
    assert h["tag_date"] == "2026-05-29" and h["counts"]["labor"] == 2


def test_parse_tag_ref():
    assert parse_tag_ref("12").local_id == 12
    assert parse_tag_ref("e34").external_id == 34
    assert parse_tag_ref("../etc") is None


def test_submit_problems():
    assert submit_problems(sample_tag()) == []
    problems = submit_problems(sample_tag(jobNo="", jobName="", labor=[], materials=[], equipment=[], expenses=[]))
    assert "Select a job on the Details tab" in problems and "Add at least one cost line" in problems
    assert "Every expense needs a type and an amount" in submit_problems(sample_tag(expenses=[{"description": "x", "amount": 0}]))


def test_signature_problems():
    assert signature_problems(SignatureMode.IN_PERSON, "", TINY_PNG, 10_000) == []
    assert signature_problems(SignatureMode.IN_PERSON, "", "", 10_000) == ["The approver needs to sign"]
    assert signature_problems(SignatureMode.IN_PERSON, "", "data:image/png;base64,AAAA", 10_000) == ["The signature image is not a valid PNG"]
    assert signature_problems(SignatureMode.SEND, "nope", "", 10_000) == ["Enter a valid email to send the tag to"]


def test_roles():
    assert has_permission("viewer", Permission.TAGS_READ)
    assert not has_permission("viewer", Permission.TAGS_WRITE)
    assert not has_permission("editor", Permission.TAGS_DECIDE)
    assert has_permission("approver", Permission.TAGS_DECIDE)
    assert not has_permission("unknown", Permission.TAGS_READ)
