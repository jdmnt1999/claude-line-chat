/**
 * main.js
 * アプリケーションのメインモジュール
 * V2: モジュール形式から通常のスクリプトに変更し、診断機能を強化
 */

// アプリケーションの状態管理
const AppState = {
    currentConversationId: null,
    currentUser: {
        name: 'ユーザー',
        apiKey: ''
    },
    settings: null,
    loading: false,
    initialized: false,
    errors: [],
    loadedModules: {},
    startTime: Date.now()
};

// アプリケーションの初期化
const initializeApp = async () => {
    try {
        const startTime = Date.now();
        console.log('アプリケーションを初期化しています...');
        
        // 設定を読み込む
        await loadSettings();
        
        // モジュールの読み込み状態を確認
        checkModulesLoaded();
        
        // データベースを初期化
        await initializeDatabases();
        
        // APIを初期化
        initializeAPI();
        
        // UIを初期化
        initializeUI();
        
        // 初期化完了
        AppState.initialized = true;
        AppState.loadTime = Date.now() - startTime;
        
        console.log(`アプリケーションの初期化が完了しました (${AppState.loadTime}ms)`);
        
        // 前回の会話を復元
        restoreLastConversation();
        
        // 診断データをロギング
        logDiagnostics();
        
        return true;
    } catch (error) {
        console.error('アプリケーションの初期化中にエラーが発生しました:', error);
        logError('initializeApp', error);
        
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
    
    // デバッグログに記録
    if (window.Config && window.Config.debug) {
        window.Config.debug.log('Main', '設定を読み込みました', {
            hasSettings: !!config,
            lastConversationId
        });
    }
    
    console.log('設定を読み込みました:', config);
};

// モジュールの読み込み状態を確認
const checkModulesLoaded = () => {
    const requiredModules = [
        'Config', 
        'DBStorage', 
        'EnhancedDBStorage', 
        'FileHelper', 
        'LogParser', 
        'API', 
        'UI', 
        'ClaudeLineFixer'
    ];
    
    let allLoaded = true;
    const loadedModules = {};
    
    requiredModules.forEach(moduleName => {
        const isLoaded = !!window[moduleName];
        loadedModules[moduleName] = isLoaded;
        allLoaded = allLoaded && isLoaded;
        
        if (!isLoaded) {
            console.warn(`モジュール '${moduleName}' が見つかりません`);
            logError('checkModulesLoaded', new Error(`モジュール '${moduleName}' が見つかりません`));
        }
    });
    
    AppState.modulesLoaded = allLoaded;
    AppState.loadedModules = loadedModules;
    
    // デバッグログに記録
    if (window.Config && window.Config.debug) {
        window.Config.debug.log('Main', `モジュール読み込み状態: ${allLoaded ? '完了' : '一部エラー'}`, loadedModules);
    }
    
    return allLoaded;
};

// データベースを初期化
const initializeDatabases = async () => {
    try {
        const dbResults = {
            standard: false,
            enhanced: false
        };
        
        // 標準データベースを初期化
        if (window.DBStorage) {
            try {
                await window.DBStorage.initDB();
                dbResults.standard = true;
                
                if (window.Config && window.Config.debug) {
                    window.Config.debug.log('Main', '標準データベースを初期化しました');
                }
            } catch (dbError) {
                console.error('標準データベースの初期化中にエラーが発生しました:', dbError);
                logError('initializeDatabases:standard', dbError);
            }
        }
        
        // 拡張データベースを初期化
        if (window.EnhancedDBStorage) {
            try {
                await window.EnhancedDBStorage.initDB();
                dbResults.enhanced = true;
                
                if (window.Config && window.Config.debug) {
                    window.Config.debug.log('Main', '拡張データベースを初期化しました');
                }
            } catch (enhancedDbError) {
                console.error('拡張データベースの初期化中にエラーが発生しました:', enhancedDbError);
                logError('initializeDatabases:enhanced', enhancedDbError);
            }
        }
        
        // 少なくとも1つのデータベースが初期化されていることを確認
        if (!dbResults.standard && !dbResults.enhanced) {
            throw new Error('どのデータベースも初期化できませんでした');
        }
        
        AppState.dbInitialized = dbResults;
        console.log('データベースが初期化されました:', dbResults);
        return dbResults;
    } catch (error) {
        console.error('データベースの初期化中にエラーが発生しました:', error);
        logError('initializeDatabases', error);
        throw error;
    }
};

// APIを初期化
const initializeAPI = () => {
    try {
        // APIモジュールを初期化
        if (window.API) {
            window.API.init();
            AppState.apiInitialized = true;
            
            if (window.Config && window.Config.debug) {
                window.Config.debug.log('Main', 'APIモジュールを初期化しました');
            }
        } else {
            AppState.apiInitialized = false;
            throw new Error('APIモジュールが見つかりません');
        }
        
        console.log('APIが初期化されました');
        return true;
    } catch (error) {
        console.error('APIの初期化中にエラーが発生しました:', error);
        logError('initializeAPI', error);
        AppState.apiInitialized = false;
        throw error;
    }
};

// UIを初期化
const initializeUI = () => {
    try {
        // UIモジュールを初期化
        if (window.UI) {
            window.UI.init();
            AppState.uiInitialized = true;
            
            if (window.Config && window.Config.debug) {
                window.Config.debug.log('Main', 'UIモジュールを初期化しました');
            }
        } else {
            AppState.uiInitialized = false;
            throw new Error('UIモジュールが見つかりません');
        }
        
        console.log('UIが初期化されました');
        return true;
    } catch (error) {
        console.error('UIの初期化中にエラーが発生しました:', error);
        logError('initializeUI', error);
        AppState.uiInitialized = false;
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
                
                if (window.Config && window.Config.debug) {
                    window.Config.debug.log('Main', '前回の会話を復元しました', {
                        conversationId: AppState.currentConversationId
                    });
                }
                
                console.log('前回の会話を復元しました:', AppState.currentConversationId);
            }
        } catch (error) {
            console.warn('前回の会話の復元に失敗しました:', error);
            logError('restoreLastConversation', error);
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
    
    // デバッグログに記録
    if (window.Config && window.Config.debug) {
        window.Config.debug.log('Main', '現在の会話を更新しました', {
            conversationId
        });
    }
    
    console.log('現在の会話を更新しました:', conversationId);
};

// エラーを記録
const logError = (operation, error) => {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        operation,
        message: error.message,
        stack: error.stack
    };
    
    AppState.errors.push(errorInfo);
    
    // デバッグログに記録
    if (window.Config && window.Config.debug) {
        window.Config.debug.log('Main', `エラー: ${operation}`, errorInfo);
    }
};

// 診断データをロギング
const logDiagnostics = () => {
    try {
        // ブラウザ情報
        const browserInfo = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookiesEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            platform: navigator.platform
        };
        
        // 初期化情報
        const initInfo = {
            startTime: new Date(AppState.startTime).toISOString(),
            loadTime: AppState.loadTime,
            initialized: AppState.initialized,
            modulesLoaded: AppState.loadedModules,
            dbInitialized: AppState.dbInitialized,
            apiInitialized: AppState.apiInitialized,
            uiInitialized: AppState.uiInitialized,
            errors: AppState.errors.length
        };
        
        // デバッグログに記録
        if (window.Config && window.Config.debug) {
            window.Config.debug.log('Main', '診断データ', {
                browser: browserInfo,
                init: initInfo
            });
        }
        
        console.log('アプリケーション診断データ:', {
            browser: browserInfo,
            init: initInfo
        });
    } catch (error) {
        console.error('診断データのロギング中にエラーが発生しました:', error);
    }
};

// Vueアプリケーションを作成（Vue.jsが利用可能な場合）
const createVueApp = () => {
    // Vueが使用可能かチェック
    if (typeof Vue !== 'undefined' && Vue.createApp) {
        try {
            // Vueアプリケーションを作成
            const app = Vue.createApp({
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
                            logError('Vue.initApp', error);
                        }
                    }
                }
            });
            
            // アプリケーションをマウント
            const appElement = document.getElementById('app');
            if (appElement) {
                app.mount('#app');
                
                if (window.Config && window.Config.debug) {
                    window.Config.debug.log('Main', 'Vue.jsアプリケーションを初期化しました');
                }
                
                console.log('Vue.jsアプリケーションが初期化されました');
            } else {
                throw new Error('マウントするDOM要素が見つかりません');
            }
            
            return app;
        } catch (error) {
            console.error('Vue.jsアプリケーションの作成中にエラーが発生しました:', error);
            logError('createVueApp', error);
            
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

// グローバルオブジェクトにエクスポート
window.App = {
    state: AppState,
    init: initializeApp,
    updateCurrentConversation,
    getErrors: () => [...AppState.errors],
    clearErrors: () => { AppState.errors = []; return true; },
    getDiagnostics: () => {
        return {
            state: { ...AppState },
            browser: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                cookiesEnabled: navigator.cookieEnabled,
                onLine: navigator.onLine,
                platform: navigator.platform
            },
            config: window.Config ? window.Config.getConfig() : null,
            fixer: window.ClaudeLineFixer ? window.ClaudeLineFixer.getDiagnostics() : null,
            fileHelper: window.FileHelper ? window.FileHelper.getState() : null
        };
    }
};

// DOMの読み込みが完了したら初期化
document.addEventListener('DOMContentLoaded', () => {
    // Vueアプリを作成
    const vueApp = createVueApp();
    
    // Vueアプリの作成に失敗した場合は通常の初期化
    if (!vueApp) {
        initializeApp();
    }
    
    // デバッグ用のコンソールメッセージ
    console.info('Claude LINE Chat アプリケーションが起動しました');
    console.info('デバッグ機能を有効にするには: window.Config.debug.toggleMode()');
    console.info('診断情報を表示するには: window.App.getDiagnostics()');
    console.info('ファイルヘルパーをテストするには: window.FileHelper.selfTest()');
});
