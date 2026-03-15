export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

export type PaymentStatus = "unpaid" | "processing" | "paid" | "failed" | "refunded";

export type TrainingFormat = "ice" | "gym" | "online";

export interface CoachBookingInfo {
  id: string;
  fullName: string;
  specialization: string;
  city: string;
  photoUrl: string;
  price: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface PriceBreakdown {
  coachAmount: number;
  platformFee: number;
  serviceFee: number;
  totalAmount: number;
  currency: string;
}

export interface Booking {
  id: string;
  coachId: string;
  coach: CoachBookingInfo;
  playerId: string;
  playerName: string;
  parentUserId?: string;
  bookingDate: string;
  bookingTime: string;
  duration: number;
  format: TrainingFormat;
  note?: string;
  priceBreakdown: PriceBreakdown;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  paymentIntentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingPayload {
  coachId: string;
  playerId: string;
  date: string;
  time: string;
  duration: number;
  format: TrainingFormat;
  note?: string;
}
