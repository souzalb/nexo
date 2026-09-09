import { ReactNode } from 'react';

interface LegalLayoutProps {
  title: string;
  children: ReactNode;
}

export function LegalLayout({ title, children }: LegalLayoutProps) {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-gray-900">
      <div className="mx-auto max-w-3xl">
        <div className="dark:bg-card rounded-lg bg-white p-8 shadow-md sm:p-10">
          <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          <div className="prose prose-slate dark:prose-invert max-w-none">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
