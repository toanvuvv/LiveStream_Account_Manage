import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Form, Button, Table, Badge, ButtonGroup } from 'react-bootstrap';
import { FaCalendarAlt, FaFilter, FaSort, FaFileExcel } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { reportApi, groupApi,fetchStatusApi } from '../services/api'; // Giả sử fetchStatusApi được gộp vào reportApi
import Loader from './common/Loader';
import Message from './common/Message';

const Dashboard = () => {
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)));
  const [endDate, setEndDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [error, setError] = useState(null);
  const [groups, setGroups] = useState([]);
  const [channels, setChannels] = useState([]);
  const [reports, setReports] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('0');
  const [sort, setSort] = useState('commission:desc');
  const [threshold, setThreshold] = useState('');
  const [progressMessage, setProgressMessage] = useState('');
  const [completedAccounts, setCompletedAccounts] = useState(0);
  const [totalAccounts, setTotalAccounts] = useState(0);

  // Lấy danh sách nhóm và kênh khi component mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // Lấy danh sách nhóm
        const groupsResponse = await groupApi.getGroups();
        setGroups(groupsResponse.data.data);
        
        // Lấy danh sách kênh
        const channelsResponse = await reportApi.getChannels();
        setChannels(channelsResponse.data.data);
        
        setLoading(false);
      } catch (error) {
        setError('Lỗi khi tải dữ liệu ban đầu');
        setLoading(false);
        console.error('Error fetching initial data:', error);
      }
    };
    
    fetchInitialData();
  }, []);

  // Fetch báo cáo từ API
  const fetchReportsData = async () => {
    try {
      if (!window.confirm(
        `Bạn có chắc chắn muốn fetch dữ liệu mới cho khoảng thời gian từ ${format(startDate, 'dd/MM/yyyy')} đến ${format(endDate, 'dd/MM/yyyy')}?\n\nQuá trình này có thể mất vài phút và không nên bị gián đoạn.`
      )) {
        return;
      }

      setFetchingData(true);
      setError(null);
      setProgressMessage('Đang chuẩn bị fetch dữ liệu...');
      setCompletedAccounts(0);
      setTotalAccounts(0);

      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');

      const response = await reportApi.fetchReports(
        {
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          groupId: selectedGroup,
          channelId: selectedChannel,
        },
        (message) => {
          setProgressMessage(message);
        }
      );

      // Polling trạng thái fetch
      let isFetchCompleted = false;
      const maxChecks = 30;
      let checkCount = 0;

      while (!isFetchCompleted && checkCount < maxChecks) {
        const statusResponse = await fetchStatusApi.getFetchStatus({
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          groupId: selectedGroup,
          channelId: selectedChannel,
        });

        setCompletedAccounts(statusResponse.data.data.completedAccounts);
        setTotalAccounts(statusResponse.data.data.totalAccounts);
        setProgressMessage(
          `Đang xử lý tài khoản thứ ${statusResponse.data.data.completedAccounts}/${
            statusResponse.data.data.totalAccounts
          }`
        );

        if (statusResponse.data.data.isCompleted) {
          isFetchCompleted = true;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 5000)); // Kiểm tra mỗi 5 giây
          checkCount++;
        }
      }

      if (!isFetchCompleted) {
        throw new Error('Quá trình fetch không hoàn tất trong thời gian cho phép');
      }

      setProgressMessage('Đang tải dữ liệu từ cache...');
      await getReportsFromCache();

      if (response.data.data && response.data.data.errorCount > 0) {
        console.log(
          'Fetch errors:',
          response.data.data.errorCount,
          response.data.data.errors || 'No detailed errors'
        );
        setError(
          `Fetch hoàn tất với ${response.data.data.errorCount} lỗi. Vui lòng kiểm tra lại cookies của các tài khoản lỗi.`
        );
      } else {
        setError(null);
      }

      setFetchingData(false);
      setProgressMessage('');
      setCompletedAccounts(0);
      setTotalAccounts(0);
      alert(
        `Fetch dữ liệu hoàn tất! Đã xử lý ${response.data.data.totalAccounts} tài khoản.`
      );
    } catch (error) {
      console.error('Error fetching reports:', error);
      console.error('Error details:', {
        response: error.response?.data,
        status: error.response?.status,
        message: error.message,
        stack: error.stack,
      });

      const errorDetails =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message;
      setError(`Lỗi khi fetch dữ liệu: ${errorDetails}`);
      setFetchingData(false);
      setProgressMessage('');
      setCompletedAccounts(0);
      setTotalAccounts(0);
    }
  };

  // Lấy báo cáo từ cache
  const getReportsFromCache = async () => {
    try {
      if (fetchingData) {
        console.log('Đang fetch dữ liệu, bỏ qua getReportsFromCache');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      const response = await reportApi.getReports({
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        groupId: selectedGroup,
        channelId: selectedChannel,
        sort,
        threshold
      });
      
      setReports(response.data.data);
      setLoading(false);
    } catch (error) {
      setError('Lỗi khi lấy dữ liệu báo cáo từ cache');
      setLoading(false);
      console.error('Error getting reports from cache:', error);
    }
  };

  // Xử lý khi submit form
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Ngăn chặn gọi getReportsFromCache khi đang fetch dữ liệu mới
    if (fetchingData) {
      console.log('Đang fetch dữ liệu, vui lòng chờ...');
      setError('Đang fetch dữ liệu, vui lòng chờ quá trình hoàn tất');
      return;
    }
    
    getReportsFromCache();
  };

  // Xuất báo cáo ra Excel
  const handleExport = () => {
    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(endDate, 'yyyy-MM-dd');
    
    reportApi.exportReports({
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      groupId: selectedGroup,
      channelId: selectedChannel
    });
  };

  // Format số tiền VND
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('vi-VN').format(value);
  };

  // Format tỷ lệ phần trăm từ rate
  const formatRate = (rate) => {
    if (!rate) return '-';
    const percentage = parseFloat(rate) / 1000;
    return `${percentage.toFixed(2)}%`;
  };

  // Thêm hàm xử lý khi chọn thời gian nhanh
  const handleQuickDateSelection = (option) => {
    const today = new Date();
    let newStartDate = new Date();
    const newEndDate = new Date();
    
    switch(option) {
      case 'yesterday':
        newStartDate = new Date(today);
        newStartDate.setDate(today.getDate() - 1);
        newEndDate.setDate(today.getDate() - 1);
        break;
      case 'last7days':
        newStartDate = new Date(today);
        newStartDate.setDate(today.getDate() - 7);
        break;
      case 'last30days':
        newStartDate = new Date(today);
        newStartDate.setDate(today.getDate() - 30);
        break;
      default:
        return;
    }
    
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  return (
    <div>
      <h1 className="mb-4">Báo Cáo Hoa Hồng</h1>
      
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span className="fw-bold fs-5">Chọn Khoảng Thời Gian và Fetch Dữ Liệu</span>
          <ButtonGroup className="date-quick-select">
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={() => handleQuickDateSelection('yesterday')}
              className="fw-bold px-3 py-2 border-2"
            >
              Hôm qua
            </Button>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={() => handleQuickDateSelection('last7days')}
              className="fw-bold px-3 py-2 border-2"
            >
              7 ngày qua
            </Button>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={() => handleQuickDateSelection('last30days')}
              className="fw-bold px-3 py-2 border-2"
            >
              1 tháng qua
            </Button>
          </ButtonGroup>
        </Card.Header>
        <Card.Body>
          <style jsx>{`
            .date-quick-select .btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
              transition: all 0.2s ease;
            }
            .date-quick-select .btn {
              transition: all 0.2s ease;
            }
            .date-quick-select .btn:active {
              transform: translateY(0);
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
          `}</style>
          <Form onSubmit={handleSubmit}>
            <Row className="mb-3">
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Từ Ngày</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaCalendarAlt />
                    </span>
                    <DatePicker
                      selected={startDate}
                      onChange={date => setStartDate(date)}
                      selectsStart
                      startDate={startDate}
                      endDate={endDate}
                      className="form-control"
                      dateFormat="dd/MM/yyyy"
                    />
                  </div>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Đến Ngày</Form.Label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <FaCalendarAlt />
                    </span>
                    <DatePicker
                      selected={endDate}
                      onChange={date => setEndDate(date)}
                      selectsEnd
                      startDate={startDate}
                      endDate={endDate}
                      minDate={startDate}
                      className="form-control"
                      dateFormat="dd/MM/yyyy"
                    />
                  </div>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Nhóm</Form.Label>
                  <Form.Select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
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
              <Col md={3}>
                <Form.Group>
                  <Form.Label>Kênh</Form.Label>
                  <Form.Select
                    value={selectedChannel}
                    onChange={(e) => setSelectedChannel(e.target.value)}
                  >
                    {channels.map(channel => (
                      <option key={channel.id} value={channel.id}>
                        {channel.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row className="mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Sắp Xếp Theo</Form.Label>
                  <Form.Select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="commission:desc">Hoa Hồng (Cao → Thấp)</option>
                    <option value="commission:asc">Hoa Hồng (Thấp → Cao)</option>
                    <option value="revenue:desc">Doanh Thu (Cao → Thấp)</option>
                    <option value="revenue:asc">Doanh Thu (Thấp → Cao)</option>
                    <option value="orders:desc">Số Đơn (Cao → Thấp)</option>
                    <option value="orders:asc">Số Đơn (Thấp → Cao)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Lọc Nick Có Hoa Hồng Tối Thiểu</Form.Label>
                  <Form.Control
                    type="number"
                    placeholder="Nhập số tiền (VND)"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={4} className="d-flex align-items-end">
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="me-2"
                  disabled={fetchingData || loading}
                >
                  <FaFilter className="me-1" /> {loading ? 'Đang lọc...' : 'Lọc Dữ Liệu'}
                </Button>
                
                <Button 
                  variant="success" 
                  onClick={fetchReportsData} 
                  disabled={fetchingData || loading}
                >
                  {fetchingData ? 'Đang Fetch...' : 'Fetch Dữ Liệu Mới'}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
      
      {error && <Message variant="danger">{error}</Message>}
      
      {fetchingData && progressMessage && (
        <Card className="mb-3">
          <Card.Body>
            <h5 className="mb-3">Đang xử lý dữ liệu</h5>
            <p className="mb-2">{progressMessage}</p>
            <div className="progress">
              <div
                className="progress-bar progress-bar-striped progress-bar-animated"
                role="progressbar"
                style={{
                  width: totalAccounts > 0 ? `${(completedAccounts / totalAccounts) * 100}%` : '0%'
                }}
              >
                {totalAccounts > 0
                  ? `${completedAccounts}/${totalAccounts} (${Math.round((completedAccounts / totalAccounts) * 100)}%)`
                  : 'Đang khởi tạo...'}
              </div>
            </div>
            <p className="text-muted mt-2 small">
              Quá trình fetch có thể mất vài phút, tùy thuộc vào số lượng tài khoản và dữ liệu. 
              Vui lòng không tải lại trang hoặc đóng tab trong khi đang xử lý.
            </p>
          </Card.Body>
        </Card>
      )}
      
      {loading && (
        <Card className="mb-3">
          <Card.Body className="text-center">
            <Loader />
            <p className="mt-3">Đang tải dữ liệu báo cáo từ cache...</p>
          </Card.Body>
        </Card>
      )}
      
      {!loading && reports.length === 0 ? (
        <Message variant="info">Chưa có dữ liệu báo cáo. Vui lòng fetch dữ liệu hoặc chọn khoảng thời gian khác.</Message>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>
              Kết Quả ({reports.length} nick)
              <Badge bg="primary" className="ms-2">
                {format(startDate, 'dd/MM/yyyy')} - {format(endDate, 'dd/MM/yyyy')}
              </Badge>
            </h3>
            <Button 
              variant="success" 
              onClick={handleExport}
              disabled={fetchingData || loading}
            >
              <FaFileExcel className="me-1" /> Xuất Excel
            </Button>
          </div>
          
          <Card>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Tên Nick</th>
                    <th>Nhóm</th>
                    <th>MCN</th>
                    <th>Tỷ lệ MCN</th>
                    <th className="text-end">Hoa Hồng (VND)</th>
                    <th className="text-end">Doanh Thu (VND)</th>
                    <th className="text-center">Số Đơn</th>
                    <th>Trạng Thái</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report, index) => (
                    <tr key={report.accountId}>
                      <td>{index + 1}</td>
                      <td>{report.userName}</td>
                      <td>{report.group?.name || 'Chưa phân nhóm'}</td>
                      <td>{report.linked_mcn_name || '-'}</td>
                      <td>{formatRate(report.linked_mcn_commission_rate)}</td>
                      <td className="text-end fw-bold">
                        {formatCurrency(report.commission)}
                      </td>
                      <td className="text-end">
                        {formatCurrency(report.revenue)}
                      </td>
                      <td className="text-center">{report.orders}</td>
                      <td>
                        {report.cookieExpired ? (
                          <Badge bg="danger">Cookies hết hạn</Badge>
                        ) : (
                          <Badge bg="success">Hoạt động</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="fw-bold">
                    <td colSpan={5} className="text-end">Tổng cộng:</td>
                    <td className="text-end">
                      {formatCurrency(
                        reports.reduce((sum, report) => sum + report.commission, 0)
                      )}
                    </td>
                    <td className="text-end">
                      {formatCurrency(
                        reports.reduce((sum, report) => sum + report.revenue, 0)
                      )}
                    </td>
                    <td className="text-center">
                      {reports.reduce((sum, report) => sum + report.orders, 0)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </Table>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
}

export default Dashboard;