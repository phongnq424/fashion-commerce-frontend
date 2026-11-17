import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@shared/components/common/Button';
import Dialog from '@shared/components/common/Dialog';
import Icon from '@shared/components/common/Icon';
import StatusBadge from '@shared/components/common/StatusBadge';
import Textarea from '@shared/components/common/Textarea';
import { useLanguage } from '@shared/hooks/useLanguage';
import { CASE_STATUSES, getAllPages, getModerationCase, getModerationCases, moderateProduct, PAGE, PRODUCT_ACTIONS } from '../../services/platformService';
import { formatDateTime, statusTone } from '@shared/utils/status';
import AdminPage from '../components/AdminPage';
import { ListState, Pager, ShopCell, StatusTabs, useErrorText, useShopDirectory } from '../components/AdminParts';

function CaseDialog({ caseId, shops, openByShop, onClose, onDone, onNotify }) {
  const { t, language } = useLanguage();
  const errorText = useErrorText();
  const [detail, setDetail] = useState(null);
  const [action, setAction] = useState('DISMISS');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadedId, setLoadedId] = useState(null);

  if (caseId && loadedId !== caseId) {
    setLoadedId(caseId);
    setDetail(null);
    setReason('');
    getModerationCase(caseId).then(setDetail).catch((error) => onNotify?.('error', errorText(error)));
  }

  const submit = async () => {
    setBusy(true);
    try {
      await moderateProduct(detail.productId, { caseId: detail.id, action, reason });
      onNotify?.('success', t('market.admin.cases.done'));
      onDone();
    } catch (error) {
      onNotify?.('error', errorText(error));
    } finally {
      setBusy(false);
    }
  };

  const open = Boolean(caseId);
  const resolvable = detail && ['OPEN', 'UNDER_REVIEW'].includes(detail.status);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={detail?.productName ?? t('market.admin.cases.title')}
      footer={
        resolvable && (
          <>
            <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
            <Button disabled={busy || !reason.trim()} onClick={submit}>{t('market.admin.cases.apply')}</Button>
          </>
        )
      }
    >
      {!detail ? (
        <div className="account-skeleton" />
      ) : (
        <>
          {/* Sản phẩm này thuộc shop nào — để quyết định cảnh báo / ẩn / gỡ, hoặc xử lý cả shop nếu tái phạm */}
          <div className="admin-shop-box">
            <div>
              <p className="cell-sub">{t('admin.platform.shopRef.ofShop')}</p>
              <ShopCell shopId={detail.shopId} shops={shops} />
            </div>
            <div className="admin-shop-box__meta">
              <strong>{t('admin.platform.shopRef.openCases', { count: openByShop.get(detail.shopId) ?? 0 })}</strong>
              <Link to={`/shops?shop=${detail.shopId}`} className="account-link">
                {t('admin.platform.shopRef.manage')}
              </Link>
            </div>
          </div>
          <dl className="checkout-review">
            <div className="checkout-review__row"><dt>{t('market.admin.cases.reason')}</dt><dd>{t(`market.reportReasons.${detail.reasonCode}`, { defaultValue: detail.reasonCode })}</dd></div>
            <div className="checkout-review__row"><dt>{t('market.admin.cases.description')}</dt><dd>{detail.description || '—'}</dd></div>
            <div className="checkout-review__row"><dt>{t('market.admin.cases.evidence')}</dt><dd>{(detail.evidenceKeys ?? []).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="account-link">{url}</a>)}</dd></div>
            <div className="checkout-review__row"><dt>{t('market.admin.cases.reportedAt')}</dt><dd>{formatDateTime(detail.createdAt, language)}</dd></div>
            {detail.resolutionAction && <div className="checkout-review__row"><dt>{t('market.admin.cases.resolution')}</dt><dd>{detail.resolutionAction} — {detail.resolutionNote}</dd></div>}
          </dl>
          <p><Link to={`/product/${detail.productId}`} target="_blank" className="account-link">{t('market.admin.cases.viewProduct')}</Link></p>
          {resolvable && (
            <>
              <fieldset className="payment-methods">
                <legend className="payment-methods__legend">{t('market.admin.cases.action')}</legend>
                {PRODUCT_ACTIONS.map((a) => (
                  <label key={a} className={`payment-method ${action === a ? 'payment-method--active' : ''}`}>
                    <span className="payment-method__head">
                      <input type="radio" className="payment-method__radio" name="case-action" checked={action === a} onChange={() => setAction(a)} />
                      <span className="payment-method__title">{t(`market.admin.cases.actions.${a}`)}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <Textarea label={t('market.admin.reason')} value={reason} maxLength={2000} rows={3} onChange={(e) => setReason(e.target.value)} />
            </>
          )}
        </>
      )}
    </Dialog>
  );
}

/**
 * /admin/product-cases — Sản phẩm bị khách báo cáo vi phạm (cảnh báo / ẩn / gỡ / khôi phục / bỏ qua).
 * Sàn nhiều shop: mỗi báo cáo hiện rõ SẢN PHẨM CỦA SHOP NÀO (case.shopId -> tên shop qua danh bạ shop),
 * lọc theo shop và đếm số báo cáo đang mở của từng shop (shop tái phạm nhiều -> cân nhắc tạm khóa shop).
 * BE chưa có tham số lọc shopId cho /cases nên FE tải hết theo trạng thái (tối đa 1.000) rồi lọc/phân trang tại chỗ.
 */
function ProductCaseScreen({ onNotify }) {
  const { t, language } = useLanguage();
  const shops = useShopDirectory();
  const [status, setStatus] = useState('OPEN');
  const [shopFilter, setShopFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState([]);
  const [openRows, setOpenRows] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoadState('loading');
    try {
      const [current, open] = await Promise.all([getAllPages(getModerationCases, { status }, 10), status === 'OPEN' ? null : getAllPages(getModerationCases, { status: 'OPEN' }, 10)]);
      setRows(current.items);
      setOpenRows(open ? open.items : current.items);
      setLoadState('success');
    } catch (error) {
      setLoadState(error?.status === 403 ? 'forbidden' : 'error');
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  // Số báo cáo ĐANG MỞ theo shop (cho hộp thoại) và số báo cáo theo shop trong tab hiện tại (cho bộ lọc)
  const openByShop = useMemo(() => countBy(openRows), [openRows]);
  const countInTab = useMemo(() => countBy(rows), [rows]);
  const filtered = shopFilter ? rows.filter((row) => row.shopId === shopFilter) : rows;
  const pageRows = filtered.slice(page * PAGE, (page + 1) * PAGE);
  const shopName = (id) => shops?.get(id)?.name ?? id.slice(0, 8);

  return (
    <AdminPage title={t('market.admin.cases.title')} subtitle={t('market.admin.cases.subtitle')}>
      <StatusTabs
        value={status}
        options={CASE_STATUSES}
        onChange={(value) => {
          setStatus(value);
          setPage(0);
        }}
        labelPrefix="market.caseStatus"
      />
      <section className="account-card admin-card">
        {loadState === 'success' && rows.length > 0 && (
          <div className="admin-toolbar admin-shop-filter">
            <label className="admin-shop-filter">
              <Icon name="store" size={18} />
              <span className="visually-hidden">{t('admin.platform.shopRef.filter')}</span>
              <select
                className="seller-select"
                value={shopFilter}
                aria-label={t('admin.platform.shopRef.filter')}
                onChange={(e) => {
                  setShopFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">{t('admin.platform.shopRef.allShops', { count: countInTab.size })}</option>
                {[...countInTab.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([id, count]) => (
                    <option key={id} value={id}>
                      {shopName(id)} ({count})
                    </option>
                  ))}
              </select>
            </label>
            {shopFilter && (
              <span className="admin-filter-chip">
                {shopName(shopFilter)}
                <button type="button" aria-label={t('admin.platform.shopRef.clear')} onClick={() => setShopFilter('')}>
                  <Icon name="close" size={14} />
                </button>
              </span>
            )}
          </div>
        )}
        <ListState status={loadState} onRetry={load} />
        {loadState === 'success' && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('seller.products.columns.product')}</th>
                  <th>{t('admin.platform.shopRef.shop')}</th>
                  <th>{t('market.admin.cases.reason')}</th>
                  <th>{t('seller.orders.columns.status')}</th>
                  <th>{t('market.admin.cases.reportedAt')}</th>
                  <th className="actions" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <strong>{row.productName}</strong>
                    </td>
                    <td>
                      <ShopCell shopId={row.shopId} shops={shops} />
                      {(openByShop.get(row.shopId) ?? 0) > 1 && <span className="cell-sub">{t('admin.platform.shopRef.openCases', { count: openByShop.get(row.shopId) })}</span>}
                    </td>
                    <td>{t(`market.reportReasons.${row.reasonCode}`, { defaultValue: row.reasonCode })}</td>
                    <td>
                      <StatusBadge tone={statusTone(row.status === 'OPEN' ? 'PENDING' : row.status)}>{t(`market.caseStatus.${row.status}`, { defaultValue: row.status })}</StatusBadge>
                    </td>
                    <td>{formatDateTime(row.createdAt, language)}</td>
                    <td className="actions">
                      <button type="button" className="text-btn" onClick={() => setOpenId(row.id)}>
                        {t('market.admin.view')}
                      </button>
                    </td>
                  </tr>
                ))}
                {pageRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="admin-table__empty">
                      {t('market.admin.empty')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} hasMore={(page + 1) * PAGE < filtered.length} onChange={setPage} />
      </section>
      <CaseDialog
        caseId={openId}
        shops={shops}
        openByShop={openByShop}
        onClose={() => setOpenId(null)}
        onDone={() => {
          setOpenId(null);
          load();
        }}
        onNotify={onNotify}
      />
    </AdminPage>
  );
}

function countBy(list) {
  const map = new Map();
  list.forEach((row) => map.set(row.shopId, (map.get(row.shopId) ?? 0) + 1));
  return map;
}

export default ProductCaseScreen;
