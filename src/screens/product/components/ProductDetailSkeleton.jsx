const THUMBNAIL_COUNT = 5;
const OPTION_COUNT = 4;

function ProductDetailSkeleton({ loadingLabel }) {
  return (
    <section className="product-page__skeleton" aria-busy="true" aria-live="polite">
      <p className="visually-hidden" role="status">
        {loadingLabel}
      </p>

      <div className="product-skeleton-detail__gallery" aria-hidden="true">
        <div className="product-skeleton-detail__main skeleton-block" />
        <div className="product-skeleton-detail__thumb-row">
          <span className="product-skeleton-detail__arrow skeleton-block" />
          <div className="product-skeleton-detail__thumbs">
            {Array.from({ length: THUMBNAIL_COUNT }, (_, index) => (
              <span key={index} className="product-skeleton-detail__thumb skeleton-block" />
            ))}
          </div>
          <span className="product-skeleton-detail__arrow skeleton-block" />
        </div>
      </div>

      <div className="product-skeleton-detail__info" aria-hidden="true">
        <div className="product-skeleton-detail__line product-skeleton-detail__line--title skeleton-block" />

        <div className="product-skeleton-detail__rating">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>

        <div className="product-skeleton-detail__price skeleton-block" />

        <div className="product-skeleton-detail__option">
          <div className="product-skeleton-detail__line product-skeleton-detail__line--label skeleton-block" />
          <div className="product-skeleton-detail__choices">
            {Array.from({ length: OPTION_COUNT }, (_, index) => (
              <span key={index} className="product-skeleton-detail__choice skeleton-block" />
            ))}
          </div>
        </div>

        <div className="product-skeleton-detail__option">
          <div className="product-skeleton-detail__line product-skeleton-detail__line--label skeleton-block" />
          <div className="product-skeleton-detail__choices">
            {Array.from({ length: OPTION_COUNT }, (_, index) => (
              <span key={index} className="product-skeleton-detail__choice product-skeleton-detail__choice--size skeleton-block" />
            ))}
          </div>
        </div>

        <div className="product-skeleton-detail__option">
          <div className="product-skeleton-detail__line product-skeleton-detail__line--label skeleton-block" />
          <div className="product-skeleton-detail__quantity skeleton-block" />
        </div>

        <div className="product-skeleton-detail__gift skeleton-block">
          <span className="product-skeleton-detail__gift-thumb" />
          <span className="product-skeleton-detail__gift-copy" />
        </div>

        <div className="product-skeleton-detail__actions">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="product-skeleton-detail__wish skeleton-block" />
        </div>

        <div className="product-skeleton-detail__tabs">
          <span className="skeleton-block" />
          <span className="skeleton-block" />
          <span className="skeleton-block" />
        </div>
      </div>

      <div className="product-skeleton-detail__reviews" aria-hidden="true">
        <div className="product-skeleton-detail__line product-skeleton-detail__line--section skeleton-block" />
        <div className="product-skeleton-detail__review-card skeleton-block" />
      </div>
    </section>
  );
}

export default ProductDetailSkeleton;
