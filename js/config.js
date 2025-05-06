/**
 * config.js
 * アプリケーション全体の設定を管理するモジュール
 */

const Config = (() => {
    // デフォルト設定
    const defaultConfig = {
        // APIの設定
        api: {
            key: '',
            model: 'claude-3-opus-20240229',
            maxTokens: 2000,
            temperature: 0.7,
            baseUrl: 'https://api.anthropic.com/v1'
        },
        // UIの設定
        ui: {
            theme: 'light',
            messageDisplay: 'bubble',
            fontSize: 'medium',
            showTimestamps: true
        },
        // ファイルの設定
        file: {
            lastDirectory: '',
            autoSave: true,
            saveInterval: 300000 // 5分ごと
        },
        // データベースの設定
        database: {
            name: 'claude-line-chat',
            version: 1,
            stores: {
                conversations: 'id,title,date',
                messages: 'id,conversationId,timestamp,type'
            }
        },
        // コルーチンの設定
        cors: {
            proxyEnabled: false,
            proxyUrl: 'https://cors-anywhere.herokuapp.com/'
        },
        // デバッグ設定
        debug: {
            enabled: false,
            verbose: false,
            saveLogsToStorage: false,
            logMaxEntries: 100
        }
    };

    // 現在の設定を保持する変数
    let currentConfig = {};
    
    // デバッグ用ログ配列
    let debugLogs = [];

    // 設定をローカルストレージから読み込む
    const loadConfig = () => {
        try {
            const savedConfig = localStorage.getItem('app_config');
            if (savedConfig) {
                // 保存された設定をパース
                const parsedConfig = JSON.parse(savedConfig);
                
                // デフォルト設定とマージ
                currentConfig = mergeDeep(defaultConfig, parsedConfig);
            } else {
                // 保存された設定がない場合はデフォルト設定を使用
                currentConfig = { ...defaultConfig };
            }
            
            console.log('設定を読み込みました:', currentConfig);
            debugLog('Config', '設定を読み込みました', currentConfig);
            return currentConfig;
        } catch (error) {
            console.error('設定の読み込み中にエラーが発生しました:', error);
            debugLog('Config', '設定の読み込み中にエラーが発生しました', error);
            // エラーが発生した場合はデフォルト設定を使用
            currentConfig = { ...defaultConfig };
            return currentConfig;
        }
    };

    // 設定をローカルストレージに保存
    const saveConfig = (newConfig = currentConfig) => {
        try {
            localStorage.setItem('app_config', JSON.stringify(newConfig));
            console.log('設定を保存しました');
            debugLog('Config', '設定を保存しました', newConfig);
            // 現在の設定を更新
            currentConfig = { ...newConfig };
            return true;
        } catch (error) {
            console.error('設定の保存中にエラーが発生しました:', error);
            debugLog('Config', '設定の保存中にエラーが発生しました', error);
            return false;
        }
    };

    // 設定の一部を更新
    const updateConfig = (path, value) => {
        // パスを解析（例: 'api.key'）
        const keys = path.split('.');
        const lastKey = keys.pop();
        
        // 設定のディープコピーを作成
        const newConfig = JSON.parse(JSON.stringify(currentConfig));
        
        // 対象のオブジェクトを取得
        let target = newConfig;
        for (const key of keys) {
            if (!(key in target)) {
                target[key] = {};
            }
            target = target[key];
        }
        
        // 値を更新
        target[lastKey] = value;
        
        debugLog('Config', `設定を更新しました: ${path} = ${JSON.stringify(value)}`, null);
        
        // 更新された設定を保存
        return saveConfig(newConfig);
    };

    // 設定を取得
    const getConfig = (path = '') => {
        if (!path) return currentConfig;
        
        // パスを解析（例: 'api.key'）
        const keys = path.split('.');
        
        // 設定から値を取得
        let value = currentConfig;
        for (const key of keys) {
            if (value === undefined || value === null) return undefined;
            value = value[key];
        }
        
        return value;
    };

    // 設定が完了しているかどうかを確認
    const isConfigured = () => {
        // APIキーが設定されているかどうかを確認
        return !!getConfig('api.key');
    };

    // ユーティリティ: オブジェクトのディープマージ
    const mergeDeep = (target, source) => {
        const output = Object.assign({}, target);
        
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(key => {
                if (isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = mergeDeep(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        return output;
    };

    // ユーティリティ: オブジェクトかどうかを確認
    const isObject = (item) => {
        return (item && typeof item === 'object' && !Array.isArray(item));
    };
    
    // デバッグログ関数
    const debugLog = (module, message, data) => {
        if (!currentConfig.debug || !currentConfig.debug.enabled) return;
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            module,
            message,
            data: data !== undefined ? JSON.stringify(data) : null
        };
        
        // ログを配列に追加
        debugLogs.push(logEntry);
        
        // 最大エントリー数を超えたら古いものを削除
        const maxEntries = currentConfig.debug.logMaxEntries || 100;
        if (debugLogs.length > maxEntries) {
            debugLogs = debugLogs.slice(-maxEntries);
        }
        
        // 詳細モードの場合はコンソールにも出力
        if (currentConfig.debug.verbose) {
            console.log(`[DEBUG][${timestamp}][${module}] ${message}`, data || '');
        }
        
        // ローカルストレージにログを保存
        if (currentConfig.debug.saveLogsToStorage) {
            try {
                localStorage.setItem('debug_logs', JSON.stringify(debugLogs));
            } catch (error) {
                console.error('デバッグログの保存中にエラーが発生しました:', error);
            }
        }
    };
    
    // デバッグモードの切り替え
    const toggleDebugMode = () => {
        const currentDebugEnabled = currentConfig.debug?.enabled || false;
        updateConfig('debug.enabled', !currentDebugEnabled);
        console.log(`デバッグモード: ${!currentDebugEnabled ? 'ON' : 'OFF'}`);
        return !currentDebugEnabled;
    };
    
    // 詳細デバッグモードの切り替え
    const toggleVerboseMode = () => {
        const currentVerboseMode = currentConfig.debug?.verbose || false;
        updateConfig('debug.verbose', !currentVerboseMode);
        console.log(`詳細デバッグモード: ${!currentVerboseMode ? 'ON' : 'OFF'}`);
        return !currentVerboseMode;
    };
    
    // デバッグログの取得
    const getDebugLogs = () => {
        return [...debugLogs];
    };
    
    // デバッグログのクリア
    const clearDebugLogs = () => {
        debugLogs = [];
        if (currentConfig.debug?.saveLogsToStorage) {
            localStorage.removeItem('debug_logs');
        }
        console.log('デバッグログをクリアしました');
        return true;
    };
    
    // 診断情報の取得
    const getDiagnostics = () => {
        const storage = {
            available: !!window.localStorage,
            usedSpace: 0,
            totalSpace: 0,
            items: {}
        };
        
        // ローカルストレージ情報の取得
        if (storage.available) {
            try {
                let totalSize = 0;
                
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    const value = localStorage.getItem(key);
                    const size = (key.length + value.length) * 2; // UTF-16エンコードのため2倍
                    
                    totalSize += size;
                    storage.items[key] = {
                        size,
                        sizeKB: (size / 1024).toFixed(2) + ' KB'
                    };
                }
                
                storage.usedSpace = totalSize;
                storage.usedSpaceKB = (totalSize / 1024).toFixed(2) + ' KB';
                
                // 推定総容量 (5MB)
                storage.totalSpace = 5 * 1024 * 1024;
                storage.totalSpaceKB = '5 MB';
                storage.usagePercentage = ((totalSize / storage.totalSpace) * 100).toFixed(2) + '%';
            } catch (error) {
                console.error('ストレージ情報の取得中にエラーが発生しました:', error);
            }
        }
        
        // ブラウザ情報
        const browser = {
            userAgent: navigator.userAgent,
            language: navigator.language,
            cookiesEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            platform: navigator.platform
        };
        
        // IndexedDB関連情報
        const indexedDB = {
            available: !!window.indexedDB,
            databases: []
        };
        
        // 設定情報（機密情報を除く）
        const safeConfig = JSON.parse(JSON.stringify(currentConfig));
        if (safeConfig.api) {
            safeConfig.api.key = safeConfig.api.key ? '********' : '';
        }
        
        return {
            timestamp: new Date().toISOString(),
            config: safeConfig,
            storage,
            browser,
            indexedDB,
            debugLogs: currentConfig.debug?.enabled ? getDebugLogs() : []
        };
    };

    // 初期化時に設定を読み込む
    loadConfig();
    
    // 保存されたデバッグログがあれば読み込む
    if (currentConfig.debug?.saveLogsToStorage) {
        try {
            const savedLogs = localStorage.getItem('debug_logs');
            if (savedLogs) {
                debugLogs = JSON.parse(savedLogs);
                
                if (currentConfig.debug?.verbose) {
                    console.log(`${debugLogs.length}件のデバッグログを読み込みました`);
                }
            }
        } catch (error) {
            console.error('デバッグログの読み込み中にエラーが発生しました:', error);
        }
    }

    // 公開API
    return {
        loadConfig,
        saveConfig,
        updateConfig,
        getConfig,
        isConfigured,
        defaultConfig,
        // デバッグ関連
        debug: {
            log: debugLog,
            toggleMode: toggleDebugMode,
            toggleVerbose: toggleVerboseMode,
            getLogs: getDebugLogs,
            clearLogs: clearDebugLogs,
            isEnabled: () => currentConfig.debug?.enabled || false,
            isVerbose: () => currentConfig.debug?.verbose || false
        },
        // 診断関連
        getDiagnostics
    };
})();

// グローバルに公開
window.Config = Config;
