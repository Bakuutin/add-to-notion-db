import OpenAI from 'openai';

const openai = new OpenAI();


export async function transcribe(file: any, prompt: string): Promise<string> {
    const { text } = await openai.audio.transcriptions.create({
        model: 'whisper-1',
        response_format: 'json',
        file: await OpenAI.toFile(file, 'audio.oga'),
        prompt,
    })

    return text
}
