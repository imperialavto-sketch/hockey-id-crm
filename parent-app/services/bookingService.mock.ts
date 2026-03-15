/**
 * Mock booking service - used when backend API is unavailable.
 * Simulates full flow: create booking -> payment -> confirm.
 */

import type { Booking, CreateBookingPayload, CoachBookingInfo } from "@/types/booking";
import { calculatePriceBreakdown } from "./bookingService";
import { MOCK_COACHES } from "@/constants/mockCoaches";

const MOCK_BOOKINGS: Booking[] = [];
let mockIdCounter = 1;

function coachToInfo(coach: (typeof MOCK_COACHES)[0]): CoachBookingInfo {
  return {
    id: coach.id,
    fullName: coach.fullName,
    specialization: coach.specialization,
    city: coach.city,
    photoUrl: coach.photoUrl,
    price: coach.price,
  };
}

export async function mockCreateBooking(
  payload: CreateBookingPayload,
  parentId?: string | null
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  const coach = MOCK_COACHES.find((c) => c.id === payload.coachId);
  if (!coach) return { success: false, error: "Тренер не найден" };

  const priceBreakdown = calculatePriceBreakdown(
    coach.price,
    payload.duration,
    payload.duration === 90 ? 1.5 : 1
  );

  const booking: Booking = {
    id: `mock-booking-${mockIdCounter++}`,
    coachId: payload.coachId,
    coach: coachToInfo(coach),
    playerId: payload.playerId,
    playerName: "Голыш Марк",
    parentUserId: parentId ?? undefined,
    bookingDate: payload.date,
    bookingTime: payload.time,
    duration: payload.duration,
    format: payload.format,
    note: payload.note,
    priceBreakdown,
    status: "pending",
    paymentStatus: "unpaid",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  MOCK_BOOKINGS.push(booking);
  return { success: true, bookingId: booking.id };
}

export async function mockCreatePaymentIntent(
  _bookingId: string,
  _amount: number,
  _currency: string
): Promise<{ success: boolean; clientSecret?: string; paymentIntentId?: string; error?: string }> {
  return {
    success: true,
    clientSecret: "pi_mock_secret_" + Date.now(),
    paymentIntentId: "pi_mock_" + Date.now(),
  };
}

export async function mockConfirmBooking(
  bookingId: string,
  _paymentIntentId: string
): Promise<{ success: boolean; booking?: Booking; error?: string }> {
  const booking = MOCK_BOOKINGS.find((b) => b.id === bookingId);
  if (!booking) return { success: false, error: "Бронь не найдена" };

  booking.status = "confirmed";
  booking.paymentStatus = "paid";
  booking.updatedAt = new Date().toISOString();
  return { success: true, booking };
}

export function mockGetMyBookings(): Booking[] {
  return [...MOCK_BOOKINGS];
}
