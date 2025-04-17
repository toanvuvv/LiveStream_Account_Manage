import React, { useEffect, useState } from 'react';
import { Navbar, Nav, Container, Button, NavDropdown } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaList, FaPlus, FaLayerGroup, FaSignOutAlt, FaSignInAlt, FaUserCog } from 'react-icons/fa';
import authService from '../../services/authService';
import './Header.css';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    // Kiểm tra trạng thái đăng nhập mỗi khi location thay đổi
    const checkAuth = () => {
      const auth = authService.isAuthenticated();
      setIsAuthenticated(auth);
      setIsAdmin(authService.isAdmin());
      
      if (auth) {
        const user = authService.getUserData();
        setUsername(user.username);
      }
    };
    
    checkAuth();
  }, [location]);

  const isActive = (path) => {
    return location.pathname === path;
  };
  
  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setIsAdmin(false);
    navigate('/login');
  };

  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="custom-navbar shadow-sm">
      <Container>
        <Navbar.Brand as={Link} to={isAdmin ? "/" : "/accounts"} className="d-flex align-items-center brand-container">
          <div className="logo-container me-2">
            <FaLayerGroup size={24} className="text-primary" />
          </div>
          <div className="brand-text">
            <span className="brand-title">Quản Lý Tài Khoản</span>
            <small className="brand-subtitle d-none d-md-inline">Livestream</small>
          </div>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          {isAuthenticated ? (
            <>
              <Nav className="ms-auto nav-links">
                {isAdmin && (
                  <Nav.Link as={Link} to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
                    <FaHome className="nav-icon" />
                    <span className="nav-text">Trang Chủ</span>
                  </Nav.Link>
                )}
                <Nav.Link as={Link} to="/accounts" className={`nav-item ${isActive('/accounts') ? 'active' : ''}`}>
                  <FaList className="nav-icon" />
                  <span className="nav-text">Danh Sách Nick</span>
                </Nav.Link>
                {isAdmin && (
                  <>
                    <Nav.Link as={Link} to="/accounts/add" className={`nav-item ${isActive('/accounts/add') ? 'active' : ''}`}>
                      <FaPlus className="nav-icon" />
                      <span className="nav-text">Thêm Nick Mới</span>
                    </Nav.Link>
                    <Nav.Link as={Link} to="/groups" className={`nav-item ${isActive('/groups') ? 'active' : ''}`}>
                      <FaLayerGroup className="nav-icon" />
                      <span className="nav-text">Quản Lý Nhóm</span>
                    </Nav.Link>
                  </>
                )}
              </Nav>
              <NavDropdown 
                title={
                  <span>
                    <FaUserCog className="me-1" /> {username}
                  </span>
                } 
                id="user-dropdown"
                align="end"
                className="ms-lg-3 mt-3 mt-lg-0 custom-dropdown"
              >
                {isAdmin && (
                  <NavDropdown.Item as={Link} to="/users">
                    <FaUserCog className="me-1" /> Quản lý người dùng
                  </NavDropdown.Item>
                )}
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={handleLogout}>
                  <FaSignOutAlt className="me-1" /> Đăng xuất
                </NavDropdown.Item>
              </NavDropdown>
            </>
          ) : (
            <div className="ms-auto">
              <Button as={Link} to="/login" variant="outline-light" size="sm">
                <FaSignInAlt className="me-1" /> Đăng Nhập
              </Button>
            </div>
          )}
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header; 