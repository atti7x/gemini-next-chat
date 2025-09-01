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
  
  // Deine Standard-Systemanweisung für "Mr. Okas"
  const systemInstruction = `
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

    // KORRIGIERTE LOGIK:
    // Wir deklarieren 'payload' und setzen es standardmäßig auf den originalen Body.
    let payload = body;

    // Wir prüfen, ob der Body von der Webseite KEINE 'system_instruction' enthält.
    if (!body.system_instruction) {
      // Wenn keine vorhanden ist, fügen wir deine "Mr. Okas"-Anweisung hinzu.
      payload = {
        ...body,
        system_instruction: {
          parts: [
            { text: systemInstruction }
          ]
        }
      };
    }
    // Wenn doch eine vorhanden ist, wird dieser Block übersprungen und das originale
    // 'payload' (mit der Rolle von der Webseite) wird verwendet.

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
        'x-goog-api-client': req.headers.get('x-goog-api-client') || 'genai-js/0.21.0',
        'x-goog-api-key': apiKey,
      },
      // Sende das (möglicherweise modifizierte) Payload-Objekt ab.
      body: JSON.stringify(payload),
    })

    return new NextResponse(response.body, response)
    
  } catch (error) {
    if (error instanceof Error) {
      return handleError(error.message)
    }
  }
}
