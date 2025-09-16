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
exports.GraphViewer = void 0;
const vscode = __importStar(require("vscode"));
class GraphViewer {
    panel;
    graph;
    constructor(graph) {
        this.graph = graph;
    }
    show() {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.One);
            return;
        }
        this.panel = vscode.window.createWebviewPanel('graphViewer', '知识图谱可视化', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: []
        });
        this.panel.webview.html = this.getWebviewContent();
        // 处理来自webview的消息
        this.panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'openFile':
                    await this.openFile(message.filePath, message.line, message.column);
                    break;
                case 'searchNodes':
                    this.searchNodes(message.query);
                    break;
                case 'filterNodes':
                    this.filterNodes(message.nodeType);
                    break;
                case 'getGraphData':
                    this.sendGraphData();
                    break;
            }
        }, undefined, []);
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
        // 初始发送图谱数据
        this.sendGraphData();
    }
    async openFile(filePath, line, column) {
        try {
            const uri = vscode.Uri.file(filePath);
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);
            const position = new vscode.Position(line, column);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
        }
        catch (error) {
            vscode.window.showErrorMessage(`无法打开文件: ${filePath}`);
        }
    }
    searchNodes(query) {
        if (!this.panel)
            return;
        const results = this.graph.searchNodes(query);
        this.panel.webview.postMessage({
            command: 'searchResults',
            results: results
        });
    }
    filterNodes(nodeType) {
        if (!this.panel)
            return;
        const filtered = nodeType === 'all'
            ? this.graph.getAllNodes()
            : this.graph.findNodesByType(nodeType);
        this.panel.webview.postMessage({
            command: 'filterResults',
            results: filtered
        });
    }
    sendGraphData() {
        if (!this.panel)
            return;
        const graphData = {
            nodes: this.graph.getAllNodes(),
            edges: this.graph.getAllEdges(),
            stats: this.graph.getStats()
        };
        this.panel.webview.postMessage({
            command: 'graphData',
            data: graphData
        });
    }
    getWebviewContent() {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>知识图谱可视化</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .controls {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        input, select, button {
            padding: 8px 12px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 4px;
        }
        
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            cursor: pointer;
        }
        
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .stats {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        #graph-container {
            width: 100%;
            height: 600px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            position: relative;
        }
        
        .node {
            cursor: pointer;
        }
        
        .node circle {
            stroke-width: 2px;
        }
        
        .node text {
            font-size: 12px;
            fill: var(--vscode-editor-foreground);
            text-anchor: middle;
            pointer-events: none;
        }
        
        .link {
            stroke: var(--vscode-editor-foreground);
            stroke-opacity: 0.6;
            stroke-width: 1px;
        }
        
        .node-tooltip {
            position: absolute;
            padding: 8px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            z-index: 1000;
        }
        
        .legend {
            position: absolute;
            top: 10px;
            right: 10px;
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 10px;
            font-size: 12px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            margin-bottom: 5px;
        }
        
        .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>项目知识图谱</h2>
        <div class="controls">
            <input type="text" id="searchInput" placeholder="搜索节点..." />
            <select id="typeFilter">
                <option value="all">所有类型</option>
                <option value="Function">函数</option>
                <option value="Class">类</option>
                <option value="Variable">变量</option>
                <option value="Module">模块</option>
                <option value="Json">JSON</option>
                <option value="Markdown">Markdown</option>
                <option value="Yaml">YAML</option>
                <option value="Style">样式</option>
                <option value="Other">其他</option>
            </select>
            <select id="layoutType">
                <option value="grid">网格布局</option>
                <option value="circle">圆形布局</option>
                <option value="force">力导向布局</option>
            </select>
            <button id="refreshBtn">刷新</button>
            <button id="resetLayoutBtn">重新布局</button>
        </div>
    </div>
    
    <div class="stats" id="stats"></div>
    
    <div id="graph-container">
        <div class="legend" id="legend"></div>
        <div class="node-tooltip" id="tooltip" style="display: none;"></div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let graphData = { nodes: [], edges: [], stats: {} };
        
        // 颜色映射
        const nodeColors = {
            'Function': '#4CAF50',
            'Class': '#2196F3',
            'Variable': '#FF9800',
            'Module': '#9C27B0',
            'Json': '#795548',
            'Markdown': '#607D8B',
            'Yaml': '#009688',
            'Style': '#E91E63',
            'Other': '#9E9E9E'
        };
        
        // 初始化D3力导向图
        const width = document.getElementById('graph-container').clientWidth;
        const height = document.getElementById('graph-container').clientHeight;
        
        const svg = d3.select('#graph-container')
            .append('svg')
            .attr('width', width)
            .attr('height', height);
            
        const g = svg.append('g');
        
        // 添加缩放功能
        const zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });
            
        svg.call(zoom);
        
        // 创建力导向图模拟器（初始为空，在updateGraph中配置）
        let simulation = d3.forceSimulation();
        
        // 事件监听
        document.getElementById('searchInput').addEventListener('input', (e) => {
            vscode.postMessage({
                command: 'searchNodes',
                query: e.target.value
            });
        });
        
        document.getElementById('typeFilter').addEventListener('change', (e) => {
            vscode.postMessage({
                command: 'filterNodes',
                nodeType: e.target.value
            });
        });
        
        document.getElementById('refreshBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'getGraphData' });
        });
        
        document.getElementById('resetLayoutBtn').addEventListener('click', () => {
            resetLayout();
        });
        
        document.getElementById('layoutType').addEventListener('change', (e) => {
            applyLayout(e.target.value);
        });
        
        // 处理来自扩展的消息
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'graphData':
                    graphData = message.data;
                    updateGraph();
                    updateStats();
                    updateLegend();
                    break;
                case 'searchResults':
                    highlightNodes(message.results);
                    break;
                case 'filterResults':
                    filterGraph(message.results);
                    break;
            }
        });
        
        function updateGraph() {
            // 清除现有内容
            g.selectAll('*').remove();
            
            // 如果没有数据，显示提示
            if (!graphData.nodes || graphData.nodes.length === 0) {
                g.append('text')
                    .attr('x', width / 2)
                    .attr('y', height / 2)
                    .attr('text-anchor', 'middle')
                    .text('暂无图谱数据')
                    .style('font-size', '16px')
                    .style('fill', 'var(--vscode-descriptionForeground)');
                return;
            }
            
            // 停止之前的仿真
            simulation.stop();
            
            // 根据节点数量设置适合的布局参数
            const nodeCount = graphData.nodes.length;
            console.log('节点数量:', nodeCount);
            
            // 使用网格布局初始化节点位置，避免重叠
            const cols = Math.ceil(Math.sqrt(nodeCount));
            const rows = Math.ceil(nodeCount / cols);
            const cellWidth = (width - 100) / cols;
            const cellHeight = (height - 100) / rows;
            
            graphData.nodes.forEach((node, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                
                // 初始网格位置 + 随机偏移
                node.x = 50 + col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * cellWidth * 0.3;
                node.y = 50 + row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * cellHeight * 0.3;
                
                // 清除之前的固定位置
                node.fx = null;
                node.fy = null;
            });
            
            // 重新配置力导向图参数
            const linkDistance = Math.max(80, Math.min(200, 400 / Math.sqrt(nodeCount)));
            const chargeStrength = Math.max(-2000, -300 * Math.sqrt(nodeCount));
            const collisionRadius = Math.max(15, 30 - nodeCount * 0.2);
            
            console.log('力导向图参数:', {
                linkDistance,
                chargeStrength,
                collisionRadius
            });
            
            // 重新创建力导向图
            simulation = d3.forceSimulation(graphData.nodes)
                .force('link', d3.forceLink(graphData.edges)
                    .id(d => d.id)
                    .distance(linkDistance)
                    .strength(0.2))
                .force('charge', d3.forceManyBody()
                    .strength(chargeStrength)
                    .distanceMax(300))
                .force('collision', d3.forceCollide()
                    .radius(collisionRadius)
                    .strength(1.0)
                    .iterations(3))
                .force('center', d3.forceCenter(width / 2, height / 2)
                    .strength(0.1))
                .force('boundary', () => {
                    // 边界约束力
                    const padding = 30;
                    graphData.nodes.forEach(node => {
                        node.x = Math.max(padding, Math.min(width - padding, node.x));
                        node.y = Math.max(padding, Math.min(height - padding, node.y));
                    });
                })
                .alphaDecay(0.02)
                .velocityDecay(0.4)
                .alpha(1);
            
            // 创建链接
            const link = g.append('g')
                .selectAll('line')
                .data(graphData.edges)
                .enter().append('line')
                .attr('class', 'link')
                .attr('stroke-width', d => {
                    // 根据连接类型调整线条粗细
                    return d.type === 'dependency' ? 2 : 1;
                })
                .attr('opacity', 0.6);
            
            // 创建节点组
            const node = g.append('g')
                .selectAll('g')
                .data(graphData.nodes)
                .enter().append('g')
                .attr('class', 'node')
                .call(d3.drag()
                    .on('start', dragstarted)
                    .on('drag', dragged)
                    .on('end', dragended));
            
            // 添加圆圈 - 根据节点类型调整大小
            node.append('circle')
                .attr('r', d => {
                    const sizeMap = {
                        'Class': 12,
                        'Function': 10,
                        'Module': 14,
                        'Variable': 8,
                        'Json': 9,
                        'Markdown': 9,
                        'Yaml': 9,
                        'Style': 8,
                        'Other': 7
                    };
                    return sizeMap[d.type] || 8;
                })
                .attr('fill', d => nodeColors[d.type] || nodeColors.Other)
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);
            
            // 添加文本标签 - 优化显示位置
            node.append('text')
                .text(d => {
                    const maxLength = d.type === 'Module' ? 20 : 15;
                    return d.name.length > maxLength ? d.name.substring(0, maxLength) + '...' : d.name;
                })
                .attr('dy', d => {
                    const sizeMap = {
                        'Class': 16,
                        'Function': 14,
                        'Module': 18,
                        'Variable': 12,
                        'Other': 12
                    };
                    return (sizeMap[d.type] || 12) + 5;
                })
                .attr('text-anchor', 'middle')
                .style('font-size', '11px')
                .style('font-weight', d => d.type === 'Class' || d.type === 'Module' ? 'bold' : 'normal')
                .style('fill', 'var(--vscode-editor-foreground)');
            
            // 添加工具提示
            node.on('mouseover', function(event, d) {
                const tooltip = d3.select('#tooltip');
                tooltip.style('display', 'block')
                    .html(\`
                        <strong>\${d.name}</strong><br/>
                        类型: \${d.type}<br/>
                        文件: \${d.file}<br/>
                        \${d.position ? \`位置: \${d.position.line + 1}:\${d.position.column + 1}<br/>\` : ''}
                    \`)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px');
            })
            .on('mouseout', function() {
                d3.select('#tooltip').style('display', 'none');
            })
            .on('click', function(event, d) {
                vscode.postMessage({
                    command: 'openFile',
                    filePath: d.file,
                    line: d.position ? d.position.line : 0,
                    column: d.position ? d.position.column : 0
                });
            });
            
            // 启动仿真
            simulation.on('tick', ticked).restart();
            
            function ticked() {
                // 更新链接位置
                link
                    .attr('x1', d => d.source.x)
                    .attr('y1', d => d.source.y)
                    .attr('x2', d => d.target.x)
                    .attr('y2', d => d.target.y);
                
                // 更新节点位置，限制在视窗范围内
                node.attr('transform', d => {
                    const margin = 30;
                    d.x = Math.max(margin, Math.min(width - margin, d.x));
                    d.y = Math.max(margin, Math.min(height - margin, d.y));
                    return \`translate(\${d.x},\${d.y})\`;
                });
            }
        }
        
        function dragstarted(event, d) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
        
        function updateStats() {
            const stats = graphData.stats;
            document.getElementById('stats').innerHTML = \`
                节点数: \${stats.nodeCount} | 边数: \${stats.edgeCount} | 
                最后更新: \${new Date(stats.lastUpdated).toLocaleString()}
            \`;
        }
        
        function updateLegend() {
            const legend = d3.select('#legend');
            legend.selectAll('*').remove();
            
            Object.entries(nodeColors).forEach(([type, color]) => {
                const item = legend.append('div').attr('class', 'legend-item');
                item.append('div').attr('class', 'legend-color').style('background-color', color);
                item.append('span').text(type);
            });
        }
        
        function highlightNodes(nodes) {
            const nodeData = nodes.map(n => n.id);
            g.selectAll('.node')
                .style('opacity', d => nodeData.includes(d.id) ? 1 : 0.3);
        }
        
        function filterGraph(nodes) {
            const nodeData = nodes.map(n => n.id);
            g.selectAll('.node')
                .style('opacity', d => nodeData.includes(d.id) ? 1 : 0.1);
            
            g.selectAll('.link')
                .style('opacity', d => 
                    nodeData.includes(d.source.id) && nodeData.includes(d.target.id) ? 1 : 0.1
                );
        }
        
        function resetLayout() {
            const layoutType = document.getElementById('layoutType').value;
            applyLayout(layoutType);
        }
        
        function applyLayout(layoutType) {
            if (!graphData.nodes || graphData.nodes.length === 0) return;
            
            console.log('应用布局类型:', layoutType);
            const nodeCount = graphData.nodes.length;
            
            switch (layoutType) {
                case 'grid':
                    applyGridLayout();
                    break;
                case 'circle':
                    applyCircleLayout();
                    break;
                case 'force':
                default:
                    applyForceLayout();
                    break;
            }
            
            // 重启仿真
            simulation.alpha(1).alphaTarget(0).restart();
        }
        
        function applyGridLayout() {
            const nodeCount = graphData.nodes.length;
            const cols = Math.ceil(Math.sqrt(nodeCount));
            const rows = Math.ceil(nodeCount / cols);
            const cellWidth = (width - 100) / cols;
            const cellHeight = (height - 100) / rows;
            
            graphData.nodes.forEach((node, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                
                node.x = 50 + col * cellWidth + cellWidth / 2;
                node.y = 50 + row * cellHeight + cellHeight / 2;
                
                // 网格布局下固定位置，避免移动
                node.fx = node.x;
                node.fy = node.y;
            });
        }
        
        function applyCircleLayout() {
            const nodeCount = graphData.nodes.length;
            const radius = Math.min(width, height) * 0.35;
            
            graphData.nodes.forEach((node, i) => {
                if (nodeCount === 1) {
                    node.x = width / 2;
                    node.y = height / 2;
                } else {
                    const angle = (i / nodeCount) * 2 * Math.PI;
                    node.x = width / 2 + radius * Math.cos(angle);
                    node.y = height / 2 + radius * Math.sin(angle);
                }
                
                // 圆形布局下允许少量调整
                node.fx = null;
                node.fy = null;
            });
        }
        
        function applyForceLayout() {
            // 使用网格初始化，然后由力导向进行调整
            const nodeCount = graphData.nodes.length;
            const cols = Math.ceil(Math.sqrt(nodeCount));
            const rows = Math.ceil(nodeCount / cols);
            const cellWidth = (width - 100) / cols;
            const cellHeight = (height - 100) / rows;
            
            graphData.nodes.forEach((node, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                
                // 网格位置 + 较大的随机偏移
                node.x = 50 + col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * cellWidth * 0.8;
                node.y = 50 + row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * cellHeight * 0.8;
                
                // 清除固定位置，允许力导向调整
                node.fx = null;
                node.fy = null;
                
                // 重置速度
                node.vx = 0;
                node.vy = 0;
            });
        }
        
        // 请求初始数据
        vscode.postMessage({ command: 'getGraphData' });
    </script>
</body>
</html>`;
    }
    updateGraph(graph) {
        this.graph = graph;
        if (this.panel) {
            this.sendGraphData();
        }
    }
    dispose() {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
    }
}
exports.GraphViewer = GraphViewer;
//# sourceMappingURL=graphViewer.js.map