import pytest
from fastapi.testclient import TestClient
from src import app as application

client = TestClient(application.app)


def test_get_activities():
    resp = client.get('/activities')
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Expect some known activities from in-memory DB
    assert 'Chess Club' in data


def test_signup_and_unregister_flow():
    activity = 'Chess Club'
    email = 'testuser@example.com'

    # Ensure not already registered
    resp = client.get('/activities')
    participants = resp.json()[activity]['participants']
    if email in participants:
        # remove first to ensure a clean state
        _ = client.post(f"/activities/{activity}/unregister?email={email}")

    # Signup
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200
    assert f"Signed up {email}" in resp.json().get('message', '')

    # Duplicate signup should fail
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 400

    # Unregister
    resp = client.post(f"/activities/{activity}/unregister?email={email}")
    assert resp.status_code == 200
    assert f"Unregistered {email}" in resp.json().get('message', '')

    # Unregister again should fail
    resp = client.post(f"/activities/{activity}/unregister?email={email}")
    assert resp.status_code == 400
