//! pydantic's `EmailStr`: `email-validator` 2.3 syntax rules with
//! `check_deliverability=False`, and the normalized address it returns.
//!
//! The ASCII rules, messages and order follow `email_validator/syntax.py`.
//! Internationalized local parts are accepted as SMTPUTF8 (as Python does);
//! a non-ASCII domain is lower-cased but not IDNA-checked (Python runs the full
//! UTS-46 mapping there; such sign-ups are rare and the check is only syntax).

/// The longest input pydantic hands to `email-validator`.
const MAX_EMAIL_LENGTH: usize = 2048;
const EMAIL_MAX_LENGTH: usize = 254;
const DNS_LABEL_LENGTH_LIMIT: usize = 63;
const DOMAIN_MAX_LENGTH: usize = 253;
const SPECIAL_USE_DOMAIN_NAMES: [&str; 6] =
    ["arpa", "invalid", "local", "localhost", "onion", "test"];
const CASE_INSENSITIVE_MAILBOX_NAMES: [&str; 15] = [
    "info",
    "marketing",
    "sales",
    "support",
    "abuse",
    "noc",
    "security",
    "postmaster",
    "hostmaster",
    "usenet",
    "news",
    "webmaster",
    "www",
    "uucp",
    "ftp",
];

/// Whether a plain space is allowed (inside quotes).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Space {
    Allowed,
    Unsafe,
}

/// Which side of the `@` a dot-atom check is for.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Part {
    Local,
    Domain,
}

/// Whether the local part came in quotes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Quoting {
    Quoted,
    Bare,
}

fn is_atext(c: char) -> bool {
    c.is_ascii_alphanumeric() || "_!#$%&'*+-/=?^`{|}~".contains(c)
}

fn is_atext_intl(c: char) -> bool {
    is_atext(c) || u32::from(c) >= 0x80
}

/// `DOT_ATOM_TEXT` / `DOT_ATOM_TEXT_INTL`: atoms joined by single dots.
fn dot_atom(s: &str, atom: fn(char) -> bool) -> bool {
    !s.is_empty()
        && s.split('.')
            .all(|part| !part.is_empty() && part.chars().all(atom))
}

fn hostname_label(label: &str) -> bool {
    let b = label.as_bytes();
    !b.is_empty()
        && b[0].is_ascii_alphanumeric()
        && b[b.len() - 1].is_ascii_alphanumeric()
        && b.iter().all(|c| c.is_ascii_alphanumeric() || *c == b'-')
}

/// `DOT_ATOM_TEXT_HOSTNAME`.
fn dot_atom_hostname(s: &str) -> bool {
    s.split('.').all(hostname_label)
}

/// `safe_character_display`, for the characters this port can name.
fn display(c: char) -> String {
    if c == '\\' {
        return "\"\\\"".to_owned();
    }
    if c == ' ' {
        return "SPACE".to_owned();
    }
    if c.is_alphanumeric() || c.is_ascii_punctuation() {
        return if c == '\'' {
            "\"'\"".to_owned()
        } else {
            format!("'{c}'")
        };
    }
    let code = u32::from(c);
    if code < 0xFFFF {
        format!("U+{code:04X}")
    } else {
        format!("U+{code:08X}")
    }
}

fn bad_chars(s: &str, ok: impl Fn(char) -> bool) -> Option<String> {
    let mut shown: Vec<String> = s.chars().filter(|c| !ok(*c)).map(display).collect();
    if shown.is_empty() {
        return None;
    }
    shown.sort();
    shown.dedup();
    Some(shown.join(", "))
}

fn length_reason(len: usize, limit: usize) -> String {
    let diff = len - limit;
    let suffix = if diff > 1 { "s" } else { "" };
    format!("({diff} character{suffix} too many)")
}

/// `check_unsafe_chars`: controls, separators and a leading combining mark.
fn check_unsafe(s: &str, space: Space) -> Result<(), String> {
    let allow_space = space == Space::Allowed;
    let mut bad: Vec<char> = Vec::new();
    for (i, c) in s.chars().enumerate() {
        let unsafe_char = if c.is_control() || matches!(c, '\u{2028}' | '\u{2029}') {
            true
        } else if c.is_whitespace() {
            !allow_space
        } else {
            i == 0 && is_combining_mark(c)
        };
        if unsafe_char {
            bad.push(c);
        }
    }
    if bad.is_empty() {
        return Ok(());
    }
    bad.sort_unstable();
    bad.dedup();
    let shown: Vec<String> = bad.into_iter().map(display).collect();
    Err(format!(
        "The email address contains unsafe characters: {}.",
        shown.join(", ")
    ))
}

fn is_combining_mark(c: char) -> bool {
    matches!(u32::from(c), 0x0300..=0x036F | 0x1AB0..=0x1AFF | 0x1DC0..=0x1DFF | 0x20D0..=0x20FF | 0xFE20..=0xFE2F)
        || matches!(u32::from(c), 0x0900..=0x0903 | 0x093A..=0x094F | 0x0951..=0x0957 | 0x0962..=0x0963)
}

fn check_dot_atom(label: &str, start: &str, end: &str, part: Part) -> Result<(), String> {
    let hostname = part == Part::Domain;
    if label.ends_with('.') {
        return Err(end.replace("{}", "period"));
    }
    if label.starts_with('.') {
        return Err(start.replace("{}", "period"));
    }
    if label.contains("..") {
        return Err("An email address cannot have two periods in a row.".to_owned());
    }
    if hostname {
        if label.ends_with('-') {
            return Err(end.replace("{}", "hyphen"));
        }
        if label.starts_with('-') {
            return Err(start.replace("{}", "hyphen"));
        }
        if label.contains(".-") || label.contains("-.") {
            return Err(
                "An email address cannot have a period and a hyphen next to each other.".to_owned(),
            );
        }
    }
    Ok(())
}

/// `split_email`, without display names (pydantic strips the `Name <addr>` form first).
fn split(email: &str) -> Result<(String, String, bool), String> {
    let mut inside_quote = false;
    let mut escaped = false;
    let mut at = None;
    for (i, c) in email.char_indices() {
        if inside_quote {
            if c == '\\' && !escaped {
                escaped = true;
            } else if c == '"' && !escaped {
                inside_quote = false;
                escaped = false;
            } else {
                escaped = false;
            }
        } else if c == '"' {
            inside_quote = true;
        } else if c == '@' || c == '<' {
            at = Some(i);
            break;
        }
    }
    let Some(at) = at else {
        if email.contains('＠') {
            return Err("The email address has the \"full-width\" at-sign (@) character instead of a regular at-sign.".to_owned());
        }
        if email.contains('﹫') {
            return Err("The email address has the \"small commercial at\" character instead of a regular at-sign.".to_owned());
        }
        return Err("An email address must have an @-sign.".to_owned());
    };
    let (left, right) = email.split_at(at);
    if right.starts_with('<') {
        return Err(
            "A display name and angle brackets around the email address are not permitted here."
                .to_owned(),
        );
    }
    let domain = right[1..].to_owned();
    // unquote_quoted_string
    let mut quoted = false;
    let mut escaped = false;
    let mut value = String::new();
    let chars: Vec<char> = left.chars().collect();
    for (i, &c) in chars.iter().enumerate() {
        if quoted {
            if escaped {
                value.push(c);
                escaped = false;
            } else if c == '\\' {
                escaped = true;
            } else if c == '"' {
                if i != chars.len() - 1 {
                    let rest: Vec<String> = chars[i + 1..].iter().map(|c| display(*c)).collect();
                    return Err(format!(
                        "Extra character(s) found after close quote: {}",
                        rest.join(", ")
                    ));
                }
                break;
            } else {
                value.push(c);
            }
        } else if i == 0 && c == '"' {
            quoted = true;
        } else {
            value.push(c);
        }
    }
    Ok((value, domain, quoted))
}

fn validate_local(local: &str, quoting: Quoting) -> Result<String, String> {
    let quoted = quoting == Quoting::Quoted;
    if local.is_empty() {
        return Err("There must be something before the @-sign.".to_owned());
    }
    if dot_atom(local, is_atext) {
        return Ok(local.to_owned());
    }
    if dot_atom(local, is_atext_intl) {
        check_unsafe(local, Space::Unsafe)?;
        return Ok(local.to_owned());
    }
    if quoted {
        if let Some(bad) = bad_chars(local, |c| u32::from(c) >= 0x20 && u32::from(c) != 0x7F) {
            return Err(format!(
                "The email address contains invalid characters in quotes before the @-sign: {bad}."
            ));
        }
        check_unsafe(local, Space::Allowed)?;
        let escaped: String = local
            .chars()
            .flat_map(|c| {
                if c == '"' || c == '\\' {
                    vec!['\\', c]
                } else {
                    vec![c]
                }
            })
            .collect();
        return Ok(format!("\"{escaped}\""));
    }
    if let Some(bad) = bad_chars(local, |c| c == '.' || is_atext_intl(c)) {
        return Err(format!(
            "The email address contains invalid characters before the @-sign: {bad}."
        ));
    }
    check_dot_atom(
        local,
        "An email address cannot start with a {}.",
        "An email address cannot have a {} immediately before the @-sign.",
        Part::Local,
    )?;
    Err("The email address contains invalid characters before the @-sign.".to_owned())
}

fn hostname_char(c: char) -> bool {
    c.is_ascii_alphanumeric() || c == '-' || c == '.' || u32::from(c) >= 0x80
}

fn validate_domain(domain: &str) -> Result<String, String> {
    if let Some(bad) = bad_chars(domain, hostname_char) {
        return Err(format!(
            "The part after the @-sign contains invalid characters: {bad}."
        ));
    }
    check_unsafe(domain, Space::Unsafe)?;
    // uts46_remap lower-cases.
    let domain = domain.to_lowercase();
    check_dot_atom(
        &domain,
        "An email address cannot have a {} immediately after the @-sign.",
        "An email address cannot end with a {}.",
        Part::Domain,
    )?;
    for label in domain.split('.') {
        let b = label.as_bytes();
        if b.len() >= 4 && &b[2..4] == b"--" && !label.starts_with("xn") {
            return Err("An email address cannot have two letters followed by two dashes immediately after the @-sign or after a period, except Punycode.".to_owned());
        }
    }
    let ascii = domain.is_ascii();
    if ascii && !dot_atom_hostname(&domain) {
        return Err(
            "The email address contains invalid characters after the @-sign after IDNA encoding."
                .to_owned(),
        );
    }
    if domain.len() > DOMAIN_MAX_LENGTH && ascii {
        return Err(format!(
            "The email address is too long after the @-sign {}.",
            length_reason(domain.len(), DOMAIN_MAX_LENGTH)
        ));
    }
    for label in domain.split('.') {
        if label.len() > DNS_LABEL_LENGTH_LIMIT {
            return Err(format!(
                "After the @-sign, periods cannot be separated by so many characters {}.",
                length_reason(label.chars().count(), DNS_LABEL_LENGTH_LIMIT)
            ));
        }
    }
    if !domain.contains('.') {
        return Err("The part after the @-sign is not valid. It should have a period.".to_owned());
    }
    if !domain.chars().last().is_some_and(char::is_alphabetic) {
        return Err(
            "The part after the @-sign is not valid. It is not within a valid top-level domain."
                .to_owned(),
        );
    }
    for d in SPECIAL_USE_DOMAIN_NAMES {
        if domain == d || domain.ends_with(&format!(".{d}")) {
            return Err("The part after the @-sign is a special-use or reserved name that cannot be used with email.".to_owned());
        }
    }
    Ok(domain)
}

/// pydantic's `pretty_email_regex`: `Name <addr>` hands on just `addr`.
fn strip_pretty(value: &str) -> &str {
    let t = value.trim();
    if let Some(body) = t.strip_suffix('>')
        && let Some(open) = body.find('<')
    {
        let name = body[..open].trim();
        let name_ok = name.is_empty()
            || (name.starts_with('"') && name.ends_with('"') && name.len() >= 2)
            || name
                .split_whitespace()
                .all(|w| w.chars().all(|c| c.is_alphanumeric() || is_atext(c)));
        if name_ok && !body[open + 1..].is_empty() {
            return &body[open + 1..];
        }
    }
    value
}

/// Validates `value` as pydantic's `EmailStr` does; the normalized address, or the reason.
///
/// # Errors
///
/// The `reason` pydantic puts in `value is not a valid email address: {reason}`.
pub fn validate(value: &str) -> Result<String, String> {
    if value.chars().count() > MAX_EMAIL_LENGTH {
        return Err(format!(
            "Length must not exceed {MAX_EMAIL_LENGTH} characters"
        ));
    }
    let email = strip_pretty(value).trim();
    let (local, domain, quoted) = split(email)?;
    let mut local_out = validate_local(
        &local,
        if quoted {
            Quoting::Quoted
        } else {
            Quoting::Bare
        },
    )?;
    if quoted {
        return Err("Quoting the part before the @-sign is not allowed here.".to_owned());
    }
    if CASE_INSENSITIVE_MAILBOX_NAMES.contains(&local_out.to_lowercase().as_str()) {
        local_out = local_out.to_lowercase();
    }
    if domain.is_empty() {
        return Err("There must be something after the @-sign.".to_owned());
    }
    if domain.starts_with('[') && domain.ends_with(']') {
        return Err("A bracketed IP address after the @-sign is not allowed here.".to_owned());
    }
    let domain_out = validate_domain(&domain)?;
    let normalized = format!("{local_out}@{domain_out}");
    let original_len = local.len() + 1 + domain.len();
    for (len, after) in [
        (original_len, None),
        (normalized.len(), Some("after normalization")),
    ] {
        if len > EMAIL_MAX_LENGTH {
            let diff = len - EMAIL_MAX_LENGTH;
            let suffix = if diff > 1 { "s" } else { "" };
            return Err(match after {
                None => format!(
                    "The email address is too long {}.",
                    length_reason(len, EMAIL_MAX_LENGTH)
                ),
                Some(why) => {
                    format!("The email address is too long {why} ({diff} byte{suffix} too many).")
                }
            });
        }
    }
    Ok(normalized)
}

#[cfg(test)]
mod tests {
    use super::validate;

    #[test]
    fn messages_match_email_validator() {
        let cases = [
            ("x", "An email address must have an @-sign."),
            (
                "a@b",
                "The part after the @-sign is not valid. It should have a period.",
            ),
            (
                "a@b.test",
                "The part after the @-sign is a special-use or reserved name that cannot be used with email.",
            ),
            ("@b.com", "There must be something before the @-sign."),
            ("a@", "There must be something after the @-sign."),
            (
                "a b@c.com",
                "The email address contains invalid characters before the @-sign: SPACE.",
            ),
            (
                "a..b@c.com",
                "An email address cannot have two periods in a row.",
            ),
            (
                "a@-b.com",
                "An email address cannot have a hyphen immediately after the @-sign.",
            ),
            (
                "a@b.123",
                "The part after the @-sign is not valid. It is not within a valid top-level domain.",
            ),
            (
                "\"a\"@b.com",
                "Quoting the part before the @-sign is not allowed here.",
            ),
        ];
        for (input, reason) in cases {
            assert_eq!(validate(input), Err(reason.to_owned()), "{input}");
        }
        assert_eq!(
            validate("Foo.Bar@EXAMPLE.Com").as_deref(),
            Ok("Foo.Bar@example.com")
        );
        assert_eq!(validate("a@b.c0m").as_deref(), Ok("a@b.c0m"));
        assert_eq!(validate("Info@x.org").as_deref(), Ok("info@x.org"));
    }
}
