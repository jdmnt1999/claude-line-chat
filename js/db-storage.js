/**
 * db-storage.js
 * IndexedDBを使用したデータストレージを提供するモジュール
 */

const DBStorageModule = (() => {
    // データベース設定
    let db = null;
    let dbName = 'claude-line-chat';
    let dbVersion = 1;
    let stores = {
        conversations: 'id,title,date',
        messages: 'id,conversationId,timestamp,type'
    };

    // データベースを初期化
    const initDB = () => {
        return new Promise((resolve, reject) => {
            // LocalStorageから設定を取得
            try {
                const config = Config.getConfig('database');
                if (config) {
                    dbName = config.name || dbName;
                    dbVersion = config.version || dbVersion;
                    stores = config.stores || stores;
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
                        const keyPath = stores[storeName].split(',')[0];
                        db.createObjectStore(storeName, { keyPath });
                        console.log(`オブジェクトストア '${storeName}' を作成しました`);
                    }
                }
            };

            // 成功時
            request.onsuccess = (event) => {
                db = event.target.result;
                console.log('データベースが正常に開かれました');
                resolve(db);
            };

            // エラー時
            request.onerror = (event) => {
                console.error('Error opening database:', event);
                reject(new Error('Could not open database'));
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

    // ストア内の全データを削除
    const clearStore = (storeName) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('データベースが初期化されていません'));
                return;
            }

            try {
                const transaction = db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();

                request.onsuccess = () => {
                    resolve(true);
                };

                request.onerror = (event) => {
                    console.error('ストアクリアエラー:', event);
                    reject(new Error('ストアをクリアできませんでした'));
                };
            } catch (error) {
                console.error('トランザクション作成エラー:', error);
                reject(error);
            }
        });
    };

    // 指定したフィールドと値でデータを検索
    const findByField = (storeName, fieldName, fieldValue) => {
        return new Promise((resolve, reject) => {
            if (!db) {
                reject(new Error('データベースが初期化されていません'));
                return;
            }

            getAllData(storeName)
                .then(items => {
                    const results = items.filter(item => item[fieldName] === fieldValue);
                    resolve(results);
                })
                .catch(error => {
                    console.error('検索エラー:', error);
                    reject(error);
                });
        });
    };

    // データベースを閉じる
    const closeDB = () => {
        if (db) {
            db.close();
            db = null;
            console.log('データベースを閉じました');
            return true;
        }
        return false;
    };

    // データベースを削除
    const deleteDB = () => {
        return new Promise((resolve, reject) => {
            closeDB();
            
            const request = indexedDB.deleteDatabase(dbName);
            
            request.onsuccess = () => {
                console.log('データベースを削除しました');
                resolve(true);
            };
            
            request.onerror = (event) => {
                console.error('データベース削除エラー:', event);
                reject(new Error('データベースを削除できませんでした'));
            };
        });
    };

    // 会話を保存
    const saveConversation = (conversation) => {
        // IDが未指定の場合は新規作成
        if (!conversation.id) {
            conversation.id = generateUniqueId();
        }
        
        // 日付が未指定の場合は現在時刻を設定
        if (!conversation.date) {
            conversation.date = new Date().toISOString();
        }
        
        return saveData('conversations', conversation);
    };

    // 会話を取得
    const getConversation = (id) => {
        return getData('conversations', id);
    };

    // 全会話を取得
    const getAllConversations = () => {
        return getAllData('conversations');
    };

    // 会話を削除
    const deleteConversation = (id) => {
        // 会話を削除
        return deleteData('conversations', id)
            .then(() => {
                // 関連するメッセージも削除
                return findByField('messages', 'conversationId', id);
            })
            .then((messages) => {
                const deletePromises = messages.map(message => deleteData('messages', message.id));
                return Promise.all(deletePromises);
            });
    };

    // メッセージを保存
    const saveMessage = (message) => {
        // IDが未指定の場合は新規作成
        if (!message.id) {
            message.id = generateUniqueId();
        }
        
        // タイムスタンプが未指定の場合は現在時刻を設定
        if (!message.timestamp) {
            message.timestamp = new Date().toISOString();
        }
        
        return saveData('messages', message);
    };

    // メッセージを取得
    const getMessage = (id) => {
        return getData('messages', id);
    };

    // 会話に属するメッセージを取得
    const getMessagesByConversation = (conversationId) => {
        return findByField('messages', 'conversationId', conversationId);
    };

    // ユニークIDを生成
    const generateUniqueId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    };

    // 会話とメッセージをエクスポート
    const exportConversation = async (conversationId) => {
        try {
            // 会話を取得
            const conversation = await getConversation(conversationId);
            if (!conversation) {
                throw new Error('会話が見つかりません');
            }
            
            // 会話に属するメッセージを取得
            const messages = await getMessagesByConversation(conversationId);
            
            // エクスポートデータを作成
            const exportData = {
                conversation,
                messages
            };
            
            return exportData;
        } catch (error) {
            console.error('会話のエクスポート中にエラーが発生しました:', error);
            throw error;
        }
    };

    // 会話とメッセージをインポート
    const importConversation = async (exportData) => {
        try {
            // インポートデータを検証
            if (!exportData || !exportData.conversation || !exportData.messages) {
                throw new Error('無効なインポートデータです');
            }
            
            // 会話を保存
            await saveConversation(exportData.conversation);
            
            // メッセージを保存
            const savePromises = exportData.messages.map(message => saveMessage(message));
            await Promise.all(savePromises);
            
            return exportData.conversation.id;
        } catch (error) {
            console.error('会話のインポート中にエラーが発生しました:', error);
            throw error;
        }
    };

    // すべての会話とメッセージをエクスポート
    const exportAllData = async () => {
        try {
            // すべての会話を取得
            const conversations = await getAllConversations();
            
            // すべてのメッセージを取得
            const messages = await getAllData('messages');
            
            // エクスポートデータを作成
            const exportData = {
                conversations,
                messages,
                version: dbVersion,
                date: new Date().toISOString()
            };
            
            return exportData;
        } catch (error) {
            console.error('データのエクスポート中にエラーが発生しました:', error);
            throw error;
        }
    };

    // エクスポートしたデータをインポート
    const importAllData = async (exportData, clearExisting = false) => {
        try {
            // インポートデータを検証
            if (!exportData || !exportData.conversations || !exportData.messages) {
                throw new Error('無効なインポートデータです');
            }
            
            // 既存のデータをクリアする場合
            if (clearExisting) {
                await clearStore('conversations');
                await clearStore('messages');
            }
            
            // 会話を保存
            const conversationPromises = exportData.conversations.map(conversation => saveConversation(conversation));
            await Promise.all(conversationPromises);
            
            // メッセージを保存
            const messagePromises = exportData.messages.map(message => saveMessage(message));
            await Promise.all(messagePromises);
            
            return true;
        } catch (error) {
            console.error('データのインポート中にエラーが発生しました:', error);
            throw error;
        }
    };

    // 公開API
    return {
        initDB,
        saveData,
        getData,
        getAllData,
        deleteData,
        clearStore,
        findByField,
        closeDB,
        deleteDB,
        saveConversation,
        getConversation,
        getAllConversations,
        deleteConversation,
        saveMessage,
        getMessage,
        getMessagesByConversation,
        exportConversation,
        importConversation,
        exportAllData,
        importAllData
    };
})();

// 初期化
try {
    DBStorageModule.initDB()
        .then(() => console.log('DBStorageModuleが正常に初期化されました'))
        .catch(error => console.error('DBStorageModuleの初期化中にエラーが発生しました:', error));
} catch (error) {
    console.error('DBStorageModuleの初期化中に例外が発生しました:', error);
}

// グローバルに公開
window.DBStorage = DBStorageModule;
