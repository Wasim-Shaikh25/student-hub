import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { resolve, extname } from 'path'

const UPLOAD_DIR = process.env.STUDENTSHUB_UPLOAD_DIR
  ? process.env.STUDENTSHUB_UPLOAD_DIR.startsWith('/')
    ? process.env.STUDENTSHUB_UPLOAD_DIR
    : resolve(process.cwd(), process.env.STUDENTSHUB_UPLOAD_DIR)
  : process.env.NETLIFY
    ? '/tmp/studentshub/uploads'
    : resolve(process.cwd(), 'public', 'uploads')

const MIME_TYPES: Record<string, string> = {
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

function getContentType(filePath: string): string {
  return MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream'
}

export async function GET(
  _request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const relativePath = params.path.join('/')
    const filePath = resolve(UPLOAD_DIR, relativePath)

    if (!filePath.startsWith(resolve(UPLOAD_DIR))) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const file = await readFile(filePath)
    return new NextResponse(file, {
      headers: {
        'Content-Type': getContentType(filePath),
        'Content-Disposition': `inline; filename="${params.path[params.path.length - 1]}"`,
      },
    })
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }
}
