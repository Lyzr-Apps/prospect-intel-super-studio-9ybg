import { NextRequest, NextResponse } from 'next/server'
import parseLLMJson from '@/lib/jsonParser'

// Allow up to 5 minutes for long-running agent tasks (manager-subagent patterns)
export const maxDuration = 300

const LYZR_TASK_URL = 'https://agent-prod.studio.lyzr.ai/v3/inference/chat/task'
const LYZR_API_KEY = process.env.LYZR_API_KEY || ''

// Timeout for individual fetch calls to Lyzr API (2 minutes for submit, 30s for poll)
const SUBMIT_TIMEOUT_MS = 120_000
const POLL_TIMEOUT_MS = 30_000

// Types
interface ArtifactFile {
  file_url: string
  name: string
  format_type: string
}

interface ModuleOutputs {
  artifact_files?: ArtifactFile[]
  [key: string]: any
}

interface NormalizedAgentResponse {
  status: 'success' | 'error'
  result: Record<string, any>
  message?: string
  metadata?: {
    agent_name?: string
    timestamp?: string
    [key: string]: any
  }
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// Keys that indicate the object IS the domain data (not a wrapper)
const DOMAIN_KEYS = ['companies', 'enriched_companies', 'company_contacts', 'segmentation_strategy', 'extracted_companies', 'findings']

function hasDomainKeys(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false
  return DOMAIN_KEYS.some(key => key in obj)
}

function normalizeResponse(parsed: any): NormalizedAgentResponse {
  if (!parsed) {
    return {
      status: 'error',
      result: {},
      message: 'Empty response from agent',
    }
  }

  if (typeof parsed === 'string') {
    return {
      status: 'success',
      result: { text: parsed },
      message: parsed,
    }
  }

  if (typeof parsed !== 'object') {
    return {
      status: 'success',
      result: { value: parsed },
      message: String(parsed),
    }
  }

  // PRIORITY: If this object has domain-specific keys, return it directly as the result
  // This prevents message/response/result extraction from losing the actual data
  if (hasDomainKeys(parsed)) {
    return {
      status: 'success',
      result: parsed,
      message: undefined,
      metadata: undefined,
    }
  }

  if ('status' in parsed && 'result' in parsed) {
    return {
      status: parsed.status === 'error' ? 'error' : 'success',
      result: parsed.result || {},
      message: parsed.message,
      metadata: parsed.metadata,
    }
  }

  if ('status' in parsed) {
    const { status, message, metadata, ...rest } = parsed
    return {
      status: status === 'error' ? 'error' : 'success',
      result: Object.keys(rest).length > 0 ? rest : {},
      message,
      metadata,
    }
  }

  if ('result' in parsed) {
    const r = parsed.result
    // If the result itself has domain keys, return it directly
    if (hasDomainKeys(r)) {
      return {
        status: 'success',
        result: r,
        message: undefined,
        metadata: parsed.metadata,
      }
    }
    const msg = parsed.message
      ?? (typeof r === 'string' ? r : null)
      ?? (r && typeof r === 'object'
          ? (r.text ?? r.message ?? r.response ?? r.answer ?? r.summary ?? r.content)
          : null)
    return {
      status: 'success',
      result: typeof r === 'string' ? { text: r } : (r || {}),
      message: typeof msg === 'string' ? msg : undefined,
      metadata: parsed.metadata,
    }
  }

  if ('message' in parsed && typeof parsed.message === 'string') {
    return {
      status: 'success',
      result: { text: parsed.message },
      message: parsed.message,
    }
  }

  if ('response' in parsed) {
    return normalizeResponse(parsed.response)
  }

  return {
    status: 'success',
    result: parsed,
    message: undefined,
    metadata: undefined,
  }
}

/**
 * GET /api/agent — health check
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', configured: !!LYZR_API_KEY })
}

/**
 * POST /api/agent
 *
 * Two modes, both POST:
 *   1. Submit:  body has { message, agent_id, ... }  → submits task, returns { task_id }
 *   2. Poll:    body has { task_id }                  → polls Lyzr, returns status/result
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!LYZR_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          response: { status: 'error', result: {}, message: 'LYZR_API_KEY not configured' },
          error: 'LYZR_API_KEY not configured on server',
        },
        { status: 500 }
      )
    }

    // ── Poll mode: body has task_id ──
    if (body.task_id) {
      return pollTask(body.task_id)
    }

    // ── Submit mode: body has message + agent_id ──
    return submitTask(body)
  } catch (error) {
    let errorMsg = error instanceof Error ? error.message : 'Server error'
    let statusCode = 500

    // Handle abort/timeout errors specifically
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      errorMsg = 'Request to agent API timed out. The agent may still be processing — please retry.'
      statusCode = 504
    } else if (error instanceof DOMException && error.name === 'AbortError') {
      errorMsg = 'Request was aborted. The agent may still be processing — please retry.'
      statusCode = 504
    }

    return NextResponse.json(
      {
        success: false,
        response: { status: 'error', result: {}, message: errorMsg },
        error: errorMsg,
      },
      { status: statusCode }
    )
  }
}

/**
 * Submit a new async task to Lyzr
 */
async function submitTask(body: any) {
  const { message, agent_id, user_id, session_id, assets } = body

  if (!message || !agent_id) {
    return NextResponse.json(
      {
        success: false,
        response: { status: 'error', result: {}, message: 'message and agent_id are required' },
        error: 'message and agent_id are required',
      },
      { status: 400 }
    )
  }

  const finalUserId = user_id || `user-${generateUUID()}`
  const finalSessionId = session_id || `${agent_id}-${generateUUID().substring(0, 12)}`

  const payload: Record<string, any> = {
    message,
    agent_id,
    user_id: finalUserId,
    session_id: finalSessionId,
  }

  if (assets && assets.length > 0) {
    payload.assets = assets
  }

  const submitRes = await fetch(LYZR_TASK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': LYZR_API_KEY,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
  })

  if (!submitRes.ok) {
    const submitText = await submitRes.text()
    let errorMsg = `Task submit failed with status ${submitRes.status}`
    try {
      const errorData = JSON.parse(submitText)
      errorMsg = errorData?.detail || errorData?.error || errorData?.message || errorMsg
    } catch {
      try {
        const errorData = parseLLMJson(submitText)
        errorMsg = errorData?.error || errorData?.message || errorMsg
      } catch {}
    }
    return NextResponse.json(
      {
        success: false,
        response: { status: 'error', result: {}, message: errorMsg },
        error: errorMsg,
        raw_response: submitText,
      },
      { status: submitRes.status }
    )
  }

  const { task_id } = await submitRes.json()

  return NextResponse.json({
    task_id,
    agent_id,
    user_id: finalUserId,
    session_id: finalSessionId,
  })
}

/**
 * Poll a task by ID — single request proxy with API key
 */
async function pollTask(task_id: string) {
  const pollRes = await fetch(`${LYZR_TASK_URL}/${task_id}`, {
    headers: {
      'accept': 'application/json',
      'x-api-key': LYZR_API_KEY,
    },
    signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
  })

  if (!pollRes.ok) {
    const pollText = await pollRes.text()
    const msg = pollRes.status === 404
      ? 'Task expired or not found'
      : `Poll failed with status ${pollRes.status}`
    return NextResponse.json(
      {
        success: false,
        status: 'failed',
        error: msg,
        raw_response: pollText,
      },
      { status: pollRes.status }
    )
  }

  const task = await pollRes.json()

  // Still processing
  if (task.status === 'processing') {
    return NextResponse.json({ status: 'processing' })
  }

  // Task failed
  if (task.status === 'failed') {
    return NextResponse.json(
      {
        success: false,
        status: 'failed',
        response: { status: 'error', result: {}, message: task.error || 'Agent task failed' },
        error: task.error || 'Agent task failed',
      },
      { status: 500 }
    )
  }

  // Task completed — envelope extraction + parseLLMJson + normalizeResponse
  const rawText = JSON.stringify(task.response)
  let moduleOutputs: ModuleOutputs | undefined
  let agentResponseRaw: any = rawText

  try {
    const envelope = JSON.parse(rawText)
    if (envelope && typeof envelope === 'object' && 'response' in envelope) {
      moduleOutputs = envelope.module_outputs
      agentResponseRaw = envelope.response
    }
  } catch {
    // Not standard JSON envelope — parseLLMJson will handle it
  }

  let parsed = parseLLMJson(agentResponseRaw)

  // If parseLLMJson returned a string, try parsing it again (double-stringified JSON from manager agents)
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch {
      try { parsed = parseLLMJson(parsed) } catch {}
    }
  }

  const toNormalize =
    parsed && typeof parsed === 'object' && parsed.success === false && parsed.data === null
      ? agentResponseRaw
      : parsed

  const normalized = normalizeResponse(toNormalize)

  // Log for debugging (visible in server logs)
  console.log('[pollTask] Task completed. Parsed type:', typeof parsed,
    '| Parsed keys:', parsed && typeof parsed === 'object' ? Object.keys(parsed).slice(0, 10).join(',') : 'N/A',
    '| Normalized keys:', typeof normalized.result === 'object' ? Object.keys(normalized.result).slice(0, 10).join(',') : 'N/A')

  return NextResponse.json({
    success: true,
    status: 'completed',
    response: normalized,
    module_outputs: moduleOutputs,
    timestamp: new Date().toISOString(),
    raw_response: rawText,
  })
}
