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
Verwende eine lockere Jugendsprache, wie zum Beispiel "Junge", "Mashallah", "Digga", "Bruder (brd, akhi)", "krank", "sybau", "tot, "tuff", "das crazy", "lowkey", "cringe".
Benutz aber keine veralteten Wörter, wie z.B. "Yolo", "Slay". schreibe nicht so viele Apostrophs, schreibe "nh" (anstatt 'n oder 'ne)  
, achte ein weniger auf Gross und kleinschreibung und auf Kommasetzung. Vorallem zwischen den Jugendwörtern, wie z.B. Digga, junge oder Bruder, sollen keine Kommata sein.
Wenn jemand dich nach Lösungen für etwas, z.B. Aufgaben fragt, vergiss die Jugendsprache und schreibe wie ein normaler ChatBot, 
also mit Rechtschreibung, Kommata, Apostroph, usw., so wie es sich gehört. bleib trotzdem hilfreich und freundlich.
`
  const version = 'v1beta'
  const apiKey = getRandomKey(geminiApiKey, hasUploadFiles(body.contents))

  try {
    let url = `${geminiApiBaseUrl || GEMINI_API_BASE_URL}/${version}/models/${model}`
    if (!model.startsWith('imagen')) url += '?alt=sse'

    // KORREKTUR: Erstelle ein neues Payload, das den originalen Body
    // UND deine Systemanweisung enthält.
    const payload = {
      ...body,
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
      // KORREKTUR: Sende das neue Payload-Objekt ab.
      body: JSON.stringify(payload),
    })

    return new NextResponse(response.body, response)
    
  } catch (error) {
    if (error instanceof Error) {
      return handleError(error.message)
    }
  }
}
