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


async def test_edge_cases_validation_and_cause_fallback(client: AsyncClient):
    # Negative limit should return 422
    r_bad_limit = await client.get("/api/imports?limit=-1")
    assert r_bad_limit.status_code == 422

    # Corrupt zip/gz returns 400 (not 500)
    r_bad_zip = await client.post(
        "/api/imports/upload",
        files={"file": ("corrupt.zip", b"not-a-zip", "application/zip")},
    )
    assert r_bad_zip.status_code == 400

    r_bad_gz = await client.post(
        "/api/imports/upload",
        files={"file": ("corrupt.csv.gz", b"not-a-gzip", "application/gzip")},
    )
    assert r_bad_gz.status_code == 400

    # CDR where destCause_value=0 and origCause_value=16 -> dashboard & export must resolve to 16, not 0
    cdr_zero_dest = (
        "cdrRecordType,globalCallID_callManagerId,globalCallID_callId,origLegCallIdentifier,"
        "dateTimeOrigination,callingPartyNumber,originalCalledPartyNumber,finalCalledPartyNumber,"
        "dateTimeConnect,dateTimeDisconnect,lastRedirectDn,duration,origDeviceName,destDeviceName,"
        "origCause_value,destCause_value,origMediaTransportAddress_IP,destMediaTransportAddress_IP,destLegIdentifier\n"
        "1,1,5555,90001,1700000500,1010,1020,1020,1700000502,1700000550,1020,48,SEP1,SEP2,16,0,167772682,335544842,90002\n"
    )
    r_up = await client.post(
        "/api/imports/upload",
        files={"file": ("cdr_zero_dest.csv", cdr_zero_dest.encode("utf-8"), "text/csv")},
    )
    assert r_up.status_code == 200

    r_dash = await client.get("/api/dashboard/stats")
    assert r_dash.status_code == 200
    causes = r_dash.json()["cause_distribution"]
    assert len(causes) == 1
    assert causes[0]["code"] == 16

    r_csv = await client.get("/api/calls/export?format=csv")
    assert r_csv.status_code == 200
    assert "Normal Call Clearing" in r_csv.text
