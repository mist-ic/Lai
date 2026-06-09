from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.baseline import Baseline
from app.seed_baselines import seed_baselines

router = APIRouter(prefix="/api/baselines", tags=["baselines"])


@router.post("/seed")
async def reseed_baselines(db: Session = Depends(get_db)):
    """Re-seed baselines from the bundled JSON files.

    Idempotent: existing baselines are updated in place and missing ones are
    inserted. Returns the number of rows inserted and updated.
    """
    summary = seed_baselines(db)
    return {"status": "ok", **summary}


@router.get("")
async def list_baselines(db: Session = Depends(get_db)):
    """List all baselines grouped by contract type."""
    baselines = db.query(Baseline).all()

    # Group by contract_type
    grouped: dict[str, list[dict]] = {}
    for baseline in baselines:
        entry = {
            "id": baseline.id,
            "clause_type": baseline.clause_type,
            "standard_text": baseline.standard_text,
            "description": baseline.description,
            "acceptable_variations": baseline.acceptable_variations,
        }
        if baseline.contract_type not in grouped:
            grouped[baseline.contract_type] = []
        grouped[baseline.contract_type].append(entry)

    return {"baselines": grouped}


@router.get("/{contract_type}")
async def get_baselines_by_type(
    contract_type: str,
    db: Session = Depends(get_db),
):
    """Get all baselines for a specific contract type."""
    baselines = (
        db.query(Baseline)
        .filter(Baseline.contract_type == contract_type)
        .all()
    )

    if not baselines:
        raise HTTPException(
            status_code=404,
            detail=f"No baselines found for contract type: {contract_type}",
        )

    return {
        "contract_type": contract_type,
        "baselines": [
            {
                "id": b.id,
                "clause_type": b.clause_type,
                "standard_text": b.standard_text,
                "description": b.description,
                "acceptable_variations": b.acceptable_variations,
            }
            for b in baselines
        ],
    }
