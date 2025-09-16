"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeGraph = void 0;
class KnowledgeGraph {
    nodes = new Map();
    edges = new Set();
    lastUpdated = new Date();
    // 添加节点
    addNode(node) {
        this.nodes.set(node.id, node);
        this.lastUpdated = new Date();
    }
    // 添加边
    addEdge(edge) {
        // 检查源节点是否存在，如果目标是外部引用则也允许添加
        if (this.nodes.has(edge.source)) {
            this.edges.add(edge);
            this.lastUpdated = new Date();
        }
    }
    // 批量添加节点
    addNodes(nodes) {
        nodes.forEach(node => this.addNode(node));
    }
    // 批量添加边
    addEdges(edges) {
        edges.forEach(edge => this.addEdge(edge));
    }
    // 查找节点
    findNode(id) {
        return this.nodes.get(id);
    }
    // 查找所有节点
    getAllNodes() {
        return Array.from(this.nodes.values());
    }
    // 查找所有边
    getAllEdges() {
        return Array.from(this.edges.values());
    }
    // 根据类型查找节点
    findNodesByType(type) {
        return this.getAllNodes().filter(node => node.type === type);
    }
    // 查找节点的邻居
    findNeighbors(nodeId) {
        const edges = this.getAllEdges().filter(edge => edge.source === nodeId || edge.target === nodeId);
        const neighborIds = new Set();
        edges.forEach(edge => {
            if (edge.source === nodeId) {
                neighborIds.add(edge.target);
            }
            if (edge.target === nodeId) {
                neighborIds.add(edge.source);
            }
        });
        const nodes = Array.from(neighborIds).map(id => this.nodes.get(id)).filter(Boolean);
        return { nodes, edges };
    }
    // 查找关系
    findEdges(sourceId, targetId) {
        return this.getAllEdges().filter(edge => edge.source === sourceId && edge.target === targetId);
    }
    // 更新节点
    updateNode(id, updates) {
        const node = this.nodes.get(id);
        if (node) {
            Object.assign(node, updates);
            this.lastUpdated = new Date();
            return true;
        }
        return false;
    }
    // 删除节点
    removeNode(id) {
        if (this.nodes.has(id)) {
            this.nodes.delete(id);
            // 删除相关的边
            this.edges.forEach(edge => {
                if (edge.source === id || edge.target === id) {
                    this.edges.delete(edge);
                }
            });
            this.lastUpdated = new Date();
            return true;
        }
        return false;
    }
    // 删除边
    removeEdge(sourceId, targetId, relation) {
        let removed = false;
        this.edges.forEach(edge => {
            if (edge.source === sourceId && edge.target === targetId &&
                (!relation || edge.relation === relation)) {
                this.edges.delete(edge);
                removed = true;
            }
        });
        if (removed) {
            this.lastUpdated = new Date();
        }
        return removed;
    }
    // 清空图谱
    clear() {
        this.nodes.clear();
        this.edges.clear();
        this.lastUpdated = new Date();
    }
    // 获取图谱统计信息
    getStats() {
        const nodeTypes = {};
        const relationTypes = {};
        this.nodes.forEach(node => {
            nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
        });
        this.edges.forEach(edge => {
            relationTypes[edge.relation] = (relationTypes[edge.relation] || 0) + 1;
        });
        return {
            nodeCount: this.nodes.size,
            edgeCount: this.edges.size,
            nodeTypes,
            relationTypes,
            lastUpdated: this.lastUpdated
        };
    }
    // 导出为JSON
    exportToJson() {
        return JSON.stringify({
            nodes: this.getAllNodes(),
            edges: this.getAllEdges(),
            stats: this.getStats()
        }, null, 2);
    }
    // 从JSON导入
    importFromJson(json) {
        try {
            const data = JSON.parse(json);
            if (data.nodes && Array.isArray(data.nodes)) {
                this.clear();
                this.addNodes(data.nodes);
                if (data.edges && Array.isArray(data.edges)) {
                    this.addEdges(data.edges);
                }
                return true;
            }
        }
        catch (error) {
            console.error('Failed to import graph from JSON:', error);
        }
        return false;
    }
    // 搜索节点（支持名称模糊匹配）
    searchNodes(query) {
        const lowerQuery = query.toLowerCase();
        const results = new Map();
        for (const node of this.nodes.values()) {
            let score = 0;
            // 精确匹配名称
            if (node.name.toLowerCase() === lowerQuery) {
                score += 10;
            }
            // 名称包含查询
            else if (node.name.toLowerCase().includes(lowerQuery)) {
                score += 5;
            }
            // 类型匹配
            if (node.type.toLowerCase().includes(lowerQuery)) {
                score += 3;
            }
            // 文件路径匹配
            if (node.file.toLowerCase().includes(lowerQuery)) {
                score += 2;
            }
            // ID匹配
            if (node.id.toLowerCase().includes(lowerQuery)) {
                score += 1;
            }
            // 语义描述匹配
            if (node.semantic && node.semantic.toLowerCase().includes(lowerQuery)) {
                score += 4;
            }
            // 代码片段匹配
            if (node.snippet && node.snippet.toLowerCase().includes(lowerQuery)) {
                score += 3;
            }
            // 元数据匹配
            if (node.metadata) {
                if (node.metadata.documentation && node.metadata.documentation.toLowerCase().includes(lowerQuery)) {
                    score += 4;
                }
                if (node.metadata.tags && node.metadata.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
                    score += 3;
                }
                if (node.metadata.functionSignature && node.metadata.functionSignature.toLowerCase().includes(lowerQuery)) {
                    score += 3;
                }
            }
            // 只保留有匹配分数的节点
            if (score > 0) {
                results.set(node.id, { node, score });
            }
        }
        // 按分数排序并返回节点
        return Array.from(results.values())
            .sort((a, b) => b.score - a.score)
            .map(item => item.node);
    }
    // 获取文件相关的所有节点
    getNodesByFile(filePath) {
        return this.getAllNodes().filter(node => node.file === filePath);
    }
    // 删除文件相关的所有节点和边
    removeFile(filePath) {
        const nodesToRemove = this.getNodesByFile(filePath);
        let removedCount = 0;
        nodesToRemove.forEach(node => {
            if (this.removeNode(node.id)) {
                removedCount++;
            }
        });
        return removedCount;
    }
}
exports.KnowledgeGraph = KnowledgeGraph;
//# sourceMappingURL=graph.js.map