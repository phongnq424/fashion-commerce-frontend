import { Link } from 'react-router-dom';
import Icon from '@shared/components/common/Icon';

/**
 * Tiêu đề chung cho mọi trang Seller Center.
 * - title, subtitle   - actions: nút bên phải   - back: { to, label } link quay lại (tuỳ chọn)
 * - badge: huy hiệu cạnh tiêu đề (tuỳ chọn)
 */
function AdminPage({ title, subtitle, actions, back, badge, children }) {
  return (
    <>
      <header className="admin-page-head">
        <div>
          {back && (
            <Link to={back.to} className="admin-page-head__back">
              <Icon name="chevronLeft" size={16} />
              {back.label}
            </Link>
          )}
          <h1 className="admin-page-head__title">
            {title}
            {badge}
          </h1>
          {subtitle && <p className="admin-page-head__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="admin-page-head__actions">{actions}</div>}
      </header>
      {children}
    </>
  );
}

export default AdminPage;
