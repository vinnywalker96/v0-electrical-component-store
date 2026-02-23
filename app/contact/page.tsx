"use client"

import type React from "react"
import { useState } from "react"
import { useLanguage } from "@/lib/context/language-context"

export default function Contact() {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
    alert(t("contact.success_message"))
    setFormData({ name: "", email: "", subject: "", message: "" })
  }

  return (
    <div className="min-h-screen">
      <section className="bg-primary text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{t("contact.title")}</h1>
          <p className="text-lg text-white/90">{t("contact.subtitle")}</p>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-card border border-border rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-6">{t("contact.send_message")}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block font-semibold mb-2">{t("contact.name_label")}</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t("contact.name_placeholder")}
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">{t("contact.email_label")}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">{t("contact.subject_label")}</label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t("contact.subject_placeholder")}
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">{t("contact.message_label")}</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full px-4 py-2 border border-border rounded-lg bg-input focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder={t("contact.message_body_placeholder")}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-lg transition"
              >
                {t("contact.send_button")}
              </button>
            </form>
          </div>

          <div className="mt-8 bg-muted rounded-lg p-8 text-center">
            <h3 className="font-bold text-xl mb-4">{t("contact.business_hours")}</h3>
            <div className="space-y-2 text-muted-foreground">
              <p>
                <span className="font-semibold text-foreground">{t("contact.monday_friday")}:</span> 8:00 AM - 6:00 PM SAST
              </p>
              <p>
                <span className="font-semibold text-foreground">{t("contact.saturday")}:</span> 9:00 AM - 2:00 PM SAST
              </p>
              <p>
                <span className="font-semibold text-foreground">{t("contact.sunday")}:</span> {t("contact.closed")}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
