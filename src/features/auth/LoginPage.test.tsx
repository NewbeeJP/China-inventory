import { render, screen } from '@testing-library/react';
import LoginPage from './LoginPage';

test('renders email and password fields', () => {
  render(<LoginPage />);
  expect(screen.getByText('邮箱')).toBeInTheDocument();
  expect(screen.getByText('密码')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
});
