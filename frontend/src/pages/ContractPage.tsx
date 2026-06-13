import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  Loader2,
  ChevronDown,
  ChevronUp,
  Clock,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { getContract, type Clause } from '../lib/api';
import {
  cn,
  formatDate,
  formatRiskScore,
  getRiskBgColor,
  getRiskScoreColor,
  getClauseTypeLabel,
  getDeviationLabel,
  getDeviationColor,
} from '../lib/utils';
import { useState, useEffect, useRef } from 'react';
import { Skeleton } from '../components/ui/Skeleton';
import { toastSuccess, toastError } from '../components/ui/Toast';

export function ContractPage() {
  const { id } = useParams<{ id: string }>();
  const [expandedClause, setExpandedClause] = useState<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const [progressStage, setProgressStage] = useState(0);

  const stages = [
    "Document uploaded",
    "Parsing document structure...",
    "Extracting key provisions...",
    "Assessing legal and commercial risks...",
    "Generating executive summary...",
    "Preparing results..."
  ];

  const { data: contract, isLoading, isError, refetch } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => getContract(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll while processing
      if (status && !['complete', 'error'].includes(status)) return 3000;
      return false;
    },
  });

  useEffect(() => {
    if (contract) {
      const currentStatus = contract.status;
      const prevStatus = prevStatusRef.current;
      
      if (prevStatus && prevStatus !== currentStatus) {
        if (currentStatus === 'complete') {
          toastSuccess('Analysis complete!');
        } else if (currentStatus === 'error') {
          toastError('Analysis failed.');
        }
      }
      prevStatusRef.current = currentStatus;
    }
  }, [contract?.status]);

  const isProcessing = contract ? !['complete', 'error'].includes(contract.status) : false;

  useEffect(() => {
    if (isProcessing) {
      const timer = setInterval(() => {
        setProgressStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
      }, 2500);
      return () => clearInterval(timer);
    } else {
      setProgressStage(0);
    }
  }, [isProcessing, stages.length]);

  if (isLoading) {
    return (
      <div className="p-8 animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-md" />
              <Skeleton className="h-8 w-64" />
            </div>
            <Skeleton className="h-4 w-40 mt-2" />
          </div>
        </div>
        <div className="glass-card rounded-xl p-8 mb-8 flex flex-col items-center">
          <Skeleton className="h-12 w-12 rounded-full mb-4" />
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-4" />
          <Skeleton className="h-1.5 w-64 rounded-full" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="glass-card rounded-xl p-6 h-48"><Skeleton className="h-full w-full" /></div>
          <div className="glass-card rounded-xl p-6 h-48"><Skeleton className="h-full w-full" /></div>
          <div className="glass-card rounded-xl p-6 h-48"><Skeleton className="h-full w-full" /></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-[var(--color-muted-foreground)]">
        <AlertTriangle className="h-12 w-12 mb-4 text-red-500 opacity-80" />
        <p className="text-lg font-medium mb-2 text-red-400">Failed to load contract</p>
        <p className="text-sm mb-6">There was a problem communicating with the server.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-8 text-center text-[var(--color-muted-foreground)]">
        Contract not found.
      </div>
    );
  }
  const summary = contract.executive_summary
    ? (() => {
        try {
          return JSON.parse(contract.executive_summary);
        } catch {
          return { formatted: contract.executive_summary, structured: {} };
        }
      })()
    : null;

  const radarData = contract.risk_breakdown
    ? [
        { category: 'Financial', score: contract.risk_breakdown.financial },
        { category: 'Operational', score: contract.risk_breakdown.operational },
        { category: 'Legal', score: contract.risk_breakdown.legal },
        { category: 'Reputational', score: contract.risk_breakdown.reputational },
      ]
    : [];

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/"
          className="p-2 rounded-lg hover:bg-[var(--color-secondary)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-[var(--color-primary)]" />
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
              {contract.filename}
            </h1>
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
            Uploaded {formatDate(contract.created_at)}
          </p>
        </div>
        {contract.status === 'complete' && (
          <Link
            to={`/contracts/${id}/chat`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-secondary)] text-[var(--color-foreground)] font-medium text-sm hover:bg-[var(--color-accent)] transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            Ask Questions
          </Link>
        )}
      </div>

      {/* Processing State */}
      {isProcessing && (
        <>
          <div className="glass-card rounded-xl p-10 max-w-2xl mx-auto mb-12 shadow-lg border-[var(--color-border)]">
            <div className="flex flex-col items-center mb-8">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-[var(--color-primary)] mb-6" />
                <div className="absolute inset-0 flex items-center justify-center mb-6">
                  <FileText className="h-6 w-6 text-[var(--color-primary)] opacity-80" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-3 bg-gradient-to-r from-[var(--color-primary)] to-blue-500 bg-clip-text text-transparent">
                Analyzing Contract
              </h2>
              <p className="text-[var(--color-muted-foreground)] text-center max-w-md">
                Our AI is reviewing your document. This usually takes about 15-20 seconds.
              </p>
            </div>
            
            <div className="space-y-1 px-4 md:px-12">
              {stages.map((stage, index) => {
                const isCompleted = index < progressStage;
                const isCurrent = index === progressStage;
                
                return (
                  <div 
                    key={index} 
                    className={cn(
                      "flex items-center gap-4 py-1.5 px-3 rounded-lg transition-all duration-500",
                      isCurrent ? "bg-[var(--color-secondary)]/50 scale-105 shadow-sm" : "",
                      isCompleted ? "opacity-100" : isCurrent ? "opacity-100" : "opacity-40"
                    )}
                  >
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500 animate-in zoom-in duration-300" />
                      ) : isCurrent ? (
                        <Loader2 className="h-5 w-5 text-[var(--color-primary)] animate-spin" />
                      ) : (
                        <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-muted-foreground)]/30" />
                      )}
                    </div>
                    <span className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      isCurrent ? "text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]"
                    )}>
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skeleton Results while Analyzing */}
          <div className="opacity-20 pointer-events-none transition-opacity duration-1000 blur-[1px]">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-32 w-32 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center space-y-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-32 w-full max-w-[200px] rounded-full" />
              </div>
              <div className="glass-card rounded-xl p-6 flex flex-col space-y-4">
                <Skeleton className="h-4 w-32 mb-4" />
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center w-full">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-5 w-8 rounded-full" />
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card rounded-xl p-6 mb-8 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-48" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[95%]" />
            </div>

            <div className="glass-card rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--color-border)]">
                <Skeleton className="h-6 w-48" />
              </div>
              <div className="divide-y divide-[var(--color-border)]">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-6 flex items-center gap-4">
                    <Skeleton className="h-10 w-1.5 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-64" />
                      <Skeleton className="h-4 w-full max-w-md" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-4 w-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Error State */}
      {contract.status === 'error' && (
        <div className="glass-card rounded-xl p-6 mb-8 border border-red-500/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            <div>
              <h2 className="text-lg font-semibold text-red-400">Analysis Failed</h2>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                An error occurred during analysis. Please try re-uploading the contract.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results (only show when complete) */}
      {contract.status === 'complete' && (
        <>
          {/* Risk Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Overall Risk Score */}
            <div className="glass-card rounded-xl p-6 flex flex-col items-center justify-center">
              <p className="text-sm text-[var(--color-muted-foreground)] mb-3">
                Overall Risk Score
              </p>
              <div className="relative w-32 h-32 mb-3">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke="var(--color-secondary)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    stroke={getRiskScoreColor(contract.overall_risk_score)}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${((contract.overall_risk_score || 0) / 100) * 327} 327`}
                    className="transition-all duration-1000 animate-gauge"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-3xl font-bold"
                    style={{ color: getRiskScoreColor(contract.overall_risk_score) }}
                  >
                    {formatRiskScore(contract.overall_risk_score)}
                  </span>
                  <span className="text-xs text-[var(--color-muted-foreground)]">/100</span>
                </div>
              </div>
              <span
                className={cn(
                  'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border',
                  getRiskBgColor(contract.risk_level),
                )}
              >
                {contract.risk_level
                  ? contract.risk_level.charAt(0).toUpperCase() + contract.risk_level.slice(1)
                  : 'N/A'}{' '}
                Risk
              </span>
            </div>

            {/* Risk Radar */}
            <div className="glass-card rounded-xl p-6">
              <p className="text-sm text-[var(--color-muted-foreground)] mb-2">
                Risk Breakdown
              </p>
              {radarData.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--color-border)" />
                    <PolarAngleAxis
                      dataKey="category"
                      tick={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={false}
                      axisLine={false}
                    />
                    <Radar
                      dataKey="score"
                      stroke="var(--color-primary)"
                      fill="var(--color-primary)"
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Clause Summary */}
            <div className="glass-card rounded-xl p-6">
              <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
                Clause Overview
              </p>
              <div className="space-y-2">
                {contract.clauses
                  .reduce(
                    (acc, clause) => {
                      const existing = acc.find((a) => a.type === clause.clause_type);
                      if (existing) {
                        existing.count += 1;
                        existing.maxRisk = Math.max(
                          existing.maxRisk,
                          clause.risk_score || 0,
                        );
                      } else {
                        acc.push({
                          type: clause.clause_type,
                          count: 1,
                          maxRisk: clause.risk_score || 0,
                        });
                      }
                      return acc;
                    },
                    [] as Array<{ type: string; count: number; maxRisk: number }>,
                  )
                  .sort((a, b) => b.maxRisk - a.maxRisk)
                  .map((group) => {
                    const level =
                      group.maxRisk <= 25
                        ? 'low'
                        : group.maxRisk <= 50
                          ? 'medium'
                          : group.maxRisk <= 75
                            ? 'high'
                            : 'critical';
                    return (
                      <div
                        key={group.type}
                        className="flex items-center justify-between py-1.5"
                      >
                        <span className="text-sm text-[var(--color-foreground)]">
                          {getClauseTypeLabel(group.type)}
                        </span>
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full border',
                            getRiskBgColor(level),
                          )}
                        >
                          {Math.round(group.maxRisk)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          {summary && (
            <div className="glass-card rounded-xl p-6 mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-[var(--color-primary)]" />
                <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                  Executive Summary
                </h2>
              </div>
              <div className="text-sm text-[var(--color-secondary-foreground)] leading-relaxed whitespace-pre-wrap">
                {summary.formatted || summary.structured?.summary || 'No summary available.'}
              </div>
            </div>
          )}

          {/* Clauses List */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
                Extracted Clauses ({contract.clauses.length})
              </h2>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {contract.clauses
                .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0))
                .map((clause, index) => (
                  <ClauseCard
                    key={clause.id}
                    clause={clause}
                    index={index}
                    isExpanded={expandedClause === clause.id}
                    onToggle={() =>
                      setExpandedClause(
                        expandedClause === clause.id ? null : clause.id,
                      )
                    }
                  />
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ClauseCard({
  clause,
  index = 0,
  isExpanded,
  onToggle,
}: {
  clause: Clause;
  index?: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div 
      className="group animate-staggered"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center gap-4 hover:bg-[var(--color-secondary)]/30 transition-colors text-left"
      >
        {/* Risk indicator */}
        <div
          className="w-1.5 h-10 rounded-full shrink-0"
          style={{ backgroundColor: getRiskScoreColor(clause.risk_score) }}
        />

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              {clause.title || getClauseTypeLabel(clause.clause_type)}
            </span>
            {clause.section_number && (
              <span className="text-xs text-[var(--color-muted-foreground)]">
                Section {clause.section_number}
              </span>
            )}
          </div>
          {clause.plain_english_summary && (
            <p className="text-xs text-[var(--color-muted-foreground)] mt-1 truncate">
              {clause.plain_english_summary}
            </p>
          )}
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 shrink-0">
          {clause.market_deviation && clause.market_deviation !== 'standard' && (
            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full border font-medium',
                getDeviationColor(clause.market_deviation),
              )}
            >
              {getDeviationLabel(clause.market_deviation)}
            </span>
          )}
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full border font-medium',
              getRiskBgColor(clause.risk_level),
            )}
          >
            {formatRiskScore(clause.risk_score)}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      <div 
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none"
        )}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-6 pl-12 pt-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Original Text */}
            <div className="bg-[var(--color-background)] rounded-lg p-4">
              <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider mb-2">
                Original Text
              </p>
              <p className="text-sm text-[var(--color-secondary-foreground)] leading-relaxed whitespace-pre-wrap">
                {clause.original_text}
              </p>
            </div>

            {/* Analysis */}
            <div className="space-y-3">
              {clause.plain_english_summary && (
                <div className="bg-[var(--color-background)] rounded-lg p-4">
                  <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider mb-2">
                    Plain English
                  </p>
                  <p className="text-sm text-[var(--color-secondary-foreground)] leading-relaxed">
                    {clause.plain_english_summary}
                  </p>
                </div>
              )}

              {clause.deviation_explanation && (
                <div className="bg-[var(--color-background)] rounded-lg p-4">
                  <p className="text-xs font-semibold text-[var(--color-muted-foreground)] uppercase tracking-wider mb-2">
                    Market Deviation
                  </p>
                  <p className="text-sm text-[var(--color-secondary-foreground)] leading-relaxed">
                    {clause.deviation_explanation}
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <div className="bg-[var(--color-background)] rounded-lg p-3 flex-1 text-center">
                  <p className="text-xs text-[var(--color-muted-foreground)]">Risk</p>
                  <p
                    className="text-xl font-bold"
                    style={{ color: getRiskScoreColor(clause.risk_score) }}
                  >
                    {formatRiskScore(clause.risk_score)}
                  </p>
                </div>
                <div className="bg-[var(--color-background)] rounded-lg p-3 flex-1 text-center">
                  <p className="text-xs text-[var(--color-muted-foreground)]">Category</p>
                  <p className="text-sm font-medium text-[var(--color-foreground)] capitalize">
                    {clause.risk_category || 'N/A'}
                  </p>
                </div>
                <div className="bg-[var(--color-background)] rounded-lg p-3 flex-1 text-center">
                  <p className="text-xs text-[var(--color-muted-foreground)]">Type</p>
                  <p className="text-sm font-medium text-[var(--color-foreground)]">
                    {getClauseTypeLabel(clause.clause_type)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
