import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app shell', () => {
  render(<App />);
  expect(screen.getByText('中国库存系统')).toBeInTheDocument();
});
