import React from 'react';
import { render, screen } from '@testing-library/react';
import { Input } from '../input';

describe('Input', () => {
  it('renders an input with the correct type', () => {
    render(<Input type="text" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('applies the correct class', () => {
    render(<Input className="my-class" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('my-class');
  });

  it('is disabled when the disabled prop is true', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });
});
