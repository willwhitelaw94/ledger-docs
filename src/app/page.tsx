import { InternalHeader } from '@/components/internal-header'
import HeroSection from '@/components/shadcn-studio/blocks/hero-section-40/hero-section-40'
import FaqComponent from '@/components/shadcn-studio/blocks/faq-component-18/faq-component-18'
import MegaFooter from '@/components/shadcn-studio/blocks/mega-footer-04/mega-footer-04'

export default function Home() {
  return (
    <div className='flex flex-col'>
      <InternalHeader />
      <main className='flex flex-col'>
        <HeroSection />
        <FaqComponent faqItems={[
          { question: 'What is Story-Driven Development?', answer: 'SDD is a structured methodology where every feature follows six clear phases — ideation, spec, design, dev, QA, and release. Each phase has a gate review ensuring quality before moving forward.' },
          { question: 'How does the bounty system work?', answer: 'Epics are assigned bounty values based on complexity. Team members can claim bounties through the dashboard, and the claim is tracked with full transparency — who claimed it and when.' },
          { question: 'What tools integrate with SDD?', answer: 'SDD integrates with Linear for project tracking, GitHub for code management, and Claude Code for development. Status updates sync automatically across tools.' },
          { question: 'How are epics structured?', answer: 'Each epic belongs to an initiative and contains artifacts like idea briefs, specs, designs, plans, and task lists. Progress is tracked through gate reviews at each phase.' },
          { question: 'Can I contribute to an epic?', answer: 'Yes — browse the initiatives dashboard, find an unclaimed epic with a bounty, and claim it. You will then work through the SDD phases with full documentation and gate reviews.' },
        ]} />
      </main>
      <MegaFooter />
    </div>
  )
}
