import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Badge, Pagination } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FaEye, FaArrowLeft } from 'react-icons/fa';
import { sessionApi, accountApi } from '../../services/api';
import Loader from '../common/Loader';
import Message from '../common/Message';

const SessionList = () => {
  const { accountId } = useParams();
  const navigate = useNavigate();
  
  const [sessions, setSessions] = useState([]);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  
  // Lấy thông tin tài khoản và danh sách phiên khi component mount
  useEffect(() => {
    fetchAccountDetails();
    fetchSessions();
  }, [accountId, page, limit]);
  
  // Lấy thông tin chi tiết tài khoản
  const fetchAccountDetails = async () => {
    try {
      const response = await accountApi.getAccount(accountId);
      setAccount(response.data.data);
    } catch (error) {
      setError('Lỗi khi tải thông tin tài khoản');
    }
  };
  
  // Lấy danh sách phiên livestream
  const fetchSessions = async () => {
    try {
      setLoading(true);
      
      const response = await sessionApi.getAccountSessions(accountId, page, limit);
      
      if (response.data.success) {
        setSessions(response.data.data.sessions);
        setTotal(response.data.data.total);
      } else {
        setError('Lỗi khi tải danh sách phiên: ' + response.data.error);
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
        setError('Lỗi khi tải danh sách phiên');
      }
      setLoading(false);
    }
  };
  
  // Format số tiền VND
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '0';
    return new Intl.NumberFormat('vi-VN').format(value);
  };
  
  // Format thời gian
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString('vi-VN');
  };

  // Format thời lượng (từ milliseconds sang giờ:phút:giây)
  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    
    const totalSeconds = Math.floor(duration / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Kiểm tra trạng thái phiên livestream
  const getSessionStatus = (session) => {
    // Status = 2 là đã kết thúc, status khác 2 là đang diễn ra
    return session.status === 2 ? 'Đã kết thúc' : 'Đang diễn ra';
  };
  
  // Xử lý phân trang
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };
  
  // Render phân trang
  const renderPagination = () => {
    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) return null;
    
    const items = [];
    
    // Nút Previous
    items.push(
      <Pagination.Prev
        key="prev"
        onClick={() => handlePageChange(page - 1)}
        disabled={page === 1}
      />
    );
    
    // Hiển thị các trang
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || // Trang đầu
        i === totalPages || // Trang cuối
        (i >= page - 1 && i <= page + 1) // Trang hiện tại và 2 trang xung quanh
      ) {
        items.push(
          <Pagination.Item
            key={i}
            active={i === page}
            onClick={() => handlePageChange(i)}
          >
            {i}
          </Pagination.Item>
        );
      } else if (i === page - 2 || i === page + 2) {
        // Thêm dấu ... khi bỏ qua các trang
        items.push(<Pagination.Ellipsis key={`ellipsis-${i}`} />);
      }
    }
    
    // Nút Next
    items.push(
      <Pagination.Next
        key="next"
        onClick={() => handlePageChange(page + 1)}
        disabled={page === totalPages}
      />
    );
    
    return <Pagination>{items}</Pagination>;
  };
  
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Danh Sách Phiên Live</h1>
        <Button 
          variant="secondary" 
          onClick={() => navigate('/accounts')}
          className="text-nowrap"
        >
          <FaArrowLeft className="me-1" /> Quay lại danh sách Nick
        </Button>
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
                <p>
                  <strong>Nhóm:</strong> {account.group?.name || 'Chưa phân nhóm'}
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
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => navigate(`/accounts?id=${account._id}`)}
                >
                  Quản lý tài khoản
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}
      
      {loading ? (
        <Loader />
      ) : sessions.length === 0 ? (
        <Message variant="info">
          Không có phiên livestream nào hoặc cookies đã hết hạn
        </Message>
      ) : (
        <>
          <Card>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tiêu Đề</th>
                    <th>Trạng Thái</th>
                    <th>Thời Gian Bắt Đầu</th>
                    <th>Thời Lượng</th>
                    <th>Lượt Xem</th>
                    <th>Bỏ Giỏ</th>
                    <th>Đơn Hàng</th>
                    <th>Doanh Thu</th>
                    <th>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session, index) => (
                    <tr key={session.sessionId}>
                      <td>{(page - 1) * limit + index + 1}</td>
                      <td>{session.title || 'Không có tiêu đề'}</td>
                      <td>
                        {session.status === 2 ? (
                          <Badge bg="secondary">Đã kết thúc</Badge>
                        ) : (
                          <Badge bg="danger">Đang diễn ra</Badge>
                        )}
                      </td>
                      <td>{formatDate(session.startTime)}</td>
                      <td>{formatDuration(session.duration)}</td>
                      <td>{session.viewers || 0}</td>
                      <td>{session.atc || 0}</td>
                      <td>{session.confirmedOrders || 0}</td>
                      <td>{formatCurrency(session.confirmedSales || 0)} đ</td>
                      <td>
                        <Link
                          to={`/sessions/${accountId}/${session.sessionId}`}
                          className="btn btn-sm btn-info"
                        >
                          <FaEye className="me-1" /> Chi Tiết
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
          
          <div className="mt-3 d-flex justify-content-center">
            {renderPagination()}
          </div>
        </>
      )}
    </div>
  );
};

export default SessionList; 