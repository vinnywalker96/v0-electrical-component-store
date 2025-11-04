# ElectroHub - Electrical Components E-Commerce Platform

A modern, full-featured e-commerce platform built with Next.js, React, Tailwind CSS, and Supabase for selling electrical and electronic components.

## Features

### Core E-Commerce Features
- **Product Catalog**: Browse 12+ electrical components with detailed specifications
- **Advanced Search & Filtering**: Filter by category, brand, and price range
- **Shopping Cart**: Add/remove items, adjust quantities, real-time totals
- **Checkout Flow**: Multi-step checkout with address and payment method selection
- **Order Management**: Track orders, view history, order confirmation emails
- **User Authentication**: Secure email/password registration and login with Supabase Auth

### Product Categories
- Resistors
- LEDs
- Capacitors
- Wires & Connectors
- Breadboards
- Microcontrollers (Arduino)
- Switches
- Diodes
- PCBs
- Cables
- Potentiometers
- Relays

### User Features
- User Dashboard: Personal orders, profile management
- Order History: Track all purchases with status updates
- Profile Management: Edit contact information
- Secure Checkout: 15% tax calculation, multiple payment methods
- Newsletter Signup: Stay updated with special offers

### Payment Options
- Bank Transfer (EFT)
- Cash on Delivery
- Credit Card (integration ready for Stripe/PayFast)

### Admin Features
- **Admin Dashboard**: Overview of products, orders, and revenue
- **Product Management**: Add, edit, delete products with specifications
- **Order Management**: View all orders, update status in real-time
- **Inventory Tracking**: Monitor stock levels
- **Admin-only Access**: Role-based access control via Supabase RLS

### Informational Pages
- Home Page: Hero banner with featured products
- About Us: Company mission and values
- FAQ: 8 common questions about products and shipping
- Contact Us: Contact form with business details
- Terms & Conditions: Legal purchase terms
- Returns & Refund Policy: Clear return process
- Privacy Policy: Data handling information

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: shadcn/ui components
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **State Management**: React Context (Cart)
- **HTTP Client**: Fetch API / SWR ready

### Backend & Database
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Email/Password)
- **Security**: Row Level Security (RLS) policies

### Additional Services
- Email Integration: Resend (free tier - 100 emails/day)
- Payment Processing: Stripe/PayFast (ready to integrate)
- Hosting: Vercel (optimized for deployment)

## Project Structure

\`\`\`
├── app/
│   ├── layout.tsx                 # Root layout with CartProvider
│   ├── page.tsx                   # Home page
│   ├── shop/                      # Product catalog
│   ├── cart/                      # Shopping cart
│   ├── checkout/                  # Checkout process
│   ├── order-confirmation/        # Order confirmation
│   ├── auth/                      # Login/signup pages
│   ├── protected/                 # Protected user routes
│   │   ├── dashboard/             # User dashboard
│   │   ├── profile/               # User profile
│   │   └── orders/                # Order history
│   ├── admin/                     # Admin routes
│   │   ├── dashboard/             # Admin dashboard
│   │   ├── products/              # Product management
│   │   └── orders/                # Order management
│   ├── [info]/                    # Static pages (about, faq, etc.)
│   └── api/                       # API routes
├── components/
│   ├── navbar.tsx                 # Navigation with auth
│   ├── footer.tsx                 # Footer with newsletter
│   ├── product-card.tsx           # Product display
│   ├── add-to-cart-button.tsx     # Cart button
│   └── newsletter-signup.tsx      # Email subscription
├── lib/
│   ├── supabase/                  # Supabase clients (client/server)
│   ├── context/                   # Cart context
│   ├── types.ts                   # TypeScript interfaces
│   ├── email-service.ts           # Email utilities
│   └── middleware.ts              # Auth middleware
├── scripts/
│   ├── 001_create_tables.sql      # Database schema
│   └── 002_seed_products.sql      # Sample products
└── middleware.ts                  # Next.js middleware

\`\`\`

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project (free tier available)
- npm or yarn

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd electrohub
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Setup Supabase**
   - Create a Supabase project at https://supabase.com
   - Get your project URL and anon key
   - Set environment variables:
   \`\`\`bash
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   \`\`\`

4. **Run database migrations**
   - In your Supabase project SQL editor, run the scripts:
   - `scripts/001_create_tables.sql` - Creates all tables
   - `scripts/002_seed_products.sql` - Seeds sample products

5. **Start the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Open http://localhost:3000 in your browser**

## User Roles & Access

### Customer
- Browse and search products
- Add items to cart
- Checkout and place orders
- View order history
- Manage profile

### Admin
- Access admin dashboard at `/admin/dashboard`
- Add/edit/delete products
- View and manage all orders
- Update order statuses
- Track revenue and inventory

**To make a user admin:**
\`\`\`sql
UPDATE public.profiles SET role = 'admin' WHERE id = 'user_id';
\`\`\`

## Database Schema

### Tables
- **products**: Electrical components with specifications
- **profiles**: User information linked to auth.users
- **orders**: Customer orders with status and totals
- **order_items**: Individual items in each order
- **cart_items**: User shopping carts

All tables include Row Level Security (RLS) policies to protect user data.

## API Routes

- `POST /api/checkout` - Process order checkout
- `PATCH /api/orders/[id]/status` - Update order status (admin only)
- `POST /api/newsletter/subscribe` - Newsletter subscription

## Payment Integration (Ready to Implement)

The app includes placeholder payment methods. To add Stripe integration:

1. Create a Stripe account
2. Add API keys to environment variables:
   \`\`\`bash
   STRIPE_SECRET_KEY=your_secret_key
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_public_key
   \`\`\`
3. Implement Stripe checkout in `/app/checkout/page.tsx`

## Email Integration (Ready to Implement)

To enable order confirmation emails:

1. Sign up at https://resend.com (free tier includes 100 emails/day)
2. Get your API key from the Resend dashboard
3. Add to environment variables in Vercel:
   \`\`\`bash
   RESEND_API_KEY=your_resend_api_key
   \`\`\`
4. Order confirmations will be sent automatically with banking details

## Deployment

### Deploy to Vercel (Recommended)
\`\`\`bash
npm install -g vercel
vercel
\`\`\`

### Environment Variables on Vercel
Add the same environment variables to your Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL` (optional)

## Testing

### Test Credentials (After Signup)
\`\`\`
Email: test@example.com
Password: Test123!
\`\`\`

### Test Products
The system includes 12 pre-seeded electrical components:
- Resistor 1K Ohm
- LED Red 5mm
- Capacitor 100µF
- Arduino Uno R3
- And more...

## Performance Optimizations

- Server-side rendering with Next.js
- Client-side cart state management with Context API
- Database indexing via Supabase
- Row Level Security for data filtering
- Tailwind CSS for optimized styling

## Security Features

- Row Level Security (RLS) on all tables
- Server-side authentication middleware
- Protected admin routes
- Secure password hashing via Supabase Auth
- Email verification for new accounts
- CORS protection on API routes

## Troubleshooting

### Cart not updating
- Clear browser cache and refresh
- Ensure CartProvider wraps your app in layout.tsx

### Authentication issues
- Check Supabase environment variables
- Verify email confirmation in Supabase dashboard

### Database connection errors
- Confirm Supabase project is active
- Check RLS policies aren't blocking queries
- Verify user authentication state

## Future Enhancements

- [ ] Stripe payment integration
- [ ] PayFast integration for South Africa
- [ ] Product reviews and ratings
- [ ] Wishlist functionality
- [ ] Bulk order discounts
- [ ] Inventory tracking with low stock alerts
- [ ] Email notifications for order updates
- [ ] Advanced analytics dashboard
- [ ] Product recommendations
- [ ] Mobile app

## Support & Contributing

For issues or suggestions, please open an issue in the repository.

## License

MIT License - feel free to use this project for commercial purposes.

---

**Built with Next.js, Supabase, and Tailwind CSS**
