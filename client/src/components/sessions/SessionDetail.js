import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Table, Badge, Nav } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSync } from 'react-icons/fa';
import { sessionApi, accountApi } from '../../services/api';
import Loader from '../common/Loader';
import Message from '../common/Message';

const SessionDetail = () => {
  const { accountId, sessionId } = useParams();
  const navigate = useNavigate();
  
  const [session, setSession] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('placed'); // 'placed' hoặc 'confirmed'
  
  // Lấy thông tin chi tiết phiên và tài khoản khi component mount
  useEffect(() => {
    fetchAccountDetails();
    fetchSessionDetails();
  }, [accountId, sessionId]);
  
  // Lấy thông tin chi tiết tài khoản
  const fetchAccountDetails = async () => {
    try {
      const response = await accountApi.getAccount(accountId);
      setAccount(response.data.data);
    } catch (error) {
      setError('Lỗi khi tải thông tin tài khoản');
    }
  };
  
  // Lấy thông tin chi tiết phiên livestream
  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      
      const response = await sessionApi.getSessionDetail(accountId, sessionId);
      
      if (response.data.success) {
        setSession(response.data.data);
      } else {
        setError('Lỗi khi tải thông tin phiên: ' + response.data.error);
      }
      
      setLoading(false);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        // Nếu cookies hết hạn
        if (error.response.data.code === -1) {
          setError('Cookies đã hết hạn. Vui lòng cập nhật cookies.');
        } else {
          setError(error.response.data.error);
        }
      } else {
        setError('Lỗi khi tải thông tin phiên');
      }
      setLoading(false);
    }
  };
  
  // Làm mới dữ liệu
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      await fetchSessionDetails();
      
      setRefreshing(false);
    } catch (error) {
      setError('Lỗi khi làm mới dữ liệu');
      setRefreshing(false);
    }
  };
  
  // Format số tiền VND
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };
  
  // Format thời gian
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString('vi-VN');
  };
  
  // Format phần trăm
  const formatPercent = (value) => {
    return (value * 100).toFixed(1) + '%';
  };
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Chi Tiết Phiên Live</h1>
        <div>
          <Button
            variant="success"
            className="me-2"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FaSync className={`me-1 ${refreshing ? 'fa-spin' : ''}`} />
            {refreshing ? 'Đang làm mới...' : 'Làm mới'}
          </Button>
          <Button 
            variant="secondary" 
            onClick={() => navigate(`/sessions/${accountId}`)}
            className="text-nowrap"
          >
            <FaArrowLeft className="me-1" /> Quay lại danh sách phiên
          </Button>
        </div>
      </div>
      
      {error && <Message variant="danger">{error}</Message>}
      
      {account && (
        <Card className="mb-4">
          <Card.Body>
            <div className="d-flex justify-content-between">
              <div>
                <h5>Thông tin tài khoản</h5>
                <p>
                  <strong>Tên Nick:</strong> {account.user.name}
                </p>
                <p>
                  <strong>ID:</strong> {account.user.id}
                </p>
              </div>
              <div>
                <p>
                  <strong>Trạng thái:</strong>{' '}
                  {account.cookie_expired ? (
                    <Badge bg="danger">Cookies hết hạn</Badge>
                  ) : (
                    <Badge bg="success">Cookies còn hạn</Badge>
                  )}
                </p>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}
      
      {loading ? (
        <Loader />
      ) : !session ? (
        <Message variant="info">
          Không tìm thấy thông tin phiên hoặc cookies đã hết hạn
        </Message>
      ) : (
        <>
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h4>{session.basic_info?.title || 'Không có tiêu đề'}</h4>
              <Nav variant="tabs" className="border-0">
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === 'placed'} 
                    onClick={() => setActiveTab('placed')}
                    className="border-0"
                  >
                    Đặt hàng thành công
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link 
                    active={activeTab === 'confirmed'} 
                    onClick={() => setActiveTab('confirmed')}
                    className="border-0"
                  >
                    Đơn hàng đã được xác nhận
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Header>
            <Card.Body>
              {/* Phần hiển thị doanh thu */}
              <div className="text-center mb-4 p-3" style={{ backgroundColor: '#f44336', color: 'white', borderRadius: '8px' }}>
                <h6 className="mb-2">Doanh thu (đ)</h6>
                <h2 className="display-4 fw-bold">
                  {activeTab === 'placed' 
                    ? formatCurrency(session.gmv || 0) 
                    : formatCurrency(session.confirmed_gmv || 0)}
                </h2>
              </div>
              
              {/* Các box thông tin */}
              <Row className="mb-4">
                <Col md={4}>
                  <div className="text-center p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <h6>Tổng lượt xem</h6>
                    <h3 className="fw-bold">{session.views || 0}</h3>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-center p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <h6>Bình luận</h6>
                    <h3 className="fw-bold">{session.comment_count || 0}</h3>
                    {/* <p className="text-muted">Trong 1 phút</p> */}
                  </div>
                </Col>
                <Col md={4}>
                  <div className="text-center p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                    <h6>Thêm vào giỏ hàng (1 phút)</h6>
                    <h3 className="fw-bold">{session.atcLastMinute || 0}</h3> 
                    <p className="text-muted">Trong 1 phút</p>
                  </div>
                </Col>
              </Row>
              
              {/* Bảng thống kê */}
              <Row>
                <Col md={6}>
                  <div className="d-flex justify-content-between mb-3 align-items-center">
                    <span>Thời lượng xem trung bình</span>
                    <span className="fw-bold">{session.formattedAvgViewTime || '00:00:00'}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3 align-items-center">
                    <span>Tổng lượt bình luận</span>
                    <span className="fw-bold">{session.comment_count || 0}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3 align-items-center">
                    <span>Tổng lượt thêm vào giỏ hàng</span>
                    <span className="fw-bold">{session.atc || 0}</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex justify-content-between mb-3 align-items-center">
                    <span>Tổng đơn hàng</span>
                    <span className="fw-bold">
                      {activeTab === 'placed' ? session.order_count || 0 : session.confirmed_order_count || 0}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-3 align-items-center">
                    <span>Giá trị đơn hàng trung bình</span>
                    <span className="fw-bold">
                      {activeTab === 'placed' 
                        ? formatCurrency(session.order_count ? session.gmv / session.order_count : 0) 
                        : formatCurrency(session.confirmed_order_count ? session.confirmed_gmv / session.confirmed_order_count : 0)}
                    </span>
                  </div>
                </Col>
              </Row>

              <hr className="my-4" />
              
              {/* Hàng cuối */}
              <Row>
                <Col md={3}>
                  <div className="d-flex flex-column mb-3">
                    <span className="text-muted">Lượt xem hiện tại</span>
                    <span className="fw-bold">{session.liveViewers || 0}</span>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="d-flex flex-column mb-3">
                    <span className="text-muted">PCU</span>
                    <span className="fw-bold">{session.pcu || 0}</span>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="d-flex flex-column mb-3">
                    <span className="text-muted">Tỷ lệ click vào sản phẩm</span>
                    <span className="fw-bold">{formatPercent(session.ctr || 0)}</span>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="d-flex flex-column mb-3">
                    <span className="text-muted">Tỷ lệ click để đặt hàng</span>
                    <span className="fw-bold">
                      {activeTab === 'placed' 
                        ? formatPercent(session.co || 0) 
                        : formatPercent(session.confirmedCo || 0)}
                    </span>
                  </div>
                </Col>
              </Row>
              <Row>
                <Col md={3}>
                  <div className="d-flex flex-column mb-3">
                    <span className="text-muted">Người mua</span>
                    <span className="fw-bold">
                      {activeTab === 'placed' ? session.buyers || 0 : session.confirmedBuyers || 0}
                    </span>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="d-flex flex-column mb-3">
                    <span className="text-muted">Các mặt hàng được bán</span>
                    <span className="fw-bold">
                      {activeTab === 'placed' ? session.placedItemsSold || 0 : session.confirmedItemsSold || 0}
                    </span>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
};

export default SessionDetail; 