import { useEffect, useState } from 'react';
import { getContent } from '../services/content';

const POLL_MS = 30000;
const CACHE_KEY = 'synagogue-display-content';
// `jokes` is scraper-owned rather than admin-edited, but it travels in the same document
// and carries the same isActive flag, so it needs nothing special here beyond a key —
// activeOnly derives its panel list from this object.
const EMPTY_LISTS = {
  announcements: [],
  shiurim: [],
  // The שבת list. Legitimately empty until the gabbai fills it — the server seeds it that
  // way on purpose (see BACKFILL_KEYS in server/src/store/contentStore.js), so an empty
  // array here is the normal state and not a failed load.
  shiurimShabbat: [],
  mazal: [],
  azkarot: [],
  // הקדשת הלוח, on the שבת board only. Legitimately empty until the gabbai adds one — the
  // server seeds it that way on purpose (see BACKFILL_KEYS in server/src/store/contentStore.js),
  // and the card's own copy invites him to.
  dedication: [],
  jokes: [],
  ticker: [],
  // ראש השנה, on /tv?screen=rosh. Read only by hooks/useRoshModel.js — the חול and שבת boards
  // never touch them — but they travel in the one document and carry the same isActive flag as
  // everything else, so they need nothing here beyond a key.
  roshDay1: [],
  roshDay2: [],
  roshMechirot: [],
  roshDedication: [],
  roshTicker: [],
};

// The pinned time overrides, one group per board that has any. A single record rather than a
// list — there is nothing to filter, only to default, and it is defaulted rather than passed
// straight through because a document cached before either feature existed carries no
// `settings` at all, and one cached between them carries no `rosh` inside it.
const EMPTY_SETTINGS = { shabbat: {}, rosh: {} };

const EMPTY = { ...EMPTY_LISTS, settings: EMPTY_SETTINGS };

// Keep only the items the gabbai has left visible, per panel.
const activeOnly = (doc) => ({
  ...Object.fromEntries(
    Object.keys(EMPTY_LISTS).map((key) => [key, (doc?.[key] || []).filter((it) => it.isActive)])
  ),
  settings: {
    shabbat: doc?.settings?.shabbat || {},
    rosh: doc?.settings?.rosh || {},
  },
});

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? activeOnly(JSON.parse(raw)) : EMPTY;
  } catch {
    return EMPTY;
  }
};

// The TV browser is opened once and left running for weeks, so the display polls —
// nothing else reaches a page that is never reloaded. A change saved in /adminGabbai
// appears here within POLL_MS.
//
// Written for an unattended screen: a failed poll keeps whatever is currently shown
// (a server restart must not blank the TV), and the last good document is cached to
// localStorage so even a TV reboot during an outage still has content to show.
export default function useDisplayContent() {
  const [content, setContent] = useState(readCache);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const doc = await getContent();
        if (cancelled) return;
        setContent(activeOnly(doc));
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(doc));
        } catch {
          /* private mode or quota — polling still works, only the reboot cache is lost */
        }
      } catch (error) {
        // Deliberately no setContent: the last good content stays on screen.
        console.error('Failed to load display content:', error);
      }
    };

    load();
    const id = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return content;
}
