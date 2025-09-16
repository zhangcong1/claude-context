"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const vscode = __importStar(require("vscode"));
class ConfigManager {
    static instance;
    config;
    constructor() {
        this.config = vscode.workspace.getConfiguration('vscode-graphrag');
    }
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    getConfig() {
        const embeddingConfig = this.config.get('embeddingProvider', {
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
            includeTemplate: this.config.get('includeTemplate', false),
            maxNodesPerFile: this.config.get('maxNodesPerFile', 100),
            maxFileSizeKB: this.config.get('maxFileSizeKB', 50)
        };
    }
    updateConfig(updates) {
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
    onDidChangeConfiguration(callback) {
        return vscode.workspace.onDidChangeConfiguration(callback);
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=configManager.js.map