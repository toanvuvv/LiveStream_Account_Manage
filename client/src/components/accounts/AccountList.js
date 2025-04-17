import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Badge, Row, Col, Form, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaExchangeAlt, FaCookieBite, FaCheckCircle } from 'react-icons/fa';
import { accountApi, groupApi } from '../../services/api';
import Loader from '../common/Loader';
import Message from '../common/Message';

const AccountList = () => {
  const [accounts, setAccounts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [showCookiesModal, setShowCookiesModal] = useState(false);
  const [accountToUpdateCookies, setAccountToUpdateCookies] = useState(null);
  const [newCookies, setNewCookies] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [accountToChangeGroup, setAccountToChangeGroup] = useState(null);
  const [newGroupId, setNewGroupId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [testingCookies, setTestingCookies] = useState(null);
  const [testResult, setTestResult] = useState(null);
  
  // Lấy danh sách tài khoản và nhóm khi component mount
  useEffect(() => {
    fetchAccounts();
    fetchGroups();
  }, [selectedGroupFilter]);
  
  // Lấy danh sách tài khoản từ API
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      
      const response = await accountApi.getAccounts(selectedGroupFilter);
      setAccounts(response.data.data);
      
      setLoading(false);
    } catch (error) {
      setError('Lỗi khi tải danh sách tài khoản');
      setLoading(false);
    }
  };
  
  // Lấy danh sách nhóm từ API
  const fetchGroups = async () => {
    try {
      const response = await groupApi.getGroups();
      setGroups(response.data.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };
  
  // Xử lý khi người dùng muốn xóa tài khoản
  const handleDeleteClick = (account) => {
    setAccountToDelete(account);
    setShowDeleteModal(true);
  };
  
  // Xử lý khi người dùng xác nhận xóa tài khoản
  const confirmDelete = async () => {
    try {
      setActionLoading(true);
      
      await accountApi.deleteAccount(accountToDelete._id);
      
      // Cập nhật danh sách tài khoản
      setAccounts(accounts.filter(account => account._id !== accountToDelete._id));
      
      setShowDeleteModal(false);
      setAccountToDelete(null);
      setActionLoading(false);
    } catch (error) {
      setError('Lỗi khi xóa tài khoản');
      setActionLoading(false);
    }
  };
  
  // Xử lý khi người dùng muốn cập nhật cookies
  const handleUpdateCookiesClick = (account) => {
    setAccountToUpdateCookies(account);
    setNewCookies('');
    setShowCookiesModal(true);
  };
  
  // Xử lý khi người dùng xác nhận cập nhật cookies
  const confirmUpdateCookies = async () => {
    if (!newCookies.trim()) {
      return;
    }
    
    try {
      setActionLoading(true);
      
      const response = await accountApi.updateCookies(accountToUpdateCookies._id, newCookies);
      
      // Cập nhật danh sách tài khoản
      setAccounts(accounts.map(account => 
        account._id === accountToUpdateCookies._id
          ? { ...account, cookie_expired: response.data.data.cookie_expired }
          : account
      ));
      
      setShowCookiesModal(false);
      setAccountToUpdateCookies(null);
      setNewCookies('');
      setActionLoading(false);
    } catch (error) {
      setError('Lỗi khi cập nhật cookies');
      setActionLoading(false);
    }
  };
  
  // Xử lý khi người dùng muốn đổi nhóm
  const handleChangeGroupClick = (account) => {
    setAccountToChangeGroup(account);
    setNewGroupId(account.group._id);
    setShowGroupModal(true);
  };
  
  // Xử lý khi người dùng xác nhận đổi nhóm
  const confirmChangeGroup = async () => {
    if (!newGroupId) {
      return;
    }
    
    try {
      setActionLoading(true);
      
      const response = await accountApi.changeGroup(accountToChangeGroup._id, newGroupId);
      
      // Cập nhật danh sách tài khoản
      await fetchAccounts(); // Fetch lại toàn bộ để đảm bảo dữ liệu mới nhất
      
      setShowGroupModal(false);
      setAccountToChangeGroup(null);
      setNewGroupId('');
      setActionLoading(false);
    } catch (error) {
      setError('Lỗi khi thay đổi nhóm');
      setActionLoading(false);
    }
  };
  
  // Xử lý khi người dùng muốn test cookies
  const handleTestCookies = async (account) => {
    try {
      setTestingCookies(account._id);
      setTestResult(null);
      
      const response = await accountApi.testCookies(account._id);
      
      // Cập nhật trạng thái cookie_expired trong danh sách tài khoản
      setAccounts(accounts.map(acc => 
        acc._id === account._id
          ? { ...acc, cookie_expired: response.data.data.cookie_expired }
          : acc
      ));
      
      setTestResult({
        accountId: account._id,
        valid: response.data.data.cookie_valid,
        message: response.data.message
      });
      
      setTestingCookies(null);
    } catch (error) {
      setError('Lỗi khi test cookies');
      setTestingCookies(null);
    }
  };
  
  // Hiển thị Badge trạng thái cookies
  const renderCookieStatus = (cookieExpired) => {
    return cookieExpired ? (
      <Badge bg="danger">Cookies hết hạn</Badge>
    ) : (
      <Badge bg="success">Cookies còn hạn</Badge>
    );
  };
  
  // Hiển thị kết quả test cookies
  const renderTestResult = (accountId) => {
    if (!testResult || testResult.accountId !== accountId) {
      return null;
    }
    
    return (
      <Badge bg={testResult.valid ? 'success' : 'danger'} className="ms-2">
        {testResult.message}
      </Badge>
    );
  };
  
  return (
    <div>
      <h1 className="mb-4">Danh Sách Nick</h1>
      
      {error && <Message variant="danger">{error}</Message>}
      
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Lọc theo nhóm</Form.Label>
                <Form.Select
                  value={selectedGroupFilter}
                  onChange={(e) => setSelectedGroupFilter(e.target.value)}
                >
                  <option value="">Tất cả nhóm</option>
                  {groups.map(group => (
                    <option key={group._id} value={group._id}>
                      {group.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6} className="d-flex align-items-end justify-content-end">
              <Link to="/accounts/add" className="btn btn-primary">
                Thêm Nick Mới
              </Link>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {loading ? (
        <Loader />
      ) : accounts.length === 0 ? (
        <Message variant="info">
          Không có tài khoản nào {selectedGroupFilter && 'trong nhóm này'}
        </Message>
      ) : (
        <Card>
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>ID</th>
                  <th>Tên Nick</th>
                  <th>Nhóm</th>
                  <th>Trạng Thái</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account, index) => (
                  <tr key={account._id}>
                    <td>{index + 1}</td>
                    <td>{account.user.id}</td>
                    <td>{account.user.name}</td>
                    <td>
                      {account.group?.name ? (
                        <Badge bg="primary">{account.group.name}</Badge>
                      ) : (
                        <Badge bg="secondary">Chưa phân nhóm</Badge>
                      )}
                    </td>
                    <td>
                      {renderCookieStatus(account.cookie_expired)}
                      {renderTestResult(account._id)}
                    </td>
                    <td>
                      <div className="d-flex">
                        <Link to={`/sessions/${account._id}`} className="btn btn-sm btn-info me-1">
                          Xem Phiên
                        </Link>
                        <Button
                          variant="warning"
                          size="sm"
                          className="me-1"
                          onClick={() => handleUpdateCookiesClick(account)}
                        >
                          <FaCookieBite />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="me-1"
                          onClick={() => handleChangeGroupClick(account)}
                        >
                          <FaExchangeAlt />
                        </Button>
                        <Button
                          variant="success"
                          size="sm"
                          className="me-1"
                          onClick={() => handleTestCookies(account)}
                          disabled={testingCookies === account._id}
                        >
                          <FaCheckCircle />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteClick(account)}
                        >
                          <FaTrash />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
      
      {/* Modal xác nhận xóa tài khoản */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận xóa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {accountToDelete && (
            <p>Bạn có chắc chắn muốn xóa nick "{accountToDelete.user.name}" không?</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Hủy
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            disabled={actionLoading}
          >
            {actionLoading ? 'Đang xóa...' : 'Xóa'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Modal cập nhật cookies */}
      <Modal show={showCookiesModal} onHide={() => setShowCookiesModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Cập nhật Cookies</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {accountToUpdateCookies && (
            <>
              <p>Cập nhật cookies cho nick "{accountToUpdateCookies.user.name}"</p>
              <Form.Group>
                <Form.Label>Cookies mới</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={newCookies}
                  onChange={(e) => setNewCookies(e.target.value)}
                  placeholder="Paste cookies mới vào đây"
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCookiesModal(false)}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={confirmUpdateCookies}
            disabled={actionLoading || !newCookies.trim()}
          >
            {actionLoading ? 'Đang cập nhật...' : 'Cập nhật'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Modal đổi nhóm */}
      <Modal show={showGroupModal} onHide={() => setShowGroupModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Chuyển Nhóm</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {accountToChangeGroup && (
            <>
              <p>Chuyển nick "{accountToChangeGroup.user.name}" sang nhóm khác</p>
              <Form.Group>
                <Form.Label>Chọn nhóm mới</Form.Label>
                <Form.Select
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(e.target.value)}
                >
                  {groups.map(group => (
                    <option
                      key={group._id}
                      value={group._id}
                      disabled={group._id === accountToChangeGroup.group?._id}
                    >
                      {group.name} {group._id === accountToChangeGroup.group?._id ? '(Hiện tại)' : ''}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowGroupModal(false)}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={confirmChangeGroup}
            disabled={actionLoading || !newGroupId || (accountToChangeGroup && newGroupId === accountToChangeGroup.group?._id)}
          >
            {actionLoading ? 'Đang chuyển...' : 'Chuyển Nhóm'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AccountList; 