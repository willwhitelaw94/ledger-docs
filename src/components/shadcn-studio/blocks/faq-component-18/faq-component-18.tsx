import { ChevronUpIcon } from 'lucide-react'

import { Accordion as AccordionPrimitive } from '@base-ui/react/accordion'

import { Accordion, AccordionContent, AccordionItem } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { NeuralButton } from '@/components/ui/neural-button'
import { MotionPreset } from '@/components/ui/motion-preset'
import { Card, CardContent } from '@/components/ui/card'

type FAQItem = {
  question: string
  answer: string
}

type FAQComponentProps = {
  faqItems: FAQItem[]
}

const FAQ = ({ faqItems }: FAQComponentProps) => {
  return (
    <section className='relative z-1 overflow-hidden bg-black py-8 text-white sm:py-16 lg:py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-12 space-y-4 text-center sm:mb-16 lg:mb-24'>
          <MotionPreset fade slide={{ direction: 'up', offset: 50 }} transition={{ duration: 0.7 }}>
            <Badge className='text-sm text-white' variant='outline'>
              FAQ
            </Badge>
          </MotionPreset>
          <MotionPreset
            component='h2'
            className='text-2xl font-semibold md:text-3xl lg:text-4xl'
            fade
            slide={{ direction: 'up', offset: 50 }}
            delay={0.2}
            transition={{ duration: 0.7 }}
          >
            Choose the Perfect Plan for Your AI Journey
          </MotionPreset>
          <MotionPreset fade slide={{ direction: 'up', offset: 50 }} delay={0.4} transition={{ duration: 0.7 }}>
            <p className='mx-auto max-w-xl text-xl opacity-80'>
              Find the right plan to unlock AI-powered insights and streamline your workflow.
            </p>
          </MotionPreset>
        </div>
        <div className='relative grid grid-cols-1 gap-8 lg:grid-cols-2'>
          {/* Left Section - Support Card */}
          <MotionPreset fade slide={{ direction: 'left', offset: 50 }} transition={{ duration: 0.7 }}>
            <Card className='border-primary/20 sticky top-8 bg-white/15 text-white shadow-[inset_0_0_8px_rgba(255,255,255,0.30)] backdrop-blur-3xl'>
              <CardContent>
                {/* Decorative Elements */}

                {/* Main Content */}
                <div className='max-w-[18rem] space-y-6'>
                  <div className='space-y-2.5'>
                    <h6 className='text-xl font-medium md:text-2xl'>Can’t find answers?</h6>
                    <p className='opacity-80'>We&apos;re here to help! Get in touch with our support.</p>
                  </div>
                  <NeuralButton size='lg'>Get Started - Free</NeuralButton>
                </div>

                {/* 3D Crystal-like Element */}
                <MotionPreset
                  fade
                  slide={{ direction: 'left', offset: 100 }}
                  delay={0.5}
                  transition={{ duration: 1 }}
                  className='absolute -right-8 bottom-0 h-[80%] rotate-15 transform md:h-[150%] lg:-right-1/8 lg:h-[130%] xl:h-[150%]'
                >
                  <img
                    src='https://cdn.shadcnstudio.com/ss-assets/template/landing-page/neural/image-01.png'
                    alt='Decorative Crystal'
                    className='h-full w-full object-contain'
                  />
                </MotionPreset>
              </CardContent>
            </Card>
          </MotionPreset>

          {/* Right Section - FAQ Accordion */}
          <MotionPreset fade slide={{ direction: 'right', offset: 50 }} delay={0.3} transition={{ duration: 0.7 }}>
            <Accordion className='space-y-5' defaultValue={['item-0']}>
              {faqItems.map((item, index) => (
                <MotionPreset
                  key={index}
                  fade
                  slide={{ direction: 'up', offset: 30 }}
                  delay={0.6 + index * 0.15}
                  transition={{ duration: 0.6 }}
                >
                  <AccordionItem
                    value={`item-${index}`}
                    className='border-primary/20 rounded-md bg-white/15 px-5 text-white shadow-[inset_0_0_5px_rgba(255,255,255,0.30)] backdrop-blur-3xl'
                  >
                    <AccordionPrimitive.Header className='flex'>
                      <AccordionPrimitive.Trigger
                        data-slot='accordion-trigger'
                        className='focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-center justify-between gap-4 rounded-md py-4 text-base font-medium transition-all outline-none focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&[aria-expanded=true]>svg]:rotate-180 [&[aria-expanded=true]>svg]:bg-black [&[aria-expanded=true]>svg]:text-white'
                      >
                        {item.question}
                        <ChevronUpIcon className='pointer-events-none size-7 shrink-0 rounded-md bg-white p-1 text-black transition-all duration-200' />
                      </AccordionPrimitive.Trigger>
                    </AccordionPrimitive.Header>
                    <AccordionContent className='text-base opacity-80'>{item.answer}</AccordionContent>
                  </AccordionItem>
                </MotionPreset>
              ))}
            </Accordion>
          </MotionPreset>
        </div>
      </div>
      <MotionPreset
        fade
        slide={{ direction: 'left', offset: 100 }}
        delay={0.7}
        transition={{ duration: 1.2 }}
        className='absolute bottom-1/2 -left-1/8 -z-1 w-full opacity-80 md:bottom-[20%] lg:bottom-0 lg:w-120 xl:w-1/2'
      >
        <img src='https://cdn.shadcnstudio.com/ss-assets/template/landing-page/neural/image-02.png' alt='Background' />
      </MotionPreset>
    </section>
  )
}

export default FAQ
