import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Row, Col, ListGroup, Badge, Button, Modal, Form } from 'react-bootstrap';
import { FaArrowLeft, FaEdit, FaTrash, FaCookieBite, FaCheckCircle } from 'react-icons/fa';
import { accountApi } from '../../services/api';
import Loader from '../common/Loader';
import Message from '../common/Message';
import authService from '../../services/authService';

const AccountDetail = () => {
  const { id } = useParams();
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCookiesModal, setShowCookiesModal] = useState(false);
  const [testingCookies, setTestingCookies] = useState(false);
  const [testResult, setTestResult] = useState(null);

  // Lấy thông tin quyền admin
  const isAdmin = authService.isAdmin();

  useEffect(() => {
    const fetchAccountDetail = async () => {
      try {
        setLoading(true);
        const response = await accountApi.getAccountDetail(id);
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

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleUpdateCookiesClick = () => {
    setShowCookiesModal(true);
  };

  const handleTestCookies = async () => {
    try {
      setTestingCookies(true);
      const response = await accountApi.testCookies(id);
      setTestResult(response.data.message);
    } catch (err) {
      setTestResult('Test cookies thất bại');
    } finally {
      setTestingCookies(false);
    }
  };

  const renderTestResult = () => {
    if (testingCookies) {
      return <span className="ms-2">Đang test...</span>;
    }
    if (testResult) {
      return <span className="ms-2">{testResult}</span>;
    }
    return null;
  };

  return (
    <div>
      <Link to="/accounts" className="btn btn-light my-3">
        <FaArrowLeft /> Quay lại
      </Link>
      
      {error && <Message variant="danger">{error}</Message>}
      
      {loading ? (
        <Loader />
      ) : !account ? (
        <Message variant="danger">Không tìm thấy tài khoản</Message>
      ) : (
        <>
          <Card className="mb-4">
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h3>Chi tiết Nick</h3>
                {isAdmin && (
                  <div>
                    <Button
                      variant="warning"
                      className="me-2"
                      onClick={() => handleUpdateCookiesClick()}
                    >
                      <FaCookieBite /> Cập nhật Cookies
                    </Button>
                    <Button
                      variant="success"
                      className="me-2"
                      onClick={() => handleTestCookies()}
                      disabled={testingCookies}
                    >
                      <FaCheckCircle /> Test Cookies
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteClick()}
                    >
                      <FaTrash /> Xóa Nick
                    </Button>
                  </div>
                )}
              </div>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <ListGroup variant="flush">
                    <ListGroup.Item>
                      <strong>ID:</strong> {account.user.id}
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <strong>Tên:</strong> {account.user.name}
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <strong>Nhóm:</strong> {account.group?.name || 'Chưa phân nhóm'}
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
                <Col md={6}>
                  <ListGroup variant="flush">
                    <ListGroup.Item>
                      <strong>Trạng thái Cookies:</strong>{' '}
                      {account.cookie_expired ? (
                        <Badge bg="danger">Cookies hết hạn</Badge>
                      ) : (
                        <Badge bg="success">Cookies còn hạn</Badge>
                      )}
                      {renderTestResult()}
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <strong>Ngày tạo:</strong> {new Date(account.createdAt).toLocaleDateString()}
                    </ListGroup.Item>
                    <ListGroup.Item>
                      <strong>Cập nhật cuối:</strong> {new Date(account.updatedAt).toLocaleDateString()}
                    </ListGroup.Item>
                  </ListGroup>
                </Col>
              </Row>
            </Card.Body>
          </Card>
          
          <div className="mb-4">
            <Link to={`/sessions/${account._id}`} className="btn btn-info me-2">
              Xem Phiên
            </Link>
            {isAdmin && (
              <Link to={`/accounts/${account._id}/settlement`} className="btn btn-primary">
                Đối Soát
              </Link>
            )}
          </div>
          
          {/* Modals only shown to admin */}
          {isAdmin && (
            <>
              {/* Modal xác nhận xóa tài khoản */}
              <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                  <Modal.Title>Xác nhận xóa</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <p>Bạn có chắc chắn muốn xóa nick "{account.user.name}" không?</p>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                    Hủy
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => {
                      // Xử lý xóa tài khoản
                      setShowDeleteModal(false);
                    }}
                  >
                    Xóa
                  </Button>
                </Modal.Footer>
              </Modal>
              
              {/* Modal cập nhật cookies */}
              <Modal show={showCookiesModal} onHide={() => setShowCookiesModal(false)}>
                <Modal.Header closeButton>
                  <Modal.Title>Cập nhật Cookies</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <Form.Group>
                    <Form.Label>Cookies mới</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      placeholder="Paste cookies mới vào đây"
                    />
                  </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={() => setShowCookiesModal(false)}>
                    Hủy
                  </Button>
                  <Button variant="primary">
                    Cập nhật
                  </Button>
                </Modal.Footer>
              </Modal>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default AccountDetail;