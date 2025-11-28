import uuid

from fastapi.testclient import TestClient

from src.app import app


client = TestClient(app)


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    # Expect a dict of activities with at least one known key
    assert isinstance(data, dict)
    assert "Chess Club" in data


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    # use unique email to avoid collisions across runs
    email = f"pytest-{uuid.uuid4().hex}@example.com"

    # ensure the email is not already enrolled
    before = client.get("/activities").json()
    assert email not in before[activity]["participants"]

    # sign up
    signup = client.post(f"/activities/{activity}/signup", params={"email": email})
    assert signup.status_code == 200
    body = signup.json()
    assert "Signed up" in body.get("message", "")

    # verify listed in activity
    after = client.get("/activities").json()
    assert email in after[activity]["participants"]

    # unregister
    unreg = client.delete(f"/activities/{activity}/participants", params={"email": email})
    assert unreg.status_code == 200
    ub = unreg.json()
    assert "Unregistered" in ub.get("message", "")

    # verify removed
    final = client.get("/activities").json()
    assert email not in final[activity]["participants"]
