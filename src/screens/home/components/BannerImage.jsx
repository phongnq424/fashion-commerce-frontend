import { useState } from 'react';

/**
 * Ảnh trang trí cho các khối banner. Ảnh lỗi -> tự ẩn đi, để lộ nền pastel phía sau
 * (không hiện icon ảnh vỡ). alt mặc định rỗng vì chữ trong banner đã mô tả nội dung.
 */
function BannerImage({ src, alt = '', position = 'center', className = '', loading = 'lazy' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ objectPosition: position }}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}

export default BannerImage;
