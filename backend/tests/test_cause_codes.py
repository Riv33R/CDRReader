from app.core.cause_codes import get_cause_info


def test_known_q850_cause_codes():
    c16 = get_cause_info(16)
    assert c16.name == "Normal Call Clearing"
    assert c16.category == "normal"

    c17 = get_cause_info(17)
    assert c17.name == "User Busy"
    assert c17.category == "busy"

    c19 = get_cause_info(19)
    assert c19.category == "no_answer"


def test_cisco_extended_and_unknown_cause_codes():
    c_split = get_cause_info(393216)
    assert "Split" in c_split.name
    assert c_split.category == "normal"

    c_unknown = get_cause_info(9999)
    assert c_unknown.code == 9999
    assert c_unknown.category == "failed"

    c_none = get_cause_info(None)
    assert c_none.code == -1
