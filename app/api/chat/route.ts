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

    // FINALE KORREKTUR: Wir entfernen explizit die alte system_instruction.
    // Diese Zeile zerlegt das 'body'-Objekt: 'system_instruction' wird in eine
    // separate Variable gesteckt (die wir ignorieren) und alles andere kommt in 'restOfBody'.
    const { system_instruction, ...restOfBody } = body;

    // Jetzt erstellen wir das Payload mit dem "sauberen" Body und fügen
    // danach unsere eigene, garantierte Anweisung hinzu.
    const payload = {
      ...restOfBody,
      system_instruction: {
        parts: [
          { text: systemInstruction }
        ]
      }
    };

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
