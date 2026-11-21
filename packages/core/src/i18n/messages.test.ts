import { describe, expect, it } from 'vitest';
import { detectLocale, messages } from '../index';

describe('messages', () => {
  it('every language has every key', () => {
    const keys = Object.keys(messages.en).sort();
    expect(Object.keys(messages.zh).sort()).toEqual(keys);
    expect(Object.keys(messages.ja).sort()).toEqual(keys);
  });
  it('detects the locale from the browser language', () => {
    expect([detectLocale('zh-CN'), detectLocale('ja-JP'), detectLocale('fr'), detectLocale()]).toEqual(['zh', 'ja', 'en', 'en']);
  });
});
