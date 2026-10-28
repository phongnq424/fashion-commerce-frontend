import Breadcrumb from '../../components/common/Breadcrumb';
import { useLanguage } from '../../hooks/useLanguage';

// Trang Liên hệ (khung tạm). Nội dung form liên hệ sẽ làm sau.
function ContactScreen() {
  const { t } = useLanguage();

  return (
    <>
      <Breadcrumb items={[{ label: t('breadcrumb.home'), to: '/' }, { label: t('nav.contact') }]} />
      <section className="container" style={{ paddingBlock: 'var(--space-8)' }}>
        <h1 className="text-h2">{t('contact.title')}</h1>
        <p className="text-muted" style={{ marginTop: 'var(--space-3)' }}>
          {t('contact.description')}
        </p>
      </section>
    </>
  );
}

export default ContactScreen;
