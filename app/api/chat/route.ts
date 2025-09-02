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

  // ===================================================================
  // ===== DEBUGGING-CODE: Gib uns den Inhalt der Anfrage aus =========
  console.log("--- EINGEHENDE ANFRAGE VOM FRONTEND (BODY) ---");
  console.log(JSON.stringify(body, null, 2));
  // ===================================================================

  const searchParams = req.nextUrl.searchParams
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
      const cleanedContents = body.contents.filter(
        (item: any) => item.role !== 'system'
      );
      payload = {
        ...body,
        contents: cleanedContents,
      };
    } else {
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
