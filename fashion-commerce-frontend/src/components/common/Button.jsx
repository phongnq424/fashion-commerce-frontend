import './Button.css';

/**
 * Nút dùng chung cho toàn site.
 * - variant: 'primary' | 'secondary' | 'ghost' | 'soft' (nền trắng, chữ màu thương hiệu)
 * - size: 'md' | 'sm'
 * - as: 'button' (mặc định) hoặc 'a' để làm link trông như nút
 * - fullWidth: chiếm hết chiều ngang
 * Các props khác (onClick, type, disabled, href, aria-*) được truyền thẳng xuống thẻ HTML.
 */
function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  type,
  children,
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Thẻ <button> mặc định là type="submit" trong form -> đặt rõ "button" để tránh gửi form ngoài ý muốn
  const buttonType = Tag === 'button' ? (type ?? 'button') : undefined;

  return (
    <Tag className={classes} type={buttonType} {...rest}>
      {children}
    </Tag>
  );
}

export default Button;
