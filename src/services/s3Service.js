/**
 * S3 Service — ManipulationReplay
 *
 * Supports two access modes:
 *   1. Public bucket  — no credentials needed, uses unsigned fetch()
 *   2. Private bucket — requires AccessKeyId + SecretAccessKey
 *                       uses @aws-sdk/client-s3 in browser
 *
 * S3 bucket CORS requirement (add to bucket CORS policy):
 * [
 *   {
 *     "AllowedHeaders": ["*"],
 *     "AllowedMethods": ["GET", "HEAD"],
 *     "AllowedOrigins": ["*"],
 *     "ExposeHeaders": ["Content-Length", "Content-Type", "ETag"]
 *   }
 * ]
 *
 * Config shape stored in localStorage under 'mr_s3_config':
 * {
 *   bucket:          string   (required)
 *   region:          string   (required, e.g. "ap-northeast-2")
 *   prefix:          string   (optional folder path, e.g. "logs/MR-001/")
 *   accessKeyId:     string   (optional — leave empty for public buckets)
 *   secretAccessKey: string   (optional)
 *   endpoint:        string   (optional — custom endpoint for MinIO, etc.)
 *   usePathStyle:    boolean  (optional — true for MinIO/custom)
 * }
 */

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'

const CONFIG_KEY = 'mr_s3_config'

// ── Config persistence ────────────────────────────────────────────────────────

export function loadS3Config() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveS3Config(cfg) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}

export function clearS3Config() {
  localStorage.removeItem(CONFIG_KEY)
}

// ── Client factory ────────────────────────────────────────────────────────────

function makeClient(cfg) {
  const options = {
    region: cfg.region || 'ap-northeast-2',
    forcePathStyle: cfg.usePathStyle ?? false,
  }
  if (cfg.endpoint) {
    options.endpoint = cfg.endpoint
  }
  if (cfg.accessKeyId && cfg.secretAccessKey) {
    options.credentials = {
      accessKeyId:     cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
    }
  } else {
    // Anonymous / public bucket — use a no-op signer
    options.signer = { sign: async (req) => req }
    options.credentials = {
      accessKeyId: 'anonymous',
      secretAccessKey: 'anonymous',
    }
  }
  return new S3Client(options)
}

// ── Base URL for public fetch fallback ────────────────────────────────────────

function bucketBaseUrl(cfg) {
  if (cfg.endpoint) {
    const ep = cfg.endpoint.replace(/\/$/, '')
    return `${ep}/${cfg.bucket}`
  }
  return `https://${cfg.bucket}.s3.${cfg.region}.amazonaws.com`
}

// ── List MCAP files ───────────────────────────────────────────────────────────

/**
 * Lists .mcap files in the configured bucket/prefix.
 * @param {object} cfg  S3 config object
 * @returns {Promise<Array<S3File>>}
 *
 * S3File: { key, name, size, lastModified, durationEstimate, issues }
 */
export async function listMcapFiles(cfg) {
  const isPublic = !cfg.accessKeyId

  if (isPublic) {
    return listPublic(cfg)
  }

  const client = makeClient(cfg)
  const prefix = cfg.prefix ?? ''
  const results = []
  let continuationToken

  do {
    const cmd = new ListObjectsV2Command({
      Bucket:            cfg.bucket,
      Prefix:            prefix,
      ContinuationToken: continuationToken,
      MaxKeys:           200,
    })
    const res = await client.send(cmd)

    for (const obj of res.Contents ?? []) {
      if (!obj.Key?.endsWith('.mcap')) continue
      results.push({
        key:          obj.Key,
        name:         obj.Key.split('/').pop(),
        size:         obj.Size,
        sizeLabel:    formatBytes(obj.Size),
        lastModified: obj.LastModified,
        eTag:         obj.ETag,
      })
    }
    continuationToken = res.NextContinuationToken
  } while (continuationToken)

  return results.sort((a, b) => b.lastModified - a.lastModified)
}

async function listPublic(cfg) {
  const base    = bucketBaseUrl(cfg)
  const prefix  = cfg.prefix ?? ''
  const url     = `${base}/?list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=200`

  const res  = await fetch(url)
  if (!res.ok) throw new Error(`S3 list failed: ${res.status} ${res.statusText}`)
  const xml  = await res.text()
  return parseS3Xml(xml)
}

function parseS3Xml(xml) {
  const parser = new DOMParser()
  const doc    = parser.parseFromString(xml, 'text/xml')
  const items  = []

  for (const node of doc.querySelectorAll('Contents')) {
    const key  = node.querySelector('Key')?.textContent ?? ''
    if (!key.endsWith('.mcap')) continue
    const size = parseInt(node.querySelector('Size')?.textContent ?? '0', 10)
    const lm   = node.querySelector('LastModified')?.textContent ?? ''
    items.push({
      key,
      name:         key.split('/').pop(),
      size,
      sizeLabel:    formatBytes(size),
      lastModified: new Date(lm),
      eTag:         node.querySelector('ETag')?.textContent ?? '',
    })
  }

  return items.sort((a, b) => b.lastModified - a.lastModified)
}

// ── Download MCAP file ────────────────────────────────────────────────────────

/**
 * Downloads an MCAP file from S3 and returns its ArrayBuffer.
 * Calls onProgress(pct: 0-100) periodically.
 * @param {object}   cfg
 * @param {string}   key          S3 object key
 * @param {function} onProgress   optional progress callback
 */
export async function downloadMcapFile(cfg, key, onProgress = () => {}) {
  const isPublic = !cfg.accessKeyId

  if (isPublic) {
    return downloadPublic(cfg, key, onProgress)
  }

  const client = makeClient(cfg)

  // Get content-length first
  let totalBytes = 0
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: key }))
    totalBytes = head.ContentLength ?? 0
  } catch { /* ignore */ }

  const res = await client.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: key }))

  const stream = res.Body
  if (!stream) throw new Error('Empty response body from S3')

  // ReadableStream → ArrayBuffer with progress
  return streamToBuffer(stream, totalBytes, onProgress)
}

async function downloadPublic(cfg, key, onProgress) {
  const base = bucketBaseUrl(cfg)
  const url  = `${base}/${key}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`S3 GET failed: ${res.status} ${res.statusText}`)

  const total = parseInt(res.headers.get('content-length') ?? '0', 10)
  return streamToBuffer(res.body, total, onProgress)
}

async function streamToBuffer(stream, totalBytes, onProgress) {
  const reader = stream.getReader()
  const chunks = []
  let received = 0

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.byteLength
    if (totalBytes > 0) onProgress(Math.round((received / totalBytes) * 100))
  }

  // Concatenate
  const out = new Uint8Array(received)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.byteLength
  }
  return out.buffer
}

// ── Validate config ───────────────────────────────────────────────────────────

export function validateConfig(cfg) {
  const errors = []
  if (!cfg.bucket?.trim())   errors.push('Bucket name is required')
  if (!cfg.region?.trim())   errors.push('Region is required')
  if (cfg.accessKeyId && !cfg.secretAccessKey) errors.push('Secret Access Key is required when Access Key ID is set')
  return errors
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B','KB','MB','GB','TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(i > 1 ? 1 : 0)} ${sizes[i]}`
}

export { formatBytes }

// ── Sample log loader (loads bundled /sample-log.mcap from public/) ───────────

export async function loadSampleMcap(onProgress = () => {}) {
  const res = await fetch('/sample-log.mcap')
  if (!res.ok) throw new Error('sample-log.mcap not found in /public. Run: pnpm generate-sample')
  const total = parseInt(res.headers.get('content-length') ?? '0', 10)
  return streamToBuffer(res.body, total, onProgress)
}
