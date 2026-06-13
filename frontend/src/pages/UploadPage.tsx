import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { uploadContract, triggerAnalysis } from '../lib/api';
import { cn } from '../lib/utils';
import { toastSuccess, toastError, toastInfo } from '../components/ui/Toast';

export function UploadPage() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const contract = await uploadContract(file);
      toastSuccess('Upload successful');
      toastInfo('Analysis started...');
      // Auto-trigger analysis after upload
      await triggerAnalysis(contract.id);
      return contract;
    },
    onSuccess: (contract) => {
      navigate(`/contracts/${contract.id}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Upload failed. Please try again.';
      toastError(msg);
      setError(msg);
    },
  });

  const validateFile = (file: File): boolean => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const validExts = ['.pdf', '.docx'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      setError('Invalid file type. Only PDF and DOCX files are supported.');
      return false;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('File too large. Maximum size is 20MB.');
      return false;
    }

    setError(null);
    return true;
  };

  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) {
      setSelectedFile(file);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const isUploading = uploadMutation.isPending;

  return (
    <div className="p-8 max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--color-foreground)]">
          Upload Contract
        </h1>
        <p className="text-[var(--color-muted-foreground)] mt-1">
          Upload a PDF or DOCX contract for AI-powered analysis
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'glass-card rounded-xl p-12 text-center transition-all duration-300 cursor-pointer',
          dragActive && 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 scale-[1.01]',
          !dragActive && 'hover:border-[var(--color-muted-foreground)]/30',
        )}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".pdf,.docx"
          onChange={handleInputChange}
          className="hidden"
        />

        {!selectedFile ? (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <Upload className={cn('h-8 w-8', dragActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted-foreground)]')} />
            </div>
            <p className="text-lg font-medium text-[var(--color-foreground)] mb-2">
              {dragActive ? 'Drop your file here' : 'Drag and drop your contract'}
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
              or click to browse files
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Supports PDF and DOCX (max 20MB)
            </p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-[var(--color-primary)]" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                {selectedFile.name}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFile(null);
                setError(null);
              }}
              className="p-1.5 rounded-lg hover:bg-[var(--color-secondary)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && (
        <button
          onClick={handleUpload}
          disabled={isUploading}
          className={cn(
            'mt-6 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all',
            isUploading
              ? 'bg-[var(--color-primary)]/50 text-white/50 cursor-not-allowed'
              : 'bg-[var(--color-primary)] text-white hover:opacity-90 shadow-lg shadow-[var(--color-primary)]/20',
          )}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading and starting analysis...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Upload and Analyze
            </>
          )}
        </button>
      )}

      {/* What happens next */}
      <div className="mt-8 glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold text-[var(--color-foreground)] mb-4">
          What happens after upload?
        </h3>
        <div className="space-y-3">
          {[
            { step: '1', label: 'Document parsed and structured (sections, headings, tables)' },
            { step: '2', label: 'AI extracts and classifies all contract clauses' },
            { step: '3', label: 'Each clause scored for risk against market standards' },
            { step: '4', label: 'Plain-English executive summary generated' },
          ].map((item) => (
            <div key={item.step} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-[var(--color-primary)]">
                  {item.step}
                </span>
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)]">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
