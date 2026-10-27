import Icon from '../common/Icon';
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';

// Nút chỉ có icon -> BẮT BUỘC có aria-label mô tả hành động khi bấm
function ThemeSwitcher() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';
  const label = isDark ? t('theme.toLight') : t('theme.toDark');

  return (
    <button type="button" className="icon-btn" onClick={toggleTheme} aria-label={label} title={label}>
      {/* Đang tối -> hiện mặt trời (bấm để sang sáng) và ngược lại */}
      <Icon name={isDark ? 'sun' : 'moon'} />
    </button>
  );
}

export default ThemeSwitcher;
