'use client'

import { useEffect, useState } from 'react'

import { SecondaryOrionButton } from '@/components/ui/orion-button'

import {
  HeroNavigation,
  HeroNavigationSmallScreen,
  type Navigation
} from '@/components/shadcn-studio/blocks/hero-section-40/hero-navigation'

import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/theme-toggle'
import { LayoutDashboardIcon } from 'lucide-react'

import { TcLogo } from '@/components/tc-logo'

type HeaderProps = {
  navigationData: Navigation[]
  className?: string
}

const Header = ({ navigationData, className }: HeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 h-14 w-full border-b px-4 transition-all duration-300 sm:px-6',
        {
          'bg-card/75 shadow-md backdrop-blur': isScrolled
        },
        className
      )}
    >
      <div className='mx-auto flex h-full max-w-7xl items-center justify-between gap-4 border-x px-4 sm:px-6'>
        {/* Logo */}
        <a href='/'>
          <div className='flex items-center gap-3'>
            <TcLogo />
            <span className='text-xl font-semibold'>TC-Docs</span>
          </div>
        </a>

        {/* Navigation */}
        <HeroNavigation navigationData={navigationData} />

        {/* Actions */}
        <div className='flex items-center gap-3'>
          <ThemeToggle />
          <SecondaryOrionButton size='lg' render={<a href='/dashboard' />}><LayoutDashboardIcon className='size-4' /> Initiatives</SecondaryOrionButton>

          <HeroNavigationSmallScreen navigationData={navigationData} />
        </div>
      </div>
    </header>
  )
}

export default Header
