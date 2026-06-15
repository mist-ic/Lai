from pydantic import BaseModel


class ClauseResponse(BaseModel):
    """Full clause response schema."""
    id: str
    contract_id: str
    clause_type: str
    section_number: str | None = None
    title: str | None = None
    original_text: str
    plain_english_summary: str | None = None
    risk_score: float | None = None
    risk_level: str | None = None
    risk_category: str | None = None
    market_deviation: str | None = None
    deviation_explanation: str | None = None

    model_config = {"from_attributes": True}


class RiskBreakdown(BaseModel):
    """Risk scores broken down by category."""
    financial: float
    operational: float
    legal: float
    reputational: float


class ExecutiveSummary(BaseModel):
    """AI-generated executive summary of the contract."""
    summary: str
    key_terms: list[str]
    risk_carrier: str
    top_issues: list[str]


class AnalysisStatus(BaseModel):
    """Status of the analysis pipeline for a contract."""
    contract_id: str
    status: str
    progress: float
    message: str


class CompareRequest(BaseModel):
    """Request to compare clauses across multiple contracts."""
    contract_ids: list[str]
    clause_type: str


class ClauseComparison(BaseModel):
    """Single clause comparison entry."""
    contract_id: str
    contract_name: str = ""
    clause_text: str
    risk_score: float | None = None
    deviation: str | None = None


class CompareResult(BaseModel):
    """Result of comparing clauses across contracts."""
    clause_type: str
    comparisons: list[ClauseComparison]
    ai_summary: str | None = None
    key_differences: list[dict] | None = None
    most_favorable: str | None = None
    most_risky: str | None = None
    recommendation: str | None = None


class ChatRequest(BaseModel):
    """User chat message for contract Q&A."""
    message: str


class Citation(BaseModel):
    """Citation referencing a specific clause."""
    clause_id: str
    section_number: str | None = None
    snippet: str


class ChatResponse(BaseModel):
    """AI chat response with source citations."""
    response: str
    citations: list[Citation]
