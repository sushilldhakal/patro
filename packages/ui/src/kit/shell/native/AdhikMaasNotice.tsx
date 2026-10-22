import { cn } from "@vedic-patro/design-tokens/cn";
import { adhikMaasClasses as a } from "@vedic-patro/design-tokens/classes/adhik-maas-classes";
import { useAdhikMaasNotice } from "@vedic-patro/features/home";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import type { AdhikMaasNoticeProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** "This year's adhik maas" — one quiet row under the calendar; a tap opens the month, its span and a link to the adhik maas page. */
export function AdhikMaasNotice({ bsYear, onMore, className }: AdhikMaasNoticeProps) {
  const notice = useAdhikMaasNotice(bsYear);
  if (!notice) return null;
  return (
    <Box className={cn(a.notice, className)}>
      <Pressable label={notice.label} selected={notice.open} onPress={notice.toggle} className={a.noticeRow}>
        <Icon node={shellIcons.moon} size="sm" tone="secondary" />
        <Text className={a.noticeLabel} numberOfLines={1}>
          {notice.label}
        </Text>
        <Icon node={notice.open ? shellIcons.chevronUp : shellIcons.chevronDown} size="sm" tone="muted" />
      </Pressable>
      {notice.open ? (
        <Box className={a.noticeBody}>
          <Text className={a.noticeDetail}>{notice.detail}</Text>
          <Text className={a.noticeWhy}>{notice.why}</Text>
          <Pressable role="link" onPress={() => onMore(notice.year)} className={a.noticeMore} >
            <Text className={a.noticeMoreText}>{notice.moreLabel} →</Text>
          </Pressable>
        </Box>
      ) : null}
    </Box>
  );
}
