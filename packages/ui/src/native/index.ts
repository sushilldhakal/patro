/** The UI kit in the app: React Native + NativeWind. Same props as `../web`. */
import type { UiKit } from "../contract";
import { Box } from "./Box";
import { Button } from "./Button";
import { Card } from "./Card";
import { Icon } from "./Icon";
import { Input } from "./Input";
import { Pressable } from "./Pressable";
import { Sheet } from "./Sheet";
import { Table } from "./Table";
import { Text } from "./Text";

export { Box, Button, Card, Icon, Input, Pressable, Sheet, Table, Text };
export * from "../contract";
export { buttonClass, cardClass, iconToneClass, tableClass, textVariantClass } from "../classes";

/** Fails the app's typecheck if this platform drifts from the shared contract. */
export const kit = { Box, Text, Pressable, Input, Card, Button, Icon, Table, Sheet } satisfies UiKit;
