import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';

const BENEFITS = [
  { icon: 'truck', titleKey: 'home.benefits.shippingTitle', textKey: 'home.benefits.shippingText' },
  { icon: 'refresh', titleKey: 'home.benefits.returnsTitle', textKey: 'home.benefits.returnsText' },
  { icon: 'shield', titleKey: 'home.benefits.paymentTitle', textKey: 'home.benefits.paymentText' },
];

function BenefitsSection() {
  const { t } = useLanguage();

  return (
    <section className="home-section container" aria-labelledby="benefits-title">
      <h2 id="benefits-title" className="visually-hidden">
        {t('home.benefits.title')}
      </h2>
      <ul className="benefits">
        {BENEFITS.map((item) => (
          <li key={item.titleKey} className="benefits__item">
            <span className="benefits__icon">
              <Icon name={item.icon} size={22} />
            </span>
            <div>
              <h3 className="benefits__title">{t(item.titleKey)}</h3>
              <p className="benefits__text">{t(item.textKey)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default BenefitsSection;
