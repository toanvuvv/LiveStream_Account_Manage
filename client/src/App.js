import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Components
import Header from './components/layout/Header';
import Dashboard from './components/Dashboard';
import AddAccount from './components/accounts/AddAccount';
import AccountList from './components/accounts/AccountList';
import AccountDetail from './components/accounts/AccountDetail';
import GroupList from './components/groups/GroupList';
import GroupDetail from './components/groups/GroupDetail';
import SessionList from './components/sessions/SessionList';
import SessionDetail from './components/sessions/SessionDetail';
import Login from './components/auth/Login';
import PrivateRoute from './components/auth/PrivateRoute';
import UserManagement from './components/users/UserManagement';

// Services
import authService from './services/authService';

function App() {
  useEffect(() => {
    // Khởi tạo header xác thực khi ứng dụng khởi động
    authService.initAuthHeader();
  }, []);

  return (
    <Router>
      <Header />
      <Container className="py-4">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes - Yêu cầu đăng nhập */}
          <Route element={<PrivateRoute />}>
            <Route path="/accounts" element={<AccountList />} />
            <Route path="/accounts/:id" element={<AccountDetail />} />
            <Route path="/sessions/:accountId" element={<SessionList />} />
            <Route path="/sessions/:accountId/:sessionId" element={<SessionDetail />} />
          </Route>
          
          {/* Admin Only Routes - Yêu cầu quyền admin */}
          <Route element={<PrivateRoute requireAdmin={true} />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/accounts/add" element={<AddAccount />} />
            <Route path="/groups" element={<GroupList />} />
            <Route path="/groups/:id" element={<GroupDetail />} />
            <Route path="/users" element={<UserManagement />} />
          </Route>
        </Routes>
      </Container>
    </Router>
  );
}

export default App;
