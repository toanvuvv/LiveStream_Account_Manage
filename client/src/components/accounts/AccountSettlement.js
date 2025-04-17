import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, Table, Form, Spinner, Alert, ListGroup, Button } from 'react-bootstrap';
import { reportApi } from '../../services/api';

const AccountSettlement = () => {
  const { id } = useParams();
  const [periodMonths, setPeriodMonths] = useState(3);
  const [validPeriods, setValidPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Lấy danh sách các kỳ đối soát
  const getSettlementPeriods = (months) => {
    const periods = [];
    const today = new Date();

    for (let i = 0; i < months; i++) {
      const currentDate = new Date();
      currentDate.setMonth(today.getMonth() - i);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const lastDay = new Date(year, month, 0).getDate();

      // Kỳ 2 sẽ được thêm trước kỳ 1 để đảm bảo thứ tự thời gian đúng
      periods.push({
        key: `${year}-${month}-2`,
        name: `Tháng ${month}/${year} - Kỳ 2 (16-${lastDay})`,
        startDate: new Date(year, month - 1, 16),
        endDate: new Date(year, month - 1, lastDay, 23, 59, 59),
      });

      periods.push({
        key: `${year}-${month}-1`,
        name: `Tháng ${month}/${year} - Kỳ 1 (01-15)`,
        startDate: new Date(year, month - 1, 1),
        endDate: new Date(year, month - 1, 15, 23, 59, 59),
      });
    }
    return periods;
  };

  // Format date sang YYYY-MM-DD với múi giờ UTC
  const formatDate = (date) => {
    const d = new Date(date);
    const month = `${d.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${d.getUTCDate()}`.padStart(2, '0');
    return `${d.getUTCFullYear()}-${month}-${day}`;
  };

  // Chuyển date sang timestamp (giây)
  const toTimestamp = (date) => {
    return Math.floor(date.getTime() / 1000);
  };

  // Format số tiền (VND) - chia cho 1.000.000 để hiển thị đúng
  const formatCurrency = (amount) => {
    // Chia cho 1.000.000 trước khi format
    const adjustedAmount = (amount || 0) / 1000000;
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(adjustedAmount);
  };

  // Lấy dữ liệu và kiểm tra tất cả các kỳ sử dụng API mới
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Lấy danh sách các kỳ đối soát
        const periods = getSettlementPeriods(periodMonths);
        console.log('Tổng số kỳ cần kiểm tra:', periods.length);
        
        // Chuyển đổi định dạng để gửi lên server
        const periodsToSend = periods.map(period => ({
          key: period.key,
          name: period.name,
          startTimestamp: toTimestamp(period.startDate),
          endTimestamp: toTimestamp(period.endDate)
        }));
        
        // Gọi API mới để lấy chỉ các kỳ hợp lệ
        const response = await reportApi.fetchValidSettlementPeriods({
          accountId: id,
          periods: periodsToSend
        });
        
        if (response.data?.success) {
          console.log('Kết quả từ API:', response.data);
          
          // Sắp xếp các kỳ theo thứ tự thời gian (từ mới đến cũ)
          const sortedPeriods = [...response.data.data].sort((a, b) => {
            // Lấy năm, tháng và kỳ từ key
            const [yearA, monthA, periodA] = a.key.split('-').map(Number);
            const [yearB, monthB, periodB] = b.key.split('-').map(Number);
            
            if (yearA !== yearB) return yearB - yearA; // Năm mới nhất trước
            if (monthA !== monthB) return monthB - monthA; // Tháng mới nhất trước
            return periodB - periodA; // Kỳ mới nhất trước
          });
          
          setValidPeriods(sortedPeriods);
        } else {
          throw new Error(response.data?.error || 'Không thể lấy dữ liệu đối soát');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error in fetchAllData:', err);
        setError(err.message || 'Không thể tải dữ liệu đối soát');
        setLoading(false);
      }
    };
    
    fetchAllData();
  }, [periodMonths, id]);

  // Xử lý thay đổi số tháng
  const handlePeriodChange = (e) => {
    setPeriodMonths(parseInt(e.target.value));
    setValidPeriods([]);
  };

  // Tùy chọn thời gian
  const periodOptions = [
    { value: 3, label: '3 tháng gần đây' },
    { value: 6, label: '6 tháng gần đây' },
    { value: 12, label: '1 năm gần đây' },
    { value: 24, label: '2 năm gần đây' },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Đối Soát Hoa Hồng</h2>
        <div className="d-flex align-items-center gap-2">
          <Form.Group controlId="selectPeriod">
            <Form.Select value={periodMonths} onChange={handlePeriodChange} className="me-2">
              {periodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          <Link to={`/accounts`}>
            <Button variant="secondary">Quay Lại</Button>
          </Link>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </Spinner>
        </div>
      ) : (
        <Card className="mb-4">
          <Card.Header>
            <h5>Danh Sách Kỳ Đối Soát</h5>
          </Card.Header>
          <Card.Body>
            {validPeriods.length > 0 ? (
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Kỳ Đối Soát</th>
                    <th>Tổng Hoa Hồng Đủ Điều Kiện</th>
                    <th>Thuế TNCN (PIT)</th>
                    <th>Hoa Hồng Thanh Toán</th>
                    <th>Trạng Thái Đối Soát</th>
                    <th>Trạng Thái Thanh Toán</th>
                    <th>Thu Nhập Chi Tiết</th>
                  </tr>
                </thead>
                <tbody>
                  {validPeriods.map((period) => (
                    <tr key={period.key}>
                      <td>{period.name}</td>
                      <td>{formatCurrency(period.data.list[0].eligible_total_amount)}</td>
                      <td>
                        {period.data.list[0]?.bills?.length > 0 && period.data.list[0].bills[0]?.wht_amount !== undefined
                          ? formatCurrency(period.data.list[0].bills[0].wht_amount)
                          : 'N/A'}
                      </td>
                      <td>{formatCurrency(period.data.list[0].total_payment_amount)}</td>
                      <td>{getValidationStatus(period.data.list[0].overall_validation_status)}</td>
                      <td>{getPaymentStatus(period.data.list[0].payment_status)}</td>
                      <td>
                        <ListGroup>
                          <ListGroup.Item>
                            Mạng xã hội:{' '}
                            {formatCurrency(period.data.income_breakdown?.social_medias_commission || 0)}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            Livestream:{' '}
                            {formatCurrency(period.data.income_breakdown?.shopee_live_commission || 0)}
                          </ListGroup.Item>
                          <ListGroup.Item>
                            Shopee Video:{' '}
                            {formatCurrency(period.data.income_breakdown?.shopee_video_commission || 0)}
                          </ListGroup.Item>
                        </ListGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <Alert variant="info">
                Không có dữ liệu đối soát cho các kỳ đã chọn. Vui lòng kiểm tra lại khoảng thời gian hoặc dữ liệu tài khoản.
              </Alert>
            )}
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

// Helper functions
function getValidationStatus(status) {
  const statusMap = {
    0: 'Chưa đối soát',
    1: 'Đang đối soát',
    2: 'Đã từ chối',
    3: 'Đã đối soát'
  };
  
  // Thêm style để hiển thị màu sắc
  let badgeClass = '';
  if (status === 3) {
    badgeClass = 'bg-success';
  } else if (status === 1) {
    badgeClass = 'bg-warning text-dark';
  } else if (status === 2) {
    badgeClass = 'bg-danger';
  } else {
    badgeClass = 'bg-secondary';
  }
  
  return (
    <span className={`badge ${badgeClass} py-2 px-3 rounded-pill`}>
      {statusMap[status] || 'Không xác định'}
    </span>
  );
}

function getPaymentStatus(status) {
  const statusMap = {
    0: 'Chưa thanh toán',
    1: 'Đã xác nhận',
    2: 'Đang xử lý',
    3: 'Đã thanh toán',
    4: 'Đã thanh toán',
    5: 'Đã hủy',
    6: 'Đang chờ',
    7: 'Đang xử lý',
    8: 'Đang xử lý'
  };
  
  // Thêm style để hiển thị màu sắc
  let badgeClass = '';
  if (status === 3 || status === 4) {
    badgeClass = 'bg-success';
  } else if (status === 2 || status === 7 || status === 8) {
    badgeClass = 'bg-warning text-dark';
  } else if (status === 5) {
    badgeClass = 'bg-danger';
  } else if (status === 1 || status === 6) {
    badgeClass = 'bg-info';
  } else {
    badgeClass = 'bg-secondary';
  }
  
  return (
    <span className={`badge ${badgeClass} py-2 px-3 rounded-pill`}>
      {statusMap[status] || 'Không xác định'}
    </span>
  );
}

export default AccountSettlement;