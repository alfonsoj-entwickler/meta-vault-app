"use client";
import Image from "next/image";
import { useTranslation } from "../i18n/LanguageContext";

export default function ContentFeatures() {
  const { t } = useTranslation();
  return (
    <div className="relative w-full py-20 px-10 sm:px-0 mt-20 z-30 bg-white">
      <div className="max-w-4xl mx-auto">
        <ul className="space-y-20 sm:space-y-32">
          <li className="flex flex-col sm:flex-row sm:items-center gap-10 sm:text-right">
            <div className="relative sm:w-2/5">
              <Image
                src="/images/location_tracking_schema.jpg"
                alt="Exact location & Tracking"
                className="object-cover aspect-video"
                width={600}
                height={600}
              />
            </div>
            <div className="flex-1 text-slate-800">
              <h2 className="mb-4 text-3xl font-bold uppercase">
                {t("features.titleLocation")}
              </h2>
              <p className="text-xl">{t("features.descriptionLocation")}</p>
            </div>
          </li>
          <li className="flex flex-col sm:flex-row sm:items-center gap-10 text-left">
            <div className="relative sm:w-2/5 sm:order-2">
              <Image
                src="/images/footprint_specs_schema.jpg"
                alt="Exact location & Tracking"
                className="object-cover aspect-video"
                width={600}
                height={600}
              />
            </div>
            <div className="flex-1 text-slate-800">
              <h2 className="mb-4 text-3xl font-bold uppercase">
                {t("features.titleFootprint")}
              </h2>
              <p className="text-xl">{t("features.descriptionFootprint")}</p>
            </div>
          </li>
          <li className="flex flex-col sm:flex-row sm:items-center gap-10 sm:text-right">
            <div className="relative sm:w-2/5">
              <Image
                src="/images/timeline_habits_schema.jpg"
                alt="Exact location & Tracking"
                className="object-cover aspect-video"
                width={600}
                height={600}
              />
            </div>
            <div className="flex-1 text-slate-800">
              <h2 className="mb-4 text-3xl font-bold uppercase">
                {t("features.titleTimeline")}
              </h2>
              <p className="text-xl">{t("features.descriptionTimeline")}</p>
            </div>
          </li>
          <li className="flex flex-col sm:flex-row sm:items-center gap-10">
            <div className="relative sm:w-2/5 sm:order-2">
              <Image
                src="/images/history_settings_schema.jpg"
                alt="Exact location & Tracking"
                className="object-cover aspect-video"
                width={600}
                height={600}
              />
            </div>
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
          </li>
        </ul>
      </div>
    </div>
  );
}
