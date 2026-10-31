# Tạo repo GitHub và đẩy code

Kết nối GitHub trong ChatGPT hiện có quyền thao tác trong repo đã tồn tại, nhưng không cung cấp hành động tạo repo mới. Vì vậy **chưa có repo GitHub được tạo** cho dự án này.

## Cách nhanh nhất

1. Mở https://github.com/new, đặt tên `quanhaisan-web`, chọn **Private** hoặc **Public**, tạo repo **rỗng** (không thêm README/.gitignore/license).
2. Giải nén ZIP, mở terminal trong thư mục `quanhaisan-web`.
3. Dùng các lệnh dưới đây, thay `YOUR_GITHUB_USER` bằng tên tài khoản của bạn:

```bash
git init -b main
git add .
git commit -m "feat: Quán Hải Sản PWA MVP"
git remote add origin https://github.com/YOUR_GITHUB_USER/quanhaisan-web.git
git push -u origin main
```

Hoặc nếu có GitHub CLI đã đăng nhập (`gh auth login`):

```bash
gh repo create quanhaisan-web --private --source=. --remote=origin --push
```

Cách thứ hai tự tạo repo + push nếu thư mục đã là git repository và có commit. Hãy đổi `--private` thành `--public` nếu muốn công khai source.

**Không commit** `.env.local`, token Supabase dạng secret hoặc thông tin ngân hàng. Chỉ ảnh QR mà bạn chủ động muốn công khai mới được đặt vào `public/donate-qr.png`.
