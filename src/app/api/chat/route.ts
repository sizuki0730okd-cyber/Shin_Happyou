import { NextRequest } from 'next/server';
import { SYSTEM_PROMPT, MODEL_ID, SEARCH_TOOL } from '@/lib/constants';

export const runtime = 'edge';

async function performWebSearch(query: string): Promise<string> {
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

export async function POST(request: NextRequest) {
    try {
        const { messages } = await request.json();
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'OPENROUTER_API_KEY が設定されていません。.env.local ファイルを確認してください。' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const systemMessage = { role: 'system', content: SYSTEM_PROMPT };
        const conversationMessages = [systemMessage, ...messages.slice(-40)];

        // First call: check if tool use is needed
        const initialResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://shin-kun.vercel.app',
                'X-Title': 'Shin-kun',
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: conversationMessages,
                tools: [SEARCH_TOOL],
                tool_choice: 'auto',
                temperature: 0.7,
                top_p: 0.9,
                max_tokens: 4096,
            }),
        });

        if (!initialResponse.ok) {
            const errorText = await initialResponse.text();
            return new Response(
                JSON.stringify({ error: `OpenRouter API エラー: ${initialResponse.status} - ${errorText}` }),
                { status: initialResponse.status, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const initialData = await initialResponse.json();
        const choice = initialData.choices?.[0];

        if (!choice) {
            return new Response(
                JSON.stringify({ error: 'レスポンスが空です' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Check if the model wants to use a tool
        if (choice.message?.tool_calls && choice.message.tool_calls.length > 0) {
            const toolCall = choice.message.tool_calls[0];

            if (toolCall.function.name === 'web_search') {
                const args = JSON.parse(toolCall.function.arguments);
                const searchQuery = args.query;

                // Perform web search
                const searchResults = await performWebSearch(searchQuery);

                // Build messages with tool results
                const messagesWithTools = [
                    ...conversationMessages,
                    choice.message,
                    {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: searchResults,
                    },
                ];

                // Stream the final response
                const finalResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://shin-kun.vercel.app',
                        'X-Title': 'Shin-kun',
                    },
                    body: JSON.stringify({
                        model: MODEL_ID,
                        messages: messagesWithTools,
                        stream: true,
                        temperature: 0.7,
                        top_p: 0.9,
                        max_tokens: 4096,
                    }),
                });

                if (!finalResponse.ok) {
                    const errorText = await finalResponse.text();
                    return new Response(
                        JSON.stringify({ error: `OpenRouter API エラー (search follow-up): ${finalResponse.status} - ${errorText}` }),
                        { status: finalResponse.status, headers: { 'Content-Type': 'application/json' } }
                    );
                }

                // Return streaming response with search metadata
                const encoder = new TextEncoder();
                const searchMetaChunk = encoder.encode(`data: ${JSON.stringify({ searchQuery, searchPerformed: true })}\n\n`);

                const stream = new ReadableStream({
                    async start(controller) {
                        controller.enqueue(searchMetaChunk);

                        const reader = finalResponse.body?.getReader();
                        if (!reader) {
                            controller.close();
                            return;
                        }

                        const decoder = new TextDecoder();

                        try {
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;

                                const chunk = decoder.decode(value, { stream: true });
                                const lines = chunk.split('\n');

                                for (const line of lines) {
                                    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                                        try {
                                            const data = JSON.parse(line.slice(6));
                                            const content = data.choices?.[0]?.delta?.content;
                                            if (content) {
                                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                                            }
                                        } catch {
                                            // Skip malformed JSON lines
                                        }
                                    } else if (line === 'data: [DONE]') {
                                        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                                    }
                                }
                            }
                        } catch (error) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`));
                        } finally {
                            controller.close();
                        }
                    },
                });

                return new Response(stream, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    },
                });
            }
        }

        // No tool call needed - stream the response directly
        const streamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://shin-kun.vercel.app',
                'X-Title': 'Shin-kun',
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: conversationMessages,
                stream: true,
                temperature: 0.7,
                top_p: 0.9,
                max_tokens: 4096,
            }),
        });

        if (!streamResponse.ok) {
            const errorText = await streamResponse.text();
            return new Response(
                JSON.stringify({ error: `OpenRouter API エラー (stream): ${streamResponse.status} - ${errorText}` }),
                { status: streamResponse.status, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const reader = streamResponse.body?.getReader();
                if (!reader) {
                    controller.close();
                    return;
                }

                const decoder = new TextDecoder();

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                                try {
                                    const data = JSON.parse(line.slice(6));
                                    const content = data.choices?.[0]?.delta?.content;
                                    if (content) {
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                                    }
                                } catch {
                                    // Skip malformed JSON lines
                                }
                            } else if (line === 'data: [DONE]') {
                                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                            }
                        }
                    }
                } catch (error) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`));
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        return new Response(
            JSON.stringify({ error: `サーバーエラー: ${String(error)}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
