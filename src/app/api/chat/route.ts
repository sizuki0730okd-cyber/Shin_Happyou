import { NextRequest } from 'next/server';
import { SYSTEM_PROMPT, MODEL_ID, SEARCH_TOOL } from '@/lib/constants';
import { performWebSearch } from '@/lib/serper';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
    try {
        console.log('--- API Call Started ---');
        const { messages } = await request.json();
        const apiKey = process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            console.error('Error: OPENROUTER_API_KEY is missing');
            return new Response(
                JSON.stringify({ error: 'OPENROUTER_API_KEY が設定されていません。' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const systemMessage = { role: 'system', content: SYSTEM_PROMPT };
        const conversationMessages = [systemMessage, ...messages.slice(-40)];

        console.log('Fetching initial response from OpenRouter...');
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
            }),
        });

        if (!initialResponse.ok) {
            const errorText = await initialResponse.text();
            console.error(`OpenRouter API Error: ${initialResponse.status}`, errorText);
            return new Response(
                JSON.stringify({ error: `APIエラー: ${initialResponse.status}` }),
                { status: initialResponse.status, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const initialData = await initialResponse.json();
        const choice = initialData.choices?.[0];

        if (choice?.message?.tool_calls && choice.message.tool_calls.length > 0) {
            const toolCall = choice.message.tool_calls[0];
            console.log('Tool call detected:', toolCall.function.name);

            if (toolCall.function.name === 'web_search') {
                const args = JSON.parse(toolCall.function.arguments);
                const searchQuery = args.query;

                console.log('Performing web search for:', searchQuery);
                const searchResults = await performWebSearch(searchQuery);

                const messagesWithTools = [
                    ...conversationMessages,
                    choice.message,
                    {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: searchResults,
                    },
                ];

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
                    }),
                });

                return createStreamResponse(finalResponse, true, searchQuery);
            }
        }

        console.log('Starting direct stream response...');
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
            }),
        });

        return createStreamResponse(streamResponse);
    } catch (error) {
        console.error('--- Server Error ---');
        console.error(error);
        return new Response(
            JSON.stringify({ error: `サーバーエラー: ${String(error)}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

async function createStreamResponse(response: Response, isSearch = false, searchQuery?: string) {
    if (!response.ok) {
        const text = await response.text();
        console.error('Stream Error:', response.status, text);
        return new Response(JSON.stringify({ error: 'Stream error' }), { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
        async start(controller) {
            if (isSearch && searchQuery) {
                const meta = JSON.stringify({ searchQuery, searchPerformed: true });
                controller.enqueue(encoder.encode(`data: ${meta}\n\n`));
            }

            const reader = response.body?.getReader();
            if (!reader) {
                controller.close();
                return;
            }

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
                            } catch { }
                        } else if (line === 'data: [DONE]') {
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                        }
                    }
                }
            } catch (error) {
                console.error('Stream Reading Error:', error);
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
