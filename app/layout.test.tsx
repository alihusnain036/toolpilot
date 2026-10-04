import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import RootLayout, { metadata, viewport } from './layout';

/**
 * Smoke test for the root layout.
 *
 * A root layout renders <html> and <body>, which React can only legally mount
 * as the document root. Mounting it inside a test container is still the
 * practical way to assert its structure, so we render into the default
 * container and read the nested elements out of it. React logs a DOM-nesting
 * warning for that; it is expected here and nowhere else, so we silence it for
 * this file only rather than globally.
 */
const realConsoleError = console.error.bind(console);
let consoleError: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  consoleError = vi
    .spyOn(console, 'error')
    .mockImplementation((...args: unknown[]) => {
      const first = typeof args[0] === 'string' ? args[0] : '';
      if (first.includes('validateDOMNesting')) {
        return;
      }
      // Anything else is a real problem: let it through.
      realConsoleError(...args);
    });
});

afterAll(() => {
  consoleError.mockRestore();
});

function renderLayout(children: React.ReactNode): {
  container: HTMLElement;
  html: HTMLElement | null;
  body: HTMLElement | null;
  appRoot: HTMLElement | null;
} {
  const { container } = render(<RootLayout>{children}</RootLayout>);
  return {
    container,
    html: container.querySelector('html'),
    body: container.querySelector('body'),
    appRoot: container.querySelector('#app-root'),
  };
}

describe('RootLayout', () => {
  it('renders its children', () => {
    renderLayout(<p>hello from a child route</p>);
    expect(screen.getByText('hello from a child route')).toBeInTheDocument();
  });

  it('renders the html and body document structure', () => {
    const { html, body } = renderLayout(<p>content</p>);
    expect(html).not.toBeNull();
    expect(body).not.toBeNull();
  });

  it('renders a single main landmark for the skip link to target', () => {
    renderLayout(<p>content</p>);
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main');
  });

  it('applies the themed background and foreground tokens to the body', () => {
    const { body } = renderLayout(<p>content</p>);
    expect(body?.className).toContain('bg-background');
    expect(body?.className).toContain('text-foreground');
    expect(body?.className).toContain('font-sans');
  });

  it('declares the document language', () => {
    const { html } = renderLayout(<p>content</p>);
    expect(html).toHaveAttribute('lang', 'en');
  });

  it('exposes the self-hosted font CSS variables on the html element', () => {
    const { html } = renderLayout(<p>content</p>);
    // next/font is stubbed in vitest.setup.ts so no font is fetched; what
    // matters is that the layout forwards both variables onto <html>.
    expect(html?.className).toContain('--font-sans');
    expect(html?.className).toContain('--font-mono');
  });

  it('has no detectable accessibility violations', async () => {
    const { appRoot } = renderLayout(<h1>ToolPilot</h1>);
    expect(appRoot).not.toBeNull();
    const results = await axe(appRoot as HTMLElement);
    expect(results.violations).toEqual([]);
  });

  it('sets metadata derived from the validated site URL', () => {
    expect(metadata.metadataBase?.origin).toBe('https://toolpilot.test');
    expect(metadata.title).toMatchObject({ default: 'ToolPilot' });
  });

  it('declares a responsive viewport', () => {
    expect(viewport.width).toBe('device-width');
    expect(viewport.initialScale).toBe(1);
  });
});
