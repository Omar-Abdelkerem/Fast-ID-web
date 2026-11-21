// Fixed mock users (the full User object from the API contract, section 0.20).
// Feature mocks use these ids, for example the agent's id for deliveries assigned to the agent.
const base = { preferredLanguage: "ar", isActive: true, mustChangePassword: false, createdAt: "2026-10-01T09:00:00.000Z", updatedAt: "2026-10-01T09:00:00.000Z" };

export const mockUsers = {
  CITIZEN: {
    ...base,
    id: "11111111-1111-4111-8111-111111111111",
    role: "CITIZEN",
    fullName: "منى محمد عبد الهادي",
    email: "mona@example.com",
    phone: "01012345678",
    nationalId: "29001010123457",
    birthDate: "1990-01-01",
    gender: "FEMALE",
    governorate: null,
  },
  ADMIN: {
    ...base,
    id: "22222222-2222-4222-8222-222222222222",
    role: "ADMIN",
    fullName: "هاني المراجع",
    email: "hany@example.com",
    phone: "01099999999",
    nationalId: null,
    birthDate: null,
    gender: null,
    governorate: null,
  },
  AGENT: {
    ...base,
    id: "33333333-3333-4333-8333-333333333333",
    role: "AGENT",
    fullName: "كريم أحمد",
    email: "karim@example.com",
    phone: "01055555555",
    nationalId: null,
    birthDate: null,
    gender: null,
    governorate: "GIZA",
  },
};

// more agents, so the admin can assign deliveries to different people
export const otherAgents = [
  { ...base, id: "44444444-4444-4444-8444-444444444444", role: "AGENT", fullName: "محمود سعيد", email: "mahmoud@example.com", phone: "01066666666", nationalId: null, birthDate: null, gender: null, governorate: "CAIRO" },
  { ...base, id: "55555555-5555-4555-8555-555555555555", role: "AGENT", fullName: "أيمن علي", email: "ayman@example.com", phone: "01077777777", nationalId: null, birthDate: null, gender: null, governorate: "ALEXANDRIA" },
];

// the 27 governorates, ordered by English name (contract section 2.1)
export const governorates = [
  ["ALEXANDRIA", "الإسكندرية", "Alexandria"], ["ASWAN", "أسوان", "Aswan"], ["ASSIUT", "أسيوط", "Assiut"],
  ["BEHEIRA", "البحيرة", "Beheira"], ["BENI_SUEF", "بني سويف", "Beni Suef"], ["CAIRO", "القاهرة", "Cairo"],
  ["DAKAHLIA", "الدقهلية", "Dakahlia"], ["DAMIETTA", "دمياط", "Damietta"], ["FAIYUM", "الفيوم", "Faiyum"],
  ["GHARBIA", "الغربية", "Gharbia"], ["GIZA", "الجيزة", "Giza"], ["ISMAILIA", "الإسماعيلية", "Ismailia"],
  ["KAFR_EL_SHEIKH", "كفر الشيخ", "Kafr El Sheikh"], ["LUXOR", "الأقصر", "Luxor"], ["MATROUH", "مطروح", "Matrouh"],
  ["MINYA", "المنيا", "Minya"], ["MONUFIA", "المنوفية", "Monufia"], ["NEW_VALLEY", "الوادي الجديد", "New Valley"],
  ["NORTH_SINAI", "شمال سيناء", "North Sinai"], ["PORT_SAID", "بورسعيد", "Port Said"], ["QALYUBIA", "القليوبية", "Qalyubia"],
  ["QENA", "قنا", "Qena"], ["RED_SEA", "البحر الأحمر", "Red Sea"], ["SHARQIA", "الشرقية", "Sharqia"],
  ["SOHAG", "سوهاج", "Sohag"], ["SOUTH_SINAI", "جنوب سيناء", "South Sinai"], ["SUEZ", "السويس", "Suez"],
].map(([code, ar, en]) => ({ code, name: { ar, en } }));
