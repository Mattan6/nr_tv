// The three row names that carry the weight of the whole שבת board — the moment Shabbat is
// accepted and the moment it is released. PrayerListCard.jsx uses this to decide which rows
// render in heavy navy; client/test/screenSegment.test.js imports the exact same value to
// prove that decision still lines up with SHABBAT_PRAYERS in displayData.js.
//
// Pulled into its own plain module rather than left inline in PrayerListCard.jsx (where it
// used to live) because that file is JSX, and Node's test runner has no loader for `.jsx` —
// `node --test` fails outright on an ERR_UNKNOWN_FILE_EXTENSION before a single assertion
// runs. A test importing a hand-copied second regex would be exactly the drift this constant
// is meant to catch, so the constant moved to where both sides can import the one copy
// instead.
//
// The `הדלקת נרות` alternative can never match in practice: ShabbatDisplay filters that row out
// of `rows` before either PrayerListCard mounts (it has its own card above). Kept anyway
// because this component is generic — it does not know that its caller pre-filters — and
// dropping it would silently stop protecting a future caller that doesn't.
export const EMPHASIS = /הדלקת נרות|קבלת שבת|ערבית מוצ״ש/;
