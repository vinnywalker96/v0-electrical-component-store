"use client"
import { CheckCircle2, Users, Award, Zap } from "lucide-react"
import { useLanguage } from "@/lib/context/language-context"

export default function About() {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-primary text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("about.title")}</h1>
          <p className="text-lg text-white/90">{t("about.subtitle")}</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div>
              <h2 className="text-3xl font-bold mb-6">{t("about.mission_title")}</h2>
              <p className="text-muted-foreground mb-4">
                {t("about.mission_desc1")}
              </p>
              <p className="text-muted-foreground">
                {t("about.mission_desc2")}
              </p>
            </div>
            <div className="bg-muted rounded-lg p-8">
              <h3 className="font-bold text-2xl mb-6">{t("about.why_us_title")}</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <span>{t("about.why_us_item1")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <span>{t("about.why_us_item2")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <span>{t("about.why_us_item3")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <span>{t("about.why_us_item4")}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-primary mb-2">9+</div>
              <p className="text-muted-foreground">{t("about.stats_years")}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-primary mb-2">5000+</div>
              <p className="text-muted-foreground">{t("about.stats_customers")}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-primary mb-2">1000+</div>
              <p className="text-muted-foreground">{t("about.stats_skus")}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-primary mb-2">98%</div>
              <p className="text-muted-foreground">{t("about.stats_satisfaction")}</p>
            </div>
          </div>

          {/* Values */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <Award className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-xl mb-2">{t("about.value_quality_title")}</h3>
              <p className="text-muted-foreground">{t("about.value_quality_desc")}</p>
            </div>
            <div className="text-center">
              <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-xl mb-2">{t("about.value_support_title")}</h3>
              <p className="text-muted-foreground">{t("about.value_support_desc")}</p>
            </div>
            <div className="text-center">
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-xl mb-2">{t("about.value_innovation_title")}</h3>
              <p className="text-muted-foreground">{t("about.value_innovation_desc")}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
