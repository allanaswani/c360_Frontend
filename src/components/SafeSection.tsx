'use client';

import { Component, type ReactNode } from 'react';
import { UnavailableState } from './States';
import ui from './ui.module.css';

/**
 * Contains a render error to the section that threw it.
 *
 * Without this, one panel meeting data it did not expect replaced the WHOLE customer
 * page with the framework's "This page couldn't load" (2026-10-01: a frontend
 * deployed ahead of its backend). Now that panel says it could not be shown and the
 * rest of the page - header, balances, other tabs - keeps working.
 */
export class SafeSection extends Component<{ name: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Visible in the browser console for whoever is diagnosing it.
    console.error(`[C360] ${this.props.name} failed to render`, error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className={ui.card} style={{ padding: 8, marginTop: 12 }}>
          <UnavailableState title={`${this.props.name} could not be shown`}>
            The rest of the page is unaffected. Reload to try again; if it keeps happening,
            the app and its server may be on different versions.
          </UnavailableState>
        </div>
      );
    }
    return this.props.children;
  }
}
