import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoRoot = new URL('../../', import.meta.url);
const readSource = path => readFile(new URL(path, repoRoot), 'utf8');

const [overviewSource, sheetSource, headerSource] = await Promise.all([
  readSource('src/char_info_viewer/components/illustrated/IllustratedOverviewPanel.vue'),
  readSource('src/char_info_viewer/components/illustrated/IllustratedCharacterSheet.vue'),
  readSource('src/char_info_viewer/components/illustrated/IllustratedHeader.vue'),
]);

test('illustrated character overview renders the entrance quote only when display text exists', () => {
  assert.match(sheetSource, /:entrance-quote-text="vm\.entranceQuoteText"/);
  assert.match(overviewSource, /entranceQuoteText\?:\s*string/);
  assert.match(
    overviewSource,
    /<blockquote\s+v-if="entranceQuoteText"\s+class="illustrated-entrance-quote">[\s\S]*?{{ entranceQuoteText }}[\s\S]*?<\/blockquote>/,
  );
});

test('entrance quote keeps one lead ornament, subtle quotation marks, and a quiet closing line', () => {
  assert.match(overviewSource, /@import url\(['"]https:\/\/fontsapi\.zeoseven\.com\/293\/main\/result\.css['"]\);/);

  const quoteRule = overviewSource.match(/\.illustrated-entrance-quote\s*\{[^}]*\}/)?.[0];
  assert.ok(quoteRule);
  assert.match(quoteRule, /font-family:\s*'LXGW WenKai Mono'/);
  assert.match(quoteRule, /font-style:\s*normal/);
  assert.match(quoteRule, /font-size:\s*clamp\(17px,/);
  assert.match(quoteRule, /border:\s*0/);
  assert.match(quoteRule, /background:\s*none/);
  assert.match(
    overviewSource,
    /class="illustrated-entrance-quote-ornament"\s+aria-hidden="true">[\s\S]*?class="illustrated-entrance-quote-diamond"/,
  );
  assert.equal((overviewSource.match(/class="illustrated-entrance-quote-ornament"/g) ?? []).length, 1);
  assert.match(
    overviewSource,
    /\.illustrated-entrance-quote-ornament::before,[\s\S]*?\.illustrated-entrance-quote-ornament::after/,
  );
  assert.match(overviewSource, /\.illustrated-entrance-quote-text::before\s*\{[^}]*content:\s*'“'/);
  assert.match(overviewSource, /\.illustrated-entrance-quote-text::after\s*\{[^}]*content:\s*'”'/);
  assert.match(overviewSource, /class="illustrated-entrance-quote-tail"\s+aria-hidden="true"/);
  assert.match(overviewSource, /\.illustrated-entrance-quote-tail\s*\{[^}]*linear-gradient/);
  assert.doesNotMatch(overviewSource, /content:\s*'[「」]'/);
});

test('illustrated character attributes wrap to three flags over two', () => {
  assert.match(
    overviewSource,
    /\.illustrated-attributes\s*\{[^}]*max-width:\s*calc\(\(var\(--flag-width\) \* 3\) \+ \(var\(--flag-gap\) \* 2\)\);/,
  );
});

test('illustrated and DX overview themes share one geometry scale', () => {
  assert.match(
    sheetSource,
    /\.illustrated-wrapper\s*\{[^}]*--illustrated-flag-width:\s*128px;[^}]*--illustrated-flag-height:\s*128px;[^}]*--illustrated-resource-height:\s*72px;/,
  );
  assert.match(
    overviewSource,
    /\.illustrated-attributes\s*\{[^}]*--flag-width:\s*var\(--illustrated-flag-width\);[^}]*--flag-min-height:\s*var\(--illustrated-flag-height\);/,
  );
  assert.match(overviewSource, /\.illustrated-resource\s*\{[^}]*min-height:\s*var\(--illustrated-resource-height\);/);
});

test('illustrated and DX desktop headers share one readable title scale', () => {
  assert.match(
    headerSource,
    /\.illustrated-header:not\(\.compact\)\s*\{[^}]*min-height:\s*var\(--illustrated-header-min-height\);/,
  );
  assert.match(headerSource, /\.illustrated-name\s*\{[^}]*font-size:\s*clamp\(30px, 4\.2cqw, 38px\);/);
  assert.match(
    headerSource,
    /\.illustrated-header\.ornate \.illustrated-name\s*\{[^}]*white-space:\s*normal;[^}]*text-wrap:\s*balance;/,
  );
  const anastasiaTitleRule = sheetSource.match(
    /\.illustrated-theme-anastasia :deep\(\.illustrated-header \.illustrated-name\)\s*\{[^}]*\}/,
  )?.[0];
  const irisTitleRule = sheetSource.match(
    /\.illustrated-theme-iris :deep\(\.illustrated-header \.illustrated-name\)\s*\{[^}]*\}/,
  )?.[0];
  assert.ok(anastasiaTitleRule);
  assert.ok(irisTitleRule);
  assert.doesNotMatch(anastasiaTitleRule, /font-size:/);
  assert.doesNotMatch(irisTitleRule, /font-size:/);
});
