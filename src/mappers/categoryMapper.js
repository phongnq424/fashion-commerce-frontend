const ROOT_CATEGORY_SLUG_BY_ROUTE = {
  tops: 'ao',
  bottoms: 'quan',
  dresses: 'vay-dam',
};

export function mapCategoryResponse(category) {
  if (!category || typeof category !== 'object' || !category.id || !category.slug) {
    throw new TypeError('Category response không đúng API contract');
  }

  return {
    id: category.id,
    parentId: category.parentId ?? null,
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
  };
}

export function findCategoryForRoute(categories, categoryRouteId, subcategoryRouteId) {
  if (subcategoryRouteId) {
    return categories.find((category) => category.slug === subcategoryRouteId) ?? null;
  }

  const apiSlug = ROOT_CATEGORY_SLUG_BY_ROUTE[categoryRouteId] ?? categoryRouteId;
  return categories.find((category) => category.slug === apiSlug) ?? null;
}
