/**
 * 搜索相关纯工具函数
 *
 * 这些函数不依赖浏览器专属 API，可被单元测试覆盖。
 * 负责向量格式化、时间线定位计算等可预测的数据转换。
 */

/**
 * 将向量格式化为可阅读的多行 JSON 字符串。
 *
 * 长向量（如 384 维 embedding）直接展开会撑破布局，因此按每行固定数量
 * 折行显示，并限制小数位，既保留可读性又避免横向滚动。
 *
 * @param {Float32Array | number[]} vector 原始向量
 * @param {number} [perLine=8] 每行显示的数值个数
 * @returns {string} 格式化后的 JSON 字符串
 */
export function formatVectorForDisplay(vector, perLine = 8) {
  if (!vector || vector.length === 0) {
    return '[]';
  }

  const arr = Array.from(vector);
  const lines = [];
  for (let i = 0; i < arr.length; i += perLine) {
    const chunk = arr.slice(i, i + perLine).map((n) => Number(n.toFixed(6)));
    lines.push(chunk.join(', '));
  }
  return `[\n  ${lines.join(',\n  ')}\n]`;
}

/**
 * 在按时间倒序排列的推文数组中查找指定推文索引。
 *
 * @param {Array<{id: string}>} tweets 推文数组
 * @param {string} tweetId 目标推文 ID
 * @returns {number} 索引位置；未找到返回 -1
 */
export function findTweetTimelineIndex(tweets, tweetId) {
  if (!Array.isArray(tweets) || !tweetId) return -1;
  return tweets.findIndex((t) => t && t.id === tweetId);
}

/**
 * 根据推文索引与每页条数计算目标页码。
 *
 * @param {number} index 推文索引
 * @param {number} pageSize 每页推文数量
 * @returns {number} 目标页码（0-based）
 */
export function computeTargetPage(index, pageSize) {
  if (index < 0 || pageSize <= 0) return 0;
  return Math.floor(index / pageSize);
}

/**
 * 返回指定页码对应的推文切片。
 *
 * 用于窗口化渲染：只取一页（默认 20 条）而非从头遍历整个时间线，
 * 从而将 DOM 插入量从 O(n) 降为 O(pageSize)。
 *
 * @param {Array<object>} tweets  推文数组（按时间倒序）
 * @param {number}         page    0-based 页码
 * @param {number}         pageSize 每页条数
 * @returns {Array<object>} 该页包含的推文（可能为空数组）
 */
export function getPageSlice(tweets, page, pageSize) {
  if (!Array.isArray(tweets) || page < 0 || pageSize <= 0) return [];
  const start = page * pageSize;
  return tweets.slice(start, start + pageSize);
}

/**
 * 根据推文 ID 查找其在时间线中的索引与所在页码。
 *
 * 返回 null（而非 -1）以便调用方使用可选链。
 *
 * @param {Array<object>} tweets   推文数组
 * @param {string}         tweetId  目标推文 ID
 * @param {number}         pageSize 每页条数
 * @returns {{ index: number, page: number } | null}
 */
export function findTweetPage(tweets, tweetId, pageSize) {
  const index = findTweetTimelineIndex(tweets, tweetId);
  if (index === -1) return null;
  return { index, page: computeTargetPage(index, pageSize) };
}
