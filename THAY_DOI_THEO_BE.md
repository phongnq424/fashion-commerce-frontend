# Chỉnh FE theo Backend (hướng sàn nhiều shop)

Đối chiếu với `fashion-commerce-backend` (commit `2caa0ff`). BE là **sàn thương mại điện tử nhiều shop**: ai cũng mở được shop (đăng ký → sàn duyệt), sàn thu phí từ shop, một đơn tách theo từng shop. FE được chỉnh lại cho khớp và **không còn dữ liệu giả** ở các luồng mà BE đã có API.

## 3 khu vực của web

| Đường dẫn | Ai dùng | Đăng nhập | Lối vào |
|---|---|---|---|
| `/` | Khách mua | Popup đăng nhập của web | — |
| `/seller` | Chủ shop, nhân viên shop | **Cùng tài khoản** với web mua sắm | Menu tài khoản → "Kênh người bán", footer → "Bán hàng cùng TrendyLab" |
| `/admin` | Nhân viên TrendyLab (`PLATFORM_ADMIN` / `PLATFORM_MODERATOR` / `PLATFORM_SUPPORT`) | `/admin/login`, cùng `POST /auth/login`, kiểm tra `roles` của `GET /users/me` | Gõ tay, không có link trên web khách |

Quyền thao tác shop do BE kiểm tra theo **thành viên shop** (`/shops/{shopId}/...`). Quyền sàn kiểm tra theo **vai trò cấp sàn** (`/admin/...`). Vì vậy quản lý sản phẩm/đơn của shop nằm ở `/seller`, không nằm ở `/admin`.

## Phía khách mua: thay dữ liệu giả bằng API

| Chức năng | API |
|---|---|
| Sổ địa chỉ | `GET/POST/PUT/DELETE /users/me/addresses` |
| Thanh toán (viết lại) | Chọn địa chỉ đã lưu → `POST /checkout/preview` (server tính tiền theo từng shop) → `GET /checkout/{snapshotId}/payment-methods` → `POST /orders` (header `Idempotency-Key`). Voucher theo shop: `GET /vouchers/available`. Bắt buộc đăng nhập. Ví điện tử thì chuyển sang `payment.checkoutUrl`. |
| Đơn hàng của tôi | `GET /orders`, `GET /orders/{id}`, `POST /orders/{id}/cancel` |
| Trả hàng | `POST/GET /returns`, `/returns/{id}/cancel`, `/returns/{id}/dispatch` |
| Đánh giá trên trang sản phẩm | `GET /products/{id}/reviews`. Viết đánh giá chỉ từ đơn đã mua (BE không cho đánh giá tự do). |
| Yêu thích | `GET /wishlist`, `PUT/DELETE /wishlist/items/{productId}` |
| Danh mục, tìm kiếm, trang chủ | Chỉ dùng `GET /products` (bỏ sản phẩm giả trộn vào vì không có `variantId` nên không cho vào giỏ BE được) |

Còn giả lập vì **BE chưa có API**: form Liên hệ, Chat với shop, danh sách tỉnh/phường (dữ liệu tham chiếu).

## Kênh người bán `/seller`

Nối `screens/seller` (trước đây không có route) và viết lại toàn bộ `services/seller/*` bằng API thật:
- Đăng ký bán hàng 6 bước (`/seller/onboarding/*`). Đã bỏ nút "giả lập duyệt"; kết quả duyệt do admin sàn đưa ra.
- Danh sách shop của tôi (`/shops/mine`), đổi shop, lời mời nhân viên, chuyển quyền sở hữu.
- Sản phẩm, biến thể, ảnh, tồn kho; đơn hàng (xác nhận → đóng gói → giao → cập nhật vận đơn); COD; trả hàng; trả lời đánh giá.
- **Mới:** Mã giảm giá (`/shops/{id}/vouchers`), Tài chính: số dư, phí sàn, rút tiền, lịch sử (`/shops/{id}/finance/*`), Báo cáo + xuất CSV (`/shops/{id}/reports/*`).
- Danh mục sản phẩm lấy UUID từ `GET /catalog/categories`.
- Mọi danh sách dùng `limit ≤ 100` (giới hạn của BE) và tự tải nhiều trang.

## Quản trị sàn `/admin` (viết mới)

Bỏ khu `/admin` cũ (quản lý "1 cửa hàng TrendyLab", dữ liệu giả, tài khoản `admin@trendylab.vn`). Thay bằng:
- Duyệt hồ sơ bán hàng (`/admin/seller-onboardings/*`)
- Shop: tạm khoá / mở lại / đóng, chỉnh phí sàn (`/admin/shops/*`, `/admin/finance/shops/{id}/settings`)
- Sản phẩm bị báo cáo (`/admin/product-moderation/*`)
- Đơn hàng, chỉ xem để hỗ trợ (`/admin/orders`)
- Đánh giá: ẩn / khôi phục (`/admin/reviews`)
- Rút tiền: duyệt / từ chối / xác nhận đã chi (`/admin/finance/payouts`)
- Người dùng: khoá / mở khoá, gán vai trò (`/admin/users`); Vai trò (`/admin/roles`)

API nào tài khoản không có quyền (403) thì màn hình hiện "Bạn không có quyền với mục này".

## Sửa nhỏ khác
- `i18n/index.js` trước đây **không gộp** `seller.vi/en.js`, nên Kênh người bán hiện key thô; đã sửa. Chữ mới nằm trong `i18n/market.vi.js` / `market.en.js`.
- `t(key, { defaultValue })` dùng chữ dự phòng khi chưa có bản dịch (vd mã lỗi BE mới).
- `apiClient` thêm tùy chọn `accept` (xuất CSV cần `Accept: text/csv`).
- Thêm `STORAGE_KEYS.sellerShop` (nhớ shop đang chọn; trước đây thiếu key này).
- Xoá các file giả lập không còn dùng: `mockOrderStore`, `mockProductService`, `mockProducts`, `mockReviews`, `mockVouchers`, `paymentInfo`, `sellerDb`, `adminDb`, `adminAuth`, cùng các màn `/admin` cũ.

## Chỗ BE còn thiếu (FE đã xử lý tạm, nên báo nhóm BE)
1. `GET /shops/mine` không trả **vai trò của tôi trong shop**. FE tự suy ra: là `ownerUserId` thì là chủ shop; không thì đọc `/shops/{id}/members` (cần quyền `shop.staff.read`); không đọc được thì coi là "Nhân viên".
2. Không có API **"mọi đánh giá của shop"**. FE gộp `GET /products/{id}/reviews` của từng sản phẩm.
3. Admin sửa phí sàn cần `expectedVersion` nhưng **không có API cho admin đọc cấu hình phí hiện tại**. FE dùng version đã lưu ở trình duyệt (mặc định 0) và báo rõ khi bị lệch.
4. `ShopOrderSummaryResponse` không có người nhận/ảnh sản phẩm, nên bảng đơn của shop hiện số sản phẩm; xem chi tiết để thấy người nhận.
5. Chưa có API đọc lại **hãng vận chuyển của shop** sau khi đăng ký. Khi giao hàng FE cho chọn danh sách hãng cố định (BE nhận mã bất kỳ).
6. Không có số lượng đã bán, gợi ý sản phẩm, lọc "đang giảm giá". FE tự suy ra từ danh sách sản phẩm.

## Đã kiểm tra
- Parse toàn bộ JSX và kiểm tra mọi import/export: không lỗi.
- TypeScript `checkJs`: không còn biến/hàm chưa khai báo.
- Đối chiếu tự động **148 lời gọi API** của FE với 168 route trong controller BE: tất cả khớp method + đường dẫn.
- Quét key i18n: mọi key mới có đủ vi/en. Còn 9 key thiếu **từ bản trước** (`catalog.banner.*`, `home.bestSellers`, `home.newArrivals`, `collection.sale`, `footer.stores`, `footer.support`), không thuộc phần sửa này.
- **Chưa build và chạy thử được** ở môi trường của Claude: `node_modules` trong zip là bản Windows, mạng bị tắt nên không cài lại được. Cần chạy `npm run build` và `npm run dev` (BE ở `localhost:8080`) trên máy để xác nhận.
