/**
 * ui.js
 * ユーザーインターフェースを管理するモジュール
 */

const UIModule = (() => {
    // DOM要素の参照
    let elements = {};
    
    // 現在の会話ID
    let currentConversationId = null;
    
    // 初期化
    const init = () => {
        try {
            // DOM要素を取得
            cacheElements();
            
            // イベントリスナーを設定
            setupEventListeners();
            
            // 会話リストを読み込む
            loadConversationList();
            
            // テーマを適用
            applyTheme(Config.getConfig('ui.theme') || 'light');
            
            console.log('UIモジュールが初期化されました');
            return true;
        } catch (error) {
            console.error('UIモジュールの初期化中にエラーが発生しました:', error);
            return false;
        }
    };
    
    // DOM要素を取得してキャッシュ
    const cacheElements = () => {
        elements = {
            conversationList: document.getElementById('conversation-list'),
            messageContainer: document.getElementById('message-container'),
            messageInput: document.getElementById('message-input'),
            sendMessageBtn: document.getElementById('send-message-btn'),
            loadLogBtn: document.getElementById('load-log-btn'),
            logFileInput: document.getElementById('log-file-input'),
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            saveSettingsBtn: document.getElementById('save-settings-btn'),
            apiKeyInput: document.getElementById('api-key'),
            modelSelection: document.getElementById('model-selection'),
            themeButtons: document.querySelectorAll('.theme-btn'),
            currentConversationTitle: document.getElementById('current-conversation-title'),
            editTitleBtn: document.getElementById('edit-title-btn'),
            exportBtn: document.getElementById('export-btn'),
            clearBtn: document.getElementById('clear-btn'),
            conversationSearch: document.getElementById('conversation-search'),
            logDirectory: document.getElementById('log-directory'),
            browseDirectoryBtn: document.getElementById('browse-directory-btn'),
            fileBrowserModal: document.getElementById('file-browser-modal'),
            currentDirectoryPath: document.getElementById('current-directory-path'),
            fileList: document.getElementById('file-list'),
            selectFileBtn: document.getElementById('select-file-btn'),
            cancelFileSelectionBtn: document.getElementById('cancel-file-selection-btn'),
            closeModalBtns: document.querySelectorAll('.close-modal')
        };
    };
    
    // イベントリスナーを設定
    const setupEventListeners = () => {
        // メッセージ送信
        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        elements.sendMessageBtn.addEventListener('click', sendMessage);
        
        // ログファイル読み込み
        elements.loadLogBtn.addEventListener('click', () => {
            elements.logFileInput.click();
        });
        
        elements.logFileInput.addEventListener('change', handleLogFileSelect);
        
        // 設定モーダル
        elements.settingsBtn.addEventListener('click', openSettingsModal);
        elements.saveSettingsBtn.addEventListener('click', saveSettings);
        
        // テーマ切り替え
        elements.themeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                applyTheme(btn.dataset.theme);
            });
        });
        
        // 会話タイトル編集
        elements.editTitleBtn.addEventListener('click', editConversationTitle);
        
        // エクスポート
        elements.exportBtn.addEventListener('click', exportCurrentConversation);
        
        // クリア
        elements.clearBtn.addEventListener('click', clearMessages);
        
        // 会話検索
        elements.conversationSearch.addEventListener('input', searchConversations);
        
        // ディレクトリ参照
        elements.browseDirectoryBtn.addEventListener('click', browseDirectory);
        
        // ファイル選択
        elements.selectFileBtn.addEventListener('click', selectFile);
        elements.cancelFileSelectionBtn.addEventListener('click', () => {
            closeModal(elements.fileBrowserModal);
        });
        
        // モーダルを閉じる
        elements.closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                closeModal(modal);
            });
        });
    };
    
    // メッセージを送信
    const sendMessage = async () => {
        const messageText = elements.messageInput.value.trim();
        if (!messageText) return;
        
        try {
            // 入力欄をクリア
            elements.messageInput.value = '';
            
            // ユーザーメッセージをUIに追加
            appendMessage({
                role: 'user',
                content: messageText,
                timestamp: new Date().toISOString()
            });
            
            // 送信中の状態を表示
            showLoadingIndicator();
            
            // 現在の会話があるか確認
            if (currentConversationId) {
                // 既存の会話に追加
                const response = await API.continueConversation(currentConversationId, messageText);
                
                // Claudeの応答をUIに追加
                appendMessage(response.claudeResponse);
            } else {
                // 新しい会話を開始
                const result = await API.startNewConversation(messageText);
                
                // 会話IDを保存
                currentConversationId = result.conversation.id;
                
                // タイトルを更新
                updateConversationTitle(result.conversation.title);
                
                // 会話リストを更新
                await loadConversationList();
                
                // 会話リストで現在の会話をアクティブにする
                highlightCurrentConversation();
                
                // Claudeの応答をUIに追加
                appendMessage(result.claudeResponse);
            }
            
            // ローディングインジケータを非表示
            hideLoadingIndicator();
        } catch (error) {
            console.error('メッセージ送信中にエラーが発生しました:', error);
            showToast('エラー', error.message, 'error');
            hideLoadingIndicator();
        }
    };
    
    // メッセージをUIに追加
    const appendMessage = (message) => {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.role === 'user' ? 'user-message' : 'claude-message'}`;
        
        // メッセージの内容を作成
        let messageHTML = `
            <div class="message-content">
                ${formatMessageContent(message.content)}
                <div class="message-time">${formatTimestamp(message.timestamp)}</div>
            </div>
        `;
        
        // Claudeのメッセージの場合はアバターを追加
        if (message.role === 'claude') {
            messageHTML = `
                <div class="message-avatar claude-avatar">C</div>
                ${messageHTML}
            `;
        }
        
        messageElement.innerHTML = messageHTML;
        elements.messageContainer.appendChild(messageElement);
        
        // 最下部にスクロール
        elements.messageContainer.scrollTop = elements.messageContainer.scrollHeight;
    };
    
    // メッセージの内容をフォーマット
    const formatMessageContent = (content) => {
        if (!content) return '';
        
        // マークダウン形式のコードブロックを検出して変換
        content = content.replace(/```(\w*)\n([\s\S]*?)```/g, (match, language, code) => {
            return `<pre><code class="language-${language}">${escapeHtml(code)}</code></pre>`;
        });
        
        // 改行を<br>に変換
        content = content.replace(/\n/g, '<br>');
        
        return content;
    };
    
    // タイムスタンプをフォーマット
    const formatTimestamp = (timestamp) => {
        if (!timestamp) return '';
        
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    
    // HTMLエスケープ
    const escapeHtml = (text) => {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };
    
    // ローディングインジケータを表示
    const showLoadingIndicator = () => {
        const loadingElement = document.createElement('div');
        loadingElement.className = 'message claude-message loading-message';
        loadingElement.innerHTML = `
            <div class="message-avatar claude-avatar">C</div>
            <div class="message-content">
                <div class="loading">
                    <div></div>
                </div>
            </div>
        `;
        loadingElement.id = 'loading-indicator';
        elements.messageContainer.appendChild(loadingElement);
        elements.messageContainer.scrollTop = elements.messageContainer.scrollHeight;
    };
    
    // ローディングインジケータを非表示
    const hideLoadingIndicator = () => {
        const loadingElement = document.getElementById('loading-indicator');
        if (loadingElement) {
            loadingElement.remove();
        }
    };
    
    // ログファイルを選択した時の処理
    const handleLogFileSelect = async (event) => {
        const files = event.target.files;
        if (files.length === 0) return;
        
        const file = files[0];
        
        try {
            // ローディング表示
            showToast('情報', 'ファイルを読み込んでいます...', 'info');
            
            // ファイルを読み込む
            const content = await FileHelper.readFileAsync(file);
            
            // ログの種類を判定
            let parsedData;
            const fileExtension = FileHelper.getFileExtension(file.name).toLowerCase();
            
            if (fileExtension === 'json') {
                parsedData = LogParser.parseClaudeJson(content);
            } else if (fileExtension === 'txt') {
                parsedData = LogParser.parseLineLog(content);
            } else {
                parsedData = LogParser.parseClaudeLog(content);
            }
            
            if (!parsedData || !parsedData.messages || parsedData.messages.length === 0) {
                throw new Error('ログの解析に失敗しました');
            }
            
            // ログデータをEnhancedDBStorageに保存
            const logData = {
                path: file.name,
                filename: file.name,
                timestamp: new Date().toISOString()
            };
            
            // ログをインポート
            const result = await EnhancedDBStorage.importClaudeLogAsConversation(logData, content);
            
            // 会話リストを更新
            await loadConversationList();
            
            // 会話を表示
            loadConversation(result.conversationId);
            
            showToast('成功', `${parsedData.messages.length}件のメッセージをインポートしました`, 'success');
        } catch (error) {
            console.error('ログファイルの読み込み中にエラーが発生しました:', error);
            showToast('エラー', error.message, 'error');
        } finally {
            // ファイル入力をリセット
            event.target.value = '';
        }
    };
    
    // 会話リストを読み込む
    const loadConversationList = async () => {
        try {
            // 会話一覧を取得
            const conversations = await DBStorage.getAllConversations();
            console.log('Detected array of conversations');
            
            // リストをクリア
            elements.conversationList.innerHTML = '';
            
            // 日付で降順ソート
            conversations.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // 各会話をリストに追加
            conversations.forEach(conversation => {
                const conversationElement = document.createElement('div');
                conversationElement.className = 'conversation-item';
                conversationElement.dataset.id = conversation.id;
                
                conversationElement.innerHTML = `
                    <div class="conversation-title">${conversation.title}</div>
                    <div class="conversation-date">${formatDate(conversation.date)}</div>
                `;
                
                // クリックイベント
                conversationElement.addEventListener('click', () => {
                    loadConversation(conversation.id);
                });
                
                elements.conversationList.appendChild(conversationElement);
            });
            
            // 現在の会話をハイライト
            highlightCurrentConversation();
        } catch (error) {
            console.error('会話リストの読み込み中にエラーが発生しました:', error);
            showToast('エラー', '会話リストを読み込めませんでした', 'error');
        }
    };
    
    // 日付をフォーマット
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString([], {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    
    // 会話を読み込む
    const loadConversation = async (conversationId) => {
        try {
            // 会話情報を取得
            const conversation = await DBStorage.getConversation(conversationId);
            if (!conversation) {
                throw new Error('会話が見つかりません');
            }
            
            // 会話に属するメッセージを取得
            const messages = await DBStorage.getMessagesByConversation(conversationId);
            
            // 現在の会話IDを更新
            currentConversationId = conversationId;
            
            // タイトルを更新
            updateConversationTitle(conversation.title);
            
            // メッセージコンテナをクリア
            elements.messageContainer.innerHTML = '';
            
            // 日付でソート
            messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            // メッセージを表示
            messages.forEach(message => {
                appendMessage(message);
            });
            
            // 会話リストで現在の会話をハイライト
            highlightCurrentConversation();
        } catch (error) {
            console.error('会話の読み込み中にエラーが発生しました:', error);
            showToast('エラー', error.message, 'error');
        }
    };
    
    // 現在の会話をハイライト
    const highlightCurrentConversation = () => {
        if (!currentConversationId) return;
        
        // すべての会話アイテムからアクティブクラスを削除
        const conversationItems = elements.conversationList.querySelectorAll('.conversation-item');
        conversationItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // 現在の会話にアクティブクラスを追加
        const currentItem = elements.conversationList.querySelector(`.conversation-item[data-id="${currentConversationId}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
        }
    };
    
    // 会話タイトルを更新
    const updateConversationTitle = (title) => {
        elements.currentConversationTitle.textContent = title;
    };
    
    // 会話タイトルを編集
    const editConversationTitle = async () => {
        if (!currentConversationId) return;
        
        // 現在のタイトルを取得
        const currentTitle = elements.currentConversationTitle.textContent;
        
        // 新しいタイトルを尋ねる
        const newTitle = prompt('会話のタイトルを入力してください:', currentTitle);
        
        if (newTitle && newTitle !== currentTitle) {
            try {
                // 会話を取得
                const conversation = await DBStorage.getConversation(currentConversationId);
                
                // タイトルを更新
                conversation.title = newTitle;
                
                // 更新を保存
                await DBStorage.saveConversation(conversation);
                
                // UIを更新
                updateConversationTitle(newTitle);
                
                // 会話リストを更新
                await loadConversationList();
                
                showToast('成功', 'タイトルを更新しました', 'success');
            } catch (error) {
                console.error('タイトルの更新中にエラーが発生しました:', error);
                showToast('エラー', error.message, 'error');
            }
        }
    };
    
    // 現在の会話をエクスポート
    const exportCurrentConversation = async () => {
        if (!currentConversationId) {
            showToast('エラー', 'エクスポートする会話がありません', 'error');
            return;
        }
        
        try {
            // 会話データをエクスポート
            const exportData = await DBStorage.exportConversation(currentConversationId);
            
            // JSONに変換
            const jsonData = JSON.stringify(exportData, null, 2);
            
            // ダウンロード用のリンクを作成
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `conversation-${currentConversationId}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showToast('成功', '会話をエクスポートしました', 'success');
        } catch (error) {
            console.error('会話のエクスポート中にエラーが発生しました:', error);
            showToast('エラー', error.message, 'error');
        }
    };
    
    // 現在の会話をクリア
    const clearMessages = () => {
        if (confirm('現在の会話をクリアしますか？この操作は元に戻せません。')) {
            // メッセージコンテナをクリア
            elements.messageContainer.innerHTML = '';
            
            // 現在の会話IDをリセット
            currentConversationId = null;
            
            // タイトルを更新
            updateConversationTitle('新しい会話');
            
            // 会話リストのハイライトを解除
            const conversationItems = elements.conversationList.querySelectorAll('.conversation-item');
            conversationItems.forEach(item => {
                item.classList.remove('active');
            });
        }
    };
    
    // 会話を検索
    const searchConversations = async () => {
        const searchText = elements.conversationSearch.value.trim();
        
        try {
            let conversations;
            
            if (searchText) {
                // 検索テキストがある場合は検索
                conversations = await EnhancedDBStorage.searchConversations(searchText);
            } else {
                // 検索テキストがない場合はすべての会話を表示
                conversations = await DBStorage.getAllConversations();
            }
            
            // リストをクリア
            elements.conversationList.innerHTML = '';
            
            // 日付で降順ソート
            conversations.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // 各会話をリストに追加
            conversations.forEach(conversation => {
                const conversationElement = document.createElement('div');
                conversationElement.className = 'conversation-item';
                conversationElement.dataset.id = conversation.id;
                
                conversationElement.innerHTML = `
                    <div class="conversation-title">${conversation.title}</div>
                    <div class="conversation-date">${formatDate(conversation.date)}</div>
                `;
                
                // クリックイベント
                conversationElement.addEventListener('click', () => {
                    loadConversation(conversation.id);
                });
                
                elements.conversationList.appendChild(conversationElement);
            });
            
            // 現在の会話をハイライト
            highlightCurrentConversation();
        } catch (error) {
            console.error('会話の検索中にエラーが発生しました:', error);
            showToast('エラー', error.message, 'error');
        }
    };
    
    // 設定モーダルを開く
    const openSettingsModal = () => {
        // 現在の設定を取得
        const apiSettings = API.getSettings();
        
        // フォームに設定を反映
        elements.apiKeyInput.value = apiSettings.key || '';
        elements.modelSelection.value = apiSettings.model || 'claude-3-opus-20240229';
        
        // ログディレクトリの設定を取得
        elements.logDirectory.value = localStorage.getItem('last_log_directory') || '';
        
        // モーダルを表示
        openModal(elements.settingsModal);
    };
    
    // 設定を保存
    const saveSettings = () => {
        try {
            // APIキーと選択されたモデルを取得
            const apiKey = elements.apiKeyInput.value.trim();
            const model = elements.modelSelection.value;
            
            // ログディレクトリパスを取得
            const logDirectory = elements.logDirectory.value.trim();
            
            // API設定を保存
            API.saveSettings({
                key: apiKey,
                model: model
            });
            
            // ログディレクトリを保存
            if (logDirectory) {
                localStorage.setItem('last_log_directory', logDirectory);
            }
            
            // モーダルを閉じる
            closeModal(elements.settingsModal);
            
            showToast('成功', '設定を保存しました', 'success');
        } catch (error) {
            console.error('設定の保存中にエラーが発生しました:', error);
            showToast('エラー', error.message, 'error');
        }
    };
    
    // テーマを適用
    const applyTheme = (theme) => {
        // bodyにテーマクラスを設定
        document.body.classList.remove('light-theme', 'dark-theme');
        document.body.classList.add(`${theme}-theme`);
        
        // 設定を保存
        Config.updateConfig('ui.theme', theme);
    };
    
    // ディレクトリを参照
    const browseDirectory = async () => {
        try {
            // ファイルシステムAPIを使ってディレクトリを開く
            const result = await FileHelper.openDirectory();
            
            if (result.success) {
                // ディレクトリパスを設定
                elements.logDirectory.value = result.directory;
                
                // ファイルリストを表示
                elements.currentDirectoryPath.textContent = result.directory;
                
                // ファイルリストをクリア
                elements.fileList.innerHTML = '';
                
                // ファイルとフォルダを追加
                result.entries.forEach(entry => {
                    const fileElement = document.createElement('div');
                    fileElement.className = `file-item ${entry.isDirectory ? 'folder' : ''}`;
                    fileElement.innerHTML = `
                        <i class="fas ${entry.isDirectory ? 'fa-folder' : 'fa-file'}"></i>
                        <span>${entry.name}</span>
                    `;
                    
                    // クリックイベント
                    fileElement.addEventListener('click', () => {
                        // 選択状態を切り替え
                        elements.fileList.querySelectorAll('.file-item').forEach(item => {
                            item.classList.remove('selected');
                        });
                        fileElement.classList.add('selected');
                    });
                    
                    elements.fileList.appendChild(fileElement);
                });
                
                // モーダルを表示
                openModal(elements.fileBrowserModal);
            } else {
                showToast('エラー', result.error, 'error');
            }
        } catch (error) {
            console.error('ディレクトリの参照中にエラーが発生しました:', error);
            showToast('エラー', error.message, 'error');
        }
    };
    
    // ファイルを選択
    const selectFile = () => {
        // 選択されたファイルを取得
        const selectedFile = elements.fileList.querySelector('.file-item.selected');
        
        if (selectedFile) {
            // ファイル名を取得
            const fileName = selectedFile.querySelector('span').textContent;
            
            // ディレクトリパスを取得
            const directoryPath = elements.currentDirectoryPath.textContent;
            
            // フルパスを作成
            const fullPath = `${directoryPath}/${fileName}`;
            
            // パスを設定
            elements.logDirectory.value = fullPath;
            
            // モーダルを閉じる
            closeModal(elements.fileBrowserModal);
        } else {
            showToast('エラー', 'ファイルが選択されていません', 'error');
        }
    };
    
    // モーダルを開く
    const openModal = (modal) => {
        modal.classList.add('show');
    };
    
    // モーダルを閉じる
    const closeModal = (modal) => {
        modal.classList.remove('show');
    };
    
    // トースト通知を表示
    const showToast = (title, message, type = 'info') => {
        // 既存のトーストを削除
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        // トースト要素を作成
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // アイコンを設定
        let icon;
        switch (type) {
            case 'success':
                icon = 'fa-check-circle';
                break;
            case 'error':
                icon = 'fa-exclamation-circle';
                break;
            case 'warning':
                icon = 'fa-exclamation-triangle';
                break;
            default:
                icon = 'fa-info-circle';
        }
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <div>
                <strong>${title}</strong>
                <div>${message}</div>
            </div>
        `;
        
        // DOMに追加
        document.body.appendChild(toast);
        
        // 表示アニメーション
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        // 自動的に消える
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 5000);
    };
    
    // 公開API
    return {
        init,
        loadConversationList,
        loadConversation,
        appendMessage,
        showToast,
        applyTheme,
        openSettingsModal,
        closeModal
    };
})();

// グローバルに公開
window.UI = UIModule;

// DOMContentLoadedイベントでUIを初期化
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
