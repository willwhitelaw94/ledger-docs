'use client'

import { useEffect, useState } from 'react'

import {
  ArrowUpRightIcon,
  BrainCircuitIcon,
  CheckCircle2Icon,
  CodeIcon,
  FileTextIcon,
  LightbulbIcon,
  ListChecksIcon,
  LoaderIcon,
  MessageSquareTextIcon,
  PaletteIcon,
  RocketIcon,
  SearchIcon,
  ShieldCheckIcon,
  TestTube2Icon
} from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BorderBeam } from '@/components/ui/border-beam'
import { PrimaryOrionButton, SecondaryOrionButton } from '@/components/ui/orion-button'

import ArrowBottom from '@/components/shadcn-studio/blocks/hero-section-40/arrow-bottom'
import ArrowRight from '@/components/shadcn-studio/blocks/hero-section-40/arrow-right'
import WorkflowItem from '@/components/shadcn-studio/blocks/hero-section-40/workflow-item'

/* ------------------------------------------------------------------ */
/*  Tab: Ideation                                                      */
/* ------------------------------------------------------------------ */
const IdeationFlow = () => (
  <div className='flex max-md:flex-col max-md:space-y-8 md:items-center md:space-x-16'>
    <WorkflowItem
      type='input'
      icon={<LightbulbIcon />}
      title='Raw Idea'
      description='Capture the problem, audience, and rough shape of a solution.'
      time='0.0 sec'
      className='relative'
    >
      <ArrowRight delay={0.1} />
      <ArrowBottom delay={0.1} />
    </WorkflowItem>

    <WorkflowItem
      type='action'
      icon={<BrainCircuitIcon />}
      title='Idea Brief Generation'
      time='2.4 sec'
      delay={1.2}
      className='relative'
    >
      <div className='bg-muted space-y-2.5 rounded-lg px-2.5 py-3'>
        <Badge variant='outline' className='rounded-sm px-1.5'>Generating brief...</Badge>
        <p className='text-muted-foreground text-sm'>
          Structure your idea into a clear one-pager with problem statement, goals, and success metrics.
        </p>
      </div>
      <ArrowRight delay={1.3} />
      <ArrowBottom delay={1.3} />
    </WorkflowItem>

    <WorkflowItem
      type='output'
      icon={<MessageSquareTextIcon />}
      title='Idea Brief'
      description='A crisp one-pager ready for stakeholder approval.'
      time='0.0 sec'
      delay={2.4}
    >
      <div className='bg-muted space-y-2.5 rounded-lg px-2.5 py-3'>
        <Badge variant='outline' className='rounded-sm px-1.5'>Ready</Badge>
        <p className='text-muted-foreground text-sm'>
          Problem statement, target audience, success metrics, and high-level approach.
        </p>
      </div>
    </WorkflowItem>
  </div>
)

/* ------------------------------------------------------------------ */
/*  Tab: Spec                                                          */
/* ------------------------------------------------------------------ */
const SpecFlow = () => (
  <div className='flex max-md:flex-col max-md:space-y-8 md:items-center md:space-x-16'>
    <WorkflowItem
      type='input'
      icon={<FileTextIcon />}
      title='Approved Idea Brief'
      description='The signed-off brief feeds directly into story generation.'
      time='0.0 sec'
      className='relative'
    >
      <ArrowRight delay={0.1} />
      <ArrowBottom delay={0.1} />
    </WorkflowItem>

    <WorkflowItem
      type='action'
      icon={<ListChecksIcon />}
      title='Story Breakdown'
      time='8.2 sec'
      delay={1.2}
      className='relative'
    >
      <div className='bg-muted space-y-2.5 rounded-lg px-2.5 py-3'>
        <div className='text-muted-foreground flex items-center justify-between gap-2'>
          <Badge variant='outline' className='rounded-sm px-1.5'>Speccing stories...</Badge>
          <LoaderIcon className='size-4' />
        </div>
        <p className='text-muted-foreground text-sm'>
          Breaking into user stories with acceptance criteria, edge cases, and dependencies.
        </p>
      </div>
      <ArrowRight delay={1.3} />
      <ArrowBottom delay={1.3} />
    </WorkflowItem>

    <WorkflowItem
      type='output'
      icon={<MessageSquareTextIcon />}
      title='Spec Document'
      description='Every story is testable. No ambiguity.'
      time='0.0 sec'
      delay={2.4}
    >
      <div className='bg-muted space-y-2.5 rounded-lg px-2.5 py-3'>
        <Badge variant='outline' className='rounded-sm px-1.5'>Complete</Badge>
        <p className='text-muted-foreground text-sm'>
          User stories, acceptance criteria, edge cases, and dependency map — ready for design.
        </p>
      </div>
    </WorkflowItem>
  </div>
)

/* ------------------------------------------------------------------ */
/*  Tab: Design                                                        */
/* ------------------------------------------------------------------ */
const DesignFlow = () => (
  <div className='flex max-md:flex-col max-md:space-y-8 md:items-center md:space-x-16'>
    <WorkflowItem
      type='input'
      icon={<ListChecksIcon />}
      title='Spec & Stories'
      description='Each story is translated into a visual design.'
      time='0.0 sec'
      className='relative'
    >
      <ArrowRight delay={0.1} />
      <ArrowBottom delay={0.1} />
    </WorkflowItem>

    <WorkflowItem
      type='action'
      icon={<PaletteIcon />}
      title='Design & Mockups'
      time='12 sec'
      delay={1.2}
      className='relative'
    >
      <div className='bg-muted space-y-2.5 rounded-lg px-2.5 py-3'>
        <div className='text-muted-foreground flex items-center justify-between gap-2'>
          <Badge variant='outline' className='rounded-sm px-1.5'>Designing...</Badge>
          <LoaderIcon className='size-4' />
        </div>
        <p className='text-muted-foreground text-sm'>
          Wireframes, high-fidelity mockups, and interactive prototypes linked to each story.
        </p>
      </div>
      <ArrowRight delay={1.3} />
      <ArrowBottom delay={1.3} />
    </WorkflowItem>

    <WorkflowItem
      type='output'
      icon={<MessageSquareTextIcon />}
      title='Design Deliverables'
      description='Pixel-ready designs linked to every story.'
      time='0.0 sec'
      delay={2.4}
    >
      <div className='bg-muted space-y-2.5 rounded-lg px-2.5 py-3'>
        <Badge variant='outline' className='rounded-sm px-1.5'>Approved</Badge>
        <p className='text-muted-foreground text-sm'>
          Mockups, prototype, and design tokens — validated with users before code.
        </p>
      </div>
    </WorkflowItem>
  </div>
)

/* ------------------------------------------------------------------ */
/*  Tab: Dev                                                           */
/* ------------------------------------------------------------------ */
const DevFlow = () => (
  <div className='flex max-md:flex-col max-md:space-y-8 md:items-center md:space-x-16'>
    <WorkflowItem
      type='input'
      icon={<PaletteIcon />}
      title='Spec + Design'
      description='Implementation follows the spec and design precisely.'
      time='0.0 sec'
      className='relative'
    >
      <ArrowRight delay={0.1} />
      <ArrowBottom delay={0.1} />
    </WorkflowItem>

    <WorkflowItem
      type='action'
      icon={<CodeIcon />}
      title='Implementation'
      time='4.6 sec'
      delay={1.2}
      className='relative'
    >
      <div className='bg-muted space-y-2.5 rounded-lg px-2.5 py-3'>
        <div className='text-muted-foreground flex items-center justify-between gap-2'>
          <Badge variant='outline' className='rounded-sm px-1.5'>Building...</Badge>
          <LoaderIcon className='size-4' />
        </div>
        <p className='text-muted-foreground text-sm'>
          Structured implementation with focused prompts. One PR per story, Loom walkthrough recorded.
        </p>
      </div>
      <ArrowRight delay={1.3} />
      <ArrowBottom delay={1.3} />
    </WorkflowItem>

    <WorkflowItem
      type='output'
      icon={<MessageSquareTextIcon />}
      title='Working Code'
      description='Production-ready code tied to spec, reviewed and recorded.'
      time='0.0 sec'
      delay={2.4}
    >
      <div className='bg-muted space-y-2.5 rounded-lg px-2.5 py-3'>
        <Badge variant='outline' className='rounded-sm px-1.5'>Merged</Badge>
        <p className='text-muted-foreground text-sm'>
          Technical plan, PRs, and Loom walkthroughs — full traceability.
        </p>
      </div>
    </WorkflowItem>
  </div>
)

/* ------------------------------------------------------------------ */
/*  Tab: QA                                                            */
/* ------------------------------------------------------------------ */
const QAFlow = () => (
  <div className='flex max-md:flex-col max-md:space-y-8 md:items-center md:space-x-16'>
    <WorkflowItem
      type='input'
      icon={<CodeIcon />}
      title='Merged Code'
      description='Feature is code-complete and ready for verification.'
      time='0.0 sec'
      className='relative'
    >
      <ArrowRight delay={0.1} />
      <ArrowBottom delay={0.1} />
    </WorkflowItem>

    <WorkflowItem
      type='action'
      icon={<TestTube2Icon />}
      title='Testing & Verification'
      time='24 sec'
      delay={1.2}
      className='relative'
    >
      <div className='bg-muted space-y-2.5 rounded-lg px-2.5 py-3'>
        <div className='text-muted-foreground flex items-center justify-between gap-2'>
          <Badge variant='outline' className='rounded-sm px-1.5'>Running tests...</Badge>
          <LoaderIcon className='size-4' />
        </div>
        <p className='text-muted-foreground text-sm'>
          Manual QA, automated browser tests, and regression checks. Every gate must pass.
        </p>
      </div>
      <ArrowRight delay={1.3} />
      <ArrowBottom delay={1.3} />
    </WorkflowItem>

    <WorkflowItem
      type='output'
      icon={<ShieldCheckIcon />}
      title='QA Sign-off'
      description='A green build and a confident team.'
      time='0.0 sec'
      delay={2.4}
    >
      <div className='bg-muted space-y-2.5 rounded-lg px-2.5 py-3'>
        <div className='flex items-center gap-2'>
          <CheckCircle2Icon className='text-green-500 size-4' />
          <span className='text-muted-foreground text-sm'>All gates passed</span>
        </div>
        <div className='flex items-center gap-2'>
          <CheckCircle2Icon className='text-green-500 size-4' />
          <span className='text-muted-foreground text-sm'>Browser tests green</span>
        </div>
      </div>
    </WorkflowItem>
  </div>
)

/* ------------------------------------------------------------------ */
/*  Tab: Release                                                       */
/* ------------------------------------------------------------------ */
const ReleaseFlow = () => (
  <div className='flex max-md:flex-col max-md:space-y-8 md:items-center md:space-x-16'>
    <WorkflowItem
      type='input'
      icon={<ShieldCheckIcon />}
      title='QA Approved'
      description='All tests pass. Feature is verified end-to-end.'
      time='0.0 sec'
      className='relative'
    >
      <ArrowRight delay={0.1} />
      <ArrowBottom delay={0.1} />
    </WorkflowItem>

    <WorkflowItem
      type='action'
      icon={<RocketIcon />}
      title='Deploy & Record'
      time='1.8 sec'
      delay={1.2}
      className='relative'
    >
      <div className='bg-muted space-y-2.5 rounded-lg px-2.5 py-3'>
        <Badge variant='outline' className='rounded-sm px-1.5'>Deploying...</Badge>
        <p className='text-muted-foreground text-sm'>
          Push to production. Record the final walkthrough for stakeholders.
        </p>
      </div>
      <ArrowRight delay={1.3} />
      <ArrowBottom delay={1.3} />
    </WorkflowItem>

    <WorkflowItem
      type='output'
      icon={<SearchIcon />}
      title='Live Feature'
      description='Story complete — from idea to production.'
      time='0.0 sec'
      delay={2.4}
    >
      <div className='bg-muted space-y-2.5 rounded-lg px-2.5 py-3'>
        <Badge variant='outline' className='rounded-sm px-1.5'>Shipped</Badge>
        <p className='text-muted-foreground text-sm'>
          Final video walkthrough, production deploy, stakeholder handoff, and retro notes.
        </p>
      </div>
    </WorkflowItem>
  </div>
)

/* ------------------------------------------------------------------ */
/*  Phase tabs configuration                                           */
/* ------------------------------------------------------------------ */
const phases = [
  { name: 'Ideation', value: 'ideation', icon: LightbulbIcon, content: <IdeationFlow /> },
  { name: 'Spec', value: 'spec', icon: ListChecksIcon, content: <SpecFlow /> },
  { name: 'Design', value: 'design', icon: PaletteIcon, content: <DesignFlow /> },
  { name: 'Dev', value: 'dev', icon: CodeIcon, content: <DevFlow /> },
  { name: 'QA', value: 'qa', icon: CheckCircle2Icon, content: <QAFlow /> },
  { name: 'Release', value: 'release', icon: RocketIcon, content: <ReleaseFlow /> }
]

/* ------------------------------------------------------------------ */
/*  Hero Section                                                       */
/* ------------------------------------------------------------------ */
const HeroSection = () => {
  const [activeTab, setActiveTab] = useState(phases[0].value)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab(currentTab => {
        const currentIndex = phases.findIndex(phase => phase.value === currentTab)
        const nextIndex = (currentIndex + 1) % phases.length
        return phases[nextIndex].value
      })
    }, 7000)

    return () => clearInterval(interval)
  }, [])

  return (
    <section className='relative flex flex-col overflow-hidden'>
      <div className='border-b px-4 sm:px-6 lg:px-8'>
        <div className='mx-auto flex max-w-7xl flex-col gap-6 border-x px-4 py-8 sm:px-6 sm:py-16 lg:px-8 lg:py-24'>
          <div className='flex flex-col items-center gap-4 text-center'>
            <Badge variant='outline' className='bg-muted relative gap-2.5 px-1.5 py-1'>
              <span className='bg-primary text-primary-foreground flex h-5.5 items-center rounded-full px-2 py-0.5'>
                Process
              </span>
              <span className='text-muted-foreground text-sm font-normal text-wrap'>Story-Driven Development</span>
              <BorderBeam colorFrom='var(--primary)' colorTo='var(--primary)' size={35} />
            </Badge>

            <h1 className='text-2xl font-semibold sm:text-3xl lg:text-5xl lg:leading-[1.29167]'>
              From idea to delivery
              <br />
              in six clear steps
            </h1>

            <p className='text-muted-foreground max-w-3xl text-xl'>
              Every feature follows the same proven path — ideation, spec, design, dev, QA, and release.
              No ambiguity. Full traceability. Recorded at every step.
            </p>

            <div className='flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-8'>
              <PrimaryOrionButton size='lg' className='rounded-lg max-[425px]:has-[>svg]:px-4' render={<a href='/dashboard' />}>
                <ArrowUpRightIcon />View Initiatives
              </PrimaryOrionButton>
              <SecondaryOrionButton size='lg' className='rounded-lg max-[425px]:has-[>svg]:px-4' render={<a href='/docs' />}>
                Documentation
              </SecondaryOrionButton>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} data-horizontal className='w-full gap-0'>
        <div className='border-b px-4 sm:px-6 lg:px-8'>
          <div className='mx-auto max-w-7xl border-x'>
            <ScrollArea className='-m-px *:overflow-hidden!'>
              <TabsList className='h-fit w-full -space-x-px rounded-none bg-transparent p-0 group-data-[orientation=horizontal]/tabs:h-fit'>
                {phases.map(({ icon: Icon, name, value }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className='border-border text-foreground focus-visible:outline-primary/20 data-[state=active]:border-primary/60! data-[state=active]:bg-muted! h-15 flex-1 cursor-pointer rounded-none px-4 py-2.5 text-base group-data-[orientation=horizontal]/tabs:after:h-0 focus-visible:ring-0 focus-visible:outline-[3px] focus-visible:-outline-offset-4 data-[state=active]:z-1'
                  >
                    <Icon />
                    {name}
                  </TabsTrigger>
                ))}
              </TabsList>
              <ScrollBar orientation='horizontal' className='z-2' />
            </ScrollArea>
          </div>
        </div>

        <div className='px-4 sm:px-6 lg:px-8'>
          <div className='relative mx-auto h-151 max-w-7xl border-x'>
            {/* Background Dots */}
            <div className='pointer-events-none absolute inset-0 -z-2 bg-[radial-gradient(color-mix(in_oklab,var(--primary)10%,transparent)_2px,transparent_2px)] bg-size-[20px_20px] bg-fixed' />

            {/* Background Gradient Overlay */}
            <div className='bg-background pointer-events-none absolute inset-0 -z-1 flex items-center justify-center mask-[radial-gradient(ellipse_at_center,transparent_20%,black)]' />

            <ScrollArea className='h-full *:data-[slot=scroll-area-viewport]:h-full [&>[data-slot=scroll-area-viewport]>div]:h-full'>
              {phases.map(phase => (
                <TabsContent
                  key={phase.value}
                  value={phase.value}
                  className='flex h-full items-center justify-center p-4 sm:p-6 lg:p-8'
                >
                  {phase.content}
                </TabsContent>
              ))}

              <ScrollBar orientation='horizontal' />
            </ScrollArea>
          </div>
        </div>
      </Tabs>
    </section>
  )
}

export default HeroSection
