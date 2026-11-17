/**
 * Hierarchical Option Tree Engine for Unit 418 Serin East Tagaytay.
 * Provides deterministic, instant menu navigation and resolution cards.
 */

export class OptionTree {
  /**
   * @param {Object} knowledgeBase Knowledge base JSON containing menu_tree and resolutions
   */
  constructor(knowledgeBase) {
    this.kb = knowledgeBase;
    this.menus = knowledgeBase.menu_tree || {};
    this.resolutions = knowledgeBase.resolutions || {};
    
    // Index all options by id for rapid lookup
    this.optionMap = new Map();
    for (const menuKey of Object.keys(this.menus)) {
      const menu = this.menus[menuKey];
      if (Array.isArray(menu.options)) {
        for (const opt of menu.options) {
          this.optionMap.set(opt.id, opt);
        }
      }
    }
  }

  /**
   * Retrieves a menu node by its ID, with tier filtering for root.
   * @param {string} [menuId='root']
   * @param {Object} [options]
   * @param {'unbooked'|'confirmed'} [options.guestStatus='unbooked']
   * @returns {Object|null}
   */
  getMenu(menuId = 'root', { guestStatus = 'unbooked' } = {}) {
    const menu = this.menus[menuId];
    if (!menu) return null;

    if (menuId === 'root' && Array.isArray(menu.options)) {
      if (guestStatus === 'confirmed') {
        return menu;
      }
      // Unbooked / first-time visitors see only unbooked topics
      const filtered = menu.options.filter(opt => opt.tier === 'unbooked');
      return {
        ...menu,
        options: filtered
      };
    }

    return menu;
  }

  /**
   * Resolves an option click to either a child menu or a final resolution card.
   * @param {string} optionId
   * @returns {{ type: 'menu'|'resolution'|'unknown', data: Object }}
   */
  resolveOption(optionId) {
    const opt = this.optionMap.get(optionId);
    if (!opt) {
      // Check if target is directly a menu
      if (this.menus[optionId]) {
        return { type: 'menu', data: this.menus[optionId] };
      }
      // Check if target is directly a resolution
      if (this.resolutions[optionId]) {
        return { type: 'resolution', data: this.resolutions[optionId] };
      }
      return { type: 'unknown', data: null };
    }

    const target = opt.target;
    if (this.menus[target]) {
      return { type: 'menu', data: this.menus[target] };
    }
    if (this.resolutions[target]) {
      return { type: 'resolution', data: this.resolutions[target] };
    }

    return { type: 'unknown', data: null };
  }
}
