import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchModels, generateChatResponse, generateChatResult } from './ollamaService';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('ollamaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('fetchModels', () => {
    it('should return a list of model names on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3' }, { name: 'mistral' }]
        })
      });

      const models = await fetchModels();
      expect(models).toEqual(['llama3', 'mistral']);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/tags'));
    });

    it('should include the Ark model when cloud access is configured', async () => {
      vi.stubEnv('VITE_ARK_API_KEY', 'test-key');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'llama3' }, { name: 'mistral' }]
        })
      });

      const models = await fetchModels();
      expect(models).toEqual(['llama3', 'mistral', 'openai/ark-code-latest']);
    });

    it('should return an empty array on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const models = await fetchModels();
      expect(models).toEqual([]);
    });

    it('should timeout and return empty array', async () => {
      // Mocking AbortSignal behavior is complex in unit tests without real fetch, 
      // but we can check if it returns empty on rejection
      mockFetch.mockImplementationOnce(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AbortError')), 10);
      }));
      
      const models = await fetchModels();
      expect(models).toEqual([]);
    });

    it('should fall back to the Ark model on failure when cloud access is configured', async () => {
      vi.stubEnv('VITE_ARK_API_KEY', 'test-key');

      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const models = await fetchModels();
      expect(models).toEqual(['openai/ark-code-latest']);
    });
  });

  describe('generateChatResponse', () => {
    it('should return content string on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { content: 'This is a test response' }
        })
      });

      const response = await generateChatResponse('llama3', [{ role: 'user', content: 'Hi' }]);
      expect(response).toBe('This is a test response');
    });

    it('should return an error message on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Fetch failed'));
      const response = await generateChatResponse('llama3', [{ role: 'user', content: 'Hi' }]);
      expect(response).toContain('Error communicating with local AI');
    });

    it('should return a configuration error when the Ark model is selected without an API key', async () => {
      const response = await generateChatResponse('openai/ark-code-latest', [{ role: 'user', content: 'Hi' }]);
      expect(response).toContain('Ark cloud model is not configured');
    });
  });

  describe('generateChatResult', () => {
    it('should extract think blocks from model content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: { content: '<think>Compare prior answers.</think>Am I Zhao Yun?' }
        })
      });

      const result = await generateChatResult('llama3', [{ role: 'user', content: 'Hi' }]);
      expect(result).toEqual({
        content: 'Am I Zhao Yun?',
        thinking: 'Compare prior answers.',
      });
    });

    it('should recover the final visible question when the model leaks malformed think content', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          message: {
            content:
              'tags". * Question: Am I a strategist? * *Let\'s reconsider.* </think>Am I a strategist?',
          },
        }),
      });

      const result = await generateChatResult('llama3', [{ role: 'user', content: 'Hi' }]);
      expect(result.content).toBe('Am I a strategist?');
      expect(result.thinking).toContain('Question: Am I a strategist?');
    });
  });
});
