# AGENTS.md - Guidelines for Agentic Coding Agents

This document provides guidelines for coding agents operating in the mascoTin repository.

## Build, Lint, and Test Commands

### Core Commands
```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server (after build)
npm start

# Run linting
npm run lint

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Testing Commands

```bash
# Run a single test file
npm test -- src/__tests__/components/Header.test.tsx

# Run tests matching a pattern
npm test -- --testNamePattern="Header"

# Run tests with coverage report
npm test -- --coverage

# Run tests and generate HTML coverage report
npm test -- --coverage --coverageReporters=html

# Run tests with verbose output
npm test -- --verbose

# Run tests with maximum workers for speed
npm test -- --maxWorkers=4
```

### Database Commands
```bash
# Push schema changes to database
npm run db:push

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Reset database
npm run db:reset
```

## Code Style Guidelines

### Imports

**Do:**
```typescript
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
```

**Don't:**
```typescript
// Avoid relative imports when @/* paths are available
import Header from '../../components/Header';

// Avoid default exports for components when named exports are preferred
import HeaderComponent from '@/components/Header';
```

**Import Order:**
1. React imports (`useState`, `useEffect`, etc.)
2. Next.js imports (`useRouter`, `Link`, `usePathname`, etc.)
3. Third-party UI component imports (Radix UI, shadcn/ui)
4. Custom hooks (`useFetchWithError`, etc.)
5. Utility functions (`cn`, etc.)
6. Types/interfaces

### TypeScript Conventions

**Do:**
```typescript
interface HeaderProps {
  session: {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  } | null;
}

export default function Header({ session }: HeaderProps) {
  const [ownerImage, setOwnerImage] = useState<string | null>(null);
  // ...
}
```

**Don't:**
```typescript
// Avoid using 'any'
function processData(data: any) { }

// Avoid implicit 'any' inference
const user = { name: 'John', age: 30 };  // Inferred as { name: string; age: number; }
```

**Type Exports:**
```typescript
// Export types alongside schemas
export type PetFormData = z.infer<typeof petSchema>;
export type OwnerFormData = z.infer<typeof ownerSchema>;
```

### Naming Conventions

**Components:**
- PascalCase for component names: `Header`, `PetForm`, `OwnerForm`
- File names match component names: `Header.tsx`, `PetForm.tsx`

**Hooks:**
- camelCase with "use" prefix: `useFetchWithError`, `useIsMobile`

**Variables & Functions:**
- camelCase: `userName`, `fetchData`, `handleSubmit`
- Descriptive names preferred over abbreviations

**Constants:**
- UPPER_SNAKE_CASE for global constants: `MAX_PET_IMAGES = 6`

**CSS Classes (via tailwind-merge):**
```typescript
import { cn } from '@/lib/utils';

function Card({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      className
    )}>
```

### Form Validation (Zod)

**Do:**
```typescript
import { z } from 'zod';

export const petSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(50),
  petType: z.enum(['dog', 'cat', 'bird', 'other'], {
    message: "El tipo de mascota es requerido",
  }),
  age: z.number().min(0, "La edad debe ser positiva").max(30),
});
```

**Error Messages:**
- Use Spanish error messages (matches UI language)
- Keep messages concise but descriptive

### Error Handling

**Do:**
```typescript
const { fetchWithError } = useFetchWithError();

useEffect(() => {
  if (!session?.user?.id) return;

  fetchWithError<{ owner?: OwnerProfile }>('/api/owner/profile')
    .then(data => {
      if (data.success && data.data) {
        // Handle success
      }
    });
}, [session]);

// For async/await
async function submitForm(data: PetFormData) {
  try {
    const result = await fetchWithError('/api/pets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (result.success) {
      // Handle success
    }
  } catch (error) {
    console.error('Form submission failed:', error);
  }
}
```

**Don't:**
```typescript
// Avoid silent error swallowing
fetchData().catch(() => {});

// Avoid generic error handling
try {
  // code
} catch (e) {
  console.log(e);  // Too generic
}
```

### React Component Patterns

**Client Components:**
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PetForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Component logic...
}
```

**Props with Session:**
```typescript
interface HeaderProps {
  session: {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  } | null;
}

export default function Header({ session }: HeaderProps) {
  // Handle null session gracefully
  const userInitials = session?.user?.name?.split(' ')
    .map((n: string) => n[0]).join('') || 'U';
  // ...
}
```

### File Structure

```
src/
├── __tests__/          # Test files
│   ├── components/     # Component tests
│   ├── hooks/          # Hook tests
│   ├── api/           # API tests
│   └── *.test.ts      # Utility/schema tests
├── components/
│   ├── ui/            # Base UI components (shadcn)
│   ├── core/          # Core application components
│   └── features/      # Feature-specific components
├── hooks/             # Custom React hooks
├── lib/               # Utilities, schemas, configs
├── app/               # Next.js App Router pages
└── types/             # Global type definitions
```

### Testing Guidelines

**Test File Naming:**
- Component tests: `ComponentName.test.tsx`
- Hook tests: `hookName.test.ts`
- Utility tests: `utilName.test.ts`

**Test Patterns:**
```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ComponentName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<ComponentName prop="value" />);
    expect(screen.getByText(/expected text/i)).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    render(<ComponentName onAction={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: /submit/i }));
    // assertions...
  });
});
```

**Mocking:**
```typescript
// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
  usePathname: () => '/',
}));

// Mock hooks
jest.mock('@/hooks/useFetchWithError', () => ({
  useFetchWithError: () => ({
    fetchWithError: jest.fn(),
  }),
}));
```

### Git Commit Messages

Follow conventional commits:
```
feat: add new pet matching algorithm
fix: resolve header rendering issue on mobile
docs: update API documentation
test: add tests for useFetchWithError hook
refactor: simplify pet form validation
```

### Additional Notes

- **No comments unless required**: Avoid adding unnecessary comments to code
- **Spanish UI, English code**: Error messages and UI text are in Spanish, but code/variables are in English
- **Tailwind CSS**: Use utility classes for styling; use `cn()` helper for conditional classes
- **Radix UI**: Base components come from Radix UI via shadcn/ui patterns
- **Zod v4**: Schema validation uses Zod v4 (note: different API from v3)
- **Next.js 15**: Uses Next.js 15 with App Router and Server Components
- **React 19**: Uses React 19 with automatic JSX runtime
