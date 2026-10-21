import { useState } from 'react';

/**
 * Runs a submit action and keeps track of "is it running" and "what went wrong".
 * If your `onSubmit` throws (or rejects) with an Error, its message is shown on the form.
 */
export function useAuthSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Returns true when the action finished without throwing. */
  async function run(action: () => Promise<void> | void): Promise<boolean> {
    setError(null);
    setSubmitting(true);
    try {
      await action();
      return true;
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'Something went wrong. Please try again.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }
  return { submitting, error, setError, run };
}

/**
 * "Show a field's error only after the person has left it or pressed submit."
 * Stops the form from shouting "Required" at someone who has not typed yet.
 */
export function useShowErrors() {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  return {
    show: (key: string) => submitted || !!touched[key],
    touch: (key: string) => setTouched((t) => (t[key] ? t : { ...t, [key]: true })),
    markSubmitted: () => setSubmitted(true),
  };
}
