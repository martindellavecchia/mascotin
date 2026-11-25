import type { KeyboardEvent } from 'react';

// Safari can clear isComposing before the confirming keydown; keyCode 229 still marks it.
export function isImeComposing(event: KeyboardEvent): boolean {
  return event.nativeEvent.isComposing || event.keyCode === 229;
}
