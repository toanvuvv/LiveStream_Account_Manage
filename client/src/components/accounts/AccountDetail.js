import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Row, Col, Button, ListGroup, Badge, Spinner } from 'react-bootstrap';
import axios from 'axios';

const AccountDetail = () => {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAccountDetail = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/accounts/${id}`);
        setAccount(response.data);
      } catch (err) {
        setError('Không thể tải thông tin tài khoản. Vui lòng thử lại sau.');
        console.error('Error fetching account:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAccountDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </Spinner>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }

  if (!account) {
    return (
      <div className="alert alert-warning" role="alert">
        Không tìm thấy tài khoản với ID: {id}
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Chi Tiết Tài Khoản</h2>
      <Card className="mb-4">
        <Card.Header as="h5" className="d-flex justify-content-between align-items-center">
          <div>{account.username}</div>
          <Badge bg={account.status === 'active' ? 'success' : 'danger'}>
            {account.status === 'active' ? 'Đang hoạt động' : 'Bị khóa'}
          </Badge>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>ID:</strong> {account._id}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Tên tài khoản:</strong> {account.username}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Mật khẩu:</strong> {account.password}
                </ListGroup.Item>
              </ListGroup>
            </Col>
            <Col md={6}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Nhóm:</strong> {account.group?.name || 'Chưa phân loại'}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Ngày tạo:</strong> {new Date(account.createdAt).toLocaleDateString('vi-VN')}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Ngày cập nhật:</strong> {new Date(account.updatedAt).toLocaleDateString('vi-VN')}
                </ListGroup.Item>
              </ListGroup>
            </Col>
          </Row>
          <div className="mt-4">
            <h5>Ghi chú</h5>
            <p>{account.notes || 'Không có ghi chú'}</p>
          </div>
        </Card.Body>
      </Card>

      <div className="d-flex gap-2 mb-4">
        <Link to={`/sessions/${account._id}`}>
          <Button variant="primary">Xem Lịch Sử Đăng Nhập</Button>
        </Link>
        <Link to={`/accounts`}>
          <Button variant="secondary">Quay Lại Danh Sách</Button>
        </Link>
      </div>
    </div>
  );
};

export default AccountDetail; 