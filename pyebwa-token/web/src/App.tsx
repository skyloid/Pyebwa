import React from 'react';
import { WalletProvider } from './providers/WalletProvider';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Dashboard } from './screens/Dashboard';
import { PreserveHeritage } from './screens/PreserveHeritage';
import { AdminDashboard } from './components/Admin/AdminDashboard';

function App() {
  return (
    <WalletProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/preserve" element={<PreserveHeritage />} />
          <Route path="/admin/*" element={<AdminDashboard />} />
        </Routes>
      </Router>
    </WalletProvider>
  );
}

export default App;
