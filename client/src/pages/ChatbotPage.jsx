import { useEffect, useRef, useState } from 'react'
import { Bot, Check, Clipboard, Lightbulb, Mic, Send, Sparkles, User } from 'lucide-react'
import { authFetch } from '../auth'

const SUGGESTIONS = [
  'How do I upload an inspection image?',
  'Why is my 3D model not matching the detected part?',
  'Explain the predictive risk report.',
  'Why did my AI analysis fall back?',
]
const speechRecognitionSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)

export default function ChatbotPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState(null)
  const endRef = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return undefined
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.onresult = (event) => setInput((value) => `${value}${value ? ' ' : ''}${event.results[0][0].transcript}`)
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    return () => recognition.stop()
  }, [])

  const sendMessage = async (event, suggestion) => {
    event?.preventDefault()
    const text = (suggestion || input).trim()
    if (!text || isLoading) return
    const nextMessages = [...messages, { role: 'user', text }]
    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)
    try {
      const response = await authFetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.map(({ role, text: messageText }) => ({ role, text: messageText })),
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Assistant request failed')
      setMessages([...nextMessages, { role: 'model', text: payload.reply }])
    } catch (error) {
      setMessages([...nextMessages, { role: 'model', text: error.message || 'The assistant is unavailable. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const copyMessage = async (text, index) => {
    await navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    window.setTimeout(() => setCopiedIndex(null), 1800)
  }

  return (
    <section className="chatbot-page">
      <div className="chatbot-heading">
        <div>
          <p className="eyebrow">MachineX assistant</p>
          <h1>Quality guidance, on demand</h1>
          <p className="muted">Ask about inspections, 3D models, diagnostics, telemetry, or provider troubleshooting.</p>
        </div>
        <div className="chatbot-status"><span className="status-dot live" /> AI guidance</div>
      </div>

      <div className="chatbot-panel panel">
        <div className="chatbot-messages">
          {messages.length === 0 && (
            <div className="chatbot-welcome">
              <div className="chatbot-welcome-icon"><Sparkles size={25} /></div>
              <h2>How can I help with MachineX?</h2>
              <p className="muted">I can explain the inspection workflow and help diagnose problems with your analysis.</p>
              <div className="chatbot-suggestions">
                {SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} type="button" className="chatbot-suggestion" onClick={(event) => sendMessage(event, suggestion)}>
                    <Lightbulb size={14} /> {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div className={`chat-message ${message.role === 'user' ? 'user' : 'assistant'}`} key={`${message.role}-${index}`}>
              <div className="chat-avatar">{message.role === 'user' ? <User size={16} /> : <Bot size={16} />}</div>
              <div className="chat-bubble">
                <div className="chat-text">{message.text}</div>
                {message.role === 'model' && (
                  <button type="button" className="chat-copy" onClick={() => copyMessage(message.text, index)}>
                    {copiedIndex === index ? <><Check size={12} /> Copied</> : <><Clipboard size={12} /> Copy</>}
                  </button>
                )}
              </div>
            </div>
          ))}

          {isLoading && <div className="chat-message assistant"><div className="chat-avatar"><Bot size={16} /></div><div className="chat-bubble chat-loading"><i /><i /><i /></div></div>}
          <div ref={endRef} />
        </div>

        <form className="chatbot-input-row" onSubmit={sendMessage}>
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={listening ? 'Listening...' : 'Ask about MachineX...'} disabled={isLoading} />
          {speechRecognitionSupported && <button type="button" className={`chat-icon-button ${listening ? 'listening' : ''}`} onClick={() => { if (listening) recognitionRef.current?.stop(); else { recognitionRef.current?.start(); setListening(true) } }} aria-label="Use microphone"><Mic size={18} /></button>}
          <button className="primary-button chat-send" type="submit" disabled={isLoading || !input.trim()}><Send size={16} /> Send</button>
        </form>
      </div>
    </section>
  )
}
