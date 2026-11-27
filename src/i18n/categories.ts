import type { Category } from '@/data/types';

import type { Dictionary } from './fr';

/** Nom affiché d'une catégorie : traduit pour les catégories par défaut, tel quel sinon. */
export function categoryLabel(category: Pick<Category, 'key' | 'name'>, t: Dictionary): string {
  return category.key ? t.categories[category.key] : category.name;
}
