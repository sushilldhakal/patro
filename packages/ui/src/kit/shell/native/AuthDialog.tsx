import { cn } from "@vedic-patro/domain/utils";
import { accountClasses as account } from "@vedic-patro/design-tokens/classes/account-classes";
import { Box, Button, Input, Pressable, Sheet, Text } from "@vedic-patro/ui";
import type { AuthDialogViewProps } from "../contract";

/** Sign-in, sign-up and password reset. Social buttons and legal routes are supplied by the app. */
export function AuthDialog(props: AuthDialogViewProps) {
  const { switchCopy: sw } = props;
  return (
    <Sheet open={props.open} onClose={props.onClose} title={props.title} closeLabel={props.closeLabel} placement="top">
      <Text className="mb-3 text-sm text-muted-foreground">{props.description}</Text>
      {props.social}
      <Box className={cn("flex flex-col", account.dialogForm)}>
        <Box className={cn("flex flex-col", account.field)}>
          <Text className={account.label}>{props.emailLabel}</Text>
          <Input type="email" value={props.email} onChange={props.onEmail} placeholder={props.emailPlaceholder} label={props.emailLabel} className={account.input} />
        </Box>
        {props.showPassword ? (
          <Box className={cn("flex flex-col", account.field)}>
            <Text className={account.label}>{props.passwordLabel}</Text>
            <Input type="password" value={props.password} onChange={props.onPassword} placeholder={props.passwordPlaceholder} label={props.passwordLabel} className={account.input} />
          </Box>
        ) : null}
        {props.showConfirm ? (
          <Box className={cn("flex flex-col", account.field)}>
            <Text className={account.label}>{props.confirmLabel}</Text>
            <Input type="password" value={props.confirm} onChange={props.onConfirm} label={props.confirmLabel} className={account.input} />
          </Box>
        ) : null}
        {props.error ? <Text className={account.formError}>{props.error}</Text> : null}
        {props.notice ? <Text className={account.formNotice}>{props.notice}</Text> : null}
        <Button label={props.submitLabel} onPress={props.onSubmit} disabled={props.busy} className={account.submit} />
      </Box>
      <Box className={cn("mt-3 flex flex-col", account.switchStack)}>
        {props.mode === "login" ? (
          <>
            <Pressable label={sw.forgot} onPress={() => props.onSwitch("forgot")}>
              <Text className={account.switchText}>{sw.forgot}</Text>
            </Pressable>
            <Pressable label={sw.create} onPress={() => props.onSwitch("signup")}>
              <Text className={account.switchText}>
                {sw.newHere} <Text className={account.switchLink}>{sw.create}</Text>
              </Text>
            </Pressable>
          </>
        ) : null}
        {props.mode === "signup" ? (
          <Pressable label={sw.signIn} onPress={() => props.onSwitch("login")}>
            <Text className={account.switchText}>
              {sw.already} <Text className={account.switchLink}>{sw.signIn}</Text>
            </Text>
          </Pressable>
        ) : null}
        {props.mode === "forgot" ? (
          <Pressable label={sw.back} onPress={() => props.onSwitch("login")}>
            <Text className={account.switchText}>{sw.back}</Text>
          </Pressable>
        ) : null}
      </Box>
      {props.showLegal ? (
        <Text className={cn("mt-3", account.legal)}>{props.legalAgree}</Text>
      ) : null}
      {props.showLegal ? (
        <Box className="mt-1 flex flex-row justify-center gap-3">
          <Pressable label={props.privacyLabel} onPress={props.onPrivacy}>
            <Text className={account.legalLink}>{props.privacyLabel}</Text>
          </Pressable>
          <Pressable label={props.termsLabel} onPress={props.onTerms}>
            <Text className={account.legalLink}>{props.termsLabel}</Text>
          </Pressable>
        </Box>
      ) : null}
    </Sheet>
  );
}
