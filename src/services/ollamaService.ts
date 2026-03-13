const OLLAMA_URL = 'http://localhost:11434';

export interface OllamaModel {
  name: string;
}

export const fetchModels = async (): Promise<string[]> => {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await res.json();
    return data.models.map((m: OllamaModel) => m.name);
  } catch (error) {
    console.error("Error fetching Ollama models", error);
    return [];
  }
};

export const generateChatResponse = async (
  model: string,
  messages: { role: string; content: string }[],
  options?: Record<string, any>
): Promise<string> => {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false, options }),
    });
    const data = await res.json();
    return data.message.content;
  } catch (error) {
    console.error("Error generating chat response", error);
    return "(System: Error communicating with local AI. Ensure Ollama is running and the model is downloaded.)";
  }
};
