import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import MainLayout from './components/Layout/MainLayout';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import MonitoringPage from './pages/MonitoringPage';
import CustomersPage from './pages/CustomersPage';
import SubmissionPage from './pages/SubmissionPage';
import SerialHistoryPage from './pages/SerialHistoryPage';
import DocHistoryPage from './pages/DocHistoryPage';


function App() {
  return (
    <AppProvider>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/monitoring" element={<MonitoringPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/submission" element={<SubmissionPage />} />
            <Route path="/serial-history" element={<SerialHistoryPage />} />
            <Route path="/doc-history" element={<DocHistoryPage />} />
          </Routes>
        </MainLayout>
      </Router>
    </AppProvider>
  );
}

export default App;
