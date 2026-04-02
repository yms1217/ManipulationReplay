/**
 * S3Browser — Configure S3 connection and browse/select MCAP files.
 * Shows two panels:
 *   1. S3 Config form (bucket, region, credentials, prefix)
 *   2. File list with size / date / load button
 */
import { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { theme } from '../styles/theme'
import {
  loadS3Config, saveS3Config, clearS3Config,
  listMcapFiles, validateConfig, formatBytes,
} from '../services/s3Service'

// ── styled ────────────────────────────────────────────────────────────────────

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(10, 28, 40, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
`

const Modal = styled.div`
  background: ${theme.colors.surface};
  border-radius: 14px;
  width: 640px;
  max-width: 95vw;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0,0,0,0.35);
  border: 1px solid ${theme.colors.borderLight};
  overflow: hidden;
`

const ModalHeader = styled.div`
  background: linear-gradient(135deg, ${theme.colors.header}, ${theme.colors.primaryDark});
  color: #fff;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
`

const ModalTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
`

const CloseBtn = styled.button`
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: rgba(255,255,255,0.3); }
`

const Body = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const SectionTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${theme.colors.textMuted};
  padding-bottom: 6px;
  border-bottom: 1px solid ${theme.colors.borderLight};
  display: flex;
  align-items: center;
  gap: 6px;
`

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: ${p => p.cols || '1fr 1fr'};
  gap: 10px;
`

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Label = styled.label`
  font-size: 11px;
  font-weight: 600;
  color: ${theme.colors.textSecondary};
`

const Input = styled.input`
  height: 32px;
  border: 1px solid ${theme.colors.border};
  border-radius: 5px;
  padding: 0 10px;
  font-size: 12px;
  color: ${theme.colors.text};
  background: ${theme.colors.surface};
  outline: none;
  transition: border-color 0.15s;
  &:focus { border-color: ${theme.colors.primary}; }
  &::placeholder { color: ${theme.colors.textMuted}; }
`

const Hint = styled.div`
  font-size: 10px;
  color: ${theme.colors.textMuted};
  line-height: 1.4;
`

const BtnRow = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`

const Btn = styled.button`
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid ${p => p.primary ? theme.colors.primary : theme.colors.border};
  background: ${p => p.primary ? theme.colors.primary : theme.colors.surface};
  color: ${p => p.primary ? '#fff' : theme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s;
  &:hover {
    background: ${p => p.primary ? theme.colors.primaryDark : theme.colors.bgDark};
  }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const ErrorBox = styled.div`
  background: ${theme.colors.logError};
  border: 1px solid ${theme.colors.statusError};
  border-radius: 6px;
  padding: 8px 12px;
  font-size: 12px;
  color: ${theme.colors.statusError};
`

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
`

const FileItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: 1px solid ${theme.colors.borderLight};
  border-radius: 7px;
  background: ${theme.colors.surfaceAlt};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: ${theme.colors.primary};
    background: ${theme.colors.bgDark};
  }
`

const FileIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: linear-gradient(135deg, ${theme.colors.primary}20, ${theme.colors.accent}20);
  border: 1px solid ${theme.colors.primary}40;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
`

const FileMeta = styled.div`
  flex: 1;
  min-width: 0;
`

const FileName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${theme.colors.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const FileInfo = styled.div`
  font-size: 10px;
  color: ${theme.colors.textMuted};
  margin-top: 2px;
  display: flex;
  gap: 8px;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 32px;
  color: ${theme.colors.textMuted};
  font-size: 13px;
`

const StatusBadge = styled.span`
  padding: 2px 7px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  background: ${p => p.ok ? '#E8F8F0' : '#FDECEA'};
  color: ${p => p.ok ? theme.colors.statusOk : theme.colors.statusError};
  border: 1px solid ${p => p.ok ? '#B7DFCC' : '#F5C0BA'};
`

const Toggle = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  user-select: none;
`

// ── component ─────────────────────────────────────────────────────────────────

const REGIONS = [
  'ap-northeast-2','ap-northeast-1','ap-southeast-1','ap-southeast-2',
  'us-east-1','us-east-2','us-west-1','us-west-2',
  'eu-west-1','eu-west-2','eu-central-1',
]

export default function S3Browser({ onLoad, onClose }) {
  const [cfg, setCfg] = useState(() => loadS3Config() ?? {
    bucket: '', region: 'ap-northeast-2', prefix: '',
    accessKeyId: '', secretAccessKey: '', endpoint: '', usePathStyle: false,
  })
  const [showSecret, setShowSecret]   = useState(false)
  const [useCustomEp, setUseCustomEp] = useState(!!loadS3Config()?.endpoint)
  const [files, setFiles]             = useState(null)   // null = not listed yet
  const [listing, setListing]         = useState(false)
  const [error, setError]             = useState('')
  const [connected, setConnected]     = useState(false)

  const update = (key, val) => setCfg(prev => ({ ...prev, [key]: val }))

  const handleConnect = useCallback(async () => {
    setError('')
    const errs = validateConfig(cfg)
    if (errs.length) { setError(errs.join('\n')); return }
    setListing(true)
    try {
      const list = await listMcapFiles(cfg)
      saveS3Config(cfg)
      setFiles(list)
      setConnected(true)
    } catch (e) {
      setError(`Connection failed: ${e.message}`)
      setConnected(false)
    } finally {
      setListing(false)
    }
  }, [cfg])

  const handleDisconnect = () => {
    clearS3Config()
    setFiles(null)
    setConnected(false)
  }

  return (
    <Backdrop onClick={e => e.target === e.currentTarget && onClose()}>
      <Modal>
        <ModalHeader>
          <ModalTitle>☁️ AWS S3 Log Browser</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>

        <Body>
          {/* ── Config Section ── */}
          <Section>
            <SectionTitle>
              🔧 S3 설정
              {connected && <StatusBadge ok>Connected</StatusBadge>}
            </SectionTitle>

            <FormGrid>
              <FormGroup>
                <Label>Bucket Name *</Label>
                <Input
                  placeholder="my-robot-logs"
                  value={cfg.bucket}
                  onChange={e => update('bucket', e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label>Region *</Label>
                <Input
                  list="regions"
                  placeholder="ap-northeast-2"
                  value={cfg.region}
                  onChange={e => update('region', e.target.value)}
                />
                <datalist id="regions">
                  {REGIONS.map(r => <option key={r} value={r} />)}
                </datalist>
              </FormGroup>
            </FormGrid>

            <FormGrid cols="1fr">
              <FormGroup>
                <Label>Log Prefix (Folder)</Label>
                <Input
                  placeholder="logs/MR-001/  (비워두면 버킷 전체 검색)"
                  value={cfg.prefix}
                  onChange={e => update('prefix', e.target.value)}
                />
              </FormGroup>
            </FormGrid>

            <FormGrid>
              <FormGroup>
                <Label>Access Key ID (비공개 버킷)</Label>
                <Input
                  placeholder="AKIA… (공개 버킷은 비워두세요)"
                  value={cfg.accessKeyId}
                  onChange={e => update('accessKeyId', e.target.value)}
                  autoComplete="off"
                />
              </FormGroup>
              <FormGroup>
                <Label>Secret Access Key</Label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <Input
                    type={showSecret ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={cfg.secretAccessKey}
                    onChange={e => update('secretAccessKey', e.target.value)}
                    style={{ flex: 1 }}
                    autoComplete="new-password"
                  />
                  <Btn onClick={() => setShowSecret(v => !v)} style={{ padding: '0 8px', flexShrink: 0 }}>
                    {showSecret ? '🙈' : '👁'}
                  </Btn>
                </div>
              </FormGroup>
            </FormGrid>

            <Toggle>
              <input type="checkbox" checked={useCustomEp} onChange={e => setUseCustomEp(e.target.checked)} />
              Custom Endpoint (MinIO / LocalStack)
            </Toggle>

            {useCustomEp && (
              <FormGrid cols="3fr 1fr">
                <FormGroup>
                  <Label>Endpoint URL</Label>
                  <Input
                    placeholder="http://localhost:9000"
                    value={cfg.endpoint}
                    onChange={e => update('endpoint', e.target.value)}
                  />
                </FormGroup>
                <FormGroup>
                  <Label>Path Style</Label>
                  <Toggle style={{ marginTop: '8px' }}>
                    <input
                      type="checkbox"
                      checked={cfg.usePathStyle}
                      onChange={e => update('usePathStyle', e.target.checked)}
                    />
                    Enable
                  </Toggle>
                </FormGroup>
              </FormGrid>
            )}

            <Hint>
              💡 버킷 CORS 설정 필요: AllowedOrigins: ["*"], AllowedMethods: ["GET","HEAD"]
            </Hint>

            {error && <ErrorBox>⚠️ {error}</ErrorBox>}

            <BtnRow>
              {connected && (
                <Btn onClick={handleDisconnect}>🔌 연결 해제</Btn>
              )}
              <Btn primary onClick={handleConnect} disabled={listing}>
                {listing ? '🔄 연결 중…' : '🔗 연결 및 목록 조회'}
              </Btn>
            </BtnRow>
          </Section>

          {/* ── File List ── */}
          {files !== null && (
            <Section>
              <SectionTitle>
                📂 MCAP 파일 목록
                <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 400, color: theme.colors.textMuted }}>
                  {files.length}개
                </span>
              </SectionTitle>

              {files.length === 0 ? (
                <EmptyState>
                  MCAP 파일을 찾을 수 없습니다.<br />
                  Prefix 설정을 확인하거나 파일을 업로드하세요.
                </EmptyState>
              ) : (
                <FileList>
                  {files.map(f => (
                    <FileItem key={f.key} onClick={() => onLoad({ type: 's3', cfg, key: f.key, name: f.name })}>
                      <FileIcon>📦</FileIcon>
                      <FileMeta>
                        <FileName>{f.name}</FileName>
                        <FileInfo>
                          <span>{f.sizeLabel}</span>
                          <span>{f.lastModified instanceof Date
                            ? f.lastModified.toLocaleString('ko-KR')
                            : String(f.lastModified)}</span>
                        </FileInfo>
                      </FileMeta>
                      <Btn primary style={{ height: '28px', padding: '0 12px', fontSize: '11px' }}>
                        로드 ▶
                      </Btn>
                    </FileItem>
                  ))}
                </FileList>
              )}
            </Section>
          )}
        </Body>
      </Modal>
    </Backdrop>
  )
}
