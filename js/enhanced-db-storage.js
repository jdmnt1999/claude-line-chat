/**
 * enhanced-db-storage.js
 * 基本的なデータベースストレージ機能を拡張するモジュール
 * Claude会話ログに特化した保存・検索機能を提供する
 */

const EnhancedDBStorage = (() => {
    // データベース設定
    let db = null;
    let dbName = 'claude-line-chat-enhanced';
    let dbVersion = 1;
    let stores = {
        conversations: 'id,title,date,source',
        messages: 'id,conversationId,timestamp,type',
        claudeLogs: 'id,path,filename,timestamp,conversationId',
        settings: 'id'
    };

    // データベースを初期化
    const initDB = () => {
        return new Promise((resolve, reject) => {
            console.log('IndexedDBデータベースを初期化しています...');
            
            // LocalStorageから設定を取得
            try {
                const config = Config.getConfig('database');
                if (config) {
                    dbName = config.name ? config.name + '-enhanced' : dbName;
                    dbVersion = config.version || dbVersion;
                }
            } catch (error) {
                console.warn('データベース設定の読み込みに失敗しました。デフォルト設定を使用します。', error);
            }

            // データベースを開く
            const request = indexedDB.open(dbName, dbVersion);

            // データベースが存在しない場合や更新が必要な場合
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 必要なオブジェクトストアを作成
                for (const storeName in stores) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const keyPathStr = stores[storeName];
                        const keyPath = keyPathStr.split(',')[0];
                        
                        const store = db.createObjectStore(storeName, { keyPath });
                        
                        // インデックスを作成
                        const indexFields = keyPathStr.split(',').slice(1);
                        indexFields.forEach(field => {
                            if (field && field.trim()) {
                                store.createIndex(field, field, { unique: false });
                            }
                        });
                        
                        console.log(`強化版オブジェクトストア '${storeName}' を作成しました`);
                    }
                }
            };

            // 成功時
            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('データベースが正常に初期化されました');
                resolve(db);
            };

            // エラー時
            request.onerror = (event) => {
                console.error('EnhancedDBStorage: データベース初期化エラー:', event);
                reject(new Error('強化版データベースを開けませんでした'));
            };
        });
    };

    // データを保存
    const saveData = (storeName, data) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('データベースが初期化されていません'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.put(data);

                request.onsuccess = () => {
                    resolve(request.result);
                };

                request.onerror = (event) => {
                    console.error('データ保存エラー:', event);
                    reject(new Error('データを保存できませんでした'));
                };
            } catch (error) {
                console.error('トランザクション作成エラー:', error);
                reject(error);
            }
        });
    };

    // データを取得
    const getData = (storeName, key) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('データベースが初期化されていません'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(key);

                request.onsuccess = () => {
                    resolve(request.result);
                };

                request.onerror = (event) => {
                    console.error('データ取得エラー:', event);
                    reject(new Error('データを取得できませんでした'));
                };
            } catch (error) {
                console.error('トランザクション作成エラー:', error);
                reject(error);
            }
        });
    };

    // 全データを取得
    const getAllData = (storeName) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('データベースが初期化されていません'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = () => {
                    resolve(request.result);
                };

                request.onerror = (event) => {
                    console.error('全データ取得エラー:', event);
                    reject(new Error('データを取得できませんでした'));
                };
            } catch (error) {
                console.error('トランザクション作成エラー:', error);
                reject(error);
            }
        });
    };

    // インデックスによるデータ検索
    const getDataByIndex = (storeName, indexName, value) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('データベースが初期化されていません'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const index = store.index(indexName);
                const request = index.getAll(value);

                request.onsuccess = () => {
                    resolve(request.result);
                };

                request.onerror = (event) => {
                    console.error('インデックス検索エラー:', event);
                    reject(new Error('データを検索できませんでした'));
                };
            } catch (error) {
                console.error('インデックス検索エラー:', error);
                reject(error);
            }
        });
    };

    // データを削除
    const deleteData = (storeName, key) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('データベースが初期化されていません'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.delete(key);

                request.onsuccess = () => {
                    resolve(true);
                };

                request.onerror = (event) => {
                    console.error('データ削除エラー:', event);
                    reject(new Error('データを削除できませんでした'));
                };
            } catch (error) {
                console.error('トランザクション作成エラー:', error);
                reject(error);
            }
        });
    };

    // Claudeログファイルを保存
    const saveClaudeLog = async (logData) => {
        if (!logData.id) {
            logData.id = generateUniqueId();
        }
        
        if (!logData.timestamp) {
            logData.timestamp = new Date().toISOString();
        }
        
        return saveData('claudeLogs', logData);
    };

    // Claudeログファイルを取得
    const getClaudeLog = (id) => {
        return getData('claudeLogs', id);
    };

    // すべてのClaudeログファイルを取得
    const getAllClaudeLogs = () => {
        return getAllData('claudeLogs');
    };

    // パスによるClaudeログファイルの検索
    const getClaudeLogByPath = (path) => {
        return new Promise((resolve, reject) => {
            getAllClaudeLogs()
                .then(logs => {
                    const log = logs.find(log => log.path === path);
                    resolve(log || null);
                })
                .catch(error => {
                    console.error('パスによるログファイル検索エラー:', error);
                    reject(error);
                });
        });
    };

    // Claudeログファイルを削除
    const deleteClaudeLog = (id) => {
        return deleteData('claudeLogs', id);
    };

    // Claudeログを会話としてインポート
    const importClaudeLogAsConversation = async (logData, content) => {
        try {
            // パーサーモジュールを使用してログを解析
            const parsedData = window.LogParser.parseClaudeLog(content);
            
            if (!parsedData || !parsedData.conversation || !parsedData.messages || parsedData.messages.length === 0) {
                throw new Error('ログの解析に失敗しました');
            }
            
            // 会話データを作成
            const conversation = {
                id: generateUniqueId(),
                title: logData.filename || 'インポートされた会話',
                date: new Date().toISOString(),
                source: {
                    type: 'claude-log',
                    logId: logData.id,
                    path: logData.path,
                    filename: logData.filename
                }
            };
            
            // 会話を保存
            await saveData('conversations', conversation);
            
            // メッセージを保存
            const messages = parsedData.messages.map(msg => ({
                ...msg,
                id: generateUniqueId(),
                conversationId: conversation.id
            }));
            
            for (const message of messages) {
                await saveData('messages', message);
            }
            
            // ログファイルのデータを更新
            logData.conversationId = conversation.id;
            await saveClaudeLog(logData);
            
            return {
                success: true,
                conversationId: conversation.id,
                messageCount: messages.length
            };
        } catch (error) {
            console.error('Claudeログの会話としてのインポート中にエラーが発生しました:', error);
            throw error;
        }
    };

    // 設定を保存
    const saveSetting = (key, value) => {
        return saveData('settings', { id: key, value });
    };

    // 設定を取得
    const getSetting = async (key) => {
        try {
            const setting = await getData('settings', key);
            return setting ? setting.value : null;
        } catch (error) {
            console.error('設定の取得中にエラーが発生しました:', error);
            return null;
        }
    };

    // すべての設定を取得
    const getAllSettings = async () => {
        try {
            const settings = await getAllData('settings');
            return settings.reduce((obj, setting) => {
                obj[setting.id] = setting.value;
                return obj;
            }, {});
        } catch (error) {
            console.error('すべての設定の取得中にエラーが発生しました:', error);
            return {};
        }
    };

    // 会話検索機能（テキスト全文検索）
    const searchConversations = async (searchText) => {
        try {
            if (!searchText || searchText.trim() === '') {
                return [];
            }
            
            // 検索テキストを小文字に変換
            const searchLower = searchText.toLowerCase();
            
            // すべての会話を取得
            const conversations = await getAllData('conversations');
            
            // 会話のタイトルで検索
            const titleMatches = conversations.filter(conv => 
                conv.title && conv.title.toLowerCase().includes(searchLower)
            );
            
            // すべてのメッセージを取得
            const messages = await getAllData('messages');
            
            // メッセージの内容で検索
            const contentMatches = messages.filter(msg => 
                msg.content && msg.content.toLowerCase().includes(searchLower)
            );
            
            // メッセージから対応する会話IDを抽出
            const matchedConvIds = [...new Set(contentMatches.map(msg => msg.conversationId))];
            
            // メッセージ内容から見つかった会話を取得
            const contentMatchConversations = conversations.filter(conv => 
                matchedConvIds.includes(conv.id)
            );
            
            // タイトル一致と内容一致の結果をマージして重複を排除
            const allMatches = [...titleMatches];
            
            contentMatchConversations.forEach(conv => {
                if (!allMatches.some(c => c.id === conv.id)) {
                    allMatches.push(conv);
                }
            });
            
            // 日付の新しい順にソート
            allMatches.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            return allMatches;
        } catch (error) {
            console.error('会話検索中にエラーが発生しました:', error);
            throw error;
        }
    };

    // 会話をバックアップ
    const backupConversation = async (conversationId) => {
        try {
            // 会話を取得
            const conversation = await getData('conversations', conversationId);
            if (!conversation) {
                throw new Error('会話が見つかりません');
            }
            
            // 会話に属するメッセージを取得
            const messages = await getDataByIndex('messages', 'conversationId', conversationId);
            
            // バックアップデータを作成
            const backupData = {
                conversation,
                messages,
                backupDate: new Date().toISOString(),
                version: 1
            };
            
            return backupData;
        } catch (error) {
            console.error('会話のバックアップ中にエラーが発生しました:', error);
            throw error;
        }
    };

    // バックアップから会話を復元
    const restoreConversation = async (backupData) => {
        try {
            // バックアップデータを検証
            if (!backupData || !backupData.conversation || !backupData.messages) {
                throw new Error('無効なバックアップデータです');
            }
            
            // 復元用に会話IDを新しく生成
            const oldConversationId = backupData.conversation.id;
            const newConversationId = generateUniqueId();
            
            // 会話データを更新
            const conversation = {
                ...backupData.conversation,
                id: newConversationId,
                title: `${backupData.conversation.title} (復元)`,
                date: new Date().toISOString()
            };
            
            // 会話を保存
            await saveData('conversations', conversation);
            
            // メッセージを更新して保存
            for (const oldMessage of backupData.messages) {
                const message = {
                    ...oldMessage,
                    id: generateUniqueId(),
                    conversationId: newConversationId
                };
                
                await saveData('messages', message);
            }
            
            return {
                success: true,
                oldConversationId,
                newConversationId,
                messageCount: backupData.messages.length
            };
        } catch (error) {
            console.error('会話の復元中にエラーが発生しました:', error);
            throw error;
        }
    };

    // ユニークIDを生成
    const generateUniqueId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    };

    // 公開API
    return {
        initDB,
        saveData,
        getData,
        getAllData,
        getDataByIndex,
        deleteData,
        saveClaudeLog,
        getClaudeLog,
        getAllClaudeLogs,
        getClaudeLogByPath,
        deleteClaudeLog,
        importClaudeLogAsConversation,
        saveSetting,
        getSetting,
        getAllSettings,
        searchConversations,
        backupConversation,
        restoreConversation
    };
})();

// 初期化
try {
    EnhancedDBStorage.initDB()
        .then(() => console.log('EnhancedDBStorageが正常に初期化されました'))
        .catch(error => console.error('EnhancedDBStorageの初期化中にエラーが発生しました:', error));
} catch (error) {
    console.error('EnhancedDBStorageの初期化中に例外が発生しました:', error);
}

// グローバルに公開
window.EnhancedDBStorage = EnhancedDBStorage;
