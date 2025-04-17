import json
import os

# Đường dẫn đến file JSON
file_path = r"C:\Users\toanvuvv\Desktop\LiveStream_Acc_Management\cache\reports\1873018\2025-04-14_2025-04-14.json"

# Kiểm tra file tồn tại
if not os.path.exists(file_path):
    print(f"File không tồn tại: {file_path}")
    exit(1)

# Đọc file JSON
try:
    with open(file_path, 'r', encoding='utf-8') as file:
        data = json.load(file)
except Exception as e:
    print(f"Lỗi khi đọc file: {str(e)}")
    exit(1)

# Biến lưu tổng affiliate_net_commission
total_affiliate_net_commission = 0

# Hàm đệ quy để tìm tất cả các giá trị affiliate_net_commission trong cấu trúc JSON
def find_affiliate_net_commission(obj):
    global total_affiliate_net_commission
    
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key == "affiliate_net_commission":
                try:
                    # Chuyển đổi sang số (có thể là float hoặc int tùy vào định dạng)
                    commission = float(value)
                    total_affiliate_net_commission += commission
                except (ValueError, TypeError):
                    print(f"Không thể chuyển đổi giá trị '{value}' sang số")
            elif isinstance(value, (dict, list)):
                find_affiliate_net_commission(value)
    elif isinstance(obj, list):
        for item in obj:
            find_affiliate_net_commission(item)

# Tìm tất cả affiliate_net_commission trong dữ liệu
find_affiliate_net_commission(data)

# In kết quả
print(f"Tổng affiliate_net_commission: {total_affiliate_net_commission}") 