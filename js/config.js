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
        }
    };

    // 現在の設定を保持する変数
    let currentConfig = {};

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
            return currentConfig;
        } catch (error) {
            console.error('設定の読み込み中にエラーが発生しました:', error);
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
            // 現在の設定を更新
            currentConfig = { ...newConfig };
            return true;
        } catch (error) {
            console.error('設定の保存中にエラーが発生しました:', error);
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

    // 初期化時に設定を読み込む
    loadConfig();

    // 公開API
    return {
        loadConfig,
        saveConfig,
        updateConfig,
        getConfig,
        isConfigured,
        defaultConfig
    };
})();

// グローバルに公開
window.Config = Config;
