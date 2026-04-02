import { useState, useMemo } from 'react'
import styled from 'styled-components'
import { theme } from '../styles/theme'

const Panel = styled.div`
  width: 100%;
  height: 100%;
  background: ${theme.colors.surface};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-shadow: ${theme.shadow.sm};
  border: 1px solid ${theme.colors.border};
  overflow: hidden;
`

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-bottom: 1px solid ${theme.colors.border};
  background: ${theme.colors.bg};
  flex-shrink: 0;
`

const FilterLabel = styled.span`
  font-size: 11px;
  color: ${theme.colors.textMuted};
  white-space: nowrap;
`

const Select = styled.select`
  height: 26px;
  border: 1px solid ${theme.colors.border};
  border-radius: 4px;
  background: ${theme.colors.surface};
  color: ${theme.colors.text};
  font-size: 11px;
  padding: 0 6px;
  cursor: pointer;
  outline: none;
  &:focus { border-color: ${theme.colors.primary}; }
`

const SearchInput = styled.input`
  height: 26px;
  border: 1px solid ${theme.colors.border};
  border-radius: 4px;
  background: ${theme.colors.surface};
  color: ${theme.colors.text};
  font-size: 11px;
  padding: 0 8px;
  flex: 1;
  min-width: 120px;
  outline: none;
  &:focus { border-color: ${theme.colors.primary}; }
  &::placeholder { color: ${theme.colors.textMuted}; }
`

const Count = styled.span`
  margin-left: auto;
  font-size: 11px;
  color: ${theme.colors.textMuted};
  white-space: nowrap;
`

const TableWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-thumb { background: ${theme.colors.border}; border-radius: 3px; }
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  table-layout: fixed;
`

const Thead = styled.thead`
  position: sticky;
  top: 0;
  background: ${theme.colors.bg};
  z-index: 1;
`

const Th = styled.th`
  padding: 5px 8px;
  text-align: left;
  color: ${theme.colors.textMuted};
  font-weight: 600;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  border-bottom: 1px solid ${theme.colors.border};
  white-space: nowrap;
  overflow: hidden;
`

const Tr = styled.tr`
  border-bottom: 1px solid ${theme.colors.borderLight};
  background: ${p =>
    p.level === 'ERROR' ? theme.colors.logError :
    p.level === 'WARN' ? theme.colors.logWarn :
    p.level === 'DEBUG' ? theme.colors.logDebug :
    'transparent'
  };
  cursor: pointer;
  &:hover { filter: brightness(0.97); }
  &.active { outline: 2px solid ${theme.colors.primary}; outline-offset: -1px; }
`

const Td = styled.td`
  padding: 4px 8px;
  vertical-align: middle;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const LevelBadge = styled.span`
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.3px;
  background: ${p =>
    p.level === 'ERROR' ? theme.colors.statusError :
    p.level === 'WARN' ? theme.colors.statusWarn :
    p.level === 'INFO' ? theme.colors.statusInfo :
    theme.colors.textMuted
  };
  color: #fff;
`

const CompBadge = styled.span`
  display: inline-block;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  background: ${p =>
    p.comp === 'Arm' ? '#EBF5FB' :
    p.comp === 'Gripper' ? '#FEF9E7' :
    p.comp === 'Hand' ? '#F0FFF4' :
    '#F4F6F7'
  };
  color: ${p =>
    p.comp === 'Arm' ? theme.colors.statusInfo :
    p.comp === 'Gripper' ? theme.colors.statusWarn :
    p.comp === 'Hand' ? theme.colors.statusOk :
    theme.colors.textSecondary
  };
  border: 1px solid ${p =>
    p.comp === 'Arm' ? '#AED6F1' :
    p.comp === 'Gripper' ? '#F9E4A0' :
    p.comp === 'Hand' ? '#A9DFBF' :
    theme.colors.border
  };
`

const JumpBtn = styled.button`
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid ${theme.colors.primary};
  background: transparent;
  color: ${theme.colors.primary};
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
  &:hover { background: ${theme.colors.primary}; color: #fff; }
`

const LEVELS = ['ALL', 'ERROR', 'WARN', 'INFO', 'DEBUG']
const COMPONENTS = ['ALL', 'Arm', 'Gripper', 'Hand', 'System']
const TIME_RANGES = ['전체', '최근 1분', '최근 5분']

export default function LogEntries({ currentTime, seekTo, logEntries = [] }) {
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [compFilter, setCompFilter] = useState('ALL')
  const [keyword, setKeyword] = useState('')
  const [timeRange, setTimeRange] = useState('전체')

  const filtered = useMemo(() => {
    return logEntries.filter(log => {
      if (levelFilter !== 'ALL' && log.level !== levelFilter) return false
      if (compFilter !== 'ALL' && log.component !== compFilter) return false
      if (keyword && !log.message.toLowerCase().includes(keyword.toLowerCase())) return false
      if (timeRange === '최근 1분' && log.t < currentTime - 60) return false
      if (timeRange === '최근 5분' && log.t < currentTime - 300) return false
      return true
    })
  }, [levelFilter, compFilter, keyword, timeRange, currentTime])

  return (
    <Panel>
      <FilterBar>
        <FilterLabel>Filters:</FilterLabel>
        <Select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
          {LEVELS.map(l => <option key={l}>{l}</option>)}
        </Select>
        <Select value={compFilter} onChange={e => setCompFilter(e.target.value)}>
          {COMPONENTS.map(c => <option key={c}>{c}</option>)}
        </Select>
        <SearchInput
          placeholder="🔍 키워드 검색..."
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
        />
        <Select value={timeRange} onChange={e => setTimeRange(e.target.value)}>
          {TIME_RANGES.map(r => <option key={r}>{r}</option>)}
        </Select>
        <Count>{filtered.length} / {logEntries.length} entries</Count>
      </FilterBar>

      <TableWrap>
        <Table>
          <Thead>
            <tr>
              <Th style={{ width: '68px' }}>시간</Th>
              <Th style={{ width: '54px' }}>레벨</Th>
              <Th style={{ width: '62px' }}>컴포넌트</Th>
              <Th>메시지</Th>
              <Th style={{ width: '60px' }}>액션</Th>
            </tr>
          </Thead>
          <tbody>
            {filtered.map(log => (
              <Tr
                key={log.id}
                level={log.level}
                className={Math.abs(log.t - currentTime) < 2 ? 'active' : ''}
                onClick={() => seekTo(log.t)}
              >
                <Td style={{ fontFamily: 'monospace', color: theme.colors.textMuted }}>{log.time}</Td>
                <Td>
                  <LevelBadge level={log.level}>{log.level}</LevelBadge>
                </Td>
                <Td>
                  <CompBadge comp={log.component}>{log.component}</CompBadge>
                </Td>
                <Td style={{ color: log.level === 'ERROR' ? theme.colors.statusError : log.level === 'WARN' ? theme.colors.statusWarn : theme.colors.text }}>
                  {log.message}
                </Td>
                <Td>
                  <JumpBtn onClick={(e) => { e.stopPropagation(); seekTo(log.t) }}>
                    ⏭ Jump
                  </JumpBtn>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </Panel>
  )
}
