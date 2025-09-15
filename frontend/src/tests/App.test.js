import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

test('renders without crashing', () => {
  render(<App />);
  // Basic test that the app renders
  expect(document.body).toBeInTheDocument();
});
