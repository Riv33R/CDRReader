import gzip
import io
import zipfile

from sqlalchemy import func, select

from app.core.database import AsyncSessionLocal
from app.models.cdr import CdrRecord, CmrRecord
from app.services.parser import is_cucm_type_row, parse_cucm_ip, parse_file_bytes

SAMPLE_CDR_CSV = (
    "cdrRecordType,globalCallID_callManagerId,globalCallID_callId,origLegCallIdentifier,"
    "dateTimeOrigination,callingPartyNumber,originalCalledPartyNumber,finalCalledPartyNumber,"
    "dateTimeConnect,dateTimeDisconnect,lastRedirectDn,duration,origDeviceName,destDeviceName,"
    "origCause_value,destCause_value,origMediaTransportAddress_IP,destMediaTransportAddress_IP,destLegIdentifier\n"
    "INTEGER,INTEGER,INTEGER,INTEGER,INTEGER,VARCHAR(50),VARCHAR(50),VARCHAR(50),"
    "INTEGER,INTEGER,VARCHAR(50),INTEGER,VARCHAR(128),VARCHAR(128),INTEGER,INTEGER,INTEGER,INTEGER,INTEGER\n"
    "1,1,1001,20001,1700000000,1001,1002,1002,1700000005,1700000065,1002,60,SEP001122334455,SEP667788990011,16,16,167772682,335544842,20002\n"
    "1,1,1002,20003,1700000100,1003,1004,1004,0,1700000120,1004,0,SEP001122334455,SIP_TRUNK_OUT,0,19,167772682,0,20004\n"
)

SAMPLE_CMR_CSV = (
    "cdrRecordType,globalCallID_callManagerId,globalCallID_callId,callIdentifier,"
    "deviceName,directoryNum,dateTimeStamp,numberPacketsSent,numberPacketsReceived,"
    "numberPacketsLost,jitter,latency,varVQMetrics\n"
    "INTEGER,INTEGER,INTEGER,INTEGER,VARCHAR(128),VARCHAR(50),INTEGER,INTEGER,INTEGER,INTEGER,INTEGER,INTEGER,VARCHAR(600)\n"
    "2,1,1001,20001,SEP001122334455,1001,1700000065,3000,2998,2,4,15,MLQK=4.41;MLQKav=4.40\n"
)


def test_parse_cucm_ip():
    # 10.2.0.10 in little-endian 32-bit int: 10 + 2*256 + 0 + 10*16777216 = 167772682
    assert parse_cucm_ip("167772682") == "10.2.0.10"
    assert parse_cucm_ip("0") is None
    assert parse_cucm_ip("") is None
    assert parse_cucm_ip("192.168.1.50") == "192.168.1.50"


def test_is_cucm_type_row():
    assert is_cucm_type_row(["INTEGER", "INTEGER", "VARCHAR(50)"]) is True
    assert is_cucm_type_row(["1", "1", "1001"]) is False


async def test_parse_cdr_and_deduplication():
    async with AsyncSessionLocal() as db:
        stats1 = await parse_file_bytes(db, SAMPLE_CDR_CSV.encode("utf-8"), "cdr_Cluster01_01_202611161000_1")
        await db.commit()

        assert stats1.file_type == "cdr"
        assert stats1.total_rows == 2
        assert stats1.inserted_rows == 2
        assert stats1.duplicate_rows == 0

        # Re-upload same file -> should detect 2 duplicates
        stats2 = await parse_file_bytes(db, SAMPLE_CDR_CSV.encode("utf-8"), "cdr_Cluster01_01_202611161000_1")
        await db.commit()
        assert stats2.total_rows == 2
        assert stats2.inserted_rows == 0
        assert stats2.duplicate_rows == 2

        count = (await db.execute(select(func.count(CdrRecord.id)))).scalar()
        assert count == 2


async def test_parse_zip_with_cdr_and_cmr():
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("cdr_test.csv", SAMPLE_CDR_CSV)
        zf.writestr("__MACOSX/._cdr_test.csv", "binary junk")
        zf.writestr("cmr_test.csv.gz", gzip.compress(SAMPLE_CMR_CSV.encode("utf-8")))

    async with AsyncSessionLocal() as db:
        stats = await parse_file_bytes(db, zip_buf.getvalue(), "bundle.zip")
        await db.commit()

        assert stats.file_type == "mixed"
        assert stats.total_rows == 3
        assert stats.inserted_rows == 3

        cdr_cnt = (await db.execute(select(func.count(CdrRecord.id)))).scalar()
        cmr_cnt = (await db.execute(select(func.count(CmrRecord.id)))).scalar()
        assert cdr_cnt == 2
        assert cmr_cnt == 1
