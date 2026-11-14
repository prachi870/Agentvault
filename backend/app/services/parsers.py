from __future__ import annotations

import html
import io
import logging
import re
from pathlib import Path

from app.core.text import normalize_unicode

log = logging.getLogger(__name__)

TEXT_EXTENSIONS = {".txt", ".md", ".markdown", ".csv", ".json", ".log", ".rst"}
HTML_EXTENSIONS = {".html", ".htm"}
OFFICE_EXTENSIONS = {".docx", ".pptx"}
SUPPORTED_EXTENSIONS = TEXT_EXTENSIONS | HTML_EXTENSIONS | OFFICE_EXTENSIONS | {".pdf"}

OCR_MIN_CHARS_PER_PAGE = 20  # below this, a PDF page is treated as "probably scanned" and OCR'd


class UnsupportedFile(ValueError):
    pass


def _decode(data: bytes) -> str:
    for enc in ("utf-8-sig", "utf-16", "latin-1"):
        try:
            return data.decode(enc)
        except UnicodeError:
            continue
    return data.decode("utf-8", errors="replace")


def _strip_html(raw: str) -> str:
    raw = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", raw)
    raw = re.sub(r"(?s)<[^>]+>", " ", raw)
    return re.sub(r"[ \t]+", " ", html.unescape(raw))


def _extract_docx(data: bytes) -> str:
    from docx import Document as DocxDocument
    from docx.table import Table
    from docx.text.paragraph import Paragraph

    doc = DocxDocument(io.BytesIO(data))

    def table_text(table: Table) -> list[str]:
        rows = [[cell.text.strip().replace("\n", " | ") for cell in row.cells] for row in table.rows]
        header = rows[0] if rows and len(rows[0]) > 1 and all(rows[0]) else []
        data_rows = rows[1:] if header else rows
        rendered = []
        for row in data_rows:
            if not any(row):
                continue
            if header:
                rendered.append("; ".join(
                    f"{header[i]}: {value}" if value and i < len(header) and header[i] else value
                    for i, value in enumerate(row)
                    if value
                ))
            else:
                rendered.append(" | ".join(value for value in row if value))
        return rendered

    parts: list[str] = []
    seen_sections: set[str] = set()
    for section in doc.sections:
        for story in (section.header, section.footer):
            story_text = "\n".join(p.text.strip() for p in story.paragraphs if p.text.strip())
            if story_text and story_text not in seen_sections:
                parts.append(story_text)
                seen_sections.add(story_text)

    for item in doc.iter_inner_content():
        if isinstance(item, Paragraph):
            if item.text.strip():
                parts.append(item.text.strip())
        elif isinstance(item, Table):
            parts.extend(table_text(item))
    return "\n".join(parts)


def _extract_pptx(data: bytes) -> str:
    from pptx import Presentation  # optional dependency (requirements-parsers.txt)

    prs = Presentation(io.BytesIO(data))
    parts = []
    for i, slide in enumerate(prs.slides, start=1):
        texts = [shape.text_frame.text for shape in slide.shapes if shape.has_text_frame and shape.text_frame.text.strip()]
        if texts:
            parts.append(f"[Slide {i}] " + " | ".join(t.strip() for t in texts))
        if slide.has_notes_slide and slide.notes_slide.notes_text_frame.text.strip():
            parts.append(f"[Slide {i} notes] {slide.notes_slide.notes_text_frame.text.strip()}")
    return "\n".join(parts)


def _ocr_pdf(data: bytes) -> str:
    """Rasterize each page and OCR it. Only called for pages whose embedded text layer is too thin to
    be a real extraction (Phase 4: "OCR for scanned PDFs"). Optional dependency: pytesseract +
    pdf2image, which also needs the poppler and tesseract binaries on the host / in the image."""
    try:
        import pytesseract
        from pdf2image import convert_from_bytes
    except ImportError as exc:
        raise UnsupportedFile(
            "This PDF looks scanned (little to no embedded text) and OCR is not installed. "
            "pip install -r requirements-parsers.txt and install the tesseract-ocr and poppler-utils system packages."
        ) from exc
    try:
        pages = convert_from_bytes(data, dpi=200)
    except Exception as exc:
        raise UnsupportedFile(f"Could not rasterize PDF for OCR: {exc}") from exc
    texts = []
    for i, page in enumerate(pages, start=1):
        try:
            texts.append(pytesseract.image_to_string(page))
        except Exception as exc:
            log.warning("OCR failed on page %d: %s", i, exc)
    return "\n\n".join(texts)


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(data))
        pages_text = [(page.extract_text() or "") for page in reader.pages]
    except Exception as exc:  # corrupt / encrypted
        raise UnsupportedFile(f"Could not read PDF: {exc}") from exc
    text = "\n\n".join(pages_text)
    thin_pages = sum(1 for t in pages_text if len(t.strip()) < OCR_MIN_CHARS_PER_PAGE)
    if pages_text and thin_pages / len(pages_text) > 0.5:
        ocr_text = _ocr_pdf(data)
        if len(ocr_text.strip()) > len(text.strip()):
            text = ocr_text
    return text


def extract_text(filename: str, data: bytes) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFile(f"Unsupported file type '{ext or 'none'}'. Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}")
    if ext == ".pdf":
        text = _extract_pdf(data)
    elif ext in HTML_EXTENSIONS:
        text = _strip_html(_decode(data))
    elif ext == ".docx":
        try:
            text = _extract_docx(data)
        except Exception as exc:
            raise UnsupportedFile(f"Could not read DOCX: {exc}") from exc
    elif ext == ".pptx":
        try:
            text = _extract_pptx(data)
        except Exception as exc:
            raise UnsupportedFile(f"Could not read PPTX: {exc}") from exc
    else:
        text = _decode(data)
    text = normalize_unicode(text).strip()
    if not text:
        raise UnsupportedFile("No extractable text found (install requirements-parsers.txt for OCR/DOCX/PPTX support)")
    return text
