import { useCallback, useEffect, useState } from 'react';
import { PAGE } from '../../../services/admin/platformService';

/**
 * Tải 1 danh sách dạng SliceResponse { items, hasMore } có phân trang ở server (limit/offset).
 * - loader({ limit, offset, ...filters }) -> Promise<SliceResponse>
 * - filters: object lọc (status, query...). Đổi filters -> về trang 1.
 * status: 'loading' | 'success' | 'error' | 'forbidden' (403: tài khoản không có quyền này)
 */
export function useAdminList(loader, filters) {
  const [page, setPage] = useState(0);
  const [data, setData] = useState({ items: [], hasMore: false });
  const [status, setStatus] = useState('loading');
  const key = JSON.stringify(filters);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const result = await loader({ ...JSON.parse(key), limit: PAGE, offset: page * PAGE });
      setData({ items: result?.items ?? [], hasMore: Boolean(result?.hasMore) });
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus(error?.status === 403 ? 'forbidden' : 'error');
    }
  }, [loader, key, page]);

  useEffect(() => {
    setPage(0);
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, status, page, setPage, reload: load };
}
