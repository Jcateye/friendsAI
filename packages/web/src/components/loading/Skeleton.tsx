import { HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

const baseClasses = 'bg-bg-surface'

const variantClasses = {
  text: 'rounded h-4',
  circular: 'rounded-full',
  rectangular: 'rounded-md',
}

const animationClasses = {
  pulse: 'animate-pulse',
  wave: 'animate-shimmer',
  none: '',
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`

  const combinedStyle = {
    ...style,
    ...(width !== undefined && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height !== undefined && { height: typeof height === 'number' ? `${height}px` : height }),
  }

  return <div className={combinedClasses} style={combinedStyle} {...props} />
}
