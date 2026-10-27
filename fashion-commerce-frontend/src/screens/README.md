# Quy ước thư mục screens

Mỗi màn hình (screen) là một thư mục riêng. Nhóm các màn hình cùng chủ đề vào chung một thư mục cha.

```
screens/
├── home/
│   ├── HomeScreen.jsx        ← file chính của màn hình, tên luôn là <Tên>Screen.jsx
│   ├── HomeScreen.css        ← CSS chỉ dành cho màn hình này
│   └── components/           ← component CHỈ màn hình này dùng (HeroSection...)
├── auth/
│   ├── login/
│   │   ├── LoginScreen.jsx
│   │   └── LoginScreen.css
│   ├── register/
│   │   └── RegisterScreen.jsx
│   └── components/           ← component dùng chung cho các màn auth (AuthLayout...)
├── product/
│   ├── list/ProductListScreen.jsx
│   └── detail/ProductDetailScreen.jsx
└── cart/
    └── CartScreen.jsx
```

## Đặt component ở đâu?

| Component được dùng ở | Đặt tại |
|---|---|
| Chỉ 1 màn hình | `screens/<màn>/components/` |
| Vài màn cùng nhóm (login + register) | `screens/<nhóm>/components/` |
| Nhiều màn khác nhau (ProductCard, Button) | `src/components/` |

Khi một component trong `screens/.../components/` bắt đầu được màn khác cần tới, hãy chuyển nó lên `src/components/`.
