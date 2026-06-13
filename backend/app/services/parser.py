"""
Document parser service using IBM Docling.
Converts PDF and DOCX files to structured Markdown and JSON,
preserving section hierarchy, tables, and layout.
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def parse_document(file_path: str) -> dict:
    """Parse a PDF or DOCX document using Docling.

    Args:
        file_path: Path to the document file.

    Returns:
        Dictionary containing:
            - markdown: The document as structured Markdown
            - structure: The document as a JSON structure (Docling format)
            - raw_text: Plain text extraction
            - sections: List of detected sections with hierarchy
    """
    from docling.document_converter import DocumentConverter, PdfFormatOption
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions

    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Document not found: {file_path}")

    ext = path.suffix.lower()
    if ext not in (".pdf", ".docx"):
        raise ValueError(f"Unsupported file type: {ext}. Only PDF and DOCX are supported.")

    logger.info(f"Parsing document: {path.name} ({ext})")

    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = False

    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
    )
    result = converter.convert(str(path))
    doc = result.document

    # Export to different formats
    markdown = doc.export_to_markdown()
    raw_text = doc.export_to_text()

    # Build section hierarchy from document items
    sections = _extract_sections(doc)

    # Get the full JSON structure
    try:
        structure = doc.export_to_dict()
    except AttributeError:
        # Fallback if export_to_dict is not available (e.g. older versions)
        import json
        try:
            structure = json.loads(doc.model_dump_json())
        except AttributeError:
            structure = {}

    logger.info(
        f"Parsed {path.name}: {len(sections)} sections, "
        f"{len(markdown)} chars markdown"
    )

    return {
        "markdown": markdown,
        "structure": structure,
        "raw_text": raw_text,
        "sections": sections,
    }


def _extract_sections(doc) -> list[dict]:
    """Extract section hierarchy from a Docling document.

    Walks through all document items and builds a list of sections
    with their hierarchy level, text content, and position.

    Args:
        doc: DoclingDocument instance.

    Returns:
        List of section dicts with keys: level, title, text, position, items
    """
    sections = []
    current_section = None
    position = 0

    for item, level in doc.iterate_items():
        item_type = type(item).__name__

        if item_type in ("SectionHeaderItem", "HeadingItem") or _is_heading(item):
            # Start a new section
            if current_section:
                sections.append(current_section)

            current_section = {
                "level": level,
                "title": _get_text(item).strip(),
                "text": "",
                "position": position,
                "items": [],
            }
            position += 1
        elif current_section:
            # Add content to current section
            text = _get_text(item).strip()
            if text:
                current_section["text"] += text + "\n"
                current_section["items"].append({
                    "type": item_type,
                    "text": text[:500],  # Truncate very long items
                    "level": level,
                })
        else:
            # Content before any section heading (preamble)
            text = _get_text(item).strip()
            if text:
                current_section = {
                    "level": 0,
                    "title": "Preamble",
                    "text": text + "\n",
                    "position": position,
                    "items": [{"type": item_type, "text": text[:500], "level": level}],
                }
                position += 1

    # Add the last section
    if current_section:
        sections.append(current_section)

    return sections


def _is_heading(item) -> bool:
    """Check if an item looks like a heading based on its properties."""
    text = _get_text(item)
    if not text:
        return False

    # Check for common legal heading patterns
    import re
    heading_patterns = [
        r"^\d+\.\s+[A-Z]",          # "1. DEFINITIONS"
        r"^\d+\.\d+\s+",            # "1.1 Scope"
        r"^(?:ARTICLE|SECTION|SCHEDULE|ANNEX|EXHIBIT)\s",  # Legal sections
        r"^[A-Z][A-Z\s]{5,}$",      # ALL CAPS headings
    ]
    for pattern in heading_patterns:
        if re.match(pattern, text.strip()):
            return True
    return False


def _get_text(item) -> str:
    """Safely extract text from a Docling item."""
    if hasattr(item, "text"):
        return str(item.text)
    if hasattr(item, "export_to_text"):
        return str(item.export_to_text())
    return str(item)


def chunk_document(file_path: str, max_tokens: int = 512) -> list[dict]:
    """Parse and chunk a document for embedding or RAG.

    Uses Docling's HybridChunker for structure-aware chunking
    that respects section boundaries.

    Args:
        file_path: Path to the document file.
        max_tokens: Maximum tokens per chunk.

    Returns:
        List of chunk dicts with text and metadata.
    """
    from docling.document_converter import DocumentConverter, PdfFormatOption
    from docling.chunking import HybridChunker
    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions

    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = False

    converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)
        }
    )
    result = converter.convert(file_path)

    chunker = HybridChunker(max_tokens=max_tokens)
    chunks = list(chunker.chunk(result.document))

    return [
        {
            "text": chunk.text,
            "metadata": chunk.meta if hasattr(chunk, "meta") else {},
            "index": i,
        }
        for i, chunk in enumerate(chunks)
    ]
