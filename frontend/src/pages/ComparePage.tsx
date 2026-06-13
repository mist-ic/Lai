import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  GitCompareArrows,
  Loader2,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import { getContracts, compareContracts, type CompareResult } from '../lib/api';
import { cn, getClauseTypeLabel, getRiskBgColor } from '../lib/utils';
import { Skeleton } from '../components/ui/Skeleton';

const LOADING_MESSAGES = [
  'Analyzing selected contracts...',
  'Extracting clause information...',
  'Comparing clause language...',
  'Evaluating risk exposure...',
  'Checking market-standard deviations...',
  'Generating insights...',
];

const CLAUSE_TYPES = [
  'indemnity',
  'limitation_of_liability',
  'governing_law',
  'termination',
  'ip_ownership',
  'payment_terms',
  'confidentiality',
];

export function ComparePage() {
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [selectedClauseType, setSelectedClauseType] = useState(CLAUSE_TYPES[0]);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isComparing) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev));
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [isComparing]);

  const { data: contracts = [] } = useQuery({
    queryKey: ['contracts'],
    queryFn: getContracts,
  });

  const completedContracts = contracts.filter((c) => c.status === 'complete');

  const toggleContract = (id: string) => {
    setSelectedContracts((prev) =>
      prev.includes(id)
        ? prev.filter((cid) => cid !== id)
        : prev.length < 5
          ? [...prev, id]
          : prev,
    );
  };

  const handleCompare = async () => {
    if (selectedContracts.length < 2) {
      setError('Select at least 2 contracts to compare.');
      return;
    }
    setError(null);
    setCompareResult(null); // Clear previous results while loading
    setIsComparing(true);
    try {
      const result = await compareContracts(selectedContracts, selectedClauseType);
      setCompareResult(result);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Comparison failed.');
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="p-8 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-foreground)]">
          Compare Contracts
        </h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          Side-by-side clause comparison across multiple contracts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Contract Selection */}
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-4">
            Select Contracts ({selectedContracts.length}/5)
          </h3>
          {completedContracts.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No analyzed contracts available. Upload and analyze contracts first.
            </p>
          ) : (
            <div className="space-y-2">
              {completedContracts.map((contract) => {
                const isSelected = selectedContracts.includes(contract.id);
                const riskLevel =
                  contract.risk_level || 'low';
                return (
                  <button
                    key={contract.id}
                    onClick={() => toggleContract(contract.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all text-left',
                      isSelected
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                        : 'border-[var(--color-border)] hover:border-[var(--color-muted-foreground)]/30',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors',
                          isSelected
                            ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                            : 'border-[var(--color-border)]',
                        )}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12">
                            <path
                              d="M10 3L4.5 8.5L2 6"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm font-medium text-[var(--color-foreground)]">
                        {contract.filename}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full border font-medium',
                        getRiskBgColor(riskLevel),
                      )}
                    >
                      {contract.overall_risk_score
                        ? Math.round(contract.overall_risk_score)
                        : '-'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Clause Type + Compare Button */}
        <div className="glass-card rounded-xl p-6 h-fit">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-4">
            Clause Type
          </h3>
          <div className="relative mb-4">
            <select
              value={selectedClauseType}
              onChange={(e) => setSelectedClauseType(e.target.value)}
              className="w-full appearance-none bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              {CLAUSE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getClauseTypeLabel(type)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-muted-foreground)] pointer-events-none" />
          </div>

          <button
            onClick={handleCompare}
            disabled={selectedContracts.length < 2 || isComparing}
            className={cn(
              'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all',
              selectedContracts.length >= 2 && !isComparing
                ? 'bg-[var(--color-primary)] text-white hover:opacity-90'
                : 'bg-[var(--color-secondary)] text-[var(--color-muted-foreground)] cursor-not-allowed',
            )}
          >
            {isComparing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Comparing...
              </>
            ) : (
              <>
                <GitCompareArrows className="h-4 w-4" />
                Compare
              </>
            )}
          </button>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-xs">
              <AlertTriangle className="h-3 w-3" />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isComparing && (
        <div className="glass-card rounded-xl p-6 animate-fade-in mb-8">
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-500 mb-6" />
            <p className="text-xl font-medium text-white tracking-wide">
              {LOADING_MESSAGES[loadingStep]}
            </p>
          </div>
          
          <div 
            className={cn(
              "grid gap-4",
              selectedContracts.length === 2 ? "grid-cols-1 lg:grid-cols-2" :
              selectedContracts.length === 3 ? "grid-cols-1 md:grid-cols-3" :
              "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}
          >
            {selectedContracts.map((id) => (
              <div key={id} className="bg-[var(--color-background)] rounded-lg p-4 border border-[var(--color-border)]">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-[90%]" />
                  <Skeleton className="h-3 w-[95%]" />
                  <Skeleton className="h-3 w-[80%]" />
                </div>
                <Skeleton className="h-3 w-2/3 mt-4" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {!isComparing && compareResult && (
        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-4">
            Comparison: {getClauseTypeLabel(compareResult.clause_type)}
          </h2>

          {/* Side by side clauses */}
          <div 
            className={cn(
              "grid gap-4 mb-6",
              compareResult.comparisons.length === 2 ? "grid-cols-1 lg:grid-cols-2" :
              compareResult.comparisons.length === 3 ? "grid-cols-1 md:grid-cols-3" :
              "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            )}
          >
            {compareResult.comparisons.map((comp) => (
              <div
                key={comp.contract_id}
                className="bg-[var(--color-background)] rounded-lg p-4 border border-[var(--color-border)]"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[var(--color-foreground)]">
                    {comp.contract_name}
                  </span>
                  {comp.risk_score !== null && (
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full border font-medium',
                        getRiskBgColor(
                          comp.risk_score <= 25
                            ? 'low'
                            : comp.risk_score <= 50
                              ? 'medium'
                              : comp.risk_score <= 75
                                ? 'high'
                                : 'critical',
                        ),
                      )}
                    >
                      {Math.round(comp.risk_score)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--color-secondary-foreground)] leading-relaxed max-h-48 overflow-y-auto">
                  {comp.clause_text || 'Clause not found in this contract.'}
                </p>
                {comp.deviation && (
                  <p className="mt-2 text-xs text-[var(--color-muted-foreground)] italic">
                    {comp.deviation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
