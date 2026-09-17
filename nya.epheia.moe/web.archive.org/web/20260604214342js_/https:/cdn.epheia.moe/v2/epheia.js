var _____WB$wombat$assign$function_____=function(name){return (globalThis._wb_wombat && globalThis._wb_wombat.local_init && globalThis._wb_wombat.local_init(name))||globalThis[name];};if(!globalThis.__WB_pmw){globalThis.__WB_pmw=function(obj){this.__WB_source=obj;return this;}}{
let window = _____WB$wombat$assign$function_____("window");
let self = _____WB$wombat$assign$function_____("self");
let document = _____WB$wombat$assign$function_____("document");
let location = _____WB$wombat$assign$function_____("location");
let top = _____WB$wombat$assign$function_____("top");
let parent = _____WB$wombat$assign$function_____("parent");
let frames = _____WB$wombat$assign$function_____("frames");
let opener = _____WB$wombat$assign$function_____("opener");
/**
 * Epheia UI v2 - JavaScript Framework
 * 玻璃拟态个性化框架 v2.0
 */

(function(global) {
  'use strict';

  const VERSION = 'v2.0.0';
  const CDN_BASE = 'https://web.archive.org/web/20260604214342/https://cdn.epheia.moe/v2';

  const DEFAULT_CONFIG = {
    themeKey: 'epheia-theme',
    defaultTheme: 'chocolate',
    themes: ['chocolate', 'milkshake'],
    iconPath: `${CDN_BASE}/public/icon/`,
    ccIconPath: `${CDN_BASE}/public/license/cc/`,
    ccIconSize: 32,
    ccDefaultLicense: 'by-sa'
  };

  class EpheiaUI {
    constructor(options = {}) {
      this.version = VERSION;
      this.config = { ...DEFAULT_CONFIG, ...options };
      this.currentTheme = this._getStoredTheme() || this.config.defaultTheme;
      this._initialized = false;
      this._listeners = [];

      this._init();
    }

    _init() {
      if (this._initialized) return;

      this._applyTheme(this.currentTheme);
      this._setupThemeSwitchers();
      this._injectFavicons();
      this._initCCLicense();
      this._bindKeyboardShortcuts();
      this._listenSystemTheme();

      this._initialized = true;
      console.log(`Epheia UI ${this.version} initialized | Theme: ${this.currentTheme}`);
    }

    _getStoredTheme() {
      try {
        return localStorage.getItem(this.config.themeKey);
      } catch {
        return null;
      }
    }

    _applyTheme(themeName) {
      if (!this.config.themes.includes(themeName)) {
        console.warn(`[Epheia] Unknown theme: "${themeName}", falling back to "${this.config.defaultTheme}"`);
        themeName = this.config.defaultTheme;
      }

      document.documentElement.setAttribute('data-theme', themeName);

      try {
        localStorage.setItem(this.config.themeKey, themeName);
      } catch {}

      this.currentTheme = themeName;

      global.dispatchEvent(new CustomEvent('epheia:theme-changed', {
        detail: { theme: themeName, previous: this.currentTheme }
      }));
    }

    _getNextTheme() {
      const idx = this.config.themes.indexOf(this.currentTheme);
      return this.config.themes[(idx + 1) % this.config.themes.length];
    }

    toggleTheme() {
      const next = this._getNextTheme();
      this._applyTheme(next);
    }

    setTheme(themeName) {
      this._applyTheme(themeName);
    }

    getTheme() {
      return this.currentTheme;
    }

    getAvailableThemes() {
      return [...this.config.themes];
    }

    _setupThemeSwitchers() {
      const switchers = document.querySelectorAll('.theme-switcher, [data-theme-switcher]');

      switchers.forEach(btn => {
        const handler = () => this.toggleTheme();
        btn.addEventListener('click', handler);
        this._listeners.push({ el: btn, event: 'click', handler });
        this._updateSwitcherLabel(btn);
      });

      global.addEventListener('epheia:theme-changed', () => {
        switchers.forEach(btn => this._updateSwitcherLabel(btn));
      });
    }

    _updateSwitcherLabel(btn) {
      const nextTheme = this._getNextTheme();
      const template = btn.dataset.text || 'Switch to {theme}';
      btn.textContent = template.replace('{theme}', nextTheme);
    }

    _injectFavicons() {
      const icons = [
        { rel: 'icon', type: 'image/x-icon', href: `${this.config.iconPath}favicon.ico` },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: `${this.config.iconPath}favicon-16x16.png` },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: `${this.config.iconPath}favicon-32x32.png` },
        { rel: 'apple-touch-icon', href: `${this.config.iconPath}apple-touch-icon.png` }
      ];

      icons.forEach(icon => {
        const selector = `link[rel="${icon.rel}"][href="${icon.href}"]`;
        if (!document.querySelector(selector)) {
          const link = document.createElement('link');
          Object.entries(icon).forEach(([k, v]) => link.setAttribute(k, v));
          document.head.appendChild(link);
        }
      });
    }

    _initCCLicense() {
      if (typeof CCLicense !== 'undefined' && typeof CCLicense.init === 'function') {
        CCLicense.init({
          iconPath: this.config.ccIconPath,
          iconSize: this.config.ccIconSize,
          defaultLicense: this.config.ccDefaultLicense
        });
      }
    }

    _bindKeyboardShortcuts() {
      const handler = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
          e.preventDefault();
          this.toggleTheme();
        }
      };
      document.addEventListener('keydown', handler);
      this._listeners.push({ el: document, event: 'keydown', handler });
    }

    _listenSystemTheme() {
      if (!global.matchMedia) return;

      const query = global.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e) => {
        if (!this._getStoredTheme()) {
          this._applyTheme(e.matches ? 'chocolate' : 'milkshake');
        }
      };

      query.addEventListener('change', handler);
      this._listeners.push({ el: query, event: 'change', handler });
    }

    destroy() {
      this._listeners.forEach(({ el, event, handler }) => {
        el.removeEventListener(event, handler);
      });
      this._listeners = [];
      document.documentElement.removeAttribute('data-theme');
      this._initialized = false;
      console.log('[Epheia] UI destroyed');
    }
  }

  function init(options = {}) {
    if (global.Epheia && global.Epheia._initialized) {
      console.warn('[Epheia] Already initialized');
      return global.Epheia;
    }

    global.Epheia = new EpheiaUI(options);
    global.Epheia._initialized = true;
    return global.Epheia;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init(global.EpheiaConfig || {}));
  } else {
    init(global.EpheiaConfig || {});
  }

  global.EpheiaUI = EpheiaUI;
  global.Epheia = init;

})(typeof window !== 'undefined' ? window : this);

/**
 * CCLicense Module v2
 * Creative Commons License Handler
 */
(function(global) {
  'use strict';

  const CC_CONFIG = {
    iconPath: 'https://web.archive.org/web/20260604214342/https://cdn.epheia.moe/v2/public/license/cc/',
    iconSize: 32,
    defaultLicense: 'by-sa',
    openInNewTab: true,

    licenseUrls: {
      'by': 'https://web.archive.org/web/20260604214342/https://creativecommons.org/licenses/by/4.0/',
      'by-sa': 'https://web.archive.org/web/20260604214342/https://creativecommons.org/licenses/by-sa/4.0/',
      'by-nc': 'https://web.archive.org/web/20260604214342/https://creativecommons.org/licenses/by-nc/4.0/',
      'by-nc-sa': 'https://web.archive.org/web/20260604214342/https://creativecommons.org/licenses/by-nc-sa/4.0/',
      'by-nd': 'https://web.archive.org/web/20260604214342/https://creativecommons.org/licenses/by-nd/4.0/',
      'by-nc-nd': 'https://web.archive.org/web/20260604214342/https://creativecommons.org/licenses/by-nc-nd/4.0/'
    },

    icons: ['cc', 'by', 'sa', 'nc', 'nd'],

    descriptions: {
      'cc': 'Creative Commons',
      'by': 'Attribution',
      'sa': 'ShareAlike',
      'nc': 'NonCommercial',
      'nd': 'NoDerivatives'
    }
  };

  function getLicenseType(article) {
    const attr = article.getAttribute('data-cc-license');
    if (attr) return attr.toLowerCase();

    const cls = Array.from(article.classList).find(c => c.startsWith('license-'));
    if (cls) return cls.replace('license-', '');

    return CC_CONFIG.defaultLicense;
  }

  function createIcon(iconType) {
    const img = document.createElement('img');
    img.src = `${CC_CONFIG.iconPath}${iconType}.webp`;
    img.srcset = `${CC_CONFIG.iconPath}${iconType}.webp 1x, ${CC_CONFIG.iconPath}${iconType}.png 1x`;
    img.width = CC_CONFIG.iconSize;
    img.height = CC_CONFIG.iconSize;
    img.alt = CC_CONFIG.descriptions[iconType] || iconType;
    img.title = CC_CONFIG.descriptions[iconType] || iconType;
    img.className = `cc-icon cc-${iconType}`;
    img.loading = 'lazy';
    return img;
  }

  function getRequiredIcons(licenseType) {
    const parts = licenseType.split('-');
    return CC_CONFIG.icons.filter(icon => parts.includes(icon));
  }

  function createLicenseElement(licenseType) {
    const container = document.createElement('a');
    container.className = `cc-license cc-${licenseType}`;

    const url = CC_CONFIG.licenseUrls[licenseType];
    if (url) {
      container.href = url;
      if (CC_CONFIG.openInNewTab) {
        container.target = '_blank';
        container.rel = 'noopener noreferrer';
      }
    }

    container.textContent = `CC ${licenseType.toUpperCase()} 4.0`;

    return container;
  }

  function processArticle(article) {
    const licenseType = getLicenseType(article);

    const pageFooter = document.querySelector('.page-footer');
    if (pageFooter && !pageFooter.querySelector('.cc-license')) {
      const licenseEl = createLicenseElement(licenseType);
      pageFooter.insertBefore(licenseEl, pageFooter.firstChild);
    }

    const title = article.querySelector('h1, h2, h3')?.textContent?.trim() || 'Untitled';
    console.log(`[CC] Added ${licenseType.toUpperCase()} license to: ${title}`);
  }

  const CCLicense = {
    init(options = {}) {
      Object.assign(CC_CONFIG, options);

      const articles = document.querySelectorAll('article');
      if (!articles.length) {
        console.log('[CC] No articles found');
        return;
      }

      articles.forEach(processArticle);
      console.log(`[CC] Processed ${articles.length} article(s)`);
    },

    add(selector, licenseType = CC_CONFIG.defaultLicense) {
      const articles = typeof selector === 'string'
        ? document.querySelectorAll(selector)
        : [selector];

      articles.forEach(article => {
        if (article.tagName === 'ARTICLE') {
          article.setAttribute('data-cc-license', licenseType);
          processArticle(article);
        }
      });
    },

    remove(selector) {
      const articles = typeof selector === 'string'
        ? document.querySelectorAll(selector)
        : [selector];

      articles.forEach(article => {
        const el = article.querySelector('.cc-license');
        if (el) el.remove();
      });
    },

    refresh() {
      document.querySelectorAll('article .cc-license').forEach(el => el.remove());
      document.querySelectorAll('article').forEach(processArticle);
    },

    config: CC_CONFIG
  };

  global.CCLicense = CCLicense;

})(typeof window !== 'undefined' ? window : this);

}

/*
     FILE ARCHIVED ON 21:43:42 Jun 04, 2026 AND RETRIEVED FROM THE
     INTERNET ARCHIVE ON 15:06:56 Sep 16, 2026.
     JAVASCRIPT APPENDED BY WAYBACK MACHINE, COPYRIGHT INTERNET ARCHIVE.

     ALL OTHER CONTENT MAY ALSO BE PROTECTED BY COPYRIGHT (17 U.S.C.
     SECTION 108(a)(3)).
*/
/*
playback timings (ms):
  capture_cache.get: 0.304
  captures_list: 0.361
  exclusion.robots: 0.033
  exclusion.robots.policy: 0.025
  esindex: 0.006
  cdx.remote: 20.835
  LoadShardBlock: 110.677 (3)
  PetaboxLoader3.datanode: 150.19 (4)
  load_resource: 40.556
*/