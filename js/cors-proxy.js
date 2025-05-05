/**
 * cors-proxy.js
 * CORS関連の問題を解決するためのプロキシモジュール
 */

const CORSProxy = (() => {
    // プロキシのデフォルト設定
    const defaultSettings = {
        enabled: false,
        url: 'https://cors-anywhere.herokuapp.com/'
    };
    
    // 現在の設定
    let settings = { ...defaultSettings };
    
    // 初期化
    const init = () => {
        try {
            // 設定を読み込む
            const configSettings = Config.getConfig('cors');
            if (configSettings) {
                settings.enabled = configSettings.proxyEnabled || defaultSettings.enabled;
                settings.url = configSettings.proxyUrl || defaultSettings.url;
            }
            
            console.log('CORSプロキシモジュールが初期化されました', settings);
            return true;
        } catch (error) {
            console.error('CORSプロキシの初期化中にエラーが発生しました:', error);
            return false;
        }
    };
    
    // プロキシ経由のURLを取得
    const getProxiedUrl = (originalUrl) => {
        if (!settings.enabled) return originalUrl;
        
        // URLが既にプロキシを含んでいるか確認
        if (originalUrl.startsWith(settings.url)) {
            return originalUrl;
        }
        
        return `${settings.url}${originalUrl}`;
    };
    
    // プロキシ経由でfetchリクエストを実行
    const proxiedFetch = async (url, options = {}) => {
        const proxiedUrl = getProxiedUrl(url);
        
        try {
            // fetchリクエストを実行
            const response = await fetch(proxiedUrl, options);
            
            // レスポンスが正常か確認
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return response;
        } catch (error) {
            console.error('プロキシ経由のfetchリクエスト中にエラーが発生しました:', error);
            throw error;
        }
    };
    
    // プロキシの設定を更新
    const updateSettings = (newSettings) => {
        // 新しい設定をマージ
        settings = { ...settings, ...newSettings };
        
        // 設定を保存
        Config.updateConfig('cors', {
            proxyEnabled: settings.enabled,
            proxyUrl: settings.url
        });
        
        console.log('CORSプロキシ設定が更新されました:', settings);
        return settings;
    };
    
    // プロキシの有効/無効を切り替え
    const toggleProxy = () => {
        const newState = !settings.enabled;
        settings.enabled = newState;
        
        // 設定を保存
        Config.updateConfig('cors.proxyEnabled', newState);
        
        console.log(`CORSプロキシが${newState ? '有効' : '無効'}になりました`);
        return newState;
    };
    
    // プロキシURLを設定
    const setProxyUrl = (url) => {
        if (!url) return false;
        
        settings.url = url;
        
        // 設定を保存
        Config.updateConfig('cors.proxyUrl', url);
        
        console.log('CORSプロキシURLが更新されました:', url);
        return true;
    };
    
    // 現在の設定を取得
    const getSettings = () => {
        return { ...settings };
    };
    
    // 初期化を実行
    init();
    
    // 公開API
    return {
        getProxiedUrl,
        proxiedFetch,
        updateSettings,
        toggleProxy,
        setProxyUrl,
        getSettings,
        init
    };
})();

// グローバルに公開
window.CORSProxy = CORSProxy;
