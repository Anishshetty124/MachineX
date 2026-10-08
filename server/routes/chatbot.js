const router = require('express').Router()
const axios = require('axios')

const keys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '')
  .split(',')
  .map((key) => key.trim())
  .filter(Boolean)
const model = process.env.GEMINI_MODEL || 'gemini-flash-latest'
let keyIndex = 0

const systemInstruction = `You are the MachineX Quality Assistant.
Give practical guidance about this automotive quality-inspection website only.
Help users understand image uploads, part selection, 3D model matching, defect markers, AI diagnostic reports, telemetry, root causes, predictive risk, corrective actions, and troubleshooting Gemini or YOLO analysis.
Use concise, clear language. Do not invent inspection results, sensor values, model matches, or maintenance facts that are not provided.
If the user asks about something outside MachineX, explain that you can help with MachineX inspection workflows and ask them to rephrase.`

router.post('/', async (request, response) => {
  const message = String(request.body?.message || '').trim()
  const history = Array.isArray(request.body?.history) ? request.body.history : []

  if (!message) return response.status(400).json({ error: 'Message is required' })
  if (!keys.length) return response.status(503).json({ error: 'Gemini API is not configured' })

  const contents = [
    ...history
      .filter((item) => item && (item.role === 'user' || item.role === 'model') && typeof item.text === 'string')
      .slice(-10)
      .map((item) => ({ role: item.role, parts: [{ text: item.text }] })),
    { role: 'user', parts: [{ text: message }] },
  ]

  let lastError = null
  for (let attempt = 0; attempt < keys.length; attempt += 1) {
    const key = keys[keyIndex % keys.length]
    keyIndex = (keyIndex + 1) % keys.length
    try {
      const result = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents,
        },
        { params: { key }, timeout: 45000 }
      )
      const reply = result.data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
      if (!reply) throw new Error('Gemini returned an empty response')
      return response.json({ reply, model, provider: 'gemini' })
    } catch (error) {
      lastError = error
      console.error(`[chatbot] Gemini attempt ${attempt + 1}/${keys.length} failed:`, error.response?.data?.error?.message || error.message)
    }
  }

  return response.status(502).json({
    error: 'The MachineX assistant is temporarily unavailable.',
    detail: lastError?.response?.data?.error?.message || lastError?.message,
  })
})

module.exports = router
