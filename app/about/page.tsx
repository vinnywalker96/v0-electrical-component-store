import { CheckCircle2, Users, Award, Zap } from "lucide-react"

export default function About() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-primary text-white py-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About KG Compponents</h1>
          <p className="text-lg text-white/90">Your trusted partner for quality electrical components since 2015</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-muted-foreground mb-4">
                At KG Compponents, we believe that access to quality electrical components should be simple, affordable,
                and reliable. We're committed to serving engineers, makers, hobbyists, and businesses with the finest
                selection of components available.
              </p>
              <p className="text-muted-foreground">
                Every product in our catalog has been carefully selected to meet strict quality standards, ensuring your
                projects succeed every time.
              </p>
            </div>
            <div className="bg-muted rounded-lg p-8">
              <h3 className="font-bold text-2xl mb-6">Why Choose Us?</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <span>1000+ electrical components in stock</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <span>Competitive pricing with volume discounts</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <span>Fast, reliable shipping across South Africa</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <span>Expert technical support team</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-primary mb-2">9+</div>
              <p className="text-muted-foreground">Years in Business</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-primary mb-2">5000+</div>
              <p className="text-muted-foreground">Happy Customers</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-primary mb-2">1000+</div>
              <p className="text-muted-foreground">Product SKUs</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <div className="text-4xl font-bold text-primary mb-2">98%</div>
              <p className="text-muted-foreground">Satisfaction Rate</p>
            </div>
          </div>

          {/* Values */}
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <Award className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-xl mb-2">Quality First</h3>
              <p className="text-muted-foreground">Every component meets international standards and certifications</p>
            </div>
            <div className="text-center">
              <Users className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-xl mb-2">Customer Support</h3>
              <p className="text-muted-foreground">Our team is ready to help with technical advice and guidance</p>
            </div>
            <div className="text-center">
              <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-bold text-xl mb-2">Innovation</h3>
              <p className="text-muted-foreground">We continuously expand our catalog with latest components</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
