const axios = require('axios');

/**
 * Test API lấy dữ liệu chuyển đổi
 */
async function testConversionApi() {
  try {
    console.log('Bắt đầu test API conversion');
    
    // Thay thế bằng ID tài khoản thực tế và ngày bạn muốn test
    const testData = {
      accountId: '...',  // ID tài khoản cần test
      startDate: '2023-01-01',
      endDate: '2023-01-31'
    };
    
    console.log('Gửi request với dữ liệu:', testData);
    
    const response = await axios.post('http://localhost:5000/api/reports/conversion', testData);
    
    console.log('Status code:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('✅ Test thành công!');
    } else {
      console.log('❌ Test thất bại:', response.data.error);
    }
  } catch (error) {
    console.error('❌ Lỗi khi test API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Chạy test
testConversionApi(); 