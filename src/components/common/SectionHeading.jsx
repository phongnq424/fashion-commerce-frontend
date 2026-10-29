import { Link } from 'react-router-dom';
import Icon from './Icon';
import './SectionHeading.css';

/**
 * Tiêu đề section dùng chung.
 * - id: dùng cho aria-labelledby của <section>
 * - title, description: chuỗi đã dịch (description tuỳ chọn)
 * - actionLabel + actionHref: link phụ như "Xem tất cả" (tuỳ chọn)
 *     actionHref bắt đầu bằng "/" -> chuyển trang bằng React Router, còn lại là link thường
 * - align:
 *     'center' (mặc định): tiêu đề, mô tả, link xếp dọc ở giữa
 *     'split': tiêu đề bên TRÁI, "Xem tất cả →" bên PHẢI (cùng 1 hàng)
 */
function SectionHeading({ id, title, description, actionLabel, actionHref, align = 'center' }) {
  const isRoute = actionHref?.startsWith('/');
  const ActionTag = isRoute ? Link : 'a';
  const actionProps = isRoute ? { to: actionHref } : { href: actionHref };

  return (
    <div className={`section-heading section-heading--${align}`}>
      <div className="section-heading__text">
        <h2 id={id} className="section-heading__title">
          {title}
        </h2>
        {description && <p className="section-heading__desc">{description}</p>}
      </div>

      {actionLabel && (
        <ActionTag {...actionProps} className="section-heading__action">
          {actionLabel}
          {align === 'split' && <Icon name="arrowRight" size={16} className="section-heading__arrow" />}
        </ActionTag>
      )}
    </div>
  );
}

export default SectionHeading;
