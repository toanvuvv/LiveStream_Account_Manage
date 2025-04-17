import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert } from 'react-bootstrap';
import axios from 'axios';
import authService from '../../services/authService';

const API_URL = process.env.REACT_APP_API_URL || '';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [selectedGroups, setSelectedGroups] = useState([]);
  
  // Hàm fetch dữ liệu
  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`);
      setUsers(response.data);
    } catch (error) {
      setError('Không thể tải danh sách người dùng');
      console.error('Fetch users error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/groups`);
      setGroups(response.data.data);
    } catch (error) {
      console.error('Fetch groups error:', error);
    }
  };
  
  // Load dữ liệu khi component được mount
  useEffect(() => {
    // Kiểm tra quyền admin
    if (!authService.isAdmin()) {
      setError('Bạn không có quyền truy cập trang này');
      setLoading(false);
      return;
    }
    
    fetchUsers();
    fetchGroups();
  }, []);
  
  // Reset form
  const resetForm = () => {
    setUsername('');
    setPassword('');
    setRole('user');
    setSelectedGroups([]);
    setCurrentUser(null);
  };
  
  // Mở modal thêm người dùng
  const handleShowAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };
  
  // Mở modal sửa người dùng
  const handleShowEditModal = (user) => {
    setCurrentUser(user);
    setUsername(user.username);
    setPassword(''); // Không hiển thị mật khẩu cũ
    setRole(user.role);
    setSelectedGroups(user.groupAccess.map(g => g._id));
    setShowEditModal(true);
  };
  
  // Xử lý thêm người dùng
  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    
    try {
      await axios.post(`${API_URL}/api/users`, {
        username,
        password,
        role,
        groupAccess: selectedGroups
      });
      
      fetchUsers();
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      setError(error.response?.data?.error || 'Lỗi khi tạo người dùng');
    }
  };
  
  // Xử lý cập nhật người dùng
  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (!username) {
      setError('Vui lòng nhập tên đăng nhập');
      return;
    }
    
    try {
      const updateData = {
        username,
        role,
        groupAccess: selectedGroups
      };
      
      // Chỉ gửi mật khẩu nếu đã nhập mật khẩu mới
      if (password) {
        updateData.password = password;
      }
      
      await axios.put(`${API_URL}/api/users/${currentUser._id}`, updateData);
      
      fetchUsers();
      setShowEditModal(false);
      resetForm();
    } catch (error) {
      setError(error.response?.data?.error || 'Lỗi khi cập nhật người dùng');
    }
  };
  
  // Xử lý xóa người dùng
  const handleDeleteUser = async (userId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      try {
        await axios.delete(`${API_URL}/api/users/${userId}`);
        fetchUsers();
      } catch (error) {
        setError(error.response?.data?.error || 'Lỗi khi xóa người dùng');
      }
    }
  };
  
  // Xử lý chọn nhóm
  const handleGroupSelect = (groupId) => {
    if (selectedGroups.includes(groupId)) {
      setSelectedGroups(selectedGroups.filter(g => g !== groupId));
    } else {
      setSelectedGroups([...selectedGroups, groupId]);
    }
  };
  
  if (loading) {
    return <div className="text-center mt-5">Đang tải...</div>;
  }
  
  if (error && !authService.isAdmin()) {
    return <Alert variant="danger" className="mt-4">{error}</Alert>;
  }
  
  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Quản lý người dùng</h2>
        <Button variant="success" onClick={handleShowAddModal}>
          Thêm người dùng
        </Button>
      </div>
      
      {error && <Alert variant="danger" className="mb-4">{error}</Alert>}
      
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Tên đăng nhập</th>
            <th>Vai trò</th>
            <th>Nhóm truy cập</th>
            <th>Tạo bởi</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td>{user.username}</td>
              <td>{user.role === 'admin' ? 'Admin' : 'Người dùng'}</td>
              <td>
                {user.groupAccess.map(group => group.name).join(', ')}
              </td>
              <td>{user.createdBy?.username || 'N/A'}</td>
              <td>
                <Button 
                  variant="primary" 
                  size="sm" 
                  className="me-2"
                  onClick={() => handleShowEditModal(user)}
                >
                  Sửa
                </Button>
                <Button 
                  variant="danger" 
                  size="sm"
                  onClick={() => handleDeleteUser(user._id)}
                >
                  Xóa
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      
      {/* Modal thêm người dùng */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Thêm người dùng mới</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddUser}>
            <Form.Group className="mb-3">
              <Form.Label>Tên đăng nhập</Form.Label>
              <Form.Control 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Mật khẩu</Form.Label>
              <Form.Control 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Vai trò</Form.Label>
              <Form.Select 
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                <option value="user">Người dùng</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Nhóm truy cập</Form.Label>
              <div className="border rounded p-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {groups.map(group => (
                  <Form.Check 
                    type="checkbox"
                    key={group._id}
                    id={`add-group-${group._id}`}
                    label={group.name}
                    checked={selectedGroups.includes(group._id)}
                    onChange={() => handleGroupSelect(group._id)}
                  />
                ))}
              </div>
            </Form.Group>
            
            <div className="d-flex justify-content-end mt-4">
              <Button variant="secondary" className="me-2" onClick={() => setShowAddModal(false)}>
                Hủy
              </Button>
              <Button variant="primary" type="submit">
                Thêm
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
      
      {/* Modal sửa người dùng */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Sửa người dùng</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateUser}>
            <Form.Group className="mb-3">
              <Form.Label>Tên đăng nhập</Form.Label>
              <Form.Control 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Mật khẩu mới (để trống nếu không đổi)</Form.Label>
              <Form.Control 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Vai trò</Form.Label>
              <Form.Select 
                value={role}
                onChange={e => setRole(e.target.value)}
              >
                <option value="user">Người dùng</option>
                <option value="admin">Admin</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Nhóm truy cập</Form.Label>
              <div className="border rounded p-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {groups.map(group => (
                  <Form.Check 
                    type="checkbox"
                    key={group._id}
                    id={`edit-group-${group._id}`}
                    label={group.name}
                    checked={selectedGroups.includes(group._id)}
                    onChange={() => handleGroupSelect(group._id)}
                  />
                ))}
              </div>
            </Form.Group>
            
            <div className="d-flex justify-content-end mt-4">
              <Button variant="secondary" className="me-2" onClick={() => setShowEditModal(false)}>
                Hủy
              </Button>
              <Button variant="primary" type="submit">
                Cập nhật
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default UserManagement;