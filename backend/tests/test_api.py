from httpx import AsyncClient

from tests.test_parser import SAMPLE_CDR_CSV, SAMPLE_CMR_CSV


async def test_health(client: AsyncClient):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


async def test_full_upload_query_dashboard_and_export_flow(client: AsyncClient):
    # 1. Upload CDR & CMR
    r_cdr = await client.post(
        "/api/imports/upload",
        files={"file": ("cdr_sample.csv", SAMPLE_CDR_CSV.encode("utf-8"), "text/csv")},
    )
    assert r_cdr.status_code == 200
    assert r_cdr.json()["inserted_rows"] == 2

    r_cmr = await client.post(
        "/api/imports/upload",
        files={"file": ("cmr_sample.csv", SAMPLE_CMR_CSV.encode("utf-8"), "text/csv")},
    )
    assert r_cmr.status_code == 200
    assert r_cmr.json()["inserted_rows"] == 1

    # 2. List calls & filter
    r_calls = await client.get("/api/calls?answered=true")
    assert r_calls.status_code == 200
    data = r_calls.json()
    assert data["total"] == 1
    call_id = data["items"][0]["id"]

    # 3. Call detail includes CMR metrics
    r_detail = await client.get(f"/api/calls/{call_id}")
    assert r_detail.status_code == 200
    detail = r_detail.json()
    assert len(detail["cmr_records"]) == 1
    assert detail["cmr_records"][0]["jitter"] == 4

    # 4. Dashboard stats
    r_dash = await client.get("/api/dashboard/stats")
    assert r_dash.status_code == 200
    dash = r_dash.json()
    assert dash["total_calls"] == 2
    assert dash["answered_calls"] == 1
    assert dash["missed_calls"] == 1

    # 5. Export CSV & XLSX
    r_csv = await client.get("/api/calls/export?format=csv")
    assert r_csv.status_code == 200
    assert "text/csv" in r_csv.headers["content-type"]

    r_xlsx = await client.get("/api/calls/export?format=xlsx")
    assert r_xlsx.status_code == 200
    assert "spreadsheetml" in r_xlsx.headers["content-type"]

    # 6. Import jobs history
    r_jobs = await client.get("/api/imports")
    assert r_jobs.status_code == 200
    assert len(r_jobs.json()) == 2
