import { useLanguage } from '../../hooks/useLanguage';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import './LanguageSwitcher.css';

// Nhóm 2 nút VI / EN. aria-pressed cho biết nút nào đang được chọn
// (trạng thái thể hiện bằng cả màu nền LẪN thuộc tính, không chỉ bằng màu).
function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="lang-switch" role="group" aria-label={t('language.label')}>
      {SUPPORTED_LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          className="lang-switch__btn"
          aria-pressed={language === code}
          aria-label={t(`language.${code}`)}
          lang={code}
          onClick={() => setLanguage(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

export default LanguageSwitcher;
