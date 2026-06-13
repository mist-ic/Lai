import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { UploadPage } from './pages/UploadPage';
import { ContractPage } from './pages/ContractPage';
import { ComparePage } from './pages/ComparePage';
import { ChatPage } from './pages/ChatPage';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Toaster } from './components/ui/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="upload" element={<UploadPage />} />
              <Route path="contracts/:id" element={<ContractPage />} />
              <Route path="compare" element={<ComparePage />} />
              <Route path="contracts/:id/chat" element={<ChatPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
