import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Display from './pages/Display';
import Zmanim from './pages/Zmanim';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60000, // 1 minute
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<Display />} />
          <Route path="/zmanim" element={<Zmanim />} />
          {/* Admin routes will be added here */}
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
