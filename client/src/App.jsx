import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import SynagogueDisplay from './pages/SynagogueDisplay';
import MobileDisplay from './pages/MobileDisplay';
import TvDisplay from './pages/TvDisplay';
import Zmanim from './pages/Zmanim';
import AdminHome from './pages/admin/AdminHome';
import BoardPanels from './pages/admin/BoardPanels';
import PanelList from './pages/admin/PanelList';
import ItemForm from './pages/admin/ItemForm';
import TimesForm from './pages/admin/TimesForm';
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
          {/* The exception to the rule above. An Android TV browser reports about 960x540,
              which DisplayRoot reads as a phone; /tv overrides the viewport instead of the
              detection, so the same wall layout arrives at a size it can be read at. */}
          <Route path="/tv" element={<TvDisplay />} />
          <Route path="/zmanim" element={<Zmanim />} />
          <Route path="/adminGabbai" element={<AdminHome />} />
          {/* Above /:panel for the reader's benefit. React Router ranks static segments
              over dynamic ones regardless of order, unlike Express — see routes/content.js,
              where the same pair of paths does depend on declaration order. */}
          <Route path="/adminGabbai/board/:board" element={<BoardPanels />} />
          {/* The bare /settings is kept as an alias for שבת: it is the address the gabbai's
              phone has bookmarked from before there was a second board with times. */}
          <Route path="/adminGabbai/settings" element={<TimesForm />} />
          <Route path="/adminGabbai/settings/:group" element={<TimesForm />} />
          <Route path="/adminGabbai/:panel" element={<PanelList />} />
          <Route path="/adminGabbai/:panel/new" element={<ItemForm />} />
          <Route path="/adminGabbai/:panel/:id" element={<ItemForm />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
