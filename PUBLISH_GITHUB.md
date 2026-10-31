# Đưa Quán Hải Sản lên GitHub

Repo chưa được tạo tự động vì kết nối GitHub hiện tại không hỗ trợ thao tác tạo repository mới.

1. Đăng nhập GitHub, mở <https://github.com/new>.
2. Tạo một repo trống tên **quanhaisan-web**, chọn **Private** hoặc Public tùy bạn. **Đừng** chọn Initialize with README/.gitignore/license vì thư mục đã có Git history.
3. Giải nén ZIP này, mở Terminal trong thư mục `quanhaisan-web`.
4. Thực hiện:

```bash
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/YOUR_USERNAME/quanhaisan-web.git
git branch -M main
git push -u origin main
```

Thay `YOUR_USERNAME` bằng tên người dùng GitHub của bạn. GitHub có thể yêu cầu đăng nhập qua credential manager hoặc personal access token. Không gửi token cho bất kỳ ai.

Sau đó clone ở máy khác:

```bash
git clone https://github.com/YOUR_USERNAME/quanhaisan-web.git
cd quanhaisan-web
npm install
npm run dev
```

Mở http://localhost:3000. Nếu cần chạy ngay trước khi cài Node: `python3 -m http.server 8080`, mở http://localhost:8080/demo/.
