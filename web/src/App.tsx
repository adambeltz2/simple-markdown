import { AppStateProvider } from './hooks/useAppState';
import AppShell from './components/AppShell';
import './App.css';

export default function App() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}
