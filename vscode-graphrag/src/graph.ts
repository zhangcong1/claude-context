import { GraphNode, GraphEdge, NodeType } from './parser-optimized';

export class KnowledgeGraph {
    private nodes = new Map<string, GraphNode>();
    private edges = new Set<GraphEdge>();
    private lastUpdated = new Date();

    // 添加节点
    addNode(node: GraphNode): void {
        this.nodes.set(node.id, node);
        this.lastUpdated = new Date();
    }

    // 添加边
    addEdge(edge: GraphEdge): void {
        // 检查源节点和目标节点是否存在
        if (this.nodes.has(edge.source) && this.nodes.has(edge.target)) {
            this.edges.add(edge);
            this.lastUpdated = new Date();
        }
    }

    // 批量添加节点
    addNodes(nodes: GraphNode[]): void {
        nodes.forEach(node => this.addNode(node));
    }

    // 批量添加边
    addEdges(edges: GraphEdge[]): void {
        edges.forEach(edge => this.addEdge(edge));
    }

    // 查找节点
    findNode(id: string): GraphNode | undefined {
        return this.nodes.get(id);
    }

    // 查找所有节点
    getAllNodes(): GraphNode[] {
        return Array.from(this.nodes.values());
    }

    // 查找所有边
    getAllEdges(): GraphEdge[] {
        return Array.from(this.edges.values());
    }

    // 根据类型查找节点
    findNodesByType(type: NodeType): GraphNode[] {
        return this.getAllNodes().filter(node => node.type === type);
    }

    // 查找节点的邻居
    findNeighbors(nodeId: string): { nodes: GraphNode[], edges: GraphEdge[] } {
        const edges = this.getAllEdges().filter(edge =>
            edge.source === nodeId || edge.target === nodeId
        );
        const neighborIds = new Set<string>();
        edges.forEach(edge => {
            if (edge.source === nodeId) neighborIds.add(edge.target);
            if (edge.target === nodeId) neighborIds.add(edge.source);
        });

        const nodes = Array.from(neighborIds).map(id => this.nodes.get(id)).filter(Boolean) as GraphNode[];
        return { nodes, edges };
    }

    // 查找关系
    findEdges(sourceId: string, targetId: string): GraphEdge[] {
        return this.getAllEdges().filter(edge =>
            edge.source === sourceId && edge.target === targetId
        );
    }

    // 更新节点
    updateNode(id: string, updates: Partial<GraphNode>): boolean {
        const node = this.nodes.get(id);
        if (node) {
            Object.assign(node, updates);
            this.lastUpdated = new Date();
            return true;
        }
        return false;
    }

    // 删除节点
    removeNode(id: string): boolean {
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
    removeEdge(sourceId: string, targetId: string, relation?: string): boolean {
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
    clear(): void {
        this.nodes.clear();
        this.edges.clear();
        this.lastUpdated = new Date();
    }

    // 获取图谱统计信息
    getStats(): {
        nodeCount: number;
        edgeCount: number;
        nodeTypes: Record<string, number>;
        relationTypes: Record<string, number>;
        lastUpdated: Date;
    } {
        const nodeTypes: Record<string, number> = {};
        const relationTypes: Record<string, number> = {};

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
    exportToJson(): string {
        return JSON.stringify({
            nodes: this.getAllNodes(),
            edges: this.getAllEdges(),
            stats: this.getStats()
        }, null, 2);
    }

    // 从JSON导入
    importFromJson(json: string): boolean {
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
        } catch (error) {
            console.error('Failed to import graph from JSON:', error);
        }
        return false;
    }

    // 搜索节点（支持名称模糊匹配）
    searchNodes(query: string): GraphNode[] {
        const lowerQuery = query.toLowerCase();
        return this.getAllNodes().filter(node =>
            node.name.toLowerCase().includes(lowerQuery) ||
            node.file.toLowerCase().includes(lowerQuery) ||
            node.id.toLowerCase().includes(lowerQuery)
        );
    }

    // 获取文件相关的所有节点
    getNodesByFile(filePath: string): GraphNode[] {
        return this.getAllNodes().filter(node => node.file === filePath);
    }

    // 删除文件相关的所有节点和边
    removeFile(filePath: string): number {
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
