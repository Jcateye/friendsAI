import { Component, type ComponentType, type ReactNode } from 'react'
import { View, Text } from '@tarojs/components'

export type A2UIRegistry = Record<string, ComponentType<any>>

export type A2UIComponentType<R extends A2UIRegistry = A2UIRegistry> = Extract<keyof R, string>

type PropsOf<C> = C extends ComponentType<infer P> ? P : never

export type A2UIPayload<TType extends string = string, TProps = Record<string, unknown>> = {
  type: TType
  props: TProps
  key?: string | number
}

export type A2UIPayloadForRegistry<R extends A2UIRegistry> = {
  [K in A2UIComponentType<R>]: {
    type: K
    props: PropsOf<R[K]>
    key?: string | number
  }
}[A2UIComponentType<R>]

interface A2UIErrorBoundaryProps {
  fallback: ReactNode
  onError?: (error: Error) => void
  children: ReactNode
}

interface A2UIErrorBoundaryState {
  hasError: boolean
}

class A2UIErrorBoundary extends Component<A2UIErrorBoundaryProps, A2UIErrorBoundaryState> {
  state: A2UIErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError(): A2UIErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error): void {
    this.props.onError?.(error)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

export interface A2UIRendererProps<R extends A2UIRegistry> {
  payload: A2UIPayloadForRegistry<R>
  registry: R
  fallback?: ReactNode
  onError?: (error: Error, payload: A2UIPayloadForRegistry<R>) => void
  onUnknownType?: (payload: A2UIPayloadForRegistry<R>) => void
}

const DefaultFallback = ({ title, detail }: { title: string; detail?: string }) => (
  <View style={{ padding: '12px 16px', borderRadius: '12px', background: '#F7F7F8' }}>
    <Text style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#2F2F2F' }}>{title}</Text>
    {detail ? (
      <Text style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: '#7A7A7A' }}>{detail}</Text>
    ) : null}
  </View>
)

function A2UIRenderer<R extends A2UIRegistry>({
  payload,
  registry,
  fallback,
  onError,
  onUnknownType,
}: A2UIRendererProps<R>): ReactNode {
  const type = payload.type
  const ComponentForPayload = registry[type] as ComponentType<typeof payload.props> | undefined

  if (!ComponentForPayload) {
    onUnknownType?.(payload)
    if (fallback) {
      return fallback
    }
    return <DefaultFallback title="A2UI component not registered" detail={`type: ${type}`} />
  }

  const resolvedFallback =
    fallback ?? <DefaultFallback title="A2UI render failed" detail={`type: ${type}`} />

  return (
    <A2UIErrorBoundary
      key={payload.key ?? type}
      fallback={resolvedFallback}
      onError={(error) => onError?.(error, payload)}
    >
      <ComponentForPayload {...payload.props} />
    </A2UIErrorBoundary>
  )
}

export default A2UIRenderer
