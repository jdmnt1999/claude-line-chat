/**
 * file-helper.js
 * ファイル操作に関するユーティリティ関数を提供するモジュール
 * V2: エラーハンドリングと診断機能を強化
 */

const FileHelper = (() => {
    // モジュールの状態
    const state = {
        initialized: false,
        errors: [],
        lastOperation: null,
        supportedFeatures: {
            fileSystemAccess: false,
            fileReader: false,
            fetch: false
        }
    };

    // モジュール初期化
    const init = () => {
        try {
            // 機能サポートのチェック
            state.supportedFeatures.fileSystemAccess = 'showDirectoryPicker' in window;
            state.supportedFeatures.fileReader = 'FileReader' in window;
            state.supportedFeatures.fetch = 'fetch' in window;
            
            // 初期化完了
            state.initialized = true;
            
            // デバッグログに記録
            if (window.Config && window.Config.debug) {
                window.Config.debug.log('FileHelper', 'モジュールが初期化されました', state.supportedFeatures);
            } else {
                console.log('FileHelper: モジュールが初期化されました', state.supportedFeatures);
            }
            
            return true;
        } catch (error) {
            logError('初期化エラー', error);
            return false;
        }
    };

    // エラーを記録
    const logError = (operation, error) => {
        const errorInfo = {
            timestamp: new Date().toISOString(),
            operation,
            message: error.message,
            stack: error.stack
        };
        
        state.errors.push(errorInfo);
        state.lastOperation = operation;
        
        // デバッグログに記録
        if (window.Config && window.Config.debug) {
            window.Config.debug.log('FileHelper', `エラー: ${operation}`, errorInfo);
        }
        
        console.error(`FileHelper エラー (${operation}):`, error);
    };

    // 非同期でファイルを読み込む関数
    const readFileAsync = (file) => {
        return new Promise((resolve, reject) => {
            if (!state.supportedFeatures.fileReader) {
                const error = new Error('FileReaderがサポートされていません');
                logError('readFileAsync', error);
                reject(error);
                return;
            }
            
            try {
                const reader = new FileReader();
                reader.onload = () => {
                    if (window.Config && window.Config.debug && window.Config.debug.isVerbose()) {
                        window.Config.debug.log('FileHelper', 'ファイル読み込み成功', { 
                            name: file.name, 
                            size: file.size,
                            type: file.type
                        });
                    }
                    resolve(reader.result);
                };
                reader.onerror = (event) => {
                    const error = new Error('ファイル読み込みエラー');
                    logError('readFileAsync', error);
                    reject(error);
                };
                reader.readAsText(file);
            } catch (error) {
                logError('readFileAsync', error);
                reject(error);
            }
        });
    };

    // ファイルパスからファイル名のみを取得
    const getFilenameFromPath = (path) => {
        if (!path) return '';
        
        try {
            // Windows形式のパスとUNIX形式のパスの両方に対応
            return path.split(/[\/\\]/).pop();
        } catch (error) {
            logError('getFilenameFromPath', error);
            return path; // エラー時は元のパスを返す
        }
    };

    // ファイルの拡張子を取得
    const getFileExtension = (filename) => {
        if (!filename) return '';
        
        try {
            const parts = filename.split('.');
            return parts.length > 1 ? parts.pop().toLowerCase() : '';
        } catch (error) {
            logError('getFileExtension', error);
            return '';
        }
    };

    // ディレクトリパスを取得
    const getDirectoryPath = (path) => {
        if (!path) return '';
        
        try {
            // Windows形式のパスとUNIX形式のパスの両方に対応
            const parts = path.replace(/\\/g, '/').split('/');
            parts.pop(); // ファイル名を削除
            return parts.join('/');
        } catch (error) {
            logError('getDirectoryPath', error);
            return '';
        }
    };

    // Claudeログファイルを読み込む
    const loadClaudeLogFile = async (filePath) => {
        try {
            if (window.Config && window.Config.debug) {
                window.Config.debug.log('FileHelper', `ログファイル読み込み開始: ${filePath}`);
            }
            
            console.log(`Loading Claude log file from: ${filePath}`);
            
            // ファイルパスを正規化
            filePath = filePath.replace(/\\/g, '/');
            
            // ファイルシステムにアクセスする代わりに、
            // ユーザーがファイルを選択するUIを利用
            const fileInput = document.getElementById('log-file-input');
            if (!fileInput) {
                throw new Error('ファイル入力要素が見つかりません');
            }
            
            // ファイル選択を待つ
            return new Promise((resolve) => {
                // イベントリスナーの設定
                const handleFileSelect = async (event) => {
                    const files = event.target.files;
                    if (files.length === 0) {
                        const result = {
                            success: false,
                            error: 'ファイルが選択されていません'
                        };
                        
                        if (window.Config && window.Config.debug) {
                            window.Config.debug.log('FileHelper', 'ファイル選択キャンセル', result);
                        }
                        
                        resolve(result);
                        return;
                    }

                    const file = files[0];
                    try {
                        const content = await readFileAsync(file);
                        const result = {
                            success: true,
                            filename: file.name,
                            path: filePath || file.name,
                            content: content,
                            type: file.type,
                            size: file.size,
                            lastModified: new Date(file.lastModified).toISOString()
                        };
                        
                        if (window.Config && window.Config.debug) {
                            window.Config.debug.log('FileHelper', 'ファイル読み込み成功', {
                                filename: file.name,
                                size: file.size,
                                type: file.type
                            });
                        }
                        
                        resolve(result);
                    } catch (error) {
                        logError('loadClaudeLogFile', error);
                        resolve({
                            success: false,
                            error: error.message
                        });
                    }
                    
                    // リスナーを削除
                    fileInput.removeEventListener('change', handleFileSelect);
                };
                
                // リスナーをセット
                fileInput.addEventListener('change', handleFileSelect);
                
                // サポートしているファイルタイプを設定
                fileInput.accept = '.html,.json,.txt';
                
                // ファイル選択ダイアログを開く
                fileInput.click();
            });
        } catch (error) {
            logError('loadClaudeLogFile', error);
            console.error('Error loading Claude log file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    };

    // ディレクトリ内のログファイルリストを取得
    const getLogFilesInDirectory = async (directoryPath) => {
        try {
            if (window.Config && window.Config.debug) {
                window.Config.debug.log('FileHelper', `ディレクトリ内ファイル取得開始: ${directoryPath}`);
            }
            
            console.log(`Attempting to list files in: ${directoryPath}`);
            
            // ディレクトリパスを正規化
            directoryPath = directoryPath.replace(/\\/g, '/');
            
            // ユーザーが選択したフォルダパスを設定に保存
            localStorage.setItem('last_log_directory', directoryPath);
            
            // File System Access APIがサポートされているか
            if (state.supportedFeatures.fileSystemAccess) {
                try {
                    return await listFilesWithFileSystemAccessAPI(directoryPath);
                } catch (fsError) {
                    console.warn('File System Access APIでのアクセスに失敗しました:', fsError);
                    // フォールバック: 別の方法を試す
                }
            }
            
            // 現在のブラウザAPIの制約上、ディレクトリ内のファイル一覧を直接取得することは難しい
            // モックデータを返す
            return {
                success: true,
                message: 'ディレクトリが設定されました。ファイルを個別に選択してください。',
                directory: directoryPath,
                files: []
            };
        } catch (error) {
            logError('getLogFilesInDirectory', error);
            return {
                success: false,
                error: error.message,
                directory: directoryPath
            };
        }
    };

    // File System Access APIを使ったファイル一覧取得
    const listFilesWithFileSystemAccessAPI = async (directoryPath) => {
        try {
            const dirHandle = await window.showDirectoryPicker();
            const entries = [];
            
            // ディレクトリ内のファイルを列挙
            for await (const entry of dirHandle.values()) {
                const isFile = entry.kind === 'file';
                const isDirectory = entry.kind === 'directory';
                
                if (isFile) {
                    // ファイルの場合は拡張子をチェック
                    const fileExtension = getFileExtension(entry.name);
                    const isLogFile = ['html', 'json', 'txt'].includes(fileExtension.toLowerCase());
                    
                    if (isLogFile) {
                        entries.push({
                            name: entry.name,
                            kind: entry.kind,
                            isFile,
                            isDirectory,
                            extension: fileExtension
                        });
                    }
                } else if (isDirectory) {
                    // ディレクトリもリストに追加
                    entries.push({
                        name: entry.name,
                        kind: entry.kind,
                        isFile,
                        isDirectory
                    });
                }
            }
            
            if (window.Config && window.Config.debug) {
                window.Config.debug.log('FileHelper', `ディレクトリ内ファイル取得成功: ${entries.length}件`, {
                    directory: dirHandle.name,
                    fileCount: entries.length
                });
            }
            
            return {
                success: true,
                directory: dirHandle.name,
                entries: entries,
                files: entries.filter(entry => entry.isFile).map(entry => entry.name)
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                // ユーザーがキャンセルした場合
                return {
                    success: false,
                    cancelled: true,
                    error: 'ユーザーがディレクトリ選択をキャンセルしました'
                };
            }
            
            logError('listFilesWithFileSystemAccessAPI', error);
            throw error; // 上位関数でハンドリング
        }
    };

    // ファイルシステムAPIを使ってフォルダを開こうとする試み
    const openDirectory = async () => {
        try {
            if (window.Config && window.Config.debug) {
                window.Config.debug.log('FileHelper', 'ディレクトリ選択開始');
            }
            
            // File System Access APIがサポートされているか確認
            if (state.supportedFeatures.fileSystemAccess) {
                return await listFilesWithFileSystemAccessAPI();
            } else {
                // File System Access APIがサポートされていない場合
                const error = {
                    success: false,
                    error: 'このブラウザはディレクトリ選択をサポートしていません。個別にファイルを選択してください。'
                };
                
                if (window.Config && window.Config.debug) {
                    window.Config.debug.log('FileHelper', 'ディレクトリ選択非対応', error);
                }
                
                return error;
            }
        } catch (error) {
            logError('openDirectory', error);
            console.error('Error opening directory:', error);
            return {
                success: false,
                error: error.message || 'ディレクトリを開けませんでした'
            };
        }
    };

    // パスの正規化（WindowsパスをWebパスに変換）
    const normalizePath = (path) => {
        if (!path) return '';
        
        try {
            // バックスラッシュをスラッシュに変換
            let normalizedPath = path.replace(/\\/g, '/');
            
            // 連続するスラッシュを1つに
            normalizedPath = normalizedPath.replace(/\/+/g, '/');
            
            return normalizedPath;
        } catch (error) {
            logError('normalizePath', error);
            return path; // エラー時は元のパスを返す
        }
    };

    // URLをローカルファイルパスに変換
    const urlToLocalPath = (url) => {
        if (!url) return '';
        
        try {
            // file:///プロトコルを除去
            if (url.startsWith('file:///')) {
                url = url.substring(8);
            }
            
            // URLデコード
            url = decodeURIComponent(url);
            
            // パスを正規化
            return normalizePath(url);
        } catch (error) {
            logError('urlToLocalPath', error);
            return url; // エラー時は元のURLを返す
        }
    };

    // ローカルファイルパスをURLに変換
    const localPathToUrl = (path) => {
        if (!path) return '';
        
        try {
            // パスを正規化
            path = normalizePath(path);
            
            // URLエンコード
            path = encodeURI(path);
            
            // file:///プロトコルを追加
            if (!path.startsWith('file:///')) {
                path = 'file:///' + path;
            }
            
            return path;
        } catch (error) {
            logError('localPathToUrl', error);
            return path; // エラー時は元のパスを返す
        }
    };

    // モジュールの状態を取得
    const getState = () => {
        return { ...state };
    };

    // デバッグ用の自己テスト
    const selfTest = () => {
        const results = [];
        
        try {
            // 初期化チェック
            results.push({
                test: '初期化チェック',
                success: state.initialized,
                details: state.initialized ? 'モジュールは初期化済み' : '初期化されていません'
            });
            
            // 機能サポートチェック
            results.push({
                test: '機能サポートチェック',
                success: state.supportedFeatures.fileReader,
                details: `FileReader: ${state.supportedFeatures.fileReader ? 'サポート' : '非サポート'}`
            });
            
            // パス操作テスト
            const testPaths = [
                'E:\\Desktop\\ClaudeCode\\claude-line\\example.json',
                '/var/www/html/claude-line/log.txt',
                'C:/Users/username/Documents/chat.html'
            ];
            
            testPaths.forEach(path => {
                const filename = getFilenameFromPath(path);
                const extension = getFileExtension(filename);
                const directory = getDirectoryPath(path);
                const normalizedPath = normalizePath(path);
                
                results.push({
                    test: `パス操作: ${path}`,
                    success: filename && directory,
                    details: {
                        filename,
                        extension,
                        directory,
                        normalizedPath
                    }
                });
            });
            
            // URLパス変換テスト
            const testUrl = 'file:///E:/Desktop/ClaudeCode/claude-line/example.json';
            const localPath = urlToLocalPath(testUrl);
            const backToUrl = localPathToUrl(localPath);
            
            results.push({
                test: 'URLパス変換テスト',
                success: localPath === 'E:/Desktop/ClaudeCode/claude-line/example.json',
                details: {
                    originalUrl: testUrl,
                    localPath,
                    backToUrl
                }
            });
            
            // テスト結果集計
            const passedTests = results.filter(r => r.success).length;
            const totalTests = results.length;
            
            if (window.Config && window.Config.debug) {
                window.Config.debug.log('FileHelper', `セルフテスト完了: ${passedTests}/${totalTests}成功`, results);
            }
            
            return {
                success: passedTests === totalTests,
                passed: passedTests,
                total: totalTests,
                results
            };
        } catch (error) {
            logError('selfTest', error);
            
            return {
                success: false,
                error: error.message,
                results
            };
        }
    };

    // モジュール初期化
    init();

    // 公開API
    return {
        readFileAsync,
        getFilenameFromPath,
        getFileExtension,
        getDirectoryPath,
        loadClaudeLogFile,
        getLogFilesInDirectory,
        openDirectory,
        normalizePath,
        urlToLocalPath,
        localPathToUrl,
        // デバッグ用
        getState,
        selfTest
    };
})();

// グローバルに公開
window.FileHelper = FileHelper;
