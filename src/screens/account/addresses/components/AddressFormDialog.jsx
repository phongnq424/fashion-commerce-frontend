import { useEffect, useState } from 'react';
import Button from '../../../../components/common/Button';
import Dialog from '../../../../components/common/Dialog';
import Input from '../../../../components/common/Input';
import Select from '../../../../components/common/Select';
import { useLanguage } from '../../../../hooks/useLanguage';
import { getDistricts, getProvinces, getWards } from '../../../../services/locationService';

const EMPTY = {
  recipientName: '',
  recipientPhone: '',
  addressLine1: '',
  addressLine2: '',
  province: '',
  provinceCode: '',
  district: '',
  ward: '',
  countryCode: 'VN',
  defaultAddress: false,
};

// Số di động VN: 0xxxxxxxxx | 84xxxxxxxxx | +84xxxxxxxxx (giống quy tắc backend dùng cho tài khoản)
const PHONE_PATTERN = /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/;

function validate(form) {
  const errors = {};
  if (!form.recipientName.trim()) errors.recipientName = 'addresses.errors.name';
  if (!PHONE_PATTERN.test(form.recipientPhone.replace(/[\s.]/g, ''))) errors.recipientPhone = 'addresses.errors.phone';
  if (!form.province) errors.province = 'addresses.errors.province';
  if (!form.district) errors.district = 'addresses.errors.district';
  if (!form.ward) errors.ward = 'addresses.errors.ward';
  if (!form.addressLine1.trim()) errors.addressLine1 = 'addresses.errors.line1';
  return errors;
}

/**
 * Popup thêm / sửa địa chỉ.
 * - address: null = thêm mới | AddressResponse = sửa
 * - onSubmit(form) -> Promise. Lỗi API do trang cha báo.
 * Tỉnh / Quận / Phường lấy từ locationService (đang là dữ liệu giả của frontend). Backend chỉ lưu
 * TÊN (province, district, ward) + provinceCode, nên dữ liệu chọn ở đây gửi lên dưới dạng tên.
 */
function AddressFormDialog({ open, address, onClose, onSubmit }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [ids, setIds] = useState({ province: '', district: '', ward: '' });

  // Mở popup -> nạp dữ liệu ban đầu
  useEffect(() => {
    if (!open) return;
    setForm(address ? { ...EMPTY, ...address, addressLine2: address.addressLine2 ?? '' } : EMPTY);
    setErrors({});
    getProvinces().then(setProvinces);
  }, [open, address]);

  // Sửa địa chỉ cũ: tìm lại id tỉnh / quận / phường theo tên
  useEffect(() => {
    if (!open || !address || provinces.length === 0) return;
    const province = provinces.find((item) => item.name === address.province || item.id === address.provinceCode);
    if (!province) return;
    (async () => {
      const districtList = await getDistricts(province.id);
      const district = districtList.find((item) => item.name === address.district);
      const wardList = district ? await getWards(district.id) : [];
      const ward = wardList.find((item) => item.name === address.ward);
      setDistricts(districtList);
      setWards(wardList);
      setIds({ province: province.id, district: district?.id ?? '', ward: ward?.id ?? '' });
    })();
  }, [open, address, provinces]);

  useEffect(() => {
    if (!open || address) return;
    setIds({ province: '', district: '', ward: '' });
    setDistricts([]);
    setWards([]);
  }, [open, address]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const chooseProvince = async (id) => {
    const province = provinces.find((item) => item.id === id);
    setIds({ province: id, district: '', ward: '' });
    setForm((current) => ({ ...current, province: province?.name ?? '', provinceCode: id, district: '', ward: '' }));
    setErrors((current) => ({ ...current, province: undefined }));
    setWards([]);
    setDistricts(id ? await getDistricts(id) : []);
  };

  const chooseDistrict = async (id) => {
    const district = districts.find((item) => item.id === id);
    setIds((current) => ({ ...current, district: id, ward: '' }));
    setForm((current) => ({ ...current, district: district?.name ?? '', ward: '' }));
    setErrors((current) => ({ ...current, district: undefined }));
    setWards(id ? await getWards(id) : []);
  };

  const chooseWard = (id) => {
    const ward = wards.find((item) => item.id === id);
    setIds((current) => ({ ...current, ward: id }));
    update('ward', ward?.name ?? '');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validate(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  };

  const errorText = (key) => (errors[key] ? t(errors[key]) : undefined);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={address ? t('addresses.editTitle') : t('addresses.addTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="address-form" disabled={saving}>
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </>
      }
    >
      <form id="address-form" className="address-form" onSubmit={handleSubmit} noValidate>
        <div className="address-form__row">
          <Input
            label={t('addresses.fields.name')}
            value={form.recipientName}
            onChange={(event) => update('recipientName', event.target.value)}
            error={errorText('recipientName')}
            autoComplete="name"
            maxLength={160}
          />
          <Input
            label={t('addresses.fields.phone')}
            value={form.recipientPhone}
            onChange={(event) => update('recipientPhone', event.target.value)}
            error={errorText('recipientPhone')}
            inputMode="tel"
            autoComplete="tel"
            placeholder="0901234567"
          />
        </div>
        <Select
          label={t('addresses.fields.province')}
          placeholder={t('addresses.choose')}
          options={provinces}
          value={ids.province}
          onChange={chooseProvince}
          error={errorText('province')}
        />
        <div className="address-form__row">
          <Select
            label={t('addresses.fields.district')}
            placeholder={t('addresses.choose')}
            options={districts}
            value={ids.district}
            onChange={chooseDistrict}
            disabled={!ids.province}
            error={errorText('district')}
          />
          <Select
            label={t('addresses.fields.ward')}
            placeholder={t('addresses.choose')}
            options={wards}
            value={ids.ward}
            onChange={chooseWard}
            disabled={!ids.district}
            error={errorText('ward')}
          />
        </div>
        <Input
          label={t('addresses.fields.line1')}
          value={form.addressLine1}
          onChange={(event) => update('addressLine1', event.target.value)}
          error={errorText('addressLine1')}
          autoComplete="address-line1"
          placeholder={t('addresses.line1Placeholder')}
        />
        <Input
          label={t('addresses.fields.line2')}
          value={form.addressLine2}
          onChange={(event) => update('addressLine2', event.target.value)}
          autoComplete="address-line2"
        />
        <label className="check">
          <input
            type="checkbox"
            checked={form.defaultAddress}
            disabled={address?.defaultAddress}
            onChange={(event) => update('defaultAddress', event.target.checked)}
          />
          <span>{t('addresses.fields.default')}</span>
        </label>
      </form>
    </Dialog>
  );
}

export default AddressFormDialog;
