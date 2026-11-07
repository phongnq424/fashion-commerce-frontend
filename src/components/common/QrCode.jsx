import { useMemo } from 'react';
import { createQrMatrix } from '../../utils/qrcode';

/**
 * Vẽ mã QR bằng SVG (nét sắc ở mọi kích thước, in ra cũng rõ).
 * - value: nội dung mã
 * - size: kích thước hiển thị (px)
 * - label: mô tả cho trình đọc màn hình
 * Luôn nền trắng + ô đen (kể cả chế độ tối) để app quét được.
 */
function QrCode({ value, size = 180, label }) {
  const { path, dimension } = useMemo(() => {
    const matrix = createQrMatrix(value);
    const quiet = 4; // viền trắng bắt buộc quanh mã
    let d = '';
    matrix.forEach((row, y) => {
      row.forEach((dark, x) => {
        if (dark) d += `M${x + quiet},${y + quiet}h1v1h-1z`;
      });
    });
    return { path: d, dimension: matrix.length + quiet * 2 };
  }, [value]);

  return (
    <svg
      className="qr-code"
      width={size}
      height={size}
      viewBox={`0 0 ${dimension} ${dimension}`}
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
    >
      <rect width={dimension} height={dimension} fill="#ffffff" />
      <path d={path} fill="#000000" />
    </svg>
  );
}

export default QrCode;
