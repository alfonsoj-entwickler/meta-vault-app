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
            <div className="relative aspect-square sm:w-5/12 overflow-hidden rounded-xl">
              <Image
                src="/images/location_tracking_img.jpg"
                alt="Exact location & Tracking"
                className="object-cover"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
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
            <div className="relative aspect-square sm:w-5/12 sm:order-2 overflow-hidden rounded-xl">
              <Image
                src="/images/device_footprint.jpg"
                alt="Exact location & Tracking"
                className="object-cover"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
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
            <div className="relative aspect-square sm:w-5/12 overflow-hidden rounded-xl">
              <Image
                src="/images/invisible_timeline_image.jpg"
                alt="Exact location & Tracking"
                className="object-cover"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
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
            <div className="relative aspect-square sm:w-5/12 sm:order-2 overflow-hidden rounded-xl">
              <Image
                src="/images/editing_history_image.jpg"
                alt="Exact location & Tracking"
                className="object-cover"
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <div className="flex-1 text-slate-800">
              <h2 className="mb-4 text-3xl font-bold uppercase">
                {t("features.titleHistory")}
              </h2>
              <p className="text-xl">{t("features.descriptionHistory")}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
