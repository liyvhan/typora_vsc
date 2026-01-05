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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkdownEditorProvider = void 0;
const vscode = __importStar(require("vscode"));
class MarkdownEditorProvider {
    static register(context) {
        const provider = new MarkdownEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(MarkdownEditorProvider.viewType, provider);
        return providerRegistration;
    }
    constructor(context) {
        this.context = context;
    }
    async resolveCustomTextEditor(document, webviewPanel, _token) {
        console.log(`Resolving editor for: ${document.uri.toString()}`);
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'node_modules')
            ]
        };
        const scriptUri = webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'vditor', 'dist', 'index.min.js'));
        const styleUri = webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'vditor', 'dist', 'index.css'));
        // Vditor CDN should point to the directory containing 'dist'
        const vditorAssetUri = webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'node_modules', 'vditor'));
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview, scriptUri, styleUri, vditorAssetUri);
        function updateWebview() {
            console.log('Sending update message to webview');
            webviewPanel.webview.postMessage({
                type: 'update',
                text: document.getText(),
            });
        }
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
        webviewPanel.webview.onDidReceiveMessage(e => {
            switch (e.type) {
                case 'ready':
                    updateWebview();
                    return;
                case 'change':
                    this.updateTextDocument(document, e.text);
                    return;
                case 'openLink':
                    this.handleOpenLink(document, e.href);
                    return;
            }
        });
    }
    handleOpenLink(document, href) {
        if (href.startsWith('http')) {
            vscode.env.openExternal(vscode.Uri.parse(href));
        }
        else {
            // 处理相对路径跳转
            const folderPath = vscode.Uri.joinPath(document.uri, '..');
            const targetUri = vscode.Uri.joinPath(folderPath, href);
            vscode.commands.executeCommand('vscode.open', targetUri);
        }
    }
    getHtmlForWebview(webview, scriptUri, styleUri, vditorAssetUri) {
        return `
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src * data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'unsafe-inline' ${webview.cspSource}; connect-src *;">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Typora VSC</title>
				<link rel="stylesheet" href="${styleUri}" />
				<style>
					body {
						padding: 0;
						margin: 0;
						background-color: var(--vscode-editor-background);
					}
					#loading {
						color: var(--vscode-editor-foreground);
						padding: 20px;
						font-family: sans-serif;
					}
					#error-log {
						color: #f48771;
						padding: 0 20px;
						font-family: monospace;
						font-size: 12px;
						white-space: pre-wrap;
					}
					#vditor {
						border: none !important;
					}
					/* 隐藏工具栏以更像 Typora */
					.vditor-toolbar {
						display: none !important;
					}
					/* 大纲样式优化 */
					.vditor-outline {
						border-left: 1px solid var(--vscode-widget-shadow) !important;
						background-color: var(--vscode-sideBar-background) !important;
					}
					.vditor-outline__item {
						color: var(--vscode-sideBar-foreground) !important;
						cursor: pointer;
					}
					.vditor-outline__item:hover {
						background-color: var(--vscode-list-hoverBackground) !important;
					}
					.vditor-outline__item--current {
						background-color: var(--vscode-list-activeSelectionBackground) !important;
						color: var(--vscode-list-activeSelectionForeground) !important;
					}
					/* 修复代码块背景颜色 */
					.vditor-reset pre > code {
						background-color: var(--vscode-textCodeBlock-background) !important;
						color: var(--vscode-editor-foreground) !important;
						padding: 12px !important;
						border-radius: 4px;
						border: 1px solid var(--vscode-widget-shadow);
						line-height: 1.5;
					}
					.vditor-ir__node--expand {
						background-color: var(--vscode-textCodeBlock-background) !important;
					}
					/* 隐藏按钮样式 - 美化为侧边收缩箭头 */
					#toggle-outline {
						position: fixed;
						right: 200px; /* 大纲默认宽度是 200px */
						top: 50%;
						transform: translateY(-50%);
						z-index: 100;
						background: var(--vscode-sideBar-background);
						border: 1px solid var(--vscode-widget-shadow);
						border-right: none;
						color: var(--vscode-foreground);
						padding: 12px 2px;
						border-radius: 8px 0 0 8px;
						cursor: pointer;
						opacity: 0.8;
						transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
						display: flex;
						align-items: center;
						justify-content: center;
						box-shadow: -2px 0 5px rgba(0,0,0,0.1);
					}
					#toggle-outline:hover {
						opacity: 1;
						background: var(--vscode-list-hoverBackground);
						padding-left: 4px;
					}
					#toggle-outline svg {
						width: 14px;
						height: 14px;
						fill: currentColor;
						transition: transform 0.3s;
						transform: rotate(0deg);
					}
					.outline-hidden #toggle-outline {
						right: 0;
					}
					.outline-hidden #toggle-outline svg {
						transform: rotate(180deg);
					}
					.outline-hidden .vditor-outline {
						display: none !important;
					}
					.vditor-reset {
						background-color: var(--vscode-editor-background) !important;
						color: var(--vscode-editor-foreground) !important;
						font-family: var(--vscode-editor-font-family) !important;
						font-size: var(--vscode-editor-font-size) !important;
					}
					/* 补全菜单样式适配 */
					.vditor-hint {
						background-color: var(--vscode-menu-background) !important;
						border: 1px solid var(--vscode-menu-border) !important;
						color: var(--vscode-menu-foreground) !important;
					}
					.vditor-hint--current {
						background-color: var(--vscode-menu-selectionBackground) !important;
						color: var(--vscode-menu-selectionForeground) !important;
					}
				</style>
				<script>
					// 在加载 Vditor 脚本前设置错误监听
					window.onerror = function(message, source, lineno, colno, error) {
						const log = document.getElementById('error-log');
						if (log) {
							log.innerText += "\\n[Runtime Error] " + message + "\\nSource: " + source + ":" + lineno;
						}
						return false;
					};
				</script>
				<script src="${scriptUri}"></script>
			</head>
			<body>
				<div id="loading">正在加载编辑器... (本地模式)</div>
				<div id="error-log"></div>
				<button id="toggle-outline" title="切换大纲">
					<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
						<path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</button>
				<div id="vditor"></div>
				<script>
					const vscode = acquireVsCodeApi();
					let vditor;
					let isUpdating = false;

					console.log('Webview: Checking Vditor existence:', typeof Vditor);
					
					if (typeof Vditor === 'undefined') {
						document.getElementById('error-log').innerText += "\\n[Critical Error] Vditor script failed to load. Check script URI and CSP.";
					} else {
						try {
							vditor = new Vditor('vditor', {
								height: '100vh',
								mode: 'ir',
								cdn: '${vditorAssetUri}', // 指向本地 node_modules/vditor
								debugger: true,
								typewriterMode: true,
								placeholder: '开始写作...',
								theme: document.body.classList.contains('vscode-dark') ? 'dark' : 'classic',
								preview: {
									theme: {
										current: document.body.classList.contains('vscode-dark') ? 'dark' : 'light',
									},
									hljs: {
										style: document.body.classList.contains('vscode-dark') ? 'vs2015' : 'vs',
									}
								},
								cache: {
									enable: false,
								},
								outline: {
									enable: true,
									position: 'right',
								},
								hint: {
									delay: 100,
									extend: [
										{
											key: '/',
											hint: (value) => {
												const commands = [
													{ value: '## ', html: '✨ 二级标题' },
													{ value: '### ', html: '✨ 三级标题' },
													{ value: '| 列1 | 列2 |\\n| --- | --- |', html: '📊 表格' },
												];
												return commands.filter(item => item.value.toLowerCase().includes(value.toLowerCase()));
											}
										}
									]
								},
								link: {
									isOpen: false,
								},
								after: () => {
									console.log('Webview: Vditor ready');
									document.getElementById('loading').style.display = 'none';
									vscode.postMessage({ type: 'ready' });
								},
								input: (value) => {
									if (isUpdating) return;
									vscode.postMessage({
										type: 'change',
										text: value
									});
								},
							});
						} catch (e) {
							document.getElementById('error-log').innerText += "\\n[Init Error] " + e.stack;
						}
					}

					// 处理点击跳转
					document.addEventListener('click', (e) => {
						const target = e.target;
						const anchor = target.closest('a') || 
									   target.closest('span[data-type="a"]') || 
									   target.closest('span[data-type="link"]');
						
						if (anchor && (e.ctrlKey || e.metaKey)) {
							let href = anchor.getAttribute('href') || 
									   anchor.getAttribute('data-href') ||
									   anchor.innerText;
							
							if (href) {
								// 彻底清理 Markdown 链接残留
								// 如果是 [text](url) 格式
								if (href.includes('](')) {
									const parts = href.split('](');
									if (parts.length > 1) {
										href = parts[1].split(')')[0];
									}
								}
								// 移除可能的包裹括号
								href = href.trim().replace(/^\\(/, '').replace(/\\)$/, '');
								
								vscode.postMessage({
									type: 'openLink',
									href: href
								});
								e.preventDefault();
								e.stopPropagation();
							}
						}
					}, true);

					window.addEventListener('message', event => {
						const message = event.data;
						console.log('Webview received message:', message.type);
						switch (message.type) {
							case 'update':
								const text = message.text;
								if (vditor && text !== vditor.getValue()) {
									isUpdating = true;
									vditor.setValue(text);
									isUpdating = false;
								}
								break;
						}
					});

					const observer = new MutationObserver(() => {
						const isDark = document.body.classList.contains('vscode-dark');
						if (vditor) {
							vditor.setTheme(isDark ? 'dark' : 'classic', isDark ? 'dark' : 'light', isDark ? 'vs2015' : 'vs');
						}
					});
					observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

					// 目录切换逻辑
					document.getElementById('toggle-outline').addEventListener('click', () => {
						document.body.classList.toggle('outline-hidden');
					});
				</script>
			</body>
			</html>
		`;
    }
    updateTextDocument(document, text) {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), text);
        return vscode.workspace.applyEdit(edit);
    }
}
exports.MarkdownEditorProvider = MarkdownEditorProvider;
MarkdownEditorProvider.viewType = 'typoraVsc.editor';
//# sourceMappingURL=markdownEditor.js.map