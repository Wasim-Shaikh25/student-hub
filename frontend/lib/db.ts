import { JSONFileSyncPreset } from 'lowdb/node'
import { LowSync } from 'lowdb'
import { join } from 'path'
import { mkdirSync } from 'fs'
import type { DbSchema } from './types'

const defaultData: DbSchema = {
  users: [],
  cases: [],
  evidence: [],
  confirmations: [],
  comments: [],
  follows: [],
  expertProfiles: [],
  reports: [],
  auditLogs: [],
  categories: [
    'Scholarship / Fee',
    'Examination / Results',
    'Admissions',
    'Hostel / Accommodation',
    'Harassment / Discipline',
    'Infrastructure',
    'Faculty / Teaching',
    'Transport',
    'Other',
  ],
  institutions: [
    'University of Mumbai',
    'Delhi University',
    'IIT Bombay',
    'Other',
  ],
  locations: ['Mumbai', 'Delhi', 'Bangalore', 'Other'],
}

let db: LowSync<DbSchema> | null = null

function getDataDir(): string {
  if (process.env.STUDENTSHUB_DATA_DIR) {
    return process.env.STUDENTSHUB_DATA_DIR.startsWith('/')
      ? process.env.STUDENTSHUB_DATA_DIR
      : join(process.cwd(), process.env.STUDENTSHUB_DATA_DIR)
  }
  if (process.env.NETLIFY) {
    return '/tmp/studentshub/data'
  }
  return join(process.cwd(), 'data')
}

export function getDb(): LowSync<DbSchema> {
  if (!db) {
    const dir = getDataDir()
    const file = join(dir, 'db.json')
    mkdirSync(dir, { recursive: true })
    db = JSONFileSyncPreset<DbSchema>(file, defaultData)
    db.read()
  }
  return db
}
