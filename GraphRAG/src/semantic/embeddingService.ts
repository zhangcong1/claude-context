import * as vscode from 'vscode';
import { ConfigManager, EmbeddingConfig } from '../config/configManager';

export interface EmbeddingResult {
    vector: number[];
    success: boolean;
    error?: string;
}

export interface SemanticSearchResult {
    nodeId: string;
    similarity: number;
    relevanceScore: number;
    semanticMatch: boolean;
}

/**
 * 嵌入服务：负责文本向量化和语义相似度计算
 */
export class EmbeddingService {
    private configManager: ConfigManager;
    private cache = new Map<string, number[]>();

    constructor() {
        this.configManager = ConfigManager.getInstance();
    }

    /**
     * 获取文本的向量嵌入
     */
    async getEmbedding(text: string): Promise<EmbeddingResult> {
        // 检查缓存
        if (this.cache.has(text)) {
            return {
                vector: this.cache.get(text)!,
                success: true
            };
        }

        const config = this.configManager.getConfig().embeddingProvider;
        
        try {
            let vector: number[];
            
            switch (config.provider) {
                case 'OpenAI':
                    vector = await this.getOpenAIEmbedding(text, config);
                    break;
                case 'VoyageAI':
                    vector = await this.getVoyageAIEmbedding(text, config);
                    break;
                case 'Ollama':
                    vector = await this.getOllamaEmbedding(text, config);
                    break;
                case 'Gemini':
                    vector = await this.getGeminiEmbedding(text, config);
                    break;
                default:
                    throw new Error(`不支持的嵌入提供商: ${config.provider}`);
            }

            // 缓存结果
            this.cache.set(text, vector);
            
            return {
                vector,
                success: true
            };
        } catch (error) {
            console.error('获取嵌入向量失败:', error);
            return {
                vector: [],
                success: false,
                error: error instanceof Error ? error.message : '未知错误'
            };
        }
    }

    /**
     * OpenAI 嵌入服务
     */
    private async getOpenAIEmbedding(text: string, config: EmbeddingConfig): Promise<number[]> {
        const baseURL = config.baseURL || 'https://api.openai.com/v1';
        const response = await fetch(`${baseURL}/embeddings`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: text,
                model: config.model,
                encoding_format: 'float',
                dimensions: config.outputDimensionality
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API 错误: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        return data.data[0].embedding;
    }

    /**
     * VoyageAI 嵌入服务
     */
    private async getVoyageAIEmbedding(text: string, config: EmbeddingConfig): Promise<number[]> {
        const response = await fetch('https://api.voyageai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input: [text],
                model: config.model
            })
        });

        if (!response.ok) {
            throw new Error(`VoyageAI API 错误: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        return data.data[0].embedding;
    }

    /**
     * Ollama 本地嵌入服务
     */
    private async getOllamaEmbedding(text: string, config: EmbeddingConfig): Promise<number[]> {
        const baseURL = config.host || 'http://localhost:11434';
        const response = await fetch(`${baseURL}/api/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: config.model,
                prompt: text,
                keep_alive: config.keepAlive || '5m'
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama API 错误: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        return data.embedding;
    }

    /**
     * Gemini 嵌入服务
     */
    private async getGeminiEmbedding(text: string, config: EmbeddingConfig): Promise<number[]> {
        const baseURL = config.baseURL || 'https://generativelanguage.googleapis.com/v1beta';
        const response = await fetch(`${baseURL}/models/${config.model}:embedContent`, {
            method: 'POST',
            headers: {
                'x-goog-api-key': config.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: {
                    parts: [{ text }]
                },
                taskType: 'SEMANTIC_SIMILARITY'
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API 错误: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        return data.embedding.values;
    }

    /**
     * 计算余弦相似度
     */
    cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            throw new Error('向量维度不匹配');
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    /**
     * 批量获取嵌入向量
     */
    async getBatchEmbeddings(texts: string[]): Promise<(number[] | null)[]> {
        const results: (number[] | null)[] = [];
        
        // 批量处理，每次最多10个
        const batchSize = 10;
        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);
            const batchPromises = batch.map(async (text) => {
                const result = await this.getEmbedding(text);
                return result.success ? result.vector : null;
            });
            
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        
        return results;
    }

    /**
     * 清理缓存
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * 获取缓存大小
     */
    getCacheSize(): number {
        return this.cache.size;
    }
}