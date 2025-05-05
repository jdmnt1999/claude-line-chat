/**
 * parser.js
 * Claude会話ログを解析するためのモジュール
 */

const LogParser = (() => {
    // ClaudeのHTMLログを解析
    const parseClaudeLog = (content) => {
        try {
            console.log('Claudeログの解析を開始します...');
            
            if (!content) {
                throw new Error('ログの内容が空です');
            }
            
            const parser = new DOMParser();
            let doc;
            
            // HTMLかテキストかを判断
            if (content.trim().startsWith('<!DOCTYPE html>') || content.trim().startsWith('<html>')) {
                doc = parser.parseFromString(content, 'text/html');
            } else {
                // テキスト形式の場合はHTMLに変換
                const htmlContent = `<html><body><pre>${escapeHtml(content)}</pre></body></html>`;
                doc = parser.parseFromString(htmlContent, 'text/html');
            }
            
            // メッセージ要素を取得
            const conversation = {
                title: extractTitle(doc),
                date: extractDate(doc)
            };
            
            // メッセージを抽出
            const messages = extractMessages(doc);
            
            return {
                conversation,
                messages
            };
        } catch (error) {
            console.error('ログの解析中にエラーが発生しました:', error);
            return null;
        }
    };
    
    // Claudeの会話JSONを解析
    const parseClaudeJson = (content) => {
        try {
            console.log('Claude JSONの解析を開始します...');
            
            if (!content) {
                throw new Error('JSONの内容が空です');
            }
            
            // JSONを解析
            let jsonData;
            if (typeof content === 'string') {
                jsonData = JSON.parse(content);
            } else {
                jsonData = content;
            }
            
            if (!jsonData || !Array.isArray(jsonData.messages)) {
                throw new Error('無効なJSON形式です');
            }
            
            // 会話情報を抽出
            const conversation = {
                title: jsonData.title || '会話のタイトル',
                date: jsonData.created_at || new Date().toISOString()
            };
            
            // メッセージを形式に変換
            const messages = jsonData.messages.map(msg => ({
                id: msg.id || generateUniqueId(),
                content: msg.content || '',
                role: msg.role === 'assistant' ? 'claude' : 'user',
                type: 'text',
                timestamp: msg.created_at || new Date().toISOString()
            }));
            
            return {
                conversation,
                messages
            };
        } catch (error) {
            console.error('JSONの解析中にエラーが発生しました:', error);
            return null;
        }
    };
    
    // LINEの会話ログを解析
    const parseLineLog = (content) => {
        try {
            console.log('LINEログの解析を開始します...');
            
            if (!content) {
                throw new Error('ログの内容が空です');
            }
            
            // LINE形式のログを行ごとに分割
            const lines = content.split('\n');
            const messages = [];
            let currentMessage = null;
            let currentDate = '';
            
            // 正規表現パターン
            const datePattern = /^(\d{4}\/\d{1,2}\/\d{1,2})\(\w+\)$/;
            const messagePattern = /^(\d{1,2}:\d{1,2})\t(.+?)\t(.*)$/;
            
            for (const line of lines) {
                // 日付行の場合
                const dateMatch = line.match(datePattern);
                if (dateMatch) {
                    currentDate = dateMatch[1];
                    continue;
                }
                
                // メッセージ行の場合
                const messageMatch = line.match(messagePattern);
                if (messageMatch) {
                    const [, time, sender, content] = messageMatch;
                    
                    // 前のメッセージがあれば保存
                    if (currentMessage) {
                        messages.push(currentMessage);
                    }
                    
                    // 新しいメッセージを作成
                    currentMessage = {
                        id: generateUniqueId(),
                        content: content,
                        role: sender === 'Claude' ? 'claude' : 'user',
                        type: 'text',
                        timestamp: parseDateTime(`${currentDate} ${time}`)
                    };
                } else if (line.trim() && currentMessage) {
                    // 続きの行はコンテンツに追加
                    currentMessage.content += '\n' + line;
                }
            }
            
            // 最後のメッセージを追加
            if (currentMessage) {
                messages.push(currentMessage);
            }
            
            // 会話情報を作成
            const conversation = {
                title: `LINE会話 ${currentDate}`,
                date: currentDate ? parseDateTime(currentDate) : new Date().toISOString()
            };
            
            return {
                conversation,
                messages
            };
        } catch (error) {
            console.error('LINEログの解析中にエラーが発生しました:', error);
            return null;
        }
    };
    
    // タイトルを抽出
    const extractTitle = (doc) => {
        // タイトル要素を探す
        const titleElement = doc.querySelector('title');
        if (titleElement && titleElement.textContent) {
            return titleElement.textContent.trim();
        }
        
        // h1またはヘッダー要素を探す
        const headers = doc.querySelectorAll('h1, header');
        for (const header of headers) {
            if (header.textContent) {
                return header.textContent.trim();
            }
        }
        
        return 'インポートされた会話';
    };
    
    // 日付を抽出
    const extractDate = (doc) => {
        // 日付要素を探す (メタデータやタイムスタンプなど)
        const dateElements = doc.querySelectorAll('time, .date, .timestamp, meta[name="date"]');
        for (const element of dateElements) {
            let dateStr = element.getAttribute('datetime') || element.getAttribute('content') || element.textContent;
            if (dateStr) {
                try {
                    return new Date(dateStr.trim()).toISOString();
                } catch (e) {
                    console.warn('日付の解析に失敗しました:', dateStr);
                }
            }
        }
        
        return new Date().toISOString();
    };
    
    // メッセージを抽出
    const extractMessages = (doc) => {
        const messages = [];
        
        // メッセージ要素のセレクタ (ClaudeのUIに合わせて調整)
        const selectors = [
            '.message', '.chat-message', '.conversation-message',
            '.human-message', '.assistant-message',
            '.user-message', '.claude-message',
            '.human, .assistant'
        ];
        
        // セレクタを試す
        let messageElements = [];
        for (const selector of selectors) {
            const elements = doc.querySelectorAll(selector);
            if (elements.length > 0) {
                messageElements = Array.from(elements);
                break;
            }
        }
        
        // メッセージ要素が見つからない場合は別のアプローチを試す
        if (messageElements.length === 0) {
            // パターンマッチングを使用
            const htmlContent = doc.body.innerHTML;
            const userPattern = /<div[^>]*>(Human|User):\s*(.*?)<\/div>\s*<div[^>]*>(Claude|Assistant):/gs;
            const claudePattern = /<div[^>]*>(Claude|Assistant):\s*(.*?)<\/div>\s*(<div[^>]*>(Human|User):|$)/gs;
            
            let match;
            let lastIndex = 0;
            
            // ユーザーメッセージを抽出
            while ((match = userPattern.exec(htmlContent)) !== null) {
                messages.push({
                    id: generateUniqueId(),
                    content: cleanMessageContent(match[2]),
                    role: 'user',
                    type: 'text',
                    timestamp: new Date().toISOString()
                });
                lastIndex = match.index + match[0].length;
            }
            
            // Claudeメッセージを抽出
            userPattern.lastIndex = 0;
            while ((match = claudePattern.exec(htmlContent)) !== null) {
                messages.push({
                    id: generateUniqueId(),
                    content: cleanMessageContent(match[2]),
                    role: 'claude',
                    type: 'text',
                    timestamp: new Date().toISOString()
                });
            }
            
            // メッセージを時系列に並べ替え
            messages.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
            
            return messages;
        }
        
        // 各メッセージ要素を処理
        for (const element of messageElements) {
            // 役割を判定 (ユーザーかClaude)
            const role = determineMessageRole(element);
            
            // コンテンツを抽出
            const content = extractMessageContent(element);
            
            // タイムスタンプを抽出 (存在する場合)
            const timestamp = extractMessageTimestamp(element);
            
            messages.push({
                id: generateUniqueId(),
                content,
                role,
                type: 'text',
                timestamp
            });
        }
        
        return messages;
    };
    
    // メッセージの役割を判定
    const determineMessageRole = (element) => {
        const classNames = element.className.toLowerCase();
        const innerHTML = element.innerHTML.toLowerCase();
        
        if (
            classNames.includes('human') || 
            classNames.includes('user') || 
            innerHTML.includes('human:') || 
            innerHTML.includes('user:')
        ) {
            return 'user';
        } else {
            return 'claude';
        }
    };
    
    // メッセージの内容を抽出
    const extractMessageContent = (element) => {
        // マークダウンやコードブロックを含むかもしれないため、HTML全体を保持
        let content = element.innerHTML;
        
        // 役割ラベル (「Human:」や「Claude:」など) を削除
        content = content.replace(/<[^>]*>(Human|User|Claude|Assistant):\s*<\/[^>]*>/gi, '');
        content = content.replace(/(Human|User|Claude|Assistant):\s*/gi, '');
        
        // HTMLをクリーンアップ
        content = cleanMessageContent(content);
        
        return content;
    };
    
    // メッセージのタイムスタンプを抽出
    const extractMessageTimestamp = (element) => {
        // タイムスタンプ要素を探す
        const timeElement = element.querySelector('time, .timestamp, .date');
        if (timeElement) {
            const dateStr = timeElement.getAttribute('datetime') || timeElement.textContent;
            if (dateStr) {
                try {
                    return new Date(dateStr.trim()).toISOString();
                } catch (e) {
                    console.warn('タイムスタンプの解析に失敗しました:', dateStr);
                }
            }
        }
        
        return new Date().toISOString();
    };
    
    // メッセージ内容をクリーンアップ
    const cleanMessageContent = (content) => {
        if (!content) return '';
        
        // 不要なHTMLタグを削除
        content = content.replace(/<div[^>]*class="[^"]*timestamp[^"]*"[^>]*>.*?<\/div>/g, '');
        
        // コードブロックは保持
        let codeTags = [];
        let index = 0;
        content = content.replace(/<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/g, (match, codeContent) => {
            codeTags.push(codeContent);
            return `__CODE_BLOCK_${index++}__`;
        });
        
        // HTMLタグを削除
        content = content.replace(/<[^>]*>/g, '');
        
        // HTMLエンティティをデコード
        content = decodeHtmlEntities(content);
        
        // コードブロックを復元
        for (let i = 0; i < codeTags.length; i++) {
            content = content.replace(`__CODE_BLOCK_${i}__`, `\n\`\`\`\n${codeTags[i]}\n\`\`\`\n`);
        }
        
        return content.trim();
    };
    
    // HTMLエスケープ
    const escapeHtml = (text) => {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };
    
    // HTMLエンティティをデコード
    const decodeHtmlEntities = (text) => {
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        return textarea.value;
    };
    
    // 日時文字列をISOフォーマットに変換
    const parseDateTime = (dateTimeStr) => {
        try {
            return new Date(dateTimeStr).toISOString();
        } catch (e) {
            console.warn('日時の解析に失敗しました:', dateTimeStr);
            return new Date().toISOString();
        }
    };
    
    // ユニークIDを生成
    const generateUniqueId = () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    };
    
    // 公開API
    return {
        parseClaudeLog,
        parseClaudeJson,
        parseLineLog
    };
})();

// グローバルに公開
window.LogParser = LogParser;
