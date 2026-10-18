import assert from "node:assert/strict";
import { test } from "node:test";
import { cn } from "../src/cn.ts";

test("a colour class survives next to a type step", () => {
  assert.equal(cn("text-foreground", "text-body"), "text-foreground text-body");
  assert.equal(cn("font-num font-bold text-foreground", "text-body tracking-tight"), "font-num font-bold text-foreground text-body tracking-tight");
  assert.equal(cn("text-danger", "text-sm"), "text-danger text-sm");
  assert.equal(cn("text-ill-sky84/65", "text-xs"), "text-ill-sky84/65 text-xs");
});

test("two colours still collapse to the last one, and alignment is kept", () => {
  assert.equal(cn("text-foreground", "text-danger"), "text-danger");
  assert.equal(cn("text-left", "text-center", "text-foreground"), "text-center text-foreground");
  assert.equal(cn("text-sm", "text-body"), "text-body");
});
