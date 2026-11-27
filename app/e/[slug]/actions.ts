"use server";
import { createRsvp, claimBring, type RsvpInput } from "@/lib/data";

export async function rsvpAction(input: RsvpInput) {
  return createRsvp(input);
}

export async function claimAction(token: string, itemId: string) {
  return claimBring(String(token).slice(0, 40), String(itemId).slice(0, 60));
}
