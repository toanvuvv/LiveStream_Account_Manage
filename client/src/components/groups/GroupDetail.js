import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Row, Col, Button, ListGroup, Spinner, Table } from 'react-bootstrap';
import axios from 'axios';

const GroupDetail = () => {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGroupData = async () => {
      try {
        setLoading(true);
        
        // Fetch group details
        const groupResponse = await axios.get(`/api/groups/${id}`);
        setGroup(groupResponse.data);
        
        // Fetch accounts belonging to this group
        const accountsResponse = await axios.get(`/api/accounts?groupId=${id}`);
        setAccounts(accountsResponse.data);
      } catch (err) {
        setError('Không thể tải thông tin nhóm. Vui lòng thử lại sau.');
        console.error('Error fetching group data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupData();
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

  if (!group) {
    return (
      <div className="alert alert-warning" role="alert">
        Không tìm thấy nhóm với ID: {id}
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4">Chi Tiết Nhóm</h2>
      <Card className="mb-4">
        <Card.Header as="h5">
          <div>{group.name}</div>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={6}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>ID:</strong> {group._id}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Tên nhóm:</strong> {group.name}
                </ListGroup.Item>
              </ListGroup>
            </Col>
            <Col md={6}>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Số lượng tài khoản:</strong> {accounts.length}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Ngày tạo:</strong> {new Date(group.createdAt).toLocaleDateString('vi-VN')}
                </ListGroup.Item>
              </ListGroup>
            </Col>
          </Row>
          
          <div className="mt-4">
            <h5>Mô tả</h5>
            <p>{group.description || 'Không có mô tả'}</p>
          </div>
        </Card.Body>
      </Card>

      <h4 className="mb-3">Danh sách tài khoản trong nhóm</h4>
      {accounts.length === 0 ? (
        <div className="alert alert-info">
          Không có tài khoản nào trong nhóm này.
        </div>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Tên tài khoản</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr key={account._id}>
                <td>{account.username}</td>
                <td>
                  {account.status === 'active' ? (
                    <span className="text-success">Đang hoạt động</span>
                  ) : (
                    <span className="text-danger">Bị khóa</span>
                  )}
                </td>
                <td>{new Date(account.createdAt).toLocaleDateString('vi-VN')}</td>
                <td>
                  <Link to={`/accounts/${account._id}`}>
                    <Button variant="info" size="sm">Xem chi tiết</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <div className="mt-3">
        <Link to="/groups">
          <Button variant="secondary">Quay lại danh sách nhóm</Button>
        </Link>
      </div>
    </div>
  );
};

export default GroupDetail; 