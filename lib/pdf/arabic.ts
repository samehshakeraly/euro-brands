// تشكيل النص العربي وترتيبه بصرياً (RTL) لاستخدامه مع jsPDF.
// jsPDF يرسم الحروف من اليسار لليمين بلا تشكيل، لذا نحوّل النص المنطقي
// إلى صوره المتصلة الصحيحة ثم نرتّبه بصرياً.

type Forms = [iso: number, fin: number, init: number, med: number];

interface Letter {
  forms: Forms; // 0 يعني الصيغة غير متوفرة
  dual: boolean; // يتصل من الجهتين؟
}

const LETTERS: Record<number, Letter> = {};
function add(base: number, forms: Forms, dual = false) {
  LETTERS[base] = { forms, dual };
}

// الحروف العربية وصورها (المعزولة، النهائية، الابتدائية، الوسطية)
add(0x0621, [0xfe80, 0, 0, 0]); // ء
add(0x0622, [0xfe81, 0xfe82, 0, 0]); // آ
add(0x0623, [0xfe83, 0xfe84, 0, 0]); // أ
add(0x0624, [0xfe85, 0xfe86, 0, 0]); // ؤ
add(0x0625, [0xfe87, 0xfe88, 0, 0]); // إ
add(0x0626, [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c], true); // ئ
add(0x0627, [0xfe8d, 0xfe8e, 0, 0]); // ا
add(0x0628, [0xfe8f, 0xfe90, 0xfe91, 0xfe92], true); // ب
add(0x0629, [0xfe93, 0xfe94, 0, 0]); // ة
add(0x062a, [0xfe95, 0xfe96, 0xfe97, 0xfe98], true); // ت
add(0x062b, [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c], true); // ث
add(0x062c, [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0], true); // ج
add(0x062d, [0xfea1, 0xfea2, 0xfea3, 0xfea4], true); // ح
add(0x062e, [0xfea5, 0xfea6, 0xfea7, 0xfea8], true); // خ
add(0x062f, [0xfea9, 0xfeaa, 0, 0]); // د
add(0x0630, [0xfeab, 0xfeac, 0, 0]); // ذ
add(0x0631, [0xfead, 0xfeae, 0, 0]); // ر
add(0x0632, [0xfeaf, 0xfeb0, 0, 0]); // ز
add(0x0633, [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4], true); // س
add(0x0634, [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8], true); // ش
add(0x0635, [0xfeb9, 0xfeba, 0xfebb, 0xfebc], true); // ص
add(0x0636, [0xfebd, 0xfebe, 0xfebf, 0xfec0], true); // ض
add(0x0637, [0xfec1, 0xfec2, 0xfec3, 0xfec4], true); // ط
add(0x0638, [0xfec5, 0xfec6, 0xfec7, 0xfec8], true); // ظ
add(0x0639, [0xfec9, 0xfeca, 0xfecb, 0xfecc], true); // ع
add(0x063a, [0xfecd, 0xfece, 0xfecf, 0xfed0], true); // غ
add(0x0641, [0xfed1, 0xfed2, 0xfed3, 0xfed4], true); // ف
add(0x0642, [0xfed5, 0xfed6, 0xfed7, 0xfed8], true); // ق
add(0x0643, [0xfed9, 0xfeda, 0xfedb, 0xfedc], true); // ك
add(0x0644, [0xfedd, 0xfede, 0xfedf, 0xfee0], true); // ل
add(0x0645, [0xfee1, 0xfee2, 0xfee3, 0xfee4], true); // م
add(0x0646, [0xfee5, 0xfee6, 0xfee7, 0xfee8], true); // ن
add(0x0647, [0xfee9, 0xfeea, 0xfeeb, 0xfeec], true); // ه
add(0x0648, [0xfeed, 0xfeee, 0, 0]); // و
add(0x0649, [0xfeef, 0xfef0, 0, 0]); // ى
add(0x064a, [0xfef1, 0xfef2, 0xfef3, 0xfef4], true); // ي

// روابط لام-ألف: لام (0x0644) + أحد صور الألف → صيغة مركّبة (متصلة بما قبلها فقط)
const LAM_ALEF: Record<number, Forms> = {
  0x0622: [0xfef5, 0xfef6, 0, 0], // لآ
  0x0623: [0xfef7, 0xfef8, 0, 0], // لأ
  0x0625: [0xfef9, 0xfefa, 0, 0], // لإ
  0x0627: [0xfefb, 0xfefc, 0, 0], // لا
};

const DIACRITICS = new Set<number>([
  0x064b, 0x064c, 0x064d, 0x064e, 0x064f, 0x0650, 0x0651, 0x0652, 0x0653,
  0x0654, 0x0655, 0x0670,
]);

interface Token {
  letter: boolean;
  dual: boolean;
  forms: Forms;
  raw: number; // للحروف غير العربية
}

function isArabicChar(code: number): boolean {
  return (
    (code >= 0x0600 && code <= 0x06ff) || (code >= 0xfb50 && code <= 0xfeff)
  );
}

// يشكّل النص ويعيده مرتّباً بصرياً (يسار→يمين) جاهزاً للرسم في jsPDF
export function ar(input: string): string {
  if (!input) return "";
  const codes = Array.from(input)
    .map((c) => c.codePointAt(0) as number)
    .filter((c) => !DIACRITICS.has(c)); // إسقاط التشكيل (نادر في التقارير)

  // بناء الوحدات مع معالجة لام-ألف
  const tokens: Token[] = [];
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    if (code === 0x0644 && LAM_ALEF[codes[i + 1]]) {
      tokens.push({ letter: true, dual: false, forms: LAM_ALEF[codes[i + 1]], raw: code });
      i++;
      continue;
    }
    const l = LETTERS[code];
    if (l) tokens.push({ letter: true, dual: l.dual, forms: l.forms, raw: code });
    else tokens.push({ letter: false, dual: false, forms: [code, 0, 0, 0], raw: code });
  }

  // اختيار الصيغة المناسبة لكل حرف حسب الجوار
  const shaped: { code: number; ar: boolean }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (!t.letter) {
      shaped.push({ code: t.raw, ar: isArabicChar(t.raw) });
      continue;
    }
    const prev = tokens[i - 1];
    const next = tokens[i + 1];
    const joinPrev = !!prev && prev.letter && prev.dual; // السابق يتصل للأمام
    const joinNext = t.dual && !!next && next.letter; // الحالي يتصل بالتالي

    const [iso, fin, init, med] = t.forms;
    let form = iso;
    if (joinPrev && joinNext) form = med || init || iso;
    else if (joinPrev) form = fin || iso;
    else if (joinNext) form = init || iso;
    shaped.push({ code: form, ar: true });
  }

  // الترتيب البصري لاتجاه RTL: عكس ترتيب المقاطع، وعكس الحروف داخل المقاطع العربية
  const runs: { ar: boolean; codes: number[] }[] = [];
  for (const ch of shaped) {
    const last = runs[runs.length - 1];
    if (last && last.ar === ch.ar) last.codes.push(ch.code);
    else runs.push({ ar: ch.ar, codes: [ch.code] });
  }

  const out: number[] = [];
  for (let r = runs.length - 1; r >= 0; r--) {
    const run = runs[r];
    const seq = run.ar ? [...run.codes].reverse() : run.codes;
    out.push(...seq);
  }

  return out.map((c) => String.fromCodePoint(c)).join("");
}
