import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SynagogueDisplay from './pages/SynagogueDisplay';
import Zmanim from './pages/Zmanim';
import AdminHome from './pages/admin/AdminHome';
import PanelList from './pages/admin/PanelList';
import ItemForm from './pages/admin/ItemForm';

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
          <Route path="/" element={<SynagogueDisplay />} />
          <Route path="/zmanim" element={<Zmanim />} />
          <Route path="/adminGabbai" element={<AdminHome />} />
          <Route path="/adminGabbai/:panel" element={<PanelList />} />
          <Route path="/adminGabbai/:panel/new" element={<ItemForm />} />
          <Route path="/adminGabbai/:panel/:id" element={<ItemForm />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
