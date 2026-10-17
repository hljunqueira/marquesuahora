import axios from 'axios';

export interface TranscribeAudioOptions {
  base64Data: string;
  format?: 'ogg' | 'mp3' | 'wav' | 'm4a';
}

export class AudioTranscriptionService {
  private static getApiKey(): string | undefined {
    return process.env.OPENROUTER_API_KEY;
  }

  /**
   * Transcreve um áudio (geralmente enviado como PTT/Voz no WhatsApp) utilizando Whisper via OpenRouter.
   * O áudio do WhatsApp vem no formato OGG (Opus) codificado em Base64.
   */
  public static async transcribe(options: TranscribeAudioOptions): Promise<string | null> {
    const apiKey = this.getApiKey();
    if (!apiKey || apiKey.includes('sua_chave')) {
      console.warn('[AudioTranscription] OPENROUTER_API_KEY ausente ou não configurada.');
      return null;
    }

    // Remove prefixo data URI se presente (ex: data:audio/ogg;base64,...)
    const cleanBase64 = options.base64Data.replace(/^data:[^;]+;base64,/, '');

    try {
      const response = await axios.post(
        'https://openrouter.ai/api/v1/audio/transcriptions',
        {
          model: 'openai/whisper-large-v3-turbo',
          input_audio: {
            data: cleanBase64,
            format: options.format || 'ogg'
          }
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://marquesuahora.com.br',
            'X-Title': 'MarqueSuaHora',
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const transcript = response.data?.text?.trim();
      return transcript || null;
    } catch (err: any) {
      console.warn('[AudioTranscription] Falha ao transcrever áudio via Whisper:', err.response?.data || err.message);
      return null;
    }
  }
}
