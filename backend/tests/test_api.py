from httpx import AsyncClient

from app.core.config import settings
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


async def test_direction_and_separate_calling_called_filters(client: AsyncClient):
    cdr_mixed = (
        "cdrRecordType,globalCallID_callManagerId,globalCallID_callId,origLegCallIdentifier,"
        "dateTimeOrigination,callingPartyNumber,originalCalledPartyNumber,finalCalledPartyNumber,"
        "dateTimeConnect,dateTimeDisconnect,lastRedirectDn,duration,origDeviceName,destDeviceName,"
        "origCause_value,destCause_value,origMediaTransportAddress_IP,destMediaTransportAddress_IP,destLegIdentifier\n"
        "1,1,7001,101,1700001000,1001,1002,1002,1700001002,1700001062,1002,60,SEP001,SEP002,16,16,167772682,335544842,201\n"
        "1,1,7002,102,1700001100,1001,89031234567,89031234567,1700001105,1700001205,89031234567,100,SEP001,SIP_TRUNK_OUT,16,16,167772682,335544842,202\n"
        "1,1,7003,103,1700001200,84957778899,1001,1001,1700001203,1700001243,1001,40,SIP_TRUNK_IN,SEP001,16,16,167772682,335544842,203\n"
    )
    r_up = await client.post(
        "/api/imports/upload",
        files={"file": ("cdr_dir.csv", cdr_mixed.encode("utf-8"), "text/csv")},
    )
    assert r_up.status_code == 200
    assert r_up.json()["inserted_rows"] == 3

    # Separate calling vs called does NOT mix records for 1001
    r_calling = await client.get("/api/calls?calling=1001")
    assert r_calling.status_code == 200
    assert r_calling.json()["total"] == 2
    assert all(item["calling_party_number"] == "1001" for item in r_calling.json()["items"])

    r_called = await client.get("/api/calls?called=1001")
    assert r_called.status_code == 200
    assert r_called.json()["total"] == 1
    assert r_called.json()["items"][0]["direction"] == "inbound"
    assert r_called.json()["items"][0]["calling_party_number"] == "84957778899"

    # Direction filtering
    for direction, expected_count in [("inbound", 1), ("outbound", 1), ("internal", 1)]:
        r_dir = await client.get(f"/api/calls?direction={direction}")
        assert r_dir.status_code == 200
        assert r_dir.json()["total"] == expected_count
        assert r_dir.json()["items"][0]["direction"] == direction

    # Dashboard direction filter
    r_dash_in = await client.get("/api/dashboard/stats?direction=inbound")
    assert r_dash_in.status_code == 200
    assert r_dash_in.json()["total_calls"] == 1

    # Export includes direction label and respects direction filter
    r_exp = await client.get("/api/calls/export?format=csv&direction=outbound")
    assert r_exp.status_code == 200
    assert "Направление" in r_exp.text
    assert "Исходящий" in r_exp.text
    assert "84957778899" not in r_exp.text


async def test_public_config_endpoint(client: AsyncClient):
    resp = await client.get("/api/config")
    assert resp.status_code == 200
    data = resp.json()
    assert "cdr_analytics_enabled" in data
    assert "cmr_analytics_enabled" in data
    assert data["cdr_analytics_enabled"] is True
    assert data["cmr_analytics_enabled"] is True


async def test_upload_when_cmr_disabled(client: AsyncClient):
    old = settings.ENABLE_CMR_ANALYTICS
    try:
        settings.ENABLE_CMR_ANALYTICS = False
        r_cmr = await client.post(
            "/api/imports/upload",
            files={"file": ("cmr_disabled.csv", SAMPLE_CMR_CSV.encode("utf-8"), "text/csv")},
        )
        assert r_cmr.status_code == 200
        data = r_cmr.json()
        assert data["status"] == "skipped"
        assert data["inserted_rows"] == 0
        assert "отключена" in (data["error_message"] or "")
    finally:
        settings.ENABLE_CMR_ANALYTICS = old


async def test_dashboard_when_cdr_disabled(client: AsyncClient):
    old = settings.ENABLE_CDR_ANALYTICS
    try:
        settings.ENABLE_CDR_ANALYTICS = False
        r_dash = await client.get("/api/dashboard/stats")
        assert r_dash.status_code == 200
        data = r_dash.json()
        assert data["total_calls"] == 0
        assert data["answered_calls"] == 0
        assert data["time_series"] == []
    finally:
        settings.ENABLE_CDR_ANALYTICS = old
