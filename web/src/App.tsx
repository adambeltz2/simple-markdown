import { AppStateProvider } from './hooks/useAppState';
import AppShell from './components/AppShell';
import Footer from './components/Footer';
import './App.css';

export default function App() {
  return (
    <AppStateProvider>
      <div className="app-root">
        <AppShell />
        <Footer />
      </div>
    </AppStateProvider>
  );
}
