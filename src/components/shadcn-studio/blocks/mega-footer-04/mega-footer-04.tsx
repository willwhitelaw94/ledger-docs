import {
  FileTextIcon,
  GitBranchIcon,
  ShieldCheckIcon,
  MailIcon,
  GlobeIcon,
  LayersIcon,
} from 'lucide-react'

import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

import { TcLogo } from '@/components/tc-logo'

const MegaFooter = () => {
  return (
    <footer className="border-t">
      <div className='mx-auto grid max-w-7xl grid-cols-1 sm:grid-cols-2 md:grid-cols-3'>
        <div className='space-y-6 p-6 sm:border-e'>
          <div className='item-center flex justify-center'>
            <Avatar className='size-13'>
              <AvatarFallback className='bg-muted'>
                <FileTextIcon className='size-7' />
              </AvatarFallback>
            </Avatar>
          </div>
          <div className='flex flex-col items-center gap-4'>
            <h6 className='text-xl font-semibold'>Spec-Driven</h6>
            <p className='text-muted-foreground text-center text-sm'>
              Every feature starts with a spec. Clear requirements, no ambiguity, full traceability from idea to release.
            </p>
          </div>
        </div>
        <div className='space-y-6 p-6 max-sm:border-t md:border-e'>
          <div className='item-center flex justify-center'>
            <Avatar className='size-13'>
              <AvatarFallback className='bg-muted'>
                <GitBranchIcon className='size-7' />
              </AvatarFallback>
            </Avatar>
          </div>
          <div className='flex flex-col items-center gap-4'>
            <h6 className='text-xl font-semibold'>Six Clear Phases</h6>
            <p className='text-muted-foreground text-center text-sm'>
              Ideation, spec, design, dev, QA, and release. Every epic follows the same proven path with gate reviews.
            </p>
          </div>
        </div>
        <div className='space-y-6 p-6 max-md:border-t sm:max-md:col-span-2'>
          <div className='item-center flex justify-center'>
            <Avatar className='size-13'>
              <AvatarFallback className='bg-muted'>
                <ShieldCheckIcon className='size-7' />
              </AvatarFallback>
            </Avatar>
          </div>
          <div className='flex flex-col items-center gap-4'>
            <h6 className='text-xl font-semibold'>Bounty System</h6>
            <p className='text-muted-foreground text-center text-sm'>
              Claim bounties on epics, track progress transparently, and get rewarded for shipping quality work.
            </p>
          </div>
        </div>
      </div>
      <Separator />
      <div className='mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 sm:grid-cols-2 sm:px-6 sm:py-16 lg:grid-cols-4 lg:px-8'>
        <div className='flex flex-col gap-8'>
          <a href='/' className="flex items-center gap-2.5">
            <TcLogo />
            <div className="flex flex-col">
              <span className="font-semibold">TC-Docs</span>
              <span className="text-xs text-muted-foreground">Story-Driven Development</span>
            </div>
          </a>
          <div className='space-y-3 text-sm text-muted-foreground'>
            <div className='flex items-center gap-2'>
              <GlobeIcon className='size-4 shrink-0' />
              <span>trilogycare.com.au</span>
            </div>
            <div className='flex items-center gap-2'>
              <MailIcon className='size-4 shrink-0' />
              <span>dev@trilogycare.com.au</span>
            </div>
          </div>
        </div>
        <div className='flex flex-col gap-5'>
          <div className='text-sm font-semibold'>Platform</div>
          <ul className='text-muted-foreground space-y-3 text-sm'>
            <li><a href='/dashboard' className="hover:text-foreground transition-colors">Initiatives</a></li>
            <li><a href='/docs' className="hover:text-foreground transition-colors">Documentation</a></li>
          </ul>
        </div>
        <div className='flex flex-col gap-5'>
          <div className='text-sm font-semibold'>Resources</div>
          <ul className='text-muted-foreground space-y-3 text-sm'>
            <li><a href='/docs' className="hover:text-foreground transition-colors">Ways of Working</a></li>
            <li><a href='/dashboard' className="hover:text-foreground transition-colors">Bounty Board</a></li>
          </ul>
        </div>
        <div className='flex flex-col gap-5'>
          <div className='text-sm font-semibold'>Integrations</div>
          <ul className='text-muted-foreground space-y-3 text-sm'>
            <li className="flex items-center gap-2">
              <LayersIcon className="size-3.5" />
              <span>Linear</span>
            </li>
            <li className="flex items-center gap-2">
              <GitBranchIcon className="size-3.5" />
              <span>GitHub</span>
            </li>
            <li className="flex items-center gap-2">
              <FileTextIcon className="size-3.5" />
              <span>Claude Code</span>
            </li>
          </ul>
        </div>
      </div>
      <Separator />
      <div className='mx-auto flex max-w-7xl justify-center px-4 py-6 sm:px-6 lg:px-8'>
        <p className='text-center text-sm text-muted-foreground'>
          {`© ${new Date().getFullYear()}`} Trilogy Care. Built with Story-Driven Development.
        </p>
      </div>
    </footer>
  )
}

export default MegaFooter
