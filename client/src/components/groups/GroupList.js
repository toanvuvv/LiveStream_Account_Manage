import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Badge, Row, Col, Form, Modal } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FaEdit, FaTrash, FaUserFriends } from 'react-icons/fa';
import { groupApi, accountApi } from '../../services/api';
import Loader from '../common/Loader';
import Message from '../common/Message';

const GroupList = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [accountCounts, setAccountCounts] = useState({});
  
  // Lấy danh sách nhóm khi component mount
  useEffect(() => {
    fetchGroups();
  }, []);
  
  // Lấy danh sách nhóm từ API
  const fetchGroups = async () => {
    try {
      setLoading(true);
      
      const response = await groupApi.getGroups();
      setGroups(response.data.data);
      
      // Lấy số lượng tài khoản của mỗi nhóm
      await fetchAccountCounts(response.data.data);
      
      setLoading(false);
    } catch (error) {
      setError('Lỗi khi tải danh sách nhóm');
      setLoading(false);
    }
  };
  
  // Lấy số lượng tài khoản cho mỗi nhóm
  const fetchAccountCounts = async (groupList) => {
    try {
      const counts = {};
      
      for (const group of groupList) {
        const response = await groupApi.getGroupAccounts(group._id);
        counts[group._id] = response.data.count;
      }
      
      setAccountCounts(counts);
    } catch (error) {
      console.error('Error fetching account counts:', error);
    }
  };
  
  // Xử lý khi người dùng muốn xóa nhóm
  const handleDeleteClick = (group) => {
    setGroupToDelete(group);
    setShowDeleteModal(true);
  };
  
  // Xử lý khi người dùng xác nhận xóa nhóm
  const confirmDelete = async () => {
    try {
      setActionLoading(true);
      
      // Kiểm tra xem nhóm có tài khoản không
      if (accountCounts[groupToDelete._id] > 0) {
        setError('Không thể xóa nhóm khi có tài khoản trong nhóm');
        setActionLoading(false);
        setShowDeleteModal(false);
        return;
      }
      
      await groupApi.deleteGroup(groupToDelete._id);
      
      // Cập nhật danh sách nhóm
      setGroups(groups.filter(group => group._id !== groupToDelete._id));
      
      setShowDeleteModal(false);
      setGroupToDelete(null);
      setActionLoading(false);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Lỗi khi xóa nhóm');
      }
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };
  
  // Xử lý khi người dùng muốn thêm nhóm mới
  const handleAddClick = () => {
    setNewGroupName('');
    setNewGroupDescription('');
    setShowAddModal(true);
  };
  
  // Xử lý khi người dùng xác nhận thêm nhóm mới
  const confirmAdd = async () => {
    if (!newGroupName.trim()) {
      return;
    }
    
    try {
      setActionLoading(true);
      
      const response = await groupApi.createGroup({
        name: newGroupName,
        description: newGroupDescription
      });
      
      // Cập nhật danh sách nhóm
      setGroups([...groups, response.data.data]);
      setAccountCounts({
        ...accountCounts,
        [response.data.data._id]: 0
      });
      
      setShowAddModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setActionLoading(false);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Lỗi khi thêm nhóm');
      }
      setActionLoading(false);
    }
  };
  
  // Xử lý khi người dùng muốn sửa nhóm
  const handleEditClick = (group) => {
    setGroupToEdit(group);
    setNewGroupName(group.name);
    setNewGroupDescription(group.description || '');
    setShowEditModal(true);
  };
  
  // Xử lý khi người dùng xác nhận sửa nhóm
  const confirmEdit = async () => {
    if (!newGroupName.trim()) {
      return;
    }
    
    try {
      setActionLoading(true);
      
      const response = await groupApi.updateGroup(groupToEdit._id, {
        name: newGroupName,
        description: newGroupDescription
      });
      
      // Cập nhật danh sách nhóm
      setGroups(groups.map(group => 
        group._id === groupToEdit._id ? response.data.data : group
      ));
      
      setShowEditModal(false);
      setGroupToEdit(null);
      setNewGroupName('');
      setNewGroupDescription('');
      setActionLoading(false);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        setError(error.response.data.error);
      } else {
        setError('Lỗi khi sửa nhóm');
      }
      setActionLoading(false);
    }
  };
  
  return (
    <div>
      <h1 className="mb-4">Quản Lý Nhóm</h1>
      
      {error && <Message variant="danger">{error}</Message>}
      
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col className="d-flex justify-content-end">
              <Button variant="primary" onClick={handleAddClick}>
                Tạo Nhóm Mới
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
      
      {loading ? (
        <Loader />
      ) : groups.length === 0 ? (
        <Message variant="info">
          Chưa có nhóm nào. Hãy tạo nhóm mới.
        </Message>
      ) : (
        <Card>
          <Card.Body>
            <Table responsive hover>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên Nhóm</th>
                  <th>Mô Tả</th>
                  <th>Số Nick</th>
                  <th>Ngày Tạo</th>
                  <th>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group, index) => (
                  <tr key={group._id}>
                    <td>{index + 1}</td>
                    <td>{group.name}</td>
                    <td>{group.description || '-'}</td>
                    <td>
                      <Badge bg="info">
                        {accountCounts[group._id] || 0} nick
                      </Badge>
                    </td>
                    <td>
                      {new Date(group.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td>
                      <div className="d-flex">
                        {accountCounts[group._id] > 0 && (
                          <Link
                            to={`/accounts?groupId=${group._id}`}
                            className="btn btn-sm btn-info me-1"
                          >
                            <FaUserFriends />
                          </Link>
                        )}
                        <Button
                          variant="warning"
                          size="sm"
                          className="me-1"
                          onClick={() => handleEditClick(group)}
                        >
                          <FaEdit />
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteClick(group)}
                          disabled={accountCounts[group._id] > 0}
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
      
      {/* Modal xác nhận xóa nhóm */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Xác nhận xóa</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {groupToDelete && (
            <p>Bạn có chắc chắn muốn xóa nhóm "{groupToDelete.name}" không?</p>
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
      
      {/* Modal thêm nhóm mới */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Tạo Nhóm Mới</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Tên Nhóm</Form.Label>
            <Form.Control
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nhập tên nhóm"
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Mô Tả (tùy chọn)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              placeholder="Nhập mô tả nhóm"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={confirmAdd}
            disabled={actionLoading || !newGroupName.trim()}
          >
            {actionLoading ? 'Đang tạo...' : 'Tạo Nhóm'}
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Modal sửa nhóm */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Sửa Nhóm</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {groupToEdit && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Tên Nhóm</Form.Label>
                <Form.Control
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Nhập tên nhóm"
                />
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Mô Tả (tùy chọn)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="Nhập mô tả nhóm"
                />
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={confirmEdit}
            disabled={actionLoading || !newGroupName.trim()}
          >
            {actionLoading ? 'Đang cập nhật...' : 'Cập Nhật'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default GroupList; 