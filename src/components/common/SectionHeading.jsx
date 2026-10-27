import './SectionHeading.css';

/**
 * Tiêu đề section dùng chung (căn giữa):
 * - id: dùng cho aria-labelledby của <section>
 * - title, description: chuỗi đã dịch
 * - actionLabel + actionHref: link phụ như "Xem tất cả" (tuỳ chọn)
 */
function SectionHeading({ id, title, description, actionLabel, actionHref }) {
  return (
    <div className="section-heading">
      <h2 id={id} className="section-heading__title">
        {title}
      </h2>
      {description && <p className="section-heading__desc">{description}</p>}
      {actionLabel && (
        <a href={actionHref} className="section-heading__action">
          {actionLabel}
        </a>
      )}
    </div>
  );
}

export default SectionHeading;
