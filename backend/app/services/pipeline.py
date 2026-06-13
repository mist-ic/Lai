"""
Main analysis pipeline.
Orchestrates the full contract analysis flow:
  1. Parse document (Docling)
  2. Extract clauses (Gemini structured output)
  3. Score risks (rules + Gemini)
  4. Generate executive summary (Gemini)

Runs as a background task triggered by POST /api/contracts/{id}/analyze.
"""

import json
import logging
import traceback

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.contract import Contract
from app.models.clause import Clause
from app.models.baseline import Baseline
from app.services.parser import parse_document
from app.services.extractor import extract_clauses
from app.services.scorer import score_clause, compute_overall_risk
from app.services.summarizer import generate_executive_summary, format_summary_text

logger = logging.getLogger(__name__)


async def run_analysis_pipeline(contract_id: str, db_url: str) -> None:
    """Run the full analysis pipeline for a contract.

    This function is designed to run as a background task. It creates
    its own database session to avoid issues with the request lifecycle.

    Args:
        contract_id: UUID of the contract to analyze.
        db_url: Database connection URL.
    """
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()

    try:
        # Get the contract
        contract = db.query(Contract).filter(Contract.id == contract_id).first()
        if not contract:
            logger.error(f"Contract {contract_id} not found")
            return

        logger.info(f"Starting analysis pipeline for: {contract.filename}")

        # --- Step 1: Parse ---
        _update_status(db, contract, "parsing")
        logger.info("Step 1/4: Parsing document...")

        try:
            import asyncio
            parsed = await asyncio.to_thread(parse_document, contract.file_path)
        except Exception as e:
            logger.error(f"Parsing failed: {e}")
            _update_status(db, contract, "error")
            return

        contract.raw_text = parsed["raw_text"]
        contract.parsed_structure = parsed["structure"]
        db.commit()

        logger.info(
            f"Parsed: {len(parsed['sections'])} sections, "
            f"{len(parsed['markdown'])} chars"
        )

        # --- Step 2: Extract clauses ---
        _update_status(db, contract, "analyzing")
        logger.info("Step 2/4: Extracting clauses...")

        try:
            extracted = await extract_clauses(parsed["markdown"])
        except Exception as e:
            logger.error(f"Clause extraction failed: {e}")
            logger.error(traceback.format_exc())
            _update_status(db, contract, "error")
            return

        logger.info(f"Extracted {len(extracted)} clauses")

        # --- Step 3: Score risks ---
        logger.info("Step 3/4: Scoring risks...")

        clause_scores = []
        for i, clause_data in enumerate(extracted):
            clause_type = clause_data.get("clause_type", "other")
            clause_text = clause_data.get("original_text", "")

            # Look up baseline for comparison
            baseline_text = _get_baseline_text(db, clause_type)

            # Score the clause
            try:
                risk = await score_clause(clause_text, clause_type, baseline_text)
            except Exception as e:
                logger.warning(f"Risk scoring failed for clause {i}: {e}")
                risk = {
                    "risk_score": 50,
                    "risk_level": "medium",
                    "risk_category": "legal",
                    "market_deviation": "standard",
                    "deviation_explanation": "Risk assessment unavailable",
                    "plain_english_summary": clause_text[:200],
                }

            clause_scores.append(risk)

            # Save clause to database
            db_clause = Clause(
                contract_id=contract_id,
                clause_type=clause_type,
                section_number=clause_data.get("section_number"),
                title=clause_data.get("title"),
                original_text=clause_text,
                plain_english_summary=risk.get("plain_english_summary"),
                risk_score=risk.get("risk_score"),
                risk_level=risk.get("risk_level"),
                risk_category=risk.get("risk_category"),
                market_deviation=risk.get("market_deviation"),
                deviation_explanation=risk.get("deviation_explanation"),
                metadata_json={
                    "key_terms": clause_data.get("key_terms", []),
                    "cross_references": clause_data.get("cross_references", []),
                    "key_risks": risk.get("key_risks", []),
                    "rule_adjustments": risk.get("rule_adjustments", []),
                },
                position=clause_data.get("position", i),
            )
            db.add(db_clause)

        db.commit()
        logger.info(f"Scored {len(clause_scores)} clauses")

        # Compute overall risk
        overall = compute_overall_risk(clause_scores)
        contract.overall_risk_score = overall["overall_score"]
        contract.risk_level = overall["risk_level"]
        contract.risk_breakdown = overall["risk_breakdown"]
        db.commit()

        # --- Step 4: Generate executive summary ---
        logger.info("Step 4/4: Generating executive summary...")

        try:
            summary_data = await generate_executive_summary(
                contract_text=parsed["markdown"],
                clauses=extracted,
                risk_scores=clause_scores,
            )
            summary_text = format_summary_text(summary_data)
            contract.executive_summary = json.dumps({
                "formatted": summary_text,
                "structured": summary_data,
            })
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            contract.executive_summary = json.dumps({
                "formatted": "Summary generation failed. Please try again.",
                "structured": {},
            })

        # --- Done ---
        _update_status(db, contract, "complete")
        logger.info(
            f"Analysis complete for {contract.filename}: "
            f"risk={overall['overall_score']}/100 ({overall['risk_level']})"
        )

    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        logger.error(traceback.format_exc())
        try:
            _update_status(db, contract, "error")
        except Exception:
            pass
    finally:
        db.close()


def _update_status(db, contract: Contract, status: str) -> None:
    """Update contract status and commit."""
    contract.status = status
    db.commit()
    logger.info(f"Contract {contract.id} status -> {status}")


def _get_baseline_text(db, clause_type: str) -> str | None:
    """Look up market-standard baseline text for a clause type.

    Searches all contract types for a matching baseline clause.
    Returns the first match or None.
    """
    baseline = (
        db.query(Baseline)
        .filter(Baseline.clause_type == clause_type)
        .first()
    )
    if baseline:
        return baseline.standard_text
    return None
