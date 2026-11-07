import { useEffect, useRef, useState } from 'react';
import Select from '../../../components/common/Select';
import { useLanguage } from '../../../hooks/useLanguage';
import { getDistricts, getProvinces, getWards } from '../../../services/locationService';

/**
 * 3 ô chọn nối nhau: Tỉnh / thành -> Quận / huyện -> Phường / xã.
 * Chọn cấp trên thì cấp dưới được xoá và tải lại danh sách mới.
 * - value: { provinceId, districtId, wardId }
 * - onChange(patch): vd { provinceId, provinceName, districtId: '', ... }
 * - errors: { provinceId, districtId, wardId } (chuỗi đã dịch)
 */
function AddressFields({ value, onChange, errors = {} }) {
  const { t } = useLanguage();
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  // Giá trị lúc mới mở form (quay lại từ bước thanh toán thì đã có sẵn tỉnh/quận)
  const [initial] = useState(value);

  // Đếm số lần gọi: khách đổi tỉnh liên tục -> chỉ nhận kết quả của lần chọn CUỐI
  const districtRequest = useRef(0);
  const wardRequest = useRef(0);

  const loadDistricts = (provinceId) => {
    const requestId = ++districtRequest.current;
    getDistricts(provinceId).then((list) => {
      if (requestId === districtRequest.current) setDistricts(list);
    });
  };

  const loadWards = (districtId) => {
    const requestId = ++wardRequest.current;
    getWards(districtId).then((list) => {
      if (requestId === wardRequest.current) setWards(list);
    });
  };

  // Mở form: tải danh sách tỉnh (+ quận, phường nếu đã chọn trước đó). Chỉ chạy 1 lần.
  useEffect(() => {
    let active = true;
    getProvinces().then((list) => {
      if (active) setProvinces(list);
    });
    if (initial.provinceId) loadDistricts(initial.provinceId);
    if (initial.districtId) loadWards(initial.districtId);
    return () => {
      active = false;
    };
  }, [initial]);

  const nameOf = (list, id) => list.find((item) => item.id === id)?.name ?? '';

  const handleProvince = (provinceId) => {
    onChange({
      provinceId,
      provinceName: nameOf(provinces, provinceId),
      districtId: '',
      districtName: '',
      wardId: '',
      wardName: '',
    });
    setDistricts([]);
    setWards([]);
    if (provinceId) loadDistricts(provinceId);
  };

  const handleDistrict = (districtId) => {
    onChange({ districtId, districtName: nameOf(districts, districtId), wardId: '', wardName: '' });
    setWards([]);
    if (districtId) loadWards(districtId);
  };

  const handleWard = (wardId) => {
    onChange({ wardId, wardName: nameOf(wards, wardId) });
  };

  return (
    <div className="shipping-form__row shipping-form__row--address">
      <Select
        label={t('checkout.province')}
        placeholder={t('checkout.provincePlaceholder')}
        options={provinces}
        value={value.provinceId}
        onChange={handleProvince}
        error={errors.provinceId}
        autoComplete="address-level1"
      />
      <Select
        label={t('checkout.district')}
        placeholder={t('checkout.districtPlaceholder')}
        options={districts}
        value={value.districtId}
        onChange={handleDistrict}
        error={errors.districtId}
        disabled={!value.provinceId}
        autoComplete="address-level2"
      />
      <Select
        label={t('checkout.ward')}
        placeholder={t('checkout.wardPlaceholder')}
        options={wards}
        value={value.wardId}
        onChange={handleWard}
        error={errors.wardId}
        disabled={!value.districtId}
        autoComplete="address-level3"
      />
    </div>
  );
}

export default AddressFields;
