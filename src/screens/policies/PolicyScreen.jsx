import { NavLink, useParams } from 'react-router-dom';
import Breadcrumb from '../../components/common/Breadcrumb';
import Icon from '../../components/common/Icon';
import { findPolicy, POLICY_PAGES } from '../../data/policyContent';
import { useLanguage } from '../../hooks/useLanguage';
import { formatDate } from '../../utils/format';
import NotFoundScreen from '../notFound/NotFoundScreen';
import './PolicyScreen.css';

/**
 * /policies/:policyId — Trang chính sách (returns | shipping | payment | privacy | terms).
 * Bố cục trang tài liệu phổ biến: [Menu các chính sách (dính) | Nội dung + mục lục nhảy nhanh].
 * Nội dung: data/policyContent.js
 */
function PolicyScreen() {
  const { t, language } = useLanguage();
  const { policyId } = useParams();
  const policy = findPolicy(policyId);

  if (!policy) return <NotFoundScreen />;

  return (
    <>
      <Breadcrumb
        items={[{ label: t('breadcrumb.home'), to: '/' }, { label: t('policies.title') }, { label: t(policy.titleKey) }]}
      />
      <div className="policy-page container">
        <nav className="policy-nav" aria-label={t('policies.title')}>
          <p className="policy-nav__title">{t('policies.title')}</p>
          <ul>
            {POLICY_PAGES.map((page) => (
              <li key={page.id}>
                <NavLink
                  to={`/policies/${page.id}`}
                  className={({ isActive }) => `policy-nav__link ${isActive ? 'policy-nav__link--active' : ''}`}
                >
                  <Icon name="doc" size={16} />
                  {t(page.titleKey)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <article className="policy-article">
          <header className="policy-article__head">
            <h1 className="policy-article__title">{t(policy.titleKey)}</h1>
            <p className="policy-article__updated">
              {t('policies.updatedAt', { date: formatDate(policy.updatedAt, language) })}
            </p>
          </header>

          <nav className="policy-toc" aria-label={t('policies.toc')}>
            <p className="policy-toc__title">{t('policies.toc')}</p>
            <ol>
              {policy.sections.map((section, index) => (
                <li key={section.heading}>
                  <a href={`#section-${index + 1}`}>{section.heading}</a>
                </li>
              ))}
            </ol>
          </nav>

          {policy.sections.map((section, index) => (
            <section key={section.heading} id={`section-${index + 1}`} className="policy-section">
              <h2>{section.heading}</h2>
              <ul>
                {section.paragraphs.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </section>
          ))}

          <aside className="policy-help">
            <Icon name="headset" size={22} />
            <div>
              <p className="policy-help__title">{t('policies.helpTitle')}</p>
              <p>{t('policies.helpText')}</p>
            </div>
            <NavLink to="/contact" className="btn btn--outline btn--sm">
              {t('policies.contact')}
            </NavLink>
          </aside>
        </article>
      </div>
    </>
  );
}

export default PolicyScreen;
