/**
 * main.js
 * アプリケーションのメインモジュール
 */

// 必要なモジュールを読み込む - ESモジュール構文に修正
import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';

// アプリケーションの状態管理
const AppState = {
    currentConversationId: null,
    currentUser: {
        name: 'ユーザー',
        apiKey: ''
    },
    settings: null,
    loading: false,
    initialized: false
};

// アプリケーションの初期化
const initializeApp = async () => {
    try {
        console.log('アプリケーションを初期化しています...');
        
        // 設定を読み込む
        await loadSettings();
        
        // データベースを初期化
        await initializeDatabases();
        
        // APIを初期化
        initializeAPI();
        
        // UIを初期化
        initializeUI();
        
        // 初期化完了
        AppState.initialized = true;
        console.log('アプリケーションの初期化が完了しました');
        
        // 前回の会話を復元
        restoreLastConversation();
        
        return true;
    } catch (error) {
        console.error('アプリケーションの初期化中にエラーが発生しました:', error);
        
        // エラーメッセージを表示
        showErrorMessage('アプリケーションの初期化に失敗しました', error.message);
        
        return false;
    }
};

// 設定を読み込む
const loadSettings = async () => {
    // 基本設定を読み込む
    const config = window.Config?.getConfig() || {};
    
    // ローカルストレージから最後に使用した会話IDを読み込む
    const lastConversationId = localStorage.getItem('last_conversation_id');
    
    // 状態を更新
    AppState.settings = config;
    AppState.currentConversationId = lastConversationId || null;
    
    console.log('設定を読み込みました:', config);
};

// データベースを初期化
const initializeDatabases = async () => {
    try {
        // 標準データベースを初期化
        if (window.DBStorage) {
            await window.DBStorage.initDB();
        }
        
        // 拡張データベースを初期化
        if (window.EnhancedDBStorage) {
            await window.EnhancedDBStorage.initDB();
        }
        
        console.log('データベースが初期化されました');
        return true;
    } catch (error) {
        console.error('データベースの初期化中にエラーが発生しました:', error);
        throw error;
    }
};

// APIを初期化
const initializeAPI = () => {
    try {
        // APIモジュールを初期化
        if (window.API) {
            window.API.init();
        }
        
        console.log('APIが初期化されました');
        return true;
    } catch (error) {
        console.error('APIの初期化中にエラーが発生しました:', error);
        throw error;
    }
};

// UIを初期化
const initializeUI = () => {
    try {
        // UIモジュールを初期化
        if (window.UI) {
            window.UI.init();
        }
        
        console.log('UIが初期化されました');
        return true;
    } catch (error) {
        console.error('UIの初期化中にエラーが発生しました:', error);
        throw error;
    }
};

// 前回の会話を復元
const restoreLastConversation = async () => {
    // 最後に使用した会話IDがある場合
    if (AppState.currentConversationId) {
        try {
            // 会話を読み込む
            if (window.UI) {
                await window.UI.loadConversation(AppState.currentConversationId);
                console.log('前回の会話を復元しました:', AppState.currentConversationId);
            }
        } catch (error) {
            console.warn('前回の会話の復元に失敗しました:', error);
            // エラーが発生しても続行
        }
    }
};

// エラーメッセージを表示
const showErrorMessage = (title, message) => {
    try {
        // UIモジュールのトースト機能を使用
        if (window.UI) {
            window.UI.showToast(title, message, 'error');
        } else {
            // フォールバックとしてアラートを使用
            alert(`${title}: ${message}`);
        }
    } catch (error) {
        console.error('エラーメッセージの表示に失敗しました:', error);
        // 最終手段としてコンソールに出力
        console.error(title, message);
    }
};

// 現在の会話IDを更新
const updateCurrentConversation = (conversationId) => {
    // 状態を更新
    AppState.currentConversationId = conversationId;
    
    // ローカルストレージに保存
    if (conversationId) {
        localStorage.setItem('last_conversation_id', conversationId);
    } else {
        localStorage.removeItem('last_conversation_id');
    }
    
    console.log('現在の会話を更新しました:', conversationId);
};

// グローバルオブジェクトにエクスポート
window.App = {
    state: AppState,
    init: initializeApp,
    updateCurrentConversation
};

// Vue.jsアプリケーションを作成
const createVueApp = () => {
    if (typeof createApp !== 'undefined') {
        try {
            // Vueアプリケーションを作成
            const app = createApp({
                data() {
                    return {
                        appState: AppState
                    };
                },
                mounted() {
                    // アプリケーションを初期化
                    this.initApp();
                },
                methods: {
                    async initApp() {
                        try {
                            await initializeApp();
                        } catch (error) {
                            console.error('Vue.jsアプリケーションの初期化中にエラーが発生しました:', error);
                        }
                    }
                }
            });
            
            // アプリケーションをマウント
            app.mount('#app');
            
            console.log('Vue.jsアプリケーションが初期化されました');
            return app;
        } catch (error) {
            console.error('Vue.jsアプリケーションの作成中にエラーが発生しました:', error);
            
            // Vueが使用できない場合は通常の初期化を試みる
            setTimeout(initializeApp, 0);
            
            return null;
        }
    } else {
        console.warn('Vue.jsが見つかりません。通常の初期化を使用します。');
        
        // Vueが使用できない場合は通常の初期化を試みる
        setTimeout(initializeApp, 0);
        
        return null;
    }
};

// DOMの読み込みが完了したら初期化
document.addEventListener('DOMContentLoaded', () => {
    // Vueアプリを作成
    createVueApp();
});

// エクスポート
export {
    AppState,
    initializeApp,
    updateCurrentConversation
};
