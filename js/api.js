/**
 * api.js
 * ClaudeのAPIを操作するためのモジュール
 */

const APIModule = (() => {
    // API設定
    let apiSettings = {
        key: '',
        model: 'claude-3-opus-20240229',
        maxTokens: 2000,
        temperature: 0.7,
        baseUrl: 'https://api.anthropic.com/v1'
    };

    // 初期化
    const init = () => {
        try {
            // LocalStorageから設定を読み込む
            const storedSettings = localStorage.getItem('api_settings');
            if (storedSettings) {
                apiSettings = JSON.parse(storedSettings);
                console.log('API settings loaded from localStorage');
            } else {
                // 設定ファイルから読み込む
                const configSettings = Config.getConfig('api');
                if (configSettings) {
                    apiSettings = { ...apiSettings, ...configSettings };
                }
            }
            return true;
        } catch (error) {
            console.error('API設定の初期化中にエラーが発生しました:', error);
            return false;
        }
    };

    // API設定を保存
    const saveSettings = (settings) => {
        try {
            apiSettings = { ...apiSettings, ...settings };
            localStorage.setItem('api_settings', JSON.stringify(apiSettings));
            return true;
        } catch (error) {
            console.error('API設定の保存中にエラーが発生しました:', error);
            return false;
        }
    };

    // 現在の設定を取得
    const getSettings = () => {
        return { ...apiSettings };
    };

    // APIキーをチェック
    const checkApiKey = async () => {
        try {
            if (!apiSettings.key) {
                throw new Error('APIキーが設定されていません');
            }
            
            // 最小限のリクエストでAPIキーの有効性を確認
            const response = await fetch(`${apiSettings.baseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiSettings.key,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: apiSettings.model,
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Hello' }]
                })
            });
            
            if (response.ok) {
                return { valid: true, message: 'APIキーは有効です' };
            } else {
                const errorData = await response.json();
                return { valid: false, message: `APIキーエラー: ${errorData.error?.message || '不明なエラー'}` };
            }
        } catch (error) {
            console.error('APIキーの確認中にエラーが発生しました:', error);
            return { valid: false, message: `APIキーの確認中にエラーが発生しました: ${error.message}` };
        }
    };

    // Claudeにメッセージを送信
    const sendMessage = async (messages, conversationId) => {
        try {
            if (!apiSettings.key) {
                throw new Error('APIキーが設定されていません');
            }
            
            // メッセージの形式を調整
            const formattedMessages = messages.map(msg => ({
                role: msg.role === 'claude' ? 'assistant' : 'user',
                content: msg.content
            }));
            
            // APIリクエスト
            const response = await fetch(`${apiSettings.baseUrl}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiSettings.key,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: apiSettings.model,
                    max_tokens: apiSettings.maxTokens,
                    temperature: apiSettings.temperature,
                    messages: formattedMessages
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
            }
            
            const data = await response.json();
            
            // レスポンスをフォーマット
            return {
                id: generateUniqueId(),
                conversationId,
                content: data.content[0].text,
                role: 'claude',
                type: 'text',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('メッセージ送信中にエラーが発生しました:', error);
            throw error;
        }
    };

    // 会話から前のやり取りを取得
    const getPreviousMessages = async (conversationId, limit = 10) => {
        try {
            // データベースからメッセージを取得
            const messages = await DBStorage.getMessagesByConversation(conversationId);
            
            // 最新のものから指定数を取得して、古い順にソート
            return messages
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, limit)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        } catch (error) {
            console.error('過去のメッセージの取得中にエラーが発生しました:', error);
            throw error;
        }
    };

    // 会話の継続
    const continueConversation = async (conversationId, userMessage) => {
        try {
            // 過去のメッセージを取得
            const previousMessages = await getPreviousMessages(conversationId);
            
            // ユーザーの新しいメッセージを追加
            const newUserMessage = {
                id: generateUniqueId(),
                conversationId,
                content: userMessage,
                role: 'user',
                type: 'text',
                timestamp: new Date().toISOString()
            };
            
            // データベースに保存
            await DBStorage.saveMessage(newUserMessage);
            
            // すべてのメッセージを結合
            const allMessages = [...previousMessages, newUserMessage];
            
            // APIにリクエスト
            const claudeResponse = await sendMessage(allMessages, conversationId);
            
            // Claudeの応答をデータベースに保存
            await DBStorage.saveMessage(claudeResponse);
            
            return {
                userMessage: newUserMessage,
                claudeResponse
            };
        } catch (error) {
            console.error('会話の継続中にエラーが発生しました:', error);
            throw error;
        }
    };

    // 新しい会話を開始
    const startNewConversation = async (userMessage, title = null) => {
        try {
            // 新しい会話を作成
            const conversation = {
                id: generateUniqueId(),
                title: title || `会話 ${new Date().toLocaleDateString()}`,
                date: new Date().toISOString()
            };
            
            // 会話をデータベースに保存
            await DBStorage.saveConversation(conversation);
            
            // 最初のユーザーメッセージ
            const firstMessage = {
                id: generateUniqueId(),
                conversationId: conversation.id,
                content: userMessage,
                role: 'user',
                type: 'text',
                timestamp: new Date().toISOString()
            };
            
            // ユーザーメッセージを保存
            await DBStorage.saveMessage(firstMessage);
            
            // Claudeに応答を要求
            const claudeResponse = await sendMessage([firstMessage], conversation.id);
            
            // Claudeの応答を保存
            await DBStorage.saveMessage(claudeResponse);
            
            return {
                conversation,
                userMessage: firstMessage,
                claudeResponse
            };
        } catch (error) {
            console.error('新しい会話の開始中にエラーが発生しました:', error);
            throw error;
        }
    };

    // ユニークIDを生成
    const generateUniqueId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    };

    // 初期化を実行
    init();

    // 公開API
    return {
        init,
        saveSettings,
        getSettings,
        checkApiKey,
        sendMessage,
        continueConversation,
        startNewConversation
    };
})();

// グローバルに公開
window.API = APIModule;
