import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../select';

describe('Select', () => {
  it('renders a select with a placeholder', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select a value" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Value 1</SelectItem>
        </SelectContent>
      </Select>
    );
    const select = screen.getByText(/select a value/i);
    expect(select).toBeInTheDocument();
  });

  it('opens the select menu on click', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select a value" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Value 1</SelectItem>
        </SelectContent>
      </Select>
    );
    const trigger = screen.getByText(/select a value/i);
    fireEvent.click(trigger);
    const item = screen.getByText(/value 1/i);
    expect(item).toBeInTheDocument();
  });

  it('selects a value', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select a value" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="1">Value 1</SelectItem>
        </SelectContent>
      </Select>
    );
    const trigger = screen.getByText(/select a value/i);
    fireEvent.click(trigger);
    const item = screen.getByText(/value 1/i);
    fireEvent.click(item);
    const selectedValue = screen.getByText(/value 1/i);
    expect(selectedValue).toBeInTheDocument();
  });

  it('renders a select with a label', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select a value" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>My Label</SelectLabel>
            <SelectItem value="1">Value 1</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );
    const trigger = screen.getByText(/select a value/i);
    fireEvent.click(trigger);
    const label = screen.getByText(/my label/i);
    expect(label).toBeInTheDocument();
  });
});
