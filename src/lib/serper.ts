export async function performWebSearch(query: string): Promise<string> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
        return '(Web検索は現在利用できません。SERPER_API_KEYが設定されていません。)';
    }

    try {
        const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: query,
                gl: 'jp',
                hl: 'ja',
                num: 5,
            }),
        });

        if (!response.ok) {
            return `(検索エラー: ${response.status})`;
        }

        const data = await response.json();
        const results = data.organic || [];

        if (results.length === 0) {
            return '(検索結果が見つかりませんでした)';
        }

        let searchSummary = `【Web検索結果: "${query}"】\n\n`;
        for (const result of results.slice(0, 5)) {
            searchSummary += `📌 ${result.title}\n${result.snippet}\nURL: ${result.link}\n\n`;
        }

        if (data.knowledgeGraph) {
            const kg = data.knowledgeGraph;
            searchSummary += `\n📋 ナレッジグラフ: ${kg.title || ''}\n${kg.description || ''}\n`;
        }

        return searchSummary;
    } catch (error) {
        return `(検索中にエラーが発生しました: ${error})`;
    }
}
