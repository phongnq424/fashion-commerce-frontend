import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { STORY_DURATION_MS } from '../../data/categoryStories';
import { useLanguage } from '../../hooks/useLanguage';
import { formatRelative } from '../../utils/status';
import './StoryViewer.css';

const HOLD_MS = 220; // nhấn giữ lâu hơn mức này = tạm dừng, nhả ra không chuyển tin

/**
 * Trình xem TIN NỔI BẬT dạng pop-up (kiểu Instagram Stories).
 * - groups: [{ id, name, avatar, to, slides: [...] }]  — mỗi danh mục là 1 nhóm tin (data/categoryStories.js)
 * - startIndex: nhóm mở đầu tiên     - open, onClose     - onSeen(groupId): báo nhóm đã xem (để đổi viền xám)
 *
 * Thao tác:
 *   Bấm nửa phải ảnh / phím → : tin tiếp theo (hết nhóm -> sang danh mục kế)
 *   Bấm nửa trái ảnh / phím ← : tin trước
 *   Nhấn giữ ảnh / phím Space: tạm dừng      Esc / nút ✕ / bấm ra nền tối: đóng
 *   Máy tính: 2 nút ‹ › hai bên để chuyển danh mục
 * Mỗi tin tự chuyển sau 5 giây (thanh tiến trình trên cùng).
 */
function StoryViewer({ groups, startIndex = 0, open, onClose, onSeen }) {
  const { t, language } = useLanguage();
  const dialogRef = useRef(null);
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0 -> 1 của tin hiện tại
  const [paused, setPaused] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const pressRef = useRef(null); // { at, x } lúc bắt đầu nhấn

  const group = groups[groupIndex];
  const slide = group?.slides[slideIndex];
  const duration = slide?.duration ?? STORY_DURATION_MS;

  // Mở / đóng <dialog> (tự khoá focus bên trong, Esc để đóng)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setGroupIndex(startIndex);
      setSlideIndex(0);
      setProgress(0);
      setPaused(false);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open, startIndex]);

  // Khoá cuộn trang phía sau
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Báo đã xem nhóm hiện tại
  useEffect(() => {
    if (open && group) onSeen?.(group.id);
  }, [open, group, onSeen]);

  const goNext = useCallback(() => {
    setProgress(0);
    setImageFailed(false);
    if (slideIndex < group.slides.length - 1) setSlideIndex((index) => index + 1);
    else if (groupIndex < groups.length - 1) {
      setGroupIndex((index) => index + 1);
      setSlideIndex(0);
    } else onClose?.();
  }, [group, groupIndex, groups.length, onClose, slideIndex]);

  const goPrev = useCallback(() => {
    setProgress(0);
    setImageFailed(false);
    if (slideIndex > 0) setSlideIndex((index) => index - 1);
    else if (groupIndex > 0) {
      setGroupIndex((index) => index - 1);
      setSlideIndex(groups[groupIndex - 1].slides.length - 1);
    }
  }, [groupIndex, groups, slideIndex]);

  const jumpGroup = (step) => {
    const next = groupIndex + step;
    if (next < 0 || next >= groups.length) return;
    setGroupIndex(next);
    setSlideIndex(0);
    setProgress(0);
    setImageFailed(false);
  };

  // Đồng hồ tự chuyển tin
  useEffect(() => {
    if (!open || paused || !slide) return undefined;
    let frame;
    let last = performance.now();
    const tick = (now) => {
      const delta = now - last;
      last = now;
      setProgress((value) => Math.min(1, value + delta / duration));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, paused, slide, duration]);

  useEffect(() => {
    if (progress >= 1) goNext();
  }, [progress, goNext]);

  // Chuyển sang tab khác -> tạm dừng
  useEffect(() => {
    const onVisibility = () => document.hidden && setPaused(true);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Tải trước ảnh tin kế tiếp
  useEffect(() => {
    const nextSlide = group?.slides[slideIndex + 1] ?? groups[groupIndex + 1]?.slides[0];
    if (nextSlide?.image) new Image().src = nextSlide.image;
  }, [group, groupIndex, groups, slideIndex]);

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowRight') goNext();
    else if (event.key === 'ArrowLeft') goPrev();
    else if (event.key === ' ' && event.target === event.currentTarget) {
      event.preventDefault();
      setPaused((value) => !value);
    }
  };

  // Nhấn giữ = tạm dừng; nhấn nhanh = chuyển tin theo vị trí bấm
  const handlePointerDown = (event) => {
    pressRef.current = { at: Date.now(), x: event.clientX };
    setPaused(true);
  };
  const handlePointerUp = (event) => {
    const press = pressRef.current;
    pressRef.current = null;
    setPaused(false);
    if (!press || Date.now() - press.at > HOLD_MS) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (press.x - rect.left < rect.width * 0.35) goPrev();
    else goNext();
  };

  const cta = slide?.cta ?? (group ? { label: t('stories.viewProducts'), to: group.to } : null);

  return (
    <dialog
      ref={dialogRef}
      className="story-viewer"
      aria-label={group ? t('stories.dialogLabel', { name: group.name }) : undefined}
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose?.();
      }}
      onKeyDown={handleKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget || event.target.classList.contains('story-viewer__stage')) onClose?.();
      }}
    >
      {open && group && slide && (
        <div className="story-viewer__stage">
          <button
            type="button"
            className="story-viewer__nav story-viewer__nav--prev"
            onClick={() => jumpGroup(-1)}
            disabled={groupIndex === 0}
            aria-label={t('stories.prevGroup')}
          >
            <Icon name="chevronLeft" size={26} />
          </button>

          <article className="story" aria-roledescription={t('stories.roleDescription')}>
            {/* Thanh tiến trình: mỗi tin 1 vạch */}
            <div className="story__bars" aria-hidden="true">
              {group.slides.map((item, index) => (
                <span key={index} className="story__bar">
                  <span
                    className="story__bar-fill"
                    style={{ transform: `scaleX(${index < slideIndex ? 1 : index === slideIndex ? progress : 0})` }}
                  />
                </span>
              ))}
            </div>

            <header className="story__head">
              <span className="story__avatar">
                {group.avatar ? <img src={group.avatar} alt="" /> : <Icon name="hanger" size={18} />}
              </span>
              <span className="story__meta">
                <span className="story__name">{group.name}</span>
                <span className="story__time">
                  TrendyLab · {formatRelative(slide.postedAt, language)}
                </span>
              </span>
              <span className="visually-hidden" aria-live="polite">
                {t('stories.position', { current: slideIndex + 1, total: group.slides.length })}
              </span>
              <button
                type="button"
                className="story__icon-btn"
                onClick={() => setPaused((value) => !value)}
                aria-label={paused ? t('stories.play') : t('stories.pause')}
              >
                <Icon name={paused ? 'play' : 'pause'} size={20} filled={paused} />
              </button>
              <button type="button" className="story__icon-btn" onClick={onClose} aria-label={t('common.close')}>
                <Icon name="close" size={22} />
              </button>
            </header>

            {/* Vùng ảnh: bấm trái/phải để chuyển, nhấn giữ để dừng */}
            <div
              className="story__media"
              onPointerDown={handlePointerDown}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => pressRef.current && setPaused(false)}
              onContextMenu={(event) => event.preventDefault()}
            >
              {imageFailed ? (
                <span className="story__fallback">
                  <Icon name="image" size={48} />
                </span>
              ) : (
                <img
                  key={`${group.id}-${slideIndex}`}
                  src={slide.image}
                  alt={slide.title}
                  className="story__image"
                  style={{ objectPosition: slide.position ?? 'center' }}
                  draggable={false}
                  onError={() => setImageFailed(true)}
                />
              )}
            </div>

            <footer className="story__body">
              {slide.tag && <span className="story__tag">{slide.tag}</span>}
              <h2 className="story__title">{slide.title}</h2>
              {slide.text && <p className="story__text">{slide.text}</p>}
              {cta && (
                <Link to={cta.to} className="story__cta" onClick={onClose}>
                  {cta.label}
                  <Icon name="arrowRight" size={18} />
                </Link>
              )}
            </footer>
          </article>

          <button
            type="button"
            className="story-viewer__nav story-viewer__nav--next"
            onClick={() => jumpGroup(1)}
            disabled={groupIndex === groups.length - 1}
            aria-label={t('stories.nextGroup')}
          >
            <Icon name="chevronRight" size={26} />
          </button>
        </div>
      )}
    </dialog>
  );
}

export default StoryViewer;
