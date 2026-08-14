import "server-only";

import { getAllowance, type Tier } from "./usage";
import { OUTPUT_LABELS, type OutputKind } from "./outputs";

/**
 * Which outputs a plan is allowed to produce.
 *
 * One rule, in one place. Everything that needs to know whether a user may
 * generate a cover letter asks this file, so the API and the UI can never
 * drift into disagreeing about it.
 *
 * The rule reuses the existing entitlement, and deliberately adds no state of
 * its own. getAllowance() already resolves the single source of truth —
 * `entitlements.access_until`, written only by the Polar webhook and by
 * admin.grant_unlimited() — into a tier, and that resolution already answers
 * every subscription state correctly:
 *
 *   active                      access_until in the future   -> pro
 *   cancelled, paid to term end access_until in the future   -> pro, until it lapses
 *   expired                     access_until in the past     -> free
 *   past due / revoked          revokeAccess() sets it now   -> free
 *   never subscribed            no row at all                -> free
 *
 * So a subscriber who cancels keeps cover letters for the period they have
 * already paid for, and loses them the moment it runs out, with nothing extra
 * to synchronise.
 */

/** Outputs that a free account may look at but not generate. */
export const PAID_ONLY_OUTPUTS: OutputKind[] = ["cover_letter"];

/** True for any tier that has paid or been comped. */
export function isPaidTier(tier: Tier): boolean {
  return tier !== "free";
}

/** Does this selection contain anything a free account cannot generate? */
export function needsPaidPlan(outputs: OutputKind[]): boolean {
  return outputs.some((kind) => PAID_ONLY_OUTPUTS.includes(kind));
}

export type AccessDecision =
  | { ok: true; tier: Tier }
  | { ok: false; tier: Tier; blocked: OutputKind[]; message: string };

/**
 * May this user generate these outputs?
 *
 * Call before taking anything off the meter and before any AI call, so a
 * refused request costs the user nothing and costs us nothing.
 */
export async function checkOutputAccess(
  userId: string,
  outputs: OutputKind[],
): Promise<AccessDecision> {
  const { tier } = await getAllowance(userId);

  if (isPaidTier(tier) || !needsPaidPlan(outputs)) {
    return { ok: true, tier };
  }

  const blocked = outputs.filter((kind) => PAID_ONLY_OUTPUTS.includes(kind));

  return {
    ok: false,
    tier,
    blocked,
    /*
     * A product sentence, not an authorisation error. It names what is
     * included with Pro, and says plainly that the resume is unaffected —
     * someone who hits this has usually not realised only one of the two
     * boxes is the paid one.
     */
    message: `${blocked
      .map((kind) => OUTPUT_LABELS[kind])
      .join(" and ")} generation is included with Pro. Your resume is still free — switch the cover letter off to generate it now, or upgrade to include one.`,
  };
}
