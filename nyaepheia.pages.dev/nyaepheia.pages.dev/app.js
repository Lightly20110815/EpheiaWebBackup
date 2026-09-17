/**
 * 前端应用逻辑
 *
 * 无框架原生 JS：加载 JSON 数据，渲染三栏布局、推文流、媒体网格、文章。
 * 新增：基于 Transformers.js 的本地语义搜索。
 */

import { loadModel, getModelStatus, search, getSearchContext } from './search.js';
import {
  formatVectorForDisplay,
  findTweetPage,
  getPageSlice,
} from './search-utils.js';

(function () {
  'use strict';

  // ---------------- 常量 ----------------
  /** 站点部署域名，用于生成分享链接。若迁移域名需同步修改。 */
  const SITE_DOMAIN = 'https://nyaepheia.pages.dev';

  // ---------------- 状态 ----------------
  const state = {
    profile: null,
    tweets: [],
    articles: [],
    mediaIndex: null,
    currentTab: 'all',
    currentView: 'home',
    pageSize: 20,
    currentPage: 0,
    isLoading: false,
    hasMore: true,
    targetTweetId: null,
  };

  // ---------------- DOM 引用 ----------------
  const els = {
    tweetStream: document.getElementById('tab-panel'),
    scrollSentinel: document.getElementById('scroll-sentinel'),
    feedTitle: document.getElementById('feed-title'),
    feedHeader: document.querySelector('.feed-header'),
    tabs: document.querySelectorAll('.tab'),
    tabPanel: document.getElementById('tab-panel'),
    navItems: document.querySelectorAll('.nav-item'),
    navAvatar: document.getElementById('nav-avatar'),
    navDisplayName: document.getElementById('nav-display-name'),
    navUsername: document.getElementById('nav-username'),
    profileBanner: document.getElementById('profile-banner'),
    profileAvatar: document.getElementById('profile-avatar'),
    profileName: document.getElementById('profile-name'),
    profileUsername: document.getElementById('profile-username'),
    profileBio: document.getElementById('profile-bio'),
    profileLocation: document.getElementById('profile-location'),
    profileWebsite: document.getElementById('profile-website'),
    profileJoined: document.getElementById('profile-joined'),
    statTweets: document.getElementById('stat-tweets'),
    statMedia: document.getElementById('stat-media'),
    profileView: document.getElementById('profile-view'),
    sidebarRight: document.querySelector('.sidebar-right'),
    modal: document.getElementById('tweet-modal'),
    modalTitle: document.getElementById('tweet-modal-title'),
    modalMeta: document.getElementById('tweet-modal-meta'),
    modalLink: document.getElementById('tweet-modal-link'),
    modalClose: document.getElementById('tweet-modal-close'),
    searchDetailModal: document.getElementById('search-detail-modal'),
    searchDetailClose: document.getElementById('search-detail-modal-close'),
    searchDetailQuery: document.getElementById('search-detail-query'),
    searchDetailScore: document.getElementById('search-detail-score'),
    searchDetailTweetId: document.getElementById('search-detail-tweet-id'),
    searchDetailQueryVector: document.getElementById('search-detail-query-vector'),
    searchDetailDocVector: document.getElementById('search-detail-doc-vector'),
    searchDetailCopyQuery: document.getElementById('search-detail-copy-query'),
    searchDetailCopyDoc: document.getElementById('search-detail-copy-doc'),
    searchDetailError: document.getElementById('search-detail-error'),
    searchForm: document.getElementById('search-form'),
    searchInput: document.getElementById('search-input'),
    searchButton: document.getElementById('search-button'),
    mobileSearchToggle: document.getElementById('mobile-search-toggle'),
    mobileSearchForm: document.getElementById('mobile-search-form'),
    mobileSearchInput: document.getElementById('mobile-search-input'),
    searchState: document.getElementById('search-state'),
    searchResults: document.getElementById('search-results'),
    clearSearch: document.getElementById('clear-search'),
    modelLoadingState: document.getElementById('model-loading-state'),
  };

  // ---------------- 初始化 ----------------
  async function init() {
    try {
      const [profileRes, tweetsRes, articlesRes, mediaRes] = await Promise.all([
        fetch('data/profile.json'),
        fetch('data/tweets.json'),
        fetch('data/articles.json'),
        fetch('data/media-index.json'),
      ]);

      state.profile = await profileRes.json();
      state.tweets = await tweetsRes.json();
      state.articles = await articlesRes.json();
      state.mediaIndex = await mediaRes.json();

      renderProfile();
      setupRouting();
      setupTabs();
      setupModal();
      setupSearchDetailModal();
      setupInfiniteScroll();
      setupSearch();
      setupMobileSearch();
      applyRoute();
    } catch (err) {
      console.error('Failed to load archive data:', err);
      els.tweetStream.innerHTML = `
        <div class="empty-state" role="alert">
          <p>加载数据失败，请检查网络连接或稍后重试。</p>
        </div>
      `;
    }
  }

  // ---------------- 路由 ----------------
  function setupRouting() {
    window.addEventListener('hashchange', applyRoute);
  }

  function applyRoute() {
    const hash = window.location.hash || '#/';
    // 去掉 hash 中的查询参数后再解析视图，避免 `search?q=...` 被当作视图名
    const hashPath = hash.replace(/^#\//, '').split('?')[0];
    const parts = hashPath.split('/').filter(Boolean);
    const view = parts[0] || 'home';

    state.currentView = view;
    state.currentPage = 0;
    state.hasMore = true;

    // 同步导航高亮
    els.navItems.forEach((item) => {
      item.setAttribute('aria-current', item.dataset.view === view ? 'page' : 'false');
    });

    if (view === 'search') {
      const params = new URLSearchParams(hash.replace(/^#\/search\?*/, '').replace(/^#\//, ''));
      const query = params.get('q') || '';
      renderSearchView(query);
      return;
    }

    if (view === 'article' && parts[1]) {
      renderArticle(parts[1]);
      return;
    }

    // 个人资料视图：在移动端展示到主内容区
    if (view === 'profile') {
      renderProfileView();
      return;
    }

    // 推文永久链接视图：#/i/status/{tweetId}
    if (view === 'i') {
      if (parts[1] === 'status' && parts[2]) {
        handleStatusPermalink(parts[2]);
      } else {
        // 格式不合法（如 #/i/ 或 #/i/unknown/...），回退到首页
        window.location.hash = '#/';
      }
      return;
    }

    // 非 profile 视图时，确保推文流可见、资料视图隐藏
    showFeedView();

    // 设置对应标签
    const tabMap = {
      home: 'all',
      tweets: 'tweets',
      replies: 'replies',
      media: 'media',
      articles: 'articles',
    };
    const targetTab = tabMap[view] || 'all';
    setActiveTab(targetTab);

    // 若存在时间线定位目标，优先渲染到目标页并滚动高亮
    if (state.targetTweetId && view !== 'search' && view !== 'article' && view !== 'profile') {
      renderFeedToTarget(state.targetTweetId);
      return;
    }

    renderFeed();
  }

  // ---------------- 标签切换 ----------------
  function setupTabs() {
    els.tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        activateTab(tab.dataset.tab);
      });

      tab.addEventListener('keydown', (event) => {
        const tabs = Array.from(els.tabs);
        const index = tabs.indexOf(tab);
        let nextIndex = -1;

        switch (event.key) {
          case 'ArrowLeft':
          case 'ArrowUp':
            nextIndex = index > 0 ? index - 1 : tabs.length - 1;
            break;
          case 'ArrowRight':
          case 'ArrowDown':
            nextIndex = index < tabs.length - 1 ? index + 1 : 0;
            break;
          case 'Home':
            nextIndex = 0;
            break;
          case 'End':
            nextIndex = tabs.length - 1;
            break;
          case 'Enter':
          case ' ':
            event.preventDefault();
            activateTab(tab.dataset.tab);
            return;
          default:
            return;
        }

        event.preventDefault();
        if (nextIndex >= 0 && nextIndex < tabs.length) {
          tabs[nextIndex].focus();
          activateTab(tabs[nextIndex].dataset.tab);
        }
      });
    });
  }

  function activateTab(tabName) {
    setActiveTab(tabName);
    const viewMap = {
      all: '#/',
      tweets: '#/tweets',
      replies: '#/replies',
      media: '#/media',
      articles: '#/articles',
    };
    window.location.hash = viewMap[tabName] || '#/';
  }

  function setActiveTab(tabName) {
    state.currentTab = tabName;
    let activeTabId = '';
    els.tabs.forEach((tab) => {
      const isActive = tab.dataset.tab === tabName;
      tab.setAttribute('aria-selected', String(isActive));
      if (isActive) activeTabId = tab.id;
    });
    if (els.tabPanel && activeTabId) {
      els.tabPanel.setAttribute('aria-labelledby', activeTabId);
    }
  }

  // ---------------- 推文详情弹窗 ----------------
  let lastFocusedElement = null;

  function setupModal() {
    if (!els.modal || !els.modalClose) return;

    els.modalClose.addEventListener('click', closeModal);

    // 点击遮罩层关闭
    els.modal.addEventListener('click', (event) => {
      if (event.target === els.modal) closeModal();
    });

    // Escape 关闭
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && els.modal.getAttribute('aria-hidden') === 'false') {
        closeModal();
      }
    });
  }

  function openModal(tweet) {
    if (!els.modal || !els.modalMeta || !els.modalLink) return;

    lastFocusedElement = document.activeElement;

    const typeLabels = {
      original: '原创',
      retweet: '转发',
      reply: '回复',
      quote: '引用',
      community: '社群',
    };

    const createdDate = new Date(tweet.createdAtMs);
    const formattedDate = createdDate.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });

    const sourceText = tweet.source
      ? tweet.source.replace(/<[^>]+>/g, '').trim()
      : '未知';

    let statsHtml = '';
    if (tweet.stats) {
      const fav = formatNumber(tweet.stats.favoriteCount);
      const rt = formatNumber(tweet.stats.retweetCount);
      statsHtml += `<dt>喜欢数</dt><dd>${escapeHtml(String(fav))}</dd>`;
      statsHtml += `<dt>转发数</dt><dd>${escapeHtml(String(rt))}</dd>`;
      if (tweet.stats.replyCount != null) {
        statsHtml += `<dt>回复数</dt><dd>${escapeHtml(String(formatNumber(tweet.stats.replyCount)))}</dd>`;
      }
    }

    els.modalTitle.textContent = '推文详情';
    els.modalMeta.innerHTML = `
      <dt>推文 ID</dt><dd><code>${escapeHtml(tweet.id)}</code></dd>
      <dt>发布时间</dt><dd>${escapeHtml(formattedDate)}</dd>
      <dt>发布客户端</dt><dd>${escapeHtml(sourceText)}</dd>
      <dt>语言</dt><dd>${escapeHtml(tweet.lang || 'und')}</dd>
      <dt>类型</dt><dd>${escapeHtml(typeLabels[tweet.type] || tweet.type || '未知')}</dd>
      <dt>长推文</dt><dd>${tweet.isNoteTweet ? '是' : '否'}</dd>
      ${statsHtml}
      <dt>存档链接</dt><dd><code>${escapeHtml(`${SITE_DOMAIN}/#/i/status/${encodeURIComponent(tweet.id)}`)}</code></dd>
    `;

    const publicUrl = `https://x.com/nyaepheia/status/${encodeURIComponent(tweet.id)}`;
    els.modalLink.href = publicUrl;

    els.modal.setAttribute('aria-hidden', 'false');
    els.modal.removeAttribute('inert');
    document.body.style.overflow = 'hidden';

    // 焦点进入弹窗关闭按钮，确保屏幕阅读器用户感知到弹窗
    if (els.modalClose) els.modalClose.focus();
  }

  function closeModal() {
    if (!els.modal) return;

    els.modal.setAttribute('aria-hidden', 'true');
    els.modal.setAttribute('inert', '');
    document.body.style.overflow = '';

    if (lastFocusedElement && lastFocusedElement.focus) {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  // ---------------- 搜索详情弹窗 ----------------
  let lastSearchDetailFocused = null;

  function setupSearchDetailModal() {
    if (!els.searchDetailModal || !els.searchDetailClose) return;

    els.searchDetailClose.addEventListener('click', closeSearchDetailModal);

    // 点击遮罩层关闭
    els.searchDetailModal.addEventListener('click', (event) => {
      if (event.target === els.searchDetailModal) closeSearchDetailModal();
    });

    // Escape 关闭（与推文详情弹窗共享同一事件监听，通过 aria-hidden 判断活动弹窗）
    document.addEventListener('keydown', (event) => {
      if (
        event.key === 'Escape' &&
        els.searchDetailModal.getAttribute('aria-hidden') === 'false'
      ) {
        closeSearchDetailModal();
      }
    });

    // 复制按钮
    if (els.searchDetailCopyQuery) {
      els.searchDetailCopyQuery.addEventListener('click', () => {
        copyToClipboard(els.searchDetailQueryVector?.textContent || '');
      });
    }
    if (els.searchDetailCopyDoc) {
      els.searchDetailCopyDoc.addEventListener('click', () => {
        copyToClipboard(els.searchDetailDocVector?.textContent || '');
      });
    }
  }

  function openSearchDetailModal(tweet, score) {
    if (!els.searchDetailModal) return;

    lastSearchDetailFocused = document.activeElement;

    const context = getSearchContext();
    const doc = context.embeddings?.find((d) => d.id === tweet.id);

    const hasQuery = context.query && context.queryVector && context.queryVector.length > 0;
    const hasDoc = doc && doc.embedding && doc.embedding.length > 0;
    const isMissing = !hasQuery || !hasDoc;

    if (els.searchDetailQuery) {
      els.searchDetailQuery.textContent = context.query || '（无查询记录）';
    }
    if (els.searchDetailScore) {
      els.searchDetailScore.textContent = typeof score === 'number' ? score.toFixed(4) : '—';
    }
    if (els.searchDetailTweetId) {
      els.searchDetailTweetId.textContent = tweet.id;
    }
    if (els.searchDetailQueryVector) {
      els.searchDetailQueryVector.textContent = hasQuery
        ? formatVectorForDisplay(context.queryVector, 8)
        : '（查询向量不可用）';
    }
    if (els.searchDetailDocVector) {
      els.searchDetailDocVector.textContent = hasDoc
        ? formatVectorForDisplay(doc.embedding, 8)
        : '（文档向量不可用）';
    }

    if (els.searchDetailError) {
      els.searchDetailError.classList.toggle('hidden', !isMissing);
    }

    els.searchDetailModal.setAttribute('aria-hidden', 'false');
    els.searchDetailModal.removeAttribute('inert');
    document.body.style.overflow = 'hidden';

    if (els.searchDetailClose) els.searchDetailClose.focus();
  }

  function closeSearchDetailModal() {
    if (!els.searchDetailModal) return;

    els.searchDetailModal.setAttribute('aria-hidden', 'true');
    els.searchDetailModal.setAttribute('inert', '');
    document.body.style.overflow = '';

    if (lastSearchDetailFocused && lastSearchDetailFocused.focus) {
      lastSearchDetailFocused.focus();
    }
    lastSearchDetailFocused = null;
  }

  /**
   * 将文本写入剪贴板，失败时降级到 execCommand。
   *
   * @param {string} text
   * @returns {Promise<boolean>} 是否复制成功
   */
  async function copyToClipboard(text) {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // 降级方案：创建临时 textarea 通过 execCommand 复制
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textarea);
        return result;
      } catch (fallbackErr) {
        console.warn('Clipboard copy failed:', fallbackErr);
        return false;
      }
    }
  }

  /**
   * 定位到指定推文在整个时间线中的位置。
   *
   * 计算页码后设置状态并导航到主页，由 applyRoute 完成渲染与滚动。
   *
   * @param {string} tweetId 目标推文 ID
   */
  function locateTweetInTimeline(tweetId) {
    if (!tweetId) return;
    state.targetTweetId = tweetId;
    if (window.location.hash === '#/' || window.location.hash === '' || window.location.hash === '#') {
      applyRoute();
    } else {
      window.location.hash = '#/';
    }
  }

  // ---------------- Toast 轻提示 ----------------
  let toastTimer = null;

  /**
   * 显示底部 toast 提示。多次调用时重置计时器，避免重叠。
   *
   * @param {string} message 提示文本
   * @param {number} [duration=2500] 显示时长（毫秒）
   */
  function showToast(message, duration = 2500) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');
    if (!toast || !msgEl) return;

    if (toastTimer) clearTimeout(toastTimer);

    msgEl.textContent = message;
    toast.classList.remove('hidden');
    toast.setAttribute('aria-hidden', 'false');

    toastTimer = setTimeout(() => {
      toast.classList.add('hidden');
      toast.setAttribute('aria-hidden', 'true');
      toastTimer = null;
    }, duration);
  }

  // ---------------- 推文永久链接路由 ----------------

  /**
   * 处理 #/i/status/{tweetId} 路由：验证 ID、检查数据、渲染专属永久链接视图。
   *
   * 该视图只渲染单条推文卡片与一个「定位到时间线」按钮，
   * 保证无论推文新旧都能即时可见，避免一次性插入数千张卡片的性能问题。
   *
   * @param {string} tweetId 从 URL 中提取的推文 ID
   */
  function handleStatusPermalink(tweetId) {
    // 1. 验证 ID 格式（纯数字字符串）
    if (!tweetId || !/^\d+$/.test(tweetId)) {
      // 无效 ID，回退到首页并清理 hash，避免地址栏保留无效链接
      window.location.hash = '#/';
      showFeedView();
      setActiveTab('all');
      renderFeed();
      return;
    }

    // 2. 数据尚未就绪时，存入 state 等待 init 完成后的 applyRoute 处理
    if (!state.tweets || state.tweets.length === 0) {
      state.targetTweetId = tweetId;
      return;
    }

    // 3. 检查推文是否存在
    const tweet = state.tweets.find((t) => t.id === tweetId);
    if (!tweet) {
      showFeedView();
      renderNotFoundState(tweetId);
      return;
    }

    // 4. 渲染专属永久链接视图（单条推文 + 定位按钮）
    showFeedView();
    setActiveTab('all');
    if (els.feedTitle) els.feedTitle.textContent = '推文详情';

    // 清空推文流并使用 DOM API 构建视图，保留事件监听器
    els.tweetStream.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'permalink-view';
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', '推文永久链接');

    // 使用 createTweetCard 生成完整卡片（含分享、更多等事件监听器）
    const card = createTweetCard(tweet);
    container.appendChild(card);

    // 构建「定位到时间线」按钮
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'permalink-actions';

    const locateBtn = document.createElement('button');
    locateBtn.type = 'button';
    locateBtn.className = 'permalink-locate-btn';
    locateBtn.setAttribute('aria-label', '定位到时间线中的该推文');
    locateBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
      <span>定位到时间线</span>
    `;
    locateBtn.addEventListener('click', () => {
      locateTweetInTimeline(tweet.id);
    });

    actionsDiv.appendChild(locateBtn);
    container.appendChild(actionsDiv);

    els.tweetStream.appendChild(container);

    // 在永久链接视图中禁用无限滚动
    if (els.scrollSentinel) els.scrollSentinel.classList.add('hidden');
    state.hasMore = false;
  }

  /**
   * 渲染「推文未找到」空状态页面。
   *
   * @param {string} tweetId 未找到的推文 ID
   */
  function renderNotFoundState(tweetId) {
    els.feedTitle.textContent = '推文未找到';
    els.tweetStream.innerHTML = `
      <div class="empty-state" role="status">
        <p>未找到 ID 为 <code>${escapeHtml(tweetId)}</code> 的推文。</p>
        <p>该推文可能已被删除，或不在此存档中。</p>
        <a href="#/" class="text-link">返回首页</a>
      </div>
    `;
    if (els.scrollSentinel) els.scrollSentinel.classList.add('hidden');
    state.hasMore = false;
  }

  // ---------------- 个人资料渲染 ----------------
  function renderProfile() {
    const p = state.profile;
    if (!p) return;

    const avatarUrl = p.avatarUrl || 'media/images/avatar.jpg';
    const bannerUrl = p.bannerUrl || 'media/images/banner.jpg';

    if (els.navAvatar) {
      els.navAvatar.src = avatarUrl;
      els.navAvatar.alt = `${p.displayName || p.userName} 的头像`;
    }
    if (els.navDisplayName) els.navDisplayName.textContent = p.displayName || p.userName;
    if (els.navUsername) els.navUsername.textContent = `@${p.userName}`;

    if (els.profileBanner) {
      els.profileBanner.src = bannerUrl;
      els.profileBanner.alt = `${p.displayName || p.userName} 的横幅`;
    }
    if (els.profileAvatar) {
      els.profileAvatar.src = avatarUrl;
      els.profileAvatar.alt = `${p.displayName || p.userName} 的头像`;
    }
    if (els.profileName) els.profileName.textContent = p.displayName || p.userName;
    if (els.profileUsername) els.profileUsername.textContent = `@${p.userName}`;
    if (els.profileBio) els.profileBio.innerHTML = linkifyPlainText(p.bio || '');
    if (els.profileLocation) {
      els.profileLocation.textContent = p.location || '';
      els.profileLocation.style.display = p.location ? 'inline' : 'none';
    }
    if (els.profileWebsite) {
      if (p.website) {
        els.profileWebsite.href = p.website;
        els.profileWebsite.textContent = p.website.replace(/^https?:\/\//, '');
        els.profileWebsite.style.display = 'inline';
      } else {
        els.profileWebsite.style.display = 'none';
      }
    }
    if (els.profileJoined) {
      const firstDate = getFirstTweetDate(state.tweets);
      if (firstDate) {
        els.profileJoined.textContent = `首次发文于 ${formatFirstTweetDate(firstDate)}`;
        els.profileJoined.style.display = 'inline';
      } else {
        els.profileJoined.style.display = 'none';
      }
    }
    if (els.statTweets) els.statTweets.textContent = formatNumber(state.tweets.length);
    if (els.statMedia) els.statMedia.textContent = formatNumber(state.tweets.filter((t) => t.media.length > 0).length);
  }

  /**
   * 切换显示推文流（隐藏资料视图）
   * 在路由切换回非 profile 视图时调用
   */
  function showFeedView() {
    resetSearchView();
    if (els.profileView) {
      els.profileView.classList.add('hidden');
      els.profileView.innerHTML = '';
    }
    if (els.tweetStream) els.tweetStream.classList.remove('hidden');
    if (els.feedHeader) els.feedHeader.classList.remove('hidden');
    if (els.scrollSentinel) els.scrollSentinel.classList.remove('hidden');
  }

  /**
   * 渲染移动端个人资料视图
   * 克隆右侧栏 profile-card 的内容到主内容区，
   * 使移动端用户无需滚动到侧栏即可查看资料。
   */
  function renderProfileView() {
    resetSearchView();
    // 隐藏推文流和标签页
    if (els.tweetStream) els.tweetStream.classList.add('hidden');
    if (els.feedHeader) els.feedHeader.classList.add('hidden');
    if (els.scrollSentinel) els.scrollSentinel.classList.add('hidden');

    if (!els.profileView) return;

    els.feedTitle.textContent = '个人资料';

    // 克隆右侧栏的 profile-card 内容
    const sourceCard = document.querySelector('.sidebar-right .profile-card');
    if (sourceCard) {
      const clone = sourceCard.cloneNode(true);
      // 移除克隆节点中的 id 以避免 DOM 重复 ID
      clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
      els.profileView.innerHTML = '';
      els.profileView.appendChild(clone);
    }

    els.profileView.classList.remove('hidden');
    state.hasMore = false;
  }

  // ---------------- 信息流渲染 ----------------
  function getFilteredTweets() {
    switch (state.currentTab) {
      case 'tweets':
        return state.tweets.filter((t) => t.type === 'original' || t.type === 'community');
      case 'replies':
        return state.tweets.filter((t) => t.type === 'reply');
      case 'media':
        return state.tweets.filter((t) => t.media.length > 0);
      case 'articles':
        return [];
      case 'all':
      default:
        return state.tweets;
    }
  }

  function renderFeed(append = false) {
    const tabTitles = {
      all: '主页',
      tweets: '推文',
      replies: '回复',
      media: '媒体',
      articles: '文章',
    };
    els.feedTitle.textContent = tabTitles[state.currentTab] || '主页';

    if (state.currentTab === 'articles') {
      renderArticleList();
      return;
    }

    const tweets = getFilteredTweets();
    const totalPages = Math.ceil(tweets.length / state.pageSize);

    if (!append) {
      els.tweetStream.innerHTML = '';
      state.currentPage = 0;
    }

    const start = state.currentPage * state.pageSize;
    const end = start + state.pageSize;
    const pageTweets = tweets.slice(start, end);

    if (pageTweets.length === 0 && state.currentPage === 0) {
      els.tweetStream.innerHTML = '<div class="empty-state"><p>没有符合条件的内容。</p></div>';
      state.hasMore = false;
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const tweet of pageTweets) {
      fragment.appendChild(createTweetCard(tweet));
    }
    els.tweetStream.appendChild(fragment);

    state.currentPage += 1;
    state.hasMore = state.currentPage < totalPages;
  }

  /**
   * 定位并滚动到指定推文（窗口化渲染）。
   *
   * 仅渲染目标页前后各一页（最多 3 页 = 60 张卡片），
   * 避免 O(n) DOM 插入导致的长时间阻塞。
   * 渲染完成后同步查找目标卡片并滚动高亮，无需轮询。
   *
   * @param {string} tweetId 目标推文 ID
   */
  function renderFeedToTarget(tweetId) {
    if (!tweetId) {
      state.targetTweetId = null;
      renderFeed();
      return;
    }

    // 以完整时间线（按时间倒序）查找目标推文所在页
    const result = findTweetPage(state.tweets, tweetId, state.pageSize);
    if (!result) {
      state.targetTweetId = null;
      renderFeed();
      return;
    }

    const { page: targetPage } = result;

    // 若目标推文不在当前筛选标签中，自动切回「全部」标签。
    // 不再修改 hash，避免 applyRoute 重新进入本函数导致路由循环。
    const filtered = getFilteredTweets();
    const existsInCurrentTab = filtered.some((t) => t.id === tweetId);
    if (!existsInCurrentTab) {
      state.currentTab = 'all';
      setActiveTab('all');
    }

    const tweets = getFilteredTweets();
    const totalPages = Math.ceil(tweets.length / state.pageSize);

    // 计算渲染窗口：目标页前后各一页，最多 3 页 = 60 张卡片
    const windowStart = Math.max(0, targetPage - 1);
    const windowEnd = Math.min(totalPages - 1, targetPage + 1);

    // 更新标题
    const tabTitles = {
      all: '主页',
      tweets: '推文',
      replies: '回复',
      media: '媒体',
      articles: '文章',
    };
    if (els.feedTitle) els.feedTitle.textContent = tabTitles[state.currentTab] || '主页';

    // 清空推文流并同步渲染窗口内的页面
    els.tweetStream.innerHTML = '';

    const fragment = document.createDocumentFragment();
    for (let p = windowStart; p <= windowEnd; p++) {
      const pageTweets = getPageSlice(tweets, p, state.pageSize);
      for (const tweet of pageTweets) {
        fragment.appendChild(createTweetCard(tweet));
      }
    }
    els.tweetStream.appendChild(fragment);

    // 更新无限滚动状态：下一页从 windowEnd + 1 开始
    state.currentPage = windowEnd + 1;
    state.hasMore = state.currentPage < totalPages;

    // 卡片已在 DOM 中，无需轮询，直接滚动高亮
    highlightTargetTweet(tweetId, { smooth: false });

    state.targetTweetId = null;
  }

  /**
   * 滚动到目标推文卡片并添加临时高亮样式。
   *
   * 使用 requestAnimationFrame 等待一帧布局稳定后再滚动。
   * 高亮动画会在 5 秒后自动移除；若用户开启减少动画偏好，
   * 则仅保留静态高亮边框，不播放动画。
   *
   * @param {string} tweetId 目标推文 ID
   * @param {{ smooth?: boolean }} [options] 滚动选项
   */
  function highlightTargetTweet(tweetId, options = {}) {
    const card = document.getElementById(`tweet-card-${tweetId}`);
    if (!card) return;

    requestAnimationFrame(() => {
      card.scrollIntoView({
        behavior: options.smooth ? 'smooth' : 'instant',
        block: 'center',
      });
      card.classList.add('tweet-card--highlighted');

      // 延长高亮持续时间至 5 秒（原 2.5 秒在重渲染后可能不够）
      setTimeout(() => {
        card.classList.remove('tweet-card--highlighted');
      }, 5000);
    });
  }

  function createTweetCard(tweet, options = {}) {
    const article = document.createElement('article');
    article.className = 'tweet-card';
    article.id = `tweet-card-${tweet.id}`;
    article.setAttribute('role', 'article');
    article.setAttribute('aria-label', `来自 ${getDisplayName(tweet)} 的推文`);

    const avatarUrl = getTweetAvatar(tweet);
    const displayName = getDisplayName(tweet);
    const username = getUsername(tweet);
    const timeText = formatTime(tweet.createdAtMs);
    const timeIso = new Date(tweet.createdAtMs).toISOString();

    let html = '';

    // 转发标签
    if (tweet.type === 'retweet' && tweet.retweetedStatus) {
      html += `<div class="retweet-label">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg>
        <span>转推了 ${escapeHtml(displayName)}</span>
      </div>`;
    }

    // 回复标签
    if (tweet.type === 'reply' && tweet.inReplyTo) {
      html += `<div class="reply-label">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="m10 8-3 3 3 3"/><path d="M17 14v-1a2 2 0 0 0-2-2H7"/></svg>
        <span>回复 @${escapeHtml(tweet.inReplyTo.screenName)}</span>
      </div>`;
    }

    // 回复数：仅当数据中存在时才显示
    const replyAction = (tweet.stats && tweet.stats.replyCount != null)
      ? `<span class="action-item" aria-label="回复数"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="m10 8-3 3 3 3"/><path d="M17 14v-1a2 2 0 0 0-2-2H7"/></svg> ${formatNumber(tweet.stats.replyCount)}</span>`
      : '';

    // 仅搜索结果卡片显示的附加控件
    const score = typeof options.score === 'number' ? options.score : 0;
    const scoreBadge = options.showScore
      ? `<button type="button" class="similarity-badge" aria-label="查看搜索详情，相似度 ${score.toFixed(4)}" data-search-detail>
          ${score.toFixed(2)}
        </button>`
      : '';

    const locateButton = options.showLocate
      ? `<button type="button" class="action-item action-item--locate" aria-label="定位到时间线中的该推文" data-locate>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
          <span>定位到时间线</span>
        </button>`
      : '';

    const shareButton = `
      <button type="button" class="action-item action-item--share" aria-label="分享此推文链接" title="复制分享链接" data-share>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
      </button>`;

    html += `
      <div class="tweet-avatar">
        <img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(displayName)} 的头像" class="avatar avatar--sm" loading="lazy" />
      </div>
      <div class="tweet-body">
        <div class="tweet-header">
          <span class="tweet-author">${escapeHtml(displayName)}</span>
          <span class="tweet-username">@${escapeHtml(username)}</span>
          <time class="tweet-time" datetime="${timeIso}" title="${new Date(tweet.createdAtMs).toLocaleString()}">${escapeHtml(timeText)}</time>
        </div>
        ${renderTweetText(tweet)}
        ${renderMediaGrid(tweet.media, tweet)}
        ${renderQuoteCard(tweet.quotedStatus)}
        <div class="tweet-actions" aria-label="推文操作与互动统计">
          ${locateButton}
          ${shareButton}
          ${replyAction}
          <span class="action-item" aria-label="转发数"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/></svg> ${formatNumber(tweet.stats.retweetCount)}</span>
          <span class="action-item" aria-label="喜欢数"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg> ${formatNumber(tweet.stats.favoriteCount)}</span>
          ${scoreBadge}
          <button type="button" class="action-item action-item--more" aria-label="查看推文更多信息" data-more>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
        </div>
      </div>
    `;

    article.innerHTML = html;

    const moreBtn = article.querySelector('[data-more]');
    if (moreBtn) {
      moreBtn.addEventListener('click', () => openModal(tweet));
    }

    const detailBtn = article.querySelector('[data-search-detail]');
    if (detailBtn) {
      detailBtn.addEventListener('click', () => openSearchDetailModal(tweet, score));
    }

    const locateBtn = article.querySelector('[data-locate]');
    if (locateBtn) {
      locateBtn.addEventListener('click', () => {
        locateTweetInTimeline(tweet.id);
      });
    }

    const shareBtn = article.querySelector('[data-share]');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        const url = `${SITE_DOMAIN}/#/i/status/${encodeURIComponent(tweet.id)}`;
        const success = await copyToClipboard(url);
        if (success) {
          showToast('分享链接已复制到剪贴板');
        } else {
          showToast('无法自动复制，请手动复制链接');
        }
      });
    }

    // 展开/收起长推文
    const expandBtn = article.querySelector('[data-expand-toggle]');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        const textContainer = expandBtn.closest('.tweet-text');
        if (!textContainer) return;
        const isExpanded = textContainer.classList.toggle('expanded');
        expandBtn.setAttribute('aria-expanded', String(isExpanded));
        const label = expandBtn.querySelector('.expand-btn__label');
        const icon = expandBtn.querySelector('.expand-btn__icon');
        if (label) label.textContent = isExpanded ? '收起' : '展开';
        // 切换图标方向：chevron-down ↔ chevron-up
        if (icon) {
          if (isExpanded) {
            icon.innerHTML = '<polyline points="18 15 12 9 6 15"/>';
          } else {
            icon.innerHTML = '<polyline points="6 9 12 15 18 9"/>';
          }
        }
      });
    }

    return article;
  }

  function getFirstTweetDate(tweets) {
    if (!tweets || tweets.length === 0) return null;
    let min = Infinity;
    for (const tweet of tweets) {
      if (tweet.createdAtMs && tweet.createdAtMs < min) min = tweet.createdAtMs;
    }
    return min === Infinity ? null : min;
  }

  function formatFirstTweetDate(ms) {
    const date = new Date(ms);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function getDisplayName(tweet) {
    if (tweet.type === 'retweet' && tweet.retweetedStatus) {
      return tweet.retweetedStatus.user.displayName || tweet.retweetedStatus.user.screenName || '未知用户';
    }
    return (state.profile && state.profile.displayName) || (state.profile && state.profile.userName) || '未知用户';
  }

  function getUsername(tweet) {
    if (tweet.type === 'retweet' && tweet.retweetedStatus) {
      return tweet.retweetedStatus.user.screenName || 'unknown';
    }
    return (state.profile && state.profile.userName) || 'unknown';
  }

  function getTweetAvatar(tweet) {
    if (tweet.type === 'retweet' && tweet.retweetedStatus && tweet.retweetedStatus.user.avatarUrl) {
      return tweet.retweetedStatus.user.avatarUrl;
    }
    return (state.profile && state.profile.avatarUrl) || 'media/images/avatar.jpg';
  }

  function getTweetBodyHtml(tweet) {
    if (tweet.type === 'retweet' && tweet.retweetedStatus) {
      const rt = tweet.retweetedStatus;
      const rtText = rt.isNoteTweet && rt.noteTweetText ? rt.noteTweetText : rt.fullText;
      return linkifyPlainText(rtText);
    }
    if (tweet.isNoteTweet && tweet.noteTweetText) {
      return linkifyPlainText(tweet.noteTweetText);
    }
    return tweet.htmlText || linkifyPlainText(tweet.fullText);
  }

  /**
   * 推文文本长度阈值：超过此字符数的推文默认截断，提供展开按钮。
   * 280 字符是 X 的旧推文限制，超过此长度的内容值得截断以节省垂直空间。
   */
  const EXPAND_THRESHOLD = 280;

  /**
   * 渲染推文文本区域，包含可选的展开/收起功能。
   *
   * 当推文文本超过阈值或为 Note Tweet 时，默认显示前 6 行（CSS line-clamp），
   * 并提供一个可键盘操作的按钮来切换完整文本的显示。
   *
   * @param {object} tweet
   * @returns {string} HTML 字符串
   */
  function renderTweetText(tweet) {
    const bodyHtml = getTweetBodyHtml(tweet);
    // 长推文（Note Tweet）使用 noteTweetText 计算长度，避免用被截断的 fullText 误判
    const displayText = tweet.isNoteTweet && tweet.noteTweetText ? tweet.noteTweetText : (tweet.fullText || '');
    const textLength = displayText.length;
    const needsTruncation = textLength > EXPAND_THRESHOLD || tweet.isNoteTweet;

    if (!needsTruncation) {
      return `<div class="tweet-text">${bodyHtml}</div>`;
    }

    // 使用唯一 ID 关联 aria-controls
    const textId = `tweet-text-${tweet.id}`;

    return `<div class="tweet-text tweet-text--truncated" id="${escapeHtml(textId)}">
      <span class="tweet-text-content">${bodyHtml}</span>
      <button type="button" class="expand-btn" aria-expanded="false" aria-controls="${escapeHtml(textId)}" data-expand-toggle>
        <span class="expand-btn__label">展开</span>
        <svg class="expand-btn__icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>`;
  }

  function renderMediaGrid(media, tweet) {
    if (!media || media.length === 0) return '';

    const count = media.length;
    const gridClass = count === 1 ? 'media-grid--single' :
                      count === 2 ? 'media-grid--two' :
                      count === 3 ? 'media-grid--three' :
                      'media-grid--four';

    const username = tweet ? getUsername(tweet) : 'unknown';
    const dateText = tweet ? formatFirstTweetDate(tweet.createdAtMs) : '';
    const context = dateText ? `来自 @${username} 于 ${dateText} 的推文` : `来自 @${username} 的推文`;

    let html = `<div class="media-grid ${gridClass}" role="group" aria-label="媒体附件，共 ${count} 项">`;
    for (let i = 0; i < media.length; i++) {
      const m = media[i];
      const typeLabel = m.type === 'photo' ? '图片' : (m.type === 'video' ? '视频' : '动图');
      const altText = `${typeLabel} ${i + 1}/${count} — ${context}`;
      if (m.type === 'video' || m.type === 'animated_gif') {
        const poster = m.thumbUrl && !m.thumbUrl.startsWith('http') ? m.thumbUrl : '';
        html += `
          <div class="media-item">
            <video controls preload="metadata" ${poster ? `poster="${escapeHtml(poster)}"` : ''} aria-label="${escapeHtml(altText)}">
              <source src="${escapeHtml(m.url || '')}" type="video/mp4" />
              您的浏览器不支持视频播放。
            </video>
          </div>
        `;
      } else {
        html += `
          <img class="media-item" src="${escapeHtml(m.url || '')}" alt="${escapeHtml(altText)}" loading="lazy" />
        `;
      }
    }
    html += '</div>';
    return html;
  }

  function renderQuoteCard(quotedStatus) {
    if (!quotedStatus) return '';
    const text = quotedStatus.isNoteTweet && quotedStatus.noteTweetText
      ? quotedStatus.noteTweetText
      : quotedStatus.fullText;
    return `
      <div class="quote-card">
        <div class="tweet-header">
          <span class="tweet-author">${escapeHtml(quotedStatus.user.displayName || quotedStatus.user.screenName)}</span>
          <span class="tweet-username">@${escapeHtml(quotedStatus.user.screenName)}</span>
        </div>
        <div class="tweet-text">${escapeHtml(text)}</div>
      </div>
    `;
  }

  // ---------------- 文章 ----------------
  function renderArticleList() {
    els.feedTitle.textContent = '文章';
    const articles = state.articles;

    if (articles.length === 0) {
      els.tweetStream.innerHTML = '<div class="empty-state"><p>没有已发布的文章。</p></div>';
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const article of articles) {
      const card = document.createElement('article');
      card.className = 'article-card';
      const excerpt = article.blocks.map((b) => b.text).join(' ').slice(0, 140);
      card.innerHTML = `
        <a href="#/article/${encodeURIComponent(article.id)}">
          <h3>${escapeHtml(article.title || '无标题文章')}</h3>
          <p>${escapeHtml(excerpt)}${excerpt.length >= 140 ? '…' : ''}</p>
        </a>
      `;
      fragment.appendChild(card);
    }
    els.tweetStream.innerHTML = '';
    els.tweetStream.appendChild(fragment);
    state.hasMore = false;
  }

  function renderArticle(articleId) {
    resetSearchView();
    const article = state.articles.find((a) => a.id === articleId);
    if (!article) {
      els.tweetStream.innerHTML = '<div class="empty-state"><p>找不到该文章。</p></div>';
      return;
    }

    els.feedTitle.textContent = article.title || '文章详情';

    let contentHtml = '';
    for (const block of article.blocks) {
      if (block.type === 'heading') {
        const tag = block.level === 3 ? 'h3' : 'h2';
        contentHtml += `<${tag}>${escapeHtml(block.text)}</${tag}>`;
      } else if (block.type === 'quote') {
        contentHtml += `<blockquote>${escapeHtml(block.text)}</blockquote>`;
      } else if (block.type === 'list') {
        contentHtml += `<p>${escapeHtml(block.text)}</p>`;
      } else {
        contentHtml += `<p>${escapeHtml(block.text)}</p>`;
      }
    }

    els.tweetStream.innerHTML = `
      <article class="article-detail">
        <a href="#/articles" class="back-link">← 返回文章列表</a>
        <h1>${escapeHtml(article.title || '无标题文章')}</h1>
        <div>${contentHtml}</div>
      </article>
    `;
    state.hasMore = false;
  }

  // ---------------- 无限滚动 ----------------
  function setupInfiniteScroll() {
    if (!els.scrollSentinel) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && state.hasMore && !state.isLoading && state.currentTab !== 'articles') {
        state.isLoading = true;
        renderFeed(true);
        state.isLoading = false;
      }
    }, { rootMargin: '200px' });

    observer.observe(els.scrollSentinel);
  }

  // ---------------- 搜索 ----------------
  function setupSearch() {
    if (!els.searchForm || !els.searchInput) return;

    // 表单提交（Enter 或点击搜索按钮）触发搜索
    els.searchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = els.searchInput.value.trim();
      if (!query) return;
      window.location.hash = `#/search?q=${encodeURIComponent(query)}`;
    });

    // 清除搜索按钮返回主页
    if (els.clearSearch) {
      els.clearSearch.addEventListener('click', () => {
        if (els.searchInput) els.searchInput.value = '';
        if (els.mobileSearchInput) els.mobileSearchInput.value = '';
        window.location.hash = '#/';
      });
    }

    // 输入框 Enter 已包含在 form submit 中；额外处理清空时返回主页
    els.searchInput.addEventListener('search', () => {
      if (els.searchInput.value.trim() === '' && state.currentView === 'search') {
        window.location.hash = '#/';
      }
    });

    // 提前后台加载模型，缩短首次搜索等待时间
    // 使用 requestIdleCallback 避免阻塞首屏渲染；不支持时回退到 setTimeout
    const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 2000));
    schedule(() => {
      loadModel().catch(() => {
        // 预加载失败不影响首屏，搜索时会再次提示
      });
    });
  }

  /**
   * 初始化移动端搜索入口。
   *
   * 在 <768px 视口下，桌面右侧边栏搜索框被隐藏，因此需要在主内容区
   * 顶部提供独立的搜索触发按钮与可展开输入框。
   */
  function setupMobileSearch() {
    if (!els.mobileSearchToggle || !els.mobileSearchForm || !els.mobileSearchInput) return;

    els.mobileSearchToggle.addEventListener('click', () => {
      const isOpen = els.mobileSearchForm.classList.toggle('is-open');
      els.mobileSearchToggle.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        els.mobileSearchInput.focus();
      } else {
        els.mobileSearchInput.blur();
      }
    });

    els.mobileSearchForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const query = els.mobileSearchInput.value.trim();
      if (!query) return;
      window.location.hash = `#/search?q=${encodeURIComponent(query)}`;
      closeMobileSearch();
    });

    // 输入框失去焦点且焦点未落在表单内其他元素时，自动收起搜索框
    els.mobileSearchInput.addEventListener('blur', () => {
      // 延迟执行，避免点击提交按钮时先触发 blur 导致按钮失效
      setTimeout(() => {
        if (!els.mobileSearchForm.contains(document.activeElement)) {
          closeMobileSearch();
        }
      }, 150);
    });
  }

  /**
   * 收起移动端搜索输入框。
   */
  function closeMobileSearch() {
    if (!els.mobileSearchForm || !els.mobileSearchToggle) return;
    els.mobileSearchForm.classList.remove('is-open');
    els.mobileSearchToggle.setAttribute('aria-expanded', 'false');
  }

  /**
   * 渲染搜索视图。
   *
   * @param {string} query 查询关键词
   */
  async function renderSearchView(query) {
    // 切换视图：隐藏常规 feed，显示搜索区域
    hideFeedForSearch();

    // 更新标题与输入框
    els.feedTitle.textContent = query ? `搜索：${query}` : '搜索';
    if (els.searchInput) els.searchInput.value = query;
    if (els.mobileSearchInput) els.mobileSearchInput.value = query;
    if (els.clearSearch) els.clearSearch.classList.remove('hidden');
    closeMobileSearch();

    if (!query) {
      renderSearchState('请输入关键词开始搜索。', 'info');
      return;
    }

    // 显示模型加载 / 搜索中状态
    const status = getModelStatus();
    if (status === 'loading') {
      renderSearchState('正在加载语义模型，首次使用需要下载约 112 MB 数据…', 'loading');
      showModelLoading(true);
    } else if (status === 'idle') {
      renderSearchState('正在准备语义模型…', 'loading');
      showModelLoading(true);
    } else if (status === 'error') {
      renderSearchState('模型加载失败，无法执行搜索。', 'error');
      showModelLoading(false);
      return;
    } else {
      showModelLoading(false);
    }

    try {
      const results = await search(query, 20);
      // 搜索完成后隐藏模型加载提示
      showModelLoading(false);

      if (results.length === 0) {
        renderSearchState(`没有找到与“${escapeHtml(query)}”相关的内容。`, 'empty');
        els.searchResults.innerHTML = '';
        return;
      }

      // 清空状态提示，渲染结果列表
      renderSearchState('', 'ready');
      renderSearchResults(results, query);
    } catch (err) {
      console.error('Search failed:', err);
      renderSearchState(
        `搜索失败：${escapeHtml(err.message || '未知错误')}。请刷新页面后重试。`,
        'error'
      );
    }
  }

  /**
   * 将搜索结果渲染到 #search-results 容器。
   *
   * @param {Array<{id: string, score: number}>} results
   * @param {string} query
   */
  function renderSearchResults(results, query) {
    if (!els.searchResults) return;

    const tweetMap = new Map(state.tweets.map((t) => [t.id, t]));
    const fragment = document.createDocumentFragment();
    let renderedCount = 0;

    for (const { id, score } of results) {
      const tweet = tweetMap.get(id);
      if (!tweet) continue;
      const card = createTweetCard(tweet, {
        showScore: true,
        score,
        showLocate: true,
      });

      // 对结果文本中的查询词做视觉高亮（仅辅助，不影响语义排序）
      const tweetTextEl = card.querySelector('.tweet-text');
      if (tweetTextEl) {
        highlightText(tweetTextEl, query);
      }

      fragment.appendChild(card);
      renderedCount += 1;
    }

    els.searchResults.innerHTML = '';
    if (renderedCount === 0) {
      els.searchResults.innerHTML = `
        <div class="empty-state" role="status">
          <p>未找到与“${escapeHtml(query)}”匹配的推文内容。</p>
        </div>
      `;
      return;
    }

    els.searchResults.appendChild(fragment);
  }

  /**
   * 在元素内高亮查询词。
   * 仅处理文本节点，避免破坏已有链接或 HTML 结构。
   *
   * @param {HTMLElement} element
   * @param {string} query
   */
  function highlightText(element, query) {
    const terms = query
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (terms.length === 0) return;

    // 转义正则特殊字符，允许中文、英文、数字
    const pattern = new RegExp(
      `(${terms.map((t) => escapeRegExp(t)).join('|')})`,
      'gi'
    );

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    for (const textNode of textNodes) {
      const text = textNode.textContent;
      if (!pattern.test(text)) continue;
      pattern.lastIndex = 0;

      const span = document.createElement('span');
      // 使用 mark 标签语义化表示高亮，配合 .search-highlight 样式
      span.innerHTML = escapeHtml(text).replace(
        pattern,
        '<mark class="search-highlight">$1</mark>'
      );

      const fragment = document.createDocumentFragment();
      while (span.firstChild) {
        fragment.appendChild(span.firstChild);
      }
      textNode.parentNode.replaceChild(fragment, textNode);
    }
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 显示搜索状态提示。
   *
   * @param {string} message 提示文本（为空时隐藏容器）
   * @param {'loading' | 'empty' | 'error' | 'info' | 'ready'} type
   */
  function renderSearchState(message, type) {
    if (!els.searchState) return;

    if (!message) {
      els.searchState.classList.add('hidden');
      els.searchState.innerHTML = '';
      return;
    }

    els.searchState.classList.remove('hidden');
    els.searchState.className = `search-state search-state--${type}`;
    els.searchState.innerHTML = `
      <p>${type === 'loading' ? '<span class="search-spinner" aria-hidden="true"></span>' : ''}${escapeHtml(message)}</p>
    `;
  }

  /**
   * 进入搜索视图时隐藏常规 feed 与标签页，显示搜索容器。
   */
  function hideFeedForSearch() {
    if (els.tweetStream) els.tweetStream.classList.add('hidden');
    if (els.feedHeader) els.feedHeader.classList.remove('hidden');
    if (els.scrollSentinel) els.scrollSentinel.classList.add('hidden');
    if (els.profileView) {
      els.profileView.classList.add('hidden');
      els.profileView.innerHTML = '';
    }
    if (els.searchResults) els.searchResults.classList.remove('hidden');
  }

  /**
   * 控制模型加载状态提示的可见性。
   * 在搜索触发时显示，模型就绪或搜索完成后隐藏。
   *
   * @param {boolean} visible 是否显示加载提示
   */
  function showModelLoading(visible) {
    if (!els.modelLoadingState) return;
    if (visible) {
      els.modelLoadingState.classList.remove('hidden');
    } else {
      els.modelLoadingState.classList.add('hidden');
    }
  }

  /**
   * 离开搜索视图时恢复常规 feed 容器。
   * 在 showFeedView / renderProfileView 中调用。
   */
  function resetSearchView() {
    showModelLoading(false);
    if (els.searchState) {
      els.searchState.classList.add('hidden');
      els.searchState.innerHTML = '';
    }
    if (els.searchResults) {
      els.searchResults.classList.add('hidden');
      els.searchResults.innerHTML = '';
    }
    if (els.clearSearch) els.clearSearch.classList.add('hidden');
    if (els.searchInput) els.searchInput.value = '';
    if (els.mobileSearchInput) els.mobileSearchInput.value = '';
  }

  // ---------------- 工具函数 ----------------
  function formatTime(ms) {
    const date = new Date(ms);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 365) return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
    if (diffDay > 0) return `${diffDay}天前`;
    if (diffHour > 0) return `${diffHour}小时前`;
    if (diffMin > 0) return `${diffMin}分钟前`;
    return '刚刚';
  }

  function formatNumber(n) {
    const num = Number(n) || 0;
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(num);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function linkifyPlainText(text) {
    return escapeHtml(text)
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-link">$1</a>')
      .replace(/@(\w+)/g, '<a href="https://x.com/$1" target="_blank" rel="noopener noreferrer" class="text-link">@$1</a>');
  }

  // ---------------- 启动 ----------------
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
