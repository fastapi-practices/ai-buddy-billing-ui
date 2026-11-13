import type { AIBuddyBillingPriceResult } from '../api';

import { describe, expect, it } from 'vitest';

import {
  createAIBuddyBillingPricePayload,
  createAIBuddyBillingPriceUpdatePayload,
  isPriceActive,
  normalizePriceAmount,
} from './price-params';

const now = new Date('2024-05-01T00:00:00Z');

function price(overrides: Partial<AIBuddyBillingPriceResult> = {}) {
  return {
    id: 1,
    provider_id: 2,
    model_id: 'gpt-4o-mini',
    input_price: 1,
    output_price: 2,
    cache_read_price: 0,
    cache_write_price: 0,
    input_audio_price: 0,
    output_audio_price: 0,
    cache_audio_read_price: 0,
    image_price: 0,
    effective_from: '2024-04-01T00:00:00Z',
    effective_to: null,
    created_time: '2024-04-01T00:00:00Z',
    ...overrides,
  } satisfies AIBuddyBillingPriceResult;
}

describe('normalizePriceAmount', () => {
  it('keeps non-negative numbers and rejects empty or invalid input', () => {
    expect(normalizePriceAmount('1.25')).toBe(1.25);
    expect(normalizePriceAmount(0)).toBe(0);
    expect(normalizePriceAmount(null)).toBe(0);
    expect(normalizePriceAmount(-1)).toBe(0);
    expect(normalizePriceAmount('abc')).toBe(0);
  });
});

describe('createAIBuddyBillingPricePayload', () => {
  it('trims the model id and fills missing prices with zero', () => {
    expect(
      createAIBuddyBillingPricePayload({
        provider_id: 3,
        model_id: ' gpt-4o ',
        input_price: '2.5',
        effective_from: '2024-05-01T00:00:00Z',
        effective_to: '',
      }),
    ).toEqual({
      provider_id: 3,
      model_id: 'gpt-4o',
      input_price: 2.5,
      output_price: 0,
      cache_read_price: 0,
      cache_write_price: 0,
      input_audio_price: 0,
      output_audio_price: 0,
      cache_audio_read_price: 0,
      image_price: 0,
      effective_from: '2024-05-01T00:00:00Z',
      effective_to: null,
    });
  });
});

describe('createAIBuddyBillingPriceUpdatePayload', () => {
  it('keeps editable amounts and converts an empty expiry to null', () => {
    expect(
      createAIBuddyBillingPriceUpdatePayload({
        output_price: '3.5',
        effective_to: '',
      }),
    ).toEqual({
      input_price: 0,
      output_price: 3.5,
      cache_read_price: 0,
      cache_write_price: 0,
      input_audio_price: 0,
      output_audio_price: 0,
      cache_audio_read_price: 0,
      image_price: 0,
      effective_to: null,
    });
  });
});

describe('isPriceActive', () => {
  it('covers open-ended, expiring and future prices', () => {
    expect(isPriceActive(price(), now)).toBe(true);
    expect(
      isPriceActive(price({ effective_to: '2024-04-15T00:00:00Z' }), now),
    ).toBe(false);
    expect(
      isPriceActive(price({ effective_from: '2024-06-01T00:00:00Z' }), now),
    ).toBe(false);
  });
});
