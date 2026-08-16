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
    // Widened from [1, 8] to [1, 9]: cutting at 8 stopped after וְרֹב דָּגָן and severed the
    // fixed pair דָּגָן וְתִירֹשׁ. The pair now stays whole even though it runs one token past
    // the eight-token aim.
    { ref: 'Genesis 27:28', words: [1, 9] },
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
  // Amos 2:6's haftara name was words [1, 3] — "כֹּה אָמַר יְהֹוָה", a generic prophetic
  // formula that names no haftara at all. Shifted to [4, 11], which drops the formula and
  // picks up "עַל־מִכְרָם בַּכֶּסֶף" (sold for silver) — the phrase that actually explains why
  // this is וישב's haftara, echoing Joseph's sale for silver.
  { parasha: 'וישב', haftara: { ref: 'Amos 2:6', words: [4, 11] }, pesukim: [
    { ref: 'Genesis 37:3', words: [8, 11] },
    { ref: 'Genesis 39:2', words: [1, 6] },
    // Genesis 39:2 and 39:21 both open וַיְהִי ה׳ אֶת־יוֹסֵף — with the old [1, 6] range for
    // both, two of this parasha's three cards read as near-duplicates. Re-ranged to [4, 11] so
    // this one leads with its own words, "וַיֵּט אֵלָיו חָסֶד" (and He extended kindness to
    // him) onward.
    { ref: 'Genesis 39:21', words: [4, 11] },
  ] },
  { parasha: 'מקץ', haftara: { ref: 'I Kings 3:15', words: [1, 4] }, pesukim: [
    { ref: 'Genesis 41:16', words: [5, 9] },
    { ref: 'Genesis 41:39', words: [9, 11] },
    { ref: 'Genesis 41:40', words: [1, 6] },
  ] },
  // Ezekiel 37:15 is entirely "וַיְהִי דְבַר־יְהֹוָה אֵלַי לֵאמֹר" (4 tokens, all of it) — the
  // generic formula, with no identifying words anywhere in the verse to shift toward. Moved to
  // the next verse, 37:16, which opens the two-sticks prophecy itself: "קַח־לְךָ עֵץ אֶחָד
  // וּכְתֹב עָלָיו לִיהוּדָה" (take one stick and write on it, "for Judah") — the phrase that
  // actually names this haftara and echoes ויגש's Judah-and-Joseph reunion.
  { parasha: 'ויגש', haftara: { ref: 'Ezekiel 37:16', words: [1, 8] }, pesukim: [
    { ref: 'Genesis 45:3', words: [4, 8] },
    { ref: 'Genesis 45:5', words: [1, 7] },
    { ref: 'Genesis 46:4', words: [1, 7] },
  ] },
  { parasha: 'ויחי', haftara: { ref: 'I Kings 2:1', words: [1, 7] }, pesukim: [
    { ref: 'Genesis 48:16', words: [1, 6] },
    { ref: 'Genesis 49:10', words: [1, 6] },
    { ref: 'Genesis 50:20', words: [1, 7] },
  ] },

  // Exodus.
  { parasha: 'שמות', haftara: { ref: 'Jeremiah 1:1', words: [1, 8] }, pesukim: [
    { ref: 'Exodus 1:12', words: [4, 7] },
    { ref: 'Exodus 3:5', words: [4, 6] },
    { ref: 'Exodus 3:14', words: [4, 6] },
  ] },
  // Ezekiel 28:25 opens "כֹּה־אָמַר אֲדֹנָי יֱהֹוִה", the messenger formula; shifted past it to
  // "וְנִקְדַּשְׁתִּי בָם לְעֵינֵי הַגּוֹיִם" (I will be sanctified through them before the
  // nations), which echoes וארא's refrain "וְיָדְעוּ מִצְרַיִם כִּי־אֲנִי יְהֹוָה".
  { parasha: 'וארא', haftara: { ref: 'Ezekiel 28:25', words: [11, 14] }, pesukim: [
    { ref: 'Exodus 6:6', words: [6, 10] },
    { ref: 'Exodus 6:7', words: [1, 7] },
    { ref: 'Exodus 6:8', words: [1, 3] },
  ] },
  // Jeremiah 46:13 opens by naming יִרְמְיָהוּ הַנָּבִיא directly, not the bare formula, so the
  // range just stops short of the dangling infinitive "לָבוֹא" that opens the next clause.
  { parasha: 'בא', haftara: { ref: 'Jeremiah 46:13', words: [1, 6] }, pesukim: [
    { ref: 'Exodus 12:2', words: [1, 5] },
    { ref: 'Exodus 12:42', words: [1, 7] },
    { ref: 'Exodus 13:8', words: [6, 12] },
  ] },
  { parasha: 'בשלח', haftara: { ref: 'Judges 5:1', words: [1, 7] }, pesukim: [
    { ref: 'Exodus 14:14', words: [1, 5] },
    { ref: 'Exodus 15:2', words: [1, 5] },
    { ref: 'Exodus 15:11', words: [1, 7] },
  ] },
  { parasha: 'יתרו', haftara: { ref: 'Isaiah 6:1', words: [1, 9] }, pesukim: [
    { ref: 'Exodus 19:6', words: [1, 6] },
    // The Ten Commandments' opening line, kept whole rather than trimmed to the aim.
    { ref: 'Exodus 20:2', words: [1, 9] },
    { ref: 'Exodus 20:8', words: [1, 4] },
  ] },
  // Jeremiah 34:8 names both יִרְמְיָהוּ and צִדְקִיָּהוּ, and only completes its thought —
  // "to proclaim liberty to them" — at the verse's end, which is also the phrase that connects
  // this haftara to משפטים's law of the freed Hebrew servant. Kept long to reach it.
  { parasha: 'משפטים', haftara: { ref: 'Jeremiah 34:8', words: [6, 16] }, pesukim: [
    { ref: 'Exodus 23:20', words: [1, 6] },
    { ref: 'Exodus 23:25', words: [1, 7] },
    { ref: 'Exodus 24:7', words: [7, 12] },
  ] },
  { parasha: 'תרומה', haftara: { ref: 'I Kings 5:26', words: [1, 6] }, pesukim: [
    { ref: 'Exodus 25:2', words: [1, 5] },
    { ref: 'Exodus 25:8', words: [1, 5] },
    { ref: 'Exodus 25:22', words: [1, 7] },
  ] },
  { parasha: 'תצוה', haftara: { ref: 'Ezekiel 43:10', words: [1, 5] }, pesukim: [
    // Kept to [1, 9] rather than trimmed, so the fragment includes תְּצַוֶּה — the word the
    // parasha is named for.
    { ref: 'Exodus 27:20', words: [1, 9] },
    { ref: 'Exodus 28:2', words: [1, 6] },
    { ref: 'Exodus 29:45', words: [1, 7] },
  ] },
  { parasha: 'כי תשא', haftara: { ref: 'I Kings 18:20', words: [1, 8] }, pesukim: [
    // Same ref and range as FALLBACK_CURATION's first pasuk — the brief calls this out as a
    // deliberate repeat, not a copy-paste slip.
    { ref: 'Exodus 31:16', words: [1, 8] },
    { ref: 'Exodus 33:14', words: [1, 5] },
    // The Thirteen Attributes (י״ג מידות) — kept whole as the fixed liturgical unit it is,
    // rather than trimmed to the aim.
    { ref: 'Exodus 34:6', words: [5, 13] },
  ] },
  { parasha: 'ויקהל', haftara: { ref: 'I Kings 7:40', words: [1, 3] }, pesukim: [
    { ref: 'Exodus 35:2', words: [1, 9] },
    { ref: 'Exodus 35:21', words: [1, 4] },
    { ref: 'Exodus 36:5', words: [4, 8] },
  ] },
  { parasha: 'פקודי', haftara: { ref: 'I Kings 7:51', words: [1, 8] }, pesukim: [
    { ref: 'Exodus 39:43', words: [1, 6] },
    { ref: 'Exodus 40:34', words: [1, 8] },
    { ref: 'Exodus 40:38', words: [1, 8] },
  ] },

  // Leviticus.
  { parasha: 'ויקרא', haftara: { ref: 'Isaiah 43:21', words: [1, 5] }, pesukim: [
    { ref: 'Leviticus 1:2', words: [6, 10] },
    { ref: 'Leviticus 1:9', words: [5, 12] },
    { ref: 'Leviticus 2:13', words: [1, 7] },
  ] },
  { parasha: 'צו', haftara: { ref: 'Jeremiah 7:21', words: [7, 11] }, pesukim: [
    { ref: 'Leviticus 6:6', words: [1, 6] },
    { ref: 'Leviticus 7:12', words: [1, 3] },
    { ref: 'Leviticus 8:35', words: [1, 8] },
  ] },
  // "בִּקְרֹבַי אֶקָּדֵשׁ" — through those near to Me I will be sanctified — is the verse's own
  // point; the range starts there rather than at the scene-setting "וַיֹּאמֶר מֹשֶׁה...".
  { parasha: 'שמיני', haftara: { ref: 'II Samuel 6:1', words: [1, 7] }, pesukim: [
    { ref: 'Leviticus 9:23', words: [9, 11] },
    { ref: 'Leviticus 10:3', words: [8, 12] },
    { ref: 'Leviticus 11:44', words: [1, 10] },
  ] },
  { parasha: 'תזריע', haftara: { ref: 'II Kings 4:42', words: [1, 9] }, pesukim: [
    // Contains תַזְרִיעַ, the word the parasha is named for.
    { ref: 'Leviticus 12:2', words: [5, 9] },
    { ref: 'Leviticus 12:3', words: [1, 5] },
    { ref: 'Leviticus 13:59', words: [1, 7] },
  ] },
  { parasha: 'מצורע', haftara: { ref: 'II Kings 7:3', words: [1, 4] }, pesukim: [
    // Opens naming הַמְּצֹרָע — the word the parasha is named for.
    { ref: 'Leviticus 14:2', words: [1, 8] },
    { ref: 'Leviticus 14:11', words: [1, 6] },
    { ref: 'Leviticus 15:31', words: [1, 8] },
  ] },
  // Ezekiel 22:1 is entirely "וַיְהִי דְבַר־יְהֹוָה אֵלַי לֵאמֹר" — the same bare formula as
  // ויגש's old haftara, and just as unidentifying. Moved to 22:2, whose "הֲתִשְׁפֹּט הֲתִשְׁפֹּט
  // אֶת־עִיר הַדָּמִים" (will you judge the bloody city?) both identifies the haftara and
  // echoes אחרי מות's "כִּי נֶפֶשׁ הַבָּשָׂר בַּדָּם הִוא".
  { parasha: 'אחרי מות', haftara: { ref: 'Ezekiel 22:2', words: [3, 6] }, pesukim: [
    { ref: 'Leviticus 16:30', words: [1, 8] },
    { ref: 'Leviticus 17:11', words: [1, 5] },
    { ref: 'Leviticus 18:5', words: [4, 9] },
  ] },
  // Same fix as אחרי מות above: Ezekiel 20:2 is the bare formula, so this moves to 20:3, whose
  // "בֶּן־אָדָם דַּבֵּר אֶת־זִקְנֵי יִשְׂרָאֵל" (son of man, speak to the elders of Israel) at
  // least names an addressee.
  { parasha: 'קדושים', haftara: { ref: 'Ezekiel 20:3', words: [1, 4] }, pesukim: [
    // Contains קְדֹשִׁים תִּהְיוּ — the words the parasha is named for.
    { ref: 'Leviticus 19:2', words: [6, 12] },
    { ref: 'Leviticus 19:18', words: [5, 9] },
    { ref: 'Leviticus 19:32', words: [1, 6] },
  ] },
  { parasha: 'אמור', haftara: { ref: 'Ezekiel 44:15', words: [1, 8] }, pesukim: [
    { ref: 'Leviticus 22:32', words: [1, 8] },
    { ref: 'Leviticus 23:3', words: [1, 8] },
    // The four species (ד׳ מינים) of Sukkot, Leviticus 23:40's own famous list.
    { ref: 'Leviticus 23:40', words: [5, 12] },
  ] },
  // "וּקְרָאתֶם דְּרוֹר בָּאָר�ץ לְכׇל־יֹשְׁבֶיהָ" — the Liberty Bell's inscription.
  { parasha: 'בהר', haftara: { ref: 'Jeremiah 32:6', words: [1, 6] }, pesukim: [
    { ref: 'Leviticus 25:10', words: [6, 9] },
    { ref: 'Leviticus 25:17', words: [1, 6] },
    { ref: 'Leviticus 25:23', words: [1, 6] },
  ] },
  { parasha: 'בחוקותי', haftara: { ref: 'Jeremiah 16:19', words: [1, 6] }, pesukim: [
    // Contains בְּחֻקֹּתַי — the word the parasha is named for.
    { ref: 'Leviticus 26:3', words: [1, 6] },
    { ref: 'Leviticus 26:6', words: [1, 6] },
    { ref: 'Leviticus 26:12', words: [1, 8] },
  ] },

  // Numbers.
  { parasha: 'במדבר', haftara: { ref: 'Hosea 2:1', words: [1, 9] }, pesukim: [
    { ref: 'Numbers 1:2', words: [1, 4] },
    { ref: 'Numbers 2:2', words: [1, 8] },
    { ref: 'Numbers 3:13', words: [1, 3] },
  ] },
  // The three verses of ברכת כהנים (the Priestly Blessing), whole.
  { parasha: 'נשא', haftara: { ref: 'Judges 13:2', words: [1, 8] }, pesukim: [
    { ref: 'Numbers 6:24', words: [1, 3] },
    { ref: 'Numbers 6:25', words: [1, 5] },
    { ref: 'Numbers 6:26', words: [1, 7] },
  ] },
  { parasha: 'בהעלותך', haftara: { ref: 'Zechariah 2:14', words: [1, 8] }, pesukim: [
    // Contains בְּהַעֲלֹתְךָ — the word the parasha is named for.
    { ref: 'Numbers 8:2', words: [5, 12] },
    // Bracketed by נון הפוכה in the Masoretic text (Task 2 widened the DROP set precisely so
    // this verse is safe to quote). Kept whole — it is the fixed line recited when the ark is
    // opened, not a fragment to trim.
    { ref: 'Numbers 10:35', words: [1, 12] },
    { ref: 'Numbers 12:3', words: [1, 9] },
  ] },
  { parasha: 'שלח', haftara: { ref: 'Joshua 2:1', words: [1, 10] }, pesukim: [
    { ref: 'Numbers 13:30', words: [6, 12] },
    { ref: 'Numbers 14:20', words: [1, 4] },
    { ref: 'Numbers 15:39', words: [1, 8] },
  ] },
  { parasha: 'קרח', haftara: { ref: 'I Samuel 11:14', words: [1, 6] }, pesukim: [
    { ref: 'Numbers 16:22', words: [1, 7] },
    { ref: 'Numbers 17:5', words: [1, 8] },
    { ref: 'Numbers 18:20', words: [11, 16] },
  ] },
  { parasha: 'חוקת', haftara: { ref: 'Judges 11:1', words: [1, 5] }, pesukim: [
    // Contains חֻקַּת — the word the parasha is named for.
    { ref: 'Numbers 19:2', words: [1, 6] },
    { ref: 'Numbers 21:8', words: [4, 9] },
    { ref: 'Numbers 21:17', words: [1, 8] },
  ] },
  { parasha: 'בלק', haftara: { ref: 'Micah 5:6', words: [1, 6] }, pesukim: [
    { ref: 'Numbers 23:9', words: [5, 11] },
    { ref: 'Numbers 23:21', words: [1, 6] },
    // "מַה־טֹּבוּ אֹהָלֶיךָ יַעֲקֹב" — recited on entering a synagogue.
    { ref: 'Numbers 24:5', words: [1, 5] },
  ] },
  { parasha: 'פינחס', haftara: { ref: 'I Kings 18:46', words: [1, 8] }, pesukim: [
    // Numbers 25:12 carries a Sefaria footnote (the ketiv/keri note on the broken ו in
    // שָׁלוֹם) that was leaking into the token stream as extra pseudo-words; fixed in
    // buildParashaHighlights.mjs's strip(), not worked around here. "הִנְנִי נֹתֵן לוֹ
    // אֶת־בְּרִיתִי שָׁלוֹם" is the phrase the parasha is chosen for.
    { ref: 'Numbers 25:12', words: [3, 7] },
    { ref: 'Numbers 27:16', words: [1, 7] },
    { ref: 'Numbers 28:2', words: [6, 11] },
  ] },
  { parasha: 'מטות', haftara: { ref: 'Jeremiah 1:1', words: [1, 8] }, pesukim: [
    // Contains הַמַּטּוֹת — the word the parasha is named for.
    { ref: 'Numbers 30:2', words: [1, 7] },
    { ref: 'Numbers 30:3', words: [1, 6] },
    { ref: 'Numbers 32:22', words: [1, 8] },
  ] },
  { parasha: 'מסעי', haftara: { ref: 'Jeremiah 2:4', words: [1, 7] }, pesukim: [
    // Contains מַסְעֵיהֶם — the word the parasha is named for.
    { ref: 'Numbers 33:2', words: [1, 6] },
    { ref: 'Numbers 34:2', words: [6, 9] },
    { ref: 'Numbers 35:34', words: [1, 7] },
  ] },

  // Deuteronomy.
  { parasha: 'דברים', haftara: { ref: 'Isaiah 1:1', words: [1, 7] }, pesukim: [
    { ref: 'Deuteronomy 1:11', words: [1, 8] },
    { ref: 'Deuteronomy 1:17', words: [1, 6] },
    { ref: 'Deuteronomy 3:22', words: [1, 8] },
  ] },
  { parasha: 'ואתחנן', haftara: { ref: 'Isaiah 40:1', words: [1, 5] }, pesukim: [
    // שמע — whole.
    { ref: 'Deuteronomy 6:4', words: [1, 6] },
    { ref: 'Deuteronomy 6:5', words: [1, 7] },
    { ref: 'Deuteronomy 7:9', words: [1, 7] },
  ] },
  { parasha: 'עקב', haftara: { ref: 'Isaiah 49:14', words: [1, 6] }, pesukim: [
    // "man does not live by bread alone" — kept whole rather than trimmed to the aim.
    { ref: 'Deuteronomy 8:3', words: [13, 22] },
    { ref: 'Deuteronomy 8:10', words: [1, 7] },
    { ref: 'Deuteronomy 10:12', words: [1, 7] },
  ] },
  { parasha: 'ראה', haftara: { ref: 'Isaiah 54:11', words: [1, 4] }, pesukim: [
    // Contains רְאֵה — the word the parasha is named for.
    { ref: 'Deuteronomy 11:26', words: [1, 7] },
    { ref: 'Deuteronomy 15:8', words: [1, 8] },
    { ref: 'Deuteronomy 16:15', words: [1, 8] },
  ] },
  { parasha: 'שופטים', haftara: { ref: 'Isaiah 51:12', words: [1, 4] }, pesukim: [
    // "צֶדֶק צֶדֶק תִּרְדֹּף" — matches the parasha's own theme of judges and justice.
    { ref: 'Deuteronomy 16:20', words: [1, 5] },
    { ref: 'Deuteronomy 18:13', words: [1, 5] },
    { ref: 'Deuteronomy 20:4', words: [1, 8] },
  ] },
  { parasha: 'כי תצא', haftara: { ref: 'Isaiah 54:1', words: [1, 4] }, pesukim: [
    { ref: 'Deuteronomy 22:7', words: [1, 5] },
    { ref: 'Deuteronomy 23:15', words: [1, 6] },
    { ref: 'Deuteronomy 24:15', words: [1, 6] },
  ] },
  { parasha: 'כי תבוא', haftara: { ref: 'Isaiah 60:1', words: [1, 5] }, pesukim: [
    { ref: 'Deuteronomy 26:15', words: [1, 7] },
    { ref: 'Deuteronomy 28:2', words: [1, 5] },
    { ref: 'Deuteronomy 28:13', words: [1, 5] },
  ] },
  { parasha: 'נצבים', haftara: { ref: 'Isaiah 61:10', words: [1, 6] }, pesukim: [
    { ref: 'Deuteronomy 29:28', words: [1, 7] },
    { ref: 'Deuteronomy 30:14', words: [1, 7] },
    // "וּבָחַרְתָּ בַּחַיִּים" — choose life — kept long enough to reach it.
    { ref: 'Deuteronomy 30:19', words: [8, 17] },
  ] },
  { parasha: 'וילך', haftara: { ref: 'Hosea 14:2', words: [1, 8] }, pesukim: [
    // חִזְקוּ וְאִמְצוּ.
    { ref: 'Deuteronomy 31:6', words: [1, 5] },
    { ref: 'Deuteronomy 31:8', words: [1, 7] },
    { ref: 'Deuteronomy 31:19', words: [1, 7] },
  ] },
  { parasha: 'האזינו', haftara: { ref: 'II Samuel 22:1', words: [1, 6] }, pesukim: [
    // Contains הַאֲזִינוּ — the word the parasha is named for.
    { ref: 'Deuteronomy 32:1', words: [1, 6] },
    { ref: 'Deuteronomy 32:4', words: [1, 6] },
    { ref: 'Deuteronomy 32:7', words: [1, 6] },
  ] },
  { parasha: 'וזאת הברכה', haftara: { ref: 'Joshua 1:1', words: [1, 9] }, pesukim: [
    // תּוֹרָה צִוָּה־לָנוּ מֹשֶׁה — traditionally a child's first Torah verse.
    { ref: 'Deuteronomy 33:4', words: [1, 6] },
    { ref: 'Deuteronomy 33:27', words: [1, 6] },
    // The Torah's own closing verse, kept whole.
    { ref: 'Deuteronomy 34:10', words: [1, 10] },
  ] },
];

// Combined parashiyot are read as one unit, so they are keyed in their own right. Their
// pesukim are composed rather than re-curated — two from the first parasha, one from the
// second — but the haftara is its own, because a combined reading does not simply inherit
// either half's.
//
// Every haftara ref below is shared with a standalone parasha's own haftara elsewhere in
// CURATION, and each range here is deliberately the same range already chosen for that
// standalone entry, rather than an independent re-reading of the same verse.
export const COMBINED = [
  // Words [1, 3] here is "וַיַּעַשׂ חִירוֹם אֶת־הַכִּיֹּרוֹת" — אֶת־הַכִּיֹּרוֹת is one
  // maqaf-joined token, so this is a complete clause ("And Hiram made the basins"), not a
  // fragment severed at the object marker. Same range as standalone ויקהל's own haftara.
  { pair: ['ויקהל', 'פקודי'], haftara: { ref: 'I Kings 7:40', words: [1, 3] } },
  // Widened from the placeholder [1, 3] — "וְאַרְבָּעָה אֲנָשִׁים הָיוּ" ends on "were" with
  // no predicate. [1, 4] reaches מְצֹרָעִים, which both completes the sentence and names the
  // affliction the parasha is about. Same range as standalone מצורע's own haftara.
  { pair: ['תזריע', 'מצורע'], haftara: { ref: 'II Kings 7:3', words: [1, 4] } },
  // Ezekiel 20:2 is entirely "וַיְהִי דְבַר־יְהֹוָה אֵלַי לֵאמֹר" (4 tokens, all of it) — the
  // same bare messenger formula fixed for standalone קדושים, and for the same reason there is
  // nothing later in the verse to shift toward. Moved to 20:3, same fix and same range as
  // standalone קדושים's own haftara: "בֶּן־אָדָם דַּבֵּר אֶת־זִקְנֵי יִשְׂרָאֵל" at least
  // names an addressee.
  { pair: ['אחרי מות', 'קדושים'], haftara: { ref: 'Ezekiel 20:3', words: [1, 4] } },
  // Widened from the placeholder [1, 3] to the fuller, still-complete declaration. Same range
  // as standalone בחוקותי's own haftara.
  { pair: ['בהר', 'בחוקותי'], haftara: { ref: 'Jeremiah 16:19', words: [1, 6] } },
  // Widened from the placeholder [1, 3] — "וְהָיָה שְׁאֵרִית יַעֲקֹב" ends on "shall be" with
  // no complement. [1, 6] completes it. Same range as standalone בלק's own haftara.
  { pair: ['חוקת', 'בלק'], haftara: { ref: 'Micah 5:6', words: [1, 6] } },
  // Widened from the placeholder [1, 3] — "שִׁמְעוּ דְבַר־יְהֹוָה בֵּית" ends on the construct
  // "house of" with no completion. [1, 7] reaches "בֵּית יִשְׂרָאֵל" and closes the verse's own
  // parallelism. Same range as standalone מסעי's own haftara.
  { pair: ['מטות', 'מסעי'], haftara: { ref: 'Jeremiah 2:4', words: [1, 7] } },
  // Widened from the placeholder [1, 3] to the fuller, still-complete declaration. Same range
  // as standalone נצבים's own haftara.
  { pair: ['נצבים', 'וילך'], haftara: { ref: 'Isaiah 61:10', words: [1, 6] } },
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
