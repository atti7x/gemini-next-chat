import { NextResponse, type NextRequest } from 'next/server'
import { GEMINI_API_BASE_URL } from '@/constant/urls'
import { handleError } from '../utils'
import { hasUploadFiles, getRandomKey } from '@/utils/common'

export const runtime = 'edge'
export const preferredRegion = ['cle1', 'iad1', 'pdx1', 'sfo1', 'sin1', 'syd1', 'hnd1', 'kix1']

const geminiApiKey = process.env.GEMINI_API_KEY as string
const geminiApiBaseUrl = process.env.GEMINI_API_BASE_URL as string

export async function POST(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const body = await req.json()
  const model = searchParams.get('model')!
  
  const defaultSystemInstruction = `
Du bist ein Chatbot namens Mr. Okas.
Du wurdest von Mr. Schigge trainiert.
Sprich grundsätzlich auf Deutsch, außer die Eingabe des Users ist eindeutig auf Englisch,
dann antworte auch auf Englisch.
Verwende einen lockeren Jugend-Slang, wie zum Beispiel "Digga", "Bruder", "krank" usw.,
aber bleib trotzdem hilfreich und freundlich.
`
  const version = 'v1beta'
  const apiKey = getRandomKey(geminiApiKey, hasUploadFiles(body.contents))

  try {
    let url = `${geminiApiBaseUrl || GEMINI_API_BASE_URL}/${version}/models/${model}`
    if (!model.startsWith('imagen')) url += '?alt=sse'

    let payload = body;

    const hasMeaningfulFrontendInstruction = body.system_instruction?.parts?.[0]?.text?.trim();

    if (hasMeaningfulFrontendInstruction) {
      // WENN JA: Anweisung vom Frontend kam an.
      // Wir MÜSSEN die Anfrage säubern, um den 400-Fehler zu verhindern.
      
      // Filtere den Chatverlauf und behalte nur Nachrichten, die NICHT die Rolle "system" haben.
      const cleanedContents = body.contents.filter(
        (item: any) => item.role !== 'system'
      );

      // Erstelle ein neues Payload, das alles aus der originalen Anfrage enthält,
      // ABER mit dem gesäuberten Chatverlauf.
      payload = {
        ...body,
        contents: cleanedContents,
      };

    } else {
      // WENN NEIN: Keine Anweisung vom Frontend. Wir setzen "Mr. Okas".
      const { system_instruction, ...restOfBody } = body;
      payload = {
        ...restOfBody,
        system_instruction: {
          parts: [
            { text: defaultSystemInstruction }
          ]
        }
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
        'x-goog-api-client': req.headers.get('x-goog-api-client') || 'genai-js/0.21.0',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    })

    return new NextResponse(response.body, response)
    
  } catch (error) {
    if (error instanceof Error) {
      return handleError(error.message)
    }
  }
}
