const apiUrl =
  "https://api.aladhan.com/v1/timingsByCity?country=EG&city=Alexandra";

// تعريف لغة moment.js للعربية
moment.locale("ar");

// صور مناسبة لكل صلاة
const prayerImages = {
  Fajr: "assets/images/1.png",
  Dhuhr: "assets/images/2.png",
  Asr: "assets/images/3.png",
  Maghrib: "assets/images/4.png",
  Isha: "assets/images/5.png",
};

// أسماء الصلوات بالعربية
const arabicNames = {
  Fajr: "الفجر",
  Dhuhr: "الظهر",
  Asr: "العصر",
  Maghrib: "المغرب",
  Isha: "العشاء",
};

// قائمة الصلوات التي لا نريد عرضها
const excludedTimings = [
  "Firstthird",
  "Imsak",
  "Lastthird",
  "Midnight",
  "Sunrise",
  "Sunset",
];

// تحديث التاريخ والوقت الحاليين
const updateDateTime = () => {
  const now = moment();
  document.getElementById("current-date-time").innerText = now.format(
    "D MMMM YYYY | h:mm A"
  );
};

// تحديث الوقت المتبقي للصلاة التالية
const updateRemainingTime = (timings) => {
  const now = moment();
  const prayers = Object.entries(timings)
    .filter(([key]) => !excludedTimings.includes(key))
    .map(([key, time]) => ({
      name: key,
      time: moment(time, "HH:mm"),
      arabicName: arabicNames[key],
    }))
    .sort((a, b) => a.time.valueOf() - b.time.valueOf());

  // تحديد الصلاة التالية
  let nextPrayer = prayers.find((prayer) => prayer.time.isAfter(now));

  // إذا لم يتبق أي صلاة في اليوم الحالي، فإن الصلاة التالية هي الفجر غدًا
  if (!nextPrayer) {
    nextPrayer = prayers[0];
    nextPrayer.time.add(1, "days");
  }

  // حساب الوقت المتبقي
  const diff = nextPrayer.time.diff(now);
  const duration = moment.duration(diff);
  const remainingTime = `${String(duration.hours()).padStart(2, "0")}:${String(
    duration.minutes()
  ).padStart(2, "0")}:${String(duration.seconds()).padStart(2, "0")}`;

  document.getElementById("remaining-time").innerText = remainingTime;
  document.getElementById("next-prayer").innerText = nextPrayer.arabicName;
};

// الحصول على مواقيت الصلاة وعرضها
const getTimings = async () => {
  try {
    const content = document.getElementById("content");

    // إظهار مؤشر التحميل
    content.innerHTML =
      '<div class="text-center"><div class="spinner-border text-light" role="status"><span class="visually-hidden">جاري التحميل...</span></div></div>';

    const res = await fetch(apiUrl);

    if (!res.ok) {
      throw new Error(`فشل الاتصال بالخادم: ${res.status}`);
    }

    const data = await res.json();
    const timings = data.data.timings;
    const date = data.data.date;

    // عرض معلومات التاريخ الهجري
    document.getElementById(
      "hijri-date"
    ).innerText = `${date.hijri.day} ${date.hijri.month.ar} ${date.hijri.year}هـ`;

    // إنشاء بطاقات مواقيت الصلاة
    content.innerHTML = Object.keys(timings)
      .filter((key) => !excludedTimings.includes(key))
      .map((key) => {
        const time = moment(timings[key], "HH:mm").format("hh:mm A");
        const isCurrentPrayer = isPrayerActive(key, timings);

        return `
          <div class="col">
            <div class="card text-white ${
              isCurrentPrayer ? "bg-success" : "bg-transparent"
            } rounded border-2 h-100">
              <div class="card-body text-center">
                <img class="card-img mb-2" src="${
                  prayerImages[key] || "assets/images/default.jpg"
                }" alt="${
          arabicNames[key]
        }" style="height: 150px;  object-fit: cover; border-radius: 10px;">
                <h5 class="fs-3 mt-2">${arabicNames[key]}</h5>
                <p class="fs-4 mb-0">${time}</p>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    // تحديث الوقت المتبقي والتاريخ والوقت الحاليين
    updateDateTime();
    updateRemainingTime(timings);

    return timings;
  } catch (error) {
    console.error("حدث خطأ:", error);
    document.getElementById("content").innerHTML = `
      <div class="alert alert-danger" role="alert">
        حدث خطأ أثناء جلب مواقيت الصلاة. الرجاء المحاولة مرة أخرى.
      </div>
    `;
    return null;
  }
};

// تحديد ما إذا كانت هذه الصلاة هي الحالية
function isPrayerActive(prayerKey, timings) {
  const now = moment();
  const prayerTime = moment(timings[prayerKey], "HH:mm");

  // استخراج الصلوات المطلوبة فقط
  const prayers = Object.entries(timings)
    .filter(([key]) => !excludedTimings.includes(key))
    .map(([key, time]) => ({
      name: key,
      time: moment(time, "HH:mm"),
    }))
    .sort((a, b) => a.time.valueOf() - b.time.valueOf());

  // إيجاد الصلاة الحالية
  for (let i = 0; i < prayers.length; i++) {
    const currentPrayer = prayers[i];
    const nextPrayer = prayers[i + 1] || {
      ...prayers[0],
      time: moment(prayers[0].time).add(1, "days"),
    };

    if (
      now.isBetween(currentPrayer.time, nextPrayer.time) &&
      currentPrayer.name === prayerKey
    ) {
      return true;
    }
  }

  return false;
}

// بدء التطبيق
async function initialize() {
  const timings = await getTimings();

  if (timings) {
    // تحديث الوقت والتاريخ كل ثانية
    setInterval(updateDateTime, 1000);

    // تحديث الوقت المتبقي كل ثانية
    setInterval(() => updateRemainingTime(timings), 1000);

    // إعادة تحميل مواقيت الصلاة كل ساعة
    setInterval(getTimings, 60 * 60 * 1000);
  }
}

// بدء التطبيق عند تحميل الصفحة
window.addEventListener("load", initialize);
