import Header from "@/components/header"
import HeroSection from "@/components/hero-section"
import MissionSection from "@/components/mission-section"
import PillarsSection from "@/components/pillars-section"
import MembersSection from "@/components/members-section"
import CarouselSection from "@/components/carousel-section"
import NewsSection from "@/components/news-section"
import PartnersSection from "@/components/partners-section"
import ContactSection from "@/components/contact-section"
import MembershipIntentionSection from "@/components/membership-intention-section"
import Footer from "@/components/footer"
import { SiteContentProvider } from "@/components/site-content-provider"

export default function Home() {
  return (
    <SiteContentProvider>
      <main className="min-h-screen">
        <Header />
        <HeroSection />
        <MissionSection />
        <PillarsSection />
        <MembersSection />
        <CarouselSection />
        <NewsSection />
        <PartnersSection />
        <MembershipIntentionSection />
        <ContactSection />
        <Footer />
      </main>
    </SiteContentProvider>
  )
}
