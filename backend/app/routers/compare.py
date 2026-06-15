import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.clause import Clause
from app.models.contract import Contract
from app.schemas.analysis import CompareRequest, CompareResult, ClauseComparison
from app.services.comparator import compare_clauses as compare_clauses_llm

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/compare", tags=["compare"])


@router.post("", response_model=CompareResult)
async def compare_clauses(
    request: CompareRequest,
    db: Session = Depends(get_db),
):
    """Compare clauses of a specific type across multiple contracts.

    Returns both the raw clause text and an AI-powered analysis
    highlighting key differences, the most favorable/risky versions,
    and a recommendation.
    """
    if len(request.contract_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 contracts are required for comparison.",
        )

    # Validate contracts exist and build name lookup
    contract_names: dict[str, str] = {}
    for cid in request.contract_ids:
        contract = db.query(Contract).filter(Contract.id == cid).first()
        if not contract:
            raise HTTPException(
                status_code=404,
                detail=f"Contract {cid} not found",
            )
        contract_names[cid] = contract.filename

    # Fetch clauses of the specified type from all given contracts
    clauses = (
        db.query(Clause)
        .filter(
            Clause.contract_id.in_(request.contract_ids),
            Clause.clause_type == request.clause_type,
        )
        .all()
    )

    # Build comparison entries
    comparisons = [
        ClauseComparison(
            contract_id=clause.contract_id,
            contract_name=contract_names.get(clause.contract_id, ""),
            clause_text=clause.original_text,
            risk_score=clause.risk_score,
            deviation=clause.market_deviation,
        )
        for clause in clauses
    ]

    # Run AI-powered comparison if we have 2+ clauses to compare
    ai_summary = None
    key_differences = None
    most_favorable = None
    most_risky = None
    recommendation = None

    if len(clauses) >= 2:
        try:
            clause_pairs = [
                {
                    "contract_name": contract_names.get(c.contract_id, ""),
                    "clause_text": c.original_text,
                }
                for c in clauses
            ]

            llm_result = await compare_clauses_llm(
                clause_pairs=clause_pairs,
                clause_type=request.clause_type,
            )

            ai_summary = llm_result.get("summary")
            key_differences = llm_result.get("key_differences")
            most_favorable = llm_result.get("most_favorable")
            most_risky = llm_result.get("most_risky")
            recommendation = llm_result.get("recommendation")
        except Exception as e:
            logger.warning(f"AI comparison failed, returning raw data: {e}")

    return CompareResult(
        clause_type=request.clause_type,
        comparisons=comparisons,
        ai_summary=ai_summary,
        key_differences=key_differences,
        most_favorable=most_favorable,
        most_risky=most_risky,
        recommendation=recommendation,
    )

