import type { KeyboardEvent } from 'react';
import { isImeComposing } from '@/lib/keyboard';

function keyEvent(init: { isComposing?: boolean; keyCode?: number }) {
  return {
    keyCode: init.keyCode ?? 13,
    nativeEvent: { isComposing: init.isComposing ?? false },
  } as unknown as KeyboardEvent;
}

describe('isImeComposing', () => {
  it('detects an active composition', () => {
    expect(isImeComposing(keyEvent({ isComposing: true }))).toBe(true);
  });

  it('detects the confirming Enter that Safari reports with keyCode 229', () => {
    expect(isImeComposing(keyEvent({ keyCode: 229 }))).toBe(true);
  });

  it('lets a plain Enter through', () => {
    expect(isImeComposing(keyEvent({}))).toBe(false);
  });
});
