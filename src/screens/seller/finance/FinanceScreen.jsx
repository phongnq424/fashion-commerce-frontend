import { useCallback, useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';
import StatusBadge from '../../../components/common/StatusBadge';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';
import {
  cancelPayout,
  getFinanceAccount,
  getFinanceSettings,
  getPayouts,
  getSettlements,
  getTransactions,
  requestPayout,
} from '../../../services/seller/financeService';
import { formatPrice } from '../../../utils/format';
import { formatDateTime, statusTone } from '../../../utils/status';
import RequireShop from '../components/RequireShop';
import SellerPage from '../components/SellerPage';

const TABS = ['payouts', 'transactions', 'settlements'];

function FinancePanel({ shopId, onNotify }) {
  const { t, language } = useLanguage();
  const price = (value) => formatPrice(value ?? 0, language);
  const [account, setAccount] = useState(null);
  const [settings, setSettings] = useState(null);
  const [tab, setTab] = useState('payouts');
  const [rows, setRows] = useState({ payouts: [], transactions: [], settlements: [] });
  const [status, setStatus] = useState('loading');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [acc, set, payouts, transactions, settlements] = await Promise.all([
        getFinanceAccount(shopId),
        getFinanceSettings(shopId),
        getPayouts(shopId, { limit: 50 }),
        getTransactions(shopId, { limit: 50 }),
        getSettlements(shopId, { limit: 50 }),
      ]);
      setAccount(acc);
      setSettings(set);
      setRows({ payouts: payouts.items ?? [], transactions: transactions.items ?? [], settlements: settlements.items ?? [] });
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus(error?.status === 403 ? 'forbidden' : 'error');
    }
  }, [shopId]);

  useEffect(() => {
    load();
  }, [load]);

  const errorText = (error) => t(`market.errors.${error?.code}`, { defaultValue: t('account.actionError') });

  const submitPayout = async (event) => {
    event.preventDefault();
    const value = Number(amount);
    if (!(value > 0)) return;
    setBusy(true);
    try {
      await requestPayout(shopId, { amountMinor: value, note });
      onNotify?.('success', t('market.finance.payoutRequested'));
      setAmount('');
      setNote('');
      await load();
    } catch (error) {
      onNotify?.('error', errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (payout) => {
    setBusy(true);
    try {
      await cancelPayout(shopId, payout);
      await load();
    } catch (error) {
      onNotify?.('error', errorText(error));
    } finally {
      setBusy(false);
    }
  };

  if (status === 'loading') return <div className="account-skeleton" />;
  if (status === 'forbidden') return <div className="account-card"><EmptyState icon="shield" title={t('market.seller.noPermission')} /></div>;
  if (status === 'error') return <div className="account-card"><EmptyState tone="error" icon="alert" title={t('account.loadError')} action={<Button variant="secondary" onClick={load}>{t('common.retry')}</Button>} /></div>;

  return (
    <>
      <section className="account-card">
        <ul className="seller-stats">
          <li><div className="seller-stat"><span className="seller-stat__value">{price(account.availableBalanceMinor)}</span><span className="seller-stat__label">{t('market.finance.available')}</span></div></li>
          <li><div className="seller-stat"><span className="seller-stat__value">{price(account.pendingPayoutMinor)}</span><span className="seller-stat__label">{t('market.finance.pending')}</span></div></li>
          <li><div className="seller-stat"><span className="seller-stat__value">{price(account.paidOutMinor)}</span><span className="seller-stat__label">{t('market.finance.paidOut')}</span></div></li>
          <li><div className="seller-stat"><span className="seller-stat__value">{(settings.platformFeeRateBp / 100).toLocaleString(language)}%</span><span className="seller-stat__label">{t('market.finance.platformFee')}</span></div></li>
        </ul>
      </section>

      <section className="account-card">
        <h2 className="account-card__title seller-section-title">
          <Icon name="card" size={18} />
          {t('market.finance.requestTitle')}
        </h2>
        <p className="account-muted">{t('market.finance.requestHint', { min: price(settings.minimumPayoutMinor) })}</p>
        <form className="seller-form" onSubmit={submitPayout}>
          <div className="seller-form__row">
            <Input label={t('market.finance.amount')} type="number" min={settings.minimumPayoutMinor} max={account.availableBalanceMinor} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input label={t('market.finance.note')} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="seller-form__actions">
            <Button type="submit" disabled={busy || !(Number(amount) >= settings.minimumPayoutMinor) || Number(amount) > account.availableBalanceMinor}>
              {t('market.finance.request')}
            </Button>
          </div>
        </form>
      </section>

      <div className="account-tabs" role="tablist">
        {TABS.map((id) => (
          <button key={id} type="button" role="tab" className="account-tabs__tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {t(`market.finance.tabs.${id}`)}
          </button>
        ))}
      </div>

      <section className="account-card seller-card">
        <div className="seller-table-wrap">
          {tab === 'payouts' && (
            <table className="seller-table">
              <thead>
                <tr>
                  <th>{t('market.finance.columns.code')}</th>
                  <th className="num">{t('market.finance.amount')}</th>
                  <th>{t('seller.orders.columns.status')}</th>
                  <th>{t('market.finance.columns.note')}</th>
                  <th>{t('market.finance.columns.createdAt')}</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {rows.payouts.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.payoutNumber}</strong>{p.paymentReference && <span className="cell-sub">{p.paymentReference}</span>}</td>
                    <td className="num">{price(p.amountMinor)}</td>
                    <td><StatusBadge tone={statusTone(p.status)}>{t(`market.payoutStatus.${p.status}`)}</StatusBadge></td>
                    <td>{p.decisionNote || p.sellerNote || '—'}</td>
                    <td>{formatDateTime(p.createdAt, language)}</td>
                    <td className="actions">
                      {p.status === 'REQUESTED' && (
                        <button type="button" className="text-btn" disabled={busy} onClick={() => cancel(p)}>{t('common.cancel')}</button>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.payouts.length === 0 && <tr><td colSpan={6} className="seller-table__empty">{t('market.finance.empty')}</td></tr>}
              </tbody>
            </table>
          )}
          {tab === 'transactions' && (
            <table className="seller-table">
              <thead>
                <tr>
                  <th>{t('market.finance.columns.time')}</th>
                  <th>{t('market.finance.columns.type')}</th>
                  <th>{t('market.finance.columns.description')}</th>
                  <th className="num">{t('market.finance.amount')}</th>
                  <th className="num">{t('market.finance.columns.balance')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.transactions.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDateTime(e.occurredAt, language)}</td>
                    <td>{t(`market.financeEntry.${e.type}`, { defaultValue: e.type })}</td>
                    <td>{e.description || '—'}</td>
                    <td className="num" style={{ color: e.amountMinor < 0 ? 'var(--color-danger, #c0392b)' : undefined }}>{price(e.amountMinor)}</td>
                    <td className="num">{price(e.balanceAfterMinor)}</td>
                  </tr>
                ))}
                {rows.transactions.length === 0 && <tr><td colSpan={5} className="seller-table__empty">{t('market.finance.empty')}</td></tr>}
              </tbody>
            </table>
          )}
          {tab === 'settlements' && (
            <table className="seller-table">
              <thead>
                <tr>
                  <th>{t('market.finance.columns.time')}</th>
                  <th className="num">{t('market.reports.gross')}</th>
                  <th className="num">{t('market.reports.fee')}</th>
                  <th className="num">{t('market.reports.refunded')}</th>
                  <th className="num">{t('market.reports.net')}</th>
                  <th>{t('seller.orders.columns.status')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.settlements.map((s) => (
                  <tr key={s.id}>
                    <td>{formatDateTime(s.settledAt, language)}</td>
                    <td className="num">{price(s.grossSalesMinor)}</td>
                    <td className="num">−{price(s.platformFeeMinor - s.feeReversedMinor)}</td>
                    <td className="num">−{price(s.refundedMinor)}</td>
                    <td className="num"><strong>{price(s.netRevenueMinor)}</strong></td>
                    <td>{s.status}</td>
                  </tr>
                ))}
                {rows.settlements.length === 0 && <tr><td colSpan={6} className="seller-table__empty">{t('market.finance.empty')}</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}

/** /seller/finance — Số dư, phí sàn, yêu cầu rút tiền (admin sàn duyệt), lịch sử giao dịch và đối soát. */
function FinanceScreen({ onNotify }) {
  const { t } = useLanguage();
  const { shopId } = useSeller();
  return (
    <SellerPage title={t('market.finance.title')} subtitle={t('market.finance.subtitle')}>
      <RequireShop>
        <FinancePanel key={shopId} shopId={shopId} onNotify={onNotify} />
      </RequireShop>
    </SellerPage>
  );
}

export default FinanceScreen;
