import { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';
import prisma from '../../../lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: "Method not allowed" });

    const { type, name, email, walletAddress, title, description, ticketId } = req.body;

    if (!name || !email || !description) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Save ticket to DB first — always recorded even if email fails
    try {
        await prisma.supportTicket.create({
            data: {
                id: ticketId,
                walletAddress: walletAddress || 'Anonymous',
                type: type || 'Complaint',
                name,
                email,
                title,
                description,
                status: "Pending"
            }
        });
    } catch (dbError: any) {
        console.error("DB ERROR:", dbError);
        return res.status(500).json({ error: "Failed to save ticket" });
    }

    // 2. Send emails via Resend — works on all hosting platforms (HTTPS, not SMTP)
    try {
        // Admin notification
        await resend.emails.send({
            from: `Laamtag Vault <no-reply@uselaamtag.xyz>`,
            to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER!,
            replyTo: email,
            subject: `[${type?.toUpperCase()}] REF: ${ticketId}`,
            html: `
                <div style="font-family: monospace; max-width: 600px; margin: auto; background-color: #000; color: #fff; border: 1px solid #EAB308; padding: 20px;">
                    <h2 style="color: #EAB308; border-bottom: 1px solid #EAB308; padding-bottom: 10px;">NEW TRANSMISSION: ${ticketId}</h2>
                    <p><strong>Category:</strong> ${type}</p>
                    <p><strong>Operator:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Wallet:</strong> ${walletAddress}</p>
                    <div style="background: #111; padding: 15px; border-left: 3px solid #EAB308; margin-top: 20px;">
                        <p><strong>Subject:</strong> ${title}</p>
                        <p style="white-space: pre-wrap;">${description}</p>
                    </div>
                </div>
            `,
        });

        // User confirmation
        await resend.emails.send({
            from: `Laamtag Vault <no-reply@uselaamtag.xyz>`,
            to: email,
            subject: `Transmission Logged: ${ticketId}`,
            html: `
                <div style="font-family: monospace; background-color: #000; color: #fff; padding: 20px; border: 1px solid #333;">
                    <h2 style="color: #EAB308;">TRANSMISSION RECEIVED</h2>
                    <p>Greetings Operator ${name},</p>
                    <p>Your transmission has been logged into the Vault databanks.</p>
                    <div style="margin: 20px 0; padding: 10px; border: 1px dashed #EAB308; display: inline-block;">
                        <span style="color: #888; font-size: 10px;">REFERENCE ID:</span><br/>
                        <strong style="font-size: 18px; color: #EAB308;">${ticketId}</strong>
                    </div>
                    <p>Our agents will review your transmission shortly and respond to <strong>${email}</strong>.</p>
                    <p style="color: rgba(255,255,255,0.4); font-size: 11px; margin-top: 20px;">LAAMTAG VAULT // SECURE COMMS</p>
                </div>
            `
        });

    } catch (emailError: any) {
        // Email failed but ticket is saved — log and continue
        console.error("RESEND ERROR:", emailError.message);
    }

    return res.status(200).json({ success: true, ticketId });
}