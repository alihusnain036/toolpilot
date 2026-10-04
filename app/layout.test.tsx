import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, expect, it } from 'vitest';

import RootLayout, { metadata, viewport } from './layout';

/**
 * Smoke test for the root layout. React cannot mount <html>/<body> inside a
 * detached <div>, so we render into the live document and read the result
 * from there — which is also the only way the body classes are observable.
 */
function renderLayout(children: React.ReactNode): HTMLElement {
  const markup = render(<RootLayout>{children}</RootLayout>, {
    container: document.documentElement,
    baseElement: document.documentElement,
  });
  return markup.baseElement as HTMLElement;
}

describe('RootLayout', () => {
  it('renders its children', () => {
    renderLayout(<p>hello from a child route</p>);
    expect(screen.getByText('hello from a child route')).toBeInTheDocument();
  });

  it('renders a single main landmark for the skip link to target', () => {
    renderLayout(<p>content</p>);
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('id', 'main');
  });

  it('applies the themed background and foreground tokens to the body', () => {
    renderLayout(<p>content</p>);
    const body = document.querySelector('body');
    expect(body).not.toBeNull();
    expect(body?.className).toContain('bg-background');
    expect(body?.className).toContain('text-foreground');
  });

  it('declares the document language', () => {
    renderLayout(<p>content</p>);
    expect(document.querySelector('html')).toHaveAttribute('lang', 'en');
  });

  it('exposes the self-hosted font CSS variables on the html element', () => {
    renderLayout(<p>content</p>);
    // vitest.setup.ts stubs next/font, so the stub's variable name is what
    // reaches the class list. What matters is that the layout forwards it.
    expect(document.querySelector('html')?.className).toContain('--font-mock');
  });

  it('has no detectable accessibility violations', async () => {
    const baseElement = renderLayout(<h1>ToolPilot</h1>);
    const results = await axe(baseElement);
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
