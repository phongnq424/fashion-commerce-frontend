import { useCallback, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import { downloadFinanceCsv, getOrderStatusReport, getSalesReport, getTopProducts } from '../../../services/seller/financeService';
import { formatPrice } from '../../../utils/format';
import RequireShop from '../components/RequireShop';
import SellerPage from '../components/SellerPage';

const isoDate = (date) => date.toISOString().slice(0, 10);
const defaultPeriod = () => {
  const to = new Date();
  const from = new Date(Date.now() - 29 * 86400000);
  return { from: isoDate(from), to: isoDate(to) };
};

function ReportsPanel({ shopId, onNotify }) {
  const { t, language } = useLanguage();
  const price = (value) => formatPrice(value ?? 0, language);
  const [period, setPeriod] = useState(defaultPeriod);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [sales, top, statuses] = await Promise.all([
        getSalesReport(shopId, period),
        getTopProducts(shopId, period, 10),
        getOrderStatusReport(shopId, period),
      ]);
      setData({ sales, top, statuses });
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus(error?.status === 403 ? 'forbidden' : 'error');
    }
  }, [shopId, period]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = async () => {
    try {
      await downloadFinanceCsv(shopId, period);
    } catch (error) {
      onNotify?.('error', t(`market.errors.${error?.code}`, { defaultValue: t('account.actionError') }));
    }
  };

  const maxDaily = Math.max(1, ...(data?.sales.daily ?? []).map((d) => d.netRevenueMinor));

  return (
    <>
      <section className="account-card">
        <div className="seller-form__row" style={{ alignItems: 'end' }}>
          <Input label={t('market.reports.from')} type="date" value={period.from} max={period.to} onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))} />
          <Input label={t('market.reports.to')} type="date" value={period.to} min={period.from} onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))} />
          <Button variant="outline" onClick={exportCsv}>
            <Icon name="arrowDown" size={16} />
            {t('market.reports.exportCsv')}
          </Button>
        </div>
      </section>

      {status === 'loading' && <div className="account-skeleton" />}
      {status === 'forbidden' && <div className="account-card"><EmptyState icon="shield" title={t('market.seller.noPermission')} /></div>}
      {status === 'error' && <div className="account-card"><EmptyState tone="error" icon="alert" title={t('account.loadError')} action={<Button variant="secondary" onClick={load}>{t('common.retry')}</Button>} /></div>}

      {status === 'success' && (
        <>
          <section className="account-card">
            <ul className="seller-stats">
              {[
                ['gross', data.sales.finance.grossSalesMinor],
                ['fee', data.sales.finance.platformFeeMinor - data.sales.finance.feeReversedMinor],
                ['refunded', data.sales.finance.refundedMinor],
                ['net', data.sales.finance.netRevenueMinor],
              ].map(([id, value]) => (
                <li key={id}><div className="seller-stat"><span className="seller-stat__value">{price(value)}</span><span className="seller-stat__label">{t(`market.reports.${id}`)}</span></div></li>
              ))}
              {[
                ['placed', data.sales.orders.placed],
                ['completed', data.sales.orders.completed],
                ['cancelled', data.sales.orders.cancelled],
                ['returned', data.sales.orders.returned],
              ].map(([id, value]) => (
                <li key={id}><div className="seller-stat"><span className="seller-stat__value">{value}</span><span className="seller-stat__label">{t(`market.reports.orders.${id}`)}</span></div></li>
              ))}
            </ul>
            <p className="account-muted">{t('market.reports.aov', { value: price(data.sales.orders.averageCompletedOrderMinor) })}</p>
          </section>

          <section className="account-card seller-card">
            <h2 className="account-card__title seller-section-title"><Icon name="clock" size={18} />{t('market.reports.daily')}</h2>
            <div className="seller-table-wrap">
              <table className="seller-table">
                <thead>
                  <tr>
                    <th>{t('market.reports.date')}</th>
                    <th className="num">{t('market.reports.settledOrders')}</th>
                    <th className="num">{t('market.reports.gross')}</th>
                    <th className="num">{t('market.reports.fee')}</th>
                    <th className="num">{t('market.reports.net')}</th>
                    <th style={{ width: '30%' }} />
                  </tr>
                </thead>
                <tbody>
                  {data.sales.daily.map((d) => (
                    <tr key={d.date}>
                      <td>{new Date(d.date).toLocaleDateString(language)}</td>
                      <td className="num">{d.settledOrders}</td>
                      <td className="num">{price(d.grossSalesMinor)}</td>
                      <td className="num">{price(d.platformFeeMinor)}</td>
                      <td className="num"><strong>{price(d.netRevenueMinor)}</strong></td>
                      <td>
                        <span aria-hidden="true" style={{ display: 'block', height: 8, borderRadius: 4, background: 'var(--color-primary, currentColor)', width: `${Math.max(0, (d.netRevenueMinor / maxDaily) * 100)}%` }} />
                      </td>
                    </tr>
                  ))}
                  {data.sales.daily.length === 0 && <tr><td colSpan={6} className="seller-table__empty">{t('market.reports.empty')}</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <div className="seller-grid-2">
            <section className="account-card seller-card">
              <h2 className="account-card__title seller-section-title"><Icon name="star" size={18} />{t('market.reports.topProducts')}</h2>
              <div className="seller-table-wrap">
                <table className="seller-table">
                  <thead>
                    <tr>
                      <th>{t('seller.products.columns.product')}</th>
                      <th className="num">{t('market.reports.sold')}</th>
                      <th className="num">{t('market.reports.net')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.top.map((p) => (
                      <tr key={p.productId}>
                        <td>{p.productName}{p.quantityReturned > 0 && <span className="cell-sub">{t('market.reports.returnedQty', { count: p.quantityReturned })}</span>}</td>
                        <td className="num">{p.quantitySold}</td>
                        <td className="num">{price(p.netItemRevenueMinor)}</td>
                      </tr>
                    ))}
                    {data.top.length === 0 && <tr><td colSpan={3} className="seller-table__empty">{t('market.reports.empty')}</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="account-card seller-card">
              <h2 className="account-card__title seller-section-title"><Icon name="receipt" size={18} />{t('market.reports.orderStatuses')}</h2>
              <ul className="seller-stats">
                {data.statuses.map((row) => (
                  <li key={row.status}><div className="seller-stat"><span className="seller-stat__value">{row.count}</span><span className="seller-stat__label">{t(`shopOrderStatus.${row.status}`, { defaultValue: row.status })}</span></div></li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </>
  );
}

/** /seller/reports — Báo cáo doanh số (GET /shops/{id}/reports/*), xuất CSV đối soát. */
function ReportsScreen({ onNotify }) {
  const { t } = useLanguage();
  const { shopId } = useSeller();
  return (
    <SellerPage title={t('market.reports.title')} subtitle={t('market.reports.subtitle')}>
      <RequireShop>
        <ReportsPanel key={shopId} shopId={shopId} onNotify={onNotify} />
      </RequireShop>
    </SellerPage>
  );
}

export default ReportsScreen;
