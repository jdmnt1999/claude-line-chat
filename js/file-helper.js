/**
 * file-helper.js
 * ファイル操作に関するユーティリティ関数を提供するモジュール
 */

const FileHelper = (() => {
    // 非同期でファイルを読み込む関数
    const readFileAsync = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    // ファイルパスからファイル名のみを取得
    const getFilenameFromPath = (path) => {
        if (!path) return '';
        return path.split('\\').pop().split('/').pop();
    };

    // ファイルの拡張子を取得
    const getFileExtension = (filename) => {
        return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);
    };

    // ディレクトリパスを取得
    const getDirectoryPath = (path) => {
        if (!path) return '';
        const parts = path.split(/[/\\]/);
        parts.pop(); // ファイル名を削除
        return parts.join('/');
    };

    // Clauseログファイルを読み込む
    const loadClaudeLogFile = async (filePath) => {
        try {
            console.log(`Loading Claude log file from: ${filePath}`);
            
            // ファイルシステムにアクセスするAPIがないため、
            // ユーザーがファイルを選択するUIを利用
            const fileInput = document.getElementById('log-file-input');
            
            // ファイル選択を待つ
            return new Promise((resolve) => {
                // イベントリスナーの設定
                const handleFileSelect = async (event) => {
                    const files = event.target.files;
                    if (files.length === 0) {
                        resolve({
                            success: false,
                            error: 'No file selected'
                        });
                        return;
                    }

                    const file = files[0];
                    try {
                        const content = await readFileAsync(file);
                        resolve({
                            success: true,
                            filename: file.name,
                            path: filePath,
                            content: content
                        });
                    } catch (error) {
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
                fileInput.click(); // ファイル選択ダイアログを開く
            });
        } catch (error) {
            console.error('Error loading Claude log file:', error);
            return {
                success: false,
                error: error.message
            };
        }
    };

    // ディレクトリ内のログファイルリストを取得
    const getLogFilesInDirectory = async (directoryPath) => {
        // ブラウザからのファイルシステムへの直接アクセスは制限があるため、
        // ユーザーにファイル選択を促す
        console.log(`Attempting to list files in: ${directoryPath}`);
        
        // ユーザーが選択したフォルダパスを設定に保存
        localStorage.setItem('last_log_directory', directoryPath);
        
        // 現在のブラウザAPIの制約上、ディレクトリ内のファイル一覧を直接取得することは難しい
        // ユーザーがファイルを選択するUIを使用
        return {
            success: true,
            message: 'ディレクトリが設定されました。ファイルを個別に選択してください。',
            directory: directoryPath
        };
    };

    // ファイルシステムAPIを使ってフォルダを開こうとする試み
    // 注: これはブラウザによってサポートが異なる
    const openDirectory = async () => {
        try {
            // File System Access APIがサポートされているか確認
            if ('showDirectoryPicker' in window) {
                const dirHandle = await window.showDirectoryPicker();
                const entries = [];
                
                // ディレクトリ内のファイルを列挙
                for await (const entry of dirHandle.values()) {
                    entries.push({
                        name: entry.name,
                        kind: entry.kind,
                        isFile: entry.kind === 'file',
                        isDirectory: entry.kind === 'directory'
                    });
                }
                
                return {
                    success: true,
                    directory: dirHandle.name,
                    entries: entries
                };
            } else {
                // File System Access APIがサポートされていない場合
                return {
                    success: false,
                    error: 'このブラウザはディレクトリ選択をサポートしていません。個別にファイルを選択してください。'
                };
            }
        } catch (error) {
            console.error('Error opening directory:', error);
            return {
                success: false,
                error: error.message || 'ディレクトリを開けませんでした'
            };
        }
    };

    return {
        readFileAsync,
        getFilenameFromPath,
        getFileExtension,
        getDirectoryPath,
        loadClaudeLogFile,
        getLogFilesInDirectory,
        openDirectory
    };
})();

// グローバルに公開
window.FileHelper = FileHelper;
