# TrendyLab — Frontend sàn thời trang nhiều shop

Frontend cho [`fashion-commerce-backend`](https://github.com/phongnq424/fashion-commerce-backend) (đối chiếu commit `2caa0ff`).
BE là **sàn TMĐT nhiều shop** (kiểu Shopee): ai cũng mua được, ai cũng đăng ký mở shop được (sàn duyệt),
một đơn hàng tách theo từng shop, sàn thu phí từ shop. FE dùng API thật ở mọi luồng BE đã có; chỗ nào BE chưa có API
thì ghi rõ ở mục [Chỗ Backend còn thiếu](#chỗ-backend-còn-thiếu-nên-báo-nhóm-be).

**Mục lục:** [3 giao diện](#3-giao-diện-2-ứng-dụng) · [Lấy dữ liệu](#fe-lấy-dữ-liệu-như-thế-nào) ·
[Chạy demo](#chạy-demo-không-cần-backend-không-cần-database) · [Chạy với BE thật](#chạy-với-backend-thật) ·
[Lệnh](#lệnh) · [Thư mục](#thư-mục) · [Chức năng & API](#chức-năng-và-api-đang-dùng) ·
[BE còn thiếu](#chỗ-backend-còn-thiếu-nên-báo-nhóm-be) · [Lịch sử thay đổi](#lịch-sử-thay-đổi)

---

## 3 giao diện, 2 ứng dụng

| Giao diện | Ai dùng | Địa chỉ khi chạy máy | Mã nguồn |
|---|---|---|---|
| **Web mua sắm** (chưa đăng nhập / đã đăng nhập) | Khách mua | http://localhost:5173 | `src/` |
| **Kênh người bán** `/seller` | Chủ shop, nhân viên shop — **cùng tài khoản** với web mua sắm | http://localhost:5173/seller | `src/screens/seller/` |
| **Quản trị sàn** | Nhân viên sàn (`PLATFORM_ADMIN` / `MODERATOR` / `SUPPORT`) | http://localhost:5174 | `admin/` (app riêng) |

- Web mua sắm và Kênh người bán là **một app**: một người vừa là khách vừa là chủ shop, chuyển qua lại bằng
  menu tài khoản → "Kênh người bán" và nút "Về trang mua sắm".
- Seller chỉ thấy và quản lý **shop mình là thành viên** (danh sách từ `GET /shops/mine`). Mọi API shop có dạng
  `/shops/{shopId}/...` và **Backend tự chặn** nếu không phải thành viên. Menu tự ẩn mục không thuộc vai trò.
- Mỗi tài khoản chỉ **sở hữu tối đa 1 shop** (BE: `UNIQUE (owner_user_id)`, đăng ký lại bị `SELLER_ALREADY_APPROVED`),
  nhưng có thể làm nhân viên / quản lý ở shop khác — vì vậy "Các shop của tôi" có thể có nhiều shop.
- Quản trị sàn là **app riêng, cổng riêng, bản build riêng** (`dist-admin/`): code quản trị không nằm trong JS
  của web khách, phiên đăng nhập tách hẳn (khác cổng = khác bộ nhớ trình duyệt, lưu `sessionStorage`, đóng tab là
  đăng xuất), tài khoản không có vai trò `PLATFORM_*` bị đăng xuất ngay. **Dùng chung Backend + database.**

## FE lấy dữ liệu như thế nào?

```
Trình duyệt (5173 / 5174) ──HTTP /api/v1──▶ Vite proxy ──▶ cổng 8080 ──▶ Backend (Spring Boot) ──▶ PostgreSQL
```

FE **không bao giờ** nối thẳng vào database. FE chỉ gọi API của BE; BE mới đọc/ghi database.
**Trên cổng 8080 đang chạy gì thì web dùng dữ liệu của cái đó:**

| Đang chạy | Dữ liệu web hiển thị |
|---|---|
| `npm run demo` (hoặc `npm run dev` + `npm run mock`) | **BE giả** (`mock-server/`): dữ liệu mẫu đúng dạng API của BE thật, có sẵn tài khoản |
| `npm run dev` + Backend thật ở 8080 | **Dữ liệu thật** trong database |
| Chỉ `npm run dev`, 8080 không có gì | Không có dữ liệu — đăng nhập báo "Không kết nối được Backend (cổng 8080)" |

Chuyển giữa BE giả và BE thật **không cần sửa dòng code FE nào**.

---

## Chạy demo (không cần Backend, không cần database)

Yêu cầu: Node.js 20+.

```bash
npm install
npm run demo        # bật cùng lúc: BE giả :8080 + web mua sắm :5173 + quản trị :5174
```

Hoặc từng phần, mỗi lệnh một cửa sổ terminal: `npm run mock`, `npm run dev`, `npm run dev:admin`.
Nhấn Ctrl + C để tắt tất cả (script tự tắt cả các tiến trình con, kể cả trên Windows).

Mật khẩu mọi tài khoản: `Demo@123` · OTP đăng ký / quên mật khẩu: `123456`.
Nút **DEMO** ở góc dưới trái (chỉ hiện khi đang chạy BE giả) liệt kê tài khoản và có nút **Đặt lại dữ liệu demo**.

| Tài khoản | Đăng nhập ở | Vai trò |
|---|---|---|
| `khach@trendylab.vn` | 5173 | Khách mua, có sẵn địa chỉ, đơn hàng, yêu thích |
| `seller@trendylab.vn` | 5173 → /seller | Chủ shop **TrendyLab Official** + quản lý **Lam Studio** (đổi shop ở góc trên) |
| `lam@trendylab.vn` | 5173 → /seller | Chủ shop **Lam Studio** |
| `denim@trendylab.vn` | 5173 → /seller | Chủ shop **Bụi Denim** |
| `may@trendylab.vn` | 5173 → /seller | Chủ shop **Mây Basic** |
| `nhanvien@trendylab.vn` | 5173 → /seller | Nhân viên đơn hàng của TrendyLab Official |
| `moi@trendylab.vn` | 5173 → /seller | Đã gửi hồ sơ mở shop, chờ admin duyệt |
| `vipham@trendylab.vn` | 5173 → /seller | Chủ shop bị admin tạm khoá (sản phẩm không hiện cho khách) |
| `admin@trendylab.vn` | **5174** | Quản trị sàn, toàn quyền |
| `kiemduyet@trendylab.vn` | **5174** | Kiểm duyệt: duyệt seller, shop, sản phẩm, đánh giá |
| `hotro@trendylab.vn` | **5174** | Hỗ trợ: tra cứu đơn hàng |

Kịch bản thử trọn vòng: khách bỏ hàng của 2 shop vào giỏ (giỏ tự nhóm theo shop) → thanh toán COD → đơn tách 2
kiện → đăng nhập `denim@` xác nhận, đóng gói, giao → thu COD → rút tiền → đăng nhập `admin@` ở cổng 5174 duyệt
rút tiền. Hoặc: đăng ký tài khoản mới → mở shop 6 bước → admin duyệt → vào lại `/seller`.

Dữ liệu BE giả lưu ở `mock-server/.data/db.json` (2 app dùng chung). Sản phẩm mẫu: `mock-server/data/mockProducts.js`
và `mock-server/data/extraProducts.js` — thêm sản phẩm / shop thì sửa 2 file này rồi bấm "Đặt lại dữ liệu demo".

### Không đăng nhập được?

| Thông báo | Nguyên nhân | Cách sửa |
|---|---|---|
| "Không kết nối được Backend (cổng 8080)…" | Chỉ chạy `npm run dev`, chưa bật BE giả / BE thật | Chạy `npm run demo` (hoặc mở thêm 1 terminal chạy `npm run mock`) |
| "Email, số điện thoại hoặc mật khẩu không đúng" | Sai mật khẩu, hoặc đã đổi mật khẩu trước đó | Mật khẩu demo `Demo@123`; nút DEMO → "Đặt lại dữ liệu demo" |
| "Cổng 8080 / 5173 / 5174 đang bận" | Lần chạy trước chưa tắt hẳn, BE thật / Docker đang dùng 8080 | PowerShell: `Get-NetTCPConnection -LocalPort 8080,5173,5174 -State Listen \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }` (BE Docker: `docker compose down`) rồi chạy lại |
| Sửa code xong vẫn thấy giao diện cũ | Trình duyệt đang mở web từ tiến trình cũ, hoặc bộ nhớ đệm | Tắt tiến trình cũ như dòng trên, chạy lại, nhấn Ctrl + F5 |

Khi chạy đúng, terminal hiện dòng `[mock] BE giả đang chạy: http://localhost:8080/api/v1` và góc dưới trái web có nút **DEMO**.

## Chạy với Backend thật

1. Phía BE (việc của nhóm BE, xem README của BE): PostgreSQL + Redis + file `.env`, lần đầu đặt `DB_MIGRATIONS_ENABLED=true`
   để tạo bảng, rồi `./mvnw spring-boot:run` hoặc `docker compose up --build` (cổng 8080). `compose.yaml` của BE chỉ chạy BE, không kèm database.
2. Phía FE: **không** chạy `npm run demo` / `npm run mock`. Chạy `npm run dev` và `npm run dev:admin`. Nút DEMO tự biến mất.

Lưu ý khi dùng BE thật:
- Database mới chỉ có dữ liệu tham chiếu (vai trò, quyền, 3 danh mục, hãng vận chuyển, chính sách seller).
  **Chưa có sản phẩm, shop, tài khoản nào** (các tài khoản demo chỉ có trong BE giả).
- BE **không tự tạo tài khoản admin**. Nhóm BE cần gán vai trò `PLATFORM_ADMIN` cho tài khoản đầu tiên trong database;
  sau đó admin gán vai trò cho người khác ở trang Quản trị → Người dùng.
- Chạy dev qua proxy của Vite nên không cần CORS. Khi deploy web và trang quản trị lên 2 tên miền riêng, BE phải thêm
  cả 2 vào `CORS_ALLOWED_ORIGINS`.

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run demo` | BE giả + web mua sắm + quản trị |
| `npm run mock` | Chỉ BE giả (cổng 8080) |
| `npm run dev` | Web mua sắm + Kênh người bán (5173) |
| `npm run dev:admin` | Quản trị sàn (5174) |
| `npm run build` | Build cả 2 app → `dist/` và `dist-admin/` |
| `npm run build:web` / `build:admin` | Build từng app |

## Thư mục

```
src/                 web mua sắm + kênh người bán; component/service dùng chung
  screens/home/      trang chủ (Flash Sale, danh mục, hàng mới, đang giảm giá, gợi ý)
  screens/product/   chi tiết sản phẩm (khối thông tin shop + nút Chat trước phần đánh giá)
  screens/shop/      trang gian hàng /shop/:shopId
  screens/seller/    kênh người bán
  components/ShopChat/  khung chat với shop (2 cột)
  services/          gọi API Backend (apiClient.js là cửa duy nhất ra mạng)
  i18n/              chữ vi/en (market.vi.js / market.en.js: chữ cho phần sàn)
admin/               app quản trị sàn (index.html, src/), dùng lại code chung qua alias @shared -> src/
mock-server/         BE giả: server.js (Node thuần), lib/ (route, dữ liệu, quyền), data/ (sản phẩm mẫu)
scripts/demo.js      bật cùng lúc 3 tiến trình
vite.config.js       cấu hình web mua sắm   |   vite.admin.config.js  cấu hình quản trị
```

---

## Chức năng và API đang dùng

### Web mua sắm

| Chức năng | API / ghi chú |
|---|---|
| Trang chủ | Banner → **Flash Sale** (hàng đang giảm giá của mọi shop, đồng hồ đếm ngược, thanh tiến độ theo tồn kho, giờ chạy cấu hình ở `screens/home/data/flashSale.js`) → danh mục → hàng mới → đang giảm giá → banner khuyến mãi → gợi ý. Dữ liệu: `GET /products` |
| Danh mục, tìm kiếm, lọc | `GET /products` (giá, ưu đãi, **lọc theo shop bán**), `GET /catalog/categories` |
| Thẻ sản phẩm | Ghi tên shop bán (`shopName`) |
| Chi tiết sản phẩm | `GET /products/{id}`; điểm sao + số đánh giá từ `GET /products/{id}/reviews` (summary). Mô tả / chất liệu / bảo quản lấy từ sản phẩm; chính sách là chính sách chung của sàn |
| Khối thông tin shop (trước "Đánh giá sản phẩm") | Tên shop, nút **Chat** và **Xem shop**, số đánh giá, số sản phẩm, điểm đánh giá, số sản phẩm đang giảm giá |
| Trang shop `/shop/:shopId` | Sản phẩm của shop, lọc danh mục, sắp xếp |
| Chat với shop | Nút chat góc phải dưới (nút ↑ lên đầu trang ở góc trái). Khung 2 cột: trái = thông tin shop + danh sách shop đã chat, phải = nội dung chat. Cần đăng nhập. **BE chưa có API chat** → tin nhắn lưu trên trình duyệt, shop trả lời tự động |
| Giỏ hàng | `GET/POST/PATCH/DELETE /cart...`, **nhóm theo shop** (đúng `CartResponse.shops[]`), chọn cả shop. Giỏ tạm khi chưa đăng nhập, đăng nhập thì chuyển lên server |
| Thanh toán | Chọn địa chỉ → `POST /checkout/preview` (server tính tiền theo từng shop) → `GET /checkout/{snapshotId}/payment-methods` → `POST /orders` (header `Idempotency-Key`). Voucher theo shop: `GET /vouchers/available`. Bắt buộc đăng nhập |
| Đơn mua | `GET /orders`, `GET /orders/{id}`, `POST /orders/{id}/cancel` |
| Trả hàng | `POST/GET /returns`, `/returns/{id}/cancel`, `/returns/{id}/dispatch` |
| Đánh giá | Chỉ viết từ đơn đã mua (BE không cho đánh giá tự do) |
| Yêu thích | `GET /wishlist`, `PUT/DELETE /wishlist/items/{productId}` |
| Sổ địa chỉ | `GET/POST/PUT/DELETE /users/me/addresses` |
| Hồ sơ & bảo mật `/account/security` | `PATCH /users/me` (đổi email/SĐT cần mật khẩu hiện tại), `POST /users/me/password` (đăng xuất mọi thiết bị), `GET/DELETE /users/me/sessions` |
| Liên hệ | BE chưa có API → mở ứng dụng email của khách với nội dung điền sẵn |

### Kênh người bán `/seller`

- Đăng ký bán hàng 6 bước (`/seller/onboarding/*`); kết quả duyệt do admin sàn đưa ra.
- Các shop của tôi (`/shops/mine`), đổi shop, lời mời nhân viên, chuyển quyền sở hữu.
- Sản phẩm, biến thể, ảnh, tồn kho; đơn hàng (xác nhận → đóng gói → giao → cập nhật vận đơn); COD; trả hàng; trả lời đánh giá.
- Mã giảm giá (`/shops/{id}/vouchers`), Tài chính: số dư, phí sàn, rút tiền, lịch sử (`/shops/{id}/finance/*`),
  Báo cáo + xuất CSV (`/shops/{id}/reports/*`).
- Menu ẩn theo vai trò trong shop (bảng `role_permissions` của BE); chủ shop thấy hết. Backend vẫn tự chặn khi gõ thẳng đường dẫn.
- Mọi danh sách dùng `limit ≤ 100` (giới hạn của BE) và tự tải nhiều trang.

### Quản trị sàn (app `admin/`, cổng 5174)

| Đường dẫn | Chức năng | API |
|---|---|---|
| `/login` | Đăng nhập (chỉ vai trò `PLATFORM_*`) | `POST /auth/login`, `GET /users/me` |
| `/` | Tổng quan: việc đang chờ | các danh sách bên dưới |
| `/seller-reviews` | Duyệt hồ sơ mở shop | `/admin/seller-onboardings/*` |
| `/shops` | Tạm khoá / mở lại / đóng shop, chỉnh phí sàn | `/admin/shops/*`, `/admin/finance/shops/{id}/settings` |
| `/product-cases` | Sản phẩm bị báo cáo | `/admin/product-moderation/*` |
| `/orders` | Tra cứu đơn để hỗ trợ (chỉ xem) | `/admin/orders` |
| `/reviews` | Ẩn / khôi phục đánh giá | `/admin/reviews` |
| `/payouts` | Duyệt / từ chối / xác nhận đã chi rút tiền | `/admin/finance/payouts` |
| `/users`, `/roles` | Khoá / mở khoá tài khoản, gán vai trò, quản lý vai trò | `/admin/users`, `/admin/roles`, `/admin/permissions` |

API nào tài khoản không có quyền (403) thì màn hình hiện "Bạn không có quyền với mục này".

---

## Chỗ Backend còn thiếu (nên báo nhóm BE)

1. **Không có API shop công khai**: `GET /shops/{id}` đòi quyền thành viên shop, `GET /products` không lọc được theo `shopId`,
   `PublicProductResponse` (chi tiết) không có `shopName`. FE tạm suy ra trang shop / tên shop / số liệu shop từ `GET /products`
   (tối đa 300 sản phẩm). Đề nghị thêm `GET /shops/{slug}/public` (tên, logo, mô tả, ngày tham gia) và `GET /products?shopId=`.
2. `GET /shops/mine` không trả **vai trò của tôi trong shop**. FE tự suy ra: là `ownerUserId` thì là chủ shop; không thì đọc
   `/shops/{id}/members` (cần quyền `shop.staff.read`); không đọc được thì coi là "Nhân viên" và hiện đủ menu.
3. Không có API **"mọi đánh giá của shop"**. FE gộp `GET /products/{id}/reviews` của từng sản phẩm.
4. Không có **số lượng đã bán**, gợi ý sản phẩm, lọc "đang giảm giá", chương trình flash sale. FE tự suy ra từ danh sách sản phẩm.
5. Không có **API chat** khách ↔ shop, API nhận form liên hệ, API đăng ký nhận tin.
6. Admin sửa phí sàn cần `expectedVersion` nhưng **không có API cho admin đọc cấu hình phí hiện tại**. FE dùng version đã lưu ở
   trình duyệt (mặc định 0) và báo rõ khi bị lệch.
7. `ShopOrderSummaryResponse` không có người nhận / ảnh sản phẩm, nên bảng đơn của shop hiện số sản phẩm; xem chi tiết để thấy người nhận.
8. Chưa có API đọc lại **hãng vận chuyển của shop** sau khi đăng ký. Khi giao hàng FE cho chọn danh sách hãng cố định.
9. Không có danh sách tỉnh/phường (FE dùng dữ liệu tĩnh).
10. BE không tự tạo **tài khoản admin đầu tiên**; cần gán `PLATFORM_ADMIN` trong database.

---

## Lịch sử thay đổi

### 17/11 tối — chat, Flash Sale, thông tin shop
- **Chat với shop** đặt lại (nút góc phải dưới, nút ↑ chuyển sang góc trái, tự nằm trên nút DEMO). Khung 2 cột:
  thông tin shop + danh sách shop bên trái, nội dung chat bên phải; mobile toàn màn hình. Câu trả lời tự động không
  hứa chính sách cụ thể (mỗi shop tự đặt chính sách).
- **Flash Sale** trở lại trang chủ với bố cục cũ; sản phẩm là hàng đang giảm giá của mọi shop, mỗi thẻ ghi tên shop;
  thanh tiến độ tính theo tồn kho ("Còn N sản phẩm", còn ≤ 10 thì "Sắp cháy hàng"); chip "Freeship" đổi thành "Từ N shop".
- **Khối thông tin shop** ở trang chi tiết chuyển từ dưới nút Thêm giỏ / Mua ngay xuống **trước "Đánh giá sản phẩm"**,
  thêm nút **Chat** cạnh **Xem shop**.
- Bỏ mục "Shop trên TrendyLab" ở trang chủ.
- Đăng nhập báo đúng lỗi: sai mật khẩu (`AUTH_INVALID_CREDENTIALS`) và chưa bật Backend (`BACKEND_UNREACHABLE`)
  trước đây cùng hiện "Máy chủ chưa thể xử lý yêu cầu". Áp dụng cho cả trang quản trị.
- `scripts/demo.js`: Ctrl + C tắt hẳn mọi tiến trình con (Windows), dùng lại BE giả đang chạy sẵn, cổng bận thì báo
  rõ chương trình nào; BE giả ghi file dữ liệu an toàn hơn trên Windows.

### 17/11 chiều — tách admin, BE giả dùng chung, sửa web khách theo hướng sàn
- **BE giả** chuyển từ chạy trong trình duyệt (`VITE_USE_MOCK`, localStorage) thành server Node ở **đúng cổng 8080 của BE thật**,
  2 app dùng chung dữ liệu. Thêm shop, sản phẩm, đánh giá, tài khoản kiểm duyệt / hỗ trợ; bổ sung phiên đăng nhập,
  `PATCH /users/me`, đổi mật khẩu, quản lý phiên và mã lỗi giống BE thật. Đã bỏ `VITE_USE_MOCK` và nhánh mock trong `apiClient`.
- **Quản trị sàn tách thành app riêng** `admin/` (cổng 5174, build `dist-admin/`); web khách không còn route `/admin`.
- **Web khách theo hướng sàn**: thẻ sản phẩm ghi tên shop; trang chi tiết có thông tin shop (trước luôn hiện "TrendyLab"
  vì gọi API cần quyền thành viên shop); thêm trang shop; giỏ hàng nhóm theo shop; bộ lọc "Bộ sưu tập" gắn cứng đổi thành
  "Shop bán"; bỏ Lookbook, đăng ký nhận tin, "Bán chạy" (thực ra là nhiều tồn kho); bỏ phần "Giới thiệu về TrendyLab"
  trong mô tả mọi sản phẩm; form liên hệ không còn giả vờ "gửi thành công"; bỏ ô "Nhận tin khuyến mãi" khi đăng ký;
  thêm trang **Hồ sơ & bảo mật**; footer chỉ link tới trang đã có.
- **Kênh người bán**: menu ẩn theo vai trò; số việc cần làm trên menu không mất hết khi 1 API bị 403.
- **Dọn code thừa**: các màn `/admin` cũ quản lý 1 cửa hàng, `AdminProvider`, `useAdmin`, `services/admin/*`, `sellerDb`,
  `adminDb`, `adminAuth`, `mockOrderStore`, `mockProductService`, `data/mock*.js`, `paymentInfo`, các component thanh toán cũ
  không dùng, `QrCode`, `qrcode`, `vietqr`, `cardValidation`, `CategoryScreen`, thư mục `dist/`.

### 17/11 sáng — nối FE với API Backend
- Phía khách mua: sổ địa chỉ, thanh toán (viết lại), đơn hàng, trả hàng, đánh giá, yêu thích, danh mục / tìm kiếm chuyển sang API thật.
- Nối `screens/seller` (trước không có route) và viết lại `services/seller/*` bằng API thật; thêm Mã giảm giá, Tài chính, Báo cáo.
- Viết mới khu quản trị sàn thay cho khu `/admin` cũ quản lý "1 cửa hàng TrendyLab".
- Giao diện đăng ký bán hàng: `FieldSelect` cho Tỉnh/Thành phố, dấu `*` cho ô bắt buộc, gợi ý địa chỉ, nhãn ảnh CCCD rõ ràng,
  bước chính sách chỉ gửi khi bấm "Gửi hồ sơ duyệt".
- Sửa nhỏ: `i18n/index.js` gộp `seller.vi/en.js` (trước hiện key thô); `t(key, { defaultValue })`; `apiClient` thêm tùy chọn
  `accept` (xuất CSV); thêm `STORAGE_KEYS.sellerShop`.

### Đã kiểm tra
- Build cả 2 app (esbuild) không lỗi import / JSX; mở bằng Chrome các trang chủ, sản phẩm, trang shop, giỏ hàng,
  hồ sơ & bảo mật, kênh người bán, quản trị, khung chat (desktop + mobile): không lỗi.
- 93 lời gọi API của FE đều có trong controller BE; BE giả có đủ mọi route FE gọi.
- Kịch bản qua HTTP với BE giả: khách đặt hàng 2 shop → tách 2 đơn; chủ shop không đọc được đơn shop khác (403);
  nhân viên đơn hàng bị chặn tài chính; khách bị chặn `/admin`; kiểm duyệt viên bị chặn rút tiền; đổi mật khẩu thu hồi token.
- Mọi key i18n dùng trong code đều có đủ vi/en.
