import type { FeatureDao } from "@ngageoint/geopackage/dist/lib/features/user/featureDao.js";
import type { FeatureRow } from "@ngageoint/geopackage/dist/lib/features/user/featureRow.js";

export function* queryAllFeatures(
  dao: FeatureDao<FeatureRow>,
): IterableIterator<FeatureRow> {
  for (const result of dao.queryForEach()) yield dao.getRow(result);
}
