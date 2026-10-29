import { Link } from 'react-router-dom';
import Logo from './Logo';
import { useLanguage } from '../../hooks/useLanguage';
import { FOOTER_COLUMNS, SHOP_CONTACT, SOCIAL_LINKS } from '../../constants/footer';
import './Footer.css';

// Icon lấy từ Font Awesome (nạp bằng <link> trong index.html), dùng thẻ <i class="fa-...">.
// Icon chỉ để trang trí -> aria-hidden. Tên đọc cho trình đọc màn hình nằm ở aria-label của link.
const CONTACT_ICONS = {
  address: 'fa-solid fa-location-dot',
  phone: 'fa-solid fa-phone',
  email: 'fa-solid fa-envelope',
};

/**
 * Footer 5 cột: [Logo + giới thiệu + liên hệ + mạng xã hội] | Về TrendyLab | Hỗ trợ | Khám phá | Chính sách
 * Link + thông tin liên hệ: src/constants/footer.js   |   Chữ: vi.js / en.js -> footer
 */
function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner container">
        {/* ---------- Cột 1: thương hiệu ---------- */}
        <div className="site-footer__brand">
          <Logo />
          <p className="site-footer__tagline">{t('brand.tagline')}</p>

          {/* Thông tin liên hệ: icon + chữ. Số điện thoại, email bấm được */}
          <address className="site-footer__contact">
            <ul>
              <li>
                <i className={`${CONTACT_ICONS.address} site-footer__contact-icon`} aria-hidden="true" />
                <span>{t('footer.address')}</span>
              </li>
              <li>
                <i className={`${CONTACT_ICONS.phone} site-footer__contact-icon`} aria-hidden="true" />
                <a href={SHOP_CONTACT.phoneHref} className="site-footer__link">
                  <span className="visually-hidden">{t('footer.phoneLabel')}: </span>
                  {SHOP_CONTACT.phone}
                </a>
              </li>
              <li>
                <i className={`${CONTACT_ICONS.email} site-footer__contact-icon`} aria-hidden="true" />
                <a href={`mailto:${SHOP_CONTACT.email}`} className="site-footer__link">
                  <span className="visually-hidden">{t('footer.emailLabel')}: </span>
                  {SHOP_CONTACT.email}
                </a>
              </li>
            </ul>
          </address>

          {/* Mạng xã hội: nút chỉ có icon -> phải có aria-label cho trình đọc màn hình */}
          <ul className="site-footer__social" aria-label={t('footer.social.label')}>
            {SOCIAL_LINKS.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  className={`site-footer__social-link site-footer__social-link--${item.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t(item.labelKey)}
                >
                  <i className={item.icon} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* ---------- 4 cột link ---------- */}
        {FOOTER_COLUMNS.map((group) => (
          <nav key={group.titleKey} className="site-footer__group" aria-label={t(group.titleKey)}>
            <h2 className="site-footer__title">{t(group.titleKey)}</h2>
            <ul className="site-footer__list">
              {group.links.map((link) => (
                <li key={link.key}>
                  <Link to={link.to} className="site-footer__link">
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="site-footer__bottom container">
        <p>{t('footer.copyright', { year })}</p>
      </div>
    </footer>
  );
}

export default Footer;
