import { useCallback, useEffect, useState } from 'react';
import SectionHeading from '../../../components/common/SectionHeading';
import ShopCard from '../../../components/ShopCard/ShopCard';
import Button from '../../../components/common/Button';
import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';
import { getPublicShops } from '../../../services/publicShopService';
import './ShopsSection.css';

const MAX_SHOPS = 8;

/**
 * "Shop trên TrendyLab": các shop đang bán trên sàn (nhiều sản phẩm trước), bấm để vào trang shop.
 * Dữ liệu suy ra từ GET /products (Backend chưa có API danh sách shop công khai).
 * Kèm lời mời mở shop -> /seller (Kênh người bán).
 */
function ShopsSection() {
  const { t } = useLanguage();
  const [shops, setShops] = useState([]);
  const [status, setStatus] = useState('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setShops((await getPublicShops()).slice(0, MAX_SHOPS));
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'success' && shops.length === 0) return null;

  return (
    <section id="shops" className="home-section container" aria-labelledby="shops-title">
      <SectionHeading id="shops-title" align="split" title={t('market.home.shops.title')} actionLabel={t('market.nav.sellOnTrendyLab')} actionHref="/seller" />
      {status === 'error' ? (
        <div className="home-shops__error" role="alert">
          <p>{t('market.home.shops.error')}</p>
          <Button variant="secondary" size="sm" onClick={load}>
            <Icon name="refresh" size={16} />
            {t('common.retry')}
          </Button>
        </div>
      ) : (
        <ul className="home-shops" aria-busy={status === 'loading'}>
          {status === 'loading'
            ? Array.from({ length: 4 }, (_, i) => <li key={i} className="home-shops__skeleton" aria-hidden="true" />)
            : shops.map((shop) => (
                <li key={shop.id}>
                  <ShopCard shop={shop} compact as="div" />
                </li>
              ))}
        </ul>
      )}
    </section>
  );
}

export default ShopsSection;
