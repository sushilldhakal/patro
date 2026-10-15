/** The UI kit on the website: plain HTML + Tailwind. Same props as `../native`. */
import type { UiKit } from "../contract";
import { Box } from "./Box";
import { Button, buttonWebClass } from "./Button";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { Input } from "./Input";
import { Pressable } from "./Pressable";
import { Sheet } from "./Sheet";
import { Table } from "./Table";
import { Text } from "./Text";

export { Box, Button, buttonWebClass, Card, Icon, Input, Pressable, Sheet, Table, Text };
export * from "../contract";
export { buttonClass, cardClass, iconToneClass, tableClass, textVariantClass } from "../classes";

/** Fails the website's typecheck if this platform drifts from the shared contract. */
export const kit = { Box, Text, Pressable, Input, Card, Button, Icon, Table, Sheet } satisfies UiKit;
