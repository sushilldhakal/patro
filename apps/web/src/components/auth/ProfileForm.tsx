import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CityAutocomplete } from "@/components/auth/CityAutocomplete";
import type { Profile, ProfileInput } from "@/lib/auth/client";
import { useProfileForm } from "@vedic-patro/features/account";
import { accountClasses } from "@vedic-patro/design-tokens/classes/account-classes";
import { cn } from "@vedic-patro/domain/utils";

export { EMPTY_PROFILE, profileToInput } from "@vedic-patro/features/account";

const labelClass = accountClasses.label;
const fieldWrap = cn("flex flex-col", accountClasses.field);
const selectClass = cn(accountClasses.select, "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50");

export function ProfileForm({
  initial,
  existing,
  onCancel,
  onSaved,
}: {
  initial: ProfileInput;
  existing?: Profile;
  onCancel: () => void;
  onSaved: (saved: Profile) => void;
}) {
  const f = useProfileForm({ initial, existing, onSaved });
  const { form, copy } = f;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void f.submit();
      }}
      className={cn("flex flex-col", accountClasses.profileForm)}
    >
      <div className={cn("grid sm:grid-cols-2", accountClasses.fieldRow)}>
        <div className={fieldWrap}>
          <label className={labelClass}>{copy.fullName}</label>
          <Input value={form.full_name} onChange={(e) => f.setName(e.target.value)} required />
        </div>
        <div className={fieldWrap}>
          <label className={labelClass}>{copy.phone}</label>
          <Input value={form.phone ?? ""} onChange={(e) => f.setPhone(e.target.value)} placeholder={copy.phonePlaceholder} />
        </div>
        <div className={fieldWrap}>
          <label className={labelClass}>{copy.email}</label>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            value={form.email ?? ""}
            onChange={(e) => f.setEmail(e.target.value)}
          />
        </div>
        <div className={fieldWrap}>
          <label className={labelClass}>{copy.gender}</label>
          <select value={form.gender ?? ""} onChange={(e) => f.setGender(e.target.value)} className={selectClass}>
            <option value="">—</option>
            {f.genders.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={fieldWrap}>
        <label className={labelClass}>{copy.birthPlace}</label>
        <CityAutocomplete value={f.placeValue} onSelect={f.selectPlace} />
        {f.placeHint && <p className={accountClasses.hint}>{f.placeHint}</p>}
      </div>

      <div className={cn("grid sm:grid-cols-3", accountClasses.fieldRow)}>
        <div className={fieldWrap}>
          <label className={labelClass}>{copy.birthDate}</label>
          <Input
            value={form.birth_date ?? ""}
            onChange={(e) => f.setBirthDate(e.target.value)}
            placeholder={copy.birthDatePlaceholder}
            inputMode="numeric"
            maxLength={10}
          />
        </div>
        <div className={fieldWrap}>
          <label className={labelClass}>{copy.birthTime}</label>
          <Input
            value={form.birth_time ?? ""}
            onChange={(e) => f.setBirthTime(e.target.value)}
            placeholder={copy.birthTimePlaceholder}
            inputMode="numeric"
            maxLength={5}
          />
        </div>
        <div className={fieldWrap}>
          <label className={labelClass}>{copy.calendar}</label>
          <select value={form.birth_era ?? "bs"} onChange={(e) => f.setEra(e.target.value)} className={selectClass}>
            {f.eras.map((era) => (
              <option key={era.value} value={era.value}>
                {era.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className={cn("flex", accountClasses.checkRow, accountClasses.checkText)}>
        <input
          type="checkbox"
          checked={!!form.is_default}
          onChange={(e) => f.setDefault(e.target.checked)}
          className="size-4 accent-[var(--secondary)]"
        />
        {copy.setDefault}
      </label>

      {f.error && <p className={accountClasses.formError}>{f.error}</p>}

      <div className={cn("flex", accountClasses.formActions)}>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={f.busy}>
          {copy.cancel}
        </Button>
        <Button type="submit" disabled={f.busy}>
          {copy.submit}
        </Button>
      </div>
    </form>
  );
}
