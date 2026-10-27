# Thư viện thiết kế (theme)

| File | Chứa gì | Đổi theo Light/Dark? |
|---|---|---|
| `colors.css` | Palette gốc + màu semantic | Có (khối `[data-theme='dark']`) |
| `typography.css` | Font, cỡ chữ, độ đậm, dòng + lớp `.text-*` | Không |
| `spacing.css` | Khoảng cách, bo góc, bố cục | Không |
| `index.css` | Gom 3 file trên | |

## Quy tắc

1. Mã HEX chỉ được viết trong `colors.css`.
2. Component chỉ dùng biến semantic: `var(--color-text)`, không dùng `var(--periwinkle-700)`.
3. Cỡ chữ, độ đậm dùng token: `font-weight: var(--fw-bold)`, không viết `700`.
4. Cần màu mới? Thêm vào palette, đặt tên vai trò ở tầng semantic, rồi khai báo giá trị cho CẢ light và dark.

## Ví dụ

```css
.my-card {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  padding: var(--space-5);
  border-radius: var(--radius-md);
}
```

```jsx
<h2 className="text-h2">Hàng mới về</h2>
<p className="text-small text-muted">Mô tả ngắn</p>
```
