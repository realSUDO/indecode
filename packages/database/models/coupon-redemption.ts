import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user";
import { coupons } from "./coupon";

export const couponRedemptions = pgTable("coupon_redemptions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  couponId: text("coupon_id").notNull().references(() => coupons.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  redeemedAt: timestamp("redeemed_at").defaultNow().notNull(),
});
