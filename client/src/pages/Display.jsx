import Clock from '../components/Clock/Clock';
import HebrewDate from '../components/HebrewDate/HebrewDate';
import PrayerTimes from '../components/PrayerTimes/PrayerTimes';
import ParashaWeek from '../components/ParashaWeek/ParashaWeek';
import DafYomi from '../components/DafYomi/DafYomi';
import OmerCount from '../components/OmerCount/OmerCount';
import SpecialDays from '../components/SpecialDays/SpecialDays';
import Announcements from '../components/Announcements/Announcements';
import Events from '../components/Events/Events';

const Display = () => {
  return (
    <div className="min-h-screen p-8">
      {/* Header with Clock and Hebrew Date */}
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-bold mb-4 text-primary-lightGold font-hebrew">
          בית הכנסת ניצן
        </h1>
        <Clock />
        <div className="mt-4">
          <HebrewDate />
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Prayer Times */}
        <div className="col-span-2">
          <PrayerTimes />
        </div>

        {/* Right Column - Parasha and Special Info */}
        <div className="space-y-6">
          <ParashaWeek />
          <DafYomi />
          <OmerCount />
          <SpecialDays />
        </div>
      </div>

      {/* Bottom Section - Announcements and Events */}
      <div className="grid grid-cols-2 gap-6 mt-6">
        <Announcements />
        <Events />
      </div>

      {/* Footer */}
      <div className="text-center mt-8 text-gray-400 text-sm">
        <div className="flex items-center justify-center gap-2">
          <span>נוסח עדות המזרח</span>
          <span>•</span>
          <span>ניצן</span>
        </div>
      </div>
    </div>
  );
};

export default Display;
