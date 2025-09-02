import { NextResponse, type NextRequest } from 'next/server'
import { GEMINI_API_BASE_URL } from '@/constant/urls'
import { handleError } from '../utils'
import { hasUploadFiles, getRandomKey } from '@/utils/common'

export const runtime = 'edge'
export const preferredRegion = ['cle1', 'iad1', 'pdx1', 'sfo1', 'sin1', 'syd1', 'hnd1', 'kix1']

const geminiApiKey = process.env.GEMINI_API_KEY as string
const geminiApiBaseUrl = process.env.GEMINI_API_BASE_URL as string

export async function POST(req: NextRequest) {
  const body = await req.json()
  const searchParams = req.nextUrl.searchParams
  const model = searchParams.get('model')!
  
  const defaultSystemInstruction = `Du bist ein Chatbot namens Mr. Okas.
Du wurdest von Mr. Schigge trainiert.
Sprich grundsätzlich auf Deutsch, außer die Eingabe des Users ist eindeutig auf Englisch,
dann antworte auch auf Englisch.
Verwende eine lockere Jugendsprache, wie zum Beispiel "Junge", "Mashallah", "Digga", "Bruder/brd, akhi", "krank/krass", "sybau" (bedeutet sowas wie nerv nicht), "tot", "tuff", "das crazy", "lowkey" (bedeutet zugegebenermaßen, sagt man oft vor einem fakt oder einer meinung), "cringe" (bedeutet sowas wie peinlich, unangenehm).
Benutz aber keine veralteten Wörter, wie z.B. "Yolo", "Slay". schreibe nicht so viele Apostrophs, schreibe "nh" (anstatt 'n oder 'ne)  
, achte ein weniger auf Gross und kleinschreibung und auf Kommasetzung. Vorallem zwischen den Jugendwörtern, wie z.B. Digga, junge oder Bruder, sollen keine Kommata sein.
Wenn jemand dich nach Lösungen für etwas, z.B. Aufgaben fragt, vergiss die Jugendsprache und schreibe wie ein normaler ChatBot, 
also mit Rechtschreibung, Kommata, Apostroph, usw., so wie es sich gehört. bleib trotzdem hilfreich und freundlich. Du liebst Zink und redest oft darüber und dein Erzfeind ist Mr. Ogo.
`
  const version = 'v1beta'
  const apiKey = getRandomKey(geminiApiKey, hasUploadFiles(body.contents))

  try {
    let url = `${geminiApiBaseUrl || GEMINI_API_BASE_URL}/${version}/models/${model}`
    if (!model.startsWith('imagen')) url += '?alt=sse'

    let payload = body;

    const hasMeaningfulFrontendInstruction = body.system_instruction?.parts?.[0]?.text?.trim();

    if (hasMeaningfulFrontendInstruction) {
      // WENN JA: Eine Anweisung vom Frontend kam an.
      // Wir reparieren das Format, indem wir das unerlaubte "role"-Feld entfernen.
      
      const cleanSystemInstruction = {
        parts: body.system_instruction.parts // Nimm nur die "parts", ignoriere den Rest.
      };

      payload = {
        ...body,
        system_instruction: cleanSystemInstruction, // Überschreibe mit der sauberen Version.
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
