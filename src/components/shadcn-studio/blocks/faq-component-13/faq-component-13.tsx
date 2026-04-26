import { type LucideIcon, PlusIcon } from 'lucide-react'

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Accordion, AccordionContent, AccordionItem } from '@/components/ui/accordion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MotionPreset } from '@/components/ui/motion-preset'

type FAQItem = {
  question: string
  answer: string
}

type TabData = {
  name: string
  value: string
  icon: LucideIcon
  faqs: FAQItem[]
}

type TabsData = TabData[]

const FAQ = ({ tabs }: { tabs: TabsData }) => {
  return (
    <section className='py-8 sm:py-16 lg:py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-12 space-y-4 text-center sm:mb-16 lg:mb-24'>
          <MotionPreset
            component='h2'
            className='text-2xl font-semibold md:text-3xl lg:text-4xl'
            fade
            slide={{ direction: 'down', offset: 50 }}
            transition={{ duration: 0.7 }}
          >
            <span className='relative z-10'>
              Common Questions
              <span className='bg-primary absolute bottom-1 left-0 -z-10 h-px w-full'></span>
            </span>
            <span> Answered</span>
          </MotionPreset>
          <MotionPreset
            component='p'
            className='text-muted-foreground text-xl'
            fade
            slide={{ direction: 'down', offset: 50 }}
            delay={0.3}
            transition={{ duration: 0.7 }}
          >
            Leverage artificial intelligence algorithms to provide users with valuable insights
          </MotionPreset>
        </div>

        <Tabs defaultValue='general' className='space-y-11'>
          {/* Tab Navigation */}
          <MotionPreset
            fade
            className='text-center'
            slide={{ direction: 'down', offset: 50 }}
            delay={0.5}
            transition={{ duration: 0.7 }}
          >
            <ScrollArea>
              <TabsList className='mx-auto h-auto w-full max-w-4xl gap-6 bg-transparent group-data-[orientation=horizontal]/tabs:h-fit'>
                {tabs.map(tab => {
                  const IconComponent = tab.icon

                  return (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className='data-[state=active]:bg-primary dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground data-[state=active]:text-primary-foreground bg-muted hover:text-foreground hover:bg-primary/20 flex min-w-29 cursor-pointer flex-col gap-4 rounded-md p-6 text-lg font-medium transition-colors duration-300 data-[state=active]:shadow-md'
                    >
                      <IconComponent className='size-8' />
                      <span>{tab.name}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
              <ScrollBar orientation='horizontal' />
            </ScrollArea>
          </MotionPreset>

          {/* Tab Content */}
          {tabs.map(tab => (
            <TabsContent key={tab.value} value={tab.value}>
              <div className='mx-auto max-w-4xl'>
                <Accordion
                  multiple
                  defaultValue={tab.faqs.map((_, index) => `item-${index}`)}
                  className='grid grid-cols-1 gap-5 lg:grid-cols-2'
                >
                  {tab.faqs.map((item, index) => (
                    <MotionPreset
                      key={index}
                      fade
                      slide={{ direction: 'down', offset: 30 }}
                      delay={0.2 + index * 0.15}
                      transition={{ duration: 0.6 }}
                    >
                      <AccordionItem
                        value={`item-${index}`}
                        className='border-border bg-card rounded-md border! p-6 transition-shadow duration-200 hover:shadow-sm'
                      >
                        <AccordionPrimitive.Header className='flex'>
                          <AccordionPrimitive.Trigger
                            data-slot='accordion-trigger'
                            className='focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-center gap-3 text-sm font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&>svg>path:last-child]:origin-center [&>svg>path:last-child]:transition-all [&>svg>path:last-child]:duration-200 [&[aria-expanded=true]>svg]:rotate-180 [&[aria-expanded=true]>svg>path:last-child]:rotate-90 [&[aria-expanded=true]>svg>path:last-child]:opacity-0'
                          >
                            <PlusIcon className='text-primary pointer-events-none size-5 shrink-0 transition-transform duration-200' />
                            {item.question}
                          </AccordionPrimitive.Trigger>
                        </AccordionPrimitive.Header>
                        <AccordionContent className='text-muted-foreground pt-2 pb-0 pl-7 text-sm leading-relaxed'>
                          {item.answer}
                        </AccordionContent>
                      </AccordionItem>
                    </MotionPreset>
                  ))}
                </Accordion>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}

export default FAQ
