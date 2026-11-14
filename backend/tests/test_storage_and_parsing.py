import io

import pytest

from app.services.parsers import UnsupportedFile, extract_text
from app.services.storage import LocalStorage, S3Storage, safe_filename
from tests.conftest import ask

_PDF = (b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
        b"4 0 obj<</Length 92>>stream\nBT /F1 12 Tf 72 720 Td (Contractors must badge in at the north gate before 8 am.) Tj ET\nendstream endobj\n"
        b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R/Size 6>>\nstartxref\n0\n%%EOF\n")


def test_pdf_text_extraction_and_query(client, users):
    assert "badge in at the north gate" in extract_text("gate.pdf", _PDF)
    r = client.post("/api/v1/documents", headers=users["admin"], files={"file": ("gate.pdf", _PDF, "application/pdf")},
                    data={"source_type": "pdf", "title": "Site Access Rules"})
    assert r.status_code == 201, r.text
    res = ask(client, users["employee"], "Where must contractors badge in?")
    assert res["status"] == "answered" and res["citations"][0]["source_type"] == "pdf"


def _operations_handbook_docx() -> bytes:
    from docx import Document

    doc = Document()
    doc.sections[0].header.paragraphs[0].text = "Northwind Facilities Handbook"
    doc.add_heading("Facilities Operations", level=1)
    doc.add_paragraph(
        "For after-hours facilities incidents, employees must notify the on-call facilities "
        "coordinator within 15 minutes using extension 7314."
    )
    doc.add_heading("Preventive Maintenance", level=2)
    table = doc.add_table(rows=1, cols=2)
    table.rows[0].cells[0].text = "Control"
    table.rows[0].cells[1].text = "Requirement"
    row = table.add_row().cells
    row[0].text = "Backup generator inspection frequency"
    row[1].text = "Every 30 days"
    row = table.add_row().cells
    row[0].text = "Fire alarm test frequency"
    row[1].text = "Every 90 days"
    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def test_docx_preserves_headers_body_and_table_labels():
    text = extract_text("facilities_handbook.docx", _operations_handbook_docx())
    assert "Northwind Facilities Handbook" in text
    assert "within 15 minutes using extension 7314" in text
    assert "Control: Backup generator inspection frequency" in text
    assert "Requirement: Every 30 days" in text


def test_docx_table_and_procedure_questions_return_cited_answers(client, users):
    content = _operations_handbook_docx()
    response = client.post(
        "/api/v1/documents",
        headers=users["admin"],
        files={"file": ("facilities_handbook.docx", content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        data={"source_type": "upload", "title": "Northwind Facilities Handbook"},
    )
    assert response.status_code == 201, response.text

    cases = [
        ("What is the backup generator inspection frequency?", "Every 30 days"),
        ("How quickly should after-hours facilities incidents be reported?", "within 15 minutes"),
    ]
    for question, expected in cases:
        result = ask(client, users["employee"], question)
        assert result["status"] == "answered", result
        assert expected.lower() in result["answer"].lower(), result["answer"]
        assert any(citation["title"] == "Northwind Facilities Handbook" for citation in result["citations"])


def test_html_and_bad_files():
    assert extract_text("a.html", b"<html><script>x()</script><p>Hello &amp; welcome to the team</p></html>").strip() == "Hello & welcome to the team"
    with pytest.raises(UnsupportedFile):
        extract_text("a.pdf", b"not a pdf")
    with pytest.raises(UnsupportedFile):
        extract_text("a.docx", b"PK")


def test_local_storage_blocks_traversal(tmp_path):
    st = LocalStorage(str(tmp_path / "s"))
    st.put("documents/x/a.txt", b"hi")
    assert st.get("documents/x/a.txt") == b"hi"
    with pytest.raises(ValueError):
        st.put("../evil.txt", b"x")
    assert safe_filename("../../etc/pass wd.txt") == "pass_wd.txt"


def test_s3_storage_roundtrip():
    moto = pytest.importorskip("moto")
    import boto3
    with moto.mock_aws():
        boto3.client("s3", region_name="us-east-1").create_bucket(Bucket="esakip-test")
        st = S3Storage("esakip-test", "us-east-1")
        st.put("documents/1/a.txt", b"hello")
        assert st.get("documents/1/a.txt") == b"hello" and st.ping()
        st.delete("documents/1/a.txt")
        with pytest.raises(Exception):
            st.get("documents/1/a.txt")
