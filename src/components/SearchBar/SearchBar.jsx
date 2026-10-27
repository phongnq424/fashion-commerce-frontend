import { useState } from 'react';
import Icon from '../common/Icon';
import { useLanguage } from '../../hooks/useLanguage';
import './SearchBar.css';

/**
 * Ô tìm kiếm. Dùng <form role="search"> để trình đọc màn hình nhận biết đây là vùng tìm kiếm.
 * onSearch(query) được gọi khi gửi form; trang cha quyết định làm gì (sau này: chuyển sang trang kết quả).
 */
function SearchBar({ onSearch, className = '', autoFocus = false }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault(); // chặn trình duyệt tải lại trang
    onSearch?.(query.trim());
  };

  return (
    <form role="search" className={`search ${className}`} onSubmit={handleSubmit}>
      <label htmlFor="site-search" className="visually-hidden">
        {t('search.label')}
      </label>
      <Icon name="search" size={18} className="search__icon" />
      <input
        id="site-search"
        type="search"
        className="search__input"
        placeholder={t('search.placeholder')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        autoComplete="off"
        autoFocus={autoFocus}
      />
      <button type="submit" className="search__submit">
        {t('search.submit')}
      </button>
    </form>
  );
}

export default SearchBar;
