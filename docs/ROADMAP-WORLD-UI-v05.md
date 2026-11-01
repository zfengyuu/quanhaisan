# Quán Hải Sản – Kế hoạch nâng cấp gameplay & UI (v0.5)

**Trạng thái:** Approved scope / implementation backlog. **Không phải toàn bộ tính năng đã hoàn thành.**
**Nguồn tham khảo:** ảnh chụp màn hình do chủ dự án cung cấp. Chỉ tham khảo UX và nguyên lý kỹ thuật; thiết kế, mã và artwork sẽ là tài sản riêng của Quán Hải Sản.
**Ưu tiên:** mobile-first 390px, PWA và Safari iOS, game xu ảo; QR donate tĩnh của chủ game không liên kết kinh tế.

## Nguyên tắc thiết kế
- **Bản đồ không bị đóng băng:** nền kiến trúc/tiles riêng, bàn/ghế/bếp/khách là object độc lập; depth theo chân nhân vật. Không vẽ NPC vào ảnh nền.
- **Một hệ tọa độ gốc:** Phaser scene 941×1088 cho bản v0.5; UI dùng HTML/CSS theo viewport, tránh chồng chữ lên bảng biển đã có trong background.
- **Không mở rộng chỉ bằng phóng to ảnh:** mỗi khu có tilemap, graph đường đi, vùng tương tác, object placement và save state. Ảnh nền cũ chỉ dùng làm tham chiếu hoặc fallback.
- **Một state có ý nghĩa:** khách, đơn gọi, thời gian chờ, bàn, bếp, kho, cảnh báo đều dựa trên trạng thái gameplay; không tạo cảnh báo/chuyện trò ngẫu nhiên không liên quan.
- **Không sao chép tài nguyên Ốc Đêm.** Asset mới được thiết kế và cấp phép rõ ràng.

## Lộ trình theo thứ tự (P0 = bắt buộc)
| Pha | Mức | Phạm vi | Điều kiện nghiệm thu |
|---|---|---|---|
| M0. Nền & chất lượng | P0 | Audit asset; chuẩn tọa độ, cache/PWA, log lỗi, test mobile | Không hình khối lỗi; 2 kích thước 390/768px hiển thị đúng; reload không mất save |
| M1. Dựng lại sân quán | P0 | Sàn/đường đi tile; sprite bàn và ghế độc lập; bố trí bàn; va chạm và z-index | Bàn đặt/thu hồi được, NPC không xuyên bàn, mở 2→5 bàn qua upgrade |
| M2. Hành vi khách | P0 | Khách đi vào/chọn bàn/ngồi/gọi món/ăn/trả tiền/rời; idle uống/ăn/nói/vui/bực | 3 khách đồng thời, không chiếm 1 ghế hai lần; animation nhẹ khi chờ |
| M3. Trò chuyện & cảnh báo | P0 | Bong bóng thoại contextual theo phase khách + nguồn tin ở quán; góc cảnh báo có badge, history, nút xử lý | Không che nút; popup tồn tại 2–4s, cảnh báo tồn tại đến khi được xử lý/hết điều kiện |
| M4. Khu vực & bếp | P1 | Chuyển cảnh: bến câu, sảnh quán, bếp, chợ, hiên; vị trí đặt bàn/bếp/đồ trang trí; số lò tăng theo cấp | Chuyển khu không mất trạng thái, mỗi khu có object riêng; nấu ăn dùng nguyên liệu/xu ảo |
| M5. Settings 8 mục | P1 | Lưu mã, Âm thanh, Đồ họa, Ngôn ngữ, Thông báo, Quán, Phiên bản, Mã quà | Tất cả tab có trạng thái rõ ràng; các setting triển khai phải tác động thật; tính năng chưa làm hiển thị “Sắp ra mắt” |
| M6. Độ sâu & polish | P2 | Chất lượng Cao/Vừa/Thấp; tự động giảm FX khi lag; hội thoại sự kiện, dọn bàn, cải tạo/đồ decor, animation môi trường | FPS mục tiêu 30–60 trên mobile; giảm FX, giảm chuyển động hoạt động; tình huống đa dạng |

## Thiết kế chi tiết

### A. Đổi khu / mở rộng
- Thanh chuyển khu: **Bến Câu · Quán · Bếp · Chợ · Hiên biển**. Khu bị khóa có tên và điều kiện mở (xu game/cốt truyện).
- Mỗi khu có **tile grid**, walkable mask, các vị trí đặt đồ, camera/view bounds và nhân vật spawn point.
- Quán có 2 bàn khởi đầu, mở đến 5; nâng cấp không che cửa ra vào và không phá đường đi; bàn ghế trông hợp góc 3/4, **không dùng hình chữ nhật placeholder**.
- Data model dự kiến: `AreaId`, `PlacedObject{id,kind,x,y,rotation,level}`, `Seat{id,tableId,offset}`; lưu vào save schema có `version` + migration.

### B. Khách & bàn/bếp
- State machine khách: `arriving → walking → seated → ordering → waiting → eating → paying → leaving`; nhánh `impatient → leaving` nếu quá hạn.
- Bàn: `free → reserved → occupied → dirty → free`; ghế đính vào bàn theo điểm neo, ngồi quay mặt vào món.
- Bếp: `idle → prepping → cooking → ready → served`; món có thời gian, bếp có slot và nâng cấp, không giả lập thanh nấu ăn khi chưa có nguyên liệu.
- Khách nhún thở, nhìn trái/phải, nhấp nước, trò chuyện, ăn, hài lòng/bực theo animation state; có giảm chuyển động.

### C. Tám chuyện / phản hồi khách
- Các kiểu: **chào hỏi, khen món, phàn nàn hết hàng, chờ lâu, trò chuyện thời tiết, câu chuyện làng chài, rủ nhau gọi thêm**.
- Dữ liệu: `guestId`, `tableId`, `intent`, `lineKey`, `durationMs`, `priority`; thoại xuất hiện cạnh nhân vật, tránh lặp cùng câu liên tục.
- Thoại ngắn 1–2 câu; tập trung vui nhộn, đời thường miền biển; **không tự nhận game có AI hội thoại tự do**.
- Thoại là feedback của state thực (đang đợi, hết hàng, vừa phục vụ...), đồng bộ với nhật ký cảnh báo.

### D. Warning / Notification
- Badge chuông/tam giác trên HUD; màu theo severity: info / warning / urgent.
- Mẫu cảnh báo: **khách chờ lâu, khách bỏ về, hết cá, bếp xong món, bàn bẩn, thiếu ghế, quán quá tải, sự kiện cốt truyện**.
- Mỗi entry có `type`, `createdAt`, `severity`, `title`, `description`, `actionTarget`, `dismissed`.
- Chỉ hiển thị thông báo khi điều kiện thực xảy ra; ghim cảnh báo quan trọng, gộp trùng, tự hết khi giải quyết. Không xin quyền notification hệ điều hành cho tới khi có trường hợp sử dụng cụ thể và người dùng đồng ý.

### E. Settings (8 tab)
| Tab | v0.5 dự kiến |
|---|---|
| Lưu mã | Export/import save có xác nhận; localStorage demo, cloud Supabase giai đoạn sau |
| Âm thanh | Nhạc nền/FX riêng, mute/volume có hiệu lực ngay |
| Đồ họa | Tự động/Cao/Vừa/Thấp, giảm hiệu ứng, giữ cấu hình trên thiết bị |
| Ngôn ngữ | Tiếng Việt/English thông qua key i18n, dịch đầy đủ mới bật English |
| Thông báo | In-game feed bật/tắt; browser push chỉ sau opt-in |
| Quán | Tên quán, thống kê, đổi quán/mã save với xác nhận |
| Phiên bản | Version, ngày cập nhật, changelog, tình trạng PWA cache |
| Mã quà | UI nhập mã; kiểm tra mã duy nhất/khóa lặp **sau khi có backend an toàn**; chưa phát quà giả |

### F. Asset production
- Bộ tile sàn bến/cửa hàng/bếp có ít nhất 3 biến thể vết bẩn và góc chiếu sáng; mỗi vật thể gameplay phải tách alpha PNG/WebP.
- **Bàn gỗ**: mặt bàn/4 chân nhìn được góc 3/4; phiên bản bàn trống, món đặt lên, bàn bẩn; **ghế** có 4 hướng, bóng đúng phối cảnh.
- Bếp: 2 loại lò, nồi/chảo, khói, lửa, đồng hồ tiến độ; cảnh bếp riêng.
- Animation khách: down/left/right/up + idle + seated + eat + sip + react; mỗi hướng có metadata pivot, anchor, shadow.
- UI: khung thoại chibi, counter cảnh báo, tab settings, icon khu, loading và tooltip.

## Phân chia code đề xuất (sẽ thêm theo từng pha)
```
src/game/
  scenes/{HarborScene,RestaurantScene,KitchenScene,MarketScene}.ts
  entities/{Guest,Table,KitchenStation}.ts
  systems/{NavSystem,OrderSystem,GuestDialogueSystem,AlertSystem}.ts
  data/{areas,objects,recipes,dialogue}.ts
src/components/
  GameSettings.tsx
  NotificationCenter.tsx
  AreaSwitcher.tsx
src/lib/
  customerExperience.ts
  gamePreferences.ts
src/locales/{vi,en}.json
```

## Test & release gates
1. `npm test`, `npm run typecheck`, `npm run build`, kiểm tra Safari/WebKit mobile và Chrome.
2. Test bàn không chồng, 5 NPC không xuyên vật cản, đổi khu giữ state, lò cooking không mất món khi đổi khu.
3. Test thông báo đúng severity, chống duplicate; khách hết patience rời quán; save migration không phá data cũ.
4. Test PWA offline shell; thay asset cần version cache; local storage không mất tiền ảo.
5. Mỗi milestone là **commit riêng**, push `main`, kiểm tra HEAD GitHub rồi gửi commit để clone/pull.

## Hiện trạng / giới hạn
- MVP đang dùng **Next.js + Phaser + TypeScript** với `harbor-courtyard.webp` cho phần kiến trúc; đồ tương tác chỉ mới tách một phần. Cần thay thế asset trước khi có mở rộng thật.
- Supabase và đổi quán nhiều slot/chia sẻ cloud chưa hoàn chỉnh: không giả định backend đã hoạt động.
- Tham chiếu UI từ ảnh chụp chỉ để lập yêu cầu; không chép source/asset hoặc tên game khác.
