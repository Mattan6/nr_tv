import * as S from '../components/mobile/mobileStyles';
import MobileHeader from '../components/mobile/MobileHeader';
import NextMinyanHero from '../components/mobile/NextMinyanHero';
import PrayerTimesCard from '../components/mobile/PrayerTimesCard';
import ShiurimCard from '../components/mobile/ShiurimCard';
import ZmanimAccordion from '../components/mobile/ZmanimAccordion';
import { AnnouncementCard, MazalCard, AzkarotCard, JokesCard } from '../components/mobile/RotatingCards';
import TickerLines from '../components/mobile/TickerLines';
import useDisplayModel from '../hooks/useDisplayModel';

// The phone layout: one scrolling column, ordered by what someone standing outside the
// shul actually wants — when the next minyan is, then what was announced, then the
// schedule. Every value comes from useDisplayModel, the same hook the wall calls, so the
// two screens cannot post different times. See pages/SynagogueDisplay.jsx.
const MobileDisplay = () => {
  const {
    screen,
    setScreen,
    hebDate,
    weekday,
    prayers,
    prayersSub,
    next,
    zmanimRows,
    shiurim,
    ticker,
    ann,
    maz,
    azk,
    joke,
    tick,
    jokeTick,
    annCount,
    annIndex,
  } = useDisplayModel();

  return (
    <div style={S.screen} dir="rtl">
      <MobileHeader weekday={weekday} hebDate={hebDate} />

      <div style={S.page}>
        <NextMinyanHero next={next} zmanimRows={zmanimRows} />

        {annCount > 0 && (
          <AnnouncementCard ann={ann} annKey={tick} count={annCount} index={annIndex} />
        )}

        <PrayerTimesCard
          sub={prayersSub}
          prayers={prayers}
          screen={screen}
          onSetChol={() => setScreen('weekday')}
          onSetShab={() => setScreen('shabbat')}
        />

        <ShiurimCard shiurim={shiurim} />

        {/* Unlike the wall, whose grid holds a fixed set of boxes, this column simply
            omits a card with nothing in it — an empty glass rectangle on a phone reads
            as a page that failed to load. */}
        {maz.names && <MazalCard maz={maz} mazKey={tick} />}
        {azk.name && <AzkarotCard azk={azk} azkKey={tick} />}

        <ZmanimAccordion rows={zmanimRows} />

        <JokesCard joke={joke} jokeKey={jokeTick} />

        <TickerLines items={ticker} />
      </div>
    </div>
  );
};

export default MobileDisplay;
