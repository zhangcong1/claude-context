import * as vscode from 'vscode';

export interface EmbeddingConfig {
    provider: 'OpenAI' | 'VoyageAI' | 'Ollama' | 'Gemini';
    model: string;
    apiKey: string;
    baseURL?: string;
    host?: string;
    keepAlive?: string;
    outputDimensionality?: number;
}

export interface GraphRAGConfig {
    embeddingProvider: EmbeddingConfig;
    includeTemplate: boolean;
    maxNodesPerFile: number;
    maxFileSizeKB: number;
}

export class ConfigManager {
    private static instance: ConfigManager;
    private config: vscode.WorkspaceConfiguration;

    private constructor() {
        this.config = vscode.workspace.getConfiguration('vscode-graphrag');
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public getConfig(): GraphRAGConfig {
        const embeddingConfig = this.config.get<EmbeddingConfig>('embeddingProvider', {
            provider: 'OpenAI',
            model: 'text-embedding-3-large',
            apiKey: '',
            baseURL: '',
            host: '',
            keepAlive: '',
            outputDimensionality: 3072
        });

        return {
            embeddingProvider: embeddingConfig,
            includeTemplate: this.config.get<boolean>('includeTemplate', false),
            maxNodesPerFile: this.config.get<number>('maxNodesPerFile', 100),
            maxFileSizeKB: this.config.get<number>('maxFileSizeKB', 50)
        };
    }

    public updateConfig(updates: Partial<GraphRAGConfig>): void {
        if (updates.embeddingProvider) {
            this.config.update('embeddingProvider', updates.embeddingProvider, vscode.ConfigurationTarget.Global);
        }
        if (updates.includeTemplate !== undefined) {
            this.config.update('includeTemplate', updates.includeTemplate, vscode.ConfigurationTarget.Global);
        }
        if (updates.maxNodesPerFile !== undefined) {
            this.config.update('maxNodesPerFile', updates.maxNodesPerFile, vscode.ConfigurationTarget.Global);
        }
        if (updates.maxFileSizeKB !== undefined) {
            this.config.update('maxFileSizeKB', updates.maxFileSizeKB, vscode.ConfigurationTarget.Global);
        }
    }

    public onDidChangeConfiguration(callback: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration(callback);
    }
}
