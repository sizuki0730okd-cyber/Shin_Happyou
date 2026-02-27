import { NextRequest } from 'next/server';
import { SYSTEM_PROMPT, MODEL_ID, SEARCH_TOOL } from '@/lib/constants';
import { performWebSearch } from '@/lib/serper';

// Vercel の 10 秒制限を回避するための設定
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        console.log('--- [Shin-kun] API Request Received ---');
        const { messages } = await request.json();

        // APIキーのクリーンアップ（空白や引用符を徹底的に除去）
        let apiKey = process.env.OPENROUTER_API_KEY || '';
        apiKey = apiKey.trim().replace(/^["']|["']$/g, '');

        if (!apiKey) {
            console.error('!!! CRITICAL: OPENROUTER_API_KEY is empty !!!');
            return new Response(JSON.stringify({ error: 'APIキーが未設定です。' }), { status: 500 });
        }

        const systemMessage = { role: 'system', content: SYSTEM_PROMPT };
        const conversationMessages = [systemMessage, ...messages.slice(-40)];

        console.log('Step 1: Calling OpenRouter for initial detection...');
        const initialResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/shizuki/shin-kun',
                'X-Title': 'Shin-kun',
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: conversationMessages,
                tools: [SEARCH_TOOL],
                tool_choice: 'auto',
            }),
        });

        if (!initialResponse.ok) {
            const errorText = await initialResponse.text();
            console.error(`!!! OpenRouter API Error [${initialResponse.status}] !!!`, errorText);
            return new Response(JSON.stringify({ error: `AI側エラー: ${initialResponse.status}` }), { status: initialResponse.status });
        }

        const initialData = await initialResponse.json();
        const choice = initialData.choices?.[0];

        // ツール（Web検索）判定
        if (choice?.message?.tool_calls?.length > 0) {
            const toolCall = choice.message.tool_calls[0];
            console.log('Step 2: Tool call detected ->', toolCall.function.name);

            if (toolCall.function.name === 'web_search') {
                const args = JSON.parse(toolCall.function.arguments);
                const searchQuery = args.query;

                console.log('Step 2.5: Performing Serper search for:', searchQuery);
                const searchResults = await performWebSearch(searchQuery);

                const messagesWithTools = [
                    ...conversationMessages,
                    choice.message,
                    { role: 'tool', tool_call_id: toolCall.id, content: searchResults },
                ];

                console.log('Step 3: Fetching final streamed response (After search)...');
                const finalResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://github.com/shizuki/shin-kun',
                        'X-Title': 'Shin-kun',
                    },
                    body: JSON.stringify({
                        model: MODEL_ID,
                        messages: messagesWithTools,
                        stream: true,
                    }),
                });

                return createStreamResponse(finalResponse, true, searchQuery);
            }
        }

        console.log('Step 2: No tool needed. Fetching direct stream...');
        const streamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://github.com/shizuki/shin-kun',
                'X-Title': 'Shin-kun',
            },
            body: JSON.stringify({
                model: MODEL_ID,
                messages: conversationMessages,
                stream: true,
            }),
        });

        return createStreamResponse(streamResponse);
    } catch (error) {
        console.error('!!! FATAL SERVER ERROR !!!');
        console.error(error);
        return new Response(JSON.stringify({ error: 'サーバー内で予期せぬエラーが発生しました。' }), { status: 500 });
    }
}

async function createStreamResponse(response: Response, isSearch = false, searchQuery?: string) {
    if (!response.ok) {
        const text = await response.text();
        console.error('!!! Stream Initiation Failed !!!', response.status, text);
        return new Response(JSON.stringify({ error: 'AIとの接続に失敗しました。' }), { status: 500 });
    }

    console.log('Step 4: Stream connected. Starting to read data...');
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                if (isSearch && searchQuery) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ searchQuery, searchPerformed: true })}\n\n`));
                }

                const reader = response.body?.getReader();
                if (!reader) throw new Error('Response body is null');

                let chunkCount = 0;
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        console.log(`Stream finished. Total chunks: ${chunkCount}`);
                        break;
                    }

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                            try {
                                const data = JSON.parse(line.slice(6));
                                const content = data.choices?.[0]?.delta?.content;
                                if (content) {
                                    if (chunkCount === 0) console.log('>>> FIRST CONTENT CHUNK RECEIVED <<<');
                                    chunkCount++;
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                                }
                            } catch { }
                        } else if (line === 'data: [DONE]') {
                            console.log('Stream received [DONE] signal');
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        }
                    }
                }
            } catch (error) {
                console.error('!!! Error inside ReadableStream !!!', error);
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
