// Static demo data used as a fallback when the backend API is unavailable
// (for example, on the Netlify deploy preview without a running backend).
// This mirrors the seed data created by backend/app/main.py:seed_demo_data().

export const DEMO_INVESTIGATIONS = [
  {
    id: 1,
    article: {
      id: 1,
      source: "Example News",
      title: "State claims 100% school electrification, but ground reports differ",
      url: "https://example.com/demo-news",
      published_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      summary: "Official press releases say all schools have electricity, yet student submissions show power cuts in rural classrooms.",
      status: "published",
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    verdict: "misleading",
    confidence: 0.75,
    summary: "Official claim is overstated; on-the-ground reports show frequent outages in rural schools.",
    detailed_explanation: "The press release reflects infrastructure installation but does not account for maintenance and supply reliability.",
    quality_score: 0.82,
    conflicting_sources: true,
    missing_citations: false,
    published_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    sources: [
      {
        id: 1,
        url: "https://example.com/official-release",
        title: "Official Press Release",
        source_type: "government_document",
        published_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        excerpt: "The department confirms 100% electrification of schools.",
        relation: "supports",
        source_authority_score: 0.7,
        relevance_score: 0.9,
        recency_score: 0.8,
        created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    claims: [
      {
        id: 1,
        claim_text: "All government schools in the state have uninterrupted electricity.",
        importance: "high",
        status: "analyzed",
        evidence_items: [
          {
            id: 1,
            url: "https://example.com/official-release",
            title: "Official Press Release",
            source_type: "government_document",
            published_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
            excerpt: "The department confirms 100% electrification of schools.",
            relation: "supports",
            source_authority_score: 0.7,
            relevance_score: 0.9,
            recency_score: 0.8,
            created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ],
      },
    ],
  },
]

export const DEMO_SCHEME_RECORDS = [
  {
    id: 1,
    scheme_id: "mid-day-meal",
    scheme_name: "Mid-Day Meal Scheme",
    scheme_aliases: ["MDM", "School Meal Programme"],
    financial_year: "2024-25",
    amount_allocated: 1450000000000,
    amount_released: 980000000000,
    amount_spent: 720000000000,
    applicable_state_id: 1,
    source_type: "budget",
    source_name: "Union Budget 2024-25",
    data_confidence: 95,
    extracted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    scheme_id: "samagra-shiksha",
    scheme_name: "Samagra Shiksha Abhiyan",
    scheme_aliases: ["SSA", "Integrated School Education"],
    financial_year: "2024-25",
    amount_allocated: 3750000000000,
    amount_released: 2900000000000,
    amount_spent: 2450000000000,
    applicable_state_id: 2,
    source_type: "budget",
    source_name: "Union Budget 2024-25",
    data_confidence: 92,
    extracted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    scheme_id: "swachh-bharat-schools",
    scheme_name: "Swachh Bharat Swachh Vidyalaya",
    scheme_aliases: ["SBSV", "Clean Schools"],
    financial_year: "2024-25",
    amount_allocated: 120000000000,
    amount_released: 85000000000,
    amount_spent: 62000000000,
    applicable_state_id: 3,
    source_type: "budget",
    source_name: "Union Budget 2024-25",
    data_confidence: 88,
    extracted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

export function getDemoInvestigationById(id: string) {
  const investigation = DEMO_INVESTIGATIONS.find((inv) => String(inv.id) === id)
  return investigation ? { ...investigation } : undefined
}

export function getDemoSchemeById(id: string) {
  const records = DEMO_SCHEME_RECORDS.filter((s) => s.scheme_id === id || String(s.id) === id)
  if (records.length === 0) return undefined

  const primary = records[0]
  const aliases = new Set<string>()
  const financialYears: Record<string, Record<string, unknown>> = {}

  for (const record of records) {
    for (const alias of record.scheme_aliases || []) aliases.add(alias)
    if (record.financial_year) {
      financialYears[record.financial_year] = {
        allocated: record.amount_allocated,
        released: record.amount_released,
        spent: record.amount_spent,
        source: record.source_name,
        data_confidence: record.data_confidence,
      }
    }
  }

  const lastUpdated = records
    .map((r) => (r.extracted_at ? new Date(r.extracted_at).getTime() : 0))
    .sort((a, b) => b - a)[0]

  return {
    scheme_id: id,
    scheme_name: primary.scheme_name,
    aliases: Array.from(aliases),
    source_type: primary.source_type,
    financial_years: financialYears,
    states_covered: records.map((r) => r.applicable_state_id).filter(Boolean),
    last_updated: lastUpdated ? new Date(lastUpdated).toISOString() : undefined,
  }
}
