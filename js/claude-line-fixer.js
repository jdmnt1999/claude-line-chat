/**
 * claude-line-fixer.js
 * Claude会話ログをLINE風のデザインに変換するためのモジュール
 */

const ClaudeLineFixerModule = (() => {
    // モジュール変数
    let initialized = false;
    let diagnostics = {
        status: 'initial',
        errors: [],
        warnings: [],
        info: [],
        fixes: []
    };
    
    // 初期化
    const init = () => {
        try {
            console.log('LINE Claude Viewer 修正モジュールを実行中...');
            
            // 設定を読み込む
            loadSettings();
            
            // UIの修正を行う
            applyFixes();
            
            // 初期化完了
            initialized = true;
            diagnostics.status = 'completed';
            
            console.log('修正完了！診断結果:', diagnostics);
            return true;
        } catch (error) {
            console.error('修正モジュールの初期化中にエラーが発生しました:', error);
            diagnostics.status = 'failed';
            diagnostics.errors.push(error.message);
            return false;
        }
    };
    
    // 設定を読み込む
    const loadSettings = () => {
        try {
            // LocalStorageから設定を読み込む
            const storedSettings = localStorage.getItem('fixer_settings');
            let settings = {};
            
            if (storedSettings) {
                settings = JSON.parse(storedSettings);
                diagnostics.info.push('設定をLocalStorageから読み込みました');
            } else {
                // デフォルト設定
                settings = {
                    enableStyleFixes: true,
                    enableLogParser: true,
                    enableAutoImport: false,
                    defaultLogDirectory: '',
                    ignoredFiles: []
                };
                diagnostics.info.push('デフォルト設定を使用します');
            }
            
            // グローバル設定として保存
            window.FixerSettings = settings;
            
            return settings;
        } catch (error) {
            console.error('設定の読み込み中にエラーが発生しました:', error);
            diagnostics.warnings.push('設定の読み込みに失敗しました。デフォルト設定を使用します。');
            
            // デフォルト設定
            const defaultSettings = {
                enableStyleFixes: true,
                enableLogParser: true,
                enableAutoImport: false,
                defaultLogDirectory: '',
                ignoredFiles: []
            };
            
            // グローバル設定として保存
            window.FixerSettings = defaultSettings;
            
            return defaultSettings;
        }
    };
    
    // UIの修正を適用
    const applyFixes = () => {
        const settings = window.FixerSettings;
        
        // スタイル修正が有効の場合
        if (settings.enableStyleFixes) {
            applyStyleFixes();
        }
        
        // その他の修正
        fixEventHandlers();
        enhanceLogParser();
        setupAutoImport();
        fixDatabaseCompatibility();
        
        diagnostics.info.push('すべての修正が適用されました');
    };
    
    // スタイルの修正を適用
    const applyStyleFixes = () => {
        try {
            // LINE風のスタイルを適用
            const style = document.createElement('style');
            style.textContent = `
                /* LINE風のUIを強化 */
                .message-content {
                    border-radius: 12px !important;
                    word-break: break-word !important;
                }
                
                .user-message .message-content {
                    background-color: #00B900 !important;
                    color: white !important;
                }
                
                .claude-message .message-content {
                    background-color: white !important;
                    color: #333 !important;
                }
                
                .message-avatar.claude-avatar {
                    background-color: #00B900 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    color: white !important;
                    font-weight: bold !important;
                    font-size: 1.2rem !important;
                }
                
                /* LINE風のアイコンボタン */
                .line-btn {
                    border-radius: 8px !important;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
                    transition: all 0.2s ease !important;
                }
                
                .line-btn:hover {
                    transform: translateY(-1px) !important;
                    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2) !important;
                }
                
                /* マークダウンコードブロックの表示改善 */
                pre {
                    background-color: #f8f8f8 !important;
                    border-radius: 5px !important;
                    padding: 12px !important;
                    overflow-x: auto !important;
                    margin: 10px 0 !important;
                    font-family: 'Source Code Pro', monospace !important;
                    box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.1) !important;
                }
                
                code {
                    font-family: 'Source Code Pro', monospace !important;
                    font-size: 0.9em !important;
                }
                
                /* トースト通知を改善 */
                .toast {
                    border-radius: 10px !important;
                    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2) !important;
                }
                
                /* ダークテーマの改善 */
                body.dark-theme pre {
                    background-color: #2a2a2a !important;
                    border: 1px solid #444 !important;
                }
                
                body.dark-theme code {
                    color: #e0e0e0 !important;
                }
                
                /* スクロールバーのカスタマイズ */
                ::-webkit-scrollbar {
                    width: 8px !important;
                    height: 8px !important;
                }
                
                ::-webkit-scrollbar-track {
                    background: #f1f1f1 !important;
                    border-radius: 4px !important;
                }
                
                ::-webkit-scrollbar-thumb {
                    background: #bbb !important;
                    border-radius: 4px !important;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: #999 !important;
                }
                
                body.dark-theme ::-webkit-scrollbar-track {
                    background: #333 !important;
                }
                
                body.dark-theme ::-webkit-scrollbar-thumb {
                    background: #666 !important;
                }
                
                body.dark-theme ::-webkit-scrollbar-thumb:hover {
                    background: #888 !important;
                }
            `;
            
            document.head.appendChild(style);
            diagnostics.info.push('LINE風スタイルの修正を適用しました');
            diagnostics.fixes.push('LINE風UIスタイルの強化');
        } catch (error) {
            console.error('スタイルの修正中にエラーが発生しました:', error);
            diagnostics.errors.push(`スタイルの修正に失敗しました: ${error.message}`);
        }
    };
    
    // イベントハンドラの修正
    const fixEventHandlers = () => {
        try {
            // メッセージ入力エリアの自動リサイズ
            const messageInput = document.getElementById('message-input');
            if (messageInput) {
                messageInput.addEventListener('input', () => {
                    messageInput.style.height = 'auto';
                    messageInput.style.height = (messageInput.scrollHeight) + 'px';
                });
                
                diagnostics.info.push('メッセージ入力エリアの自動リサイズを追加しました');
            }
            
            // ドラッグ＆ドロップでのファイル読み込み
            const appContainer = document.querySelector('.app-container');
            if (appContainer) {
                // ドラッグイベントリスナーを追加
                appContainer.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    appContainer.classList.add('drag-over');
                });
                
                appContainer.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    appContainer.classList.remove('drag-over');
                });
                
                appContainer.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    appContainer.classList.remove('drag-over');
                    
                    // ファイルを処理
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        const logFileInput = document.getElementById('log-file-input');
                        if (logFileInput) {
                            // FileListオブジェクトをinput要素に設定することはできないため、
                            // クリックイベントをトリガーして標準のファイル選択ダイアログを表示
                            logFileInput.click();
                        }
                    }
                });
                
                diagnostics.info.push('ドラッグ＆ドロップ機能を追加しました');
            }
            
            // キーボードショートカット
            document.addEventListener('keydown', (e) => {
                // Ctrl+S: 現在の会話をエクスポート
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    const exportBtn = document.getElementById('export-btn');
                    if (exportBtn) {
                        exportBtn.click();
                    }
                }
                
                // Ctrl+N: 会話クリア
                if (e.ctrlKey && e.key === 'n') {
                    e.preventDefault();
                    const clearBtn = document.getElementById('clear-btn');
                    if (clearBtn) {
                        clearBtn.click();
                    }
                }
                
                // Ctrl+O: ログファイル読み込み
                if (e.ctrlKey && e.key === 'o') {
                    e.preventDefault();
                    const loadLogBtn = document.getElementById('load-log-btn');
                    if (loadLogBtn) {
                        loadLogBtn.click();
                    }
                }
                
                // Esc: モーダルを閉じる
                if (e.key === 'Escape') {
                    const openModals = document.querySelectorAll('.modal.show');
                    openModals.forEach(modal => {
                        modal.classList.remove('show');
                    });
                }
            });
            
            diagnostics.info.push('キーボードショートカットを追加しました');
            diagnostics.fixes.push('イベントハンドラの修正と機能強化');
        } catch (error) {
            console.error('イベントハンドラの修正中にエラーが発生しました:', error);
            diagnostics.errors.push(`イベントハンドラの修正に失敗しました: ${error.message}`);
        }
    };
    
    // ログパーサーの強化
    const enhanceLogParser = () => {
        try {
            if (!window.LogParser) {
                diagnostics.warnings.push('LogParserモジュールが見つかりません');
                return;
            }
            
            // LINE形式ログの解析機能を強化
            const originalParseLineLog = window.LogParser.parseLineLog;
            
            window.LogParser.parseLineLog = (content) => {
                try {
                    // Windowsのパス表記のエスケープを修正
                    content = content.replace(/\\\\/g, '\\');
                    
                    // オリジナルの関数を呼び出し
                    return originalParseLineLog(content);
                } catch (error) {
                    console.error('LINE形式ログの解析中にエラーが発生しました:', error);
                    
                    // 代替のパーサーを試みる
                    return fallbackLineLogParser(content);
                }
            };
            
            diagnostics.info.push('ログパーサーを強化しました');
            diagnostics.fixes.push('ログパーサーの安定性向上');
        } catch (error) {
            console.error('ログパーサーの強化中にエラーが発生しました:', error);
            diagnostics.warnings.push(`ログパーサーの強化に失敗しました: ${error.message}`);
        }
    };
    
    // LINEログのフォールバックパーサー
    const fallbackLineLogParser = (content) => {
        try {
            console.log('フォールバックのLINEログパーサーを使用します');
            
            // 行に分割
            const lines = content.split('\n');
            const messages = [];
            let currentMessage = null;
            let currentDate = new Date().toISOString();
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                
                // 日付行
                if (trimmedLine.match(/^\d{4}\/\d{1,2}\/\d{1,2}/)) {
                    const dateStr = trimmedLine.split('(')[0].trim();
                    currentDate = new Date(dateStr).toISOString();
                    continue;
                }
                
                // メッセージ行
                if (trimmedLine.match(/^\d{1,2}:\d{1,2}/)) {
                    // 時間とユーザー名を抽出
                    const timeMatch = trimmedLine.match(/^(\d{1,2}:\d{1,2})/);
                    if (!timeMatch) continue;
                    
                    const time = timeMatch[1];
                    const remainingText = trimmedLine.substring(time.length).trim();
                    
                    // 送信者と内容を分離
                    const parts = remainingText.split(/\s+/);
                    const sender = parts[0];
                    const content = parts.slice(1).join(' ');
                    
                    // メッセージを作成
                    if (currentMessage) {
                        messages.push(currentMessage);
                    }
                    
                    currentMessage = {
                        id: generateUniqueId(),
                        content: content,
                        role: (sender === 'Claude' || sender === 'Claude:') ? 'claude' : 'user',
                        type: 'text',
                        timestamp: new Date(currentDate).toISOString()
                    };
                } else if (trimmedLine && currentMessage) {
                    // 続きの行はコンテンツに追加
                    currentMessage.content += '\n' + trimmedLine;
                }
            }
            
            // 最後のメッセージを追加
            if (currentMessage) {
                messages.push(currentMessage);
            }
            
            // 会話情報を作成
            const conversation = {
                title: `LINE会話 ${new Date(currentDate).toLocaleDateString()}`,
                date: currentDate
            };
            
            return {
                conversation,
                messages
            };
        } catch (error) {
            console.error('フォールバックのLINEログ解析中にエラーが発生しました:', error);
            throw error;
        }
    };
    
    // 自動インポート設定
    const setupAutoImport = () => {
        try {
            const settings = window.FixerSettings;
            
            // 自動インポートが有効な場合
            if (settings.enableAutoImport && settings.defaultLogDirectory) {
                // ディレクトリパスを設定
                const logDirectory = document.getElementById('log-directory');
                if (logDirectory) {
                    logDirectory.value = settings.defaultLogDirectory;
                }
                
                diagnostics.info.push('自動インポート設定を適用しました');
                
                // ログの自動読み込みを試みる
                setTimeout(async () => {
                    try {
                        const result = await FileHelper.loadClaudeLogFile(settings.defaultLogDirectory);
                        if (result.success) {
                            // ログファイルを処理
                            const logData = {
                                path: result.path,
                                filename: result.filename,
                                timestamp: new Date().toISOString()
                            };
                            
                            // UIに通知
                            if (window.UI) {
                                window.UI.showToast('情報', 'ログを自動的に読み込んでいます...', 'info');
                            }
                            
                            // ログをEnhancedDBStorageにインポート
                            const importResult = await EnhancedDBStorage.importClaudeLogAsConversation(logData, result.content);
                            
                            // 会話リストを更新
                            if (window.UI) {
                                await window.UI.loadConversationList();
                                window.UI.loadConversation(importResult.conversationId);
                                window.UI.showToast('成功', '会話ログを自動的に読み込みました', 'success');
                            }
                        }
                    } catch (error) {
                        console.error('ログの自動読み込み中にエラーが発生しました:', error);
                        if (window.UI) {
                            window.UI.showToast('エラー', 'ログの自動読み込みに失敗しました', 'error');
                        }
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('自動インポート設定中にエラーが発生しました:', error);
            diagnostics.warnings.push(`自動インポート設定に失敗しました: ${error.message}`);
        }
    };
    
    // データベースの互換性修正
    const fixDatabaseCompatibility = () => {
        try {
            // DB初期化時のエラーを捕捉して代替処理を提供
            const originalInitDB = window.DBStorage.initDB;
            
            if (originalInitDB) {
                window.DBStorage.initDB = async () => {
                    try {
                        // オリジナルの初期化を試みる
                        return await originalInitDB();
                    } catch (error) {
                        console.warn('標準データベースの初期化に失敗したため、代替のストレージを使用します:', error);
                        
                        // エラーが発生した場合は、強化版DBを試みる
                        if (window.EnhancedDBStorage) {
                            try {
                                await window.EnhancedDBStorage.initDB();
                                
                                // 互換性レイヤーを提供
                                return {
                                    name: 'compatibility-layer',
                                    version: 1
                                };
                            } catch (innerError) {
                                console.error('代替データベースの初期化にも失敗しました:', innerError);
                                throw innerError;
                            }
                        } else {
                            throw error;
                        }
                    }
                };
                
                diagnostics.info.push('データベース互換性修正を適用しました');
                diagnostics.fixes.push('データベース互換性の強化');
            }
        } catch (error) {
            console.error('データベース互換性修正中にエラーが発生しました:', error);
            diagnostics.warnings.push(`データベース互換性修正に失敗しました: ${error.message}`);
        }
    };
    
    // 診断情報を取得
    const getDiagnostics = () => {
        return { ...diagnostics };
    };
    
    // ユニークIDを生成
    const generateUniqueId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    };
    
    // 公開API
    return {
        init,
        getDiagnostics,
        loadSettings,
        applyFixes
    };
})();

// 初期化
window.ClaudeLineFixer = ClaudeLineFixerModule;
document.addEventListener('DOMContentLoaded', () => {
    ClaudeLineFixerModule.init();
});
