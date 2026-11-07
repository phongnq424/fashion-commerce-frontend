import { useState } from 'react';
import Breadcrumb from '../../components/common/Breadcrumb';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Icon from '../../components/common/Icon';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
// Số điện thoại, email, bản đồ -> src/constants/contact.js
import { CONTACT_INFO, getMapEmbedUrl } from '../../constants/contact';
import { MESSAGE_MAX, sendContactMessage, validateContactForm } from '../../services/contactService';
import './ContactScreen.css';

/**
 * Trang Liên hệ (/contact)
 *   [ Cửa hàng TrendyLab                    ] [            ]
 *   [ Địa chỉ        | Thời gian làm việc   ] [  Bản đồ    ]
 *   [ Hotline        | Email                ] [  Google    ]
 *   [ Liên hệ với chúng tôi + form          ] [  Maps      ]
 * Chữ: vi.js / en.js -> contact   |   Số liệu + bản đồ: constants/contact.js
 */
function ContactScreen() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const emptyForm = { name: user?.name ?? '', email: user?.email ?? '', phone: '', message: '' };

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | failed

  const update = (name) => (event) => {
    setForm((prev) => ({ ...prev, [name]: event.target.value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (status === 'sent' || status === 'failed') setStatus('idle');
  };
  const errorOf = (name) => (errors[name] ? t(errors[name]) : undefined);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateContactForm(form);
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      document.getElementById(`contact-${firstError}`)?.focus();
      return;
    }
    setStatus('sending');
    try {
      await sendContactMessage(form);
      setForm((prev) => ({ ...prev, phone: '', message: '' })); // giữ tên + email cho lần gửi sau
      setStatus('sent');
    } catch {
      setStatus('failed');
    }
  };

  const infoItems = [
    { id: 'address', icon: 'fa-solid fa-location-dot', title: t('contact.addressTitle'), lines: [t('footer.address')] },
    { id: 'hours', icon: 'fa-solid fa-clock', title: t('contact.hoursTitle'), lines: [t('contact.hoursTime'), t('contact.hoursDays')] },
    { id: 'phone', icon: 'fa-solid fa-phone-volume', title: t('contact.hotlineTitle'), lines: [CONTACT_INFO.phone], href: CONTACT_INFO.phoneHref },
    { id: 'email', icon: 'fa-solid fa-envelope', title: t('contact.emailTitle'), lines: [CONTACT_INFO.email], href: `mailto:${CONTACT_INFO.email}` },
  ];

  return (
    <>
      <Breadcrumb items={[{ label: t('breadcrumb.home'), to: '/' }, { label: t('nav.contact') }]} />

      <section className="contact-page container" aria-labelledby="contact-title">
        <div className="contact-page__main">
          {/* ----- Thông tin cửa hàng ----- */}
          <h1 id="contact-title" className="contact-page__title">
            {t('contact.storeName')}
          </h1>

          <address className="contact-info">
            {infoItems.map((item) => (
              <div key={item.id} className="contact-info__item">
                <span className="contact-info__icon" aria-hidden="true">
                  <i className={item.icon} />
                </span>
                <div>
                  <p className="contact-info__title">{item.title}</p>
                  {item.lines.map((line) =>
                    item.href ? (
                      <a key={line} href={item.href} className="contact-info__text contact-info__link">
                        {line}
                      </a>
                    ) : (
                      <p key={line} className="contact-info__text">
                        {line}
                      </p>
                    )
                  )}
                </div>
              </div>
            ))}
          </address>

          {/* ----- Form liên hệ ----- */}
          <h2 className="contact-page__subtitle">{t('contact.formTitle')}</h2>
          <p className="contact-page__desc">{t('contact.formDesc')}</p>

          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <Input
              floating
              id="contact-name"
              label={t('contact.fields.name')}
              value={form.name}
              onChange={update('name')}
              error={errorOf('name')}
              autoComplete="name"
            />
            <div className="contact-form__row">
              <Input
                floating
                id="contact-email"
                type="email"
                label={t('contact.fields.email')}
                value={form.email}
                onChange={update('email')}
                error={errorOf('email')}
                autoComplete="email"
              />
              <Input
                floating
                id="contact-phone"
                type="tel"
                label={t('contact.fields.phone')}
                value={form.phone}
                onChange={update('phone')}
                error={errorOf('phone')}
                autoComplete="tel"
                inputMode="tel"
              />
            </div>

            {/* Ô nội dung nhiều dòng (dùng chung kiểu ô nhập của Input) */}
            <div className={`field field--floating contact-form__message ${errors.message ? 'field--error' : ''}`}>
              <label htmlFor="contact-message" className="field__label">
                {t('contact.fields.message')}
              </label>
              <textarea
                id="contact-message"
                className="field__input"
                rows={5}
                placeholder=" "
                maxLength={MESSAGE_MAX}
                value={form.message}
                onChange={update('message')}
                aria-invalid={errors.message ? 'true' : undefined}
                aria-describedby={errors.message ? 'contact-message-error' : undefined}
              />
              {errors.message && (
                <p id="contact-message-error" className="field__error" role="alert">
                  <Icon name="alert" size={16} />
                  {errorOf('message')}
                </p>
              )}
            </div>

            <div className="contact-form__actions">
              <Button type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? t('contact.sending') : t('contact.submit')}
              </Button>
            </div>

            {status === 'sent' && (
              <p className="contact-form__result contact-form__result--success" role="status">
                <Icon name="check" size={18} />
                {t('contact.sent')}
              </p>
            )}
            {status === 'failed' && (
              <p className="contact-form__result contact-form__result--error" role="alert">
                <Icon name="alert" size={18} />
                {t('contact.failed')}
              </p>
            )}
          </form>
        </div>

        {/* ----- Bản đồ ----- */}
        <div className="contact-page__map">
          <iframe
            title={t('contact.mapTitle')}
            src={getMapEmbedUrl(CONTACT_INFO, language)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </section>
    </>
  );
}

export default ContactScreen;
