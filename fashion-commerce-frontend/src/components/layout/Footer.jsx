import Logo from './Logo';
import { useLanguage } from '../../hooks/useLanguage';
import { FOOTER_NAV } from '../../constants/navigation';
import './Footer.css';

function Footer() {
  const { t } = useLanguage();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner container">
        <div className="site-footer__brand">
          <Logo />
          <p className="site-footer__tagline">{t('brand.tagline')}</p>
          <address className="site-footer__address">{t('footer.address')}</address>
        </div>

        {FOOTER_NAV.map((group) => (
          <nav key={group.titleKey} className="site-footer__group" aria-label={t(group.titleKey)}>
            <h2 className="site-footer__title">{t(group.titleKey)}</h2>
            <ul className="site-footer__list">
              {group.links.map((link) => (
                <li key={link.key}>
                  <a href={link.href} className="site-footer__link">
                    {t(link.key)}
                  </a>
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
