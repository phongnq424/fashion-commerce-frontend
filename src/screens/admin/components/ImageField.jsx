import Icon from '../../../components/common/Icon';
import Input from '../../../components/common/Input';

const URL = /^(https?:\/\/|\/)\S+$/i;

// Ô nhập link ảnh + ảnh xem trước (backend chưa có API tải ảnh lên nên dùng đường link)
function ImageField({ label, hint, value, onChange, error, ratio = 'square' }) {
  return (
    <div className="image-field">
      <Input label={label} hint={hint} value={value} onChange={(e) => onChange(e.target.value)} error={error} placeholder="https://..." />
      <span className={`image-field__preview image-field__preview--${ratio}`}>
        {URL.test(value ?? '') ? <img src={value} alt="" /> : <Icon name="image" size={22} />}
      </span>
    </div>
  );
}

export default ImageField;
