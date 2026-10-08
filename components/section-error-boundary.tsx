"use client";

import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";

import { TranslatedErrorFallback } from "@/components/translated-error-fallback";

type Props = {
  children: ReactNode;
  locale?: string;
};

type State = {
  error: (Error & { digest?: string }) | null;
};

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    Sentry.captureException(error);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <TranslatedErrorFallback
          error={this.state.error}
          reset={() => this.setState({ error: null })}
          locale={this.props.locale}
        />
      );
    }
    return this.props.children;
  }
}
