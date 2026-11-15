import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import Textarea from '../../../../components/common/Textarea';
import { useLanguage } from '../../../../hooks/useLanguage';
import { TARGET_GENDERS } from '../../../../services/seller/sellerProductService';

/**
 * Các ô thông tin cơ bản của sản phẩm (dùng cho cả Tạo mới và Sửa).
 * - value: { name, sellerProductCode, categoryId, targetGender, description, material, fitType, careInstructions }
 * - onChange(key, value)   - errors: { key: chữ lỗi }   - categories: [{ id, name }]
 */
function BasicInfoFields({ value, onChange, errors = {}, categories }) {
  const { t } = useLanguage();
  const set = (key) => (event) => onChange(key, event?.target ? event.target.value : event);
  const genders = TARGET_GENDERS.map((id) => ({ id, name: t(`seller.genders.${id}`) }));

  return (
    <div className="seller-form">
      <Input label={t('seller.productForm.name')} value={value.name} maxLength={240} onChange={set('name')} error={errors.name} hint={t('seller.productForm.nameHint')} />
      <div className="seller-form__row seller-form__row--3">
        <Select label={t('seller.productForm.category')} placeholder={t('addresses.choose')} options={categories} value={value.categoryId} onChange={set('categoryId')} error={errors.categoryId} />
        <Select label={t('seller.productForm.gender')} options={genders} value={value.targetGender} onChange={set('targetGender')} />
        <Input label={t('seller.productForm.code')} value={value.sellerProductCode} maxLength={80} onChange={set('sellerProductCode')} />
      </div>
      <Textarea label={t('seller.productForm.description')} value={value.description} maxLength={20000} rows={6} onChange={set('description')} error={errors.description} />
      <div className="seller-form__row">
        <Input label={t('seller.productForm.material')} value={value.material} maxLength={160} onChange={set('material')} />
        <Input label={t('seller.productForm.fit')} value={value.fitType} maxLength={80} onChange={set('fitType')} placeholder={t('seller.productForm.fitPlaceholder')} />
      </div>
      <Textarea label={t('seller.productForm.care')} value={value.careInstructions} maxLength={5000} rows={2} onChange={set('careInstructions')} />
    </div>
  );
}

export default BasicInfoFields;
