import { useState, useEffect } from 'react';
import { halachot } from './halachaData';

const DailyHalacha = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Change halacha every 30 seconds
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % halachot.length);
    }, 30000); // 30 seconds

    return () => clearInterval(timer);
  }, []);

  const currentHalacha = halachot[currentIndex];

  return (
    <div className="bg-gradient-to-r from-primary-gold to-yellow-600 p-6 rounded-lg shadow-lg animate-fadeIn">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="text-5xl flex-shrink-0">📖</div>

        {/* Content */}
        <div className="flex-grow">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-2xl font-bold text-primary-dark font-hebrew">
              הלכה יומית
            </h3>
            <span className="text-sm bg-white bg-opacity-30 px-3 py-1 rounded-full text-primary-dark font-hebrew">
              {currentHalacha.category}
            </span>
          </div>

          <p className="text-xl leading-relaxed text-primary-dark font-hebrew font-medium">
            {currentHalacha.text}
          </p>

          {/* Progress indicator */}
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-grow h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-dark transition-all duration-500"
                style={{
                  width: `${((currentIndex + 1) / halachot.length) * 100}%`,
                }}
              />
            </div>
            <span className="text-sm text-primary-dark font-hebrew">
              {currentIndex + 1}/{halachot.length}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation dots */}
      <div className="flex justify-center gap-1 mt-4">
        {halachot.slice(0, 10).map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentIndex % 10
                ? 'bg-primary-dark w-4'
                : 'bg-white bg-opacity-40'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default DailyHalacha;
