import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Generate a 6-digit numeric code
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Hash a string with SHA-256, returns hex string
export async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Send verification email to business owner
export async function sendClaimVerificationEmail(
  to: string,
  businessName: string,
  code: string,
): Promise<void> {
  await resend.emails.send({
    from: 'FindTopSpots <noreply@findtopspots.com>',
    to,
    subject: `Verify your business claim — ${businessName}`,
    html: `
      <h2>Verify your business on FindTopSpots</h2>
      <p>You requested to claim <strong>${businessName}</strong>.</p>
      <p>Your verification code is:</p>
      <h1 style="font-size: 48px; letter-spacing: 8px; color: #d97706;">${code}</h1>
      <p>This code expires in 30 minutes.</p>
      <p>If you did not request this, ignore this email.</p>
    `,
  })
}
