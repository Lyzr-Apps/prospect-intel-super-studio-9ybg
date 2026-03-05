'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { callAIAgent, AIAgentResponse } from '@/lib/aiAgent'
import parseLLMJson from '@/lib/jsonParser'
import {
  FiSearch, FiPlus, FiTrash2, FiStar, FiExternalLink, FiDownload,
  FiChevronDown, FiChevronUp, FiCheck, FiX, FiFilter, FiRefreshCw,
  FiCompass, FiUsers, FiTrendingUp, FiDollarSign, FiEdit3, FiMail,
  FiPhone, FiGlobe, FiFlag, FiClock, FiAlertCircle, FiCheckCircle,
  FiArrowRight, FiChevronRight, FiMenu, FiMoreVertical, FiMapPin,
  FiBriefcase, FiAward, FiBarChart2, FiDatabase, FiTarget, FiLayers,
  FiUpload, FiFile, FiColumns, FiCalendar, FiActivity, FiPlay,
  FiUserCheck, FiPieChart, FiRepeat
} from 'react-icons/fi'
import { HiOutlineSparkles, HiOutlineBuildingOffice2 } from 'react-icons/hi2'

// ─── AGENT IDS ───────────────────────────────────────────────────────────────
const DISCOVERY_MANAGER_ID = '699fe64260c6ee660b2b0c26'
const DISCOVERY_RESEARCHER_ID = '699fbc147aab67831bf8b7a7'
const COMPANY_EXTRACTOR_ID = '699fe5da10134bfe58ea5f4f'
const ENRICHMENT_MANAGER_ID = '69a11c7c65fa13d86075de84'
const CONTACT_AGENT_ID = '699fb67d511be0527fc9338e'

// Enrichment sub-agent IDs (called directly in parallel for speed)
const FINANCIAL_GROWTH_AGENT_ID = '69a11c116100943878a78a4e'
const NEWS_LEADERSHIP_AGENT_ID = '69a11c229195d30dcfc08fbb'
const COMPETITIVE_INTEL_AGENT_ID = '69a11c329195d30dcfc08fbd'
const RISK_WORKFORCE_AGENT_ID = '69a11c4fd3d2bd59cbfef2dc'

// Marketing pipeline agents
const MARKETING_STRATEGIST_ID = '69a93326407b294c33b53485'
const CONTENT_GENERATOR_ID = '69a9334a7b1c5e5a48839699'

// ─── AGENT CONFIG (agent-agnostic labels) ────────────────────────────────────
const AGENT_CONFIG = {
  discoveryManager: { id: DISCOVERY_MANAGER_ID, name: 'Discovery Manager', desc: 'Orchestrates multi-agent discovery pipeline' },
  discoveryResearcher: { id: DISCOVERY_RESEARCHER_ID, name: 'Discovery Researcher', desc: 'Web research across news, reports & directories' },
  companyExtractor: { id: COMPANY_EXTRACTOR_ID, name: 'Company Extractor', desc: 'Extracts and structures company data from findings' },
  enrichment: { id: ENRICHMENT_MANAGER_ID, name: 'Deep Enrichment', desc: 'Multi-agent research with sales leader validation' },
  contactFinder: { id: CONTACT_AGENT_ID, name: 'Contact Finder', desc: 'Verified contacts via Apollo integration' },
  marketingStrategist: { id: MARKETING_STRATEGIST_ID, name: 'Marketing Strategist', desc: 'Account scoring, tiering & cluster analysis' },
  contentGenerator: { id: CONTENT_GENERATOR_ID, name: 'Content Generator', desc: 'Tier-specific marketing content creation' },
}

// ─── THEME ───────────────────────────────────────────────────────────────────
const THEME_VARS: React.CSSProperties & Record<string, string> = {
  '--background': '35 29% 95%',
  '--foreground': '30 22% 14%',
  '--card': '35 29% 92%',
  '--card-foreground': '30 22% 14%',
  '--popover': '35 29% 90%',
  '--popover-foreground': '30 22% 14%',
  '--primary': '27 61% 26%',
  '--primary-foreground': '35 29% 98%',
  '--secondary': '35 20% 88%',
  '--secondary-foreground': '30 22% 18%',
  '--accent': '43 75% 38%',
  '--accent-foreground': '35 29% 98%',
  '--destructive': '0 84% 60%',
  '--muted': '35 15% 85%',
  '--muted-foreground': '30 20% 45%',
  '--border': '27 61% 26%',
  '--input': '35 15% 75%',
  '--ring': '27 61% 26%',
  '--sidebar-bg': '35 25% 90%',
  '--sidebar-foreground': '30 22% 14%',
  '--sidebar-border': '35 20% 85%',
  '--sidebar-primary': '27 61% 26%',
  '--sidebar-accent': '35 20% 85%',
  '--chart-1': '27 61% 26%',
  '--chart-2': '43 75% 38%',
  '--chart-3': '30 55% 25%',
  '--chart-4': '35 45% 42%',
  '--chart-5': '20 65% 35%',
  '--radius': '0.5rem',
}

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Company {
  name: string
  industry: string
  hq_location: string
  estimated_size: string
  relevance_score: number
  relevance_reasoning: string
  website: string
  source_segment?: string
  selected?: boolean
  note?: string
  source_urls?: string[]
  discovery_category?: string
}

// Source provenance — tracks what each URL contributed to discovery
interface DiscoverySource {
  url: string
  title: string
  date_published: string
  source_type: string
  key_finding: string
  companies_found: string[]
  relevance_rationale: string
}

interface SegmentStrategy {
  segment_name: string
  target_count: number
  actual_count: number
}

interface Revenue {
  figure: string
  year: string
  source: string
}

interface NewsItem {
  date: string
  headline: string
  summary: string
  sales_relevance?: string
}

interface CSuiteChange {
  name: string
  new_role: string
  previous_role: string
  date: string
}

interface GrowthIndicator {
  type: string
  detail: string
  implications?: string
}

interface CompetitiveIntel {
  vendors: string[]
  partners: string[]
  competitors: string[]
}

interface RiskInsuranceChallenge {
  challenge: string
  trigger_event: string
  urgency: string
  relevant_service: string
  service_provider: string
  conversation_opener: string
}

interface HRWorkforceChallenge {
  challenge: string
  trigger_event: string
  urgency: string
  relevant_service: string
  service_provider: string
  conversation_opener: string
}

interface SalesNugget {
  nugget: string
  category: string
  source: string
  talking_point: string
}

interface EnrichedCompany {
  company_name: string
  revenue: Revenue
  recent_news: NewsItem[]
  csuite_changes: CSuiteChange[]
  growth_indicators: GrowthIndicator[]
  competitive_intel: CompetitiveIntel
  risk_insurance_challenges: RiskInsuranceChallenge[]
  hr_workforce_challenges: HRWorkforceChallenge[]
  key_sales_nuggets: SalesNugget[]
  selected?: boolean
  note?: string
  priority?: boolean
}

interface Contact {
  full_name: string
  title: string
  seniority: string
  email: string
  email_status: string
  phone: string
  linkedin_url: string
}

interface OrgData {
  apollo_id: string
  domain: string
  employee_count: string
  industry: string
}

interface CompanyContacts {
  company_name: string
  contacts: Contact[]
  organization_data: OrgData
}

interface ArtifactFile {
  file_url: string
  name: string
  format_type: string
}

interface CampaignFilters {
  geography?: string
  sizeRange?: string
  industries?: string[]
  targetCount?: number
}

// ─── MARKETING STRATEGY TYPES ──────────────────────────────────────────────
interface AccountScores {
  signal_density: number
  strategic_fit: number
  timing: number
  scale_indicator: number
  weighted_score: number
}

interface AccountBrief {
  company_name: string
  scores: AccountScores
  tier: 'tier_1_abm' | 'tier_2_cluster' | 'tier_3_nurture'
  tier_rationale: string
  key_angles: string[]
  channel_strategy: string[]
  priority_signals: string[]
}

interface MarketingCluster {
  cluster_name: string
  theme: string
  company_names: string[]
  recommended_content_angle: string
}

interface TierSummary {
  tier_1_count: number
  tier_2_count: number
  tier_3_count: number
  total_accounts: number
}

// ─── EXECUTION PLAYBOOK TYPES ─────────────────────────────────────────────
interface PlaybookActionDetails {
  campaign_type?: string
  targeting?: string
  estimated_audience_size?: string
  daily_budget_usd?: number
  duration_days?: number
  total_budget_usd?: number
  creative?: string
  frequency_cap?: string
  goal?: string
}

interface PlaybookAction {
  action: string
  channel: string
  details?: PlaybookActionDetails
}

interface PlaybookPhase {
  phase: number
  name: string
  duration: string
  objective: string
  owner: string
  actions: PlaybookAction[]
}

interface ExecutionPlaybook {
  campaign_name: string
  total_duration_weeks: number
  phases: PlaybookPhase[]
}

interface OwnershipEntry {
  activity: string
  owner: string
  support: string
  tools: string
  tier: string
}

interface TierBudgetDetail {
  daily_budget?: number
  duration_days?: number
  total?: number
  [key: string]: any
}

interface BudgetSummary {
  linkedin_ads: {
    tier_1_account_targeting?: TierBudgetDetail
    tier_2_cluster_promotion?: TierBudgetDetail
    tier_3_broad_awareness?: TierBudgetDetail
    subtotal_usd?: number
    [key: string]: any
  }
  content_production: {
    note?: string
    agent_api_costs_usd?: number
    [key: string]: any
  }
  total_campaign_budget_usd: number
}

interface TierKPI {
  primary_metric?: string
  target?: string
  secondary_metrics?: string[]
  [key: string]: any
}

interface OverallKPI {
  pipeline_influenced?: string
  campaign_roi?: string
  reporting_cadence?: string
  [key: string]: any
}

interface KPIs {
  tier_1?: TierKPI
  tier_2?: TierKPI
  tier_3?: TierKPI
  overall_campaign?: OverallKPI
}

interface TierMovementRule {
  from?: string
  triggers?: string[]
  action?: string
  [key: string]: any
}

interface TierMovementRules {
  upgrade_to_tier_1?: TierMovementRule
  upgrade_to_tier_2?: TierMovementRule
  downgrade_to_tier_2?: TierMovementRule
  remove_from_campaign?: TierMovementRule
}

interface MarketingStrategy {
  account_briefs: AccountBrief[]
  clusters: MarketingCluster[]
  tier_summary: TierSummary
  campaign_themes: string[]
  execution_playbook?: ExecutionPlaybook
  ownership_matrix?: OwnershipEntry[]
  budget_summary?: BudgetSummary
  kpis?: KPIs
  tier_movement_rules?: TierMovementRules
}

interface OnePager {
  headline: string
  company_context: string
  key_challenges: string[]
  proposed_approach: string
  call_to_action: string
  full_text: string
}

interface EmailTouch {
  touch_number: number
  subject: string
  body: string
  cta: string
}

interface ThoughtLeadership {
  title: string
  introduction: string
  key_insights: string[]
  conclusion_with_cta: string
  full_text: string
}

interface EmailTemplate {
  subject: string
  body: string
  personalization_fields: string[]
}

interface NurtureEmail {
  subject: string
  body: string
  value_proposition: string
}

interface AdCopy {
  variant: number
  headline: string
  body: string
  cta_text: string
}

interface ContentAssets {
  one_pager: OnePager | null
  email_sequence: EmailTouch[] | null
  thought_leadership: ThoughtLeadership | null
  email_template: EmailTemplate | null
  nurture_email: NurtureEmail | null
  ad_copy: AdCopy[]
}

interface CompanyContent {
  company_name: string
  tier: string
  content_assets: ContentAssets
  generation_notes: string
}

// ─── SEARCH VERIFICATION DIAGNOSTICS ──────────────────────────────────────
// These diagnostics capture hard evidence about whether the Researcher agent
// actually performed live web searches vs. generating from training data.
interface SearchDiagnostics {
  // Timestamp of when the diagnostic was captured
  capturedAt: string
  // Pipeline path used: 'direct' or 'manager'
  pipelinePath: 'direct' | 'manager'
  // Raw response snippet (first 3000 chars) for manual inspection
  rawResponseSnippet: string
  // Agent ID that produced the research
  researcherAgentId: string
  // === Evidence Signals ===
  // Did the response contain a structured "findings" array?
  hasFindingsArray: boolean
  findingsCount: number
  // URL analysis
  totalUrlsReturned: number
  urlsWithValidFormat: number  // proper http(s):// with domain
  urlsWithRealDomains: number  // domains that look real (not example.com, placeholder.com)
  uniqueDomains: string[]      // list of unique domains found
  // Date analysis
  datesFound: string[]
  datesIn2024OrLater: number
  // Grounding / tool usage signals found in raw response
  hasGroundingMetadata: boolean
  hasSearchEntryPoint: boolean
  hasToolCallTraces: boolean
  hasSerpApiSignals: boolean
  groundingSignals: string[]   // List of specific signals found
  // Content quality signals
  averageContentLength: number // avg chars per finding content field
  findingsWithCompanyMentions: number // how many findings have companies_mentioned
  // Overall confidence assessment
  confidenceLevel: 'high' | 'medium' | 'low' | 'none'
  confidenceReason: string
}

interface Campaign {
  id: string
  name: string
  directive: string
  filters: CampaignFilters
  companies: Company[]
  enrichedCompanies: EnrichedCompany[]
  contacts: CompanyContacts[]
  artifactFiles: ArtifactFile[]
  stage: 'discovery' | 'enrichment' | 'contacts' | 'marketing' | 'completed'
  createdAt: string
  updatedAt: string
  priority_flags: string[]
  searchSummary?: string
  enrichmentSummary?: string
  contactSummary?: string
  totalContactsFound?: number
  segmentationStrategy?: SegmentStrategy[]
  duplicatesRemoved?: number
  enrichmentTime?: number
  discoverySources?: DiscoverySource[]
  searchDiagnostics?: SearchDiagnostics
  // Marketing strategy data
  marketingStrategy?: MarketingStrategy
  marketingContent?: CompanyContent[]
  marketingSummary?: string
}

type AppView = 'dashboard' | 'campaign'
type SidebarFilter = 'all' | 'in_progress' | 'completed'

// ─── HELPER: parse agent result robustly ─────────────────────────────────────
const TARGET_KEYS = ['companies', 'enriched_companies', 'company_contacts', 'segmentation_strategy', 'extracted_companies', 'findings', 'revenue', 'growth_indicators', 'recent_news', 'csuite_changes', 'competitive_intel', 'risk_insurance_challenges', 'hr_workforce_challenges', 'key_sales_nuggets', 'discovery_sources', 'account_briefs', 'clusters', 'tier_summary', 'content_assets', 'execution_playbook', 'ownership_matrix', 'budget_summary', 'kpis', 'tier_movement_rules']

function hasTargetKeys(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false
  return TARGET_KEYS.some(key => key in obj && obj[key] != null)
}

function deepFindTarget(obj: any, depth = 0): any {
  if (!obj || typeof obj !== 'object' || depth > 8) return null
  if (hasTargetKeys(obj)) return obj

  // Check common nesting patterns from Lyzr agent responses
  const unwrapKeys = ['result', 'response', 'data', 'output', 'content', 'text', 'message']
  for (const key of unwrapKeys) {
    if (obj[key] && typeof obj[key] === 'object') {
      const found = deepFindTarget(obj[key], depth + 1)
      if (found) return found
    }
  }

  // Check if the value is a stringified JSON that needs parsing
  for (const key of unwrapKeys) {
    if (typeof obj[key] === 'string' && obj[key].includes('{')) {
      try {
        const innerParsed = parseLLMJson(obj[key])
        if (innerParsed && typeof innerParsed === 'object') {
          const found = deepFindTarget(innerParsed, depth + 1)
          if (found) return found
        }
      } catch {}
    }
  }

  return null
}

function parseAgentResult(result: AIAgentResponse): any {
  if (!result?.success) {
    console.warn('[parseAgentResult] result.success is false or result is null', { success: result?.success, error: result?.error })
    return null
  }

  // Primary path: check result.response.result
  const data = result?.response?.result
  if (data && typeof data === 'object') {
    const found = deepFindTarget(data)
    if (found) return found
  }

  // Secondary path: check result.response directly (manager agents may skip .result)
  if (result?.response && typeof result.response === 'object') {
    const found = deepFindTarget(result.response)
    if (found) return found
  }

  // Tertiary path: parse raw_response string
  if (result?.raw_response) {
    try {
      const parsed = parseLLMJson(result.raw_response)
      if (parsed && typeof parsed === 'object') {
        const found = deepFindTarget(parsed)
        if (found) return found
      }
    } catch {}
  }

  // Last resort: check if the raw_response is a double-stringified JSON
  if (result?.raw_response && typeof result.raw_response === 'string') {
    try {
      const firstParse = JSON.parse(result.raw_response)
      if (typeof firstParse === 'string') {
        const secondParse = parseLLMJson(firstParse)
        if (secondParse && typeof secondParse === 'object') {
          const found = deepFindTarget(secondParse)
          if (found) return found
        }
      } else if (typeof firstParse === 'object') {
        const found = deepFindTarget(firstParse)
        if (found) return found
      }
    } catch {}
  }

  // If we got data but couldn't find target keys, return it anyway
  // (the caller will handle missing fields gracefully)
  if (data && typeof data === 'object' && Object.keys(data).length > 0) {
    console.warn('[parseAgentResult] Data found but no target keys. Keys:', Object.keys(data))
    return data
  }

  console.warn('[parseAgentResult] No parseable data found in agent response')
  return null
}

// ─── SOURCE PROVENANCE EXTRACTION ────────────────────────────────────────────
function extractDiscoverySources(parsed: any, researchParsed?: any): DiscoverySource[] {
  const sources: DiscoverySource[] = []
  const seenUrls = new Set<string>()

  const addSource = (s: any) => {
    if (!s || typeof s !== 'object') return
    const url = s?.url ?? s?.source_url ?? ''
    if (!url || typeof url !== 'string' || !url.trim()) return
    const normalized = url.trim().toLowerCase()
    if (seenUrls.has(normalized)) return
    seenUrls.add(normalized)
    sources.push({
      url: url.trim(),
      title: s?.title ?? s?.source_title ?? '',
      date_published: s?.date_published ?? s?.date ?? 'Unknown',
      source_type: s?.source_type ?? 'other',
      key_finding: s?.key_finding ?? s?.content ?? '',
      companies_found: Array.isArray(s?.companies_found)
        ? s.companies_found.filter((c: any) => typeof c === 'string' && c.trim())
        : Array.isArray(s?.companies_mentioned)
          ? s.companies_mentioned.filter((c: any) => typeof c === 'string' && c.trim())
          : [],
      relevance_rationale: s?.relevance_rationale ?? s?.relevance ?? '',
    })
  }

  // Path 1: Explicit discovery_sources array from agent response
  if (Array.isArray(parsed?.discovery_sources)) {
    for (const s of parsed.discovery_sources) addSource(s)
  }

  // Path 2: Build from researcher findings if available
  if (researchParsed && Array.isArray(researchParsed?.findings)) {
    for (const f of researchParsed.findings) {
      addSource({
        url: f?.source_url ?? f?.url ?? '',
        title: f?.source_title ?? '',
        date_published: f?.date_published ?? 'Unknown',
        source_type: f?.source_type ?? 'other',
        key_finding: f?.content ?? '',
        companies_found: Array.isArray(f?.companies_mentioned) ? f.companies_mentioned : [],
        relevance_rationale: f?.relevance ?? '',
      })
    }
  }

  return sources
}

// ─── CLIENT-SIDE SOURCE URL CROSS-REFERENCING ────────────────────────────────
// Instead of relying on LLMs to populate source_urls per company (which they do unreliably),
// this function programmatically maps researcher findings to extracted companies by name matching.
function crossReferenceSourceUrls(
  companies: Company[],
  researcherFindings: any[]
): Company[] {
  if (!Array.isArray(researcherFindings) || researcherFindings.length === 0) return companies

  // Build a lookup: company name (lowercase) → set of source URLs
  const companyUrlMap = new Map<string, Set<string>>()

  for (const finding of researcherFindings) {
    const url = finding?.source_url ?? finding?.url ?? ''
    if (!url || typeof url !== 'string' || !url.trim()) continue
    const cleanUrl = url.trim()

    const mentioned = Array.isArray(finding?.companies_mentioned) ? finding.companies_mentioned : []
    const content = typeof finding?.content === 'string' ? finding.content : ''

    for (const companyName of mentioned) {
      if (typeof companyName === 'string' && companyName.trim()) {
        const key = companyName.trim().toLowerCase()
        if (!companyUrlMap.has(key)) companyUrlMap.set(key, new Set())
        companyUrlMap.get(key)!.add(cleanUrl)
      }
    }

    // Also try fuzzy matching: if a company name appears in the finding content, link it
    for (const company of companies) {
      const companyLower = company.name.trim().toLowerCase()
      if (!companyLower) continue
      // Check if company name appears in the finding's content or companies_mentioned
      const mentionedLower = mentioned.map((m: string) => (typeof m === 'string' ? m.trim().toLowerCase() : ''))
      const inMentioned = mentionedLower.some((m: string) => m === companyLower || m.includes(companyLower) || companyLower.includes(m))
      const inContent = content.toLowerCase().includes(companyLower)
      if (inMentioned || inContent) {
        if (!companyUrlMap.has(companyLower)) companyUrlMap.set(companyLower, new Set())
        companyUrlMap.get(companyLower)!.add(cleanUrl)
      }
    }
  }

  // Enrich each company with matched source URLs
  return companies.map(co => {
    const key = co.name.trim().toLowerCase()
    const matchedUrls = companyUrlMap.get(key)
    // Merge with any existing source_urls the LLM may have returned
    const existingUrls = Array.isArray(co.source_urls) ? co.source_urls.filter(u => typeof u === 'string' && u.trim()) : []
    const matchedArr = matchedUrls ? Array.from(matchedUrls) : []
    const allUrls = new Set([...existingUrls, ...matchedArr])
    return { ...co, source_urls: Array.from(allUrls).slice(0, 5) }
  })
}

// ─── SEARCH DIAGNOSTICS ANALYSIS ──────────────────────────────────────────────
// Analyzes the raw Researcher response to determine whether a live web search
// actually occurred. This checks for hard evidence, not just prompt compliance.
function analyzeSearchDiagnostics(
  researchResult: AIAgentResponse,
  researchParsed: any,
  pipelinePath: 'direct' | 'manager'
): SearchDiagnostics {
  const rawStr = typeof researchResult?.raw_response === 'string'
    ? researchResult.raw_response
    : JSON.stringify(researchResult ?? {})
  const rawSnippet = rawStr.slice(0, 3000)

  const findings = Array.isArray(researchParsed?.findings) ? researchParsed.findings : []
  const hasFindingsArray = findings.length > 0

  // ── URL Analysis ──
  const allUrls: string[] = []
  for (const f of findings) {
    const url = f?.source_url ?? f?.url ?? ''
    if (typeof url === 'string' && url.trim()) allUrls.push(url.trim())
  }

  const PLACEHOLDER_DOMAINS = ['example.com', 'placeholder.com', 'test.com', 'fake.com', 'samplesite.com', 'lorem.com', 'dummy.com']
  const validFormatUrls = allUrls.filter(u => /^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(u))
  const uniqueDomains: string[] = []
  const domainSet = new Set<string>()
  for (const u of validFormatUrls) {
    try {
      const domain = new URL(u).hostname.replace(/^www\./, '')
      if (!domainSet.has(domain)) { domainSet.add(domain); uniqueDomains.push(domain) }
    } catch { /* invalid URL */ }
  }
  const realDomains = uniqueDomains.filter(d => !PLACEHOLDER_DOMAINS.some(p => d.includes(p)))
  const urlsWithRealDomains = validFormatUrls.filter(u => {
    try { const d = new URL(u).hostname.replace(/^www\./, ''); return !PLACEHOLDER_DOMAINS.some(p => d.includes(p)) } catch { return false }
  }).length

  // ── Date Analysis ──
  const datesFound: string[] = []
  for (const f of findings) {
    const d = f?.date_published ?? ''
    if (typeof d === 'string' && d.trim() && d !== 'Unknown') datesFound.push(d.trim())
  }
  const datesIn2024OrLater = datesFound.filter(d => {
    const year = parseInt(d.slice(0, 4), 10)
    return !isNaN(year) && year >= 2024
  }).length

  // ── Grounding / Tool Usage Signals ──
  // These are signals that the Lyzr/Gemini platform actually used search grounding or SERPAPI
  const rawLower = rawStr.toLowerCase()
  const groundingSignals: string[] = []

  const hasGroundingMetadata = rawLower.includes('grounding_metadata') || rawLower.includes('groundingmetadata')
  if (hasGroundingMetadata) groundingSignals.push('grounding_metadata present')

  const hasSearchEntryPoint = rawLower.includes('search_entry_point') || rawLower.includes('searchentrypoint') || rawLower.includes('rendered_content')
  if (hasSearchEntryPoint) groundingSignals.push('search_entry_point present')

  const hasToolCallTraces = rawLower.includes('tool_call') || rawLower.includes('function_call') || rawLower.includes('tool_use') || rawLower.includes('tool_response')
  if (hasToolCallTraces) groundingSignals.push('tool_call traces present')

  const hasSerpApiSignals = rawLower.includes('serpapi') || rawLower.includes('serp_api') || rawLower.includes('organic_results') || rawLower.includes('search_results')
  if (hasSerpApiSignals) groundingSignals.push('SERPAPI/search_results signals present')

  // Additional Gemini grounding signals
  if (rawLower.includes('grounding_chunk') || rawLower.includes('grounding_support')) groundingSignals.push('grounding_chunk/support present')
  if (rawLower.includes('web_search_queries') || rawLower.includes('search_query')) groundingSignals.push('web_search_queries present')
  if (rawLower.includes('retrieval_queries')) groundingSignals.push('retrieval_queries present')

  // ── Content Quality ──
  let totalContentLen = 0
  let findingsWithCompanyMentions = 0
  for (const f of findings) {
    const content = f?.content ?? ''
    if (typeof content === 'string') totalContentLen += content.length
    if (Array.isArray(f?.companies_mentioned) && f.companies_mentioned.length > 0) findingsWithCompanyMentions++
  }
  const averageContentLength = findings.length > 0 ? Math.round(totalContentLen / findings.length) : 0

  // ── Confidence Assessment ──
  let confidenceLevel: 'high' | 'medium' | 'low' | 'none' = 'none'
  let confidenceReason = ''

  const hasAnyGroundingSignal = groundingSignals.length > 0
  const hasRealUrls = urlsWithRealDomains >= 3
  const hasDiverseDomains = realDomains.length >= 3
  const hasRecentDates = datesIn2024OrLater >= 2

  if (hasAnyGroundingSignal && hasRealUrls && hasDiverseDomains) {
    confidenceLevel = 'high'
    confidenceReason = `Platform-level search signals detected (${groundingSignals.join(', ')}). ${urlsWithRealDomains} real URLs across ${realDomains.length} unique domains.`
  } else if (hasRealUrls && hasDiverseDomains && hasRecentDates) {
    confidenceLevel = 'medium'
    confidenceReason = `${urlsWithRealDomains} URLs with real domains across ${realDomains.length} unique sources, ${datesIn2024OrLater} dates from 2024+. No platform-level grounding signals detected in the response — the agent may have used search grounding, but the metadata was not propagated to the API response.`
  } else if (hasRealUrls || hasFindingsArray) {
    confidenceLevel = 'low'
    confidenceReason = `${allUrls.length} URLs returned but limited domain diversity (${realDomains.length} unique domains). URLs could be from training data or fabricated. No platform search signals detected.`
  } else {
    confidenceLevel = 'none'
    confidenceReason = 'No structured findings, no URLs, and no search/grounding signals detected. The agent likely generated output from training data without performing any live web search.'
  }

  return {
    capturedAt: new Date().toISOString(),
    pipelinePath,
    rawResponseSnippet: rawSnippet,
    researcherAgentId: DISCOVERY_RESEARCHER_ID,
    hasFindingsArray,
    findingsCount: findings.length,
    totalUrlsReturned: allUrls.length,
    urlsWithValidFormat: validFormatUrls.length,
    urlsWithRealDomains,
    uniqueDomains: realDomains.slice(0, 20),
    datesFound: datesFound.slice(0, 20),
    datesIn2024OrLater,
    hasGroundingMetadata,
    hasSearchEntryPoint,
    hasToolCallTraces,
    hasSerpApiSignals,
    groundingSignals,
    averageContentLength,
    findingsWithCompanyMentions,
    confidenceLevel,
    confidenceReason,
  }
}

// ─── MARKDOWN RENDERER ───────────────────────────────────────────────────────
function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">{part}</strong>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

// ─── SAMPLE DATA ─────────────────────────────────────────────────────────────
function getSampleCampaign(): Campaign {
  return {
    id: 'sample-1',
    name: 'Enterprise SaaS Expansion Q1',
    directive: 'Find mid-market and enterprise B2B SaaS companies in North America focused on data analytics, cloud infrastructure, or cybersecurity with 200-5000 employees, prioritizing those showing recent growth signals.',
    filters: { geography: 'North America', sizeRange: '200-5000', industries: ['SaaS', 'Data Analytics', 'Cybersecurity'] },
    companies: [
      { name: 'DataVault Technologies', industry: 'Data Analytics', hq_location: 'San Francisco, CA', estimated_size: '500-1000', relevance_score: 9, relevance_reasoning: 'Strong growth in cloud data analytics, recent Series C funding of $80M, expanding enterprise customer base. New CRO hired from Snowflake signals sales infrastructure investment.', website: 'https://datavault.example.com', selected: true, source_urls: ['https://techcrunch.com/2024/11/15/datavault-series-c', 'https://businessinsider.com/datavault-analytics-growth-2024'], discovery_category: 'Recent Funding' },
      { name: 'CyberShield Solutions', industry: 'Cybersecurity', hq_location: 'Austin, TX', estimated_size: '200-500', relevance_score: 8, relevance_reasoning: 'Leading endpoint security vendor with rapid SMB-to-enterprise transition. Won $15M DoD contract, validating federal-grade capabilities.', website: 'https://cybershield.example.com', selected: true, source_urls: ['https://defensenews.com/2024/12/cybershield-dod-contract', 'https://crunchbase.com/organization/cybershield'], discovery_category: 'Major News/Development' },
      { name: 'CloudNexus Inc', industry: 'Cloud Infrastructure', hq_location: 'Seattle, WA', estimated_size: '1000-2000', relevance_score: 8, relevance_reasoning: 'Major cloud orchestration platform with 1000+ enterprise clients. Strong partnership network with hyperscale cloud providers.', website: 'https://cloudnexus.example.com', selected: false, source_urls: ['https://cloudcomputing-news.net/cloudnexus-2024-review'], discovery_category: 'Industry Leader' },
      { name: 'InsightFlow Analytics', industry: 'Business Intelligence', hq_location: 'New York, NY', estimated_size: '300-600', relevance_score: 7, relevance_reasoning: 'Emerging BI platform with AI-driven insights for mid-market. Tripled customer base in 12 months with 200% YoY ARR growth.', website: 'https://insightflow.example.com', selected: false, source_urls: ['https://saastr.com/insightflow-growth-story-2024'], discovery_category: 'Rapid Growth' },
    ],
    enrichedCompanies: [
      {
        company_name: 'DataVault Technologies', selected: true, priority: true,
        revenue: { figure: '$120M ARR', year: '2024', source: 'Crunchbase / Press Release' },
        recent_news: [
          { date: '2024-11-15', headline: 'DataVault Raises $80M Series C', summary: 'Funding round led by Sequoia Capital to accelerate enterprise growth.' },
          { date: '2024-10-02', headline: 'DataVault Launches Real-Time Analytics Suite', summary: 'New product line targeting Fortune 500 data teams.' },
        ],
        csuite_changes: [
          { name: 'Sarah Chen', new_role: 'Chief Revenue Officer', previous_role: 'VP Sales at Snowflake', date: '2024-09-01' },
        ],
        growth_indicators: [
          { type: 'Hiring', detail: '45 open positions in engineering and sales' },
          { type: 'Expansion', detail: 'Opened new offices in London and Singapore' },
        ],
        competitive_intel: { vendors: ['AWS', 'Databricks'], partners: ['Deloitte', 'Accenture'], competitors: ['Looker', 'Tableau', 'ThoughtSpot'] },
        risk_insurance_challenges: [
          { challenge: 'Rapid international expansion creates complex regulatory compliance needs', trigger_event: 'Opened offices in London and Singapore in 2024', urgency: 'High', relevant_service: 'Global Risk Management & Compliance', service_provider: '', conversation_opener: 'With your new London and Singapore offices, have you assessed the regulatory compliance landscape across those jurisdictions for data handling and privacy?' },
          { challenge: 'Series C funding and valuation growth increases D&O exposure', trigger_event: '$80M Series C funding round', urgency: 'Medium', relevant_service: 'Directors & Officers Liability', service_provider: '', conversation_opener: 'Post-Series C, your board exposure has changed significantly — is your D&O coverage scaled to your new valuation?' },
        ],
        hr_workforce_challenges: [
          { challenge: 'Aggressive hiring in competitive talent market', trigger_event: '45 open positions across engineering and sales', urgency: 'High', relevant_service: 'Total Rewards & Talent Strategy', service_provider: '', conversation_opener: 'With 45 open roles, how are you positioning your total rewards package to compete for top data analytics talent?' },
        ],
        key_sales_nuggets: [
          { nugget: 'New CRO Sarah Chen joined from Snowflake — likely reviewing all vendor relationships', category: 'Leadership Change', source: 'Press Release Sep 2024', talking_point: 'New CROs typically reassess vendor partnerships within their first 90 days. This is an ideal window to introduce relevant advisory capabilities.' },
          { nugget: '$80M Series C with Sequoia backing signals enterprise-grade scaling needs', category: 'Funding', source: 'Crunchbase', talking_point: 'Rapid scaling after Series C typically creates gaps in risk management and employee benefits infrastructure that advisory services can address.' },
        ],
      },
      {
        company_name: 'CyberShield Solutions', selected: true,
        revenue: { figure: '$45M ARR', year: '2024', source: 'Industry Estimate' },
        recent_news: [
          { date: '2024-12-01', headline: 'CyberShield Wins Federal Contract', summary: 'Multi-year contract with Department of Defense valued at $15M.' },
        ],
        csuite_changes: [],
        growth_indicators: [
          { type: 'Funding', detail: 'Series B of $30M closed in Q3 2024' },
        ],
        competitive_intel: { vendors: ['Microsoft Azure'], partners: ['PwC'], competitors: ['CrowdStrike', 'SentinelOne'] },
        risk_insurance_challenges: [
          { challenge: 'Federal contract creates specific cyber liability and compliance requirements', trigger_event: '$15M DoD contract won in Dec 2024', urgency: 'High', relevant_service: 'Cyber Risk & Government Compliance', service_provider: '', conversation_opener: 'Federal contracts come with CMMC and FedRAMP requirements — have you reviewed your cyber insurance coverage to match these new obligations?' },
        ],
        hr_workforce_challenges: [
          { challenge: 'Security clearance requirements limit talent pool for federal work', trigger_event: 'Multi-year DoD contract', urgency: 'Medium', relevant_service: 'Workforce Planning & Security Talent', service_provider: '', conversation_opener: 'Cleared security professionals are in high demand — how are you structuring compensation to attract and retain this specialized talent?' },
        ],
        key_sales_nuggets: [
          { nugget: '$15M DoD contract signals shift from commercial to federal — compliance needs will multiply', category: 'Contract Win', source: 'Press Release Dec 2024', talking_point: 'Federal work requires a different risk profile than commercial cybersecurity. This transition creates immediate needs for specialized risk advisory and compliance services.' },
        ],
      },
    ],
    contacts: [
      {
        company_name: 'DataVault Technologies',
        contacts: [
          { full_name: 'Sarah Chen', title: 'Chief Revenue Officer', seniority: 'C-Suite', email: 'sarah.chen@datavault.example.com', email_status: 'verified', phone: '+1-415-555-0101', linkedin_url: 'https://linkedin.com/in/sarahchen' },
          { full_name: 'Marcus Johnson', title: 'VP of Engineering', seniority: 'VP', email: 'marcus.j@datavault.example.com', email_status: 'verified', phone: '+1-415-555-0102', linkedin_url: 'https://linkedin.com/in/marcusjohnson' },
          { full_name: 'Lisa Park', title: 'Director of Partnerships', seniority: 'Director', email: 'lisa.park@datavault.example.com', email_status: 'unverified', phone: '', linkedin_url: 'https://linkedin.com/in/lisapark' },
        ],
        organization_data: { apollo_id: 'abc123', domain: 'datavault.example.com', employee_count: '750', industry: 'Data Analytics' },
      },
      {
        company_name: 'CyberShield Solutions',
        contacts: [
          { full_name: 'James Wright', title: 'CEO', seniority: 'C-Suite', email: 'james@cybershield.example.com', email_status: 'verified', phone: '+1-512-555-0201', linkedin_url: 'https://linkedin.com/in/jameswright' },
          { full_name: 'Priya Sharma', title: 'VP of Sales', seniority: 'VP', email: 'priya.s@cybershield.example.com', email_status: 'verified', phone: '+1-512-555-0202', linkedin_url: 'https://linkedin.com/in/priyasharma' },
        ],
        organization_data: { apollo_id: 'def456', domain: 'cybershield.example.com', employee_count: '320', industry: 'Cybersecurity' },
      },
    ],
    artifactFiles: [],
    stage: 'completed',
    createdAt: '2024-12-01T10:00:00Z',
    updatedAt: '2024-12-05T14:30:00Z',
    priority_flags: ['DataVault Technologies'],
    searchSummary: 'Found 4 highly relevant companies matching the criteria for enterprise SaaS in data analytics, cloud infrastructure, and cybersecurity sectors across North America.',
    enrichmentTime: 45000,
    enrichmentSummary: 'Successfully enriched 2 companies with comprehensive revenue data, recent news, leadership changes, growth signals, and competitive landscape insights.',
    contactSummary: 'Identified 5 decision-maker contacts across 2 target companies, with 4 verified email addresses.',
    totalContactsFound: 5,
    discoverySources: [
      {
        url: 'https://techcrunch.com/2024/11/15/datavault-series-c',
        title: 'DataVault Technologies Raises $80M Series C to Accelerate Enterprise Analytics',
        date_published: '2024-11-15',
        source_type: 'news article',
        key_finding: 'DataVault Technologies closed an $80M Series C round led by Sequoia Capital. The funding will accelerate their enterprise analytics platform and international expansion. Article also mentions competing analytics firms InsightFlow Analytics and ThoughtSpot as comparisons.',
        companies_found: ['DataVault Technologies', 'InsightFlow Analytics'],
        relevance_rationale: 'Funding announcement reveals high-growth data analytics company with enterprise focus and strong VC backing — directly matches the directive for enterprise SaaS in data analytics.',
      },
      {
        url: 'https://defensenews.com/2024/12/cybershield-dod-contract',
        title: 'CyberShield Solutions Wins $15M Multi-Year DoD Contract',
        date_published: '2024-12-01',
        source_type: 'press release',
        key_finding: 'CyberShield Solutions secured a multi-year Department of Defense contract valued at $15M for endpoint security services. The contract validates their federal-grade cybersecurity capabilities and signals a transition from commercial to government markets.',
        companies_found: ['CyberShield Solutions'],
        relevance_rationale: 'Federal contract win demonstrates enterprise-grade capabilities and rapid growth in cybersecurity — a key target vertical per the directive.',
      },
      {
        url: 'https://cloudcomputing-news.net/cloudnexus-2024-review',
        title: '2024 Cloud Infrastructure Leaders: Platforms Reshaping Enterprise IT',
        date_published: '2024-10-22',
        source_type: 'industry report',
        key_finding: 'Annual industry review identifying leading cloud orchestration platforms. CloudNexus Inc highlighted as managing 1000+ enterprise clients with strong partnerships across AWS, Azure, and GCP. Report also mentions 3 emerging competitors in the space.',
        companies_found: ['CloudNexus Inc', 'DataVault Technologies'],
        relevance_rationale: 'Industry analyst report provides authoritative ranking of cloud infrastructure leaders — directly addresses the cloud infrastructure criteria in the directive.',
      },
      {
        url: 'https://saastr.com/insightflow-growth-story-2024',
        title: 'From Startup to Scale: How InsightFlow Analytics Tripled Its Customer Base',
        date_published: '2024-09-18',
        source_type: 'market analysis',
        key_finding: 'Deep dive into InsightFlow Analytics\' growth trajectory: tripled customer base in 12 months, 200% YoY ARR growth, AI-driven business intelligence platform targeting mid-market. Also references DataVault as an upstream data provider partner.',
        companies_found: ['InsightFlow Analytics', 'DataVault Technologies'],
        relevance_rationale: 'Growth case study reveals a rapidly scaling BI company in the data analytics space with strong mid-market traction — matches both the industry focus and growth signals criteria.',
      },
      {
        url: 'https://businessinsider.com/datavault-analytics-growth-2024',
        title: 'Enterprise Data Analytics Market Heats Up: Top Companies to Watch',
        date_published: '2024-10-05',
        source_type: 'news article',
        key_finding: 'Market overview article covering the enterprise data analytics landscape. Features DataVault Technologies as a breakout company, mentions their new CRO Sarah Chen (ex-Snowflake), and lists CyberShield Solutions and CloudNexus Inc as companies in adjacent verticals benefiting from the same enterprise digitization trend.',
        companies_found: ['DataVault Technologies', 'CyberShield Solutions', 'CloudNexus Inc', 'InsightFlow Analytics'],
        relevance_rationale: 'Broad market analysis article identifying multiple companies across SaaS, analytics, and cybersecurity verticals — provides cross-cutting coverage of the directive\'s target sectors.',
      },
      {
        url: 'https://crunchbase.com/organization/cybershield',
        title: 'CyberShield Solutions - Company Profile & Funding History',
        date_published: '2024-12-10',
        source_type: 'company directory',
        key_finding: 'Company profile showing Series B of $30M closed in Q3 2024, 320 employees, Austin TX headquarters. Competitive landscape includes CrowdStrike and SentinelOne. Company focused on endpoint security with expanding federal capabilities.',
        companies_found: ['CyberShield Solutions'],
        relevance_rationale: 'Verified company database providing funding history, headcount, and competitive positioning data — confirms company meets the 200-5000 employee size criteria.',
      },
    ],
  }
}

// ─── LOCALSTORAGE ────────────────────────────────────────────────────────────
function loadCampaigns(): Campaign[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem('prospectiq_campaigns')
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveCampaigns(campaigns: Campaign[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('prospectiq_campaigns', JSON.stringify(campaigns))
  } catch {}
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

// ─── CSV/EXCEL PARSING ──────────────────────────────────────────────────
function parseCSVText(text: string): string[][] {
  const rows: string[][] = []
  let current = ''
  let inQuotes = false
  let row: string[] = []

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        current += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        current += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(current.trim())
        current = ''
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        row.push(current.trim())
        current = ''
        if (row.some(cell => cell.length > 0)) rows.push(row)
        row = []
        if (ch === '\r') i++
      } else {
        current += ch
      }
    }
  }
  // Last row
  row.push(current.trim())
  if (row.some(cell => cell.length > 0)) rows.push(row)

  return rows
}

async function parseXLSXFile(file: File): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        // Dynamically load SheetJS from CDN
        if (!(window as any).XLSX) {
          await new Promise<void>((res, rej) => {
            const script = document.createElement('script')
            script.src = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js'
            script.onload = () => res()
            script.onerror = () => rej(new Error('Failed to load Excel parser. Please use CSV format instead.'))
            document.head.appendChild(script)
          })
        }
        const XLSX = (window as any).XLSX
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
        const rows = jsonData.map(row => row.map((cell: any) => String(cell ?? '').trim()))
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

// Normalize company name for deduplication
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(inc|corp|corporation|ltd|limited|llc|llp|co|company|group|holdings|plc|gmbh|ag|sa|pty|pvt|private)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Deduplicate companies by normalized name, keeping the one with more data
function deduplicateCompanies(companies: Company[]): { deduplicated: Company[]; removedCount: number } {
  const seen = new Map<string, Company>()
  let removedCount = 0

  for (const company of companies) {
    const key = normalizeCompanyName(company.name)
    if (!key) continue

    const existing = seen.get(key)
    if (existing) {
      removedCount++
      // Keep whichever has more filled fields (prefer discovered over uploaded for richer data)
      const existingScore = [existing.industry, existing.hq_location, existing.estimated_size, existing.website, existing.relevance_reasoning].filter(Boolean).length
      const newScore = [company.industry, company.hq_location, company.estimated_size, company.website, company.relevance_reasoning].filter(Boolean).length
      if (newScore > existingScore) {
        seen.set(key, company)
      }
    } else {
      seen.set(key, company)
    }
  }

  return { deduplicated: Array.from(seen.values()), removedCount }
}

// Column mapping types
interface ColumnMapping {
  name: number | null
  industry: number | null
  hq_location: number | null
  estimated_size: number | null
  website: number | null
}

const COMPANY_FIELDS: { key: keyof ColumnMapping; label: string; required: boolean }[] = [
  { key: 'name', label: 'Company Name', required: true },
  { key: 'industry', label: 'Industry', required: false },
  { key: 'hq_location', label: 'HQ Location', required: false },
  { key: 'estimated_size', label: 'Company Size', required: false },
  { key: 'website', label: 'Website', required: false },
]

// Auto-detect column mapping from header row
function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { name: null, industry: null, hq_location: null, estimated_size: null, website: null }
  const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''))

  for (let i = 0; i < lowerHeaders.length; i++) {
    const h = lowerHeaders[i]
    if (!mapping.name && (h.includes('company') || h.includes('name') || h.includes('organization') || h.includes('account'))) {
      mapping.name = i
    } else if (!mapping.industry && (h.includes('industry') || h.includes('sector') || h.includes('vertical'))) {
      mapping.industry = i
    } else if (!mapping.hq_location && (h.includes('location') || h.includes('hq') || h.includes('headquarters') || h.includes('city') || h.includes('country') || h.includes('address'))) {
      mapping.hq_location = i
    } else if (!mapping.estimated_size && (h.includes('size') || h.includes('employee') || h.includes('headcount') || h.includes('staff'))) {
      mapping.estimated_size = i
    } else if (!mapping.website && (h.includes('website') || h.includes('url') || h.includes('domain') || h.includes('web'))) {
      mapping.website = i
    }
  }

  // If no company name column found, default to first column
  if (mapping.name === null && headers.length > 0) {
    mapping.name = 0
  }

  return mapping
}

// ─── FILE UPLOAD COMPONENT ──────────────────────────────────────────────────
function FileUploadPanel({ onImport }: { onImport: (companies: Company[], duplicateCount: number) => void }) {
  const [uploadState, setUploadState] = useState<'idle' | 'parsing' | 'mapping' | 'preview'>('idle')
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState('')
  const [parsedRows, setParsedRows] = useState<string[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({ name: null, industry: null, hq_location: null, estimated_size: null, website: null })
  const [parseError, setParseError] = useState<string | null>(null)
  const [previewCompanies, setPreviewCompanies] = useState<Company[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setParseError(null)
    setUploadState('parsing')
    setFileName(file.name)

    try {
      let rows: string[][]
      const ext = file.name.toLowerCase().split('.').pop()

      if (ext === 'csv' || ext === 'tsv') {
        const text = await file.text()
        rows = parseCSVText(text)
      } else if (ext === 'xlsx' || ext === 'xls') {
        rows = await parseXLSXFile(file)
      } else {
        throw new Error('Unsupported file format. Please upload a CSV or Excel (.xlsx) file.')
      }

      if (rows.length < 2) {
        throw new Error('File appears to be empty or has only a header row.')
      }

      const headerRow = rows[0]
      const dataRows = rows.slice(1).filter(row => row.some(cell => cell.length > 0))

      setHeaders(headerRow)
      setParsedRows(dataRows)

      // Auto-detect column mapping
      const detected = autoDetectMapping(headerRow)
      setMapping(detected)
      setUploadState('mapping')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse file.')
      setUploadState('idle')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be re-uploaded
    e.target.value = ''
  }, [handleFile])

  const applyMapping = useCallback(() => {
    if (mapping.name === null) return

    const companies: Company[] = parsedRows.map(row => ({
      name: row[mapping.name!] || '',
      industry: mapping.industry !== null ? (row[mapping.industry] || '') : '',
      hq_location: mapping.hq_location !== null ? (row[mapping.hq_location] || '') : '',
      estimated_size: mapping.estimated_size !== null ? (row[mapping.estimated_size] || '') : '',
      relevance_score: 0,
      relevance_reasoning: 'Uploaded from file',
      website: mapping.website !== null ? (row[mapping.website] || '') : '',
      source_segment: 'File Upload',
      selected: true,
    })).filter(c => c.name.trim().length > 0)

    setPreviewCompanies(companies)
    setUploadState('preview')
  }, [mapping, parsedRows])

  const confirmImport = useCallback(() => {
    onImport(previewCompanies, 0)
    // Reset state
    setUploadState('idle')
    setFileName('')
    setParsedRows([])
    setHeaders([])
    setPreviewCompanies([])
    setMapping({ name: null, industry: null, hq_location: null, estimated_size: null, website: null })
  }, [previewCompanies, onImport])

  const resetUpload = useCallback(() => {
    setUploadState('idle')
    setFileName('')
    setParsedRows([])
    setHeaders([])
    setPreviewCompanies([])
    setMapping({ name: null, industry: null, hq_location: null, estimated_size: null, website: null })
    setParseError(null)
  }, [])

  const updateMapping = useCallback((field: keyof ColumnMapping, colIndex: number | null) => {
    setMapping(prev => ({ ...prev, [field]: colIndex }))
  }, [])

  return (
    <div className="bg-card rounded-lg border border-border/30 overflow-hidden mb-5">
      <div className="p-4 border-b border-border/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiUpload className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-serif font-semibold text-foreground tracking-wide">Import Company List</h4>
        </div>
        {uploadState !== 'idle' && (
          <button onClick={resetUpload} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <FiX className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      <div className="p-4">
        {/* IDLE STATE - Drop zone */}
        {uploadState === 'idle' && (
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer ${dragActive ? 'border-primary bg-primary/5' : 'border-border/40 hover:border-primary/50 hover:bg-muted/20'}`}
            onDragOver={e => { e.preventDefault(); setDragActive(true) }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.tsv"
              onChange={handleFileInput}
              className="hidden"
            />
            <FiFile className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">
              {dragActive ? 'Drop file here' : 'Drop a CSV or Excel file here'}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse. Supports .csv, .xlsx, .xls formats
            </p>
          </div>
        )}

        {/* PARSING STATE */}
        {uploadState === 'parsing' && (
          <div className="flex items-center gap-3 py-4">
            <FiRefreshCw className="w-5 h-5 text-primary animate-spin" />
            <div>
              <p className="text-sm font-medium text-foreground">Parsing {fileName}...</p>
              <p className="text-xs text-muted-foreground">Detecting columns and reading data</p>
            </div>
          </div>
        )}

        {/* MAPPING STATE - Column mapping UI */}
        {uploadState === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <FiFile className="w-3.5 h-3.5 text-primary" /> {fileName}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{parsedRows.length} rows detected</p>
              </div>
              <InlineBadge variant="accent"><FiColumns className="w-3 h-3 mr-0.5" /> {headers.length} columns</InlineBadge>
            </div>

            <div className="bg-muted/20 rounded-lg p-3 border border-border/20">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Map Columns to Fields</h5>
              <div className="space-y-2.5">
                {COMPANY_FIELDS.map(field => (
                  <div key={field.key} className="flex items-center gap-3">
                    <label className="text-sm text-foreground font-medium w-32 flex-shrink-0 flex items-center gap-1">
                      {field.label}
                      {field.required && <span className="text-red-500 text-xs">*</span>}
                    </label>
                    <select
                      value={mapping[field.key] ?? ''}
                      onChange={e => updateMapping(field.key, e.target.value === '' ? null : Number(e.target.value))}
                      className="flex-1 px-3 py-1.5 rounded-md bg-background border border-border/30 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">-- Skip --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>{h || `Column ${i + 1}`}</option>
                      ))}
                    </select>
                    {mapping[field.key] !== null && (
                      <span className="text-xs text-muted-foreground w-36 truncate flex-shrink-0" title={parsedRows[0]?.[mapping[field.key]!] || ''}>
                        e.g. {parsedRows[0]?.[mapping[field.key]!] || '(empty)'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview of first 3 rows */}
            <div className="bg-muted/10 rounded-lg p-3 border border-border/20">
              <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Data Preview (first 3 rows)</h5>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/20">
                      {headers.map((h, i) => (
                        <th key={i} className={`px-2 py-1 text-left font-medium ${Object.values(mapping).includes(i) ? 'text-primary' : 'text-muted-foreground'}`}>{h || `Col ${i + 1}`}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 3).map((row, ri) => (
                      <tr key={ri} className="border-b border-border/10">
                        {headers.map((_, ci) => (
                          <td key={ci} className={`px-2 py-1 ${Object.values(mapping).includes(ci) ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                            {row[ci] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={resetUpload} className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={applyMapping}
                disabled={mapping.name === null}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Preview Import
              </button>
            </div>
          </div>
        )}

        {/* PREVIEW STATE - Show what will be imported */}
        {uploadState === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{previewCompanies.length} companies ready to import</p>
                <p className="text-xs text-muted-foreground mt-0.5">From {fileName}. Companies will be merged with any existing discovered companies.</p>
              </div>
              <InlineBadge variant="success"><FiCheckCircle className="w-3 h-3 mr-0.5" /> Parsed</InlineBadge>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-border/20">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 sticky top-0">
                  <tr>
                    <th className="px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground">Company</th>
                    <th className="px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground hidden sm:table-cell">Industry</th>
                    <th className="px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Location</th>
                    <th className="px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground hidden lg:table-cell">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {previewCompanies.slice(0, 20).map((c, i) => (
                    <tr key={i} className="border-b border-border/10">
                      <td className="px-3 py-1.5 text-foreground font-medium">{c.name}</td>
                      <td className="px-3 py-1.5 text-muted-foreground hidden sm:table-cell">{c.industry || '-'}</td>
                      <td className="px-3 py-1.5 text-muted-foreground hidden md:table-cell">{c.hq_location || '-'}</td>
                      <td className="px-3 py-1.5 text-muted-foreground hidden lg:table-cell">{c.estimated_size || '-'}</td>
                    </tr>
                  ))}
                  {previewCompanies.length > 20 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-1.5 text-center text-xs text-muted-foreground">...and {previewCompanies.length - 20} more</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setUploadState('mapping')} className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">Back to Mapping</button>
              <button
                onClick={confirmImport}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm flex items-center gap-1.5"
              >
                <FiUpload className="w-3.5 h-3.5" /> Import {previewCompanies.length} Companies
              </button>
            </div>
          </div>
        )}

        {/* Error state */}
        {parseError && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
            <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{parseError}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ERROR BOUNDARY ──────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── STEPPER ─────────────────────────────────────────────────────────────────
function ProgressStepper({ stage }: { stage: Campaign['stage'] }) {
  const steps = [
    { key: 'discovery', label: 'Discovery', icon: FiSearch },
    { key: 'enrichment', label: 'Enrichment', icon: FiDatabase },
    { key: 'marketing', label: 'Marketing', icon: FiTarget },
    { key: 'contacts', label: 'Contacts', icon: FiUsers },
  ]
  const stageOrder = ['discovery', 'enrichment', 'marketing', 'contacts', 'completed']
  const currentIdx = stageOrder.indexOf(stage)

  return (
    <div className="flex items-center justify-center gap-0 mb-6">
      {steps.map((step, i) => {
        const isComplete = currentIdx > i || stage === 'completed'
        const isActive = stageOrder[currentIdx] === step.key
        const Icon = step.icon
        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div className={`h-0.5 w-16 md:w-24 ${isComplete ? 'bg-primary' : 'bg-muted'}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${isComplete ? 'bg-primary text-primary-foreground' : isActive ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 'bg-muted text-muted-foreground'}`}>
                {isComplete ? <FiCheck className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-xs font-medium tracking-wide ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label}</span>
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── SKELETON LOADERS ────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-border/30 animate-pulse">
      <div className="w-4 h-4 rounded bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 bg-muted rounded" />
        <div className="h-3 w-1/2 bg-muted rounded" />
      </div>
      <div className="h-4 w-16 bg-muted rounded" />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-lg bg-card border border-border/30 p-5 space-y-3 animate-pulse">
      <div className="h-5 w-2/3 bg-muted rounded" />
      <div className="h-3 w-1/2 bg-muted rounded" />
      <div className="h-3 w-3/4 bg-muted rounded" />
      <div className="flex gap-2 mt-2">
        <div className="h-6 w-16 bg-muted rounded-full" />
        <div className="h-6 w-20 bg-muted rounded-full" />
      </div>
    </div>
  )
}

// ─── RELEVANCE BAR ───────────────────────────────────────────────────────────
function RelevanceBar({ score }: { score: number }) {
  const pct = Math.min(Math.max((score ?? 0) / 10, 0), 1) * 100
  const color = pct >= 80 ? 'bg-green-600' : pct >= 60 ? 'bg-yellow-600' : 'bg-red-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-muted-foreground">{score ?? 0}/10</span>
    </div>
  )
}

// ─── BADGE ───────────────────────────────────────────────────────────────────
function InlineBadge({ children, variant = 'default' }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'muted' }) {
  const styles: Record<string, string> = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800',
    accent: 'bg-amber-100 text-amber-800',
    muted: 'bg-muted text-muted-foreground',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[variant] ?? styles.default}`}>
      {children}
    </span>
  )
}

// ─── DISCOVERY CATEGORY BADGE ────────────────────────────────────────────────
const CATEGORY_STYLES: Record<string, { variant: 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'muted'; icon: React.ElementType }> = {
  'Recent Funding': { variant: 'success', icon: FiDollarSign },
  'Major News/Development': { variant: 'warning', icon: FiFlag },
  'Industry Leader': { variant: 'accent', icon: FiAward },
  'Rapid Growth': { variant: 'success', icon: FiTrendingUp },
  'Market Expansion': { variant: 'default', icon: FiGlobe },
  'Leadership Change': { variant: 'warning', icon: FiUsers },
  'Strategic Partnership': { variant: 'default', icon: FiBriefcase },
  'Acquisition Target': { variant: 'danger', icon: FiTarget },
  'Emerging Player': { variant: 'accent', icon: FiStar },
  'Regulatory Impact': { variant: 'danger', icon: FiAlertCircle },
  'Directive Match': { variant: 'muted', icon: FiSearch },
}

function DiscoveryCategoryBadge({ category }: { category: string }) {
  const config = CATEGORY_STYLES[category] ?? { variant: 'muted' as const, icon: FiSearch }
  const Icon = config.icon
  return (
    <InlineBadge variant={config.variant}>
      <Icon className="w-3 h-3 mr-0.5" />{category}
    </InlineBadge>
  )
}

// ─── SEARCH VERIFICATION PANEL ──────────────────────────────────────────────
// Displays hard evidence about whether the Researcher agent performed live web
// searches. This panel shows diagnostic data captured from the actual agent response.
function SearchVerificationPanel({ diagnostics }: { diagnostics?: SearchDiagnostics }) {
  const [expanded, setExpanded] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  if (!diagnostics) return null

  const confidenceColors: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    high: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200', dot: 'bg-green-500' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
    low: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500' },
    none: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-500' },
  }
  const colors = confidenceColors[diagnostics.confidenceLevel] ?? confidenceColors.none

  return (
    <div className={`rounded-lg border overflow-hidden mb-5 ${colors.border} ${colors.bg}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${colors.dot}`} />
          <div>
            <div className="flex items-center gap-2">
              <h4 className={`text-sm font-serif font-semibold ${colors.text}`}>
                Search Verification: {diagnostics.confidenceLevel.charAt(0).toUpperCase() + diagnostics.confidenceLevel.slice(1)} Confidence
              </h4>
              <span className="text-xs text-muted-foreground">
                via {diagnostics.pipelinePath === 'direct' ? 'Direct Pipeline' : 'Manager Agent'}
              </span>
            </div>
            <p className={`text-xs mt-0.5 leading-relaxed ${colors.text} opacity-80`}>
              {diagnostics.findingsCount} findings, {diagnostics.urlsWithRealDomains} verified URLs, {diagnostics.uniqueDomains.length} unique domains
              {diagnostics.groundingSignals.length > 0 ? `, ${diagnostics.groundingSignals.length} platform signal(s)` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <FiAlertCircle className={`w-4 h-4 ${colors.text}`} />
          {expanded ? <FiChevronUp className="w-4 h-4 text-muted-foreground" /> : <FiChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Confidence Assessment */}
          <div className="bg-white/60 rounded-lg p-3 border border-border/20">
            <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Assessment</h5>
            <p className="text-xs text-foreground leading-relaxed">{diagnostics.confidenceReason}</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/60 rounded-lg p-3 border border-border/20">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Findings</p>
              <p className="text-lg font-bold text-foreground mt-1">{diagnostics.findingsCount}</p>
              <p className="text-[10px] text-muted-foreground">{diagnostics.hasFindingsArray ? 'structured array' : 'no array found'}</p>
            </div>
            <div className="bg-white/60 rounded-lg p-3 border border-border/20">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">URLs</p>
              <p className="text-lg font-bold text-foreground mt-1">{diagnostics.urlsWithRealDomains}<span className="text-sm font-normal text-muted-foreground">/{diagnostics.totalUrlsReturned}</span></p>
              <p className="text-[10px] text-muted-foreground">real / total returned</p>
            </div>
            <div className="bg-white/60 rounded-lg p-3 border border-border/20">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Unique Domains</p>
              <p className="text-lg font-bold text-foreground mt-1">{diagnostics.uniqueDomains.length}</p>
              <p className="text-[10px] text-muted-foreground">{diagnostics.uniqueDomains.length >= 3 ? 'diverse sources' : 'limited diversity'}</p>
            </div>
            <div className="bg-white/60 rounded-lg p-3 border border-border/20">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recent Dates</p>
              <p className="text-lg font-bold text-foreground mt-1">{diagnostics.datesIn2024OrLater}<span className="text-sm font-normal text-muted-foreground">/{diagnostics.datesFound.length}</span></p>
              <p className="text-[10px] text-muted-foreground">2024+ / total dates</p>
            </div>
          </div>

          {/* Platform Search Signals */}
          <div className="bg-white/60 rounded-lg p-3 border border-border/20">
            <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Platform Search Signals</h5>
            <p className="text-[10px] text-muted-foreground mb-2">
              These signals indicate whether the Lyzr/Gemini platform actually invoked search tools (SERPAPI, Google Search Grounding).
              Their presence in the API response is strong evidence of live search. Their absence does not necessarily mean no search occurred — some platforms strip tool metadata from the response.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Google Grounding Metadata', present: diagnostics.hasGroundingMetadata },
                { label: 'Search Entry Point', present: diagnostics.hasSearchEntryPoint },
                { label: 'Tool Call Traces', present: diagnostics.hasToolCallTraces },
                { label: 'SERPAPI / Search Results', present: diagnostics.hasSerpApiSignals },
              ].map(signal => (
                <div key={signal.label} className="flex items-center gap-2 text-xs">
                  {signal.present ? (
                    <FiCheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  ) : (
                    <FiX className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                  )}
                  <span className={signal.present ? 'text-foreground font-medium' : 'text-muted-foreground'}>{signal.label}</span>
                </div>
              ))}
            </div>
            {diagnostics.groundingSignals.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/20">
                <p className="text-[10px] text-muted-foreground mb-1">Detected signals:</p>
                <div className="flex flex-wrap gap-1">
                  {diagnostics.groundingSignals.map((signal, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-green-100 text-green-800 font-medium">{signal}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Domains Found */}
          {diagnostics.uniqueDomains.length > 0 && (
            <div className="bg-white/60 rounded-lg p-3 border border-border/20">
              <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Domains in Source URLs ({diagnostics.uniqueDomains.length})</h5>
              <div className="flex flex-wrap gap-1.5">
                {diagnostics.uniqueDomains.map((domain, i) => (
                  <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-muted/50 text-foreground font-mono">{domain}</span>
                ))}
              </div>
            </div>
          )}

          {/* Content Quality */}
          <div className="bg-white/60 rounded-lg p-3 border border-border/20">
            <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Content Quality Indicators</h5>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Avg content length per finding: </span>
                <span className="font-medium text-foreground">{diagnostics.averageContentLength} chars</span>
                <span className="text-[10px] text-muted-foreground ml-1">({diagnostics.averageContentLength > 100 ? 'substantive' : diagnostics.averageContentLength > 30 ? 'brief' : 'minimal'})</span>
              </div>
              <div>
                <span className="text-muted-foreground">Findings with company mentions: </span>
                <span className="font-medium text-foreground">{diagnostics.findingsWithCompanyMentions}/{diagnostics.findingsCount}</span>
              </div>
            </div>
          </div>

          {/* Raw Response Inspector */}
          <div>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
            >
              <FiDatabase className="w-3 h-3" />
              {showRaw ? 'Hide' : 'Show'} Raw Response Snippet
              {showRaw ? <FiChevronUp className="w-3 h-3" /> : <FiChevronDown className="w-3 h-3" />}
            </button>
            {showRaw && (
              <div className="mt-2 bg-white/60 rounded-lg border border-border/20 overflow-hidden">
                <div className="p-2 border-b border-border/20 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    First 3000 chars of Researcher raw response (Agent: {diagnostics.researcherAgentId})
                  </span>
                  <span className="text-[10px] text-muted-foreground">{diagnostics.capturedAt}</span>
                </div>
                <pre className="p-3 text-[10px] text-foreground/80 font-mono whitespace-pre-wrap break-all max-h-[300px] overflow-y-auto leading-relaxed">
                  {diagnostics.rawResponseSnippet}
                </pre>
              </div>
            )}
          </div>

          {/* Honest Disclaimer */}
          <div className="text-[10px] text-muted-foreground leading-relaxed border-t border-border/20 pt-3">
            <strong>What this panel measures:</strong> Whether the agent&apos;s raw API response contains evidence of live web search execution.
            SERPAPI (Composio integration) and Google Search Grounding (Gemini-native) are configured on the Discovery Researcher agent.
            If platform signals are absent, it may mean (a) the platform stripped tool metadata from responses, (b) tools were configured but not invoked for this query, or (c) the agent generated output from training data.
            The most reliable evidence is diverse, real domains in source URLs combined with recent dates and substantive content.
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SOURCE PROVENANCE PANEL ─────────────────────────────────────────────────
const SOURCE_TYPE_ICONS: Record<string, React.ElementType> = {
  'news article': FiFlag,
  'industry report': FiBarChart2,
  'press release': FiEdit3,
  'funding announcement': FiDollarSign,
  'market analysis': FiTrendingUp,
  'company directory': FiDatabase,
  'analyst report': FiAward,
  'regulatory filing': FiAlertCircle,
  'other': FiGlobe,
}

function SourceProvenancePanel({ sources, companies }: { sources: DiscoverySource[]; companies: Company[] }) {
  const [expandedSource, setExpandedSource] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  if (!Array.isArray(sources) || sources.length === 0) return null

  // Sort by number of companies found (most productive sources first)
  const sorted = [...sources].sort((a, b) => (b.companies_found?.length ?? 0) - (a.companies_found?.length ?? 0))
  const displayed = showAll ? sorted : sorted.slice(0, 8)
  const totalCompaniesFromSources = new Set(sources.flatMap(s => Array.isArray(s.companies_found) ? s.companies_found : [])).size

  return (
    <div className="bg-card rounded-lg border border-border/30 overflow-hidden mb-5">
      <div className="p-4 border-b border-border/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FiExternalLink className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-serif font-semibold text-foreground tracking-wide">Discovery Sources</h4>
            <InlineBadge variant="default">{sources.length} sources</InlineBadge>
          </div>
          <span className="text-xs text-muted-foreground">{totalCompaniesFromSources} unique companies traced to sources</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 ml-6">Every source used in discovery, what was found there, and which companies were identified.</p>
      </div>

      <div className="divide-y divide-border/20">
        {displayed.map((source, idx) => {
          const isExpanded = expandedSource === (source.url || `source-${idx}`)
          const sourceKey = source.url || `source-${idx}`
          const companiesFromThis = Array.isArray(source.companies_found) ? source.companies_found : []
          const TypeIcon = SOURCE_TYPE_ICONS[source.source_type] ?? FiGlobe
          let displayUrl = source.url
          try { displayUrl = new URL(source.url).hostname + new URL(source.url).pathname.slice(0, 50) } catch {}

          // Check which found companies are actually in the campaign's company list
          const companyNames = new Set(companies.map(c => c.name.toLowerCase()))
          const matchedCompanies = companiesFromThis.filter(name => companyNames.has(name.toLowerCase()))
          const unmatchedCompanies = companiesFromThis.filter(name => !companyNames.has(name.toLowerCase()))

          return (
            <div key={sourceKey} className="hover:bg-muted/10 transition-colors">
              <button
                onClick={() => setExpandedSource(isExpanded ? null : sourceKey)}
                className="w-full p-4 text-left flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <TypeIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground leading-snug">{source.title || displayUrl}</p>
                      {source.title && source.url && (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-0.5"
                        >
                          <FiExternalLink className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{displayUrl}</span>
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <InlineBadge variant={companiesFromThis.length >= 5 ? 'success' : companiesFromThis.length >= 2 ? 'accent' : 'muted'}>
                        <HiOutlineBuildingOffice2 className="w-3 h-3 mr-0.5" />{companiesFromThis.length} {companiesFromThis.length === 1 ? 'company' : 'companies'}
                      </InlineBadge>
                      {isExpanded ? <FiChevronUp className="w-4 h-4 text-muted-foreground" /> : <FiChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Key finding preview — always visible */}
                  {source.key_finding && (
                    <p className={`text-xs text-muted-foreground mt-1.5 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>{source.key_finding}</p>
                  )}

                  {/* Compact company pills — always visible */}
                  {!isExpanded && companiesFromThis.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {companiesFromThis.slice(0, 6).map((name, ci) => (
                        <span key={ci} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted/50 text-foreground font-medium">{name}</span>
                      ))}
                      {companiesFromThis.length > 6 && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted/50 text-muted-foreground">+{companiesFromThis.length - 6} more</span>
                      )}
                    </div>
                  )}
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 ml-11 space-y-3">
                  {/* Source metadata */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {source.source_type && source.source_type !== 'other' && (
                      <span className="flex items-center gap-1"><TypeIcon className="w-3 h-3" /> {source.source_type}</span>
                    )}
                    {source.date_published && source.date_published !== 'Unknown' && (
                      <span className="flex items-center gap-1"><FiClock className="w-3 h-3" /> {source.date_published}</span>
                    )}
                  </div>

                  {/* Relevance rationale */}
                  {source.relevance_rationale && (
                    <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                      <h5 className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Why This Source Matters</h5>
                      <p className="text-xs text-foreground leading-relaxed">{source.relevance_rationale}</p>
                    </div>
                  )}

                  {/* Full key finding */}
                  {source.key_finding && (
                    <div>
                      <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">What Was Found</h5>
                      <p className="text-xs text-foreground leading-relaxed">{source.key_finding}</p>
                    </div>
                  )}

                  {/* Companies found from this source */}
                  {companiesFromThis.length > 0 && (
                    <div>
                      <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Companies Identified ({companiesFromThis.length})
                      </h5>
                      <div className="space-y-1">
                        {matchedCompanies.map((name, ci) => {
                          const company = companies.find(c => c.name.toLowerCase() === name.toLowerCase())
                          return (
                            <div key={ci} className="flex items-center gap-2 text-xs">
                              <FiCheckCircle className="w-3 h-3 text-green-600 flex-shrink-0" />
                              <span className="font-medium text-foreground">{name}</span>
                              {company?.discovery_category && (
                                <DiscoveryCategoryBadge category={company.discovery_category} />
                              )}
                              {company?.relevance_score != null && (
                                <span className="text-muted-foreground">{company.relevance_score}/10</span>
                              )}
                            </div>
                          )
                        })}
                        {unmatchedCompanies.map((name, ci) => (
                          <div key={`unmatched-${ci}`} className="flex items-center gap-2 text-xs">
                            <FiX className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                            <span className="text-muted-foreground">{name}</span>
                            <span className="text-[10px] text-muted-foreground/60 italic">filtered out or deduplicated</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Show more/less toggle */}
      {sorted.length > 8 && (
        <div className="p-3 border-t border-border/20 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-medium text-primary hover:underline flex items-center gap-1 mx-auto"
          >
            {showAll ? (
              <><FiChevronUp className="w-3 h-3" /> Show fewer sources</>
            ) : (
              <><FiChevronDown className="w-3 h-3" /> Show all {sorted.length} sources</>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── AGENT STATUS ────────────────────────────────────────────────────────────
function AgentStatusPanel({ activeAgentId }: { activeAgentId: string | null }) {
  const ENRICHMENT_SUB_IDS = [FINANCIAL_GROWTH_AGENT_ID, NEWS_LEADERSHIP_AGENT_ID, COMPETITIVE_INTEL_AGENT_ID, RISK_WORKFORCE_AGENT_ID]
  const agents = [
    { id: AGENT_CONFIG.discoveryManager.id, name: AGENT_CONFIG.discoveryManager.name, desc: AGENT_CONFIG.discoveryManager.desc, icon: FiTarget, matchIds: [AGENT_CONFIG.discoveryManager.id] },
    { id: AGENT_CONFIG.enrichment.id, name: AGENT_CONFIG.enrichment.name, desc: '4 parallel research agents per company', icon: FiDatabase, matchIds: [AGENT_CONFIG.enrichment.id, ...ENRICHMENT_SUB_IDS] },
    { id: AGENT_CONFIG.contactFinder.id, name: AGENT_CONFIG.contactFinder.name, desc: AGENT_CONFIG.contactFinder.desc, icon: FiUsers, matchIds: [AGENT_CONFIG.contactFinder.id] },
  ]
  return (
    <div className="rounded-lg p-4 mt-auto border-t" style={{ borderColor: 'hsl(35 20% 85%)' }}>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><FiLayers className="w-3.5 h-3.5" /> Agents</h3>
      <div className="space-y-1.5">
        {agents.map(a => {
          const isActive = activeAgentId ? a.matchIds.includes(activeAgentId) : false
          const Icon = a.icon
          return (
            <div key={a.id} className={`flex items-start gap-2 p-1.5 rounded-md text-xs transition-all ${isActive ? 'bg-primary/10' : ''}`}>
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${isActive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30'}`} />
              <div className="min-w-0">
                <div className="font-medium text-foreground flex items-center gap-1"><Icon className="w-3 h-3 flex-shrink-0" /> {a.name}</div>
                <p className="text-muted-foreground leading-relaxed truncate">{a.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function AppSidebar({
  campaigns, activeCampaignId, sidebarFilter, onFilterChange, onSelectCampaign, onNewCampaign, onViewDashboard, activeAgentId, collapsed, onToggle
}: {
  campaigns: Campaign[]
  activeCampaignId: string | null
  sidebarFilter: SidebarFilter
  onFilterChange: (f: SidebarFilter) => void
  onSelectCampaign: (id: string) => void
  onNewCampaign: () => void
  onViewDashboard: () => void
  activeAgentId: string | null
  collapsed: boolean
  onToggle: () => void
}) {
  const filtered = useMemo(() => {
    if (sidebarFilter === 'completed') return campaigns.filter(c => c.stage === 'completed')
    if (sidebarFilter === 'in_progress') return campaigns.filter(c => c.stage !== 'completed')
    return campaigns
  }, [campaigns, sidebarFilter])

  return (
    <aside className={`flex-shrink-0 h-screen sticky top-0 flex flex-col transition-all duration-300 border-r ${collapsed ? 'w-16' : 'w-64'}`} style={{ backgroundColor: 'hsl(35 25% 90%)', borderColor: 'hsl(35 20% 85%)' }}>
      <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'hsl(35 20% 85%)' }}>
        {!collapsed && (
          <button onClick={onViewDashboard} className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><FiTarget className="w-4 h-4 text-primary-foreground" /></div>
            <span className="font-serif font-bold text-foreground tracking-wide text-lg group-hover:text-primary transition-colors">ProspectIQ</span>
          </button>
        )}
        {collapsed && (
          <button onClick={onViewDashboard} className="mx-auto">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"><FiTarget className="w-4 h-4 text-primary-foreground" /></div>
          </button>
        )}
        {!collapsed && (
          <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><FiMenu className="w-4 h-4" /></button>
        )}
      </div>

      {collapsed && (
        <div className="flex flex-col items-center gap-2 py-3">
          <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><FiMenu className="w-4 h-4" /></button>
          <button onClick={onNewCampaign} className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90"><FiPlus className="w-4 h-4" /></button>
        </div>
      )}

      {!collapsed && (
        <>
          <div className="p-3">
            <button onClick={onNewCampaign} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <FiPlus className="w-4 h-4" /> New Campaign
            </button>
          </div>

          <div className="px-3 pb-2 flex gap-1">
            {(['all', 'in_progress', 'completed'] as SidebarFilter[]).map(f => (
              <button key={f} onClick={() => onFilterChange(f)} className={`flex-1 px-2 py-1 rounded text-xs font-medium transition-colors ${sidebarFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}>
                {f === 'all' ? 'All' : f === 'in_progress' ? 'Active' : 'Done'}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">No campaigns</p>
            )}
            {filtered.map(c => (
              <button key={c.id} onClick={() => onSelectCampaign(c.id)} className={`w-full text-left p-2.5 rounded-lg mb-1 transition-all text-sm ${activeCampaignId === c.id ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/60'}`}>
                <div className="font-medium text-foreground truncate">{c.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <InlineBadge variant={c.stage === 'completed' ? 'success' : 'accent'}>{c.stage === 'completed' ? 'Completed' : c.stage}</InlineBadge>
                  <span className="text-xs text-muted-foreground">{(c.companies?.length ?? 0)} co.</span>
                </div>
              </button>
            ))}
          </div>

          <AgentStatusPanel activeAgentId={activeAgentId} />
        </>
      )}
    </aside>
  )
}

// ─── DASHBOARD VIEW ──────────────────────────────────────────────────────────
function DashboardView({ campaigns, onSelectCampaign, onNewCampaign, searchTerm, onSearchChange }: {
  campaigns: Campaign[]
  onSelectCampaign: (id: string) => void
  onNewCampaign: () => void
  searchTerm: string
  onSearchChange: (s: string) => void
}) {
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return campaigns
    const term = searchTerm.toLowerCase()
    return campaigns.filter(c => c.name.toLowerCase().includes(term) || c.directive.toLowerCase().includes(term))
  }, [campaigns, searchTerm])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground tracking-wide">Campaigns</h1>
          <p className="text-muted-foreground mt-1 leading-relaxed">Manage your prospecting campaigns and target account lists.</p>
        </div>
        <button onClick={onNewCampaign} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-md self-start">
          <FiPlus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      <div className="relative mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input type="text" placeholder="Search campaigns..." value={searchTerm} onChange={e => onSearchChange(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card border border-border/30 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center mb-6">
            <FiCompass className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-serif font-semibold text-foreground mb-2">No campaigns yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">Create your first prospecting campaign to discover target companies, enrich them with business intelligence, and find verified contacts.</p>
          <button onClick={onNewCampaign} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity shadow-md">
            <FiPlus className="w-4 h-4" /> Create First Campaign
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => {
          const stageLabels: Record<string, string> = { discovery: 'Discovery', enrichment: 'Enrichment', contacts: 'Contacts', completed: 'Completed' }
          return (
            <button key={c.id} onClick={() => onSelectCampaign(c.id)} className="text-left bg-card rounded-lg border border-border/30 p-5 hover:shadow-lg hover:border-primary/30 transition-all group">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-serif font-semibold text-foreground text-base group-hover:text-primary transition-colors leading-snug pr-2">{c.name}</h3>
                <InlineBadge variant={c.stage === 'completed' ? 'success' : 'accent'}>{stageLabels[c.stage] ?? c.stage}</InlineBadge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{c.directive}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><HiOutlineBuildingOffice2 className="w-3.5 h-3.5" /> {c.companies?.length ?? 0} companies</span>
                <span className="flex items-center gap-1"><FiUsers className="w-3.5 h-3.5" /> {c.totalContactsFound ?? 0} contacts</span>
              </div>
              <div className="mt-3 pt-3 border-t border-border/20 text-xs text-muted-foreground flex items-center gap-1">
                <FiClock className="w-3 h-3" /> Updated {new Date(c.updatedAt).toLocaleDateString()}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── NEW CAMPAIGN MODAL ──────────────────────────────────────────────────────
function NewCampaignModal({ open, onClose, onCreate }: {
  open: boolean
  onClose: () => void
  onCreate: (name: string, directive: string, filters: CampaignFilters) => void
}) {
  const [name, setName] = useState('')
  const [directive, setDirective] = useState('')
  const [geography, setGeography] = useState('')
  const [sizeRange, setSizeRange] = useState('')
  const [industries, setIndustries] = useState('')
  const [targetCount, setTargetCount] = useState(50)
  const [showFilters, setShowFilters] = useState(false)

  if (!open) return null

  const handleCreate = () => {
    if (!name.trim() || !directive.trim()) return
    const parsedIndustries = industries.split(',').map(s => s.trim()).filter(Boolean)
    onCreate(name.trim(), directive.trim(), {
      geography: geography.trim() || undefined,
      sizeRange: sizeRange.trim() || undefined,
      industries: parsedIndustries.length > 0 ? parsedIndustries : undefined,
      targetCount,
    })
    setName('')
    setDirective('')
    setGeography('')
    setSizeRange('')
    setIndustries('')
    setTargetCount(50)
    setShowFilters(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-card rounded-xl border border-border/30 shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="p-6 border-b border-border/20">
          <h2 className="text-xl font-serif font-bold text-foreground tracking-wide">New Campaign</h2>
          <p className="text-sm text-muted-foreground mt-1">Define your prospecting criteria to discover target companies.</p>
        </div>
        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Campaign Name *</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Enterprise SaaS Q1 Targets" className="w-full px-3 py-2.5 rounded-lg bg-background border border-border/30 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Business Directive *</label>
            <textarea value={directive} onChange={e => setDirective(e.target.value)} placeholder="Describe your ideal target companies, their characteristics, industry focus, size range, and any specific criteria..." rows={5} className="w-full px-3 py-2.5 rounded-lg bg-background border border-border/30 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none leading-relaxed" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Target Company Count</label>
            <input
              type="number"
              min={1}
              max={1000}
              value={targetCount}
              onChange={e => {
                const val = parseInt(e.target.value, 10)
                if (!isNaN(val) && val > 0) setTargetCount(val)
                else if (e.target.value === '') setTargetCount(0)
              }}
              onBlur={() => { if (targetCount < 1) setTargetCount(50) }}
              placeholder="e.g., 50, 100, 250..."
              className="w-full px-3 py-2.5 rounded-lg bg-background border border-border/30 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="text-xs text-muted-foreground mt-1.5">Enter any number. Higher counts use multi-segment parallel research for broader coverage.</p>
          </div>

          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1 text-sm text-primary font-medium hover:underline">
            <FiFilter className="w-3.5 h-3.5" /> {showFilters ? 'Hide' : 'Show'} Optional Filters
            {showFilters ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showFilters && (
            <div className="space-y-3 pl-3 border-l-2 border-primary/20">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Geography</label>
                <input type="text" value={geography} onChange={e => setGeography(e.target.value)} placeholder="e.g., North America, Europe" className="w-full px-3 py-2 rounded-lg bg-background border border-border/30 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Company Size Range</label>
                <input type="text" value={sizeRange} onChange={e => setSizeRange(e.target.value)} placeholder="e.g., 200-5000 employees" className="w-full px-3 py-2 rounded-lg bg-background border border-border/30 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Industries (comma-separated)</label>
                <input type="text" value={industries} onChange={e => setIndustries(e.target.value)} placeholder="e.g., SaaS, FinTech, HealthTech" className="w-full px-3 py-2 rounded-lg bg-background border border-border/30 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border/20 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleCreate} disabled={!name.trim() || !directive.trim()} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
            Create Campaign
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── DISCOVERY VIEW ──────────────────────────────────────────────────────────
function DiscoveryView({ campaign, onUpdateCampaign, loading, error, onRetry, onEnrich, activeAgentId }: {
  campaign: Campaign
  onUpdateCampaign: (c: Campaign) => void
  loading: boolean
  error: string | null
  onRetry: () => void
  onEnrich: () => void
  activeAgentId: string | null
}) {
  const companies = Array.isArray(campaign.companies) ? campaign.companies : []
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const selectedCount = companies.filter(c => c.selected).length
  const [showUpload, setShowUpload] = useState(false)
  const [lastImportInfo, setLastImportInfo] = useState<{ imported: number; duplicates: number } | null>(null)
  const [sortField, setSortField] = useState<'name' | 'industry' | 'hq_location' | 'estimated_size' | 'relevance_score'>('relevance_score')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const toggleSort = useCallback((field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir(field === 'relevance_score' ? 'desc' : 'asc')
    }
  }, [sortField])

  const sortedCompanies = useMemo(() => {
    const sorted = [...companies].sort((a, b) => {
      let aVal: string | number = ''
      let bVal: string | number = ''
      if (sortField === 'relevance_score') {
        aVal = a.relevance_score ?? 0
        bVal = b.relevance_score ?? 0
      } else {
        aVal = (a[sortField] ?? '').toLowerCase()
        bVal = (b[sortField] ?? '').toLowerCase()
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [companies, sortField, sortDir])

  const handleImport = useCallback((imported: Company[], _duplicateCount: number) => {
    // Merge with existing companies and deduplicate
    const combined = [...companies, ...imported]
    const { deduplicated, removedCount } = deduplicateCompanies(combined)
    setLastImportInfo({ imported: imported.length, duplicates: removedCount })
    onUpdateCampaign({ ...campaign, companies: deduplicated, updatedAt: new Date().toISOString() })
    // Auto-hide upload panel after import
    setTimeout(() => setShowUpload(false), 500)
  }, [companies, campaign, onUpdateCampaign])

  const toggleSelect = (name: string) => {
    const updated = companies.map(c => c.name === name ? { ...c, selected: !c.selected } : c)
    onUpdateCampaign({ ...campaign, companies: updated, updatedAt: new Date().toISOString() })
  }

  const toggleAll = () => {
    const allSelected = companies.length > 0 && companies.every(c => c.selected)
    const updated = companies.map(c => ({ ...c, selected: !allSelected }))
    onUpdateCampaign({ ...campaign, companies: updated, updatedAt: new Date().toISOString() })
  }

  const removeCompany = (name: string) => {
    const updated = companies.filter(c => c.name !== name)
    onUpdateCampaign({ ...campaign, companies: updated, updatedAt: new Date().toISOString() })
  }

  return (
    <div>
      <ProgressStepper stage="discovery" />

      {campaign.searchSummary && (
        <div className="bg-card rounded-lg border border-border/30 p-4 mb-5">
          <div className="flex items-start gap-2">
            <HiOutlineSparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground leading-relaxed">{renderMarkdown(campaign.searchSummary)}</div>
          </div>
          {(campaign.duplicatesRemoved ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground mt-2 ml-7">{campaign.duplicatesRemoved} duplicate companies identified across search segments and removed during extraction.</p>
          )}
        </div>
      )}

      {Array.isArray(campaign.segmentationStrategy) && campaign.segmentationStrategy.length > 0 && (
        <div className="bg-card rounded-lg border border-border/30 p-4 mb-5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <FiLayers className="w-3.5 h-3.5" /> Search Segments & Extraction Results
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {campaign.segmentationStrategy.map((seg, i) => (
              <div key={i} className="bg-muted/30 rounded-lg p-3 text-sm">
                <p className="font-medium text-foreground truncate">{seg.segment_name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-muted-foreground">Target: {seg.target_count}</span>
                  <span className="text-foreground font-medium">Found: {seg.actual_count}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted mt-1.5 overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min((seg.actual_count / Math.max(seg.target_count, 1)) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Verification — hard evidence of whether live web search occurred */}
      {!loading && <SearchVerificationPanel diagnostics={campaign.searchDiagnostics} />}

      {/* Source Provenance Panel — shows what each URL contributed */}
      {!loading && <SourceProvenancePanel sources={campaign.discoverySources ?? []} companies={companies} />}

      {/* Import notification */}
      {lastImportInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <FiCheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              Imported {lastImportInfo.imported} companies.
              {lastImportInfo.duplicates > 0 && ` ${lastImportInfo.duplicates} duplicate${lastImportInfo.duplicates > 1 ? 's' : ''} removed.`}
            </span>
          </div>
          <button onClick={() => setLastImportInfo(null)} className="text-green-700 hover:text-green-800 flex-shrink-0 ml-2">
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload toggle + panel */}
      {!loading && (
        <div className="mb-5">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className={`flex items-center gap-2 text-sm font-medium transition-colors mb-3 ${showUpload ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <FiUpload className="w-4 h-4" />
            {showUpload ? 'Hide Import Panel' : 'Import from CSV / Excel'}
            {showUpload ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showUpload && <FileUploadPanel onImport={handleImport} />}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 text-sm"><FiAlertCircle className="w-4 h-4 flex-shrink-0" /> <span>{error}</span></div>
          <button onClick={onRetry} className="flex items-center gap-1 text-red-700 text-sm font-medium hover:underline flex-shrink-0 ml-2"><FiRefreshCw className="w-3.5 h-3.5" /> Retry</button>
        </div>
      )}

      {loading && (
        <div className="bg-card rounded-lg border border-border/30 overflow-hidden mb-5">
          <div className="p-4 border-b border-border/20 flex items-center gap-2 text-sm text-primary font-medium">
            <FiRefreshCw className="w-4 h-4 animate-spin" /> Hybrid Discovery Pipeline Active
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FiSearch className="w-3 h-3 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Step 1: Web Research</p>
                <p className="text-xs text-muted-foreground">Searching across news, industry reports, directories, and market analyses...</p>
              </div>
            </div>
            <div className="ml-3 w-px h-4 bg-border/40" />
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-muted/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FiLayers className="w-3 h-3 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Step 2: Extract & Score Web Results</p>
                <p className="text-xs text-muted-foreground">Extracting company names from web findings and scoring relevance...</p>
              </div>
            </div>
            <div className="ml-3 w-px h-4 bg-border/40" />
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-muted/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <HiOutlineSparkles className="w-3 h-3 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Step 3: Training Data Complement</p>
                <p className="text-xs text-muted-foreground">Augmenting with known companies from AI training knowledge, then merging and ranking top {campaign.filters?.targetCount ?? 50}</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border/20">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        </div>
      )}

      {!loading && companies.length === 0 && !error && (
        <div className="text-center py-16 bg-card rounded-lg border border-border/30">
          <FiSearch className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-serif font-semibold text-foreground mb-2">Ready to discover companies</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto leading-relaxed">The hybrid Discovery pipeline searches the web for articles and reports, then complements results with AI training knowledge to build a comprehensive list of the top {campaign.filters?.targetCount ?? 50} matches.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={onRetry} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-md">
              <FiSearch className="w-4 h-4" /> Generate Prospect List
            </button>
            <span className="text-xs text-muted-foreground">or</span>
            <button onClick={() => setShowUpload(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border/30 bg-card text-foreground text-sm font-medium hover:bg-muted/30 transition-colors">
              <FiUpload className="w-4 h-4" /> Import from File
            </button>
          </div>
        </div>
      )}

      {companies.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <button onClick={toggleAll} className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
                <FiCheck className="w-3.5 h-3.5" /> {companies.every(c => c.selected) ? 'Deselect All' : 'Select All'}
              </button>
              <span className="text-sm text-muted-foreground">{selectedCount} of {companies.length} selected</span>
              {companies.some(c => c.source_segment === 'Web Search') && (
                <InlineBadge variant="default">
                  <FiGlobe className="w-3 h-3 mr-0.5" />
                  {companies.filter(c => c.source_segment === 'Web Search').length} web
                </InlineBadge>
              )}
              {companies.some(c => c.source_segment === 'Training Data') && (
                <InlineBadge variant="muted">
                  <HiOutlineSparkles className="w-3 h-3 mr-0.5" />
                  {companies.filter(c => c.source_segment === 'Training Data').length} AI
                </InlineBadge>
              )}
              {companies.some(c => c.source_segment === 'File Upload') && (
                <InlineBadge variant="accent">
                  <FiUpload className="w-3 h-3 mr-0.5" />
                  {companies.filter(c => c.source_segment === 'File Upload').length} uploaded
                </InlineBadge>
              )}
            </div>
            <button onClick={onEnrich} disabled={selectedCount === 0 || loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
              <FiArrowRight className="w-4 h-4" /> Enrich Selected ({selectedCount})
            </button>
          </div>

          <div className="bg-card rounded-lg border border-border/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30 text-left">
                    <th className="p-3 w-10"></th>
                    {([
                      { field: 'name' as const, label: 'Company', className: '' },
                      { field: 'industry' as const, label: 'Industry', className: 'hidden md:table-cell' },
                      { field: 'hq_location' as const, label: 'Location', className: 'hidden lg:table-cell' },
                      { field: 'estimated_size' as const, label: 'Size', className: 'hidden lg:table-cell' },
                      { field: 'relevance_score' as const, label: 'Relevance', className: '' },
                    ] as const).map(col => (
                      <th key={col.field} className={`p-3 ${col.className}`}>
                        <button
                          onClick={() => toggleSort(col.field)}
                          className="flex items-center gap-1 font-serif font-semibold text-foreground tracking-wide hover:text-primary transition-colors group"
                        >
                          {col.label}
                          {sortField === col.field ? (
                            sortDir === 'asc' ? <FiChevronUp className="w-3.5 h-3.5 text-primary" /> : <FiChevronDown className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <FiChevronDown className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60" />
                          )}
                        </button>
                      </th>
                    ))}
                    <th className="p-3 font-serif font-semibold text-foreground tracking-wide hidden xl:table-cell">Why Selected</th>
                    <th className="p-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCompanies.map(co => (
                    <React.Fragment key={co.name}>
                      <tr className={`border-b border-border/20 hover:bg-muted/30 transition-colors cursor-pointer ${co.selected ? 'bg-primary/5' : ''}`}>
                        <td className="p-3">
                          <button onClick={(e) => { e.stopPropagation(); toggleSelect(co.name) }} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${co.selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
                            {co.selected && <FiCheck className="w-3 h-3" />}
                          </button>
                        </td>
                        <td className="p-3" onClick={() => setExpandedRow(expandedRow === co.name ? null : co.name)}>
                          <div className="font-medium text-foreground">{co.name}</div>
                          {co.website && (
                            <a href={co.website} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-0.5">
                              <FiGlobe className="w-3 h-3" /> {co.website.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                        </td>
                        <td className="p-3 text-muted-foreground hidden md:table-cell">{co.industry}</td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell"><span className="flex items-center gap-1"><FiMapPin className="w-3 h-3" /> {co.hq_location}</span></td>
                        <td className="p-3 text-muted-foreground hidden lg:table-cell">{co.estimated_size}</td>
                        <td className="p-3"><RelevanceBar score={co.relevance_score} /></td>
                        <td className="p-3 hidden xl:table-cell">
                          <div className="flex items-center gap-1.5">
                            {co.source_segment === 'Training Data' && <InlineBadge variant="muted"><HiOutlineSparkles className="w-3 h-3 mr-0.5" />AI</InlineBadge>}
                            {co.source_segment === 'File Upload' ? <InlineBadge variant="accent"><FiUpload className="w-3 h-3 mr-0.5" />Uploaded</InlineBadge> : co.discovery_category ? <DiscoveryCategoryBadge category={co.discovery_category} /> : co.source_segment && co.source_segment !== 'Training Data' ? <InlineBadge variant="muted">{co.source_segment}</InlineBadge> : !co.source_segment ? <span className="text-xs text-muted-foreground">-</span> : null}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setExpandedRow(expandedRow === co.name ? null : co.name)} className="p-1 rounded hover:bg-muted text-muted-foreground">
                              {expandedRow === co.name ? <FiChevronUp className="w-4 h-4" /> : <FiChevronDown className="w-4 h-4" />}
                            </button>
                            <button onClick={() => removeCompany(co.name)} className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600">
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRow === co.name && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-muted/20">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1"><FiTarget className="w-3 h-3" /> Why Selected</h4>
                                {co.discovery_category && (
                                  <div className="mb-2"><DiscoveryCategoryBadge category={co.discovery_category} /></div>
                                )}
                                <p className="text-sm text-foreground leading-relaxed">{co.relevance_reasoning}</p>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Details</h4>
                                <div className="space-y-1 text-sm">
                                  <p><span className="text-muted-foreground">Industry:</span> <span className="text-foreground">{co.industry}</span></p>
                                  <p><span className="text-muted-foreground">Location:</span> <span className="text-foreground">{co.hq_location}</span></p>
                                  <p><span className="text-muted-foreground">Est. Size:</span> <span className="text-foreground">{co.estimated_size}</span></p>
                                  <p><span className="text-muted-foreground">Score:</span> <span className="text-foreground">{co.relevance_score}/10</span></p>
                                  {co.source_segment && <p><span className="text-muted-foreground">Segment:</span> <span className="text-foreground">{co.source_segment}</span></p>}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1"><FiExternalLink className="w-3 h-3" /> Source URLs</h4>
                                {Array.isArray(co.source_urls) && co.source_urls.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {co.source_urls.map((url, ui) => {
                                      let displayUrl = url
                                      try { displayUrl = new URL(url).hostname + new URL(url).pathname.slice(0, 40) } catch {}
                                      return (
                                        <a key={ui} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline group">
                                          <FiExternalLink className="w-3 h-3 flex-shrink-0 group-hover:text-primary" />
                                          <span className="truncate">{displayUrl}</span>
                                        </a>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">No source URLs available</p>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── ENRICHMENT DETAIL PANEL (Consolidated View) ────────────────────────────
function EnrichmentDetailPanel({ ec }: { ec: EnrichedCompany }) {
  const newsCount = Array.isArray(ec.recent_news) ? ec.recent_news.length : 0
  const csuiteCount = Array.isArray(ec.csuite_changes) ? ec.csuite_changes.length : 0
  const growthCount = Array.isArray(ec.growth_indicators) ? ec.growth_indicators.length : 0
  const riskCount = Array.isArray(ec.risk_insurance_challenges) ? ec.risk_insurance_challenges.length : 0
  const hrCount = Array.isArray(ec.hr_workforce_challenges) ? ec.hr_workforce_challenges.length : 0
  const nuggetCount = Array.isArray(ec.key_sales_nuggets) ? ec.key_sales_nuggets.length : 0
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'competitive'>('overview')

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-1 bg-muted/30 rounded-lg p-1">
        {[
          { key: 'overview' as const, label: 'Overview', count: newsCount + csuiteCount + growthCount },
          { key: 'sales' as const, label: 'Sales Intel', count: riskCount + hrCount + nuggetCount },
          { key: 'competitive' as const, label: 'Competitive', count: 0 },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === tab.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
            {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Revenue */}
          {ec.revenue && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1"><FiDollarSign className="w-3 h-3" /> Revenue</h4>
              <div className="bg-muted/30 rounded-lg p-2.5 text-sm">
                <p className="font-semibold text-foreground">{ec.revenue?.figure ?? 'N/A'}</p>
                <p className="text-xs text-muted-foreground">Year: {ec.revenue?.year ?? 'N/A'} | Source: {ec.revenue?.source ?? 'N/A'}</p>
              </div>
            </div>
          )}

          {/* News */}
          {newsCount > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1"><FiFlag className="w-3 h-3" /> Recent News ({newsCount})</h4>
              <div className="space-y-1.5">
                {ec.recent_news.map((n, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-2.5">
                    <div className="flex items-start justify-between gap-1">
                      <h5 className="text-xs font-medium text-foreground leading-snug">{n.headline}</h5>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">{n.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.summary}</p>
                    {n.sales_relevance && (
                      <p className="text-xs text-primary mt-1 flex items-center gap-1"><FiTarget className="w-3 h-3 flex-shrink-0" /> {n.sales_relevance}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* C-Suite */}
          {csuiteCount > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1"><FiUsers className="w-3 h-3" /> Leadership Changes ({csuiteCount})</h4>
              <div className="space-y-1.5">
                {ec.csuite_changes.map((cs, i) => (
                  <div key={i} className="bg-muted/30 rounded-lg p-2.5 text-xs">
                    <p className="font-medium text-foreground">{cs.name}</p>
                    <p className="text-muted-foreground">{cs.previous_role} <FiArrowRight className="w-2.5 h-2.5 inline mx-0.5" /> {cs.new_role}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{cs.date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Growth */}
          {growthCount > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1"><FiTrendingUp className="w-3 h-3" /> Growth Signals ({growthCount})</h4>
              <div className="space-y-1.5">
                {ec.growth_indicators.map((gi, i) => (
                  <div key={i} className="bg-green-50 border border-green-200 rounded-lg px-2.5 py-1.5 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-green-800">{gi.type}:</span>
                      <span className="text-green-700">{gi.detail}</span>
                    </div>
                    {gi.implications && (
                      <p className="text-green-600 mt-0.5 text-[11px]"><FiArrowRight className="w-2.5 h-2.5 inline mr-0.5" />{gi.implications}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {newsCount === 0 && csuiteCount === 0 && growthCount === 0 && !ec.revenue && (
            <p className="text-sm text-muted-foreground italic">No overview data available for this company.</p>
          )}
        </div>
      )}

      {/* SALES INTEL TAB */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          {/* Key Sales Nuggets */}
          {nuggetCount > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1"><FiAward className="w-3 h-3" /> Key Sales Nuggets ({nuggetCount})</h4>
              <div className="space-y-1.5">
                {ec.key_sales_nuggets.map((sn, i) => (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                    <div className="flex items-start gap-2">
                      <FiTarget className="w-3.5 h-3.5 text-amber-700 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-amber-900">{sn.nugget}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <InlineBadge variant="accent">{sn.category}</InlineBadge>
                          <span className="text-[10px] text-amber-700">Source: {sn.source}</span>
                        </div>
                        {sn.talking_point && (
                          <p className="text-[11px] text-amber-800 mt-1 bg-amber-100/50 rounded px-2 py-1 leading-relaxed"><strong>Talking Point:</strong> {sn.talking_point}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk & Insurance Challenges */}
          {riskCount > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1"><FiAlertCircle className="w-3 h-3" /> Risk & Insurance Challenges ({riskCount})</h4>
              <div className="space-y-1.5">
                {ec.risk_insurance_challenges.map((rc, i) => (
                  <div key={i} className="bg-red-50/50 border border-red-200/60 rounded-lg p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">{rc.challenge}</p>
                      <InlineBadge variant={rc.urgency?.toLowerCase() === 'high' ? 'danger' : rc.urgency?.toLowerCase() === 'medium' ? 'warning' : 'muted'}>{rc.urgency || 'N/A'}</InlineBadge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1"><span className="font-medium">Trigger:</span> {rc.trigger_event}</p>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <InlineBadge variant="default">{rc.relevant_service}</InlineBadge>
                    </div>
                    {rc.conversation_opener && (
                      <p className="text-[11px] text-primary mt-1.5 bg-primary/5 rounded px-2 py-1 leading-relaxed"><strong>Opener:</strong> {rc.conversation_opener}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HR & Workforce Challenges */}
          {hrCount > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1"><FiBriefcase className="w-3 h-3" /> HR & Workforce Challenges ({hrCount})</h4>
              <div className="space-y-1.5">
                {ec.hr_workforce_challenges.map((hc, i) => (
                  <div key={i} className="bg-blue-50/50 border border-blue-200/60 rounded-lg p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-foreground">{hc.challenge}</p>
                      <InlineBadge variant={hc.urgency?.toLowerCase() === 'high' ? 'danger' : hc.urgency?.toLowerCase() === 'medium' ? 'warning' : 'muted'}>{hc.urgency || 'N/A'}</InlineBadge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1"><span className="font-medium">Trigger:</span> {hc.trigger_event}</p>
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <InlineBadge variant="success">{hc.relevant_service}</InlineBadge>
                    </div>
                    {hc.conversation_opener && (
                      <p className="text-[11px] text-primary mt-1.5 bg-primary/5 rounded px-2 py-1 leading-relaxed"><strong>Opener:</strong> {hc.conversation_opener}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {riskCount === 0 && hrCount === 0 && nuggetCount === 0 && (
            <p className="text-sm text-muted-foreground italic">No sales intelligence data available for this company.</p>
          )}
        </div>
      )}

      {/* COMPETITIVE TAB */}
      {activeTab === 'competitive' && (
        <div className="space-y-4">
          {ec.competitive_intel && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1"><FiBarChart2 className="w-3 h-3" /> Competitive Landscape</h4>
              <div className="space-y-2">
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Vendors</p>
                  <div className="flex flex-wrap gap-1">{Array.isArray(ec.competitive_intel?.vendors) && ec.competitive_intel.vendors.length > 0 ? ec.competitive_intel.vendors.map((v, i) => <InlineBadge key={i} variant="default">{v}</InlineBadge>) : <span className="text-[10px] text-muted-foreground">None identified</span>}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Partners</p>
                  <div className="flex flex-wrap gap-1">{Array.isArray(ec.competitive_intel?.partners) && ec.competitive_intel.partners.length > 0 ? ec.competitive_intel.partners.map((p, i) => <InlineBadge key={i} variant="success">{p}</InlineBadge>) : <span className="text-[10px] text-muted-foreground">None identified</span>}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-2.5">
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Competitors</p>
                  <div className="flex flex-wrap gap-1">{Array.isArray(ec.competitive_intel?.competitors) && ec.competitive_intel.competitors.length > 0 ? ec.competitive_intel.competitors.map((c, i) => <InlineBadge key={i} variant="warning">{c}</InlineBadge>) : <span className="text-[10px] text-muted-foreground">None identified</span>}</div>
                </div>
              </div>
            </div>
          )}
          {!ec.competitive_intel && (
            <p className="text-sm text-muted-foreground italic">No competitive intelligence available.</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ENRICHMENT VIEW (Consolidated) ─────────────────────────────────────────
function EnrichmentView({ campaign, onUpdateCampaign, loading, error, onRetry, onFindContacts, onMarketingStrategy, enrichmentProgress }: {
  campaign: Campaign
  onUpdateCampaign: (c: Campaign) => void
  loading: boolean
  error: string | null
  onRetry: () => void
  onFindContacts: () => void
  onMarketingStrategy: () => void
  enrichmentProgress?: { current: number; total: number; completed: string[]; inFlight?: string[] } | null
}) {
  const enrichedData = Array.isArray(campaign.enrichedCompanies) ? campaign.enrichedCompanies : []
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const selectedCount = enrichedData.filter(c => c.selected).length

  const toggleSelect = (name: string) => {
    const updated = enrichedData.map(c => c.company_name === name ? { ...c, selected: !c.selected } : c)
    onUpdateCampaign({ ...campaign, enrichedCompanies: updated, updatedAt: new Date().toISOString() })
  }

  const togglePriority = (name: string) => {
    const updated = enrichedData.map(c => c.company_name === name ? { ...c, priority: !c.priority } : c)
    const flags = updated.filter(c => c.priority).map(c => c.company_name)
    onUpdateCampaign({ ...campaign, enrichedCompanies: updated, priority_flags: flags, updatedAt: new Date().toISOString() })
  }

  return (
    <div>
      <ProgressStepper stage="enrichment" />

      {/* Summary */}
      {campaign.enrichmentSummary && (
        <div className="bg-card rounded-lg border border-border/30 p-4 mb-5">
          <div className="flex items-start gap-2">
            <HiOutlineSparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm text-foreground leading-relaxed">{renderMarkdown(campaign.enrichmentSummary)}</div>
              {campaign.enrichmentTime != null && (
                <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1"><FiClock className="w-3 h-3" /> Enrichment completed in {(campaign.enrichmentTime / 1000).toFixed(1)}s (multi-agent pipeline)</p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 text-sm"><FiAlertCircle className="w-4 h-4 flex-shrink-0" /> <span>{error}</span></div>
          <button onClick={onRetry} className="flex items-center gap-1 text-red-700 text-sm font-medium hover:underline flex-shrink-0 ml-2"><FiRefreshCw className="w-3.5 h-3.5" /> Retry</button>
        </div>
      )}

      {loading && (
        <div className="mb-5">
          <div className="flex items-center gap-2 text-sm text-primary font-medium mb-3">
            <FiRefreshCw className="w-4 h-4 animate-spin" />
            {enrichmentProgress
              ? `Deep research: ${enrichmentProgress.current} of ${enrichmentProgress.total} enriched${(enrichmentProgress.inFlight?.length ?? 0) > 0 ? ` | ${enrichmentProgress.inFlight!.length} in progress` : ''}`
              : 'Starting deep company research...'}
          </div>
          {enrichmentProgress && (
            <div className="mb-4">
              <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden mb-3">
                {/* Progress bar: completed portion solid, in-flight portion striped/animated */}
                <div className="h-full flex">
                  <div className="h-full rounded-l-full bg-primary transition-all duration-700 ease-out" style={{ width: `${Math.max((enrichmentProgress.current / Math.max(enrichmentProgress.total, 1)) * 100, 2)}%` }} />
                  {(enrichmentProgress.inFlight?.length ?? 0) > 0 && (
                    <div className="h-full bg-primary/40 animate-pulse transition-all duration-500" style={{ width: `${((enrichmentProgress.inFlight?.length ?? 0) / Math.max(enrichmentProgress.total, 1)) * 100}%` }} />
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {enrichmentProgress.completed.map((name, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <FiCheckCircle className="w-3 h-3" /> {name}
                  </span>
                ))}
                {Array.isArray(enrichmentProgress.inFlight) && enrichmentProgress.inFlight.map((name, i) => (
                  <span key={`inflight-${i}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                    <FiRefreshCw className="w-3 h-3 animate-spin" /> {name}
                  </span>
                ))}
                {enrichmentProgress.current < enrichmentProgress.total && (enrichmentProgress.inFlight?.length ?? 0) === 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary animate-pulse">
                    <FiRefreshCw className="w-3 h-3 animate-spin" /> Queuing...
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {(enrichmentProgress.inFlight?.length ?? 0) > 1
                  ? `${enrichmentProgress.inFlight!.length} companies researching in parallel. Each company fires 4 specialized agents simultaneously (financials, news, competitive, risk & workforce) for maximum speed.`
                  : 'Each company is researched by 4 specialized agents running in parallel — financials & growth, news & leadership, competitive intel, and risk & workforce — then merged into a single enriched profile.'}
              </p>
            </div>
          )}
          {!enrichmentProgress && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1"><FiDatabase className="w-3 h-3" /> {AGENT_CONFIG.enrichment.name}</div>
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          )}
        </div>
      )}

      {!loading && enrichedData.length === 0 && !error && (
        <div className="text-center py-16 bg-card rounded-lg border border-border/30">
          <FiDatabase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-serif font-semibold text-foreground mb-2">No enrichment data yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">Go back to the discovery stage and select companies to enrich. Each company is analyzed by 4 specialized research agents and validated through a sales leader lens.</p>
        </div>
      )}

      {enrichedData.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">{selectedCount} of {enrichedData.length} selected</span>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={onMarketingStrategy} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
                <FiTarget className="w-4 h-4" /> Marketing Strategy
              </button>
              <button onClick={onFindContacts} disabled={selectedCount === 0 || loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card text-foreground border border-border/40 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <FiUsers className="w-4 h-4" /> Find Contacts ({selectedCount})
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {enrichedData.map(ec => {
              const isExpanded = expandedCompany === ec.company_name
              const newsCount = Array.isArray(ec.recent_news) ? ec.recent_news.length : 0
              const csuiteCount = Array.isArray(ec.csuite_changes) ? ec.csuite_changes.length : 0
              const growthCount = Array.isArray(ec.growth_indicators) ? ec.growth_indicators.length : 0
              const riskCount = Array.isArray(ec.risk_insurance_challenges) ? ec.risk_insurance_challenges.length : 0
              const hrCount = Array.isArray(ec.hr_workforce_challenges) ? ec.hr_workforce_challenges.length : 0
              const nuggetCount = Array.isArray(ec.key_sales_nuggets) ? ec.key_sales_nuggets.length : 0
              const salesIntelCount = riskCount + hrCount + nuggetCount

              return (
                <div key={ec.company_name} className={`bg-card rounded-lg border transition-all ${ec.selected ? 'border-primary/40 shadow-md' : 'border-border/30'}`}>
                  <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedCompany(isExpanded ? null : ec.company_name)}>
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(ec.company_name) }} className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${ec.selected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'}`}>
                      {ec.selected && <FiCheck className="w-3 h-3" />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); togglePriority(ec.company_name) }} className={`flex-shrink-0 ${ec.priority ? 'text-amber-500' : 'text-muted-foreground/40'} hover:text-amber-500 transition-colors`}>
                      <FiStar className={`w-4 h-4 ${ec.priority ? 'fill-current' : ''}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-serif font-semibold text-foreground">{ec.company_name}</h3>
                        {ec.revenue?.figure && <InlineBadge variant="accent"><FiDollarSign className="w-3 h-3 mr-0.5" />{ec.revenue.figure}</InlineBadge>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {newsCount > 0 && <InlineBadge variant="muted"><FiFlag className="w-3 h-3 mr-0.5" />{newsCount} news</InlineBadge>}
                        {csuiteCount > 0 && <InlineBadge variant="warning">{csuiteCount} C-suite</InlineBadge>}
                        {growthCount > 0 && <InlineBadge variant="success"><FiTrendingUp className="w-3 h-3 mr-0.5" />{growthCount} growth</InlineBadge>}
                        {salesIntelCount > 0 && <InlineBadge variant="accent"><FiTarget className="w-3 h-3 mr-0.5" />{salesIntelCount} sales intel</InlineBadge>}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? <FiChevronUp className="w-5 h-5 text-muted-foreground" /> : <FiChevronDown className="w-5 h-5 text-muted-foreground" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-border/20 pt-4 px-4 pb-4">
                      <EnrichmentDetailPanel ec={ec} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ─── CONTACTS VIEW ───────────────────────────────────────────────────────────
function ContactsView({ campaign, loading, error, onRetry }: {
  campaign: Campaign
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  const companyContacts = Array.isArray(campaign.contacts) ? campaign.contacts : []
  const artifactFiles = Array.isArray(campaign.artifactFiles) ? campaign.artifactFiles : []
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)

  useEffect(() => {
    if (companyContacts.length > 0 && !expandedCompany) {
      setExpandedCompany(companyContacts[0]?.company_name ?? null)
    }
  }, [companyContacts, expandedCompany])

  const emailStatusBadge = (status: string) => {
    const s = (status ?? '').toLowerCase()
    if (s === 'verified' || s === 'valid') return <InlineBadge variant="success"><FiCheckCircle className="w-3 h-3 mr-0.5" />Verified</InlineBadge>
    if (s === 'unverified' || s === 'guessed') return <InlineBadge variant="warning">Unverified</InlineBadge>
    return <InlineBadge variant="muted">{status || 'Unknown'}</InlineBadge>
  }

  const seniorityBadge = (seniority: string) => {
    const s = (seniority ?? '').toLowerCase()
    if (s.includes('c-suite') || s.includes('c_suite') || s === 'owner' || s === 'founder') return <InlineBadge variant="accent">{seniority}</InlineBadge>
    if (s.includes('vp') || s.includes('vice')) return <InlineBadge variant="default">{seniority}</InlineBadge>
    if (s.includes('director')) return <InlineBadge variant="muted">{seniority}</InlineBadge>
    return <InlineBadge variant="muted">{seniority || 'N/A'}</InlineBadge>
  }

  return (
    <div>
      <ProgressStepper stage="contacts" />

      {campaign.contactSummary && (
        <div className="bg-card rounded-lg border border-border/30 p-4 mb-5">
          <div className="flex items-start gap-2">
            <HiOutlineSparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground leading-relaxed">{renderMarkdown(campaign.contactSummary)}</div>
          </div>
          {(campaign.totalContactsFound ?? 0) > 0 && (
            <div className="mt-2 text-sm font-medium text-primary flex items-center gap-1"><FiUsers className="w-4 h-4" /> Total contacts found: {campaign.totalContactsFound}</div>
          )}
        </div>
      )}

      {artifactFiles.length > 0 && (
        <div className="bg-card rounded-lg border border-border/30 p-4 mb-5">
          <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1 font-serif tracking-wide"><FiDownload className="w-4 h-4" /> Exported Files</h3>
          <div className="space-y-2">
            {artifactFiles.map((f, i) => (
              <a key={i} href={f.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors text-sm text-primary hover:underline">
                <FiDownload className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{f.name || `Export ${i + 1}`}</span>
                {f.format_type && <InlineBadge variant="muted">{f.format_type.toUpperCase()}</InlineBadge>}
              </a>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 text-sm"><FiAlertCircle className="w-4 h-4 flex-shrink-0" /> <span>{error}</span></div>
          <button onClick={onRetry} className="flex items-center gap-1 text-red-700 text-sm font-medium hover:underline flex-shrink-0 ml-2"><FiRefreshCw className="w-3.5 h-3.5" /> Retry</button>
        </div>
      )}

      {loading && (
        <div className="space-y-4 mb-5">
          <div className="flex items-center gap-2 text-sm text-primary font-medium"><FiRefreshCw className="w-4 h-4 animate-spin" /> Finding verified contacts via Apollo...</div>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {!loading && companyContacts.length === 0 && !error && (
        <div className="text-center py-16 bg-card rounded-lg border border-border/30">
          <FiUsers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-serif font-semibold text-foreground mb-2">No contacts found yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">Go back to the enrichment stage and select companies to find contacts for.</p>
        </div>
      )}

      {companyContacts.length > 0 && (
        <div className="space-y-3">
          {companyContacts.map(cc => {
            const contacts = Array.isArray(cc.contacts) ? cc.contacts : []
            const isExpanded = expandedCompany === cc.company_name

            return (
              <div key={cc.company_name} className="bg-card rounded-lg border border-border/30 overflow-hidden">
                <button className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/20 transition-colors" onClick={() => setExpandedCompany(isExpanded ? null : cc.company_name)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <HiOutlineBuildingOffice2 className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-serif font-semibold text-foreground">{cc.company_name}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                        {cc.organization_data?.domain && <span className="flex items-center gap-0.5"><FiGlobe className="w-3 h-3" />{cc.organization_data.domain}</span>}
                        {cc.organization_data?.employee_count && <span className="flex items-center gap-0.5"><FiUsers className="w-3 h-3" />{cc.organization_data.employee_count} emp.</span>}
                        {cc.organization_data?.industry && <span className="flex items-center gap-0.5"><FiBriefcase className="w-3 h-3" />{cc.organization_data.industry}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <InlineBadge variant="default">{contacts.length} contacts</InlineBadge>
                    {isExpanded ? <FiChevronUp className="w-5 h-5 text-muted-foreground" /> : <FiChevronDown className="w-5 h-5 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && contacts.length > 0 && (
                  <div className="border-t border-border/20 divide-y divide-border/20">
                    {contacts.map((ct, ci) => {
                      const initials = (ct.full_name ?? '').split(' ').map(n => (n[0] ?? '').toUpperCase()).join('').slice(0, 2)
                      return (
                        <div key={ci} className="p-4 hover:bg-muted/10 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-semibold text-sm">
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-medium text-foreground">{ct.full_name}</h4>
                                {seniorityBadge(ct.seniority)}
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{ct.title}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
                                {ct.email && (
                                  <span className="flex items-center gap-1 flex-wrap">
                                    <FiMail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                    <a href={`mailto:${ct.email}`} className="text-primary hover:underline break-all">{ct.email}</a>
                                    {emailStatusBadge(ct.email_status)}
                                  </span>
                                )}
                                {ct.phone && (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <FiPhone className="w-3.5 h-3.5 flex-shrink-0" /> {ct.phone}
                                  </span>
                                )}
                                {ct.linkedin_url && (
                                  <a href={ct.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                                    <FiExternalLink className="w-3.5 h-3.5 flex-shrink-0" /> LinkedIn
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}

// ─── MARKETING STRATEGY VIEW ─────────────────────────────────────────────────

function TierBadge({ tier }: { tier: string }) {
  if (tier === 'tier_1_abm') return <InlineBadge variant="accent">Tier 1 ABM</InlineBadge>
  if (tier === 'tier_2_cluster') return <InlineBadge variant="default">Tier 2 Cluster</InlineBadge>
  return <InlineBadge variant="muted">Tier 3 Nurture</InlineBadge>
}

function ScoreBar({ label, value, weight }: { label: string; value: number; weight: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-20 flex-shrink-0">{label} <span className="opacity-60">({weight})</span></span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(value / 10) * 100}%` }} />
      </div>
      <span className="text-[10px] font-medium text-foreground w-6 text-right">{value.toFixed(1)}</span>
    </div>
  )
}

function ContentPreviewPanel({ content, onClose }: { content: CompanyContent; onClose: () => void }) {
  const assets = content.content_assets
  const [contentTab, setContentTab] = useState<'onepager' | 'emails' | 'thought' | 'ads'>('onepager')

  const tabs: { key: typeof contentTab; label: string; available: boolean }[] = [
    { key: 'onepager', label: 'One-Pager', available: !!assets.one_pager },
    { key: 'emails', label: 'Emails', available: !!(Array.isArray(assets.email_sequence) && assets.email_sequence.length > 0) || !!assets.email_template || !!assets.nurture_email },
    { key: 'thought', label: 'Thought Leadership', available: !!assets.thought_leadership },
    { key: 'ads', label: 'Ad Copy', available: Array.isArray(assets.ad_copy) && assets.ad_copy.length > 0 },
  ]

  const availableTabs = tabs.filter(t => t.available)
  const activeTab = availableTabs.find(t => t.key === contentTab) ? contentTab : availableTabs[0]?.key ?? 'onepager'

  return (
    <div className="border-t border-border/20 bg-muted/10">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FiFile className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-semibold text-foreground font-serif">Content Assets: {content.company_name}</h4>
            <TierBadge tier={content.tier} />
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><FiX className="w-4 h-4" /></button>
        </div>

        {availableTabs.length > 1 && (
          <div className="flex gap-1 mb-3 bg-muted/30 rounded-lg p-0.5">
            {availableTabs.map(t => (
              <button key={t.key} onClick={() => setContentTab(t.key)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === t.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
            ))}
          </div>
        )}

        {activeTab === 'onepager' && assets.one_pager && (
          <div className="space-y-3">
            <h5 className="text-base font-serif font-semibold text-foreground">{assets.one_pager.headline}</h5>
            <p className="text-sm text-muted-foreground leading-relaxed">{assets.one_pager.company_context}</p>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Key Challenges</p>
              <ul className="space-y-1">
                {Array.isArray(assets.one_pager.key_challenges) && assets.one_pager.key_challenges.map((c, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-1.5"><FiChevronRight className="w-3 h-3 text-primary mt-1 flex-shrink-0" />{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Proposed Approach</p>
              <p className="text-sm text-foreground leading-relaxed">{assets.one_pager.proposed_approach}</p>
            </div>
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
              <p className="text-sm font-medium text-primary">{assets.one_pager.call_to_action}</p>
            </div>
          </div>
        )}

        {activeTab === 'emails' && (
          <div className="space-y-3">
            {Array.isArray(assets.email_sequence) && assets.email_sequence.map((email, i) => (
              <div key={i} className="bg-card rounded-lg border border-border/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <InlineBadge variant="accent">Touch {email.touch_number}</InlineBadge>
                  <p className="text-sm font-medium text-foreground">{email.subject}</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{email.body}</p>
                <p className="text-xs text-primary mt-2 font-medium">CTA: {email.cta}</p>
              </div>
            ))}
            {assets.email_template && (
              <div className="bg-card rounded-lg border border-border/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <InlineBadge variant="default">Template</InlineBadge>
                  <p className="text-sm font-medium text-foreground">{assets.email_template.subject}</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{assets.email_template.body}</p>
                {Array.isArray(assets.email_template.personalization_fields) && assets.email_template.personalization_fields.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[10px] text-muted-foreground mr-1">Merge fields:</span>
                    {assets.email_template.personalization_fields.map((f, i) => <InlineBadge key={i} variant="muted">{f}</InlineBadge>)}
                  </div>
                )}
              </div>
            )}
            {assets.nurture_email && (
              <div className="bg-card rounded-lg border border-border/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <InlineBadge variant="muted">Nurture</InlineBadge>
                  <p className="text-sm font-medium text-foreground">{assets.nurture_email.subject}</p>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{assets.nurture_email.body}</p>
                <p className="text-xs text-primary mt-2">{assets.nurture_email.value_proposition}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'thought' && assets.thought_leadership && (
          <div className="space-y-3">
            <h5 className="text-base font-serif font-semibold text-foreground">{assets.thought_leadership.title}</h5>
            <p className="text-sm text-muted-foreground leading-relaxed">{assets.thought_leadership.introduction}</p>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Key Insights</p>
              <ul className="space-y-1.5">
                {Array.isArray(assets.thought_leadership.key_insights) && assets.thought_leadership.key_insights.map((ins, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-1.5"><FiChevronRight className="w-3 h-3 text-primary mt-1 flex-shrink-0" />{ins}</li>
                ))}
              </ul>
            </div>
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
              <p className="text-sm text-foreground leading-relaxed">{assets.thought_leadership.conclusion_with_cta}</p>
            </div>
          </div>
        )}

        {activeTab === 'ads' && Array.isArray(assets.ad_copy) && (
          <div className="grid gap-3 sm:grid-cols-2">
            {assets.ad_copy.map((ad, i) => (
              <div key={i} className="bg-card rounded-lg border border-border/30 p-3">
                <InlineBadge variant="muted">Variant {ad.variant}</InlineBadge>
                <h5 className="text-sm font-semibold text-foreground mt-2">{ad.headline}</h5>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ad.body}</p>
                <div className="mt-2">
                  <span className="inline-block px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs font-medium">{ad.cta_text}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {content.generation_notes && (
          <p className="text-[10px] text-muted-foreground mt-3 italic">{content.generation_notes}</p>
        )}
      </div>
    </div>
  )
}

function MarketingView({ campaign, onUpdateCampaign, loading, error, onRetry, onRunStrategy, onGenerateContent, onFindContacts, contentProgress }: {
  campaign: Campaign
  onUpdateCampaign: (c: Campaign) => void
  loading: boolean
  error: string | null
  onRetry: () => void
  onRunStrategy: () => void
  onGenerateContent: () => void
  onFindContacts: () => void
  contentProgress?: { current: number; total: number; completed: string[] } | null
}) {
  const strategy = campaign.marketingStrategy
  const content = Array.isArray(campaign.marketingContent) ? campaign.marketingContent : []
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [contentPreview, setContentPreview] = useState<string | null>(null)
  const [tierFilter, setTierFilter] = useState<'all' | 'tier_1_abm' | 'tier_2_cluster' | 'tier_3_nurture'>('all')
  const [marketingTab, setMarketingTab] = useState<'overview' | 'briefs' | 'playbook' | 'content'>('overview')

  const briefs = Array.isArray(strategy?.account_briefs) ? strategy.account_briefs : []
  const clusters = Array.isArray(strategy?.clusters) ? strategy.clusters : []
  const filteredBriefs = tierFilter === 'all' ? briefs : briefs.filter(b => b.tier === tierFilter)

  const tier1 = briefs.filter(b => b.tier === 'tier_1_abm')
  const tier2 = briefs.filter(b => b.tier === 'tier_2_cluster')
  const tier3 = briefs.filter(b => b.tier === 'tier_3_nurture')

  const playbook = strategy?.execution_playbook
  const ownershipMatrix = Array.isArray(strategy?.ownership_matrix) ? strategy.ownership_matrix : []
  const budgetSummary = strategy?.budget_summary
  const kpis = strategy?.kpis
  const tierMovement = strategy?.tier_movement_rules

  const mktTabs: { key: typeof marketingTab; label: string; icon: React.ElementType; available: boolean }[] = [
    { key: 'overview', label: 'Overview', icon: FiTarget, available: true },
    { key: 'briefs', label: 'Account Briefs', icon: FiBarChart2, available: briefs.length > 0 },
    { key: 'playbook', label: 'Playbook', icon: FiPlay, available: !!playbook },
    { key: 'content', label: 'Content Assets', icon: FiFile, available: content.length > 0 },
  ]

  return (
    <div>
      <ProgressStepper stage="marketing" />

      {/* Summary */}
      {campaign.marketingSummary && (
        <div className="bg-card rounded-lg border border-border/30 p-4 mb-5">
          <div className="flex items-start gap-2">
            <FiTarget className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground leading-relaxed">{renderMarkdown(campaign.marketingSummary)}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 text-sm"><FiAlertCircle className="w-4 h-4 flex-shrink-0" /> <span>{error}</span></div>
          <button onClick={onRetry} className="flex items-center gap-1 text-red-700 text-sm font-medium hover:underline flex-shrink-0 ml-2"><FiRefreshCw className="w-3.5 h-3.5" /> Retry</button>
        </div>
      )}

      {loading && !contentProgress && (
        <div className="mb-5">
          <div className="flex items-center gap-2 text-sm text-primary font-medium mb-3">
            <FiRefreshCw className="w-4 h-4 animate-spin" />
            {strategy ? 'Generating tier-specific marketing content...' : 'Analyzing accounts and building marketing strategy...'}
          </div>
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      )}

      {loading && contentProgress && (
        <div className="mb-5">
          <div className="flex items-center gap-2 text-sm text-primary font-medium mb-3">
            <FiRefreshCw className="w-4 h-4 animate-spin" />
            Generating content: {contentProgress.current} of {contentProgress.total} companies
          </div>
          <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden mb-3">
            <div className="h-full rounded-full bg-primary transition-all duration-700 ease-out" style={{ width: `${Math.max((contentProgress.current / Math.max(contentProgress.total, 1)) * 100, 2)}%` }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {contentProgress.completed.map((name, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <FiCheckCircle className="w-3 h-3" /> {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* No strategy yet — prompt to run */}
      {!loading && !strategy && !error && (
        <div className="text-center py-16 bg-card rounded-lg border border-border/30">
          <FiTarget className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-serif font-semibold text-foreground mb-2">Marketing Strategy</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Score and tier your enriched accounts, identify cross-company clusters, build an execution playbook, and generate targeted marketing content for each tier.
          </p>
          <button onClick={onRunStrategy} disabled={loading || (campaign.enrichedCompanies?.length ?? 0) === 0} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md mx-auto">
            <FiTarget className="w-4 h-4" /> Analyze & Score Accounts
          </button>
          {(campaign.enrichedCompanies?.length ?? 0) === 0 && (
            <p className="text-xs text-muted-foreground mt-3">Complete the enrichment stage first to enable marketing analysis.</p>
          )}
        </div>
      )}

      {/* Strategy results — Tabbed */}
      {strategy && (
        <>
          {/* Tab Navigation */}
          <div className="flex gap-1 mb-5 bg-card rounded-lg p-1 border border-border/30 overflow-x-auto">
            {mktTabs.filter(t => t.available).map(t => {
              const Icon = t.icon
              return (
                <button key={t.key} onClick={() => setMarketingTab(t.key)} className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${marketingTab === t.key ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              )
            })}
          </div>

          {/* ═══ OVERVIEW TAB ═══ */}
          {marketingTab === 'overview' && (
            <>
              {/* Tier Overview Cards */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <button onClick={() => { setTierFilter(tierFilter === 'tier_1_abm' ? 'all' : 'tier_1_abm'); setMarketingTab('briefs') }} className={`bg-card rounded-lg border p-4 text-left transition-all ${tierFilter === 'tier_1_abm' ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-border/30 hover:border-primary/40'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FiStar className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tier 1 ABM</span>
                  </div>
                  <p className="text-2xl font-serif font-bold text-foreground">{tier1.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Personalized 1:1</p>
                </button>
                <button onClick={() => { setTierFilter(tierFilter === 'tier_2_cluster' ? 'all' : 'tier_2_cluster'); setMarketingTab('briefs') }} className={`bg-card rounded-lg border p-4 text-left transition-all ${tierFilter === 'tier_2_cluster' ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-border/30 hover:border-primary/40'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FiLayers className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tier 2 Cluster</span>
                  </div>
                  <p className="text-2xl font-serif font-bold text-foreground">{tier2.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{clusters.length} cluster{clusters.length !== 1 ? 's' : ''} identified</p>
                </button>
                <button onClick={() => { setTierFilter(tierFilter === 'tier_3_nurture' ? 'all' : 'tier_3_nurture'); setMarketingTab('briefs') }} className={`bg-card rounded-lg border p-4 text-left transition-all ${tierFilter === 'tier_3_nurture' ? 'border-primary shadow-md ring-2 ring-primary/20' : 'border-border/30 hover:border-primary/40'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FiMail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tier 3 Nurture</span>
                  </div>
                  <p className="text-2xl font-serif font-bold text-foreground">{tier3.length}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Industry-level nurture</p>
                </button>
              </div>

              {/* Campaign Themes */}
              {Array.isArray(strategy.campaign_themes) && strategy.campaign_themes.length > 0 && (
                <div className="bg-muted/20 rounded-lg p-3 mb-5 border border-border/20">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Campaign Themes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {strategy.campaign_themes.map((theme, i) => <InlineBadge key={i} variant="default">{theme}</InlineBadge>)}
                  </div>
                </div>
              )}

              {/* Playbook Summary (if available) */}
              {playbook && (
                <div className="bg-card rounded-lg border border-border/30 p-4 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-serif font-semibold text-foreground flex items-center gap-1.5"><FiPlay className="w-4 h-4 text-primary" /> Execution Playbook</h3>
                    <button onClick={() => setMarketingTab('playbook')} className="text-xs text-primary hover:underline flex items-center gap-1">View Full Playbook <FiArrowRight className="w-3 h-3" /></button>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{playbook.campaign_name} &mdash; {playbook.total_duration_weeks} weeks, {Array.isArray(playbook.phases) ? playbook.phases.length : 0} phases</p>
                  <div className="flex gap-2 overflow-x-auto">
                    {Array.isArray(playbook.phases) && playbook.phases.map((ph, i) => (
                      <div key={i} className="flex-1 min-w-[140px] bg-muted/20 rounded-lg p-2.5 border border-border/20">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{ph.phase}</span>
                          <span className="text-xs font-semibold text-foreground truncate">{ph.name}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{ph.duration}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{ph.owner}</p>
                      </div>
                    ))}
                  </div>
                  {budgetSummary && (
                    <div className="mt-3 pt-3 border-t border-border/20 flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <FiDollarSign className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Total Budget:</span>
                        <span className="text-xs font-semibold text-foreground">${budgetSummary.total_campaign_budget_usd.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Clusters Section */}
              {clusters.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-sm font-serif font-semibold text-foreground mb-3 flex items-center gap-1.5"><FiLayers className="w-4 h-4 text-primary" /> Account Clusters</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {clusters.map((cl, i) => (
                      <div key={i} className="bg-card rounded-lg border border-border/30 p-3">
                        <h4 className="text-sm font-semibold text-foreground mb-1">{cl.cluster_name}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{cl.theme}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {Array.isArray(cl.company_names) && cl.company_names.map((cn, j) => <InlineBadge key={j} variant="muted">{cn}</InlineBadge>)}
                        </div>
                        <p className="text-[10px] text-primary italic">{cl.recommended_content_angle}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action CTAs */}
              {!loading && (
                <div className="flex flex-wrap gap-3 mb-5">
                  {content.length === 0 && (
                    <div className="flex-1 min-w-[260px] bg-card rounded-lg border border-border/30 p-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground font-serif">Generate Marketing Content</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Tier-specific one-pagers, emails, thought leadership & ads for {briefs.length} accounts.</p>
                      </div>
                      <button onClick={onGenerateContent} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md flex-shrink-0 ml-4">
                        <FiEdit3 className="w-4 h-4" /> Generate Content
                      </button>
                    </div>
                  )}
                  <div className={`${content.length === 0 ? 'min-w-[220px]' : 'flex-1'} bg-card rounded-lg border border-border/30 p-4 flex items-center justify-between`}>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground font-serif">Find Contacts</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Search for decision-maker contacts via Apollo.</p>
                    </div>
                    <button onClick={onFindContacts} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card text-foreground border border-border/40 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50 flex-shrink-0 ml-4">
                      <FiUsers className="w-4 h-4" /> Find Contacts
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ═══ ACCOUNT BRIEFS TAB ═══ */}
          {marketingTab === 'briefs' && (
            <>
              {/* Tier filter */}
              <div className="flex gap-2 mb-4">
                {(['all', 'tier_1_abm', 'tier_2_cluster', 'tier_3_nurture'] as const).map(t => {
                  const label = t === 'all' ? `All (${briefs.length})` : t === 'tier_1_abm' ? `Tier 1 (${tier1.length})` : t === 'tier_2_cluster' ? `Tier 2 (${tier2.length})` : `Tier 3 (${tier3.length})`
                  return (
                    <button key={t} onClick={() => setTierFilter(t)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tierFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                      {label}
                    </button>
                  )
                })}
              </div>

              <div className="space-y-2">
                {filteredBriefs.map(brief => {
                  const isExpanded = expandedCompany === brief.company_name
                  const compContent = content.find(c => c.company_name === brief.company_name)
                  const showingContent = contentPreview === brief.company_name && compContent

                  return (
                    <div key={brief.company_name} className={`bg-card rounded-lg border transition-all ${brief.tier === 'tier_1_abm' ? 'border-amber-300/50' : 'border-border/30'}`}>
                      <button className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/10 transition-colors" onClick={() => { setExpandedCompany(isExpanded ? null : brief.company_name); setContentPreview(null) }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${brief.tier === 'tier_1_abm' ? 'bg-amber-100 text-amber-700' : brief.tier === 'tier_2_cluster' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {brief.scores.weighted_score.toFixed(1)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-serif font-semibold text-foreground truncate">{brief.company_name}</h4>
                              <TierBadge tier={brief.tier} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{brief.tier_rationale}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {compContent && (
                            <button onClick={(e) => { e.stopPropagation(); setContentPreview(showingContent ? null : brief.company_name); setExpandedCompany(brief.company_name) }} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                              <FiFile className="w-3 h-3" /> Content
                            </button>
                          )}
                          {isExpanded ? <FiChevronUp className="w-5 h-5 text-muted-foreground" /> : <FiChevronDown className="w-5 h-5 text-muted-foreground" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border/20 p-4 space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Score Breakdown</p>
                            <div className="space-y-1.5">
                              <ScoreBar label="Signal" value={brief.scores.signal_density} weight="25%" />
                              <ScoreBar label="Strat. Fit" value={brief.scores.strategic_fit} weight="35%" />
                              <ScoreBar label="Timing" value={brief.scores.timing} weight="25%" />
                              <ScoreBar label="Scale" value={brief.scores.scale_indicator} weight="15%" />
                            </div>
                            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/20">
                              <span className="text-xs font-medium text-foreground">Weighted Score:</span>
                              <span className={`text-sm font-bold ${brief.scores.weighted_score >= 7 ? 'text-amber-600' : brief.scores.weighted_score >= 4.5 ? 'text-primary' : 'text-muted-foreground'}`}>{brief.scores.weighted_score.toFixed(2)}</span>
                            </div>
                          </div>
                          {Array.isArray(brief.key_angles) && brief.key_angles.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Key Selling Angles</p>
                              <ul className="space-y-1">
                                {brief.key_angles.map((angle, i) => (
                                  <li key={i} className="text-sm text-foreground flex items-start gap-1.5"><FiChevronRight className="w-3 h-3 text-primary mt-1 flex-shrink-0" />{angle}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {Array.isArray(brief.priority_signals) && brief.priority_signals.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Priority Signals</p>
                              <div className="flex flex-wrap gap-1.5">
                                {brief.priority_signals.map((sig, i) => <InlineBadge key={i} variant="warning">{sig}</InlineBadge>)}
                              </div>
                            </div>
                          )}
                          {Array.isArray(brief.channel_strategy) && brief.channel_strategy.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Channel Strategy</p>
                              <div className="flex flex-wrap gap-1.5">
                                {brief.channel_strategy.map((ch, i) => <InlineBadge key={i} variant="success">{ch.replace(/_/g, ' ')}</InlineBadge>)}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {showingContent && compContent && <ContentPreviewPanel content={compContent} onClose={() => setContentPreview(null)} />}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* ═══ PLAYBOOK TAB ═══ */}
          {marketingTab === 'playbook' && playbook && (
            <>
              {/* Campaign Header */}
              <div className="bg-card rounded-lg border border-border/30 p-4 mb-5">
                <h3 className="text-base font-serif font-semibold text-foreground mb-1">{playbook.campaign_name}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><FiCalendar className="w-3.5 h-3.5" /> {playbook.total_duration_weeks} weeks</span>
                  <span className="flex items-center gap-1"><FiActivity className="w-3.5 h-3.5" /> {Array.isArray(playbook.phases) ? playbook.phases.length : 0} phases</span>
                  {budgetSummary && <span className="flex items-center gap-1"><FiDollarSign className="w-3.5 h-3.5" /> ${budgetSummary.total_campaign_budget_usd.toLocaleString()} total budget</span>}
                </div>
              </div>

              {/* Campaign Timeline */}
              <div className="mb-6">
                <h3 className="text-sm font-serif font-semibold text-foreground mb-3 flex items-center gap-1.5"><FiCalendar className="w-4 h-4 text-primary" /> Campaign Timeline</h3>
                <div className="relative">
                  {/* Timeline connector */}
                  <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-border/40" />
                  <div className="space-y-4">
                    {Array.isArray(playbook.phases) && playbook.phases.map((phase, pi) => (
                      <PhaseCard key={pi} phase={phase} phaseIndex={pi} totalPhases={playbook.phases.length} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Summary Cards Row: Budget, KPIs, Ownership */}
              <div className="grid gap-4 sm:grid-cols-3 mb-6">
                {/* Budget Summary Card */}
                {budgetSummary && (
                  <div className="bg-card rounded-lg border border-border/30 p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><FiDollarSign className="w-3.5 h-3.5 text-primary" /> Budget Summary</h4>
                    <div className="space-y-2">
                      {budgetSummary.linkedin_ads?.tier_1_account_targeting && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Tier 1 LinkedIn</span>
                          <span className="text-xs font-medium text-foreground">${(budgetSummary.linkedin_ads.tier_1_account_targeting.total ?? budgetSummary.linkedin_ads.tier_1_account_targeting.total_budget_usd ?? 0).toLocaleString()}</span>
                        </div>
                      )}
                      {budgetSummary.linkedin_ads?.tier_2_cluster_promotion && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Tier 2 LinkedIn</span>
                          <span className="text-xs font-medium text-foreground">${(budgetSummary.linkedin_ads.tier_2_cluster_promotion.total ?? budgetSummary.linkedin_ads.tier_2_cluster_promotion.total_budget_usd ?? 0).toLocaleString()}</span>
                        </div>
                      )}
                      {budgetSummary.linkedin_ads?.tier_3_broad_awareness && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Tier 3 LinkedIn</span>
                          <span className="text-xs font-medium text-foreground">${(budgetSummary.linkedin_ads.tier_3_broad_awareness.total ?? budgetSummary.linkedin_ads.tier_3_broad_awareness.total_budget_usd ?? 0).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="border-t border-border/20 pt-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Total</span>
                        <span className="text-sm font-bold text-primary">${budgetSummary.total_campaign_budget_usd.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* KPIs Card */}
                {kpis && (
                  <div className="bg-card rounded-lg border border-border/30 p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><FiActivity className="w-3.5 h-3.5 text-primary" /> Key Performance Indicators</h4>
                    <div className="space-y-2.5">
                      {kpis.tier_1 && (
                        <div>
                          <div className="flex items-center gap-1 mb-0.5"><FiStar className="w-3 h-3 text-amber-500" /><span className="text-[10px] font-semibold text-muted-foreground uppercase">Tier 1</span></div>
                          <p className="text-xs text-foreground">{kpis.tier_1.primary_metric}{kpis.tier_1.target ? ` (${kpis.tier_1.target})` : ''}</p>
                        </div>
                      )}
                      {kpis.tier_2 && (
                        <div>
                          <div className="flex items-center gap-1 mb-0.5"><FiLayers className="w-3 h-3 text-primary" /><span className="text-[10px] font-semibold text-muted-foreground uppercase">Tier 2</span></div>
                          <p className="text-xs text-foreground">{kpis.tier_2.primary_metric}{kpis.tier_2.target ? ` (${kpis.tier_2.target})` : ''}</p>
                        </div>
                      )}
                      {kpis.tier_3 && (
                        <div>
                          <div className="flex items-center gap-1 mb-0.5"><FiMail className="w-3 h-3 text-muted-foreground" /><span className="text-[10px] font-semibold text-muted-foreground uppercase">Tier 3</span></div>
                          <p className="text-xs text-foreground">{kpis.tier_3.primary_metric}{kpis.tier_3.target ? ` (${kpis.tier_3.target})` : ''}</p>
                        </div>
                      )}
                      {kpis.overall_campaign && (
                        <div className="border-t border-border/20 pt-2">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Overall</span>
                          {kpis.overall_campaign.reporting_cadence && <p className="text-[10px] text-muted-foreground">Reporting: {kpis.overall_campaign.reporting_cadence}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tier Movement Card */}
                {tierMovement && (
                  <div className="bg-card rounded-lg border border-border/30 p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><FiRepeat className="w-3.5 h-3.5 text-primary" /> Tier Movement Rules</h4>
                    <div className="space-y-2.5">
                      {tierMovement.upgrade_to_tier_1 && (
                        <div>
                          <div className="flex items-center gap-1 mb-0.5">
                            <FiTrendingUp className="w-3 h-3 text-green-600" />
                            <span className="text-[10px] font-semibold text-green-700">Upgrade to Tier 1</span>
                          </div>
                          {Array.isArray(tierMovement.upgrade_to_tier_1.triggers) && tierMovement.upgrade_to_tier_1.triggers.map((t, i) => (
                            <p key={i} className="text-[10px] text-muted-foreground ml-4">- {t}</p>
                          ))}
                        </div>
                      )}
                      {tierMovement.upgrade_to_tier_2 && (
                        <div>
                          <div className="flex items-center gap-1 mb-0.5">
                            <FiTrendingUp className="w-3 h-3 text-blue-600" />
                            <span className="text-[10px] font-semibold text-blue-700">Upgrade to Tier 2</span>
                          </div>
                          {Array.isArray(tierMovement.upgrade_to_tier_2.triggers) && tierMovement.upgrade_to_tier_2.triggers.map((t, i) => (
                            <p key={i} className="text-[10px] text-muted-foreground ml-4">- {t}</p>
                          ))}
                        </div>
                      )}
                      {tierMovement.downgrade_to_tier_2 && (
                        <div>
                          <div className="flex items-center gap-1 mb-0.5">
                            <FiChevronDown className="w-3 h-3 text-orange-500" />
                            <span className="text-[10px] font-semibold text-orange-600">Downgrade to Tier 2</span>
                          </div>
                          {Array.isArray(tierMovement.downgrade_to_tier_2.triggers) && tierMovement.downgrade_to_tier_2.triggers.map((t, i) => (
                            <p key={i} className="text-[10px] text-muted-foreground ml-4">- {t}</p>
                          ))}
                        </div>
                      )}
                      {tierMovement.remove_from_campaign && (
                        <div>
                          <div className="flex items-center gap-1 mb-0.5">
                            <FiX className="w-3 h-3 text-red-500" />
                            <span className="text-[10px] font-semibold text-red-600">Remove</span>
                          </div>
                          {Array.isArray(tierMovement.remove_from_campaign.triggers) && tierMovement.remove_from_campaign.triggers.map((t, i) => (
                            <p key={i} className="text-[10px] text-muted-foreground ml-4">- {t}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Ownership Matrix */}
              {ownershipMatrix.length > 0 && (
                <div className="bg-card rounded-lg border border-border/30 p-4 mb-5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5"><FiUserCheck className="w-3.5 h-3.5 text-primary" /> Ownership Matrix</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/30">
                          <th className="text-left py-2 pr-3 font-semibold text-muted-foreground uppercase tracking-wider">Activity</th>
                          <th className="text-left py-2 pr-3 font-semibold text-muted-foreground uppercase tracking-wider">Owner</th>
                          <th className="text-left py-2 pr-3 font-semibold text-muted-foreground uppercase tracking-wider">Support</th>
                          <th className="text-left py-2 pr-3 font-semibold text-muted-foreground uppercase tracking-wider">Tools</th>
                          <th className="text-left py-2 font-semibold text-muted-foreground uppercase tracking-wider">Tier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ownershipMatrix.map((entry, i) => (
                          <tr key={i} className="border-b border-border/10">
                            <td className="py-2 pr-3 text-foreground font-medium">{entry.activity}</td>
                            <td className="py-2 pr-3">
                              <InlineBadge variant={entry.owner === 'Marketing' ? 'accent' : entry.owner === 'Sales' ? 'default' : 'muted'}>{entry.owner}</InlineBadge>
                            </td>
                            <td className="py-2 pr-3 text-muted-foreground">{entry.support}</td>
                            <td className="py-2 pr-3 text-muted-foreground">{entry.tools}</td>
                            <td className="py-2 text-muted-foreground">{entry.tier}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Playbook not available yet */}
          {marketingTab === 'playbook' && !playbook && (
            <div className="text-center py-12 bg-card rounded-lg border border-border/30">
              <FiPlay className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="text-sm font-serif font-semibold text-foreground mb-1">Execution Playbook</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">The execution playbook was not generated with this strategy. Re-run the strategy analysis to generate a full campaign playbook.</p>
              <button onClick={onRunStrategy} disabled={loading} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md mx-auto">
                <FiRefreshCw className="w-4 h-4" /> Re-analyze with Playbook
              </button>
            </div>
          )}

          {/* ═══ CONTENT ASSETS TAB ═══ */}
          {marketingTab === 'content' && (
            <>
              {content.length === 0 && !loading && (
                <div className="text-center py-12 bg-card rounded-lg border border-border/30">
                  <FiFile className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-sm font-serif font-semibold text-foreground mb-1">No Content Generated</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">Generate tier-specific marketing content for your accounts.</p>
                  <button onClick={onGenerateContent} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md mx-auto">
                    <FiEdit3 className="w-4 h-4" /> Generate Content
                  </button>
                </div>
              )}
              {content.length > 0 && (
                <div className="space-y-3">
                  {content.map((cc, i) => (
                    <div key={i} className="bg-card rounded-lg border border-border/30">
                      <button className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/10 transition-colors" onClick={() => setContentPreview(contentPreview === cc.company_name ? null : cc.company_name)}>
                        <div className="flex items-center gap-2">
                          <FiFile className="w-4 h-4 text-primary" />
                          <h4 className="text-sm font-serif font-semibold text-foreground">{cc.company_name}</h4>
                          <TierBadge tier={cc.tier} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">
                            {[cc.content_assets.one_pager ? 'One-Pager' : null, Array.isArray(cc.content_assets.email_sequence) && cc.content_assets.email_sequence.length > 0 ? 'Emails' : null, cc.content_assets.thought_leadership ? 'Thought Leadership' : null, Array.isArray(cc.content_assets.ad_copy) && cc.content_assets.ad_copy.length > 0 ? 'Ads' : null].filter(Boolean).join(' / ')}
                          </span>
                          {contentPreview === cc.company_name ? <FiChevronUp className="w-4 h-4 text-muted-foreground" /> : <FiChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>
                      {contentPreview === cc.company_name && <ContentPreviewPanel content={cc} onClose={() => setContentPreview(null)} />}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── PHASE CARD (for Playbook timeline) ───────────────────────────────────────
function PhaseCard({ phase, phaseIndex, totalPhases }: { phase: PlaybookPhase; phaseIndex: number; totalPhases: number }) {
  const [expanded, setExpanded] = useState(phaseIndex === 0)

  const ownerColor = phase.owner === 'Marketing' ? 'text-blue-700 bg-blue-100' : phase.owner === 'Sales' ? 'text-green-700 bg-green-100' : 'text-purple-700 bg-purple-100'
  const phaseColor = phaseIndex === 0 ? 'bg-blue-500' : phaseIndex === 1 ? 'bg-green-500' : 'bg-purple-500'

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div className={`absolute left-2.5 top-4 w-3 h-3 rounded-full ${phaseColor} border-2 border-background z-10`} />

      <div className="bg-card rounded-lg border border-border/30 overflow-hidden">
        <button className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/10 transition-colors" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-3 min-w-0">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${phaseColor} text-white flex-shrink-0`}>{phase.phase}</span>
            <div className="min-w-0">
              <h4 className="text-sm font-serif font-semibold text-foreground">{phase.name}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground">{phase.duration}</span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${ownerColor}`}>{phase.owner}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className="text-[10px] text-muted-foreground">{Array.isArray(phase.actions) ? phase.actions.length : 0} actions</span>
            {expanded ? <FiChevronUp className="w-4 h-4 text-muted-foreground" /> : <FiChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>

        {expanded && (
          <div className="border-t border-border/20 p-4">
            <p className="text-sm text-muted-foreground mb-4">{phase.objective}</p>

            <div className="space-y-3">
              {Array.isArray(phase.actions) && phase.actions.map((action, ai) => (
                <ActionItem key={ai} action={action} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ACTION ITEM (for Playbook phase actions) ─────────────────────────────────
function ActionItem({ action }: { action: PlaybookAction }) {
  const [showDetails, setShowDetails] = useState(false)
  const d = action.details

  return (
    <div className="bg-muted/15 rounded-lg border border-border/15 overflow-hidden">
      <button className="w-full p-3 flex items-start justify-between text-left hover:bg-muted/10 transition-colors" onClick={() => d && setShowDetails(!showDetails)}>
        <div className="flex items-start gap-2 min-w-0">
          <FiChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-foreground">{action.action}</p>
            <div className="flex items-center gap-2 mt-1">
              <InlineBadge variant="muted">{action.channel}</InlineBadge>
              {d?.total_budget_usd != null && d.total_budget_usd > 0 && (
                <span className="text-[10px] text-muted-foreground">${d.total_budget_usd.toLocaleString()}</span>
              )}
            </div>
          </div>
        </div>
        {d && (
          <span className="text-[10px] text-primary flex-shrink-0 ml-2">{showDetails ? 'Less' : 'Details'}</span>
        )}
      </button>

      {showDetails && d && (
        <div className="border-t border-border/10 p-3 bg-muted/5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {d.campaign_type && (
              <div><span className="text-[10px] text-muted-foreground">Campaign Type</span><p className="text-xs text-foreground">{d.campaign_type}</p></div>
            )}
            {d.targeting && (
              <div><span className="text-[10px] text-muted-foreground">Targeting</span><p className="text-xs text-foreground">{d.targeting}</p></div>
            )}
            {d.estimated_audience_size && (
              <div><span className="text-[10px] text-muted-foreground">Audience Size</span><p className="text-xs text-foreground">{d.estimated_audience_size}</p></div>
            )}
            {d.daily_budget_usd != null && (
              <div><span className="text-[10px] text-muted-foreground">Daily Budget</span><p className="text-xs text-foreground">${d.daily_budget_usd}/day</p></div>
            )}
            {d.duration_days != null && (
              <div><span className="text-[10px] text-muted-foreground">Duration</span><p className="text-xs text-foreground">{d.duration_days} days</p></div>
            )}
            {d.total_budget_usd != null && (
              <div><span className="text-[10px] text-muted-foreground">Total Budget</span><p className="text-xs font-semibold text-foreground">${d.total_budget_usd.toLocaleString()}</p></div>
            )}
            {d.creative && (
              <div className="col-span-2"><span className="text-[10px] text-muted-foreground">Creative</span><p className="text-xs text-foreground">{d.creative}</p></div>
            )}
            {d.frequency_cap && (
              <div><span className="text-[10px] text-muted-foreground">Frequency Cap</span><p className="text-xs text-foreground">{d.frequency_cap}</p></div>
            )}
            {d.goal && (
              <div className="col-span-2"><span className="text-[10px] text-muted-foreground">Goal</span><p className="text-xs text-primary font-medium">{d.goal}</p></div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────
export default function Page() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null)
  const [view, setView] = useState<AppView>('dashboard')
  const [sidebarFilter, setSidebarFilter] = useState<SidebarFilter>('all')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sampleDataOn, setSampleDataOn] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [enrichmentProgress, setEnrichmentProgress] = useState<{ current: number; total: number; completed: string[]; inFlight?: string[] } | null>(null)
  const [contentProgress, setContentProgress] = useState<{ current: number; total: number; completed: string[] } | null>(null)

  useEffect(() => {
    const stored = loadCampaigns()
    setCampaigns(stored)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      saveCampaigns(campaigns)
    }
  }, [campaigns, mounted])

  const displayCampaigns = useMemo(() => {
    if (sampleDataOn) {
      const hasSample = campaigns.some(c => c.id === 'sample-1')
      if (!hasSample) return [getSampleCampaign(), ...campaigns]
    }
    return campaigns
  }, [campaigns, sampleDataOn])

  const activeCampaign = useMemo(() => {
    if (!activeCampaignId) return null
    if (activeCampaignId === 'sample-1' && sampleDataOn) return getSampleCampaign()
    return campaigns.find(c => c.id === activeCampaignId) ?? null
  }, [campaigns, activeCampaignId, sampleDataOn])

  const createCampaign = useCallback((name: string, directive: string, filters: CampaignFilters) => {
    const now = new Date().toISOString()
    const newCamp: Campaign = {
      id: generateId(), name, directive, filters,
      companies: [], enrichedCompanies: [], contacts: [], artifactFiles: [],
      stage: 'discovery', createdAt: now, updatedAt: now, priority_flags: [],
    }
    setCampaigns(prev => [newCamp, ...prev])
    setActiveCampaignId(newCamp.id)
    setView('campaign')
    setShowNewCampaign(false)
  }, [])

  const updateCampaign = useCallback((updated: Campaign) => {
    setCampaigns(prev => prev.map(c => c.id === updated.id ? updated : c))
  }, [])

  const selectCampaign = useCallback((id: string) => {
    setActiveCampaignId(id)
    setView('campaign')
    setError(null)
  }, [])

  // ─ Direct Pipeline Fallback ─
  // When the Manager agent fails to consolidate results, this function
  // directly orchestrates Researcher → Extractor from the frontend.
  const runDirectPipeline = useCallback(async (campaign: Campaign): Promise<{ companies: Company[]; sources: DiscoverySource[]; diagnostics?: SearchDiagnostics }> => {
    const targetCount = campaign.filters?.targetCount ?? 50
    const geography = campaign.filters?.geography || ''
    const industries = campaign.filters?.industries?.join(', ') || ''
    const sizeRange = campaign.filters?.sizeRange || ''

    console.log('[runDirectPipeline] Starting direct Researcher → Extractor pipeline')
    setActiveAgentId(DISCOVERY_RESEARCHER_ID)

    // Step 1: Call Discovery Researcher — short, fast prompt
    const researchMessage = `Find companies matching: ${campaign.directive}.${geography ? ` Geography: ${geography}.` : ''}${industries ? ` Industries: ${industries}.` : ''}${sizeRange ? ` Size: ${sizeRange}.` : ''} Date: ${new Date().toISOString().split('T')[0]}.

Search the web. Return JSON: { "findings": [{ "source_url": "https://...", "source_title": "...", "source_type": "news article|industry report|press release|funding announcement|market analysis|company directory|analyst report", "date_published": "YYYY-MM-DD", "content": "brief summary", "companies_mentioned": ["Company A", "Company B"] }] }

Rules: real URLs only, list all companies per source, 5-10 sources.`

    const researchResult = await callAIAgent(researchMessage, DISCOVERY_RESEARCHER_ID)
    console.log('[runDirectPipeline] Researcher result success:', researchResult?.success)

    if (!researchResult?.success) {
      console.error('[runDirectPipeline] Researcher failed:', researchResult?.error)
      throw new Error('Discovery Researcher failed: ' + (researchResult?.error || 'Unknown error'))
    }

    const researchParsed = parseAgentResult(researchResult)
    console.log('[runDirectPipeline] Researcher parsed keys:', researchParsed ? Object.keys(researchParsed) : 'null')

    if (!researchParsed) {
      throw new Error('Failed to parse Researcher results')
    }

    // ── SEARCH VERIFICATION DIAGNOSTICS ──
    // Capture hard evidence about whether a live web search actually occurred.
    // This is analyzed client-side from the raw Researcher response.
    const diagnostics = analyzeSearchDiagnostics(researchResult, researchParsed, 'direct')
    console.log(`[runDirectPipeline] Search Diagnostics: confidence=${diagnostics.confidenceLevel}, findings=${diagnostics.findingsCount}, urls=${diagnostics.totalUrlsReturned} (${diagnostics.urlsWithRealDomains} real), domains=${diagnostics.uniqueDomains.length}, groundingSignals=[${diagnostics.groundingSignals.join(', ')}]`)

    // Build the findings text to pass to the Extractor
    let findingsText = ''
    if (Array.isArray(researchParsed?.findings)) {
      findingsText = researchParsed.findings.map((f: any, i: number) => {
        const title = f?.source_title || `Source ${i + 1}`
        const type = f?.source_type || ''
        const content = f?.content || ''
        const companies = Array.isArray(f?.companies_mentioned) ? f.companies_mentioned.join(', ') : ''
        const date = f?.date_published || ''
        const url = f?.source_url || f?.url || ''
        return `--- SOURCE ${i + 1}: ${title} (${type}, ${date}) ---\n${url ? `URL: ${url}\n` : ''}${content}\nCompanies mentioned: ${companies}`
      }).join('\n\n')
    } else if (researchParsed?.segment_summary) {
      findingsText = researchParsed.segment_summary
    } else if (typeof researchResult.raw_response === 'string') {
      findingsText = researchResult.raw_response
    }

    if (!findingsText.trim()) {
      console.warn('[runDirectPipeline] No findings text to extract from')
      return { companies: [], sources: [] }
    }

    console.log('[runDirectPipeline] Findings text length:', findingsText.length)

    // Step 2: Call Company Name Extractor with the findings
    setActiveAgentId(COMPANY_EXTRACTOR_ID)

    // Truncate if too long for a single message (keep under 50K chars)
    const maxLen = 50000
    const truncatedFindings = findingsText.length > maxLen
      ? findingsText.slice(0, maxLen) + '\n\n[...truncated for length]'
      : findingsText

    const extractMessage = `Extract company names from these findings. Directive: "${campaign.directive}".${geography ? ` Geography: ${geography}.` : ''}${industries ? ` Industries: ${industries}.` : ''}

Return the top ${targetCount} most relevant companies. Score each 1-10 based on how closely they match the directive:
- 9-10: Directly matches the directive's core criteria (industry, geography, size, use case)
- 7-8: Strong match with most criteria met
- 5-6: Partial match, some criteria met
- 3-4: Tangential or loosely related
- 1-2: Barely relevant, only mentioned in passing

PER COMPANY: name, industry, hq_location, estimated_size, website, relevance_score (1-10), relevance_reasoning (1 sentence why this score), source_urls (array), discovery_category ("Recent Funding"|"Major News/Development"|"Industry Leader"|"Rapid Growth"|"Market Expansion"|"Leadership Change"|"Strategic Partnership"|"Acquisition Target"|"Emerging Player"|"Regulatory Impact"|"Directive Match")

ALSO RETURN "discovery_sources" array: per source URL include url, title, date_published, source_type, key_finding, companies_found (array), relevance_rationale.

FINDINGS:
${truncatedFindings}`

    const extractResult = await callAIAgent(extractMessage, COMPANY_EXTRACTOR_ID)
    console.log('[runDirectPipeline] Extractor result success:', extractResult?.success)

    if (!extractResult?.success) {
      console.error('[runDirectPipeline] Extractor failed:', extractResult?.error)
      // Even if Extractor fails, try to salvage company names from Researcher findings
      if (Array.isArray(researchParsed?.findings)) {
        const mentioned = new Set<string>()
        const salvaged: Company[] = []
        for (const finding of researchParsed.findings) {
          if (Array.isArray(finding?.companies_mentioned)) {
            for (const name of finding.companies_mentioned) {
              if (typeof name === 'string' && name.trim() && !mentioned.has(name.trim().toLowerCase())) {
                mentioned.add(name.trim().toLowerCase())
                salvaged.push({
                  name: name.trim(), industry: '', hq_location: '', estimated_size: '',
                  relevance_score: 5, relevance_reasoning: `Mentioned in: ${finding?.source_title || 'web search'}`,
                  website: '', source_segment: researchParsed?.segment_name ?? 'Direct Pipeline',
                  source_urls: (finding?.source_url || finding?.url) ? [finding.source_url || finding.url] : [],
                  discovery_category: 'Directive Match',
                  selected: true,
                })
              }
            }
          }
        }
        console.log('[runDirectPipeline] Salvaged', salvaged.length, 'companies from Researcher findings')
        const salvagedSources = extractDiscoverySources({}, researchParsed)
        return { companies: salvaged, sources: salvagedSources, diagnostics }
      }
      throw new Error('Company Name Extractor failed: ' + (extractResult?.error || 'Unknown error'))
    }

    const extractParsed = parseAgentResult(extractResult)
    console.log('[runDirectPipeline] Extractor parsed keys:', extractParsed ? Object.keys(extractParsed) : 'null')

    if (!extractParsed) {
      throw new Error('Failed to parse Extractor results')
    }

    // Parse extracted_companies from Extractor response
    let rawCompanies: any[] = []
    if (Array.isArray(extractParsed?.extracted_companies)) {
      rawCompanies = extractParsed.extracted_companies
    } else if (Array.isArray(extractParsed?.companies)) {
      rawCompanies = extractParsed.companies
    }

    const companies: Company[] = rawCompanies.map((c: any) => ({
      name: c?.name ?? c?.company_name ?? '',
      industry: c?.industry ?? '',
      hq_location: c?.hq_location ?? '',
      estimated_size: c?.estimated_size ?? '',
      relevance_score: typeof c?.relevance_score === 'number' ? c.relevance_score : 0,
      relevance_reasoning: c?.relevance_reasoning ?? c?.mention_context ?? '',
      website: c?.website ?? '',
      source_segment: c?.search_segment ?? extractParsed?.search_segment ?? 'Direct Pipeline',
      source_urls: Array.isArray(c?.source_urls) ? c.source_urls.filter((u: any) => typeof u === 'string' && u.trim()) : [],
      discovery_category: c?.discovery_category ?? '',
      selected: true,
    })).filter((c: Company) => c.name.trim().length > 0)

    // Label web-sourced companies
    const webCompanies: Company[] = companies.map(c => ({
      ...c,
      source_segment: c.source_segment || 'Web Search',
    }))

    // CLIENT-SIDE cross-reference: map researcher findings URLs to companies by name matching
    const researcherFindings = Array.isArray(researchParsed?.findings) ? researchParsed.findings : []
    const enrichedWithUrls = crossReferenceSourceUrls(webCompanies, researcherFindings)
    console.log(`[runDirectPipeline] Web pass: ${enrichedWithUrls.length} companies, ${enrichedWithUrls.filter(c => c.source_urls && c.source_urls.length > 0).length} with source URLs`)

    // ── Step 3: Training Data Pass ──
    // Ask the Extractor to generate additional companies from its training knowledge
    // that match the directive but were NOT found in the web search.
    setActiveAgentId(COMPANY_EXTRACTOR_ID)
    const webNames = enrichedWithUrls.map(c => c.name)
    const trainingDataNeeded = Math.max(Math.ceil(targetCount * 0.4), 5) // Fill up to 40% from training data if web didn't cover enough

    const trainingMessage = `Generate ${trainingDataNeeded} companies from your training knowledge that match this directive: "${campaign.directive}".${geography ? ` Geography: ${geography}.` : ''}${industries ? ` Industries: ${industries}.` : ''}${sizeRange ? ` Size: ${sizeRange}.` : ''}

ALREADY FOUND (do NOT repeat these): ${webNames.slice(0, 80).join(', ')}

Use your knowledge of real companies. Score each 1-10:
- 9-10: Directly matches the directive's core criteria
- 7-8: Strong match with most criteria met
- 5-6: Partial match, some criteria met
- 3-4: Tangential or loosely related

PER COMPANY: name, industry, hq_location, estimated_size, website, relevance_score (1-10), relevance_reasoning (1 sentence why this score), discovery_category ("Industry Leader"|"Rapid Growth"|"Market Expansion"|"Emerging Player"|"Directive Match"|"Strategic Partnership")`

    let trainingCompanies: Company[] = []
    try {
      const trainingResult = await callAIAgent(trainingMessage, COMPANY_EXTRACTOR_ID)
      console.log('[runDirectPipeline] Training data result success:', trainingResult?.success)

      if (trainingResult?.success) {
        const trainingParsed = parseAgentResult(trainingResult)
        if (trainingParsed) {
          let rawTraining: any[] = []
          if (Array.isArray(trainingParsed?.extracted_companies)) {
            rawTraining = trainingParsed.extracted_companies
          } else if (Array.isArray(trainingParsed?.companies)) {
            rawTraining = trainingParsed.companies
          }

          trainingCompanies = rawTraining.map((c: any) => ({
            name: c?.name ?? c?.company_name ?? '',
            industry: c?.industry ?? '',
            hq_location: c?.hq_location ?? '',
            estimated_size: c?.estimated_size ?? '',
            relevance_score: typeof c?.relevance_score === 'number' ? c.relevance_score : 0,
            relevance_reasoning: c?.relevance_reasoning ?? '',
            website: c?.website ?? '',
            source_segment: 'Training Data',
            source_urls: [],
            discovery_category: c?.discovery_category ?? 'Directive Match',
            selected: true,
          })).filter((c: Company) => c.name.trim().length > 0)

          console.log(`[runDirectPipeline] Training data pass: ${trainingCompanies.length} companies generated`)
        }
      }
    } catch (trainingErr) {
      console.warn('[runDirectPipeline] Training data pass failed (non-critical):', trainingErr)
      // Training data pass is non-critical — continue with web results only
    }

    // Merge web + training data, deduplicate, sort, cap
    const allCompanies = [...enrichedWithUrls, ...trainingCompanies]
    const { deduplicated } = deduplicateCompanies(allCompanies)
    // Sort by relevance score descending, then cap to target count
    deduplicated.sort((a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0))
    const capped = deduplicated.slice(0, targetCount)

    const webCount = capped.filter(c => c.source_segment === 'Web Search').length
    const trainingCount = capped.filter(c => c.source_segment === 'Training Data').length
    console.log(`[runDirectPipeline] Complete: ${capped.length} companies (${webCount} web, ${trainingCount} training data, ${deduplicated.length} deduped, capped to ${targetCount})`)

    // Extract source provenance from both extractor and researcher results
    const directSources = extractDiscoverySources(extractParsed, researchParsed)
    return { companies: capped, sources: directSources, diagnostics }
  }, [updateCampaign])

  // ─ Agent Calls ─
  // PRIMARY DISCOVERY PATH: Direct Pipeline (Researcher → Extractor)
  // We use the direct pipeline as the primary path because it gives us access to the raw
  // Researcher findings, enabling client-side cross-referencing of source URLs to companies.
  // The Manager agent loses source provenance data during LLM-to-LLM orchestration.
  // If the direct pipeline fails, we fall back to the Manager agent.
  const runDiscovery = useCallback(async (campaign: Campaign) => {
    setLoading(true)
    setError(null)
    const targetCount = campaign.filters?.targetCount ?? 50

    // ── PRIMARY: Direct Pipeline (Researcher → Extractor) ──
    // This path preserves source provenance because we capture raw Researcher findings
    // and cross-reference them with extracted companies in JavaScript (not via LLM).
    try {
      console.log('[runDiscovery] Starting PRIMARY path: Direct Pipeline (Researcher → Extractor) for source provenance')
      const directResult = await runDirectPipeline(campaign)
      if (directResult.companies.length > 0) {
        const withUrlsCount = directResult.companies.filter(c => c.source_urls && c.source_urls.length > 0).length
        const webCount = directResult.companies.filter(c => c.source_segment === 'Web Search').length
        const trainingCount = directResult.companies.filter(c => c.source_segment === 'Training Data').length
        console.log(`[runDiscovery] Direct pipeline succeeded: ${directResult.companies.length} companies (${webCount} web, ${trainingCount} training), ${withUrlsCount} with source URLs, ${directResult.sources.length} provenance sources`)
        const segStrategy: SegmentStrategy[] = [
          { segment_name: 'Web Search', target_count: targetCount, actual_count: webCount },
          ...(trainingCount > 0 ? [{ segment_name: 'Training Data', target_count: Math.ceil(targetCount * 0.4), actual_count: trainingCount }] : []),
        ]
        const summaryParts = [`Discovered ${directResult.companies.length} companies`]
        if (webCount > 0) summaryParts.push(`${webCount} from web research (${withUrlsCount} source-verified)`)
        if (trainingCount > 0) summaryParts.push(`${trainingCount} from AI training knowledge`)
        updateCampaign({
          ...campaign, companies: directResult.companies, stage: 'discovery',
          searchSummary: summaryParts.join(' — '),
          segmentationStrategy: segStrategy, duplicatesRemoved: 0, updatedAt: new Date().toISOString(),
          discoverySources: directResult.sources,
          searchDiagnostics: directResult.diagnostics,
        })
        setLoading(false)
        setActiveAgentId(null)
        return
      }
      console.warn('[runDiscovery] Direct pipeline returned 0 companies. Falling back to Manager agent.')
    } catch (directErr) {
      console.warn('[runDiscovery] Direct pipeline failed, falling back to Manager agent:', directErr)
    }

    // ── FALLBACK: Manager Agent ──
    // The Manager orchestrates sub-agents internally. We lose access to raw Researcher findings
    // (and thus source URLs), but it may succeed where direct pipeline doesn't.
    setActiveAgentId(DISCOVERY_MANAGER_ID)
    const filtersStr = campaign.filters ? JSON.stringify({ geography: campaign.filters.geography, sizeRange: campaign.filters.sizeRange, industries: campaign.filters.industries }) : 'No specific filters'
    const message = `Business directive: ${campaign.directive}. Target company count: ${targetCount}. Filters: ${filtersStr}.

SEMANTIC SEARCH GENERATION: Analyze the business directive above and generate 3-5 distinct semantic search strategies that go BEYOND simple keyword matching. Think about:
- What specific business problems does this directive address? Search for companies experiencing those problems.
- What industry events, regulations, or trends would drive demand? Search for companies affected by those.
- What adjacent industries or verticals might also be relevant? Search those too.
- What recent news categories (funding rounds, leadership changes, expansions, acquisitions) signal companies that match?
- What conferences, industry associations, or analyst reports cover this space?

PIPELINE: For each search strategy:
1) Delegate to the Discovery Researcher to search the web using the semantic queries
2) Pass ALL findings to the Company Name Extractor to identify every company name
3) Deduplicate and consolidate into a final list of ${targetCount}+ companies

REQUIRED OUTPUT PER COMPANY:
- source_urls: Array of 1-3 URLs where this company was discovered (article URLs, report URLs, press release URLs). These must be real, verifiable URLs from the search results.
- discovery_category: A crisp label explaining WHY this company was selected. Use one of: "Recent Funding" | "Major News/Development" | "Industry Leader" | "Rapid Growth" | "Market Expansion" | "Leadership Change" | "Strategic Partnership" | "Acquisition Target" | "Emerging Player" | "Regulatory Impact" | "Directive Match"

REQUIRED: SOURCE PROVENANCE REGISTRY
In addition to the companies array, return a "discovery_sources" array documenting EVERY source URL used in this discovery. For EACH source:
- url: The actual article/report/press-release URL
- title: The title of the article or report
- date_published: Publication date (YYYY-MM-DD or "Unknown")
- source_type: "news article" | "industry report" | "press release" | "funding announcement" | "market analysis" | "company directory" | "analyst report" | "regulatory filing" | "other"
- key_finding: 1-2 sentence summary of WHAT was found at this URL that is relevant to the directive (e.g. "Article details 8 cybersecurity firms expanding federal contracts due to new CMMC requirements")
- companies_found: Array of company names identified from this specific source
- relevance_rationale: WHY this source matters — what insight or signal it provides for the prospecting directive

ALSO INCLUDE the raw "findings" array from the Researcher — each finding should have source_url, source_title, date_published, content, and companies_mentioned.

This provenance chain gives users full transparency into the origin of every company in the list.

Cast the widest net possible - extract companies from news articles, press releases, industry reports, and market analyses.`
    try {
      const result = await callAIAgent(message, DISCOVERY_MANAGER_ID)
      console.log('[runDiscovery] Manager raw agent result:', JSON.stringify(result).slice(0, 2000))

      if (!result?.success) {
        const errMsg = result?.error || result?.response?.message || 'Agent returned an error. Please try again.'
        console.error('[runDiscovery] Manager agent call failed:', errMsg)
        setError(errMsg)
        setLoading(false)
        setActiveAgentId(null)
        return
      }

      const parsed = parseAgentResult(result)
      console.log('[runDiscovery] Manager parsed result keys:', parsed ? Object.keys(parsed) : 'null')

      if (!parsed) {
        console.error('[runDiscovery] parseAgentResult returned null. Full response:', JSON.stringify(result).slice(0, 3000))
        setError('Failed to parse discovery results. The agent may have returned an unexpected format. Please try again.')
        setLoading(false)
        setActiveAgentId(null)
        return
      }

      // Try multiple response shapes - Manager may return companies, extracted_companies, or findings
      let rawCompanies: any[] = []

      // Shape 1: Standard Manager response with "companies" array
      if (Array.isArray(parsed?.companies) && parsed.companies.length > 0) {
        rawCompanies = parsed.companies
        console.log('[runDiscovery] Found companies in standard format:', rawCompanies.length)
      }
      // Shape 2: Extractor format leaked through - "extracted_companies"
      else if (Array.isArray(parsed?.extracted_companies) && parsed.extracted_companies.length > 0) {
        rawCompanies = parsed.extracted_companies.map((ec: any) => ({
          name: ec?.name ?? '', industry: ec?.industry ?? '', hq_location: ec?.hq_location ?? '',
          estimated_size: ec?.estimated_size ?? '', relevance_score: typeof ec?.relevance_score === 'number' ? ec.relevance_score : 0,
          relevance_reasoning: ec?.mention_context ?? ec?.relevance_reasoning ?? '', website: ec?.website ?? '',
          source_segment: ec?.search_segment ?? parsed?.search_segment ?? '',
          source_urls: Array.isArray(ec?.source_urls) ? ec.source_urls : [],
          discovery_category: ec?.discovery_category ?? '',
        }))
        console.log('[runDiscovery] Found companies via extracted_companies format:', rawCompanies.length)
      }
      // Shape 3: Researcher findings with companies_mentioned arrays
      else if (Array.isArray(parsed?.findings) && parsed.findings.length > 0) {
        const mentioned = new Set<string>()
        for (const finding of parsed.findings) {
          if (Array.isArray(finding?.companies_mentioned)) {
            for (const name of finding.companies_mentioned) {
              if (typeof name === 'string' && name.trim() && !mentioned.has(name.trim().toLowerCase())) {
                mentioned.add(name.trim().toLowerCase())
                rawCompanies.push({
                  name: name.trim(), industry: '', hq_location: '', estimated_size: '',
                  relevance_score: 50, relevance_reasoning: `Mentioned in: ${finding?.source_title || 'web search'}`,
                  website: '', source_segment: parsed?.segment_name ?? '',
                  source_urls: (finding?.source_url || finding?.url) ? [finding.source_url || finding.url] : [],
                  discovery_category: 'Directive Match',
                })
              }
            }
          }
        }
        console.log('[runDiscovery] Extracted companies from findings.companies_mentioned:', rawCompanies.length)
      }
      // Shape 4: Deep search for any nested companies/extracted_companies array
      else {
        const searchNested = (obj: any, depth = 0): any[] => {
          if (!obj || typeof obj !== 'object' || depth > 5) return []
          if (Array.isArray(obj.companies) && obj.companies.length > 0) return obj.companies
          if (Array.isArray(obj.extracted_companies) && obj.extracted_companies.length > 0) return obj.extracted_companies
          for (const key of ['result', 'response', 'data', 'output']) {
            if (obj[key] && typeof obj[key] === 'object') {
              const found = searchNested(obj[key], depth + 1)
              if (found.length > 0) return found
            }
          }
          return []
        }
        rawCompanies = searchNested(result)
        if (rawCompanies.length > 0) {
          console.log('[runDiscovery] Found companies via deep nested search:', rawCompanies.length)
        }
      }

      const companies: Company[] = rawCompanies.map((c: any) => ({
        name: c?.name ?? c?.company_name ?? '',
        industry: c?.industry ?? '',
        hq_location: c?.hq_location ?? '',
        estimated_size: c?.estimated_size ?? '',
        relevance_score: typeof c?.relevance_score === 'number' ? c.relevance_score : 0,
        relevance_reasoning: c?.relevance_reasoning ?? c?.mention_context ?? '',
        website: c?.website ?? '',
        source_segment: c?.source_segment ?? c?.search_segment ?? '',
        source_urls: Array.isArray(c?.source_urls) ? c.source_urls.filter((u: any) => typeof u === 'string' && u.trim()) : [],
        discovery_category: c?.discovery_category ?? '',
        selected: true,
      })).filter((c: Company) => c.name.trim().length > 0)

      if (companies.length === 0) {
        setError(`Discovery completed but no companies were found. Try a more specific directive or retry.`)
        setLoading(false)
        setActiveAgentId(null)
        return
      }

      console.log(`[runDiscovery] Manager extracted ${companies.length} companies`)

      // CLIENT-SIDE cross-reference: if Manager response contains findings, map URLs to companies
      const managerFindings = Array.isArray(parsed?.findings) ? parsed.findings : []
      const companiesWithUrls = managerFindings.length > 0
        ? crossReferenceSourceUrls(companies, managerFindings)
        : companies
      const companiesWithUrlsCount = companiesWithUrls.filter(c => c.source_urls && c.source_urls.length > 0).length
      console.log(`[runDiscovery] Cross-referenced source URLs from Manager findings (${managerFindings.length} findings). Companies with URLs: ${companiesWithUrlsCount}/${companiesWithUrls.length}`)

      const segmentationStrategy: SegmentStrategy[] = Array.isArray(parsed?.segmentation_strategy)
        ? parsed.segmentation_strategy.map((s: any) => ({
            segment_name: s?.segment_name ?? '', target_count: typeof s?.target_count === 'number' ? s.target_count : 0,
            actual_count: typeof s?.actual_count === 'number' ? s.actual_count : 0,
          }))
        : []
      const duplicatesRemoved = typeof parsed?.duplicates_removed === 'number' ? parsed.duplicates_removed : 0
      const discoverySources = extractDiscoverySources(parsed)
      // Capture diagnostics from Manager response (less granular than direct pipeline, but still useful)
      const managerDiagnostics = analyzeSearchDiagnostics(result, parsed, 'manager')
      console.log(`[runDiscovery] Manager Search Diagnostics: confidence=${managerDiagnostics.confidenceLevel}, findings=${managerDiagnostics.findingsCount}, urls=${managerDiagnostics.totalUrlsReturned}`)
      updateCampaign({
        ...campaign, companies: companiesWithUrls, stage: 'discovery', searchSummary: parsed?.search_summary ?? '',
        segmentationStrategy, duplicatesRemoved, updatedAt: new Date().toISOString(),
        discoverySources,
        searchDiagnostics: managerDiagnostics,
      })
    } catch (err) {
      console.error('[runDiscovery] Exception:', err)
      setError(err instanceof Error ? err.message : 'Discovery failed. Please try again.')
    }
    setLoading(false)
    setActiveAgentId(null)
  }, [updateCampaign, runDirectPipeline])

  const parseEnrichmentResult = (parsed: any): EnrichedCompany[] => {
    return Array.isArray(parsed?.enriched_companies)
      ? parsed.enriched_companies.map((ec: any) => ({
          company_name: ec?.company_name ?? '',
          revenue: { figure: ec?.revenue?.figure ?? 'N/A', year: ec?.revenue?.year ?? '', source: ec?.revenue?.source ?? '' },
          recent_news: Array.isArray(ec?.recent_news) ? ec.recent_news.map((n: any) => ({ date: n?.date ?? '', headline: n?.headline ?? '', summary: n?.summary ?? '', sales_relevance: n?.sales_relevance ?? '' })) : [],
          csuite_changes: Array.isArray(ec?.csuite_changes) ? ec.csuite_changes.map((cs: any) => ({ name: cs?.name ?? '', new_role: cs?.new_role ?? '', previous_role: cs?.previous_role ?? '', date: cs?.date ?? '' })) : [],
          growth_indicators: Array.isArray(ec?.growth_indicators) ? ec.growth_indicators.map((gi: any) => ({ type: gi?.type ?? '', detail: gi?.detail ?? '', implications: gi?.implications ?? '' })) : [],
          competitive_intel: {
            vendors: Array.isArray(ec?.competitive_intel?.vendors) ? ec.competitive_intel.vendors : [],
            partners: Array.isArray(ec?.competitive_intel?.partners) ? ec.competitive_intel.partners : [],
            competitors: Array.isArray(ec?.competitive_intel?.competitors) ? ec.competitive_intel.competitors : [],
          },
          risk_insurance_challenges: Array.isArray(ec?.risk_insurance_challenges) ? ec.risk_insurance_challenges.map((rc: any) => ({ challenge: rc?.challenge ?? '', trigger_event: rc?.trigger_event ?? '', urgency: rc?.urgency ?? '', relevant_service: rc?.relevant_service ?? '', service_provider: rc?.service_provider ?? '', conversation_opener: rc?.conversation_opener ?? '' })) : [],
          hr_workforce_challenges: Array.isArray(ec?.hr_workforce_challenges) ? ec.hr_workforce_challenges.map((hc: any) => ({ challenge: hc?.challenge ?? '', trigger_event: hc?.trigger_event ?? '', urgency: hc?.urgency ?? '', relevant_service: hc?.relevant_service ?? '', service_provider: hc?.service_provider ?? '', conversation_opener: hc?.conversation_opener ?? '' })) : [],
          key_sales_nuggets: Array.isArray(ec?.key_sales_nuggets) ? ec.key_sales_nuggets.map((sn: any) => ({ nugget: sn?.nugget ?? '', category: sn?.category ?? '', source: sn?.source ?? '', talking_point: sn?.talking_point ?? '' })) : [],
          selected: true,
        }))
      : []
  }

  // Build company context string shared across all sub-agent prompts
  const buildCompanyContext = useCallback((company: Company, campaign: Campaign): string => {
    const name = company.name
    const industry = company.industry || 'technology'
    const location = company.hq_location || ''
    const size = company.estimated_size || ''
    const website = company.website || ''
    const segment = company.source_segment || ''
    const directive = campaign.directive || ''
    const geography = campaign.filters?.geography || ''
    const targetIndustries = campaign.filters?.industries?.join(', ') || industry
    const todayDate = new Date().toISOString().split('T')[0]

    return `TODAY'S DATE: ${todayDate}
RESEARCH TIMEFRAME: Focus on events, data, and developments from the last 12 months (since ${new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}). Prioritize the most recent information available.

Company: "${name}" — a ${industry} company${location ? ` headquartered in ${location}` : ''}${size ? ` with approximately ${size} employees` : ''}.
CAMPAIGN CONTEXT: ${directive || `Research ${industry} companies`}
${geography ? `TARGET GEOGRAPHY: ${geography}` : ''}
${targetIndustries ? `TARGET INDUSTRIES: ${targetIndustries}` : ''}
${segment ? `DISCOVERY SEGMENT: ${segment}` : ''}
${website ? `COMPANY WEBSITE: ${website}` : ''}

SOURCE VALIDATION RULES:
- Tier 1 (Highest): Official SEC filings, annual reports, press releases from the company itself
- Tier 2: Reputable business news (Reuters, Bloomberg, WSJ, TechCrunch, industry-specific publications)
- Tier 3: Industry analyst reports (Gartner, Forrester, IDC, CB Insights)
- Tier 4: Verified databases (Crunchbase, PitchBook, LinkedIn, Glassdoor)
- EXCLUDE: Wikipedia, unattributed blog posts, outdated sources (>18 months old unless historically significant), social media rumors
- Every data point MUST include its source and date. If a date cannot be determined, mark it as "Date unknown".
- Flag any data older than 12 months with "(Historical)" prefix.`
  }, [])

  // 4 specialized prompts — one per sub-agent workstream
  const buildFinancialGrowthPrompt = useCallback((company: Company, campaign: Campaign): string => {
    return `${buildCompanyContext(company, campaign)}

ROLE: You are a senior financial research analyst specializing in company intelligence for B2B sales teams. Your research must be precise, sourced, and actionable.

Research FINANCIAL & GROWTH data for "${company.name}":

1. REVENUE & FINANCIAL POSITION
   - Annual revenue, ARR, or estimated revenue with fiscal year and source
   - Revenue growth rate (YoY if available)
   - Recent funding rounds: amount, lead investors, valuation, date
   - Profitability indicators (if public or reported)
   - Citation format: (Source Type, "Title/Publication", YYYY-MM-DD)

2. GROWTH INDICATORS (last 12 months only)
   - Hiring surges: number of open positions, departments expanding, job posting trends
   - Office/geographic expansion: new offices, market entries, international expansion
   - Product launches: new products, major feature releases, platform expansions
   - Market expansion: new verticals, customer segments, channel partnerships
   - M&A activity: acquisitions, mergers, strategic investments
   - For each indicator, explain the SALES IMPLICATION — what does this signal mean for someone selling to this company?

QUALITY REQUIREMENTS:
- Every figure must include year/date and source citation
- Distinguish between confirmed revenue (from filings/press) vs estimated revenue (from databases/analysts)
- If no reliable revenue data exists, state "Revenue undisclosed" rather than guessing
- Growth indicators must reference specific, verifiable events — not generic industry trends

Return a JSON object with these fields:
- "company_name": string
- "revenue": { "figure": string, "year": string, "source": string }
- "growth_indicators": [{ "type": string, "detail": string, "implications": string }]`
  }, [buildCompanyContext])

  const buildNewsLeadershipPrompt = useCallback((company: Company, campaign: Campaign): string => {
    const todayDate = new Date().toISOString().split('T')[0]
    return `${buildCompanyContext(company, campaign)}

ROLE: You are a senior business intelligence analyst specializing in corporate news monitoring and leadership tracking for B2B sales teams.

Research NEWS & LEADERSHIP data for "${company.name}":

1. RECENT NEWS & DEVELOPMENTS (last 12 months, prioritize last 6 months)
   Search for the MOST RECENT news available up to ${todayDate}. Categories to cover:
   - Press releases and company announcements
   - Product launches, major feature releases, platform updates
   - Partnerships, alliances, channel agreements
   - Acquisitions, mergers, divestitures
   - Regulatory actions, compliance events, legal proceedings
   - Awards, recognitions, industry rankings
   - Earnings reports, financial milestones (if public)

   For EACH news item:
   - Include the EXACT publication date (YYYY-MM-DD format)
   - Cite the source publication name
   - Assess sales_relevance: Why does this matter to someone selling B2B services to this company? What conversation does it open?

   RECENCY REQUIREMENT: Prioritize news from the last 3-6 months. If only older news is available, include it but flag with the actual date. Do NOT fabricate recent dates for old news.

2. C-SUITE & LEADERSHIP CHANGES (last 18 months)
   - New hires at VP level and above: name, new role, previous company/role, date
   - Departures: who left, their role, approximate date
   - Role changes: promotions, lateral moves, expanded responsibilities
   - Board appointments or advisory roles

   SALES INSIGHT: New executives typically review vendor relationships within their first 90 days. Flag any changes in the last 6 months as "Active Review Window".

QUALITY REQUIREMENTS:
- Dates must be specific (YYYY-MM-DD), not vague ("recently", "this year")
- Every news item must be traceable to a real publication
- Do NOT include speculation or unconfirmed rumors
- If the company has very little recent news, say so — do not pad with irrelevant industry news

Return a JSON object with these fields:
- "company_name": string
- "recent_news": [{ "date": string, "headline": string, "summary": string, "sales_relevance": string }]
- "csuite_changes": [{ "name": string, "new_role": string, "previous_role": string, "date": string }]`
  }, [buildCompanyContext])

  const buildCompetitiveIntelPrompt = useCallback((company: Company, campaign: Campaign): string => {
    return `${buildCompanyContext(company, campaign)}

ROLE: You are a competitive intelligence analyst specializing in technology ecosystem mapping and market positioning analysis for B2B sales teams.

Research COMPETITIVE & MARKET INTELLIGENCE for "${company.name}":

1. TECHNOLOGY VENDORS & PLATFORMS
   What major technology platforms, tools, or services does this company use or depend on?
   - Cloud infrastructure (AWS, Azure, GCP, etc.)
   - Enterprise software (Salesforce, SAP, Oracle, Workday, etc.)
   - Development tools and platforms
   - Security solutions
   - Data & analytics platforms
   Sources: Job postings (tech stack requirements), case studies, press releases, technology review sites, partnership announcements

2. STRATEGIC PARTNERS
   - Consulting firms and system integrators working with this company
   - Channel partners and resellers
   - Technology alliance partners
   - Joint venture or co-development partners
   Sources: Partner directory listings, joint press releases, case studies, conference presentations

3. DIRECT COMPETITORS
   - Companies competing in the same primary market segments
   - Emerging competitors or disruptors
   - Companies this company has explicitly referenced as competitors (in earnings calls, press, etc.)
   NOTE: Only include VERIFIED competitive relationships — companies that actually compete for the same customers. Do NOT list generic industry players.

QUALITY REQUIREMENTS:
- Each vendor/partner/competitor must be a SPECIFIC named company, not a category
- Distinguish between confirmed relationships (from press releases, case studies) and inferred relationships (from job postings, tech stack analysis)
- If competitive intelligence is limited for this company, return shorter but accurate lists rather than padding with guesses

Return a JSON object with these fields:
- "company_name": string
- "competitive_intel": { "vendors": [string], "partners": [string], "competitors": [string] }`
  }, [buildCompanyContext])

  const buildRiskWorkforcePrompt = useCallback((company: Company, campaign: Campaign): string => {
    return `${buildCompanyContext(company, campaign)}

ROLE: You are a senior risk & workforce analyst specializing in identifying actionable business challenges and sales opportunities for B2B advisory services. You synthesize intelligence into a "Strategic Dialogue Matrix" format.

Research RISK, INSURANCE, HR & WORKFORCE challenges for "${company.name}", plus synthesize KEY SALES NUGGETS:

1. STRATEGIC RISK DIALOGUE MATRIX
   Identify risk & insurance challenges tied to REAL company events. For each challenge:
   - Challenge: The specific risk exposure or compliance gap (be precise, not generic)
   - Trigger Event: The REAL, verifiable company event that created or amplified this risk (with date)
   - Urgency: High (immediate action needed) | Medium (next 6 months) | Low (strategic planning)
   - Relevant Service: The type of advisory/insurance service that addresses this (e.g., "Cyber Liability Insurance", "D&O Coverage Review", "Global Compliance Assessment")
   - Conversation Opener: A specific, non-salesy question that demonstrates knowledge of the company's situation and opens a consultative dialogue

   Categories to assess:
   - Cyber risk & data privacy exposure
   - D&O liability (especially post-funding or IPO trajectory)
   - International expansion regulatory compliance
   - Supply chain / vendor concentration risk
   - Environmental, Social, Governance (ESG) obligations
   - Professional liability / E&O exposure
   - Property & casualty considerations (new facilities, equipment)

2. STRATEGIC BENEFITS & WORKFORCE DIALOGUE MATRIX
   Identify HR & workforce challenges tied to REAL company events. For each:
   - Challenge: The specific talent/benefits/workforce gap
   - Trigger Event: The REAL company event driving this need (with date)
   - Urgency: High | Medium | Low
   - Relevant Service: The type of HR/benefits service (e.g., "Total Rewards Benchmarking", "Executive Benefits Design", "Workforce Planning")
   - Conversation Opener: A consultative question demonstrating knowledge of their situation

   Categories to assess:
   - Talent acquisition & retention in competitive markets
   - Executive compensation & benefits design
   - Employee benefits program gaps (health, wellness, retirement)
   - Workforce planning for growth/contraction
   - DEI & culture initiatives
   - Remote/hybrid work policy challenges
   - Employee value proposition competitiveness

3. KEY SALES NUGGETS
   Synthesize the MOST compelling conversation starters — the "golden nuggets" that would make a sales professional stand out. Each nugget should:
   - Reference a SPECIFIC, verifiable company event or data point
   - Connect that event to a business need the prospect likely has
   - Provide a natural talking point that opens a consultative conversation
   - Category: classify as "Leadership Change", "Funding", "Expansion", "Regulatory", "Competitive Shift", "Market Signal", or "Workforce"

QUALITY REQUIREMENTS:
- Every trigger_event must reference a REAL, verifiable event with an approximate date
- Do NOT invent or assume events that cannot be verified
- Conversation openers must be specific to THIS company — not generic questions that could apply to any company
- If you cannot find real trigger events for a category, omit it rather than fabricate
- Prioritize challenges where the trigger event occurred in the last 6-12 months

Return a JSON object with these fields:
- "company_name": string
- "risk_insurance_challenges": [{ "challenge": string, "trigger_event": string, "urgency": "High"|"Medium"|"Low", "relevant_service": string, "service_provider": "", "conversation_opener": string }]
- "hr_workforce_challenges": [{ "challenge": string, "trigger_event": string, "urgency": "High"|"Medium"|"Low", "relevant_service": string, "service_provider": "", "conversation_opener": string }]
- "key_sales_nuggets": [{ "nugget": string, "category": string, "source": string, "talking_point": string }]

CRITICAL RULES:
- The service_provider field MUST be empty string "" for ALL challenges — never suggest specific firms
- Do NOT include any specific consulting firm, brokerage, or service provider names
- Focus on the company's operating space and industry-specific issues`
  }, [buildCompanyContext])

  // Call a single agent with retry logic for transient network failures
  const callWithRetry = useCallback(async (message: string, agentId: string, retries = 2): Promise<AIAgentResponse> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const result = await callAIAgent(message, agentId)
      // If successful or a non-retryable error, return immediately
      if (result.success) return result
      const errMsg = (result.error || result.response?.message || '').toLowerCase()
      const isTransient = errMsg.includes('network') || errMsg.includes('timeout') || errMsg.includes('timed out') || errMsg.includes('no response') || errMsg.includes('connection')
      if (!isTransient || attempt === retries) return result
      // Wait before retry: 3s, then 6s
      await new Promise(r => setTimeout(r, 3000 * (attempt + 1)))
      console.log(`[callWithRetry] Retrying ${agentId} attempt ${attempt + 1}/${retries} after transient error: ${errMsg}`)
    }
    return { success: false, response: { status: 'error', result: {}, message: 'Retries exhausted' }, error: 'Retries exhausted' }
  }, [])

  // Enrich a single company by calling 4 specialized sub-agents in parallel, then merging results client-side
  const enrichSingleCompany = useCallback(async (
    company: Company,
    campaign: Campaign,
    onComplete: (name: string, enriched: EnrichedCompany | null) => void
  ) => {
    const start = Date.now()

    // Build 4 specialized prompts
    const financialPrompt = buildFinancialGrowthPrompt(company, campaign)
    const newsPrompt = buildNewsLeadershipPrompt(company, campaign)
    const competitivePrompt = buildCompetitiveIntelPrompt(company, campaign)
    const riskPrompt = buildRiskWorkforcePrompt(company, campaign)

    // Fire all 4 sub-agents in parallel
    const [financialRes, newsRes, competitiveRes, riskRes] = await Promise.allSettled([
      callWithRetry(financialPrompt, FINANCIAL_GROWTH_AGENT_ID),
      callWithRetry(newsPrompt, NEWS_LEADERSHIP_AGENT_ID),
      callWithRetry(competitivePrompt, COMPETITIVE_INTEL_AGENT_ID),
      callWithRetry(riskPrompt, RISK_WORKFORCE_AGENT_ID),
    ])

    const elapsed = Date.now() - start

    // Extract parsed data from each sub-agent result — with full debug logging
    const agentLabels = ['Financial', 'News', 'Competitive', 'Risk']
    const extractParsed = (settled: PromiseSettledResult<AIAgentResponse>, label: string): any => {
      if (settled.status === 'rejected') {
        console.error(`[enrichSingleCompany] ${company.name} ${label}: Promise rejected:`, (settled as PromiseRejectedResult).reason)
        return null
      }
      const val = settled.value
      if (!val) {
        console.error(`[enrichSingleCompany] ${company.name} ${label}: No value returned`)
        return null
      }
      // Log what we actually received
      console.log(`[enrichSingleCompany] ${company.name} ${label}: success=${val.success}, error=${val.error || 'none'}, responseStatus=${val.response?.status}, responseKeys=${val.response?.result ? Object.keys(val.response.result).join(',') : 'none'}, rawSnippet=${val.raw_response ? String(val.raw_response).slice(0, 200) : 'none'}`)
      if (!val.success) {
        // Even if success is false, try to extract data from response (Lyzr sometimes returns data with success=false)
        const fallback = parseAgentResult({ ...val, success: true } as AIAgentResponse)
        if (fallback && typeof fallback === 'object' && Object.keys(fallback).length > 1) {
          console.log(`[enrichSingleCompany] ${company.name} ${label}: Recovered data from failed response, keys: ${Object.keys(fallback).join(',')}`)
          return fallback
        }
        console.error(`[enrichSingleCompany] ${company.name} ${label}: Agent call failed: ${val.error || val.response?.message || 'Unknown error'}`)
        return null
      }
      return parseAgentResult(val)
    }

    const financialData = extractParsed(financialRes, agentLabels[0])
    const newsData = extractParsed(newsRes, agentLabels[1])
    const competitiveData = extractParsed(competitiveRes, agentLabels[2])
    const riskData = extractParsed(riskRes, agentLabels[3])

    const successCount = [financialData, newsData, competitiveData, riskData].filter(Boolean).length
    console.log(`[enrichSingleCompany] ${company.name}: ${successCount}/4 sub-agents succeeded (${(elapsed / 1000).toFixed(1)}s)`)

    // If no sub-agents returned data, mark as failed
    if (successCount === 0) {
      onComplete(company.name, null)
      return { name: company.name, enriched: null, elapsed }
    }

    // Merge results from all 4 sub-agents into a single EnrichedCompany
    const enrichedCompany: EnrichedCompany = {
      company_name: company.name,
      revenue: {
        figure: financialData?.revenue?.figure ?? 'N/A',
        year: financialData?.revenue?.year ?? '',
        source: financialData?.revenue?.source ?? '',
      },
      growth_indicators: Array.isArray(financialData?.growth_indicators)
        ? financialData.growth_indicators.map((gi: any) => ({ type: gi?.type ?? '', detail: gi?.detail ?? '', implications: gi?.implications ?? '' }))
        : [],
      recent_news: Array.isArray(newsData?.recent_news)
        ? newsData.recent_news.map((n: any) => ({ date: n?.date ?? '', headline: n?.headline ?? '', summary: n?.summary ?? '', sales_relevance: n?.sales_relevance ?? '' }))
        : [],
      csuite_changes: Array.isArray(newsData?.csuite_changes)
        ? newsData.csuite_changes.map((cs: any) => ({ name: cs?.name ?? '', new_role: cs?.new_role ?? '', previous_role: cs?.previous_role ?? '', date: cs?.date ?? '' }))
        : [],
      competitive_intel: {
        vendors: Array.isArray(competitiveData?.competitive_intel?.vendors) ? competitiveData.competitive_intel.vendors : [],
        partners: Array.isArray(competitiveData?.competitive_intel?.partners) ? competitiveData.competitive_intel.partners : [],
        competitors: Array.isArray(competitiveData?.competitive_intel?.competitors) ? competitiveData.competitive_intel.competitors : [],
      },
      risk_insurance_challenges: Array.isArray(riskData?.risk_insurance_challenges)
        ? riskData.risk_insurance_challenges.map((rc: any) => ({ challenge: rc?.challenge ?? '', trigger_event: rc?.trigger_event ?? '', urgency: rc?.urgency ?? '', relevant_service: rc?.relevant_service ?? '', service_provider: '', conversation_opener: rc?.conversation_opener ?? '' }))
        : [],
      hr_workforce_challenges: Array.isArray(riskData?.hr_workforce_challenges)
        ? riskData.hr_workforce_challenges.map((hc: any) => ({ challenge: hc?.challenge ?? '', trigger_event: hc?.trigger_event ?? '', urgency: hc?.urgency ?? '', relevant_service: hc?.relevant_service ?? '', service_provider: '', conversation_opener: hc?.conversation_opener ?? '' }))
        : [],
      key_sales_nuggets: Array.isArray(riskData?.key_sales_nuggets)
        ? riskData.key_sales_nuggets.map((sn: any) => ({ nugget: sn?.nugget ?? '', category: sn?.category ?? '', source: sn?.source ?? '', talking_point: sn?.talking_point ?? '' }))
        : [],
      selected: true,
    }

    onComplete(company.name, enrichedCompany)
    return { name: company.name, enriched: enrichedCompany, elapsed }
  }, [buildFinancialGrowthPrompt, buildNewsLeadershipPrompt, buildCompetitiveIntelPrompt, buildRiskWorkforcePrompt, callWithRetry])

  const runEnrichment = useCallback(async (campaign: Campaign) => {
    const selected = (campaign.companies ?? []).filter(c => c.selected)
    if (selected.length === 0) return
    setLoading(true)
    setError(null)
    setActiveAgentId(FINANCIAL_GROWTH_AGENT_ID)

    // Preserve previously enriched companies — only enrich companies not already in the list
    const existingEnriched = Array.isArray(campaign.enrichedCompanies) ? [...campaign.enrichedCompanies] : []
    const existingNames = new Set(existingEnriched.map(ec => ec.company_name.toLowerCase().trim()))
    const toEnrich = selected.filter(c => !existingNames.has(c.name.toLowerCase().trim()))

    // If all selected companies are already enriched, offer re-enrichment
    if (toEnrich.length === 0) {
      console.log(`[runEnrichment] All ${selected.length} selected companies already enriched. Skipping.`)
      setError(`All ${selected.length} selected companies are already enriched. To re-enrich, clear enrichment data first.`)
      setLoading(false)
      setActiveAgentId(null)
      return
    }

    // Start with existing enriched data — new results will be appended
    const enrichedResults: EnrichedCompany[] = [...existingEnriched]
    let totalTime = 0

    setEnrichmentProgress({ current: 0, total: toEnrich.length, completed: [], inFlight: [] })

    try {
      // Each company calls 4 sub-agents directly in parallel (flat calls, not manager-chained),
      // so we can run 5 companies concurrently for maximum throughput
      const CONCURRENCY = 5
      const queue = [...toEnrich]
      const active: Promise<any>[] = []
      let completedCount = 0
      const inFlightNames: string[] = []

      const processCompany = (company: Company) => {
        inFlightNames.push(company.name)
        return enrichSingleCompany(company, campaign, (name, enriched) => {
          completedCount++
          if (enriched) enrichedResults.push(enriched)
          // Remove from in-flight
          const idx = inFlightNames.indexOf(name)
          if (idx >= 0) inFlightNames.splice(idx, 1)

          setEnrichmentProgress({
            current: completedCount,
            total: toEnrich.length,
            completed: enrichedResults.filter(c => !existingNames.has(c.company_name.toLowerCase().trim())).map(c => c.company_name),
            inFlight: [...inFlightNames],
          })

          setActiveAgentId(FINANCIAL_GROWTH_AGENT_ID)

          updateCampaign({
            ...campaign,
            enrichedCompanies: [...enrichedResults],
            stage: 'enrichment',
            enrichmentSummary: `Enriched ${enrichedResults.length} companies (${toEnrich.length} new, ${existingEnriched.length} previously enriched) via ${AGENT_CONFIG.enrichment.name}.`,
            enrichmentTime: totalTime,
            updatedAt: new Date().toISOString(),
          })
        })
      }

      const results: { name: string; elapsed: number }[] = []
      while (queue.length > 0 || active.length > 0) {
        while (active.length < CONCURRENCY && queue.length > 0) {
          const company = queue.shift()!
          const promise = processCompany(company).then(r => {
            results.push({ name: r.name, elapsed: r.elapsed })
            totalTime += r.elapsed
            active.splice(active.indexOf(promise), 1)
          })
          active.push(promise)
        }
        // Update progress to show in-flight companies
        setEnrichmentProgress({
          current: completedCount,
          total: toEnrich.length,
          completed: enrichedResults.filter(c => !existingNames.has(c.company_name.toLowerCase().trim())).map(c => c.company_name),
          inFlight: [...inFlightNames],
        })
        if (active.length > 0) {
          await Promise.race(active)
        }
      }

      const newlyEnriched = enrichedResults.length - existingEnriched.length
      if (newlyEnriched === 0) {
        console.error('[runEnrichment] ZERO companies enriched. Check browser console for per-agent error details above.')
        setError('Enrichment agents failed to return results. Check browser console (F12) for detailed diagnostics, then try again.')
      }

      updateCampaign({
        ...campaign,
        enrichedCompanies: enrichedResults,
        stage: 'enrichment',
        enrichmentSummary: `Enriched ${enrichedResults.length} total companies (${newlyEnriched} new this run${existingEnriched.length > 0 ? `, ${existingEnriched.length} previously enriched` : ''}) with revenue, news, leadership, growth signals, competitive intelligence, risk & insurance challenges, HR challenges, and sales nuggets via 4 parallel research agents.`,
        enrichmentTime: totalTime,
        updatedAt: new Date().toISOString(),
      })

      console.log(`[runEnrichment] Complete: ${enrichedResults.length} total enriched (${newlyEnriched} new). Total time: ${(totalTime / 1000).toFixed(1)}s across ${toEnrich.length} companies`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed. Please try again.')
    }
    setLoading(false)
    setActiveAgentId(null)
    setEnrichmentProgress(null)
  }, [updateCampaign, enrichSingleCompany])

  const runContactFinder = useCallback(async (campaign: Campaign) => {
    const selected = (campaign.enrichedCompanies ?? []).filter(c => c.selected)
    if (selected.length === 0) return
    setLoading(true)
    setError(null)
    setActiveAgentId(CONTACT_AGENT_ID)
    const companiesPayload = selected.map(c => ({ company_name: c.company_name, revenue: c.revenue?.figure }))
    const message = `Find verified decision-maker contacts for these companies: ${JSON.stringify(companiesPayload)}. Look for C-suite, VP, and Director level contacts.`
    try {
      const result = await callAIAgent(message, CONTACT_AGENT_ID)
      const parsed = parseAgentResult(result)
      if (!parsed) {
        setError('Failed to parse contact results. Please try again.')
        setLoading(false)
        setActiveAgentId(null)
        return
      }
      const compContacts: CompanyContacts[] = Array.isArray(parsed?.company_contacts)
        ? parsed.company_contacts.map((cc: any) => ({
            company_name: cc?.company_name ?? '',
            contacts: Array.isArray(cc?.contacts) ? cc.contacts.map((ct: any) => ({
              full_name: ct?.full_name ?? '', title: ct?.title ?? '', seniority: ct?.seniority ?? '',
              email: ct?.email ?? '', email_status: ct?.email_status ?? '', phone: ct?.phone ?? '', linkedin_url: ct?.linkedin_url ?? '',
            })) : [],
            organization_data: {
              apollo_id: cc?.organization_data?.apollo_id ?? '', domain: cc?.organization_data?.domain ?? '',
              employee_count: cc?.organization_data?.employee_count ?? '', industry: cc?.organization_data?.industry ?? '',
            },
          }))
        : []
      const files: ArtifactFile[] = Array.isArray(result?.module_outputs?.artifact_files)
        ? result.module_outputs!.artifact_files.map((f: any) => ({ file_url: f?.file_url ?? '', name: f?.name ?? '', format_type: f?.format_type ?? '' }))
        : []
      const totalFound = typeof parsed?.total_contacts_found === 'number' ? parsed.total_contacts_found : compContacts.reduce((acc, cc) => acc + (Array.isArray(cc.contacts) ? cc.contacts.length : 0), 0)
      updateCampaign({ ...campaign, contacts: compContacts, artifactFiles: files, stage: 'contacts', contactSummary: parsed?.search_summary ?? '', totalContactsFound: totalFound, updatedAt: new Date().toISOString() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Contact finding failed. Please try again.')
    }
    setLoading(false)
    setActiveAgentId(null)
  }, [updateCampaign])

  // ─── MARKETING STRATEGY PIPELINE ────────────────────────────────────────────
  const runMarketingStrategy = useCallback(async (campaign: Campaign) => {
    const enriched = Array.isArray(campaign.enrichedCompanies) ? campaign.enrichedCompanies : []
    if (enriched.length === 0) return
    setLoading(true)
    setError(null)
    setActiveAgentId(MARKETING_STRATEGIST_ID)

    try {
      // Build compact enrichment payload for the strategist
      const companyData = enriched.map(ec => ({
        company_name: ec.company_name,
        revenue: ec.revenue?.figure ?? 'N/A',
        recent_news_count: Array.isArray(ec.recent_news) ? ec.recent_news.length : 0,
        recent_news: Array.isArray(ec.recent_news) ? ec.recent_news.slice(0, 3).map(n => n.headline) : [],
        csuite_changes: Array.isArray(ec.csuite_changes) ? ec.csuite_changes.length : 0,
        growth_indicators: Array.isArray(ec.growth_indicators) ? ec.growth_indicators.map(g => g.type + ': ' + g.detail) : [],
        competitive_intel: {
          vendors: Array.isArray(ec.competitive_intel?.vendors) ? ec.competitive_intel.vendors.length : 0,
          competitors: Array.isArray(ec.competitive_intel?.competitors) ? ec.competitive_intel.competitors.length : 0,
        },
        risk_challenges: Array.isArray(ec.risk_insurance_challenges) ? ec.risk_insurance_challenges.map(r => r.challenge) : [],
        hr_challenges: Array.isArray(ec.hr_workforce_challenges) ? ec.hr_workforce_challenges.map(h => h.challenge) : [],
        key_sales_nuggets: Array.isArray(ec.key_sales_nuggets) ? ec.key_sales_nuggets.map(s => s.nugget) : [],
      }))

      const message = `Analyze these ${companyData.length} enriched companies for the campaign "${campaign.directive}". Score each on signal density, strategic fit, timing, and scale. Assign tiers (Tier 1 ABM max 5, Tier 2 Cluster, Tier 3 Nurture). Identify clusters among Tier 2 companies. Also produce the full 6-week execution playbook with phased actions, ownership matrix, budget summary, KPIs, and tier movement rules.\n\nCompany data:\n${JSON.stringify(companyData)}`

      const result = await callAIAgent(message, MARKETING_STRATEGIST_ID)

      // Check if the agent call itself failed (timeout, error, etc.)
      if (!result?.success) {
        const agentError = result?.error || result?.response?.message || 'Agent call failed'
        console.error('[runMarketingStrategy] Agent call failed:', agentError, '| Full result:', JSON.stringify(result).slice(0, 500))
        setError(`Marketing strategy analysis failed: ${agentError}`)
        setLoading(false)
        setActiveAgentId(null)
        return
      }

      let parsed = parseAgentResult(result)

      // Fallback: if parseAgentResult couldn't find account_briefs, try deeper extraction
      if (!parsed || !Array.isArray(parsed?.account_briefs)) {
        // Try extracting from raw response directly
        if (result?.raw_response) {
          try {
            const rawParsed = parseLLMJson(result.raw_response)
            if (rawParsed && typeof rawParsed === 'object') {
              // Navigate through potential nesting: response.response, response.result, etc.
              const candidates = [rawParsed, rawParsed?.response, rawParsed?.response?.response, rawParsed?.response?.result, rawParsed?.result]
              for (const candidate of candidates) {
                if (candidate && Array.isArray(candidate?.account_briefs)) {
                  parsed = candidate
                  break
                }
              }
            }
          } catch {}
        }
        // Also try result.response.result directly
        if (!parsed || !Array.isArray(parsed?.account_briefs)) {
          const directResult = result?.response?.result
          if (directResult && Array.isArray(directResult?.account_briefs)) {
            parsed = directResult
          }
        }
      }

      if (!parsed || !Array.isArray(parsed?.account_briefs)) {
        // Build detailed debug info for troubleshooting
        const parsedKeys = parsed ? Object.keys(parsed).join(', ') : 'null'
        const resultResponseStatus = result?.response?.status ?? 'N/A'
        const resultResponseMsg = result?.response?.message ?? ''
        const resultError = result?.error ?? ''
        const responseResultKeys = result?.response?.result ? Object.keys(result.response.result).join(', ') : 'none'
        const rawSnippet = result?.raw_response ? String(result.raw_response).slice(0, 500) : 'none'

        console.error('[runMarketingStrategy] Parse failed.', {
          parsedKeys,
          resultSuccess: result?.success,
          resultResponseStatus,
          resultResponseMsg,
          resultError,
          responseResultKeys,
          rawSnippet,
        })

        // Show actionable error instead of generic one
        const detail = resultError || resultResponseMsg || `Parsed keys: [${parsedKeys}]. Expected 'account_briefs' array.`
        setError(`Marketing strategy parsing issue: ${detail}`)
        setLoading(false)
        setActiveAgentId(null)
        return
      }

      const strategy: MarketingStrategy = {
        account_briefs: parsed.account_briefs.map((ab: any) => ({
          company_name: ab?.company_name ?? '',
          scores: {
            signal_density: typeof ab?.scores?.signal_density === 'number' ? ab.scores.signal_density : 0,
            strategic_fit: typeof ab?.scores?.strategic_fit === 'number' ? ab.scores.strategic_fit : 0,
            timing: typeof ab?.scores?.timing === 'number' ? ab.scores.timing : 0,
            scale_indicator: typeof ab?.scores?.scale_indicator === 'number' ? ab.scores.scale_indicator : 0,
            weighted_score: typeof ab?.scores?.weighted_score === 'number' ? ab.scores.weighted_score : 0,
          },
          tier: ab?.tier ?? 'tier_3_nurture',
          tier_rationale: ab?.tier_rationale ?? '',
          key_angles: Array.isArray(ab?.key_angles) ? ab.key_angles : [],
          channel_strategy: Array.isArray(ab?.channel_strategy) ? ab.channel_strategy : [],
          priority_signals: Array.isArray(ab?.priority_signals) ? ab.priority_signals : [],
        })),
        clusters: Array.isArray(parsed.clusters) ? parsed.clusters.map((cl: any) => ({
          cluster_name: cl?.cluster_name ?? '',
          theme: cl?.theme ?? '',
          company_names: Array.isArray(cl?.company_names) ? cl.company_names : [],
          recommended_content_angle: cl?.recommended_content_angle ?? '',
        })) : [],
        tier_summary: {
          tier_1_count: typeof parsed.tier_summary?.tier_1_count === 'number' ? parsed.tier_summary.tier_1_count : 0,
          tier_2_count: typeof parsed.tier_summary?.tier_2_count === 'number' ? parsed.tier_summary.tier_2_count : 0,
          tier_3_count: typeof parsed.tier_summary?.tier_3_count === 'number' ? parsed.tier_summary.tier_3_count : 0,
          total_accounts: typeof parsed.tier_summary?.total_accounts === 'number' ? parsed.tier_summary.total_accounts : enriched.length,
        },
        campaign_themes: Array.isArray(parsed.campaign_themes) ? parsed.campaign_themes : [],
        // V2: Execution Playbook fields
        execution_playbook: parsed.execution_playbook && typeof parsed.execution_playbook === 'object' ? {
          campaign_name: parsed.execution_playbook.campaign_name ?? campaign.name,
          total_duration_weeks: typeof parsed.execution_playbook.total_duration_weeks === 'number' ? parsed.execution_playbook.total_duration_weeks : 6,
          phases: Array.isArray(parsed.execution_playbook.phases) ? parsed.execution_playbook.phases.map((p: any) => ({
            phase: typeof p?.phase === 'number' ? p.phase : 0,
            name: p?.name ?? '',
            duration: p?.duration ?? '',
            objective: p?.objective ?? '',
            owner: p?.owner ?? '',
            actions: Array.isArray(p?.actions) ? p.actions.map((a: any) => ({
              action: a?.action ?? '',
              channel: a?.channel ?? '',
              details: a?.details && typeof a.details === 'object' ? {
                campaign_type: a.details.campaign_type,
                targeting: a.details.targeting,
                estimated_audience_size: a.details.estimated_audience_size,
                daily_budget_usd: typeof a.details.daily_budget_usd === 'number' ? a.details.daily_budget_usd : undefined,
                duration_days: typeof a.details.duration_days === 'number' ? a.details.duration_days : undefined,
                total_budget_usd: typeof a.details.total_budget_usd === 'number' ? a.details.total_budget_usd : undefined,
                creative: a.details.creative,
                frequency_cap: a.details.frequency_cap,
                goal: a.details.goal,
              } : undefined,
            })) : [],
          })) : [],
        } : undefined,
        ownership_matrix: Array.isArray(parsed.ownership_matrix) ? parsed.ownership_matrix.map((o: any) => ({
          activity: o?.activity ?? '',
          owner: o?.owner ?? '',
          support: o?.support ?? '',
          tools: o?.tools ?? '',
          tier: o?.tier ?? '',
        })) : undefined,
        budget_summary: parsed.budget_summary && typeof parsed.budget_summary === 'object' ? {
          linkedin_ads: parsed.budget_summary.linkedin_ads ?? {},
          content_production: parsed.budget_summary.content_production ?? {},
          total_campaign_budget_usd: typeof parsed.budget_summary.total_campaign_budget_usd === 'number' ? parsed.budget_summary.total_campaign_budget_usd : 0,
        } : undefined,
        kpis: parsed.kpis && typeof parsed.kpis === 'object' ? parsed.kpis : undefined,
        tier_movement_rules: parsed.tier_movement_rules && typeof parsed.tier_movement_rules === 'object' ? parsed.tier_movement_rules : undefined,
      }

      const t1 = strategy.account_briefs.filter(b => b.tier === 'tier_1_abm').length
      const t2 = strategy.account_briefs.filter(b => b.tier === 'tier_2_cluster').length
      const t3 = strategy.account_briefs.filter(b => b.tier === 'tier_3_nurture').length
      const clusterCount = strategy.clusters.length
      const hasPlaybook = !!strategy.execution_playbook

      updateCampaign({
        ...campaign,
        marketingStrategy: strategy,
        stage: 'marketing',
        marketingSummary: `Scored ${strategy.account_briefs.length} accounts: ${t1} Tier 1 ABM, ${t2} Tier 2 Cluster (${clusterCount} cluster${clusterCount !== 1 ? 's' : ''}), ${t3} Tier 3 Nurture.${hasPlaybook ? ` ${strategy.execution_playbook!.total_duration_weeks}-week execution playbook generated.` : ''}`,
        updatedAt: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Marketing strategy analysis failed. Please try again.')
    }
    setLoading(false)
    setActiveAgentId(null)
  }, [updateCampaign])

  const runContentGeneration = useCallback(async (campaign: Campaign) => {
    const strategy = campaign.marketingStrategy
    if (!strategy || !Array.isArray(strategy.account_briefs) || strategy.account_briefs.length === 0) return
    setLoading(true)
    setError(null)
    setActiveAgentId(CONTENT_GENERATOR_ID)

    const enriched = Array.isArray(campaign.enrichedCompanies) ? campaign.enrichedCompanies : []
    const allContent: CompanyContent[] = Array.isArray(campaign.marketingContent) ? [...campaign.marketingContent] : []
    const briefs = strategy.account_briefs
    // Skip companies that already have content
    const existingNames = new Set(allContent.map(c => c.company_name))
    const toGenerate = briefs.filter(b => !existingNames.has(b.company_name))

    if (toGenerate.length === 0) {
      setLoading(false)
      setActiveAgentId(null)
      return
    }

    setContentProgress({ current: 0, total: toGenerate.length, completed: [] })

    try {
      const CONCURRENCY = 3
      const queue = [...toGenerate]
      const active: Promise<void>[] = []
      let completedCount = 0

      const processCompany = async (brief: AccountBrief) => {
        const ec = enriched.find(e => e.company_name === brief.company_name)
        const companyInfo = ec ? {
          company_name: ec.company_name,
          revenue: ec.revenue?.figure ?? 'N/A',
          recent_news: Array.isArray(ec.recent_news) ? ec.recent_news.slice(0, 3).map((n: NewsItem) => n.headline) : [],
          growth_indicators: Array.isArray(ec.growth_indicators) ? ec.growth_indicators.map((g: GrowthIndicator) => g.type + ': ' + g.detail) : [],
          risk_challenges: Array.isArray(ec.risk_insurance_challenges) ? ec.risk_insurance_challenges.slice(0, 2).map((r: RiskInsuranceChallenge) => r.challenge) : [],
          key_nuggets: Array.isArray(ec.key_sales_nuggets) ? ec.key_sales_nuggets.slice(0, 3).map((s: SalesNugget) => s.nugget) : [],
        } : { company_name: brief.company_name }

        // Find cluster info for Tier 2
        const cluster = brief.tier === 'tier_2_cluster'
          ? strategy.clusters.find(cl => Array.isArray(cl.company_names) && cl.company_names.includes(brief.company_name))
          : null

        const message = `Generate marketing content for ${brief.company_name} (${brief.tier}). Key angles: ${brief.key_angles.join('; ')}. Channels: ${brief.channel_strategy.join(', ')}.${cluster ? ` Cluster: "${cluster.cluster_name}" — ${cluster.theme}. Content angle: ${cluster.recommended_content_angle}.` : ''}\n\nCompany intel: ${JSON.stringify(companyInfo)}`

        try {
          const result = await callAIAgent(message, CONTENT_GENERATOR_ID)
          const parsed = parseAgentResult(result)

          if (parsed) {
            const compContent: CompanyContent = {
              company_name: parsed.company_name ?? brief.company_name,
              tier: parsed.tier ?? brief.tier,
              content_assets: {
                one_pager: parsed.content_assets?.one_pager ?? null,
                email_sequence: Array.isArray(parsed.content_assets?.email_sequence) ? parsed.content_assets.email_sequence : null,
                thought_leadership: parsed.content_assets?.thought_leadership ?? null,
                email_template: parsed.content_assets?.email_template ?? null,
                nurture_email: parsed.content_assets?.nurture_email ?? null,
                ad_copy: Array.isArray(parsed.content_assets?.ad_copy) ? parsed.content_assets.ad_copy : [],
              },
              generation_notes: parsed.generation_notes ?? '',
            }
            allContent.push(compContent)
          }
        } catch (err) {
          console.warn(`[runContentGeneration] Failed for ${brief.company_name}:`, err)
        }

        completedCount++
        setContentProgress({
          current: completedCount,
          total: toGenerate.length,
          completed: allContent.map(c => c.company_name),
        })

        // Progressive save
        updateCampaign({
          ...campaign,
          marketingContent: [...allContent],
          updatedAt: new Date().toISOString(),
        })
      }

      while (queue.length > 0 || active.length > 0) {
        while (active.length < CONCURRENCY && queue.length > 0) {
          const brief = queue.shift()!
          const promise = processCompany(brief).then(() => {
            active.splice(active.indexOf(promise), 1)
          })
          active.push(promise)
        }
        if (active.length > 0) {
          await Promise.race(active)
        }
      }

      updateCampaign({
        ...campaign,
        marketingContent: allContent,
        marketingSummary: `${campaign.marketingSummary ?? ''} Generated content for ${allContent.length} accounts.`,
        updatedAt: new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Content generation failed. Please try again.')
    }
    setLoading(false)
    setActiveAgentId(null)
    setContentProgress(null)
  }, [updateCampaign])

  const currentCampaign = view === 'campaign' ? activeCampaign : null
  const isSampleCampaign = activeCampaignId === 'sample-1'

  const getAccessibleStages = (c: Campaign | null): Campaign['stage'][] => {
    if (!c) return ['discovery']
    const stages: Campaign['stage'][] = ['discovery']
    if ((c.companies?.length ?? 0) > 0) stages.push('enrichment')
    if ((c.enrichedCompanies?.length ?? 0) > 0) stages.push('marketing')
    if ((c.enrichedCompanies?.length ?? 0) > 0) stages.push('contacts')
    return stages
  }

  const stageLabels: Record<string, string> = { discovery: 'Prospect List', enrichment: 'Enriched Data', marketing: 'Marketing Strategy', contacts: 'Contacts', completed: 'Contacts' }

  return (
    <ErrorBoundary>
      <div style={THEME_VARS} className="min-h-screen bg-background text-foreground flex">
        <AppSidebar
          campaigns={displayCampaigns}
          activeCampaignId={activeCampaignId}
          sidebarFilter={sidebarFilter}
          onFilterChange={setSidebarFilter}
          onSelectCampaign={selectCampaign}
          onNewCampaign={() => setShowNewCampaign(true)}
          onViewDashboard={() => { setView('dashboard'); setActiveCampaignId(null); setError(null) }}
          activeAgentId={activeAgentId}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border/20 px-6 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              {view === 'dashboard' && <h2 className="font-serif font-bold text-foreground text-lg tracking-wide">Dashboard</h2>}
              {view === 'campaign' && currentCampaign && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
                  <button onClick={() => { setView('dashboard'); setActiveCampaignId(null); setError(null) }} className="hover:text-primary transition-colors font-medium">ProspectIQ</button>
                  <FiChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-foreground font-medium truncate max-w-[200px]">{currentCampaign.name}</span>
                  <FiChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-primary font-medium capitalize">{currentCampaign.stage}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <span className="hidden sm:inline">Sample Data</span>
                <button onClick={() => setSampleDataOn(!sampleDataOn)} className={`relative w-10 h-5 rounded-full transition-colors ${sampleDataOn ? 'bg-primary' : 'bg-muted'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sampleDataOn ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </label>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">U</div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
            {view === 'dashboard' && (
              <DashboardView
                campaigns={displayCampaigns}
                onSelectCampaign={selectCampaign}
                onNewCampaign={() => setShowNewCampaign(true)}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
              />
            )}

            {view === 'campaign' && currentCampaign && (
              <div className="max-w-5xl mx-auto">
                <div className="flex gap-1 mb-6 bg-card rounded-lg p-1 border border-border/30 overflow-x-auto">
                  {getAccessibleStages(currentCampaign).map(s => {
                    const isActive = currentCampaign.stage === s || (currentCampaign.stage === 'completed' && s === 'contacts')
                    return (
                      <button key={s} onClick={() => {
                        if (!isSampleCampaign) {
                          updateCampaign({ ...currentCampaign, stage: s, updatedAt: new Date().toISOString() })
                        }
                      }} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                        {stageLabels[s] ?? s}
                      </button>
                    )
                  })}
                </div>

                <div className="bg-muted/30 rounded-lg p-4 mb-6 border border-border/20">
                  <h3 className="font-serif font-semibold text-foreground text-base mb-1">{currentCampaign.name}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{currentCampaign.directive}</p>
                  {currentCampaign.filters && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {currentCampaign.filters.targetCount && <InlineBadge variant="accent"><FiTarget className="w-3 h-3 mr-0.5" />Target: {currentCampaign.filters.targetCount} companies</InlineBadge>}
                      {currentCampaign.filters.geography && <InlineBadge variant="muted"><FiMapPin className="w-3 h-3 mr-0.5" />{currentCampaign.filters.geography}</InlineBadge>}
                      {currentCampaign.filters.sizeRange && <InlineBadge variant="muted"><FiUsers className="w-3 h-3 mr-0.5" />{currentCampaign.filters.sizeRange}</InlineBadge>}
                      {Array.isArray(currentCampaign.filters.industries) && currentCampaign.filters.industries.map((ind, i) => <InlineBadge key={i} variant="muted"><FiBriefcase className="w-3 h-3 mr-0.5" />{ind}</InlineBadge>)}
                    </div>
                  )}
                </div>

                {currentCampaign.stage === 'discovery' && (
                  <DiscoveryView
                    campaign={currentCampaign}
                    onUpdateCampaign={updated => { if (!isSampleCampaign) updateCampaign(updated) }}
                    loading={loading}
                    error={error}
                    onRetry={() => { if (!isSampleCampaign) runDiscovery(currentCampaign) }}
                    onEnrich={() => {
                      if (isSampleCampaign) return
                      const updated = { ...currentCampaign, stage: 'enrichment' as const, updatedAt: new Date().toISOString() }
                      updateCampaign(updated)
                      runEnrichment(updated)
                    }}
                    activeAgentId={activeAgentId}
                  />
                )}

                {currentCampaign.stage === 'enrichment' && (
                  <EnrichmentView
                    campaign={currentCampaign}
                    onUpdateCampaign={updated => { if (!isSampleCampaign) updateCampaign(updated) }}
                    loading={loading}
                    error={error}
                    onRetry={() => { if (!isSampleCampaign) runEnrichment(currentCampaign) }}
                    onFindContacts={() => {
                      if (isSampleCampaign) return
                      const updated = { ...currentCampaign, stage: 'contacts' as const, updatedAt: new Date().toISOString() }
                      updateCampaign(updated)
                      runContactFinder(updated)
                    }}
                    onMarketingStrategy={() => {
                      if (isSampleCampaign) return
                      const updated = { ...currentCampaign, stage: 'marketing' as const, updatedAt: new Date().toISOString() }
                      updateCampaign(updated)
                    }}
                    enrichmentProgress={enrichmentProgress}
                  />
                )}

                {currentCampaign.stage === 'marketing' && (
                  <MarketingView
                    campaign={currentCampaign}
                    onUpdateCampaign={updated => { if (!isSampleCampaign) updateCampaign(updated) }}
                    loading={loading}
                    error={error}
                    onRetry={() => { if (!isSampleCampaign) runMarketingStrategy(currentCampaign) }}
                    onRunStrategy={() => {
                      if (isSampleCampaign) return
                      const updated = { ...currentCampaign, stage: 'marketing' as const, updatedAt: new Date().toISOString() }
                      updateCampaign(updated)
                      runMarketingStrategy(updated)
                    }}
                    onGenerateContent={() => {
                      if (isSampleCampaign) return
                      runContentGeneration(currentCampaign)
                    }}
                    onFindContacts={() => {
                      if (isSampleCampaign) return
                      const updated = { ...currentCampaign, stage: 'contacts' as const, updatedAt: new Date().toISOString() }
                      updateCampaign(updated)
                      runContactFinder(updated)
                    }}
                    contentProgress={contentProgress}
                  />
                )}

                {(currentCampaign.stage === 'contacts' || currentCampaign.stage === 'completed') && (
                  <ContactsView
                    campaign={currentCampaign}
                    loading={loading}
                    error={error}
                    onRetry={() => { if (!isSampleCampaign) runContactFinder(currentCampaign) }}
                  />
                )}
              </div>
            )}

            {view === 'campaign' && !currentCampaign && (
              <div className="text-center py-20">
                <FiAlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-serif font-semibold text-foreground mb-2">Campaign not found</h2>
                <button onClick={() => { setView('dashboard'); setActiveCampaignId(null) }} className="text-sm text-primary hover:underline mt-2">Back to Dashboard</button>
              </div>
            )}
          </div>
        </main>

        <NewCampaignModal open={showNewCampaign} onClose={() => setShowNewCampaign(false)} onCreate={createCampaign} />
      </div>
    </ErrorBoundary>
  )
}
