import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import Ajv from 'ajv';
import JSON5 from 'json5';
import { describe, expect, it } from 'vitest';

import { DATA_DIR } from '../../scripts/build.mjs';

const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });

const pronunciationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ipa: { type: 'string' },
    audio_url: { type: 'string' },
  },
};

const translationSchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    part_of_speech: { type: 'string' },
    meaning: { type: 'string' },
  },
};

const analysisSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    breakdown: { type: 'string' },
    note: { type: 'string' },
  },
};

const exampleSchema = {
  type: 'object',
  additionalProperties: false,
  minProperties: 1,
  properties: {
    en: { type: 'string' },
    zh: { type: 'string' },
  },
};

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['root', 'page', 'words'],
  properties: {
    root: {
      type: 'object',
      additionalProperties: false,
      required: ['name'],
      properties: {
        slug: { type: 'string' },
        order: { type: ['string', 'number', 'null'] },
        name: { type: 'string', minLength: 1 },
        title: { type: 'string' },
        core_meaning: { type: 'string' },
        origin: { type: 'string' },
        overview: { type: 'string' },
        notes: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
    page: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        slug: { type: 'string' },
        order: { type: ['string', 'number', 'null'] },
      },
    },
    words: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['word', 'translations'],
        properties: {
          word: { type: 'string', minLength: 1 },
          pronunciations: {
            type: 'object',
            additionalProperties: false,
            properties: {
              uk: pronunciationSchema,
              us: pronunciationSchema,
            },
          },
          translations: {
            type: 'array',
            minItems: 1,
            items: translationSchema,
          },
          levels: {
            type: 'array',
            items: { type: 'string' },
          },
          analysis: analysisSchema,
          memory_tip: { type: 'string' },
          memoryTip: { type: 'string' },
          examples: {
            type: 'array',
            items: exampleSchema,
          },
        },
      },
    },
  },
};

const validate = ajv.compile(schema);
const dataFiles = readdirSync(DATA_DIR).filter((name) => name.endsWith('.json'));

describe('word family data schema', () => {
  for (const fileName of dataFiles) {
    it(`validates ${fileName}`, () => {
      const raw = readFileSync(join(DATA_DIR, fileName), 'utf8');
      const parsed = JSON5.parse(raw);
      const valid = validate(parsed);
      const errorText = validate.errors ? ajv.errorsText(validate.errors, { separator: '\n' }) : '';

      expect(valid, errorText).toBe(true);
    });
  }
});
