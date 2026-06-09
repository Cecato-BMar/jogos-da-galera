import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jogos da Galera',
  description: 'Stop online grátis para jogar com amigos.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
