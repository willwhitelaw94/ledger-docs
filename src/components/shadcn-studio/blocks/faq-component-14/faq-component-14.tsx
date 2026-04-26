import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MotionPreset } from '@/components/ui/motion-preset'

type FAQItem = {
  image: string
  title: string
  description: ReactNode
}

type FAQComponentProps = {
  faqItems: FAQItem[]
}

const FAQ = ({ faqItems }: FAQComponentProps) => {
  return (
    <section className='bg-muted py-8 sm:py-16 lg:py-24'>
      <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-12 space-y-4 text-center sm:mb-16 lg:mb-24'>
          <MotionPreset fade slide={{ direction: 'up', offset: 50 }} transition={{ duration: 0.7 }}>
            <Badge className='text-sm font-normal' variant='outline'>
              FAQs
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
            Everything You&apos;re Asking — All in One Place
          </MotionPreset>
          <MotionPreset
            component='p'
            className='text-muted-foreground text-xl'
            fade
            slide={{ direction: 'up', offset: 50 }}
            delay={0.4}
            transition={{ duration: 0.7 }}
          >
            Leverage artificial intelligence algorithms to provide users with valuable insights
          </MotionPreset>
        </div>

        {/* FAQ Grid */}
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {faqItems.map((item, index) => (
            <MotionPreset
              key={index}
              fade
              slide={{ direction: 'left', offset: 30 }}
              delay={0.6 + index * 0.2}
              transition={{ duration: 0.6 }}
            >
              <Card className='group h-full overflow-hidden transition-all duration-300 hover:shadow-lg'>
                <CardContent className='space-y-8'>
                  <div className='border-border overflow-hidden rounded-md border'>
                    <img
                      src={item.image}
                      alt={item.title}
                      className='w-full object-cover transition-transform duration-300 group-hover:scale-105'
                    />
                  </div>
                  <div className='space-y-2'>
                    <h3 className='text-xl font-semibold'>{item.title}</h3>
                    <p className='text-muted-foreground leading-relaxed'>{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            </MotionPreset>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FAQ
