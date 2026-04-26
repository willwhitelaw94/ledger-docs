'use client'

import * as React from 'react'

import type { VariantProps } from 'class-variance-authority'

import { Button, type buttonVariants } from '@/components/ui/button'

import { cn } from '@/lib/utils'

interface OrionButtonProps {
  size?: VariantProps<typeof buttonVariants>['size']
  children?: React.ReactNode
  className?: string
  render?: React.ReactElement
  [key: string]: unknown
}

function PrimaryOrionButton({ children, size, className, render, ...props }: OrionButtonProps) {
  return (
    <Button
      size={size}
      nativeButton={!render}
      className={cn(
        'hover:bg-primary/90 border-0',
        size === 'lg' && 'text-base has-[>svg]:px-6',
        className
      )}
      render={render}
      {...props}
    >
      {children}
    </Button>
  )
}

function SecondaryOrionButton({ children, size, className, render, ...props }: OrionButtonProps) {
  return (
    <Button
      variant='secondary'
      size={size}
      nativeButton={!render}
      className={cn(
        'hover:bg-secondary/80 bg-secondary text-secondary-foreground border-0',
        size === 'lg' && 'text-base has-[>svg]:px-6',
        className
      )}
      render={render}
      {...props}
    >
      {children}
    </Button>
  )
}

export { PrimaryOrionButton, SecondaryOrionButton, type OrionButtonProps }
