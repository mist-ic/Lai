import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Upload,
  Trash2,
  ArrowRight,
  BarChart3,
  Shield,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { getContracts, deleteContract, type Contract } from '../lib/api';
import {
  cn,
  formatDate,
  formatRiskScore,
  getRiskBgColor,
  getRiskScoreColor,
} from '../lib/utils';
import { Skeleton } from '../components/ui/Skeleton';
import { toastSuccess, toastError } from '../components/ui/Toast';

export function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: contracts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['contracts'],
    queryFn: getContracts,
    refetchInterval: 5000, // Poll for status updates
  });

  const deleteMutation = useMutation({
    mutationFn: deleteContract,
    onSuccess: () => {
      toastSuccess('Contract deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    },
    onError: () => toastError('Failed to delete contract'),
  });

  // Stats
  const totalContracts = contracts.length;
  const analyzedContracts = contracts.filter((c) => c.status === 'complete').length;
  const highRiskCount = contracts.filter(
    (c) => c.risk_level === 'high' || c.risk_level === 'critical',
  ).length;
  const avgRisk =
    analyzedContracts > 0
      ? Math.round(
          contracts
            .filter((c) => c.overall_risk_score !== null)
            .reduce((sum, c) => sum + (c.overall_risk_score || 0), 0) /
            analyzedContracts,
        )
      : 0;

  const stats = [
    {
      label: 'Total Contracts',
      value: totalContracts,
      icon: FileText,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Analyzed',
      value: analyzedContracts,
      icon: CheckCircle2,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'High Risk',
      value: highRiskCount,
      icon: AlertTriangle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
    {
      label: 'Avg Risk Score',
      value: avgRisk,
      icon: TrendingUp,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
  ];

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-foreground)]">Dashboard</h1>
          <p className="text-[var(--color-muted-foreground)] mt-1">
            Contract analysis overview
          </p>
        </div>
        <Link
          to="/upload"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-primary)] text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-[var(--color-primary)]/20"
        >
          <Upload className="h-4 w-4" />
          Upload Contract
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-xl p-5 animate-slide-in hover:scale-[1.02] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[var(--color-primary)]/5 transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[var(--color-muted-foreground)]">
                {stat.label}
              </span>
              <div className={cn('p-2 rounded-lg', stat.bg)}>
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
            </div>
            <p className="text-3xl font-bold text-[var(--color-foreground)]">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Contracts Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[var(--color-primary)]" />
            <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
              Recent Contracts
            </h2>
          </div>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {totalContracts} total
          </span>
        </div>

        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Contract</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Risk Score</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Risk Level</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Uploaded</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-12" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-16 ml-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-muted-foreground)]">
            <AlertTriangle className="h-12 w-12 mb-4 text-red-500 opacity-80" />
            <p className="text-lg font-medium mb-2 text-red-400">Failed to load contracts</p>
            <p className="text-sm mb-6">There was a problem communicating with the server.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Retry
            </button>
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--color-muted-foreground)]">
            <Shield className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg font-medium mb-2">No contracts yet</p>
            <p className="text-sm mb-6">Upload your first contract to get started</p>
            <Link
              to="/upload"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Upload className="h-4 w-4" />
              Upload Contract
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Contract
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Risk Score
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Risk Level
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Uploaded
                  </th>
                  <th className="text-right px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {contracts.map((contract) => (
                  <ContractRow
                    key={contract.id}
                    contract={contract}
                    onDelete={() => deleteMutation.mutate(contract.id)}
                    onView={() => navigate(`/contracts/${contract.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ContractRow({
  contract,
  onDelete,
  onView,
}: {
  contract: Contract;
  onDelete: () => void;
  onView: () => void;
}) {
  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    uploaded: { icon: Clock, color: 'text-gray-400', label: 'Uploaded' },
    parsing: { icon: Loader2, color: 'text-blue-400', label: 'Parsing...' },
    parsed: { icon: CheckCircle2, color: 'text-blue-400', label: 'Parsed' },
    analyzing: { icon: Loader2, color: 'text-yellow-400', label: 'Analyzing...' },
    complete: { icon: CheckCircle2, color: 'text-green-400', label: 'Complete' },
    error: { icon: AlertTriangle, color: 'text-red-400', label: 'Error' },
  };

  const status = statusConfig[contract.status] || statusConfig.uploaded;
  const StatusIcon = status.icon;
  const isProcessing = contract.status === 'parsing' || contract.status === 'analyzing';

  return (
    <tr
      className="hover:bg-[var(--color-secondary)]/50 cursor-pointer transition-colors"
      onClick={onView}
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-secondary)] flex items-center justify-center">
            <FileText className="h-4 w-4 text-[var(--color-primary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-foreground)]">
              {contract.filename}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)] uppercase">
              {contract.file_type}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={cn('h-4 w-4', status.color, isProcessing && 'animate-spin')}
          />
          <span className={cn('text-sm', status.color)}>{status.label}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        {isProcessing ? (
          <div className="flex flex-col gap-1">
            <Skeleton className="h-8 w-16" />
            <span className="text-[10px] text-[var(--color-muted-foreground)] animate-pulse">Analyzing...</span>
          </div>
        ) : contract.overall_risk_score !== null ? (
          <span
            className="text-2xl font-bold"
            style={{ color: getRiskScoreColor(contract.overall_risk_score) }}
          >
            {formatRiskScore(contract.overall_risk_score)}
          </span>
        ) : (
          <span className="text-sm text-[var(--color-muted-foreground)]">-</span>
        )}
      </td>
      <td className="px-6 py-4">
        {isProcessing ? (
          <Skeleton className="h-6 w-20 rounded-full" />
        ) : contract.risk_level ? (
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border',
              getRiskBgColor(contract.risk_level),
            )}
          >
            {contract.risk_level.charAt(0).toUpperCase() + contract.risk_level.slice(1)}
          </span>
        ) : (
          <span className="text-sm text-[var(--color-muted-foreground)]">-</span>
        )}
      </td>
      <td className="px-6 py-4">
        <span className="text-sm text-[var(--color-muted-foreground)]">
          {formatDate(contract.created_at)}
        </span>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onView}
            className="p-2 rounded-lg hover:bg-[var(--color-secondary)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            title="View analysis"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--color-muted-foreground)] hover:text-red-400 transition-colors"
            title="Delete contract"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
