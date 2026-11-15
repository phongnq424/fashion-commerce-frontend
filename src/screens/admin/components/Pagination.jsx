import Icon from '../../../components/common/Icon';
import { useLanguage } from '../../../hooks/useLanguage';

export const PAGE_SIZE = 20;

// Cắt danh sách theo trang (backend hỗ trợ ?limit=&offset= — khi nối API có thể chuyển sang phân trang ở server)
export const pageItems = (items, page) => items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

/**
 * Thanh phân trang dưới bảng: "Hiển thị 1–20 / 85"  ‹ 1 2 3 … 5 ›
 * total: tổng số dòng • page: trang hiện tại (từ 1) • onChange(page)
 */
function Pagination({ total, page, onChange }) {
  const { t } = useLanguage();
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;

  const numbers = [];
  for (let i = 1; i <= pages; i += 1) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) numbers.push(i);
    else if (numbers[numbers.length - 1] !== '…') numbers.push('…');
  }

  return (
    <nav className="pagination" aria-label={t('admin.pagination.label')}>
      <span className="cell-sub">
        {t('admin.pagination.showing', { from: (page - 1) * PAGE_SIZE + 1, to: Math.min(page * PAGE_SIZE, total), total })}
      </span>
      <div className="pagination__pages">
        <button type="button" className="pagination__btn" disabled={page === 1} aria-label={t('admin.pagination.prev')} onClick={() => onChange(page - 1)}>
          <Icon name="chevronLeft" size={16} />
        </button>
        {numbers.map((n, i) =>
          n === '…' ? (
            <span key={`gap-${i}`} className="pagination__gap">
              …
            </span>
          ) : (
            <button key={n} type="button" className={`pagination__btn ${n === page ? 'pagination__btn--active' : ''}`} aria-current={n === page ? 'page' : undefined} onClick={() => onChange(n)}>
              {n}
            </button>
          ),
        )}
        <button type="button" className="pagination__btn" disabled={page === pages} aria-label={t('admin.pagination.next')} onClick={() => onChange(page + 1)}>
          <Icon name="chevronRight" size={16} />
        </button>
      </div>
    </nav>
  );
}

export default Pagination;
