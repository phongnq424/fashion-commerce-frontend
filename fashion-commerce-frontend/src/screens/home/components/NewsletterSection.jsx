import { useState } from 'react';
import Button from '../../../components/common/Button';
import Input from '../../../components/common/Input';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function NewsletterSection() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  // Lưu KEY lỗi thay vì câu đã dịch -> đổi ngôn ngữ thì lỗi cũng đổi theo
  const [errorKey, setErrorKey] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success'

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = email.trim();

    if (!value) return setErrorKey('home.newsletter.errorEmpty');
    if (!EMAIL_PATTERN.test(value)) return setErrorKey('home.newsletter.errorInvalid');

    setErrorKey('');
    setStatus('submitting');
    // Mô phỏng gọi API. Sau này thay bằng fetch POST lên Backend.
    await new Promise((resolve) => setTimeout(resolve, 800));
    setStatus('success');
    setEmail('');
  };

  return (
    <section className="home-section container" aria-labelledby="newsletter-title">
      <div className="newsletter">
        <div className="newsletter__text">
          <h2 id="newsletter-title" className="newsletter__title">
            {t('home.newsletter.title')}
          </h2>
          <p className="newsletter__desc">{t('home.newsletter.description')}</p>
        </div>

        {status === 'success' ? (
          <p className="newsletter__success" role="status">
            <Icon name="check" />
            {t('home.newsletter.success')}
          </p>
        ) : (
          // noValidate: tắt kiểm tra mặc định của trình duyệt để dùng thông báo lỗi đa ngôn ngữ của mình
          <form className="newsletter__form" onSubmit={handleSubmit} noValidate>
            <Input
              type="email"
              name="email"
              label={t('home.newsletter.emailLabel')}
              placeholder={t('home.newsletter.emailPlaceholder')}
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (errorKey) setErrorKey('');
              }}
              error={errorKey ? t(errorKey) : ''}
              disabled={status === 'submitting'}
              className="newsletter__field"
            />
            <Button type="submit" disabled={status === 'submitting'} className="newsletter__submit">
              {status === 'submitting' ? t('home.newsletter.submitting') : t('home.newsletter.submit')}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

export default NewsletterSection;
