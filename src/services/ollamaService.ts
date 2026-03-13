const OLLAMA_URL = 'http://localhost:11434';
const DEFAULT_TIMEOUT = 5000; // 5 seconds

export interface OllamaModel {
  name: string;
}

export const fetchModels = async (): Promise<string[]> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
  
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    return data.models?.map((m: OllamaModel) => m.name) || [];
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Error fetching Ollama models:", error);
    return [];
  }
};

export const generateChatResponse = async (
  model: string,
  messages: { role: string; content: string }[],
  options?: Record<string, any>
): Promise<string> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // Longer timeout for chat
  
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false, options }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`Status: ${res.status}`);
    const data = await res.json();
    return data.message.content;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("Error generating chat response:", error);
    return "(System: Error communicating with local AI. Ensure Ollama is running and the model is downloaded.)";
  }
};
