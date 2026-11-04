import Icon from '../common/Icon';

// Khung báo lỗi chung của cả form (vd "Email hoặc mật khẩu không đúng"), có icon + chữ
function FormAlert({ message }) {
  if (!message) return null;
  return (
    <p className="auth-alert" role="alert">
      <Icon name="alert" size={18} />
      {message}
    </p>
  );
}

export default FormAlert;
