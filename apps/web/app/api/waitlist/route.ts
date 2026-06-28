import { NextResponse } from "next/server";
import { db } from "@repo/database";
import { waitlist } from "@repo/database/models/waitlist";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // Insert into DB
    await db.insert(waitlist).values({
      email,
    }).onConflictDoNothing(); // Ignore if they already joined

    // Send confirmation email via Resend
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: "Indecode Waitlist <noreply@indecode.in>", // Ensure this domain is verified in Resend
        to: email,
        subject: "You're on the list! 🚀",
        html: `
          <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; color: #1a1a1a;">
            <h2>Thanks for joining the Indecode Waitlist!</h2>
            <p>We've received your request for early access. We're currently building out the platform and will notify you as soon as a spot opens up.</p>
            <br/>
            <p>Stay tuned,</p>
            <p><strong>The Indecode Team</strong></p>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
