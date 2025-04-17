FROM node:18 as build

WORKDIR /app

# Sao chép dependencies của server
COPY package*.json ./
RUN npm install

# Sao chép dependencies của client
COPY client/package*.json ./client/
RUN cd client && npm install

# Sao chép tất cả code
COPY . .

# Thiết lập biến môi trường cho React
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build React app
RUN cd client && npm run build

# Production image
FROM node:18-slim

WORKDIR /app

# Sao chép chỉ những thứ cần thiết từ giai đoạn build
COPY --from=build /app/package*.json ./
COPY --from=build /app/server ./server
COPY --from=build /app/client/build ./client/build
COPY --from=build /app/.env ./.env

# Tạo thư mục cache
RUN mkdir -p /app/cache/reports

# Cài đặt chỉ dependencies cho production
RUN npm ci --omit=dev

# Railway sẽ tự động expose port được chỉ định trong biến môi trường PORT
EXPOSE 5000

CMD ["npm", "start"] 