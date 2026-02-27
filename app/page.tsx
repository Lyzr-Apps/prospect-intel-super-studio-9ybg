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
  FiUpload, FiFile, FiColumns
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

// ─── AGENT CONFIG (agent-agnostic labels) ────────────────────────────────────
const AGENT_CONFIG = {
  discoveryManager: { id: DISCOVERY_MANAGER_ID, name: 'Discovery Manager', desc: 'Orchestrates multi-agent discovery pipeline' },
  discoveryResearcher: { id: DISCOVERY_RESEARCHER_ID, name: 'Discovery Researcher', desc: 'Web research across news, reports & directories' },
  companyExtractor: { id: COMPANY_EXTRACTOR_ID, name: 'Company Extractor', desc: 'Extracts and structures company data from findings' },
  enrichment: { id: ENRICHMENT_MANAGER_ID, name: 'Deep Enrichment', desc: 'Multi-agent research with sales leader validation' },
  contactFinder: { id: CONTACT_AGENT_ID, name: 'Contact Finder', desc: 'Verified contacts via Apollo integration' },
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

interface Campaign {
  id: string
  name: string
  directive: string
  filters: CampaignFilters
  companies: Company[]
  enrichedCompanies: EnrichedCompany[]
  contacts: CompanyContacts[]
  artifactFiles: ArtifactFile[]
  stage: 'discovery' | 'enrichment' | 'contacts' | 'completed'
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
}

type AppView = 'dashboard' | 'campaign'
type SidebarFilter = 'all' | 'in_progress' | 'completed'

// ─── HELPER: parse agent result robustly ─────────────────────────────────────
const TARGET_KEYS = ['companies', 'enriched_companies', 'company_contacts', 'segmentation_strategy', 'extracted_companies', 'findings', 'revenue', 'growth_indicators', 'recent_news', 'csuite_changes', 'competitive_intel', 'risk_insurance_challenges', 'hr_workforce_challenges', 'key_sales_nuggets']

function hasTargetKeys(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false
  return TARGET_KEYS.some(key => key in obj && obj[key] != null)
}

function deepFindTarget(obj: any, depth = 0): any {
  if (!obj || typeof obj !== 'object' || depth > 8) return null
  if (hasTargetKeys(obj)) return obj

  // Check common nesting patterns from Lyzr agent responses
  const unwrapKeys = ['result', 'response', 'data', 'output', 'content']
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
      { name: 'DataVault Technologies', industry: 'Data Analytics', hq_location: 'San Francisco, CA', estimated_size: '500-1000', relevance_score: 9, relevance_reasoning: 'Strong growth in cloud data analytics, recent Series C funding, expanding enterprise customer base.', website: 'https://datavault.example.com', selected: true },
      { name: 'CyberShield Solutions', industry: 'Cybersecurity', hq_location: 'Austin, TX', estimated_size: '200-500', relevance_score: 8, relevance_reasoning: 'Leading endpoint security vendor with rapid SMB-to-enterprise transition.', website: 'https://cybershield.example.com', selected: true },
      { name: 'CloudNexus Inc', industry: 'Cloud Infrastructure', hq_location: 'Seattle, WA', estimated_size: '1000-2000', relevance_score: 8, relevance_reasoning: 'Major cloud orchestration platform with strong partnership network.', website: 'https://cloudnexus.example.com', selected: false },
      { name: 'InsightFlow Analytics', industry: 'Business Intelligence', hq_location: 'New York, NY', estimated_size: '300-600', relevance_score: 7, relevance_reasoning: 'Emerging BI platform with AI-driven insights for mid-market.', website: 'https://insightflow.example.com', selected: false },
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
    { key: 'contacts', label: 'Contacts', icon: FiUsers },
  ]
  const stageOrder = ['discovery', 'enrichment', 'contacts', 'completed']
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
            <FiRefreshCw className="w-4 h-4 animate-spin" /> Discovery Pipeline Active
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FiSearch className="w-3 h-3 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Step 1: Web Research</p>
                <p className="text-xs text-muted-foreground">Searching news articles, industry reports, press releases, and market analyses across multiple search strategies...</p>
              </div>
            </div>
            <div className="ml-3 w-px h-4 bg-border/40" />
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-muted/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FiLayers className="w-3 h-3 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Step 2: Company Name Extraction</p>
                <p className="text-xs text-muted-foreground">Identifying every company name mentioned in search results -- even companies mentioned in passing</p>
              </div>
            </div>
            <div className="ml-3 w-px h-4 bg-border/40" />
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-muted/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <FiDatabase className="w-3 h-3 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Step 3: Deduplication & Scoring</p>
                <p className="text-xs text-muted-foreground">Merging results, removing duplicates, and scoring each company for relevance</p>
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
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto leading-relaxed">The Discovery pipeline will search the web, extract every company name from articles and reports, and build a deduplicated prospect list of up to {campaign.filters?.targetCount ?? 50}+ companies.</p>
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
                    <th className="p-3 font-serif font-semibold text-foreground tracking-wide">Company</th>
                    <th className="p-3 font-serif font-semibold text-foreground tracking-wide hidden md:table-cell">Industry</th>
                    <th className="p-3 font-serif font-semibold text-foreground tracking-wide hidden lg:table-cell">Location</th>
                    <th className="p-3 font-serif font-semibold text-foreground tracking-wide hidden lg:table-cell">Size</th>
                    <th className="p-3 font-serif font-semibold text-foreground tracking-wide">Relevance</th>
                    <th className="p-3 font-serif font-semibold text-foreground tracking-wide hidden xl:table-cell">Segment</th>
                    <th className="p-3 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map(co => (
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
                        <td className="p-3 hidden xl:table-cell">{co.source_segment === 'File Upload' ? <InlineBadge variant="accent"><FiUpload className="w-3 h-3 mr-0.5" />Uploaded</InlineBadge> : co.source_segment ? <InlineBadge variant="muted">{co.source_segment}</InlineBadge> : <span className="text-xs text-muted-foreground">-</span>}</td>
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Relevance Reasoning</h4>
                                <p className="text-sm text-foreground leading-relaxed">{co.relevance_reasoning}</p>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Details</h4>
                                <div className="space-y-1 text-sm">
                                  <p><span className="text-muted-foreground">Industry:</span> <span className="text-foreground">{co.industry}</span></p>
                                  <p><span className="text-muted-foreground">Location:</span> <span className="text-foreground">{co.hq_location}</span></p>
                                  <p><span className="text-muted-foreground">Est. Size:</span> <span className="text-foreground">{co.estimated_size}</span></p>
                                  <p><span className="text-muted-foreground">Score:</span> <span className="text-foreground">{co.relevance_score}/10</span></p>
                                  {co.source_segment && <p><span className="text-muted-foreground">Segment:</span> <span className="text-foreground">{co.source_segment}</span></p>}
                                </div>
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
function EnrichmentView({ campaign, onUpdateCampaign, loading, error, onRetry, onFindContacts, enrichmentProgress }: {
  campaign: Campaign
  onUpdateCampaign: (c: Campaign) => void
  loading: boolean
  error: string | null
  onRetry: () => void
  onFindContacts: () => void
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
            <span className="text-sm text-muted-foreground">{selectedCount} of {enrichedData.length} selected for contact finding</span>
            <button onClick={onFindContacts} disabled={selectedCount === 0 || loading} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
              <FiUsers className="w-4 h-4" /> Find Contacts ({selectedCount})
            </button>
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
  const runDirectPipeline = useCallback(async (campaign: Campaign): Promise<Company[]> => {
    const targetCount = campaign.filters?.targetCount ?? 50
    const geography = campaign.filters?.geography || ''
    const industries = campaign.filters?.industries?.join(', ') || ''
    const sizeRange = campaign.filters?.sizeRange || ''

    console.log('[runDirectPipeline] Starting direct Researcher → Extractor pipeline')
    setActiveAgentId(DISCOVERY_RESEARCHER_ID)

    // Step 1: Call Discovery Researcher with the campaign directive
    const researchMessage = `Search directive: ${campaign.directive}.
${geography ? `Geography focus: ${geography}.` : ''}
${industries ? `Target industries: ${industries}.` : ''}
${sizeRange ? `Company size range: ${sizeRange}.` : ''}

Search broadly across news articles, industry reports, press releases, market analyses, funding announcements, and company directories. Find as many relevant companies as possible (target: ${targetCount}+). For each source, list EVERY company name mentioned — even companies mentioned in passing or as competitors, partners, or vendors.`

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

    // Build the findings text to pass to the Extractor
    let findingsText = ''
    if (Array.isArray(researchParsed?.findings)) {
      findingsText = researchParsed.findings.map((f: any, i: number) => {
        const title = f?.source_title || `Source ${i + 1}`
        const type = f?.source_type || ''
        const content = f?.content || ''
        const companies = Array.isArray(f?.companies_mentioned) ? f.companies_mentioned.join(', ') : ''
        const date = f?.date_published || ''
        return `--- SOURCE ${i + 1}: ${title} (${type}, ${date}) ---\n${content}\nCompanies mentioned: ${companies}`
      }).join('\n\n')
    } else if (researchParsed?.segment_summary) {
      findingsText = researchParsed.segment_summary
    } else if (typeof researchResult.raw_response === 'string') {
      findingsText = researchResult.raw_response
    }

    if (!findingsText.trim()) {
      console.warn('[runDirectPipeline] No findings text to extract from')
      return []
    }

    console.log('[runDirectPipeline] Findings text length:', findingsText.length)

    // Step 2: Call Company Name Extractor with the findings
    setActiveAgentId(COMPANY_EXTRACTOR_ID)

    // Truncate if too long for a single message (keep under 50K chars)
    const maxLen = 50000
    const truncatedFindings = findingsText.length > maxLen
      ? findingsText.slice(0, maxLen) + '\n\n[...truncated for length]'
      : findingsText

    const extractMessage = `Extract every company name from the following web research findings. This is for the directive: "${campaign.directive}".
${geography ? `Geography focus: ${geography}.` : ''}
${industries ? `Target industries: ${industries}.` : ''}

IMPORTANT: Extract EVERY company mentioned — even competitors, partners, vendors, or companies mentioned in passing. For each company, provide industry, HQ location, estimated size, and relevance score (1-10) based on the directive.

RESEARCH FINDINGS:
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
                  selected: true,
                })
              }
            }
          }
        }
        console.log('[runDirectPipeline] Salvaged', salvaged.length, 'companies from Researcher findings')
        return salvaged
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
      selected: true,
    })).filter((c: Company) => c.name.trim().length > 0)

    // Deduplicate
    const { deduplicated } = deduplicateCompanies(companies)
    console.log(`[runDirectPipeline] Complete: ${deduplicated.length} unique companies extracted (${rawCompanies.length} raw, ${companies.length} valid)`)

    return deduplicated
  }, [updateCampaign])

  // ─ Agent Calls ─
  const runDiscovery = useCallback(async (campaign: Campaign) => {
    setLoading(true)
    setError(null)
    setActiveAgentId(DISCOVERY_MANAGER_ID)
    const targetCount = campaign.filters?.targetCount ?? 50
    const filtersStr = campaign.filters ? JSON.stringify({ geography: campaign.filters.geography, sizeRange: campaign.filters.sizeRange, industries: campaign.filters.industries }) : 'No specific filters'
    const message = `Business directive: ${campaign.directive}. Target company count: ${targetCount}. Filters: ${filtersStr}. Use the full Research-then-Extract pipeline: 1) Segment this directive into 3-5 search strategies, 2) For each segment, delegate to the Discovery Researcher to search the web, 3) Pass ALL findings to the Company Name Extractor to identify every company name from articles and reports, 4) Deduplicate and consolidate into a final list of ${targetCount}+ companies. Cast the widest net possible - extract companies from news articles, press releases, industry reports, and market analyses.`
    try {
      const result = await callAIAgent(message, DISCOVERY_MANAGER_ID)
      console.log('[runDiscovery] Raw agent result:', JSON.stringify(result).slice(0, 2000))

      if (!result?.success) {
        const errMsg = result?.error || result?.response?.message || 'Agent returned an error. Please try again.'
        console.error('[runDiscovery] Agent call failed:', errMsg)
        setError(errMsg)
        setLoading(false)
        setActiveAgentId(null)
        return
      }

      const parsed = parseAgentResult(result)
      console.log('[runDiscovery] Parsed result keys:', parsed ? Object.keys(parsed) : 'null')

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
        selected: true,
      })).filter((c: Company) => c.name.trim().length > 0)

      if (companies.length === 0) {
        console.warn('[runDiscovery] Manager returned 0 companies. Falling back to direct pipeline. Parsed keys:', Object.keys(parsed))
        // FALLBACK: Directly orchestrate Researcher + Extractor from frontend
        try {
          const fallbackCompanies = await runDirectPipeline(campaign)
          if (fallbackCompanies.length > 0) {
            const segStrategy: SegmentStrategy[] = [{ segment_name: 'Direct Pipeline Fallback', target_count: targetCount, actual_count: fallbackCompanies.length }]
            updateCampaign({
              ...campaign, companies: fallbackCompanies, stage: 'discovery',
              searchSummary: `Found ${fallbackCompanies.length} companies via direct Research + Extract pipeline (fallback mode).`,
              segmentationStrategy: segStrategy, duplicatesRemoved: 0, updatedAt: new Date().toISOString(),
            })
            setLoading(false)
            setActiveAgentId(null)
            return
          }
        } catch (fallbackErr) {
          console.error('[runDiscovery] Fallback pipeline also failed:', fallbackErr)
        }
        setError(`Discovery completed but no companies were found. Try a more specific directive or retry.`)
        setLoading(false)
        setActiveAgentId(null)
        return
      }

      console.log(`[runDiscovery] Successfully extracted ${companies.length} companies`)

      const segmentationStrategy: SegmentStrategy[] = Array.isArray(parsed?.segmentation_strategy)
        ? parsed.segmentation_strategy.map((s: any) => ({
            segment_name: s?.segment_name ?? '', target_count: typeof s?.target_count === 'number' ? s.target_count : 0,
            actual_count: typeof s?.actual_count === 'number' ? s.actual_count : 0,
          }))
        : []
      const duplicatesRemoved = typeof parsed?.duplicates_removed === 'number' ? parsed.duplicates_removed : 0
      updateCampaign({
        ...campaign, companies, stage: 'discovery', searchSummary: parsed?.search_summary ?? '',
        segmentationStrategy, duplicatesRemoved, updatedAt: new Date().toISOString(),
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

    // Extract parsed data from each sub-agent result
    const extractParsed = (settled: PromiseSettledResult<AIAgentResponse>): any => {
      if (settled.status === 'rejected') return null
      if (!settled.value?.success) return null
      return parseAgentResult(settled.value)
    }

    const financialData = extractParsed(financialRes)
    const newsData = extractParsed(newsRes)
    const competitiveData = extractParsed(competitiveRes)
    const riskData = extractParsed(riskRes)

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

    const enrichedResults: EnrichedCompany[] = []
    let totalTime = 0

    setEnrichmentProgress({ current: 0, total: selected.length, completed: [], inFlight: [] })

    try {
      // Each company calls 4 sub-agents directly in parallel (flat calls, not manager-chained),
      // so we can run 5 companies concurrently for maximum throughput
      const CONCURRENCY = 5
      const queue = [...selected]
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
            total: selected.length,
            completed: [...enrichedResults.map(c => c.company_name)],
            inFlight: [...inFlightNames],
          })

          setActiveAgentId(FINANCIAL_GROWTH_AGENT_ID)

          updateCampaign({
            ...campaign,
            enrichedCompanies: [...enrichedResults],
            stage: 'enrichment',
            enrichmentSummary: `Enriched ${enrichedResults.length} of ${selected.length} companies via ${AGENT_CONFIG.enrichment.name}.`,
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
          total: selected.length,
          completed: [...enrichedResults.map(c => c.company_name)],
          inFlight: [...inFlightNames],
        })
        if (active.length > 0) {
          await Promise.race(active)
        }
      }

      if (enrichedResults.length === 0) {
        setError('Enrichment agents failed to return results. Please try again.')
      }

      updateCampaign({
        ...campaign,
        enrichedCompanies: enrichedResults,
        stage: 'enrichment',
        enrichmentSummary: `Enriched ${enrichedResults.length} companies with revenue, news, leadership, growth signals, competitive intelligence, risk & insurance challenges, HR challenges, and sales nuggets via 4 parallel research agents.`,
        enrichmentTime: totalTime,
        updatedAt: new Date().toISOString(),
      })

      console.log(`[runEnrichment] Complete: ${enrichedResults.length} enriched companies. Total time: ${(totalTime / 1000).toFixed(1)}s across ${selected.length} companies`)
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

  const currentCampaign = view === 'campaign' ? activeCampaign : null
  const isSampleCampaign = activeCampaignId === 'sample-1'

  const getAccessibleStages = (c: Campaign | null): Campaign['stage'][] => {
    if (!c) return ['discovery']
    const stages: Campaign['stage'][] = ['discovery']
    if ((c.companies?.length ?? 0) > 0) stages.push('enrichment')
    if ((c.enrichedCompanies?.length ?? 0) > 0) stages.push('contacts')
    return stages
  }

  const stageLabels: Record<string, string> = { discovery: 'Prospect List', enrichment: 'Enriched Data', contacts: 'Contacts', completed: 'Contacts' }

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
                    enrichmentProgress={enrichmentProgress}
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
