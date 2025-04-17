import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Alert, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Login.css'; // File CSS tùy chỉnh

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (authService.isAuthenticated()) {
      // Nếu đã đăng nhập, điều hướng dựa vào vai trò
      const isAdmin = authService.isAdmin();
      navigate(isAdmin ? '/' : '/accounts');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await authService.login(username, password);
      
      // Sau khi đăng nhập thành công, kiểm tra vai trò và điều hướng phù hợp
      const isAdmin = authService.isAdmin();
      navigate(isAdmin ? '/' : '/accounts');
    } catch (error) {
      setError(error.error || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center min-vh-100">
      <Card className="login-card shadow-lg">
        <Card.Body className="p-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold text-primary">Đăng Nhập</h2>
            <p className="text-muted">Chào mừng bạn trở lại!</p>
          </div>

          {error && (
            <Alert variant="danger" className="fade-in">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="username">
              <Form.Label className="fw-semibold">Tên đăng nhập</Form.Label>
              <Form.Control
                type="text"
                placeholder="Nhập tên đăng nhập"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="form-control-modern"
                required
              />
            </Form.Group>

            <Form.Group className="mb-4" controlId="password">
              <Form.Label className="fw-semibold">Mật khẩu</Form.Label>
              <Form.Control
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control-modern"
                required
              />
            </Form.Group>

            <Button
              variant="primary"
              type="submit"
              className="w-100 btn-modern"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Đang xử lý...
                </>
              ) : (
                'Đăng Nhập'
              )}
            </Button>
          </Form>

          <div className="text-center mt-3">
            <a href="/forgot-password" className="text-decoration-none">
              Quên mật khẩu?
            </a>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;