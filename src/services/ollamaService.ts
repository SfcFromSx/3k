const OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_ARK_MODEL = 'openai/ark-code-latest';
const ARK_BASE_URL = '/api/ark';

export interface OllamaModel {
  name: string;
}

export interface ChatGenerationResult {
  content: string;
  thinking?: string;
}

interface ArkConfig {
  model: string;
  apiKey: string;
  baseUrl: string;
  enabled: boolean;
}

const getArkConfig = (): ArkConfig => {
  const apiKey = import.meta.env.VITE_ARK_API_KEY?.trim() ?? '';
  const model = import.meta.env.VITE_ARK_MODEL?.trim() || DEFAULT_ARK_MODEL;

  return {
    model,
    apiKey,
    baseUrl: ARK_BASE_URL,
    enabled: apiKey.length > 0,
  };
};

const THINK_BLOCK_REGEX = /<think>([\s\S]*?)<\/think>/gi;
const QUESTION_PATTERN = /(?:am i|is my name|could i be|do i belong to|我是不是|我是)[^?!.。\n]*[?？]/gi;

const stripThinkTags = (content: string) =>
  content.replace(/<\/?think>/gi, '').trim();

const extractVisibleContent = (content: string) => {
  const matchedBlocks = content.match(THINK_BLOCK_REGEX);
  let visibleContent = content.replace(THINK_BLOCK_REGEX, '').trim();

  if (content.includes('</think>') && matchedBlocks?.length === 0) {
    visibleContent = content.split(/<\/think>/i).at(-1)?.trim() || visibleContent;
  }

  if (content.includes('<think>') && !content.match(THINK_BLOCK_REGEX)) {
    visibleContent = content.split(/<think>/i)[0]?.trim() || visibleContent;
  }

  const trailingQuestionMatches = visibleContent.match(QUESTION_PATTERN);
  if (trailingQuestionMatches?.length) {
    return trailingQuestionMatches.at(-1)?.trim() || visibleContent;
  }

  return stripThinkTags(visibleContent);
};

const normalizeChatResult = (content: string, fallbackThinking?: string): ChatGenerationResult => {
  const thinkingBlocks = [...content.matchAll(THINK_BLOCK_REGEX)]
    .map((match) => match[1]?.trim())
    .filter((block): block is string => Boolean(block));
  const strayClosingTagThinking =
    content.includes('</think>') && thinkingBlocks.length === 0
      ? stripThinkTags(content.split(/<\/think>/i)[0] || '')
      : undefined;
  const visibleContent = extractVisibleContent(content);
  const thinkingSections = [fallbackThinking?.trim(), strayClosingTagThinking, ...thinkingBlocks].filter(
    (section): section is string => Boolean(section)
  );

  return {
    content: visibleContent || content.trim() || '(System: Empty response from model.)',
    thinking: thinkingSections.length > 0 ? thinkingSections.join('\n\n') : undefined,
  };
};

export const fetchModels = async (): Promise<string[]> => {
  const ark = getArkConfig();

  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await res.json();
    const localModels = data.models.map((m: OllamaModel) => m.name);

    return ark.enabled ? [...new Set([...localModels, ark.model])] : localModels;
  } catch (error) {
    console.error("Error fetching Ollama models", error);
    return ark.enabled ? [ark.model] : [];
  }
};

export const generateChatResult = async (
  model: string,
  messages: { role: string; content: string }[],
  options?: Record<string, unknown>
): Promise<ChatGenerationResult> => {
  const ark = getArkConfig();

  if (model === ark.model) {
    if (!ark.enabled) {
      return {
        content: "(System: Ark cloud model is not configured. Set VITE_ARK_API_KEY to enable it.)",
      };
    }

    try {
      const res = await fetch(`${ark.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ark.apiKey}`
        },
        body: JSON.stringify({
          model: model.replace(/^openai\//, ''), // Strip provider prefix
          messages: messages,
          stream: false,
          ...options
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Ark API Error:", res.status, errorText);
        return {
          content: `(System: Error from Ark cloud server: ${res.status})`,
        };
      }

      const data = await res.json();
      const message = data.choices?.[0]?.message;
      return normalizeChatResult(
        message?.content || "(System: Unexpected response format from Ark.)",
        message?.reasoning_content
      );
    } catch (error) {
      console.error("Error generating Ark chat response", error);
      return {
        content: "(System: Error communicating with Ark cloud server.)",
      };
    }
  }

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false, options }),
    });
    
    if (!res.ok) {
        throw new Error(`Ollama error: ${res.status}`);
    }

    const data = await res.json();
    return normalizeChatResult(
      data.message?.content || "(System: Unexpected response format from local AI.)",
      data.message?.thinking ?? data.thinking
    );
  } catch (error) {
    console.error("Error generating chat response", error);
    return {
      content: "(System: Error communicating with local AI. Ensure Ollama is running and the model is downloaded.)",
    };
  }
};

export const generateChatResponse = async (
  model: string,
  messages: { role: string; content: string }[],
  options?: Record<string, unknown>
): Promise<string> => {
  const result = await generateChatResult(model, messages, options);
  return result.content;
};
