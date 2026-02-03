import { Text } from '@tarojs/components'
import { useMemo } from 'react'
import './index.scss'

export interface CitationRange {
  id: string
  start: number
  end: number
  targetId?: string
}

interface CitationHighlightProps {
  text: string
  citations: CitationRange[]
  onCitationClick?: (citation: CitationRange) => void
  className?: string
}

interface TextSegment {
  text: string
  citation?: CitationRange
}

const buildSegments = (text: string, citations: CitationRange[]): TextSegment[] => {
  if (!text) return []
  if (!citations || citations.length === 0) {
    return [{ text }]
  }

  const sorted = citations
    .filter((citation) => (
      citation.start >= 0
      && citation.end > citation.start
      && citation.end <= text.length
    ))
    .sort((a, b) => a.start - b.start)

  const segments: TextSegment[] = []
  let cursor = 0

  for (const citation of sorted) {
    if (citation.start < cursor) {
      continue
    }

    if (citation.start > cursor) {
      segments.push({ text: text.slice(cursor, citation.start) })
    }

    segments.push({ text: text.slice(citation.start, citation.end), citation })
    cursor = citation.end
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) })
  }

  return segments
}

const CitationHighlight: React.FC<CitationHighlightProps> = ({
  text,
  citations,
  onCitationClick,
  className,
}) => {
  const segments = useMemo(() => buildSegments(text, citations), [text, citations])

  if (!text) {
    return null
  }

  return (
    <Text className={className}>
      {segments.map((segment, index) => {
        if (!segment.citation) {
          return (
            <Text key={`plain-${index}`}>{segment.text}</Text>
          )
        }

        return (
          <Text
            key={`${segment.citation.id}-${index}`}
            className={`citation-highlight ${onCitationClick ? 'is-clickable' : ''}`}
            onClick={() => onCitationClick?.(segment.citation!)}
          >
            {segment.text}
          </Text>
        )
      })}
    </Text>
  )
}

export default CitationHighlight
