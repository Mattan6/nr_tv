import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SynagogueDisplay from './pages/SynagogueDisplay';
import MobileDisplay from './pages/MobileDisplay';
import Zmanim from './pages/Zmanim';
import AdminHome from './pages/admin/AdminHome';
import PanelList from './pages/admin/PanelList';
import ItemForm from './pages/admin/ItemForm';
import useIsMobile from './hooks/useIsMobile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60000, // 1 minute
    },
  },
});

// One URL, two layouts. The TV and the congregation's phones open the same address; the
// viewport decides which of them gets the 1920x1080 wall canvas and which gets the
// scrolling column. Both read the same data — see hooks/useDisplayModel.
function DisplayRoot() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileDisplay /> : <SynagogueDisplay />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/" element={<DisplayRoot />} />
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
