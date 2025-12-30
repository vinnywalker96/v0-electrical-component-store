import { render, screen } from '@testing-library/react'
import { ProductCard } from '@/components/product-card'

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />
}))

// Mock useCart
jest.mock('@/lib/context/cart-context', () => ({
  useCart: () => ({
    addToCart: jest.fn(),
    items: [],
    total: 0,
    loading: false
  })
}))

// Mock supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } })
    }
  })
}))

// Mock currency context
jest.mock('@/lib/context/currency-context', () => ({
  useCurrency: () => ({
    formatPrice: (price: number) => `R${price.toFixed(2)}`
  })
}))

// Mock language context
jest.mock('@/lib/context/language-context', () => ({
  useLanguage: () => ({
    t: (key: string) => key
  })
}))

const mockProduct = {
  id: '1',
  name: 'Test Resistor',
  description: 'A test resistor',
  price: 10.99,
  image_url: '/test.jpg',
  category: 'Resistors',
  stock: 50,
  seller_id: 'seller-1'
}

describe('ProductCard', () => {
  it('renders product information correctly', () => {
    render(<ProductCard product={mockProduct} />)

    expect(screen.getByText('Test Resistor')).toBeInTheDocument()
    expect(screen.getByText('A test resistor')).toBeInTheDocument()
    expect(screen.getByText('R10.99')).toBeInTheDocument()
  })

  it('displays product category icon', () => {
    render(<ProductCard product={mockProduct} />)

    expect(screen.getByText('Resistors')).toBeInTheDocument()
    expect(screen.getByText('⧉')).toBeInTheDocument()
  })
})