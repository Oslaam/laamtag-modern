import { NextApiRequest, NextApiResponse } from 'next';
import nodemailer from 'nodemailer';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ message: "Method not allowed" });

    const { type, name, email, walletAddress, title, description } = req.body;

    if (!name || !email || !description) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        // 1. SAVE TO DATABASE (This happens first and is very fast)
        const ticket = await prisma.supportTicket.create({
            data: {
                walletAddress: walletAddress || 'Anonymous',
                type: type || 'Complaint',
                name,
                email,
                title,
                description,
                status: "Pending"
            }
        });

        // 2. SEND SUCCESS TO USER IMMEDIATELY
        // This stops the loading spinner on the frontend right now!
        res.status(200).json({ success: true, ticketId: ticket.id });

        // 3. BACKGROUND WORK (Starts after the response is sent)
        const transporter = nodemailer.createTransport({
            host: "mail.privateemail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
            tls: { rejectUnauthorized: false }
        });

        // We do NOT use 'await' here so the server finishes the request 
        // while the emails send in the background.

        // Internal Alert (Sent to YOU)
        transporter.sendMail({
            from: `"Vault Support" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            replyTo: email,
            subject: `[${type.toUpperCase()}] ${title}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; border-radius: 20px; overflow: hidden; background-color: #000; color: #fff; border: 1px solid #EAB308;">
                    <div style="background-color: #EAB308; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; color: #000; font-size: 20px;">NEW SUPPORT TICKET</h1>
                    </div>
                    <div style="padding: 30px;">
                        <p style="color: #EAB308; font-weight: bold;">Category: ${type}</p>
                        <p><strong>From:</strong> ${name} (${email})</p>
                        <p><strong>Wallet:</strong> ${walletAddress}</p>
                        <hr style="border: 0; border-top: 1px solid #222;" />
                        <p><strong>Subject:</strong> ${title}</p>
                        <p style="white-space: pre-wrap; background: #111; padding: 15px; border-radius: 10px;">${description}</p>
                    </div>
                </div>
            `,
        }).catch(err => console.error("Admin Email Background Error:", err));

        // Auto-Responder (Sent to the USER)
        transporter.sendMail({
            from: `"Laamtag Vault" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `Ticket Received: ${title}`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; background-color: #000; color: #fff; border: 1px solid #333; border-radius: 15px; padding: 40px; text-align: center;">
                    <h2 style="color: #EAB308; text-transform: uppercase; letter-spacing: 2px;">Transmission Received</h2>
                    <p style="color: #888; font-size: 14px;">Hello ${name},</p>
                    <p>Your support ticket has been successfully logged into the Laamtag terminal.</p>
                    <div style="background: #111; border: 1px solid #222; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: left;">
                        <p style="margin: 0; font-size: 12px; color: #EAB308;">TICKET ID: ${ticket.id}</p>
                        <p style="margin: 10px 0 0 0; font-weight: bold;">${title}</p>
                    </div>
                    <p style="color: #888; font-size: 12px;">Our operators will review your submission and respond shortly. No further action is required.</p>
                    <hr style="border: 0; border-top: 1px solid #222; margin: 30px 0;" />
                    <p style="font-size: 10px; color: #444;">LAAMTAG VAULT SYSTEM // SECURE CONNECTION</p>
                </div>
            `
        }).catch(err => console.error("User Email Background Error:", err));

    } catch (error: any) {
        console.error("API ERROR:", error.message);
        // We check if headersSent is false so we don't try to send 2 responses
        if (!res.headersSent) {
            return res.status(500).json({ error: "Failed to log transmission" });
        }
    }
}