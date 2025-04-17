import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { accountApi, groupApi } from '../../services/api';
import Message from '../common/Message';
import Loader from '../common/Loader';

const AddAccount = () => {
  const [jsonData, setJsonData] = useState('');
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Modal để tạo nhóm mới
  const [showModal, setShowModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  
  const navigate = useNavigate();
  
  // Lấy danh sách nhóm khi component mount
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const response = await groupApi.getGroups();
        setGroups(response.data.data);
        
        // Nếu có nhóm, tự động chọn nhóm đầu tiên
        if (response.data.data.length > 0) {
          setGroupId(response.data.data[0]._id);
        }
        
        setLoading(false);
      } catch (error) {
        setError('Lỗi khi tải danh sách nhóm');
        setLoading(false);
      }
    };
    
    fetchGroups();
  }, []);
  
  // Xử lý khi submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate input
    if (!jsonData.trim()) {
      setError('Vui lòng nhập dữ liệu JSON');
      return;
    }
    
    if (!groupId) {
      setError('Vui lòng chọn nhóm');
      return;
    }
    
    try {
      // Parse JSON data
      const parsedData = JSON.parse(jsonData);
      
      // Kiểm tra dữ liệu JSON có đúng định dạng không
      if (!parsedData.user || !parsedData.cookies) {
        setError('Dữ liệu JSON không hợp lệ. Vui lòng kiểm tra lại.');
        return;
      }
      
      // Kiểm tra các trường bắt buộc trong user
      if (!parsedData.user.id || !parsedData.user.name) {
        setError('Dữ liệu user phải có ít nhất id và name. Vui lòng kiểm tra lại.');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      // Gọi API để thêm tài khoản
      const response = await accountApi.addAccount({
        user: parsedData.user,
        cookies: parsedData.cookies,
        groupId
      });
      
      setSuccess(true);
      setJsonData('');
      setLoading(false);
      
      // Sau 2 giây, chuyển hướng đến trang danh sách tài khoản
      setTimeout(() => {
        navigate('/accounts');
      }, 2000);
      
    } catch (error) {
      if (error.name === 'SyntaxError') {
        setError('JSON không hợp lệ. Vui lòng kiểm tra lại định dạng.');
      } else if (error.response && error.response.data) {
        // Nếu tài khoản đã tồn tại, hiển thị thông báo
        if (error.response.status === 400 && error.response.data.error.includes('đã tồn tại')) {
          setError('Tài khoản đã tồn tại. Vui lòng kiểm tra lại hoặc cập nhật cookies cho tài khoản này.');
        } else {
          setError(error.response.data.error || 'Lỗi khi thêm tài khoản');
        }
      } else {
        setError('Lỗi không xác định khi thêm tài khoản');
      }
      setLoading(false);
    }
  };
  
  // Xử lý tạo nhóm mới
  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      return;
    }
    
    try {
      setCreatingGroup(true);
      
      const response = await groupApi.createGroup({
        name: newGroupName,
        description: newGroupDescription
      });
      
      // Thêm nhóm mới vào danh sách và chọn nhóm đó
      setGroups([...groups, response.data.data]);
      setGroupId(response.data.data._id);
      
      // Đóng modal và reset form
      setShowModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setCreatingGroup(false);
      
    } catch (error) {
      setError('Lỗi khi tạo nhóm mới');
      setCreatingGroup(false);
    }
  };
  
  return (
    <div>
      <h1 className="mb-4">Thêm Nick Mới</h1>
      
      {error && <Message variant="danger">{error}</Message>}
      {success && <Message variant="success">Thêm nick thành công!</Message>}
      
      {loading ? (
        <Loader />
      ) : (
        <Card>
          <Card.Header>Thêm Tài Khoản Mới</Card.Header>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Paste dữ liệu JSON từ extension</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={8}
                  value={jsonData}
                  onChange={(e) => setJsonData(e.target.value)}
                  placeholder='{"user": {"id": 1290090822, "uid": "0-1290090822", "name": "duongspee228", "type": "seller", "avatar": "...", "avatar_hash": "...", "locale": "vi-VN", "shop_id": 1234567, "country": "VN", "status": "normal", "is_seller": false}, "cookies": "SPC_F=..."}'
                />
                <Form.Text className="text-muted">
                  Đảm bảo dữ liệu JSON có đúng cấu trúc với các trường bắt buộc: user.id, user.name và cookies
                </Form.Text>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Chọn Nhóm</Form.Label>
                <Row>
                  <Col md={9}>
                    <Form.Select
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      disabled={groups.length === 0}
                    >
                      {groups.length === 0 ? (
                        <option value="">Không có nhóm nào</option>
                      ) : (
                        groups.map(group => (
                          <option key={group._id} value={group._id}>
                            {group.name}
                          </option>
                        ))
                      )}
                    </Form.Select>
                  </Col>
                  <Col md={3}>
                    <Button
                      variant="outline-primary"
                      onClick={() => setShowModal(true)}
                      className="w-100"
                    >
                      Tạo Nhóm Mới
                    </Button>
                  </Col>
                </Row>
              </Form.Group>
              
              <Button type="submit" variant="primary" disabled={loading}>
                Thêm Nick
              </Button>
            </Form>
          </Card.Body>
        </Card>
      )}
      
      {/* Modal tạo nhóm mới */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
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
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateGroup}
            disabled={!newGroupName.trim() || creatingGroup}
          >
            {creatingGroup ? 'Đang Tạo...' : 'Tạo Nhóm'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AddAccount; 