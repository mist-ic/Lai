"""Seed market-standard baselines into the database.

Reads every JSON file in ``app/baselines/`` and upserts each clause into the
``baselines`` table. The operation is idempotent: running it more than once
does not create duplicate rows. Existing rows (matched on the natural key of
``contract_type`` and ``clause_type``) are updated in place.

Run standalone with::

    python -m app.seed_baselines
"""

import json
import logging
from pathlib import Path

from sqlalchemy.orm import Session

from app.database import Base, SessionLocal, engine
from app.models.baseline import Baseline

logger = logging.getLogger(__name__)

BASELINES_DIR = Path(__file__).resolve().parent / "baselines"


def load_baseline_files(baselines_dir: Path = BASELINES_DIR) -> list[dict]:
    """Read and parse every ``*.json`` file in the baselines directory."""
    documents: list[dict] = []
    for path in sorted(baselines_dir.glob("*.json")):
        with path.open(encoding="utf-8") as handle:
            documents.append(json.load(handle))
    return documents


def seed_baselines(db: Session, baselines_dir: Path = BASELINES_DIR) -> dict[str, int]:
    """Upsert all baseline clauses from JSON files into the database.

    Returns a summary with the number of rows inserted and updated.
    """
    inserted = 0
    updated = 0

    for document in load_baseline_files(baselines_dir):
        contract_type = document["contract_type"]
        for clause in document["clauses"]:
            clause_type = clause["clause_type"]
            standard_text = clause["standard_text"]
            description = clause.get("description")
            acceptable_variations = clause.get("acceptable_variations")

            existing = (
                db.query(Baseline)
                .filter(
                    Baseline.contract_type == contract_type,
                    Baseline.clause_type == clause_type,
                )
                .first()
            )

            if existing is None:
                db.add(
                    Baseline(
                        contract_type=contract_type,
                        clause_type=clause_type,
                        standard_text=standard_text,
                        description=description,
                        acceptable_variations=acceptable_variations,
                    )
                )
                inserted += 1
            else:
                existing.standard_text = standard_text
                existing.description = description
                existing.acceptable_variations = acceptable_variations
                updated += 1

    db.commit()
    return {"inserted": inserted, "updated": updated}


def main() -> None:
    """Entry point for ``python -m app.seed_baselines``."""
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    # Ensure the table exists when run before the app has started.
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        summary = seed_baselines(db)
    finally:
        db.close()

    logger.info(
        "Baseline seeding complete: %d inserted, %d updated.",
        summary["inserted"],
        summary["updated"],
    )


if __name__ == "__main__":
    main()
