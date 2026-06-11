"use client";
import Image from "next/image";

export default function ContentFeatures() {
  return (
    <div className="relative w-full py-20 z-30 bg-white">
      <div className="max-w-4xl mx-auto">
        <ul className="space-y-20">
          <li className="flex items-center gap-10 text-right">
            <div className="relative w-1/3">
              <Image
                src="/images/summary_large_image.jpg"
                alt="Exact location & Tracking"
                className="object-cover aspect-square"
                width={600}
                height={600}
              />
            </div>
            <div className="flex-1 text-slate-800">
              <h2 className="mb-4 text-3xl font-bold uppercase">
                Exact location & Tracking
              </h2>
              <p className="text-xl">
                Hidden GPS coordinates (latitude, longitude, and altitude) are
                embedded in your image file. This data can pinpoint the exact
                street, home address, or workplace where the photo was taken,
                allowing strangers to map your daily movements.
              </p>
            </div>
          </li>
          <li className="flex items-center gap-10 text-left">
            <div className="flex-1 text-slate-800">
              <h2 className="mb-4 text-3xl font-bold uppercase">
                Device footprint & Specs
              </h2>
              <p className="text-xl">
                Your photo carries a unique digital fingerprint of your
                hardware. This includes the specific brand, model, operating
                system version, and sometimes even the unique hardware serial
                numbers of the smartphone or camera you used.
              </p>
            </div>
            <div className="relative w-1/3">
              <Image
                src="/images/summary_large_image.jpg"
                alt="Exact location & Tracking"
                className="object-cover aspect-square"
                width={600}
                height={600}
              />
            </div>
          </li>
          <li className="flex items-center gap-10 text-right">
            <div className="relative w-1/3">
              <Image
                src="/images/summary_large_image.jpg"
                alt="Exact location & Tracking"
                className="object-cover aspect-square"
                width={600}
                height={600}
              />
            </div>
            <div className="flex-1 text-slate-800">
              <h2 className="mb-4 text-3xl font-bold uppercase">
                Invisible timeline & Habits
              </h2>
              <p className="text-xl">
                Beyond just the day and year, metadata records the exact hour,
                minute, and second the shutter clicked. When shared online, this
                precise timestamp can expose your daily routines, sleep
                schedules, or when you are away from home.
              </p>
            </div>
          </li>
          <li className="flex items-center gap-10">
            <div className="flex-1 text-slate-800">
              <h2 className="mb-4 text-3xl font-bold uppercase">
                Editing history & Settings
              </h2>
              <p className="text-xl">
                Every adjustment leaves a trace. The file logs technical camera
                settings like aperture, ISO, and flash usage. It also reveals if
                the image was altered, filtered, or manipulated using software
                like Photoshop or Lightroom before being published.
              </p>
            </div>
            <div className="relative w-1/3">
              <Image
                src="/images/summary_large_image.jpg"
                alt="Exact location & Tracking"
                className="object-cover aspect-square"
                width={600}
                height={600}
              />
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
