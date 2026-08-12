import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login page when not authenticated', async () => {
  render(<App />);
  expect(await screen.findByText('登录中国库存系统')).toBeInTheDocument();
});
