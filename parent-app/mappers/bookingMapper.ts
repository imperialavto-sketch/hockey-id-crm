import type {
  Booking,
  BookingStatus,
  CoachBookingInfo,
  PaymentStatus,
  PriceBreakdown,
  TrainingFormat,
} from "@/types/booking";

const STATUSES: BookingStatus[] = ["pending", "confirmed", "cancelled", "completed"];
const PAYMENT_STATUSES: PaymentStatus[] = ["unpaid", "processing", "paid", "failed", "refunded"];
const FORMATS: TrainingFormat[] = ["ice", "gym", "online"];

function toBookingStatus(s?: string): BookingStatus {
  if (s && STATUSES.includes(s as BookingStatus)) return s as BookingStatus;
  return "pending";
}
function toPaymentStatus(s?: string): PaymentStatus {
  if (s && PAYMENT_STATUSES.includes(s as PaymentStatus)) return s as PaymentStatus;
  return "unpaid";
}
function toFormat(s?: string): TrainingFormat {
  if (s && FORMATS.includes(s as TrainingFormat)) return s as TrainingFormat;
  return "ice";
}

/** API price breakdown (snake_case or camelCase). */
export interface ApiPriceBreakdown {
  coach_amount?: number;
  coachAmount?: number;
  platform_fee?: number;
  platformFee?: number;
  service_fee?: number;
  serviceFee?: number;
  total_amount?: number;
  totalAmount?: number;
  currency?: string;
}

/** API coach info (snake_case or camelCase). */
export interface ApiCoachBookingInfo {
  id?: string;
  full_name?: string;
  fullName?: string;
  specialization?: string;
  city?: string;
  photo_url?: string;
  photoUrl?: string;
  price?: number;
}

/** API booking shape (snake_case or camelCase). */
export interface ApiBooking {
  id: string;
  coach_id?: string;
  coachId?: string;
  coach?: ApiCoachBookingInfo;
  player_id?: string;
  playerId?: string;
  player_name?: string;
  playerName?: string;
  parent_user_id?: string;
  parentUserId?: string;
  booking_date?: string;
  bookingDate?: string;
  booking_time?: string;
  bookingTime?: string;
  duration?: number;
  format?: string;
  note?: string;
  price_breakdown?: ApiPriceBreakdown;
  priceBreakdown?: ApiPriceBreakdown;
  status?: string;
  payment_status?: string;
  paymentStatus?: string;
  payment_intent_id?: string;
  paymentIntentId?: string;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

function mapApiCoachToCoachBookingInfo(raw: ApiCoachBookingInfo | undefined): CoachBookingInfo {
  if (!raw) {
    return {
      id: "",
      fullName: "",
      specialization: "",
      city: "",
      photoUrl: "",
      price: 0,
    };
  }
  return {
    id: String(raw.id ?? ""),
    fullName: (raw.full_name ?? raw.fullName ?? "").toString(),
    specialization: raw.specialization ?? "",
    city: raw.city ?? "",
    photoUrl: (raw.photo_url ?? raw.photoUrl ?? "").toString(),
    price: Number(raw.price ?? 0),
  };
}

function mapApiPriceBreakdown(raw: ApiPriceBreakdown | undefined): PriceBreakdown {
  if (!raw) {
    return {
      coachAmount: 0,
      platformFee: 0,
      serviceFee: 0,
      totalAmount: 0,
      currency: "RUB",
    };
  }
  return {
    coachAmount: Number(raw.coach_amount ?? raw.coachAmount ?? 0),
    platformFee: Number(raw.platform_fee ?? raw.platformFee ?? 0),
    serviceFee: Number(raw.service_fee ?? raw.serviceFee ?? 0),
    totalAmount: Number(raw.total_amount ?? raw.totalAmount ?? 0),
    currency: raw.currency ?? "RUB",
  };
}

export function mapApiBookingToBooking(raw: ApiBooking): Booking {
  return {
    id: String(raw.id),
    coachId: (raw.coach_id ?? raw.coachId ?? "").toString(),
    coach: mapApiCoachToCoachBookingInfo(raw.coach),
    playerId: (raw.player_id ?? raw.playerId ?? "").toString(),
    playerName: (raw.player_name ?? raw.playerName ?? "").toString(),
    parentUserId: raw.parent_user_id ?? raw.parentUserId,
    bookingDate: (raw.booking_date ?? raw.bookingDate ?? "").toString(),
    bookingTime: (raw.booking_time ?? raw.bookingTime ?? "").toString(),
    duration: Number(raw.duration ?? 0),
    format: toFormat(raw.format),
    note: raw.note,
    priceBreakdown: mapApiPriceBreakdown(raw.price_breakdown ?? raw.priceBreakdown),
    status: toBookingStatus(raw.status),
    paymentStatus: toPaymentStatus(raw.payment_status ?? raw.paymentStatus),
    paymentIntentId: raw.payment_intent_id ?? raw.paymentIntentId,
    createdAt: (raw.created_at ?? raw.createdAt ?? new Date().toISOString()).toString(),
    updatedAt: (raw.updated_at ?? raw.updatedAt ?? new Date().toISOString()).toString(),
  };
}
