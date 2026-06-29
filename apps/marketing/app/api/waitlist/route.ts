import { NextResponse } from "next/server";
import { db } from "@repo/database";
import { waitlist } from "@repo/database/models/waitlist";
import { Resend } from "resend";

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
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `Indecode Waitlist <noreply@${process.env.NEXT_PUBLIC_APP_DOMAIN || "indecode.in"}>`, // Ensure this domain is verified in Resend
        to: email,
        subject: "Welcome to the Indecode Waitlist",
        html: `
          <div style="background-color: #000000; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 60px 20px; text-align: center;">
            <div style="max-width: 500px; margin: 0 auto; background-color: #0a0a0a; border: 1px solid #222222; border-radius: 16px; padding: 40px; text-align: left;">
              
              <div style="margin-bottom: 32px;">
                <h1 style="font-size: 22px; font-weight: 600; margin: 0; letter-spacing: -0.5px;">Indecode</h1>
              </div>
              
              <h2 style="font-size: 18px; font-weight: 500; margin: 0 0 16px 0; color: #ededed;">You are on the list.</h2>
              
              <p style="font-size: 15px; line-height: 1.6; color: #a1a1aa; margin: 0 0 24px 0;">
                We have received your request for early access. We are currently engineering the platform and will notify you the moment a spot opens up.
              </p>
              
              <hr style="border: 0; border-top: 1px solid #222222; margin: 32px 0;" />
              
              <p style="font-size: 14px; color: #71717a; margin: 0; line-height: 1.5;">
                Stay tuned,<br/>
                <span style="color: #e4e4e7;">The Indecode Dev</span>
              </p>
            </div>
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
