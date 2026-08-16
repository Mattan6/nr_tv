// The editorial layer of מן הפרשה: which verse, and which words of it.
//
// Deliberately contains no Hebrew scripture in any data field. Every vocalized string in the
// generated table is fetched from Sefaria by buildParashaHighlights.mjs, because vocalized
// Hebrew typed from memory will contain errors and this text goes on a synagogue wall. (A few
// range-choice comments below quote a fragment to explain a decision — that's editorial
// annotation, not a data field, and every quoted word is checkable against the generated file.)
//
// `words` is a 1-based inclusive range over the verse's tokens after cantillation is stripped.
// Ranges must be contiguous — a fragment that needs to skip a word in the middle cannot be
// expressed, so pick fragments that do not need to. Aim for three to eight tokens: the card
// renders at 29px over about 640px of width and wraps to two lines beyond that.
//
// `haftara` is the ספרד / עדות המזרח custom, matching the nusach printed in the masthead. It
// differs from the Ashkenazi haftara for roughly a dozen parashiyot. This is a table, not a
// computation, so no test can establish it is right — it is the one thing here the gabbai
// must proofread.
export const CURATION = [
  {
    parasha: 'בראשית',
    haftara: { ref: 'Isaiah 42:5', words: [1, 3] },
    pesukim: [
      { ref: 'Genesis 1:1', words: [1, 7] },
      { ref: 'Genesis 1:27', words: [1, 6] },
      { ref: 'Genesis 2:3', words: [1, 6] },
    ],
  },
  { parasha: 'נח', haftara: { ref: 'Isaiah 54:1', words: [1, 4] }, pesukim: [
    // Skips the opening "אֵלֶּה תּוֹלְדֹת נֹחַ" (these are the generations of Noah) and starts
    // at the second נֹחַ, which reads as its own complete sentence.
    { ref: 'Genesis 6:9', words: [4, 9] },
    // "אֶת קַשְׁתִּי נָתַתִּי בֶּעָנָן" (My bow I have set in the cloud). Sefaria prints
    // אֶת־קַשְׁתִּי maqaf-joined as one token, so this fragment is tokens 1–3, not 1–4.
    { ref: 'Genesis 9:13', words: [1, 3] },
    // Drops the opening "עֹד כׇּל־יְמֵי הָאָרֶץ" and the first pair "זֶרַע וְקָצִיר" to stay
    // under eight tokens while keeping the verb, so the fragment is a complete sentence
    // rather than a bare list.
    { ref: 'Genesis 8:22', words: [6, 13] },
  ] },
  { parasha: 'לך לך', haftara: { ref: 'Isaiah 40:27', words: [1, 5] }, pesukim: [
    { ref: 'Genesis 12:1', words: [4, 11] },
    { ref: 'Genesis 12:2', words: [1, 8] },
    { ref: 'Genesis 15:6', words: [1, 5] },
  ] },
  { parasha: 'וירא', haftara: { ref: 'II Kings 4:1', words: [1, 5] }, pesukim: [
    { ref: 'Genesis 18:1', words: [1, 5] },
    { ref: 'Genesis 18:19', words: [9, 14] },
    { ref: 'Genesis 22:12', words: [2, 7] },
  ] },
  { parasha: 'חיי שרה', haftara: { ref: 'I Kings 1:1', words: [1, 5] }, pesukim: [
    { ref: 'Genesis 24:1', words: [1, 8] },
    // Genesis 24:67 carries a trailing {פ} (open-paragraph) marker as its final token — the
    // range stops well short of it.
    { ref: 'Genesis 24:67', words: [6, 10] },
    { ref: 'Genesis 25:8', words: [2, 9] },
  ] },
  { parasha: 'תולדות', haftara: { ref: 'Malachi 1:1', words: [1, 5] }, pesukim: [
    { ref: 'Genesis 26:12', words: [5, 11] },
    { ref: 'Genesis 26:24', words: [7, 13] },
    { ref: 'Genesis 27:28', words: [1, 8] },
  ] },
  { parasha: 'ויצא', haftara: { ref: 'Hosea 11:7', words: [1, 3] }, pesukim: [
    { ref: 'Genesis 28:12', words: [2, 8] },
    { ref: 'Genesis 28:15', words: [1, 6] },
    { ref: 'Genesis 28:16', words: [4, 9] },
  ] },
  { parasha: 'וישלח', haftara: { ref: 'Obadiah 1:1', words: [1, 5] }, pesukim: [
    { ref: 'Genesis 32:11', words: [1, 4] },
    { ref: 'Genesis 32:29', words: [1, 8] },
    // Genesis 33:4's "וַׄיִּׄשָּׁׄקֵׄהׄוּׄ" (token 7) carries the Masoretic extraordinary
    // points over every letter — a textual-doubt marker, not cantillation, so DROP does not
    // remove it. The range stops one word short of it rather than posting dotted text on the
    // wall.
    { ref: 'Genesis 33:4', words: [1, 6] },
  ] },
  { parasha: 'וישב', haftara: { ref: 'Amos 2:6', words: [1, 3] }, pesukim: [
    { ref: 'Genesis 37:3', words: [8, 11] },
    { ref: 'Genesis 39:2', words: [1, 6] },
    { ref: 'Genesis 39:21', words: [1, 6] },
  ] },
  { parasha: 'מקץ', haftara: { ref: 'I Kings 3:15', words: [1, 4] }, pesukim: [
    { ref: 'Genesis 41:16', words: [5, 9] },
    { ref: 'Genesis 41:39', words: [9, 11] },
    { ref: 'Genesis 41:40', words: [1, 6] },
  ] },
  { parasha: 'ויגש', haftara: { ref: 'Ezekiel 37:15', words: [1, 4] }, pesukim: [
    { ref: 'Genesis 45:3', words: [4, 8] },
    { ref: 'Genesis 45:5', words: [1, 7] },
    { ref: 'Genesis 46:4', words: [1, 7] },
  ] },
  { parasha: 'ויחי', haftara: { ref: 'I Kings 2:1', words: [1, 7] }, pesukim: [
    { ref: 'Genesis 48:16', words: [1, 6] },
    { ref: 'Genesis 49:10', words: [1, 6] },
    { ref: 'Genesis 50:20', words: [1, 7] },
  ] },
];

// Combined parashiyot are read as one unit, so they are keyed in their own right. Their
// pesukim are composed rather than re-curated — two from the first parasha, one from the
// second — but the haftara is its own, because a combined reading does not simply inherit
// either half's.
export const COMBINED = [
  { pair: ['ויקהל', 'פקודי'], haftara: { ref: 'I Kings 7:40', words: [1, 3] } },
  { pair: ['תזריע', 'מצורע'], haftara: { ref: 'II Kings 7:3', words: [1, 3] } },
  { pair: ['אחרי מות', 'קדושים'], haftara: { ref: 'Ezekiel 20:2', words: [1, 3] } },
  { pair: ['בהר', 'בחוקותי'], haftara: { ref: 'Jeremiah 16:19', words: [1, 3] } },
  { pair: ['חוקת', 'בלק'], haftara: { ref: 'Micah 5:6', words: [1, 3] } },
  { pair: ['מטות', 'מסעי'], haftara: { ref: 'Jeremiah 2:4', words: [1, 3] } },
  { pair: ['נצבים', 'וילך'], haftara: { ref: 'Isaiah 61:10', words: [1, 3] } },
];

// Shown when Hebcal reports no parashat item — שבת חול המועד, שבת ראש השנה and the other
// Shabbatot whose reading is the festival's — and when a key is not in the table at all.
// No haftara line: the generic entry cannot name one.
export const FALLBACK_CURATION = {
  pesukim: [
    { ref: 'Exodus 31:16', words: [1, 8] },
    { ref: 'Exodus 20:8', words: [1, 4] },
    { ref: 'Isaiah 58:13', words: [8, 10] },
  ],
};
