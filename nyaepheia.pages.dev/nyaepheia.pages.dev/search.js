/**
 * 前端语义搜索模块
 *
 * 基于 Transformers.js 浏览器端模型实现完全本地的语义搜索。
 * 不调用任何外部 API，用户查询在浏览器内完成 embedding 并
 * 与构建时预计算的向量进行余弦相似度匹配。
 */

import { formatVectorForDisplay } from './search-utils.js';

// 默认模型从 Hugging Face Hub 加载；禁止回退到本地 /models/，避免纯静态部署时 404。
// 离线备份修改：Transformers.js 改为按需动态加载，避免 CDN 不可达时阻塞整个应用。
let transformersModulePromise = null;

async function loadTransformers() {
  if (!transformersModulePromise) {
    transformersModulePromise = import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2').then((mod) => {
      mod.env.allowLocalModels = false;
      return mod;
    });
  }
  return transformersModulePromise;
}

// 模型名称必须与构建时 generate_embeddings.py 使用的模型一致
// intfloat/multilingual-e5-small: 多语言模型，支持中英跨语言语义搜索
const MODEL_NAME = 'Xenova/multilingual-e5-small';
const EMBEDDINGS_URL = 'data/embeddings.json';

/**
 * 模块级状态机，控制模型加载与复用。
 * @type {'idle' | 'loading' | 'ready' | 'error'}
 */
let modelStatus = 'idle';

/** @type {any | null} 复用的 feature-extraction pipeline 实例 */
let extractor = null;

/** @type {string | null} 最近一次模型加载失败的错误信息 */
let lastError = null;

/** @type {string | null} 最近一次搜索的查询文本 */
let lastQuery = null;

/** @type {Float32Array | null} 最近一次搜索的查询向量 */
let lastQueryVector = null;

/** @type {Array<{id: string, embedding: number[]}> | null} 最近一次加载的文档 embeddings */
let lastEmbeddings = null;

/**
 * 懒加载语义模型。
 *
 * 首次调用会触发模型下载（通常 80-90 MB，由浏览器缓存）。
 * 后续调用直接返回已缓存的 pipeline 实例。
 *
 * @returns {Promise<any>} 可用的 feature-extraction pipeline
 */
export async function loadModel() {
  if (extractor) return extractor;
  if (modelStatus === 'loading') {
    // 等待当前加载完成：通过轮询复用同一实例
    await waitForLoading();
    if (extractor) return extractor;
    throw new Error(lastError || '模型加载失败，请刷新页面重试。');
  }

  modelStatus = 'loading';
  lastError = null;

  try {
    const { pipeline } = await loadTransformers();
    extractor = await pipeline('feature-extraction', MODEL_NAME, {
      // 使用 quantized 模型可显著减少下载体积，对语义排序影响可忽略
      quantized: true,
    });
    modelStatus = 'ready';
    return extractor;
  } catch (err) {
    modelStatus = 'error';
    lastError = normalizeError(err);
    console.error('[search] 模型加载失败:', err);
    throw new Error(lastError);
  }
}

/**
 * 获取当前模型状态。
 * @returns {'idle' | 'loading' | 'ready' | 'error'}
 */
export function getModelStatus() {
  return modelStatus;
}

/**
 * 获取最近一次搜索的完整上下文。
 *
 * @returns {{ query: string | null, queryVector: Float32Array | null, embeddings: Array<{id: string, embedding: number[]}> | null }}
 */
export function getSearchContext() {
  return {
    query: lastQuery,
    queryVector: lastQueryVector,
    embeddings: lastEmbeddings,
  };
}

/**
 * 语义搜索主入口。
 *
 * 流程：
 * 1. 加载模型（若尚未加载）。
 * 2. 对查询文本做 mean-pooling + L2 归一化 embedding。
 * 3. 拉取预计算 embeddings.json。
 * 4. 计算 query 与每个文档向量的余弦相似度（归一化后等价于点积）。
 * 5. 按 score 降序返回 topK 结果。
 *
 * @param {string} query 用户输入的查询文本
 * @param {number} [topK=20] 返回结果数量上限
 * @returns {Promise<Array<{id: string, score: number}>>}
 */
export async function search(query, topK = 20) {
  if (!query || typeof query !== 'string' || query.trim() === '') {
    return [];
  }

  const normalizedQuery = query.trim();

  // 1. 确保模型就绪
  const currentExtractor = await loadModel();

  // 2. 计算查询向量
  const queryEmbedding = await embedText(currentExtractor, normalizedQuery);

  // 3. 拉取预计算文档向量
  const docs = await fetchEmbeddings();

  // 4. 保留搜索上下文，供详情弹窗使用
  lastQuery = normalizedQuery;
  lastQueryVector = queryEmbedding;
  lastEmbeddings = docs;

  // 5. 计算相似度、排序，并过滤低置信度结果
  const SIMILARITY_THRESHOLD = 0.12;
  const results = docs
    .map((doc) => ({
      id: doc.id,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }))
    .filter((r) => r.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return results;
}

/**
 * 对单条文本做 embedding。
 *
 * @param {any} extractor 已加载的 feature-extraction pipeline
 * @param {string} text 输入文本
 * @returns {Float32Array} 384 维归一化向量
 */
async function embedText(extractor, text) {
  const output = await extractor(text, {
    pooling: 'mean',
    normalize: true,
  });

  // Transformers.js v2 返回 Tensor，.data 为 Float32Array
  if (output && output.data) {
    return output.data;
  }

  // 防御性降级：若 API 变化，尝试数组形式
  if (Array.isArray(output)) {
    return new Float32Array(output[0][0]);
  }

  throw new Error('无法解析模型返回的 embedding 格式。');
}

/**
 * 拉取并解析预计算 embeddings.json。
 *
 * @returns {Promise<Array<{id: string, embedding: number[]}>>}
 */
async function fetchEmbeddings() {
  const response = await fetch(EMBEDDINGS_URL);
  if (!response.ok) {
    throw new Error(
      `无法加载语义索引 (${response.status})。请确认已运行构建流程生成 embeddings.json。`
    );
  }
  return response.json();
}

/**
 * 计算两个已归一化向量间的余弦相似度。
 * 由于输入向量已 L2 归一化，点积即余弦相似度。
 *
 * @param {Float32Array | number[]} a
 * @param {Float32Array | number[]} b
 * @returns {number}
 */
function cosineSimilarity(a, b) {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
  }
  return dot;
}

/**
 * 等待其他调用者触发的模型加载完成。
 */
async function waitForLoading() {
  const maxAttempts = 600; // 最长约 60 秒（模型下载可能较慢）
  for (let i = 0; i < maxAttempts; i++) {
    if (modelStatus !== 'loading') return;
    // eslint-disable-next-line no-await-in-loop
    await sleep(100);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 将底层错误转换为面向用户的可读信息。
 *
 * @param {any} err
 * @returns {string}
 */
function normalizeError(err) {
  const message = err?.message || String(err);

  if (message.includes('network') || message.includes('fetch')) {
    return '网络异常，无法下载语义模型。请检查网络连接后刷新页面。';
  }
  if (message.includes('memory') || message.includes('out of memory')) {
    return '浏览器内存不足，无法加载模型。请关闭其他标签页后重试。';
  }
  if (message.includes('WebGL') || message.includes('webgl')) {
    return '浏览器图形加速不可用，语义模型无法运行。请尝试使用最新版 Chrome 或 Edge。';
  }
  return `语义模型加载失败：${message}`;
}
