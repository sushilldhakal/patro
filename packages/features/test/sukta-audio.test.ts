import { test } from "node:test";
import assert from "node:assert/strict";

import { suktaTracksFrom } from "../src/documents/sukta-audio";

const SIGNED = "https://acct.r2.cloudflarestorage.com/vedicpatro/documents/rigveda/10";

test("uses the sukta link the API signed", () => {
  const tracks = suktaTracksFrom([
    {
      sukta_number: 165,
      audio_url: `${SIGNED}/rigveda_10_165_03.mp3?X-Amz-Signature=a`,
      sukta_audio_url: `${SIGNED}/rigveda_10_sukta_165.mp3?X-Amz-Signature=b`,
    },
  ]);
  assert.deepEqual(tracks, [{ sukta: 165, url: `${SIGNED}/rigveda_10_sukta_165.mp3?X-Amz-Signature=b`, label: "10.165" }]);
});

test("never rewrites a signed verse link into a sukta link", () => {
  assert.deepEqual(suktaTracksFrom([{ sukta_number: 165, audio_url: `${SIGNED}/rigveda_10_165_03.mp3?X-Amz-Signature=a` }]), []);
});

test("still derives the sukta file from an unsigned verse link", () => {
  const [track] = suktaTracksFrom([{ sukta_number: 7, audio_url: "https://cdn.example/documents/rigveda/01/rigveda_01_7_2.mp3" }]);
  assert.equal(track?.url, "https://cdn.example/documents/rigveda/01/rigveda_01_sukta_007.mp3");
});
