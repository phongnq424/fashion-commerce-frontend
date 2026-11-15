import { Link } from 'react-router-dom';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import { useLanguage } from '../../../hooks/useLanguage';
import { useSeller } from '../../../hooks/useSeller';

/**
 * Bọc các trang cần có shop (sản phẩm, đơn hàng...). Chưa có shop nào -> mời đăng ký bán hàng.
 * children: hàm (shopId) => nội dung, hoặc nội dung thường.
 */
function RequireShop({ children }) {
  const { t } = useLanguage();
  const { shopId, onboarding } = useSeller();

  if (!shopId) {
    const pending = onboarding?.status === 'PENDING_REVIEW';
    return (
      <div className="account-card">
        <EmptyState
          icon="store"
          title={pending ? t('seller.noShop.pendingTitle') : t('seller.noShop.title')}
          text={pending ? t('seller.noShop.pendingText') : t('seller.noShop.text')}
          action={
            <Button as={Link} to={pending ? '/seller/register/status' : '/seller'}>
              {pending ? t('seller.noShop.viewStatus') : t('seller.noShop.start')}
            </Button>
          }
        />
      </div>
    );
  }
  return typeof children === 'function' ? children(shopId) : children;
}

export default RequireShop;
